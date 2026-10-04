import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  ActionEventArgs,
  AgendaService,
  CellClickEventArgs,
  DayService,
  EventClickArgs,
  EventRenderedArgs,
  MonthService,
  ScheduleComponent,
  ScheduleModule,
  WeekService,
} from '@syncfusion/ej2-angular-schedule';
import { firstValueFrom } from 'rxjs';

import { registerSyncfusionLicense } from '../../core/ui/syncfusion-license';
import { ensureSyncfusionTheme } from '../../core/ui/syncfusion-theme';
import { ArTopbar } from '../../layout/topbar';
import { AttendeeResponse, MeetingDto, MeetingStatus } from '../../proxy/activities';
import { ArButton, ArChip } from '../../ui';
import { ChipTone } from '../../ui/chip';
import { ActivityDirectory } from './activity-directory';
import { ActivityGateway } from './activity-mock';
import {
  KIND_LABEL,
  RESPONSE_LABEL,
  STATUS_LABEL,
  addDays,
  downloadTextFile,
  durationLabel,
  errorMessage,
  minutesBetween,
  startOfDay,
  timeRange,
  weekOf,
} from './activity-logic';
import { ArMeetingDialog } from './meeting-dialog';

// Syncfusion checks the licence in each component's constructor, before ours runs.
registerSyncfusionLicense();

/** A meeting as the Scheduler draws it; `meeting` is what the detail panel opens. */
interface CalendarEvent {
  Id: string;
  Subject: string;
  StartTime: Date;
  EndTime: Date;
  Location?: string;
  meeting: MeetingDto;
}

/**
 * Meetings: a Syncfusion Scheduler calendar (day, week, month, agenda), the week ahead by default. Yours by default; those allowed can look across the team. Scheduling checks everyone's calendars, a
 * meeting can be answered, finished, cancelled, and handed to a calendar app as a file.
 */
