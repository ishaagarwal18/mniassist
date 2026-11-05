import { Injectable, inject } from '@angular/core';
import type { PagedResultDto } from '@abp/ng.core';
import { Observable, of, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PipelineStore } from '../../core/services/pipeline.service';
import {
  ActivityDirectoryService,
  ActivityLinkDto,
  ActivitySendResultDto,
  ActivityUserDto,
  AttendeeResponse,
  CheckConflictsInput,
  CreateUpdateCrmTaskDto,
  CreateUpdateMeetingDto,
  CrmTaskDto,
  CrmTaskService,
  CrmTaskStatus,
  CrmTaskSummaryDto,
  GetCrmTasksInput,
  GetMeetingsInput,
  IcsFileDto,
  MeetingConflictDto,
  MeetingDto,
  MeetingKind,
  MeetingService,
  MeetingStatus,
  RecurrenceFrequency,
  ReminderChannels,
  ShareActivityInput,
  SlotDto,
  SuggestSlotsInput,
  TaskPriority,
} from '../../proxy/activities';
import { buildIcs, clashes, freeSlots, nextDue, seriesStarts } from './activity-mock-logic';

/** Who "I" am on sample data. */
export const MOCK_ME = 'mock-me';

const USERS: ActivityUserDto[] = [
  { userId: MOCK_ME, name: 'You', email: 'you@example.in' },
  { userId: 'mock-asha', name: 'Asha Rao', email: 'asha@example.in' },
  { userId: 'mock-ravi', name: 'Ravi Nair', email: 'ravi@example.in' },
  { userId: 'mock-meera', name: 'Meera Iyer', email: 'meera@example.in' },
];

const DAY = 86_400_000;
const nameOf = (id: string | null | undefined) => USERS.find((u) => u.userId === id)?.name ?? null;
let counter = 0;
const newId = (p: string) => `${p}-${Date.now().toString(36)}-${++counter}`;

/** What the server would answer with, so the pages' own error handling is the same on sample data. */
function refuse(code: string, message: string, data?: unknown): Observable<never> {
  return throwError(() => ({ error: { error: { code: `AutoReach:${code}`, message, data } } }));
}

/**
 * Tasks and meetings for sample-data mode, kept in memory for the life of the page. Behaves like the server for what the pages use:
 * completing a repeating task makes the next, a repeating meeting becomes a series, and a clash refuses unless the person overrides it.
 * Nothing is saved anywhere; a reload starts again from the same sample.
 */
@Injectable({ providedIn: 'root' })
export class ActivityMockStore {
  private readonly pipeline = inject(PipelineStore);

  readonly tasks: CrmTaskDto[] = [];
  readonly meetings: MeetingDto[] = [];
  /** How many more a repeating task may make, by task id; absent means no limit. */
  readonly remaining = new Map<string, number>();

  constructor() {
    const now = Date.now();
    const at = (days: number, hour: number) => {
      const d = new Date(now + days * DAY);
      d.setHours(hour, 0, 0, 0);
      return d.toISOString();
    };
    this.tasks.push(
      this.task({
        title: 'Send the revised quotation',
        dueAtUtc: at(0, 17),
        priority: TaskPriority.High,
      }),
      this.task({ title: 'Call about the drive commissioning', dueAtUtc: at(1, 11) }),
      this.task({
        title: 'Collect site photos',
        dueAtUtc: at(-1, 10),
        assigneeUserId: 'mock-asha',
      }),
      this.task({
        title: 'Review the pipeline',
        dueAtUtc: at(2, 9),
        recurrence: { frequency: RecurrenceFrequency.Weekly },
      }),
    );
    this.meetings.push(
      this.meeting({
        title: 'Site visit',
        startUtc: at(1, 14),
        endUtc: at(1, 15),
        kind: MeetingKind.SiteVisit,
        location: 'Plant 2',
        attendeeUserIds: ['mock-asha'],
      }),
      this.meeting({
        title: 'Quotation walkthrough',
        startUtc: at(3, 11),
        endUtc: at(3, 12),
        kind: MeetingKind.Video,
        meetingUrl: 'https://meet.example.in/walkthrough',
        attendeeUserIds: ['mock-ravi'],
      }),
    );
  }

