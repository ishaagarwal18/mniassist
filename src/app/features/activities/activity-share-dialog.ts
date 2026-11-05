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

import { ActivitySendLineDto, ReminderChannels } from '../../proxy/activities';
import { ArButton, ArDialog } from '../../ui';
import { ActivityDirectory } from './activity-directory';
import { channelLabel } from './activity-links.logic';
import { ActivityGateway } from './activity-mock';
import { errorMessage } from './activity-logic';
import { ArReminderChannels } from './reminder-channels';

/** Sends a task or meeting to colleagues now: WhatsApp by default, email and SMS too if wanted. Says what happened for each. */
@Component({
  selector: 'ar-activity-share-dialog',
  imports: [ArDialog, ArButton, ArReminderChannels],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog
      [title]="'Share ' + (kind() === 'task' ? 'task' : 'meeting')"
      (dismiss)="closed.emit()"
    >
      <p class="sd__what" translate="no">{{ title() }}</p>

      @if (!lines()) {
        <div class="ar-field">
          <span class="ar-field__label">Send to</span>
          <ul class="sd__people">
            @for (u of people(); track u.userId) {
              <li>
                <label class="sd__person">
                  <input
                    type="checkbox"
                    [checked]="chosen().includes(u.userId!)"
                    (change)="toggle(u.userId!, $any($event.target).checked)"
                  />
                  {{ u.name }}
                </label>
              </li>
            } @empty {
              <li class="sd__note">No colleagues to send to.</li>
            }
          </ul>
        </div>

        <ar-reminder-channels label="Send by" [(channels)]="channels" />

        @if (hasEmail()) {
          <label class="ar-field" for="sd-note">
            <span class="ar-field__label"
              >A note with it <span class="ar-field__opt">optional, by email</span></span
            >
            <textarea
              id="sd-note"
              class="ar-field__input"
              rows="2"
              maxlength="500"
              [value]="note()"
              (input)="note.set($any($event.target).value)"
            ></textarea>
          </label>
        }
      } @else {
        <ul class="sd__result" aria-live="polite">
          @for (l of lines(); track $index) {
            <li [class.sd__bad]="!l.sent">
              <strong>{{ l.name }}</strong> · {{ channel(l.channel) }}:
              {{ l.sent ? 'sent' : 'not sent' }} ({{ l.note }})
            </li>
          } @empty {
            <li>Nothing was sent.</li>
          }
        </ul>
      }

      @if (error(); as e) {
        <p class="sd__err" role="alert">{{ e }}</p>
      }

      <div dialogActions>
        <button ar-button type="button" variant="ghost" (click)="closed.emit()">
          {{ lines() ? 'Close' : 'Cancel' }}
        </button>
        @if (!lines()) {
          <button
            ar-button
            type="button"
            variant="primary"
            icon="send"
            [disabled]="busy() || !chosen().length || !channels()"
            (click)="send()"
          >
            {{ busy() ? 'Sending…' : 'Send' }}
          </button>
        }
      </div>
    </ar-dialog>
  `,
  styles: `
    .sd__what {
      margin: 0 0 10px;
      font: 600 13.5px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .sd__people {
      margin: 0;
      padding: 0;
      list-style: none;
      max-height: 220px;
      overflow-y: auto;
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-control);
    }
    .sd__people li + li {
      border-top: 1px solid var(--ar-line-200);
    }
    .sd__person {
      display: flex;
      gap: 8px;
      align-items: center;
      padding: 7px 10px;
      cursor: pointer;
      font: 400 13px var(--ar-font-sans);
    }
    .sd__note {
      padding: 8px 10px;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
    .sd__result {
      margin: 0;
      padding-left: 18px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      font: 400 13px/1.45 var(--ar-font-sans);
      color: var(--ar-good-700, #067647);
    }
    .sd__bad {
      color: var(--ar-amber-800, #93370d);
    }
    .sd__err {
      margin: 8px 0 0;
      padding: 8px 10px;
      border-radius: var(--ar-radius-control);
      background: var(--ar-red-100);
      color: var(--ar-red-600);
      font: 500 12px var(--ar-font-sans);
    }
  `,
})
export class ArActivityShareDialog implements OnInit {
  private readonly gateway = inject(ActivityGateway);
  protected readonly directory = inject(ActivityDirectory);

  readonly kind = input.required<'task' | 'meeting'>();
  readonly activityId = input.required<string>();
  readonly title = input('');
  readonly closed = output<void>();

  protected readonly chosen = signal<string[]>([]);
  protected readonly channels = signal<ReminderChannels>(ReminderChannels.WhatsApp);
  protected readonly note = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly lines = signal<ActivitySendLineDto[] | null>(null);

  /** Everyone but me: sharing is for colleagues. */
  protected readonly people = computed(() =>
    this.directory.users().filter((u) => u.userId !== this.directory.meId),
  );
  protected readonly hasEmail = computed(() => (this.channels() & ReminderChannels.Email) !== 0);

  async ngOnInit(): Promise<void> {
    await this.directory.load();
  }

  protected toggle(id: string, on: boolean): void {
    this.chosen.update((ids) => (on ? [...new Set([...ids, id])] : ids.filter((x) => x !== id)));
  }

  protected channel(c: ReminderChannels | undefined): string {
    return channelLabel(c);
  }

  protected async send(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const input = {
        userIds: this.chosen(),
        channels: this.channels(),
        note: this.hasEmail() ? this.note().trim() || null : null,
      };
      const api = this.kind() === 'task' ? this.gateway.tasks : this.gateway.meetings;
      const result = await firstValueFrom(api.share(this.activityId(), input));
      this.lines.set(result.lines ?? []);
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'It could not be shared.'));
    } finally {
      this.busy.set(false);
    }
  }
}
