import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { CallLogDto, CallOutcome } from '../../proxy/voice';
import { ArButton, ArDialog } from '../../ui';
import { errorMessage } from '../activities/activity-logic';
import { CallGateway } from './call-gateway';
import { OUTCOME_CHOICES, OUTCOME_LABEL, callHeadline, outcomeToOffer } from './call-logic';

/** Saying how a call went and what was said. It follows the call to the contact's timeline and the deal's history. */
@Component({
  selector: 'ar-call-outcome-dialog',
  imports: [ArDialog, ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog title="How did the call go?" (dismiss)="closed.emit()">
      <p class="co__what">{{ call().contactName }} · {{ headline() }}</p>

      <fieldset class="co__choices">
        <legend class="ar-field__label">Outcome</legend>
        @for (o of choices; track o) {
          <label class="co__choice" [class.co__choice--on]="o === outcome()">
            <input
              type="radio"
              name="co-outcome"
              [checked]="o === outcome()"
              (change)="outcome.set(o)"
            />
            <span>{{ label[o] }}</span>
          </label>
        }
      </fieldset>

      <label class="ar-field" for="co-notes">
        <span class="ar-field__label"
          >What was said <span class="ar-field__opt">optional</span></span
        >
        <textarea
          id="co-notes"
          class="ar-field__input"
          rows="4"
          maxlength="2000"
          placeholder="Wants the payback sheet before Friday…"
          [value]="notes()"
          (input)="notes.set($any($event.target).value)"
        ></textarea>
      </label>

      @if (error(); as msg) {
        <p class="co__err" role="alert">{{ msg }}</p>
      }

      <div dialogActions>
        <button ar-button type="button" variant="ghost" (click)="closed.emit()">Not now</button>
        <button ar-button type="button" variant="primary" [disabled]="busy()" (click)="save()">
          {{ busy() ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </ar-dialog>
  `,
  styles: `
    .co__what {
      margin: 0 0 12px;
      font: 500 13px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .co__choices {
      border: 0;
      margin: 0 0 12px;
      padding: 0;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }
    .co__choices legend {
      grid-column: 1 / -1;
      padding: 0;
      margin-bottom: 2px;
    }
    .co__choice {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-control);
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-800);
      cursor: pointer;
    }
    .co__choice--on {
      border-color: var(--ar-teal-600);
      background: var(--ar-bg-100);
    }
    .co__err {
      margin: 8px 0 0;
      padding: 8px 10px;
      border-radius: var(--ar-radius-control);
      background: var(--ar-red-100);
      color: var(--ar-red-600);
      font: 500 12px var(--ar-font-sans);
    }
  `,
})
export class ArCallOutcomeDialog implements OnInit {
  private readonly api = inject(CallGateway).api;

  readonly call = input.required<CallLogDto>();
  readonly saved = output<CallLogDto>();
  readonly closed = output<void>();

  protected readonly choices = OUTCOME_CHOICES;
  protected readonly label = OUTCOME_LABEL;
  protected readonly outcome = signal<CallOutcome>(CallOutcome.Connected);
  protected readonly notes = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected headline(): string {
    return callHeadline(this.call());
  }

  ngOnInit(): void {
    const c = this.call();
    this.outcome.set(outcomeToOffer(c));
    this.notes.set(c.notes ?? '');
  }

  protected async save(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      const updated = await firstValueFrom(
        this.api.setOutcome(this.call().id, {
          outcome: this.outcome(),
          notes: this.notes().trim() || null,
        }),
      );
      this.saved.emit(updated);
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'The outcome could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }
}
