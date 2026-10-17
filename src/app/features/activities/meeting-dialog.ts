import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  CreateUpdateMeetingDto,
  MeetingConflictDto,
  MeetingDto,
  MeetingKind,
  SlotDto,
} from '../../proxy/activities';
import { ArButton, ArDialog } from '../../ui';
import {
  GOOGLE_MEET_NEW_URL,
  ZOOM_SCHEDULE_URL,
  googleCalendarUrl,
  teamsMeetingUrl,
} from './meeting-share';
import { ArDateInput } from '../../ui/date-input';
import { ArSelect } from '../../ui/select';
import { ActivityDirectory } from './activity-directory';
import { ActivityGateway } from './activity-mock';
import { ArRecurrencePicker } from './recurrence-picker';
import { NO_REPEAT, RecurrenceDraft, recurrenceProblem, toRecurrence } from './recurrence';
import {
  KIND_LABEL,
  conflictLine,
  defaultMeetingStart,
  errorMessage,
  fromLocalInput,
  isConflictError,
  minutesBetween,
  slotLabel,
  toLocalInput,
  uniqueConflicts,
  utcOffsetMinutes,
  nowLocalInput,
  pastTimeProblem,
} from './activity-logic';

const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240];
const REMINDERS: { label: string; minutes: number }[] = [
  { label: 'No reminder', minutes: 0 },
  { label: '10 minutes before', minutes: 10 },
  { label: '15 minutes before', minutes: 15 },
  { label: '30 minutes before', minutes: 30 },
  { label: '1 hour before', minutes: 60 },
  { label: '1 day before', minutes: 60 * 24 },
];

/**
 * Scheduling a meeting. Who is in it decides who has to be free: as the time or the people change, it checks their calendars and says who
 * is already booked, and can suggest times when everyone is free. A clash is a warning, not a wall: it can be scheduled anyway.
 */