  private enquiryRef(id: string | null | undefined): string | null {
    if (!id) return null;
    const label = this.pipeline.openEnquiryOptions().find((o) => o.id === id)?.label;
    return label ? label.split(' · ')[0] : null;
  }

  task(
    input: Partial<Omit<CreateUpdateCrmTaskDto, 'links'>> & {
      title: string;
      assigneeUserId?: string | null;
      seriesId?: string;
      links?: ActivityLinkDto[] | null;
    },
  ): CrmTaskDto {
    const id = newId('task');
    const rule =
      input.recurrence && input.recurrence.frequency !== RecurrenceFrequency.None
        ? input.recurrence
        : null;
    if (rule?.count) this.remaining.set(id, rule.count - 1);
    return {
      id,
      title: input.title,
      notes: input.notes ?? null,
      dueAtUtc: input.dueAtUtc ?? null,
      priority: input.priority ?? TaskPriority.Normal,
      status: CrmTaskStatus.Open,
      assigneeUserId: input.assigneeUserId || MOCK_ME,
      assigneeName: nameOf(input.assigneeUserId || MOCK_ME),
      createdByUserId: MOCK_ME,
      contactId: input.contactId ?? null,
      contactName: null,
      links: (input.links ?? []).map((l) => ({ ...l, label: l.label ?? 'Linked record' })),
      reminderChannels: input.reminderChannels ?? ReminderChannels.None,
      enquiryId: input.enquiryId ?? null,
      enquiryReference: this.enquiryRef(input.enquiryId),
      quotationId: input.quotationId ?? null,
      completedAtUtc: null,
      reminderLeadMinutes: input.reminderLeadMinutes ?? null,
      recurrence: rule,
      seriesId: input.seriesId ?? (rule ? newId('series') : null),
      nextTaskId: null,
    };
  }

  meeting(
    input: Partial<CreateUpdateMeetingDto> & { title: string; startUtc: string; endUtc: string },
    series?: { id: string; index: number; total: number },
  ): MeetingDto {
    const attendees = [MOCK_ME, ...(input.attendeeUserIds ?? [])]
      .filter((id, i, all) => all.indexOf(id) === i)
      .map((userId) => ({
        id: newId('att'),
        userId,
        name: nameOf(userId) ?? 'Someone',
        email: USERS.find((u) => u.userId === userId)?.email ?? null,
        response: userId === MOCK_ME ? AttendeeResponse.Accepted : AttendeeResponse.Pending,
      }));
    for (const g of input.guests ?? []) {
      attendees.push({
        id: newId('att'),
        userId: null as unknown as string,
        name: g.name,
        email: g.email ?? null,
        response: AttendeeResponse.Pending,
      });
    }
    return {
      id: newId('mtg'),
      title: input.title,
      description: input.description ?? null,
      startUtc: input.startUtc,
      endUtc: input.endUtc,
      kind: input.kind ?? MeetingKind.InPerson,
      location: input.location ?? null,
      meetingUrl: input.meetingUrl ?? null,
      status: MeetingStatus.Scheduled,
      organizerUserId: MOCK_ME,
      organizerName: nameOf(MOCK_ME),
      contactId: input.contactId ?? null,
      contactName: null,
      enquiryId: input.enquiryId ?? null,
      enquiryReference: this.enquiryRef(input.enquiryId),
      outcome: null,
      cancelReason: null,
      reminderLeadMinutes: input.reminderLeadMinutes ?? 30,
      attendees,
      seriesId: series?.id ?? null,
      seriesIndex: series?.index ?? 0,
      seriesTotal: series?.total ?? 0,
    };
  }

  /** Bookings that would clash for any of these people. */
  conflictsFor(
    userIds: readonly string[],
    span: { startUtc: string; endUtc: string },
    buffer: number,
    excluding: ReadonlySet<string>,
  ): MeetingConflictDto[] {
    const out: MeetingConflictDto[] = [];
    for (const m of this.meetings) {
      if (
        m.status !== MeetingStatus.Scheduled ||
        excluding.has(m.id!) ||
        !clashes(span, m as { startUtc: string; endUtc: string }, buffer)
      )
        continue;
      for (const a of m.attendees ?? []) {
        if (a.userId && userIds.includes(a.userId)) {
          out.push({
            userId: a.userId,
            userName: a.name,
            meetingId: m.id,
            title: m.title,
            startUtc: m.startUtc,
            endUtc: m.endUtc,
          });
        }
      }
    }
    return out;
  }

