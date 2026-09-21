import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ArTopbar } from '../../layout/topbar';
import {
  AttendeeResponse,
  MeetingDto,
  MeetingStatus,
} from '../../proxy/activities';
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
  groupByDay,
  minutesBetween,
  sameDay,
  timeRange,
  weekOf,
} from './activity-logic';
import { ArMeetingDialog } from './meeting-dialog';

/**
 * Meetings: the week ahead, day by day. Yours by default; those allowed can look across the team. Scheduling checks everyone's calendars, a
 * meeting can be answered, finished, cancelled, and handed to a calendar app as a file.
 */
@Component({
  selector: 'ar-meetings',
  imports: [ArTopbar, ArButton, ArChip, ArMeetingDialog],
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

  protected readonly anchor = signal(new Date());
  protected readonly scope = signal<'mine' | 'everyone'>('mine');
  protected readonly showCancelled = signal(false);

  protected readonly meetings = signal<MeetingDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected readonly week = computed(() => weekOf(this.anchor()));
  protected readonly days = computed(() => groupByDay(this.meetings(), (m) => m.startUtc, this.week().days));
  protected readonly heading = computed(() => {
    const { from, to } = this.week();
    const last = addDays(to, -1);
    const f = (d: Date, year = false) =>
      d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}) });
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
    void this.directory.load();

    effect(() => {
      this.anchor();
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
      const { from, to } = this.week();
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

  // ---- the week ---------------------------------------------------------------------

  protected shift(weeks: number): void {
    this.anchor.set(addDays(this.week().from, weeks * 7));
  }
  protected today(): void {
    this.anchor.set(new Date());
  }
  protected isToday(day: Date): boolean {
    return sameDay(day, new Date());
  }
  protected dayName(day: Date): string {
    return day.toLocaleDateString('en-IN', { weekday: 'short' });
  }
  protected dayNumber(day: Date): string {
    return day.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
  protected range(m: MeetingDto): string {
    return timeRange(m.startUtc!, m.endUtc!);
  }
  protected length(m: MeetingDto): string {
    return durationLabel(minutesBetween(m.startUtc!, m.endUtc!));
  }
  protected whenLong(m: MeetingDto): string {
    return new Date(m.startUtc!).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  protected addOn(day: Date): void {
    // 10 am on that day, or the next half hour if it is today and already past.
    const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 10, 0);
    this.presetStart.set(at.getTime() < Date.now() ? null : at);
    this.creating.set(true);
  }

  // ---- what a meeting is to me ---------------------------------------------------------

  protected statusTone(s: MeetingStatus | undefined): ChipTone {
    return s === MeetingStatus.Completed ? 'good' : s === MeetingStatus.Cancelled ? 'neutral' : s === MeetingStatus.NoShow ? 'bad' : 'amber';
  }

  protected responseTone(r: AttendeeResponse | undefined): ChipTone {
    return r === AttendeeResponse.Accepted ? 'good' : r === AttendeeResponse.Declined ? 'bad' : 'neutral';
  }

  protected myResponse(m: MeetingDto): AttendeeResponse | undefined {
    return m.attendees?.find((a) => a.userId === this.directory.meId)?.response;
  }

  /** In the meeting, not the organiser, and yet to answer. */
  protected needsMyAnswer(m: MeetingDto): boolean {
    return m.status === MeetingStatus.Scheduled && m.organizerUserId !== this.directory.meId && this.myResponse(m) === AttendeeResponse.Pending;
  }

  protected canChange(m: MeetingDto): boolean {
    return this.directory.canUpdate && (m.organizerUserId === this.directory.meId || this.directory.canSeeAll);
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
    return this.act(() => firstValueFrom(this.api.respond(m.id!, response)), 'Your answer could not be saved.');
  }

  protected complete(m: MeetingDto): Promise<void> {
    return this.act(() => firstValueFrom(this.api.complete(m.id!, this.note().trim() || null)), 'The meeting could not be marked done.');
  }

  protected noShow(m: MeetingDto): Promise<void> {
    return this.act(() => firstValueFrom(this.api.markNoShow(m.id!)), 'The meeting could not be marked.');
  }

  protected cancel(m: MeetingDto): Promise<void> {
    return this.act(() => firstValueFrom(this.api.cancel(m.id!, this.note().trim() || null, this.cancelFollowing())), 'The meeting could not be cancelled.');
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