@Component({
  selector: 'ar-meetings',
  imports: [ArTopbar, ArButton, ArChip, ArMeetingDialog, ScheduleModule],
  providers: [DayService, WeekService, MonthService, AgendaService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './meetings.html',
  styleUrl: './meetings.scss',
})
export class ArMeetings {
  private readonly api = inject(ActivityGateway).meetings;
  protected readonly directory = inject(ActivityDirectory);

  protected readonly Status = MeetingStatus;
  protected readonly Response = AttendeeResponse;
  protected readonly kindLabel = KIND_LABEL;
  protected readonly statusLabel = STATUS_LABEL;
  protected readonly responseLabel = RESPONSE_LABEL;

  protected readonly scope = signal<'mine' | 'everyone'>('mine');
  protected readonly showCancelled = signal(false);

  protected readonly meetings = signal<MeetingDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  private readonly schedule = viewChild(ScheduleComponent);
  protected readonly today = new Date();
  /** The dates the calendar shows; it reports them when the user moves or changes view. */
  protected readonly shown = signal<{ from: Date; to: Date }>(weekOf(this.today));

  protected readonly eventSettings = computed(() => ({
    dataSource: this.meetings()
      .filter((m) => m.startUtc && m.endUtc)
      .map((m): CalendarEvent => ({
        Id: m.id!,
        Subject: m.title ?? 'Meeting',
        StartTime: new Date(m.startUtc!),
        EndTime: new Date(m.endUtc!),
        Location: m.location ?? undefined,
        meeting: m,
      })),
    allowAdding: false,
    allowEditing: false,
    allowDeleting: false,
  }));
  protected readonly heading = computed(() => {
    const { from, to } = this.shown();
    const last = addDays(to, -1);
    const f = (d: Date, year = false) =>
      d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        ...(year ? { year: 'numeric' } : {}),
      });
    return `${f(from)} – ${f(last, true)}`;
  });

  // ---- dialogs ----------------------------------------------------------------------
  protected readonly creating = signal(false);
  protected readonly presetStart = signal<Date | null>(null);
  protected readonly editing = signal<MeetingDto | null>(null);
  protected readonly detail = signal<MeetingDto | null>(null);
  protected readonly outcomeOpen = signal(false);
  protected readonly cancelOpen = signal(false);
  protected readonly note = signal('');
  /** For one of a series: cancel the later ones too. */
  protected readonly cancelFollowing = signal(false);

  private readonly tick = signal(0);

  constructor() {
    ensureSyncfusionTheme('schedule');
    void this.directory.load();

    effect(() => {
      this.shown();
      this.scope();
      this.showCancelled();
      this.tick();
      untracked(() => void this.load());
    });
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const { from, to } = this.shown();
      this.meetings.set(
        await firstValueFrom(
          this.api.getList({
            fromUtc: from.toISOString(),
            toUtc: to.toISOString(),
            everyone: this.scope() === 'everyone',
            includeCancelled: this.showCancelled(),
          }),
        ),
      );
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'Meetings could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected reload(): void {
    this.tick.update((n) => n + 1);
  }

  // ---- the calendar ------------------------------------------------------------------

  protected onAction(args: ActionEventArgs): void {
    if (args.requestType !== 'dateNavigate' && args.requestType !== 'viewNavigate') return;
    const dates = this.schedule()?.getCurrentViewDates() ?? [];
    if (dates.length === 0) return;
    const from = startOfDay(dates[0]);
    const to = addDays(startOfDay(dates[dates.length - 1]), 1);
    const now = this.shown();
    if (from.getTime() !== now.from.getTime() || to.getTime() !== now.to.getTime()) {
      this.shown.set({ from, to });
    }
  }

  protected onEventClick(args: EventClickArgs): void {
    args.cancel = true;
    const event = (Array.isArray(args.event) ? args.event[0] : args.event) as CalendarEvent;
    if (event?.meeting) this.open(event.meeting);
  }

  /** A click on an empty slot schedules a meeting then, unless that time has gone. */
  protected onCellClick(args: CellClickEventArgs): void {
    args.cancel = true;
    const at = args.isAllDay
      ? new Date(
          args.startTime.getFullYear(),
          args.startTime.getMonth(),
          args.startTime.getDate(),
          10,
          0,
        )
      : args.startTime;
    this.presetStart.set(at.getTime() < Date.now() ? null : at);
    this.creating.set(true);
  }

  protected onEventRendered(args: EventRenderedArgs): void {
    const m = (args.data as CalendarEvent).meeting;
    args.element.classList.toggle('mc-off', m.status === MeetingStatus.Cancelled);
    args.element.classList.toggle('mc-ask', this.needsMyAnswer(m));
  }

  protected range(m: MeetingDto): string {
    return timeRange(m.startUtc!, m.endUtc!);
  }
  protected kindOf(m: MeetingDto): string {
    return m.kind == null ? '' : this.kindLabel[m.kind];
  }
  protected statusOf(m: MeetingDto): string {
    return m.status == null ? '' : this.statusLabel[m.status];
  }
  protected length(m: MeetingDto): string {
    return durationLabel(minutesBetween(m.startUtc!, m.endUtc!));
  }
  protected whenLong(m: MeetingDto): string {
    return new Date(m.startUtc!).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }

  // ---- what a meeting is to me ---------------------------------------------------------

  protected statusTone(s: MeetingStatus | undefined): ChipTone {
    return s === MeetingStatus.Completed
      ? 'good'
      : s === MeetingStatus.Cancelled
        ? 'neutral'
        : s === MeetingStatus.NoShow
          ? 'bad'
          : 'amber';
  }

  protected responseTone(r: AttendeeResponse | undefined): ChipTone {
    return r === AttendeeResponse.Accepted
      ? 'good'
      : r === AttendeeResponse.Declined
        ? 'bad'
        : 'neutral';
  }

  protected myResponse(m: MeetingDto): AttendeeResponse | undefined {
    return m.attendees?.find((a) => a.userId === this.directory.meId)?.response;
  }

  /** In the meeting, not the organiser, and yet to answer. */
  protected needsMyAnswer(m: MeetingDto): boolean {
    return (
      m.status === MeetingStatus.Scheduled &&
      m.organizerUserId !== this.directory.meId &&
      this.myResponse(m) === AttendeeResponse.Pending
    );
  }

  protected canChange(m: MeetingDto): boolean {
    return (
      this.directory.canUpdate &&
      (m.organizerUserId === this.directory.meId || this.directory.canSeeAll)
    );
  }

  protected isLink(m: MeetingDto): boolean {
    return !!m.meetingUrl;
  }

  // ---- acting on one ----------------------------------------------------------------------

  protected open(m: MeetingDto): void {
    this.detail.set(m);
    this.outcomeOpen.set(false);
    this.cancelOpen.set(false);
    this.cancelFollowing.set(false);
    this.note.set('');
    this.error.set(null);
  }

  protected closeDetail(): void {
    this.detail.set(null);
  }

  protected closeEditor(changed: boolean): void {
    this.creating.set(false);
    this.editing.set(null);
    this.presetStart.set(null);
    if (changed) {
      this.detail.set(null);
      this.reload();
    }
  }

  protected edit(m: MeetingDto): void {
    this.detail.set(null);
    this.editing.set(m);
  }

  private async act(work: () => Promise<MeetingDto | void>, fallback: string): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const result = await work();
      if (result) this.detail.set(result);
      this.outcomeOpen.set(false);
      this.cancelOpen.set(false);
      this.reload();
    } catch (e: unknown) {
      this.error.set(errorMessage(e, fallback));
    } finally {
      this.busy.set(false);
    }
  }

  protected respond(m: MeetingDto, response: AttendeeResponse): Promise<void> {
    return this.act(
      () => firstValueFrom(this.api.respond(m.id!, response)),
      'Your answer could not be saved.',
    );
  }

  protected complete(m: MeetingDto): Promise<void> {
    return this.act(
      () => firstValueFrom(this.api.complete(m.id!, this.note().trim() || null)),
      'The meeting could not be marked done.',
    );
  }

  protected noShow(m: MeetingDto): Promise<void> {
    return this.act(
      () => firstValueFrom(this.api.markNoShow(m.id!)),
      'The meeting could not be marked.',
    );
  }

  protected cancel(m: MeetingDto): Promise<void> {
    return this.act(
      () =>
        firstValueFrom(this.api.cancel(m.id!, this.note().trim() || null, this.cancelFollowing())),
      'The meeting could not be cancelled.',
    );
  }

  protected async addToCalendar(m: MeetingDto): Promise<void> {
    this.error.set(null);
    try {
      const file = await firstValueFrom(this.api.getIcs(m.id!));
      downloadTextFile(file.fileName ?? 'meeting.ics', file.content ?? '');
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'The calendar file could not be made.'));
    }
  }
}