  busyFor(
    userIds: readonly string[],
    excludeId?: string | null,
  ): { startUtc: string; endUtc: string }[] {
    return this.meetings
      .filter(
        (m) =>
          m.status === MeetingStatus.Scheduled &&
          m.id !== excludeId &&
          (m.attendees ?? []).some((a) => a.userId && userIds.includes(a.userId)),
      )
      .map((m) => ({ startUtc: m.startUtc!, endUtc: m.endUtc! }));
  }
}

const paged = <T>(items: T[]): PagedResultDto<T> => ({ items, totalCount: items.length });

/** The same calls as {@link CrmTaskService}, answered from memory. */
export class MockCrmTaskApi {
  constructor(private readonly s: ActivityMockStore) {}

  /** Demo data: nothing is sent; each person and channel says so. */
  share = (_id: string, input: ShareActivityInput): Observable<ActivitySendResultDto> =>
    of({
      lines: input.userIds.flatMap((u) =>
        [ReminderChannels.Email, ReminderChannels.WhatsApp, ReminderChannels.Sms]
          .filter((c) => ((input.channels ?? ReminderChannels.WhatsApp) & c) !== 0)
          .map((c) => ({
            name: USERS.find((x) => x.userId === u)?.name ?? 'Colleague',
            channel: c,
            sent: false,
            note: 'demo data: nothing is sent',
          })),
      ),
    });

  getList = (input: GetCrmTasksInput): Observable<PagedResultDto<CrmTaskDto>> => {
    const now = Date.now();
    const term = input.filter?.trim().toLowerCase();
    let items = this.s.tasks.filter((t) => {
      if (input.mine && t.assigneeUserId !== MOCK_ME) return false;
      if (input.assigneeUserId && t.assigneeUserId !== input.assigneeUserId) return false;
      if (input.status != null && t.status !== input.status) return false;
      if (input.enquiryId && t.enquiryId !== input.enquiryId) return false;
      if (input.contactId && t.contactId !== input.contactId) return false;
      if (input.quotationId && t.quotationId !== input.quotationId) return false;
      if (
        input.overdueOnly &&
        !(t.status === CrmTaskStatus.Open && t.dueAtUtc && Date.parse(t.dueAtUtc) < now)
      )
        return false;
      if (
        input.dueBeforeUtc &&
        !(t.dueAtUtc && Date.parse(t.dueAtUtc) < Date.parse(input.dueBeforeUtc))
      )
        return false;
      return !term || (t.title ?? '').toLowerCase().includes(term);
    });
    items = items.sort((a, b) => (a.dueAtUtc ?? '9').localeCompare(b.dueAtUtc ?? '9'));
    const total = items.length;
    const page = items.slice(
      input.skipCount ?? 0,
      (input.skipCount ?? 0) + (input.maxResultCount ?? 50),
    );
    return of({ items: page.map((t) => ({ ...t })), totalCount: total });
  };

  get = (id: string) => this.find(id);

  create = (input: CreateUpdateCrmTaskDto): Observable<CrmTaskDto> => {
    if (
      input.recurrence &&
      input.recurrence.frequency !== RecurrenceFrequency.None &&
      !input.dueAtUtc
    ) {
      return refuse('TaskRecurrenceNeedsDate', 'A task that repeats needs a due date.');
    }
    const t = this.s.task(input);
    this.s.tasks.push(t);
    return of({ ...t });
  };

  update = (id: string, input: CreateUpdateCrmTaskDto): Observable<CrmTaskDto> => {
    const t = this.s.tasks.find((x) => x.id === id);
    if (!t) return refuse('NotFound', 'That task no longer exists.');
    const rule =
      input.recurrence && input.recurrence.frequency !== RecurrenceFrequency.None
        ? input.recurrence
        : null;
    if (rule && !input.dueAtUtc)
      return refuse('TaskRecurrenceNeedsDate', 'A task that repeats needs a due date.');
    Object.assign(t, {
      title: input.title,
      notes: input.notes ?? null,
      dueAtUtc: input.dueAtUtc ?? null,
      priority: input.priority ?? t.priority,
      assigneeUserId: input.assigneeUserId || t.assigneeUserId,
      assigneeName: nameOf(input.assigneeUserId || t.assigneeUserId),
      enquiryId: input.enquiryId ?? null,
      reminderLeadMinutes: input.reminderLeadMinutes ?? null,
      recurrence: input.dueAtUtc ? rule : null,
    });
    return of({ ...t });
  };

