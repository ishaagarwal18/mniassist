import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { CallLogDto, CallOutcome, VoiceCallDirection } from '../../proxy/voice';
import { ArButton, ArDialog } from '../../ui';
import { errorMessage, fromLocalInput, toLocalInput } from '../activities/activity-logic';
import { CallGateway } from './call-mock';
import { OUTCOME_CHOICES, OUTCOME_LABEL } from './call-logic';

/** Writing up a call made or taken on the rep's own phone, so the contact's and the deal's history is complete. */
@Component({
  selector: 'ar-log-call-dialog',
  imports: [ArDialog, ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog [title]="'Log a call with ' + contactName()" (dismiss)="closed.emit(null)">
      <div class="ar-field-row">
        <label class="ar-field" for="lc-dir">
          <span class="ar-field__label">Direction</span>
          <select
            id="lc-dir"
            class="ar-field__input"
            (change)="direction.set(+$any($event.target).value)"
          >
            <option [value]="Out" [selected]="direction() === Out">I called them</option>
            <option [value]="In" [selected]="direction() === In">They called me</option>
          </select>
        </label>
        <label class="ar-field" for="lc-when">
          <span class="ar-field__label">Started</span>
          <input
            id="lc-when"
            class="ar-field__input"
            type="datetime-local"
            [max]="now"
            [value]="when()"
            (input)="when.set($any($event.target).value)"
          />
        </label>
      </div>

      <div class="ar-field-row">
        <label class="ar-field" for="lc-min">
          <span class="ar-field__label">Minutes on the call</span>
          <input
            id="lc-min"
            class="ar-field__input"
            type="number"
            min="0"
            max="360"
            [value]="minutes()"
            (input)="minutes.set(+$any($event.target).value)"
          />
        </label>
        <label class="ar-field" for="lc-outcome">
          <span class="ar-field__label">How it went</span>
          <select
            id="lc-outcome"
            class="ar-field__input"
            (change)="outcome.set(+$any($event.target).value)"
          >
            @for (o of choices; track o) {
              <option [value]="o" [selected]="o === outcome()">{{ label[o] }}</option>
            }
          </select>
        </label>
      </div>

      <label class="ar-field" for="lc-notes">
        <span class="ar-field__label"
          >What was said <span class="ar-field__opt">optional</span></span
        >
        <textarea
          id="lc-notes"
          class="ar-field__input"
          rows="4"
          maxlength="2000"
          [value]="notes()"
          (input)="notes.set($any($event.target).value)"
        ></textarea>
      </label>

      <p class="lc__hint">This records a call that already happened. Nothing is dialled.</p>

      @if (error(); as msg) {
        <p class="lc__err" role="alert">{{ msg }}</p>
      }

      <div dialogActions>
        <button ar-button type="button" variant="ghost" (click)="closed.emit(null)">Cancel</button>
        <button
          ar-button
          type="button"
          variant="primary"
          [disabled]="busy() || !when()"
          (click)="save()"
        >
          {{ busy() ? 'Saving…' : 'Log call' }}
        </button>
      </div>
    </ar-dialog>
  `,
  styles: `
    .lc__hint {
      margin: 0;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
    .lc__err {
      margin: 8px 0 0;
      padding: 8px 10px;
      border-radius: var(--ar-radius-control);
      background: var(--ar-red-100);
      color: var(--ar-red-600);
      font: 500 12px var(--ar-font-sans);
    }
  `,
})
export class ArLogCallDialog {
  private readonly api = inject(CallGateway).api;

  readonly contactId = input.required<string>();
  readonly contactName = input('the customer');
  readonly enquiryId = input<string | null>(null);
  /** Emitted on close: the logged call, or null if nothing was logged. */
  readonly closed = output<CallLogDto | null>();

  protected readonly Out = VoiceCallDirection.Outbound;
  protected readonly In = VoiceCallDirection.Inbound;
  protected readonly choices = OUTCOME_CHOICES;
  protected readonly label = OUTCOME_LABEL;

  protected readonly now = toLocalInput(new Date().toISOString());
  protected readonly direction = signal<VoiceCallDirection>(VoiceCallDirection.Outbound);
  protected readonly when = signal(toLocalInput(new Date().toISOString()));
  protected readonly minutes = signal(5);
  protected readonly outcome = signal<CallOutcome>(CallOutcome.Connected);
  protected readonly notes = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async save(): Promise<void> {
    const started = fromLocalInput(this.when());
    if (!started || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      const call = await firstValueFrom(
        this.api.logManual({
          contactId: this.contactId(),
          enquiryId: this.enquiryId(),
          direction: this.direction(),
          startedAtUtc: started,
          durationSeconds: Math.max(0, Math.round((this.minutes() || 0) * 60)),
          outcome: this.outcome(),
          notes: this.notes().trim() || null,
        }),
      );
      this.closed.emit(call);
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'The call could not be logged.'));
    } finally {
      this.busy.set(false);
    }
  }
}
