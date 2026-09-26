import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { CrmTaskDto, CrmTaskStatus, MeetingDto, MeetingStatus } from '../../proxy/activities';
import { ArButton } from '../../ui';
import { ActivityDirectory } from './activity-directory';
import { addDays, dueLabel, errorMessage, timeRange } from './activity-logic';
import { ActivityGateway } from './activity-mock';
import { ArMeetingDialog } from './meeting-dialog';
import { ArTaskDialog } from './task-dialog';

/**
 * A deal's open tasks and coming meetings, with the two shortcuts to add one for it. Shown in the enquiry drawer so a follow-up can
 * be set the moment a deal is looked at, without leaving the board or picking the deal from a list.
 */
@Component({
  selector: 'ar-enquiry-activities',
  imports: [ArButton, ArTaskDialog, ArMeetingDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3 class="ea__t">Tasks and meetings</h3>

    @if (error(); as msg) {
      <p class="ea__err">{{ msg }}</p>
    }

    @for (t of tasks(); track t.id) {
      <div class="ea__row">
        <input
          type="checkbox"
          [id]="'ea-t-' + t.id"
          [attr.aria-label]="'Done: ' + t.title"
          [disabled]="!directory.canUpdate"
          (change)="complete(t)"
        />
        <label class="ea__what" [for]="'ea-t-' + t.id">{{ t.title }}</label>
        <span class="ea__when" [class.ea__when--late]="late(t)">{{ due(t) }}</span>
      </div>
    }
    @for (m of meetings(); track m.id) {
      <div class="ea__row">
        <span class="ea__dot" aria-hidden="true"></span>
        <span class="ea__what">{{ m.title }}</span>
        <span class="ea__when">{{ range(m) }}</span>
      </div>
    }
    @if (!tasks().length && !meetings().length && !loading()) {
      <p class="ea__empty">Nothing planned for this deal yet.</p>
    }

    @if (directory.canCreate) {
      <div class="ea__add">
        <button ar-button type="button" variant="ghost" (click)="addingTask.set(true)">
          Add a task
        </button>
        <button ar-button type="button" variant="ghost" (click)="addingMeeting.set(true)">
          Schedule a meeting
        </button>
      </div>
    }

    @if (addingTask()) {
      <ar-task-dialog
        [enquiryPreset]="enquiryId()"
        (saved)="done()"
        (deleted)="done()"
        (closed)="addingTask.set(false)"
      />
    }
    @if (addingMeeting()) {
      <ar-meeting-dialog
        [enquiryPreset]="enquiryId()"
        (saved)="done()"
        (closed)="addingMeeting.set(false)"
      />
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .ea__t {
      margin: 0 0 8px;
      font: 600 12px var(--ar-font-sans);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ar-ink-500);
    }
    .ea__row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 0;
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .ea__what {
      flex: 1;
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .ea__when {
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-400);
      white-space: nowrap;
    }
    .ea__when--late {
      color: var(--ar-red-600);
    }
    .ea__dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--ar-teal-600);
      margin: 0 4px;
      flex: none;
    }
    .ea__empty {
      margin: 0;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
    .ea__add {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
    .ea__err {
      margin: 0 0 8px;
      padding: 8px 10px;
      border-radius: var(--ar-radius-control);
      background: var(--ar-red-100);
      color: var(--ar-red-600);
      font: 500 12px var(--ar-font-sans);
    }
  `,
})
export class ArEnquiryActivities {
  private readonly gateway = inject(ActivityGateway);
  protected readonly directory = inject(ActivityDirectory);

  readonly enquiryId = input.required<string>();

  protected readonly tasks = signal<CrmTaskDto[]>([]);
  protected readonly meetings = signal<MeetingDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly addingTask = signal(false);
  protected readonly addingMeeting = signal(false);

  private readonly tick = signal(0);

  constructor() {
    void this.directory.load();
    effect(() => {
      const id = this.enquiryId();
      this.tick();
      untracked(() => void this.load(id));
    });
  }

  private async load(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const now = new Date();
      const [tasks, meetings] = await Promise.all([
        firstValueFrom(
          this.gateway.tasks.getList({
            enquiryId: id,
            status: CrmTaskStatus.Open,
            maxResultCount: 20,
          }),
        ),
        firstValueFrom(
          this.gateway.meetings.getList({
            enquiryId: id,
            everyone: true,
            fromUtc: now.toISOString(),
            toUtc: addDays(now, 90).toISOString(),
          }),
        ),
      ]);
      // A stale answer for a deal the drawer has moved off is dropped.
      if (id !== this.enquiryId()) return;
      this.tasks.set(tasks.items ?? []);
      this.meetings.set(meetings.filter((m) => m.status === MeetingStatus.Scheduled));
      this.error.set(null);
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'Tasks and meetings could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected due(t: CrmTaskDto): string {
    return dueLabel(t.dueAtUtc, new Date(), t.status);
  }

  protected late(t: CrmTaskDto): boolean {
    return !!t.dueAtUtc && Date.parse(t.dueAtUtc) < Date.now();
  }

  protected range(m: MeetingDto): string {
    return `${new Date(m.startUtc!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${timeRange(m.startUtc!, m.endUtc!)}`;
  }

  protected async complete(t: CrmTaskDto): Promise<void> {
    try {
      await firstValueFrom(this.gateway.tasks.complete(t.id!));
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'The task could not be completed.'));
    }
    this.tick.update((n) => n + 1);
  }

  protected done(): void {
    this.addingTask.set(false);
    this.addingMeeting.set(false);
    this.tick.update((n) => n + 1);
  }
}