  delete = (id: string): Observable<void> => {
    const i = this.s.tasks.findIndex((x) => x.id === id);
    if (i >= 0) this.s.tasks.splice(i, 1);
    return of(undefined);
  };

  complete = (id: string): Observable<CrmTaskDto> => {
    const t = this.s.tasks.find((x) => x.id === id);
    if (!t) return refuse('NotFound', 'That task no longer exists.');
    if (t.status === CrmTaskStatus.Done) return of({ ...t });
    t.status = CrmTaskStatus.Done;
    t.completedAtUtc = new Date().toISOString();

    const left = this.s.remaining.get(id);
    if (t.recurrence && t.dueAtUtc && !t.nextTaskId && (left === undefined || left > 0)) {
      const due = nextDue(t.dueAtUtc, t.recurrence, -new Date().getTimezoneOffset(), new Date());
      if (due) {
        const next = this.s.task({
          ...t,
          title: t.title!,
          dueAtUtc: due,
          recurrence: t.recurrence,
          seriesId: t.seriesId ?? undefined,
        });
        this.s.remaining.delete(next.id!);
        if (left !== undefined) this.s.remaining.set(next.id!, left - 1);
        this.s.tasks.push(next);
        t.nextTaskId = next.id;
      }
    }
    return of({ ...t });
  };

  reopen = (id: string): Observable<CrmTaskDto> => {
    const t = this.s.tasks.find((x) => x.id === id);
    if (!t) return refuse('NotFound', 'That task no longer exists.');
    const next = this.s.tasks.find((x) => x.id === t.nextTaskId);
    if (next?.status === CrmTaskStatus.Open) {
      this.s.tasks.splice(this.s.tasks.indexOf(next), 1);
      t.nextTaskId = null;
    }
    t.status = CrmTaskStatus.Open;
    t.completedAtUtc = null;
    return of({ ...t });
  };

  cancel = (id: string): Observable<CrmTaskDto> => {
    const t = this.s.tasks.find((x) => x.id === id);
    if (!t) return refuse('NotFound', 'That task no longer exists.');
    t.status = CrmTaskStatus.Cancelled;
    return of({ ...t });
  };

  getSummary = (utcOffsetMinutes: number): Observable<CrmTaskSummaryDto> => {
    const now = Date.now();
    const local = (iso: string) => Date.parse(iso) + utcOffsetMinutes * 60_000;
    const today = Math.floor(local(new Date(now).toISOString()) / DAY);
    const mine = this.s.tasks.filter((t) => t.assigneeUserId === MOCK_ME);
    const open = mine.filter((t) => t.status === CrmTaskStatus.Open);
    const dated = open.filter((t) => t.dueAtUtc);
    return of({
      open: open.length,
      overdue: dated.filter((t) => Date.parse(t.dueAtUtc!) < now).length,
      dueToday: dated.filter((t) => Math.floor(local(t.dueAtUtc!) / DAY) === today).length,
      dueThisWeek: dated.filter((t) => {
        const d = Math.floor(local(t.dueAtUtc!) / DAY) - today;
        return d >= 0 && d < 7;
      }).length,
      noDate: open.length - dated.length,
      doneLast7Days: mine.filter(
        (t) =>
          t.status === CrmTaskStatus.Done &&
          t.completedAtUtc &&
          now - Date.parse(t.completedAtUtc) < 7 * DAY,
      ).length,
    });
  };

  private find(id: string): Observable<CrmTaskDto> {
    const t = this.s.tasks.find((x) => x.id === id);
    return t ? of({ ...t }) : refuse('NotFound', 'That task no longer exists.');
  }
}

/** The same calls as {@link MeetingService}, answered from memory. */
export class MockMeetingApi {
  constructor(private readonly s: ActivityMockStore) {}

