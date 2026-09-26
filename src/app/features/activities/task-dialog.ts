import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  CreateUpdateCrmTaskDto,
  CrmTaskDto,
  CrmTaskStatus,
  RecurrenceFrequency,
  TaskPriority,
} from '../../proxy/activities';
import { ArButton, ArDialog } from '../../ui';
import { ActivityDirectory } from './activity-directory';
import { ActivityGateway } from './activity-mock';
import {
  PRIORITY_LABEL,
  errorMessage,
  fromLocalInput,
  toLocalInput,
  utcOffsetMinutes,
} from './activity-logic';
import { ArRecurrencePicker } from './recurrence-picker';
import { NO_REPEAT, RecurrenceDraft, recurrenceProblem, toDraft, toRecurrence } from './recurrence';

/** How long before it is due to remind the assignee. */
const REMINDERS: { label: string; minutes: number | null }[] = [
  { label: 'No reminder', minutes: null },
  { label: 'When it is due', minutes: 0 },
  { label: '15 minutes before', minutes: 15 },
  { label: '1 hour before', minutes: 60 },
  { label: '1 day before', minutes: 60 * 24 },
];

/** Making and changing a task. */
@Component({
  selector: 'ar-task-dialog',
  imports: [ArDialog, ArButton, ArRecurrencePicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog [title]="task() ? 'Edit task' : 'New task'" (dismiss)="closed.emit()">
      <label class="ar-field">
        <span class="ar-field__label">What has to be done</span>
        <input
          id="task-title"
          class="ar-field__input"
          [value]="title()"
          (input)="title.set($any($event.target).value)"
        />
      </label>

      <div class="ar-field-row">
        <label class="ar-field">
          <span class="ar-field__label">Due <span class="ar-field__opt">optional</span></span>
          <input
            id="task-due"
            class="ar-field__input"
            type="datetime-local"
            [value]="due()"
            (input)="due.set($any($event.target).value)"
          />
        </label>
        <label class="ar-field">
          <span class="ar-field__label">Priority</span>
          <select
            id="task-priority"
            class="ar-field__input"
            (change)="priority.set(+$any($event.target).value)"
          >
            @for (p of priorities; track p) {
              <option [value]="p" [selected]="p === priority()">{{ priorityLabel[p] }}</option>
            }
          </select>
        </label>
      </div>

      <div class="ar-field-row">
        <label class="ar-field">
          <span class="ar-field__label">Who does it</span>
          <select
            id="task-assignee"
            class="ar-field__input"
            (change)="assignee.set($any($event.target).value)"
          >
            @for (u of directory.users(); track u.userId) {
              <option [value]="u.userId" [selected]="u.userId === assignee()">
                {{ u.name }}{{ u.userId === directory.meId ? ' (me)' : '' }}
              </option>
            }
          </select>
        </label>
        <label class="ar-field">
          <span class="ar-field__label">Remind them</span>
          <select
            id="task-reminder"
            class="ar-field__input"
            [disabled]="!due()"
            (change)="
              reminder.set($any($event.target).value === '' ? null : +$any($event.target).value)
            "
          >
            @for (r of reminders; track r.label) {
              <option [value]="r.minutes ?? ''" [selected]="r.minutes === reminder()">
                {{ r.label }}
              </option>
            }
          </select>
        </label>
      </div>

      @if (due()) {
        <ar-recurrence-picker [(draft)]="repeat" />
      } @else {
        <p class="td__hint">
          Give it a due date to make it repeat. When a repeating task is finished, the next one is
          made.
        </p>
      }

      <label class="ar-field">
        <span class="ar-field__label"
          >About a deal <span class="ar-field__opt">optional</span></span
        >
        <select
          id="task-enquiry"
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
          id="task-notes"
          class="ar-field__input"
          rows="3"
          [value]="notes()"
          (input)="notes.set($any($event.target).value)"
        ></textarea>
      </label>

      @if (error(); as msg) {
        <p class="td__err">{{ msg }}</p>
      }

      <div dialogActions>
        @if (task(); as t) {
          @if (t.status === Status.Open) {
            <button
              ar-button
              type="button"
              variant="ghost"
              [disabled]="busy()"
              (click)="cancelTask(t)"
            >
              Cancel task
            </button>
          }
          @if (directory.canDelete) {
            <button ar-button type="button" variant="ghost" [disabled]="busy()" (click)="remove(t)">
              Delete
            </button>
          }
        }
        <button ar-button type="button" variant="ghost" (click)="closed.emit()">Close</button>
        <button
          ar-button
          type="button"
          variant="primary"
          [disabled]="busy() || !title().trim() || !!repeatProblem()"
          (click)="save()"
        >
          {{ busy() ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </ar-dialog>
  `,
  styles: `
    .td__hint {
      margin: 0 0 10px;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
    .td__err {
      margin: 8px 0 0;
      padding: 8px 10px;
      border-radius: var(--ar-radius-control);
      background: var(--ar-red-100);
      color: var(--ar-red-600);
      font: 500 12px var(--ar-font-sans);
    }
  `,
})
export class ArTaskDialog implements OnInit {
  private readonly api = inject(ActivityGateway).tasks;
  protected readonly directory = inject(ActivityDirectory);

  /** The task being edited; none for a new one. */
  readonly task = input<CrmTaskDto | null>(null);
  /** A deal to start a new task off as being about. */
  readonly enquiryPreset = input<string | null>(null);
  readonly saved = output<CrmTaskDto>();
  readonly deleted = output<string>();
  readonly closed = output<void>();

  protected readonly Status = CrmTaskStatus;
  protected readonly priorities = [TaskPriority.Low, TaskPriority.Normal, TaskPriority.High];
  protected readonly priorityLabel = PRIORITY_LABEL;
  protected readonly reminders = REMINDERS;

  protected readonly title = signal('');
  protected readonly notes = signal('');
  protected readonly due = signal('');
  protected readonly priority = signal<TaskPriority>(TaskPriority.Normal);
  protected readonly assignee = signal('');
  protected readonly reminder = signal<number | null>(15);
  protected readonly enquiryId = signal('');
  protected readonly repeat = signal<RecurrenceDraft>({ ...NO_REPEAT });
  protected readonly repeatProblem = computed(() =>
    this.due() ? recurrenceProblem(this.repeat(), false) : null,
  );
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const t = this.task();
    if (t) {
      this.title.set(t.title ?? '');
      this.notes.set(t.notes ?? '');
      this.due.set(toLocalInput(t.dueAtUtc));
      this.priority.set(t.priority ?? TaskPriority.Normal);
      this.assignee.set(t.assigneeUserId ?? '');
      this.reminder.set(t.reminderLeadMinutes ?? null);
      this.enquiryId.set(t.enquiryId ?? '');
      this.repeat.set(toDraft(t.recurrence));
    } else {
      this.assignee.set(this.directory.meId ?? '');
      this.enquiryId.set(this.enquiryPreset() ?? '');
    }
    await this.directory.load();
    if (!this.assignee())
      this.assignee.set(this.directory.meId ?? this.directory.users()[0]?.userId ?? '');
  }

  private body(): CreateUpdateCrmTaskDto {
    const due = fromLocalInput(this.due());
    return {
      title: this.title().trim(),
      notes: this.notes().trim() || null,
      dueAtUtc: due,
      priority: this.priority(),
      assigneeUserId: this.assignee() || null,
      enquiryId: this.enquiryId() || null,
      reminderLeadMinutes: due ? this.reminder() : null,
      // Sent as none rather than left out when it does not repeat, so turning repeating off is an instruction and not a silence.
      recurrence: due
        ? (toRecurrence(this.repeat()) ?? { frequency: RecurrenceFrequency.None })
        : null,
      utcOffsetMinutes: utcOffsetMinutes(),
    };
  }

  protected async save(): Promise<void> {
    await this.run(async () => {
      const t = this.task();
      const result = await firstValueFrom(
        t?.id ? this.api.update(t.id, this.body()) : this.api.create(this.body()),
      );
      this.saved.emit(result);
    }, 'The task could not be saved.');
  }

  protected async cancelTask(t: CrmTaskDto): Promise<void> {
    await this.run(
      async () => this.saved.emit(await firstValueFrom(this.api.cancel(t.id!))),
      'The task could not be cancelled.',
    );
  }

  protected async remove(t: CrmTaskDto): Promise<void> {
    if (!window.confirm(`Delete "${t.title}"?`)) return;
    await this.run(async () => {
      await firstValueFrom(this.api.delete(t.id!));
      this.deleted.emit(t.id!);
    }, 'The task could not be deleted.');
  }

  private async run(work: () => Promise<void>, fallback: string): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await work();
    } catch (e: unknown) {
      this.error.set(errorMessage(e, fallback));
    } finally {
      this.busy.set(false);
    }
  }
}
