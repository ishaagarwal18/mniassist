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
import { NgTemplateOutlet } from '@angular/common';
import { firstValueFrom } from 'rxjs';

import {
  CreateUpdateMeetingDto,
  MeetingConflictDto,
  MeetingDto,
  MeetingKind,
  SlotDto,
} from '../../proxy/activities';
import { ActivityLinkDto, ActivityLinkType, ReminderChannels } from '../../proxy/activities';
import { ArButton, ArDialog, ArIcon } from '../../ui';
import {
  GOOGLE_MEET_NEW_URL,
  ZOOM_SCHEDULE_URL,
  googleCalendarUrl,
  teamsMeetingUrl,
} from './meeting-share';
import { ArDateInput } from '../../ui/date-input';
import { ArSelect } from '../../ui/select';
import { ActivityDirectory } from './activity-directory';
import { ActivityGateway } from './activity-gateway';
import { ArActivityLinks } from './activity-links-editor';
import { linksOf, toLinkInputs } from './activity-links.logic';
import { ArRecurrencePicker } from './recurrence-picker';
import { ArReminderChannels } from './reminder-channels';
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
 * Scheduling a meeting: either in an embedded full-page view or inside a modal dialog.
 * Handles attendee conflict checking, free slot suggestions, CRM linking, recurrence and multi-channel reminders.
 */