  /** Demo data: nothing is sent; each person and channel says so. */
  share = (_id: string, input: ShareActivityInput): Observable<ActivitySendResultDto> =>
    of({
      lines: input.userIds.flatMap((u) =>
        [ReminderChannels.Email, ReminderChannels.WhatsApp, ReminderChannels.Sms]
          .filter((c) => ((input.channels ?? ReminderChannels.WhatsApp) & c) !== 0)
          .map((c) => ({
            name: USERS.find((x) => x.userId === u)?.name ?? 'Colleague',
            channel: c,
            sent: false,
            note: 'demo data: nothing is sent',
          })),
      ),
    });

  getList = (input: GetMeetingsInput): Observable<MeetingDto[]> => {
    const from = Date.parse(input.fromUtc);
    const to = Date.parse(input.toUtc);
    const who = input.userId ?? MOCK_ME;
    return of(
      this.s.meetings
        .filter((m) => Date.parse(m.startUtc!) < to && Date.parse(m.endUtc!) > from)
        .filter((m) => input.includeCancelled || m.status !== MeetingStatus.Cancelled)
        .filter((m) => input.everyone || (m.attendees ?? []).some((a) => a.userId === who))
        .filter((m) => !input.enquiryId || m.enquiryId === input.enquiryId)
        .filter((m) => !input.contactId || m.contactId === input.contactId)
        .sort((a, b) => a.startUtc!.localeCompare(b.startUtc!))
        .map((m) => ({ ...m })),
    );
  };

  get = (id: string): Observable<MeetingDto> => {
    const m = this.s.meetings.find((x) => x.id === id);
    return m ? of({ ...m }) : refuse('NotFound', 'That meeting no longer exists.');
  };

  create = (input: CreateUpdateMeetingDto): Observable<MeetingDto> => {
    if (Date.parse(input.endUtc) <= Date.parse(input.startUtc))
      return refuse('MeetingEndBeforeStart', 'A meeting must end after it starts.');
    const repeats = input.recurrence && input.recurrence.frequency !== RecurrenceFrequency.None;
    if (repeats && !input.recurrence!.count && !input.recurrence!.untilUtc) {
      return refuse(
        'MeetingRecurrenceNeedsEnd',
        'A series of meetings needs an end: a number of times, or a last date.',
      );
    }
    const length = Date.parse(input.endUtc) - Date.parse(input.startUtc);
    const starts = repeats
      ? seriesStarts(input.startUtc, input.recurrence!, input.utcOffsetMinutes ?? 0)
      : [input.startUtc];
    const people = [MOCK_ME, ...(input.attendeeUserIds ?? [])];

    if (!input.allowConflicts) {
      for (const start of starts) {
        const clash = this.s.conflictsFor(
          people,
          { startUtc: start, endUtc: new Date(Date.parse(start) + length).toISOString() },
          0,
          new Set(),
        );
        if (clash.length) {
          const c = clash[0];
          return refuse(
            'MeetingConflict',
            `${c.userName} already has "${c.title}" at ${new Date(c.startUtc!).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.`,
          );
        }
      }
    }

    const seriesId = starts.length > 1 || repeats ? newId('series') : undefined;
    const made = starts.map((start, i) =>
      this.s.meeting(
        { ...input, startUtc: start, endUtc: new Date(Date.parse(start) + length).toISOString() },
        seriesId ? { id: seriesId, index: i + 1, total: starts.length } : undefined,
      ),
    );
    this.s.meetings.push(...made);
    return of({ ...made[0] });
  };

  update = (id: string, input: CreateUpdateMeetingDto): Observable<MeetingDto> => {
    const m = this.s.meetings.find((x) => x.id === id);
    if (!m) return refuse('NotFound', 'That meeting no longer exists.');
    const people = [MOCK_ME, ...(input.attendeeUserIds ?? [])];
    if (!input.allowConflicts) {
      const clash = this.s.conflictsFor(people, input, 0, new Set([id]));
      if (clash.length) {
        const c = clash[0];
        return refuse(
          'MeetingConflict',
          `${c.userName} already has "${c.title}" at ${new Date(c.startUtc!).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.`,
        );
      }
    }
    const rebuilt = this.s.meeting(input);
    Object.assign(m, {
      ...rebuilt,
      id: m.id,
      seriesId: m.seriesId,
      seriesIndex: m.seriesIndex,
      seriesTotal: m.seriesTotal,
      status: m.status,
    });
    return of({ ...m });
  };