@Component({
  selector: 'ar-meeting-dialog',
  imports: [ArDialog, ArButton, ArRecurrencePicker, ArSelect, ArDateInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog
      [title]="meeting() ? 'Edit meeting' : 'Schedule a meeting'"
      (dismiss)="closed.emit()"
    >
      <label class="ar-field">
        <span class="ar-field__label">Title</span>
        <input
          required
          maxlength="256"
          id="mt-title"
          class="ar-field__input"
          [value]="title()"
          (input)="title.set($any($event.target).value)"
        />
      </label>

      <div class="ar-field-row">
        <label class="ar-field">
          <span class="ar-field__label">Starts</span>
          <input
            required
            id="mt-start"
            class="ar-field__input"
            type="datetime-local"
            [min]="minStart()"
            [attr.aria-invalid]="!!startProblem()"
            [value]="start()"
            (input)="start.set($any($event.target).value)"
          />
          @if (startProblem(); as e) {
            <span class="ar-field__error" role="alert">{{ e }}</span>
          }
        </label>
        <label class="ar-field">
          <span class="ar-field__label">Length</span>
          <select
            required
            id="mt-duration"
            class="ar-field__input"
            (change)="duration.set(+$any($event.target).value)"
          >
            @for (d of durations(); track d) {
              <option [value]="d" [selected]="d === duration()">{{ label(d) }}</option>
            }
          </select>
        </label>
      </div>

      <div class="ar-field-row">
        <label class="ar-field">
          <span class="ar-field__label">Kind</span>
          <select
            required
            id="mt-kind"
            class="ar-field__input"
            (change)="kind.set(+$any($event.target).value)"
          >
            @for (k of kinds; track k) {
              <option [value]="k" [selected]="k === kind()">{{ kindLabel[k] }}</option>
            }
          </select>
        </label>
        <label class="ar-field">
          <span class="ar-field__label">Remind</span>
          <select
            required
            id="mt-reminder"
            class="ar-field__input"
            (change)="reminder.set(+$any($event.target).value)"
          >
            @for (r of reminders; track r.minutes) {
              <option [value]="r.minutes" [selected]="r.minutes === reminder()">
                {{ r.label }}
              </option>
            }
          </select>
        </label>
      </div>

      <label class="ar-field">
        <span class="ar-field__label"
          >Where <span class="ar-field__opt">a place, or a link for an online meeting</span></span
        >
        <input
          id="mt-where"
          class="ar-field__input"
          maxlength="512"
          placeholder="Plant office, Pune — or https://meet.google.com/…"
          [value]="where()"
          (input)="where.set($any($event.target).value)"
        />
        <div class="mt__direct-create">
          <span class="mt__direct-title">Create directly in:</span>
          <div class="mt__direct-buttons">
            <button
              ar-button
              type="button"
              variant="ghost"
              icon="video"
              (click)="createInTeams()"
              title="Create in Microsoft Teams"
            >
              Teams
            </button>
            <button
              ar-button
              type="button"
              variant="ghost"
              icon="link"
              (click)="createInGoogle()"
              title="Create in Google Calendar / Meet"
            >
              Google Meet
            </button>
            <button
              ar-button
              type="button"
              variant="ghost"
              icon="video"
              (click)="createInZoom()"
              title="Schedule in Zoom"
            >
              Zoom
            </button>
          </div>
        </div>
      </label>

      @if (!meeting()) {
        <ar-recurrence-picker [(draft)]="repeat" [needsEnd]="true" />
      } @else if (meeting()!.seriesId) {
        <p class="mt__note">
          This is meeting {{ meeting()!.seriesIndex }} of {{ meeting()!.seriesTotal }} in a series.
          Changes here are to this one only.
        </p>
      }

      <fieldset class="mt__people">
        <legend class="ar-field__label">
          Who is in it <span class="ar-field__opt">you are always in</span>
        </legend>
        <input
          class="ar-field__input mt__filter"
          placeholder="Find a colleague"
          aria-label="Find a colleague"
          [value]="userFilter()"
          (input)="userFilter.set($any($event.target).value)"
        />
        <div class="mt__users">
          @for (u of visibleUsers(); track u.userId) {
            <label class="mt__user">
              <input
                type="checkbox"
                [checked]="attendees().has(u.userId!)"
                [disabled]="u.userId === directory.meId"
                (change)="toggle(u.userId!, $any($event.target).checked)"
              />
              <span>{{ u.name }}{{ u.userId === directory.meId ? ' (you)' : '' }}</span>
            </label>
          } @empty {
            <p class="mt__note">No one found.</p>
          }
        </div>

        <p class="ar-field__label mt__sub">
          Guests <span class="ar-field__opt">from outside the workspace</span>
        </p>
        @for (g of guests(); track $index) {
          <div class="mt__guest">
            <input
              class="ar-field__input"
              placeholder="Name"
              [attr.aria-label]="'Guest ' + ($index + 1) + ' name'"
              [value]="g.name"
              (input)="setGuest($index, 'name', $any($event.target).value)"
            />
            <input
              class="ar-field__input"
              type="email"
              placeholder="Email (for the invitation file)"
              [attr.aria-label]="'Guest ' + ($index + 1) + ' email'"
              [value]="g.email"
              (input)="setGuest($index, 'email', $any($event.target).value)"
            />
            <button
              type="button"
              class="mt__x"
              aria-label="Remove guest"
              (click)="removeGuest($index)"
            >
              ×
            </button>
          </div>
        }
        <button type="button" class="mt__link" (click)="addGuest()">+ Add a guest</button>
      </fieldset>

      @if (conflictLines().length) {
        <div class="mt__warn" role="status">
          <strong>Someone is already booked at that time</strong>
          <ul>
            @for (line of conflictLines(); track line) {
              <li>{{ line }}</li>
            }
          </ul>
        </div>
      }

      <div class="mt__find">
        <button
          ar-button
          type="button"
          variant="ghost"
          [disabled]="suggesting()"
          (click)="findTimes()"
        >
          {{ suggesting() ? 'Looking…' : 'Find a time when everyone is free' }}
        </button>
        @if (slots() !== null) {
          @if (slots()!.length) {
            <div class="mt__slots">
              @for (s of slots(); track s.startUtc) {
                <button type="button" class="mt__slot" (click)="pickSlot(s)">{{ slot(s) }}</button>
              }
            </div>
          } @else {
            <p class="mt__note">
              No time in the next 7 days suits everyone, inside 9 am to 6 pm on weekdays.
            </p>
          }
        }
      </div>

      <label class="ar-field">
        <span class="ar-field__label"
          >About a deal <span class="ar-field__opt">optional</span></span
        >
        <select
          id="mt-enquiry"
          class="ar-field__input"
          (change)="enquiryId.set($any($event.target).value)"
        >
          <option value="" [selected]="!enquiryId()">Not about a deal</option>
          @for (o of directory.enquiryOptions(); track o.id) {
            <option [value]="o.id" [selected]="o.id === enquiryId()">{{ o.label }}</option>
          }
        </select>
      </label>

      <label class="ar-field">
        <span class="ar-field__label">Notes <span class="ar-field__opt">optional</span></span>
        <textarea
          id="mt-notes"
          class="ar-field__input"
          rows="2"
          [value]="description()"
          (input)="description.set($any($event.target).value)"
        ></textarea>
      </label>

      @if (error(); as msg) {
        <p class="mt__err" role="alert">{{ msg }}</p>
      }

      <div dialogActions>
        <button ar-button type="button" variant="ghost" (click)="closed.emit()">Close</button>
        <button
          ar-button
          type="button"
          variant="primary"
          [disabled]="busy() || !validTimes() || !!repeatProblem()"
          (click)="save()"
        >
          {{ busy() ? 'Saving…' : conflictLines().length || forced() ? 'Schedule anyway' : 'Save' }}
        </button>
      </div>
    </ar-dialog>
  `,
  styles: `
    .mt__links {
      font: 400 11.5px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
    .mt__links a {
      color: var(--ar-primary);
      font-weight: 500;
    }
    .mt__direct-create {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 6px;
    }
    .mt__direct-title {
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .mt__direct-buttons {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .mt__direct-buttons button {
      height: 28px;
      padding: 0 10px;
      font-size: 12px;
    }
    .mt__people {
      margin: 0 0 10px;
      padding: 0;
      border: 0;
      min-width: 0;
    }
    .mt__filter {
      width: 100%;
      margin-bottom: 6px;
    }
    .mt__users {
      max-height: 132px;
      overflow-y: auto;
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-control);
    }
    .mt__user {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-800);
    }
    .mt__user + .mt__user {
      border-top: 1px solid var(--ar-line-200);
    }
    .mt__sub {
      margin: 10px 0 4px;
    }
    .mt__guest {
      display: grid;
      grid-template-columns: 1fr 1.3fr auto;
      gap: 6px;
      margin-bottom: 6px;
    }
    .mt__x {
      background: none;
      border: 0;
      cursor: pointer;
      color: var(--ar-ink-400);
      font-size: 16px;
    }
    .mt__link {
      padding: 0;
      background: none;
      border: 0;
      cursor: pointer;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-teal-600);
    }
    .mt__note {
      margin: 6px 0;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
    .mt__warn {
      margin: 0 0 10px;
      padding: 9px 12px;
      border-radius: var(--ar-radius-control);
      background: var(--ar-amber-100, #fdf3e7);
      color: var(--ar-ink-800);
      font: 400 12.5px var(--ar-font-sans);
    }
    .mt__warn ul {
      margin: 4px 0 0;
      padding-left: 18px;
    }
    .mt__find {
      margin: 0 0 10px;
    }
    .mt__slots {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
    .mt__slot {
      padding: 5px 10px;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: 999px;
      cursor: pointer;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-ink-800);
    }
    .mt__slot:hover,
    .mt__slot:focus-visible {
      border-color: var(--ar-teal-600);
      outline: none;
    }
    .mt__err {
      margin: 8px 0 0;
      padding: 8px 10px;
      border-radius: var(--ar-radius-control);
      background: var(--ar-red-100);
      color: var(--ar-red-600);
      font: 500 12px var(--ar-font-sans);
    }
  `,
})
export class ArMeetingDialog implements OnInit, OnDestroy {
  protected readonly meetNew = GOOGLE_MEET_NEW_URL;
  protected readonly zoomNew = ZOOM_SCHEDULE_URL;
  /** Teams' new-meeting form, filled in with this meeting's title and time. */
  protected teamsLink(): string {
    const start = this.start() ? new Date(this.start()) : new Date();
    const end = new Date(start.getTime() + (this.duration() || 30) * 60_000);
    return teamsMeetingUrl({
      title: this.title() || 'Meeting',
      description: this.description(),
      startUtc: start.toISOString(),
      endUtc: end.toISOString(),
    });
  }

  protected createInTeams(): void {
    const url = this.teamsLink();
    window.open(url, '_blank', 'noopener');
    if (!this.where()) {
      this.where.set('Microsoft Teams');
    }
  }

  protected createInGoogle(): void {
    const start = this.start() ? new Date(this.start()) : new Date();
    const end = new Date(start.getTime() + (this.duration() || 30) * 60_000);
    const url = googleCalendarUrl({
      title: this.title() || 'Meeting',
      description: this.description(),
      startUtc: start.toISOString(),
      endUtc: end.toISOString(),
      location: this.where(),
    });
    window.open(url, '_blank', 'noopener');
    if (!this.where()) {
      this.where.set('Google Meet');
    }
  }

  protected createInZoom(): void {
    window.open(this.zoomNew, '_blank', 'noopener');
    if (!this.where()) {
      this.where.set('Zoom Meeting');
    }
  }

  private readonly api = inject(ActivityGateway).meetings;
  protected readonly directory = inject(ActivityDirectory);

  /** The meeting being edited; none for a new one. */
  readonly meeting = input<MeetingDto | null>(null);
  /** Where a new meeting starts, when the person chose a day. */
  readonly startPreset = input<Date | null>(null);
  readonly enquiryPreset = input<string | null>(null);
  readonly saved = output<MeetingDto>();
  readonly closed = output<void>();

  protected readonly kinds = [
    MeetingKind.InPerson,
    MeetingKind.Call,
    MeetingKind.Video,
    MeetingKind.SiteVisit,
  ];
  protected readonly kindLabel = KIND_LABEL;
  protected readonly reminders = REMINDERS;

  protected readonly title = signal('');
  protected readonly description = signal('');
  protected readonly start = signal('');
  protected readonly duration = signal(60);
  protected readonly kind = signal<MeetingKind>(MeetingKind.InPerson);
  protected readonly where = signal('');
  protected readonly reminder = signal(15);
  protected readonly enquiryId = signal('');
  protected readonly attendees = signal<ReadonlySet<string>>(new Set());
  protected readonly guests = signal<{ name: string; email: string }[]>([]);
  protected readonly userFilter = signal('');
  protected readonly repeat = signal<RecurrenceDraft>({ ...NO_REPEAT });
  protected readonly repeatProblem = computed(() =>
    this.meeting() ? null : recurrenceProblem(this.repeat(), true),
  );

  protected readonly conflicts = signal<MeetingConflictDto[]>([]);
  protected readonly slots = signal<SlotDto[] | null>(null);
  protected readonly suggesting = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  /** The server refused a clash the check had not shown, and the person has now seen it. */
  protected readonly forced = signal(false);

  private checkTimer: ReturnType<typeof setTimeout> | undefined;
  private checkSeq = 0;

  protected readonly durations = computed(() =>
    DURATIONS.includes(this.duration())
      ? DURATIONS
      : [...DURATIONS, this.duration()].sort((a, b) => a - b),
  );
  protected readonly conflictLines = computed(() =>
    uniqueConflicts(this.conflicts()).map(conflictLine),
  );
  protected readonly visibleUsers = computed(() => {
    const f = this.userFilter().trim().toLowerCase();
    return this.directory.users().filter((u) => !f || (u.name ?? '').toLowerCase().includes(f));
  });
  /** A new meeting, or a moved one, must not start in the past. */
  protected readonly minStart = signal(nowLocalInput());
  protected readonly startProblem = computed(() =>
    pastTimeProblem(this.start(), this.meeting()?.startUtc, 'The meeting'),
  );
  protected readonly validTimes = computed(
    () => !!fromLocalInput(this.start()) && !this.startProblem(),
  );

  constructor() {
    // Whenever the time, length or people change, look at everyone's calendars again (after a short pause for typing).
    effect(() => {
      this.start();
      this.duration();
      this.attendees();
      untracked(() => this.scheduleCheck());
    });
  }

  async ngOnInit(): Promise<void> {
    const m = this.meeting();
    if (m) {
      this.title.set(m.title ?? '');
      this.description.set(m.description ?? '');
      this.start.set(toLocalInput(m.startUtc));
      this.duration.set(minutesBetween(m.startUtc!, m.endUtc!));
      this.kind.set(m.kind ?? MeetingKind.InPerson);
      this.where.set(m.location ?? m.meetingUrl ?? '');
      this.reminder.set(m.reminderLeadMinutes ?? 15);
      this.enquiryId.set(m.enquiryId ?? '');
      this.attendees.set(
        new Set((m.attendees ?? []).filter((a) => a.userId).map((a) => a.userId!)),
      );
      this.guests.set(
        (m.attendees ?? [])
          .filter((a) => !a.userId)
          .map((a) => ({ name: a.name ?? '', email: a.email ?? '' })),
      );
    } else {
      this.start.set(
        toLocalInput((this.startPreset() ?? defaultMeetingStart(new Date())).toISOString()),
      );
      this.enquiryId.set(this.enquiryPreset() ?? '');
    }

    await this.directory.load();
    if (this.directory.meId) this.attendees.update((s) => new Set(s).add(this.directory.meId!));
  }

  ngOnDestroy(): void {
    clearTimeout(this.checkTimer);
  }

  protected label(minutes: number): string {
    return minutes < 60
      ? `${minutes} minutes`
      : minutes === 60
        ? '1 hour'
        : minutes % 60 === 0
          ? `${minutes / 60} hours`
          : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  }

  protected slot(s: SlotDto): string {
    return slotLabel(s.startUtc!, s.endUtc!);
  }

  // ---- people ---------------------------------------------------------------------

  protected toggle(userId: string, on: boolean): void {
    this.attendees.update((s) => {
      const next = new Set(s);
      if (on) next.add(userId);
      else next.delete(userId);
      return next;
    });
  }

  protected addGuest(): void {
    this.guests.update((g) => [...g, { name: '', email: '' }]);
  }
  protected removeGuest(i: number): void {
    this.guests.update((g) => g.filter((_, idx) => idx !== i));
  }
  protected setGuest(i: number, field: 'name' | 'email', value: string): void {
    this.guests.update((g) => g.map((x, idx) => (idx === i ? { ...x, [field]: value } : x)));
  }

  // ---- checking the calendars --------------------------------------------------------

  private window(): { startUtc: string; endUtc: string } | null {
    const startUtc = fromLocalInput(this.start());
    if (!startUtc) return null;
    return {
      startUtc,
      endUtc: new Date(new Date(startUtc).getTime() + this.duration() * 60_000).toISOString(),
    };
  }

  private scheduleCheck(): void {
    clearTimeout(this.checkTimer);
    this.forced.set(false);
    this.checkTimer = setTimeout(() => void this.check(), 400);
  }

  private async check(): Promise<void> {
    const w = this.window();
    if (!w) {
      this.conflicts.set([]);
      return;
    }
    const seq = ++this.checkSeq;
    try {
      const found = await firstValueFrom(
        this.api.checkConflicts({
          ...w,
          userIds: [...this.attendees()],
          excludeMeetingId: this.meeting()?.id ?? null,
        }),
      );
      if (seq === this.checkSeq) this.conflicts.set(found);
    } catch {
      // A check that could not be made is not a reason to stop someone scheduling.
      if (seq === this.checkSeq) this.conflicts.set([]);
    }
  }

  protected async findTimes(): Promise<void> {
    this.suggesting.set(true);
    this.error.set(null);
    try {
      const from = fromLocalInput(this.start()) ?? new Date().toISOString();
      const day = new Date(from);
      day.setHours(0, 0, 0, 0);
      this.slots.set(
        await firstValueFrom(
          this.api.suggestSlots({
            userIds: [...this.attendees()],
            durationMinutes: this.duration(),
            fromUtc: day.toISOString(),
            toUtc: new Date(day.getTime() + 8 * 86_400_000).toISOString(),
            utcOffsetMinutes: utcOffsetMinutes(),
            excludeMeetingId: this.meeting()?.id ?? null,
            max: 8,
          }),
        ),
      );
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'Times could not be looked up.'));
    } finally {
      this.suggesting.set(false);
    }
  }

  protected pickSlot(s: SlotDto): void {
    this.start.set(toLocalInput(s.startUtc));
  }

  // ---- saving ---------------------------------------------------------------------------

  private body(allowConflicts: boolean): CreateUpdateMeetingDto | null {
    const w = this.window();
    if (!w) return null;
    const where = this.where().trim();
    const isLink = /^https?:\/\//i.test(where);
    return {
      title: this.title().trim(),
      description: this.description().trim() || null,
      ...w,
      kind: this.kind(),
      location: where && !isLink ? where : null,
      meetingUrl: where && isLink ? where : null,
      enquiryId: this.enquiryId() || null,
      reminderLeadMinutes: this.reminder(),
      attendeeUserIds: [...this.attendees()].filter((id) => id !== this.directory.meId),
      guests: this.guests()
        .filter((g) => g.name.trim())
        .map((g) => ({ name: g.name.trim(), email: g.email.trim() || null })),
      allowConflicts,
      // A series is only made when creating; an edit changes the one meeting.
      recurrence: this.meeting() ? null : toRecurrence(this.repeat()),
      utcOffsetMinutes: utcOffsetMinutes(),
    };
  }

  protected async save(): Promise<void> {
    // Pressing the button while a clash is showing is the person saying "anyway".
    const allow = this.conflictLines().length > 0 || this.forced();
    const body = this.body(allow);
    if (!body) return;

    this.busy.set(true);
    this.error.set(null);
    try {
      const m = this.meeting();
      this.saved.emit(
        await firstValueFrom(m?.id ? this.api.update(m.id, body) : this.api.create(body)),
      );
    } catch (e: unknown) {
      if (isConflictError(e)) {
        // Someone booked them since the check: shown now, and the button becomes "anyway".
        this.forced.set(true);
        await this.check();
      }
      this.error.set(errorMessage(e, 'The meeting could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }
}