@Component({
  selector: 'ar-meeting-dialog',
  imports: [
    ArDialog,
    ArButton,
    ArIcon,
    ArRecurrencePicker,
    ArSelect,
    ArDateInput,
    ArActivityLinks,
    ArReminderChannels,
    NgTemplateOutlet,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './meeting-dialog.scss',
  template: `
    @if (embedded()) {
      <div class="mt-page-container">
        <ng-container *ngTemplateOutlet="formContent" />
        <div class="mt-sticky-actions">
          <div class="mt-sticky-actions__inner">
            <button ar-button type="button" variant="ghost" (click)="closed.emit()">
              Cancel
            </button>
            <button
              ar-button
              type="button"
              variant="primary"
              [disabled]="busy() || !validTimes() || !!repeatProblem()"
              (click)="save()"
            >
              {{
                busy()
                  ? 'Saving…'
                  : conflictLines().length || forced()
                    ? 'Schedule anyway'
                    : meeting()
                      ? 'Save Changes'
                      : 'Schedule Meeting'
              }}
            </button>
          </div>
        </div>
      </div>
    } @else {
      <ar-dialog
        [title]="meeting() ? 'Edit meeting' : 'Schedule a meeting'"
        (dismiss)="closed.emit()"
      >
        <ng-container *ngTemplateOutlet="formContent" />
        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="closed.emit()">Close</button>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy() || !validTimes() || !!repeatProblem()"
            (click)="save()"
          >
            {{
              busy()
                ? 'Saving…'
                : conflictLines().length || forced()
                  ? 'Schedule anyway'
                  : meeting()
                    ? 'Save Changes'
                    : 'Schedule Meeting'
            }}
          </button>
        </div>
      </ar-dialog>
    }

    <!-- Shared Structured Form Template -->
    <ng-template #formContent>
      <!-- 1. Meeting Details Card -->
      <section class="mt-card" aria-labelledby="card-details-title">
        <header class="mt-card__header">
          <div class="mt-card__header-left">
            <div class="mt-card__icon">
              <ar-icon name="calendar" [size]="16" />
            </div>
            <div class="mt-card__titles">
              <h2 id="card-details-title" class="mt-card__title">Meeting Information</h2>
              <span class="mt-card__sub">Title, timing, meeting format and location</span>
            </div>
          </div>
        </header>

        <label class="ar-field">
          <span class="ar-field__label">Meeting Title <span class="text-danger">*</span></span>
          <input
            required
            maxlength="256"
            id="mt-title"
            class="ar-field__input font-medium"
            placeholder="e.g., Quarterly Business Review & Commercial Discussion"
            [value]="title()"
            (input)="title.set($any($event.target).value)"
          />
        </label>

        <div class="mt-grid-2">
          <label class="ar-field">
            <span class="ar-field__label">Start Date & Time <span class="text-danger">*</span></span>
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
            <span class="ar-field__label">Duration <span class="text-danger">*</span></span>
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

        <div class="mt-grid-2">
          <label class="ar-field">
            <span class="ar-field__label">Meeting Format <span class="text-danger">*</span></span>
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
            <span class="ar-field__label">Remind Before <span class="text-danger">*</span></span>
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
          <span class="ar-field__label">
            Location or Meeting Link
            <span class="ar-field__opt">physical room address, or video conference URL</span>
          </span>
          <input
            id="mt-where"
            class="ar-field__input"
            maxlength="512"
            placeholder="e.g., Plant Office Pune, or https://meet.google.com/..."
            [value]="where()"
            (input)="where.set($any($event.target).value)"
          />
        </label>

        <!-- Video Conference Integration Sub-section -->
        <div class="mt-providers-box">
          <div class="mt-providers-box__header">
            <span class="mt-providers-box__label">Schedule with video provider</span>
          </div>
          <div class="mt-providers-box__buttons">
            <button
              type="button"
              class="mt-providers-box__btn"
              (click)="createInTeams()"
              title="Create meeting in Microsoft Teams"
            >
              <ar-icon name="video" [size]="14" />
              <span>Microsoft Teams</span>
            </button>
            <button
              type="button"
              class="mt-providers-box__btn"
              (click)="createInGoogle()"
              title="Create in Google Calendar / Meet"
            >
              <ar-icon name="link" [size]="14" />
              <span>Google Meet</span>
            </button>
            <button
              type="button"
              class="mt-providers-box__btn"
              (click)="createInZoom()"
              title="Schedule meeting in Zoom"
            >
              <ar-icon name="video" [size]="14" />
              <span>Zoom</span>
            </button>
          </div>
          <p class="mt-providers-box__note">
            Opens the provider in a new tab to create the call. After generating the meeting link, paste it into the Location field above.
          </p>
        </div>
      </section>

      <!-- 2. Recurrence Card -->
      <section class="mt-card" aria-labelledby="card-recurrence-title">
        <header class="mt-card__header">
          <div class="mt-card__header-left">
            <div class="mt-card__icon">
              <ar-icon name="clock" [size]="16" />
            </div>
            <div class="mt-card__titles">
              <h2 id="card-recurrence-title" class="mt-card__title">Recurrence Settings</h2>
              <span class="mt-card__sub">Configure recurring schedules and end conditions</span>
            </div>
          </div>
        </header>

        @if (!meeting()) {
          <ar-recurrence-picker [(draft)]="repeat" [needsEnd]="true" />
        } @else if (meeting()!.seriesId) {
          <div class="mt-warn">
            <strong>Meeting Series</strong>
            <span>
              This is occurrence {{ meeting()!.seriesIndex }} of {{ meeting()!.seriesTotal }} in this series. Changes made here apply to this occurrence only.
            </span>
          </div>
        }
      </section>

      <!-- 3. Participants & Colleagues Card -->
      <section class="mt-card" aria-labelledby="card-participants-title">
        <header class="mt-card__header">
          <div class="mt-card__header-left">
            <div class="mt-card__icon">
              <ar-icon name="user" [size]="16" />
            </div>
            <div class="mt-card__titles">
              <h2 id="card-participants-title" class="mt-card__title">Participants & Colleagues</h2>
              <span class="mt-card__sub">Invite internal team members to this session</span>
            </div>
          </div>
          <span class="mt-card__badge">{{ attendees().size }} Selected</span>
        </header>

        <div class="mt-participants">
          <!-- Selected Participant Chips -->
          @if (selectedUserObjects().length) {
            <div class="mt-selected-chips">
              @for (u of selectedUserObjects(); track u.userId) {
                <span class="mt-user-chip">
                  <span class="mt-user-chip__avatar">
                    {{ (u.name || 'U').charAt(0).toUpperCase() }}
                  </span>
                  <span>{{ u.name }}</span>
                  @if (u.userId === directory.meId) {
                    <em class="mt-user-chip__you">(You)</em>
                  } @else {
                    <button
                      type="button"
                      class="mt-user-chip__remove"
                      aria-label="Remove attendee"
                      (click)="toggle(u.userId!, false)"
                    >
                      ×
                    </button>
                  }
                </span>
              }
            </div>
          }

          <!-- Search Colleagues -->
          <div class="mt-user-search-wrap">
            <input
              class="ar-field__input"
              placeholder="Search colleagues by name or email..."
              aria-label="Find a colleague"
              [value]="userFilter()"
              (input)="userFilter.set($any($event.target).value)"
            />
          </div>

          <!-- Searchable Colleague List -->
          <div class="mt-users-list">
            @for (u of visibleUsers(); track u.userId) {
              <label
                class="mt-user-row"
                [class.mt-user-row--selected]="attendees().has(u.userId!)"
              >
                <div class="mt-user-row__left">
                  <input
                    type="checkbox"
                    class="mt-user-row__checkbox"
                    [checked]="attendees().has(u.userId!)"
                    [disabled]="u.userId === directory.meId"
                    (change)="toggle(u.userId!, $any($event.target).checked)"
                  />
                  <span class="mt-user-row__avatar">
                    {{ (u.name || 'U').charAt(0).toUpperCase() }}
                  </span>
                  <div>
                    <span class="mt-user-row__name">
                      {{ u.name }}{{ u.userId === directory.meId ? ' (You)' : '' }}
                    </span>
                  </div>
                </div>
              </label>
            } @empty {
              <p class="text-muted p-3 m-0 text-sm">No colleagues match your search.</p>
            }
          </div>
        </div>
      </section>

      <!-- 4. External Guests Card -->
      <section class="mt-card" aria-labelledby="card-guests-title">
        <header class="mt-card__header">
          <div class="mt-card__header-left">
            <div class="mt-card__icon">
              <ar-icon name="contacts" [size]="16" />
            </div>
            <div class="mt-card__titles">
              <h2 id="card-guests-title" class="mt-card__title">External Guests</h2>
              <span class="mt-card__sub">Invite attendees outside your organization</span>
            </div>
          </div>
          <span class="mt-card__badge">{{ guests().length }} Guests</span>
        </header>

        <div class="mt-guests-list">
          @for (g of guests(); track $index) {
            <div class="mt-guest-row">
              <input
                class="ar-field__input"
                placeholder="Guest Full Name"
                [attr.aria-label]="'Guest ' + ($index + 1) + ' name'"
                [value]="g.name"
                (input)="setGuest($index, 'name', $any($event.target).value)"
              />
              <input
                class="ar-field__input"
                type="email"
                placeholder="Email Address"
                [attr.aria-label]="'Guest ' + ($index + 1) + ' email'"
                [value]="g.email"
                (input)="setGuest($index, 'email', $any($event.target).value)"
              />
              <button
                type="button"
                class="mt-guest-remove-btn"
                aria-label="Remove guest"
                (click)="removeGuest($index)"
              >
                ×
              </button>
            </div>
          } @empty {
            <p class="text-muted text-sm m-0">No external guests added yet.</p>
          }

          <button type="button" class="mt-btn-add-guest" (click)="addGuest()">
            <ar-icon name="plus" [size]="14" />
            <span>Add External Guest</span>
          </button>
        </div>
      </section>

      <!-- 5. Availability & Free Slots Card -->
      <section class="mt-card" aria-labelledby="card-availability-title">
        <header class="mt-card__header">
          <div class="mt-card__header-left">
            <div class="mt-card__icon">
              <ar-icon name="clock" [size]="16" />
            </div>
            <div class="mt-card__titles">
              <h2 id="card-availability-title" class="mt-card__title">Team Availability</h2>
              <span class="mt-card__sub">Check calendar conflicts and suggest mutual free times</span>
            </div>
          </div>
        </header>

        @if (conflictLines().length) {
          <div class="mt-warn" role="alert">
            <div class="flex items-center gap-2">
              <ar-icon name="alert" [size]="16" />
              <strong>Calendar conflict detected for selected attendees:</strong>
            </div>
            <ul>
              @for (line of conflictLines(); track line) {
                <li>{{ line }}</li>
              }
            </ul>
          </div>
        }

        <div>
          <button
            ar-button
            type="button"
            variant="ghost"
            [disabled]="suggesting()"
            (click)="findTimes()"
          >
            <ar-icon name="calendar" [size]="14" />
            <span>{{ suggesting() ? 'Checking team calendars…' : 'Find a time when everyone is free' }}</span>
          </button>

          @if (slots() !== null) {
            <div class="mt-slots-wrap">
              @if (slots()!.length) {
                <span class="text-xs font-semibold text-muted uppercase">Suggested mutual slots (click to select):</span>
                <div class="mt-slots-grid">
                  @for (s of slots(); track s.startUtc) {
                    <button type="button" class="mt-slot-pill" (click)="pickSlot(s)">
                      {{ slot(s) }}
                    </button>
                  }
                </div>
              } @else {
                <p class="text-muted text-sm m-0">
                  No mutual free slots found in the next 7 weekdays between 9:00 AM and 6:00 PM.
                </p>
              }
            </div>
          }
        </div>
      </section>

      <!-- 6. Linked CRM Records Card -->
      <section class="mt-card" aria-labelledby="card-links-title">
        <header class="mt-card__header">
          <div class="mt-card__header-left">
            <div class="mt-card__icon">
              <ar-icon name="link" [size]="16" />
            </div>
            <div class="mt-card__titles">
              <h2 id="card-links-title" class="mt-card__title">Linked CRM Records</h2>
              <span class="mt-card__sub">Associate this meeting with deals, contacts, or customer accounts</span>
            </div>
          </div>
        </header>

        <ar-activity-links [(links)]="links" />
      </section>

      <!-- 7. Reminder Channels Card -->
      <section class="mt-card" aria-labelledby="card-reminders-title">
        <header class="mt-card__header">
          <div class="mt-card__header-left">
            <div class="mt-card__icon">
              <ar-icon name="clock" [size]="16" />
            </div>
            <div class="mt-card__titles">
              <h2 id="card-reminders-title" class="mt-card__title">Automated Reminders</h2>
              <span class="mt-card__sub">Choose communication channels for scheduled reminders</span>
            </div>
          </div>
        </header>

        @if (reminder() > 0) {
          <ar-reminder-channels label="Delivery Channels" [(channels)]="channels">
            @if (channels() !== 0) {
              <label class="mt-customer-toggle">
                <input
                  type="checkbox"
                  [disabled]="!hasCustomer()"
                  [checked]="remindCustomer() && hasCustomer()"
                  (change)="remindCustomer.set($any($event.target).checked)"
                />
                <span>Remind the customer / external contact too</span>
                @if (!hasCustomer()) {
                  <span class="text-muted text-xs">(link a contact or deal first)</span>
                }
              </label>
            }
          </ar-reminder-channels>
        } @else {
          <p class="text-muted text-sm m-0">
            Reminder time is currently set to "No reminder" in Meeting Details.
          </p>
        }
      </section>

      <!-- 8. Notes & Agenda Card -->
      <section class="mt-card" aria-labelledby="card-notes-title">
        <header class="mt-card__header">
          <div class="mt-card__header-left">
            <div class="mt-card__icon">
              <ar-icon name="edit" [size]="16" />
            </div>
            <div class="mt-card__titles">
              <h2 id="card-notes-title" class="mt-card__title">Notes & Agenda</h2>
              <span class="mt-card__sub">Internal meeting goals, discussion agenda, or customer notes</span>
            </div>
          </div>
        </header>

        <label class="ar-field">
          <textarea
            id="mt-notes"
            class="ar-field__input"
            rows="3"
            placeholder="Outline agenda items, discussion topics, deliverables, or customer objectives..."
            [value]="description()"
            (input)="description.set($any($event.target).value)"
          ></textarea>
        </label>
      </section>

      @if (error(); as msg) {
        <p class="mt-err" role="alert">{{ msg }}</p>
      }
    </ng-template>
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
  }

  protected createInZoom(): void {
    window.open(this.zoomNew, '_blank', 'noopener');
  }

  private readonly api = inject(ActivityGateway).meetings;
  protected readonly directory = inject(ActivityDirectory);

  /** Whether this component is embedded in a standalone page instead of a modal dialog. */
  readonly embedded = input(false);

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
  /** What the meeting is about; its first contact (or a lead's customer) is who "remind the customer" reaches. */
  protected readonly links = signal<ActivityLinkDto[]>([]);
  protected readonly channels = signal<ReminderChannels>(ReminderChannels.None);
  protected readonly remindCustomer = signal(false);
  protected readonly hasCustomer = computed(() =>
    this.links().some(
      (l) => l.type === ActivityLinkType.Contact || l.type === ActivityLinkType.Enquiry,
    ),
  );
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
  protected readonly selectedUserObjects = computed(() => {
    const set = this.attendees();
    return this.directory.users().filter((u) => u.userId && set.has(u.userId));
  });
  /** A new meeting, or a moved one, must not start in the past. */
  protected readonly minStart = signal(nowLocalInput());
  protected readonly startProblem = computed(() =>
    pastTimeProblem(this.start(), this.meeting()?.startUtc, 'The meeting'),
  );
  protected readonly validTimes = computed(
    () => !this.startProblem() && !!fromLocalInput(this.start()),
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
      this.links.set(linksOf(m));
      this.channels.set(m.reminderChannels ?? ReminderChannels.None);
      this.remindCustomer.set(!!m.remindCustomer);
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
      const preset = this.enquiryPreset();
      if (preset) {
        const label = this.directory.enquiryOptions().find((o) => o.id === preset)?.label;
        this.links.set(linksOf({ enquiryId: preset, enquiryReference: label ?? 'This deal' }));
      }
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
      links: toLinkInputs(this.links()),
      reminderLeadMinutes: this.reminder(),
      reminderChannels: this.reminder() > 0 ? this.channels() : ReminderChannels.None,
      remindCustomer:
        this.reminder() > 0 &&
        this.channels() !== 0 &&
        this.remindCustomer() &&
        this.hasCustomer(),
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