  checkConflicts = (input: CheckConflictsInput): Observable<MeetingConflictDto[]> =>
    of(
      this.s.conflictsFor(
        input.userIds,
        input,
        input.bufferMinutes ?? 0,
        new Set(input.excludeMeetingId ? [input.excludeMeetingId] : []),
      ),
    );

  suggestSlots = (input: SuggestSlotsInput): Observable<SlotDto[]> =>
    of(
      freeSlots(this.s.busyFor(input.userIds, input.excludeMeetingId), {
        fromUtc: input.fromUtc,
        toUtc: input.toUtc,
        durationMinutes: input.durationMinutes ?? 30,
        workStartMinute: input.workStartMinute ?? 9 * 60,
        workEndMinute: input.workEndMinute ?? 18 * 60,
        utcOffsetMinutes: input.utcOffsetMinutes ?? 0,
        includeWeekends: input.includeWeekends ?? false,
        bufferMinutes: input.bufferMinutes ?? 0,
        max: input.max ?? 8,
      }),
    );

  complete = (id: string, outcome: string | null) =>
    this.set(id, (m) => {
      m.status = MeetingStatus.Completed;
      m.outcome = outcome;
    });
  markNoShow = (id: string) =>
    this.set(id, (m) => {
      m.status = MeetingStatus.NoShow;
    });
  respond = (id: string, response: AttendeeResponse) =>
    this.set(id, (m) => {
      const a = m.attendees?.find((x) => x.userId === MOCK_ME);
      if (a) a.response = response;
    });

  cancel = (
    id: string,
    reason: string | null,
    thisAndFollowing = false,
  ): Observable<MeetingDto> => {
    const m = this.s.meetings.find((x) => x.id === id);
    if (!m) return refuse('NotFound', 'That meeting no longer exists.');
    for (const x of this.s.meetings) {
      const inSeries =
        m.seriesId && x.seriesId === m.seriesId && (x.seriesIndex ?? 0) >= (m.seriesIndex ?? 0);
      if ((x.id === id || (thisAndFollowing && inSeries)) && x.status === MeetingStatus.Scheduled) {
        x.status = MeetingStatus.Cancelled;
        x.cancelReason = reason;
      }
    }
    return of({ ...m });
  };

  getIcs = (id: string): Observable<IcsFileDto> => {
    const m = this.s.meetings.find((x) => x.id === id);
    if (!m) return refuse('NotFound', 'That meeting no longer exists.');
    return of({
      fileName: `${(m.title ?? 'meeting').replace(/[^\w]+/g, '-').toLowerCase()}.ics`,
      content: buildIcs({
        id: m.id!,
        title: m.title!,
        description: m.description,
        startUtc: m.startUtc!,
        endUtc: m.endUtc!,
        location: m.location,
        meetingUrl: m.meetingUrl,
        organizerName: m.organizerName,
        attendees: (m.attendees ?? []).map((a) => ({ name: a.name!, email: a.email })),
      }),
    });
  };

  private set(id: string, change: (m: MeetingDto) => void): Observable<MeetingDto> {
    const m = this.s.meetings.find((x) => x.id === id);
    if (!m) return refuse('NotFound', 'That meeting no longer exists.');
    change(m);
    return of({ ...m });
  }
}

export type CrmTaskApi = Pick<CrmTaskService, keyof MockCrmTaskApi & keyof CrmTaskService>;
export type MeetingApi = Pick<MeetingService, keyof MockMeetingApi & keyof MeetingService>;

/**
 * Where tasks, meetings and the people list come from: the server, or memory on sample data. The pages ask this, so they have one
 * code path and sample mode is a real, working mode rather than a disabled page.
 */
@Injectable({ providedIn: 'root' })
export class ActivityGateway {
  readonly tasks: CrmTaskApi;
  readonly meetings: MeetingApi;
  readonly directory: Pick<ActivityDirectoryService, 'getUsers'>;

  constructor() {
    if (environment.useMockData) {
      const store = inject(ActivityMockStore);
      this.tasks = new MockCrmTaskApi(store) as unknown as CrmTaskApi;
      this.meetings = new MockMeetingApi(store) as unknown as MeetingApi;
      this.directory = { getUsers: () => of([...USERS]) };
    } else {
      this.tasks = inject(CrmTaskService);
      this.meetings = inject(MeetingService);
      this.directory = inject(ActivityDirectoryService);
    }
  }
}
