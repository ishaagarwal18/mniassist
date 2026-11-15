import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';

import { readApiError } from '../../../core/util/api-error';
import type {
  EvaluateOfferResultDto,
  NegotiationSessionDto,
} from '../../../proxy/pipeline/negotiation-agent.models';
import { NegotiationAgentService } from '../../../proxy/pipeline/negotiation-agent.service';
import { NegotiationAction } from '../../../proxy/pipeline/negotiation-enums';
import { ArButton, ArChip } from '../../../ui';
import { ChipTone } from '../../../ui/chip';

const ACTION: Record<NegotiationAction, { tone: ChipTone; label: string }> = {
  [NegotiationAction.InitialQuote]: { tone: 'neutral', label: 'Send the quote' },
  [NegotiationAction.CounterOffer]: { tone: 'warn', label: 'Counter' },
  [NegotiationAction.AcceptOffer]: { tone: 'good', label: 'Accept' },
  [NegotiationAction.RejectAndWalkAway]: { tone: 'bad', label: 'Walk away' },
  [NegotiationAction.EscalateToHuman]: { tone: 'bad', label: 'Needs a person' },
};

/** "₹1,23,450.50" or "123450" → paise; null when it isn't a positive amount. */
export function rupeeTextToPaise(text: string): number | null {
  const n = Number(text.replace(/[₹,\s]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

/**
 * For the open negotiation: refreshes the session from the server, then lets a person try the customer's latest
 * counter-offer against the rules (what the agent would do, the resulting margin, and the reply it would send)
 * before anything goes to the customer.
 */
@Component({
  selector: 'ar-counter-offer-check',
  imports: [ArButton, ArChip, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../../shared/work-page.scss',
  styles: `
    :host {
      display: block;
      height: auto;
      margin-top: 14px;
    }
  `,
  template: `
    <section class="wp__card">
      <h3 class="wp__title">Check a counter-offer</h3>
      @if (session(); as s) {
        <p class="wp__muted">
          Now at ₹{{ s.currentAmountInRupees | number: '1.0-0' }} ({{
            s.currentMarginPercent | number: '1.0-1'
          }}% margin) after {{ s.roundCount }} round(s) · {{ s.paymentTerms }} ·
          {{ s.volumeUnits }} units
        </p>
      }
      <div class="wp__grid">
        <label class="wp__field">
          <span>Customer offers (₹)</span>
          <input
            class="ar-field__input"
            inputmode="decimal"
            [value]="amount()"
            (input)="amount.set($any($event.target).value)"
          />
        </label>
        <label class="wp__field">
          <span>Payment terms they ask for</span>
          <input
            class="ar-field__input"
            placeholder="Leave blank: same as now"
            [value]="terms()"
            (input)="terms.set($any($event.target).value)"
          />
        </label>
        <label class="wp__field">
          <span>Quantity they commit to</span>
          <input
            class="ar-field__input"
            type="number"
            min="1"
            placeholder="Same as now"
            [value]="quantity()"
            (input)="quantity.set($any($event.target).value)"
          />
        </label>
      </div>
      @if (error(); as e) {
        <p class="wp__error">{{ e }}</p>
      }
      <div class="wp__actions">
        <button
          ar-button
          type="button"
          variant="primary"
          [disabled]="busy() || !session() || !amount().trim()"
          (click)="check()"
        >
          {{ busy() ? 'Checking…' : 'Check offer' }}
        </button>
      </div>
      @if (result(); as r) {
        <div class="wp__row" style="margin-top: 12px">
          <ar-chip [tone]="action(r.recommendedAction).tone" [dot]="true">{{
            action(r.recommendedAction).label
          }}</ar-chip>
          <span>
            Counter at ₹{{ r.counterOfferAmountInRupees | number: '1.0-0' }} ·
            {{ r.resultingMarginPercent | number: '1.0-1' }}% margin · {{ r.counterPaymentTerms }} ·
            {{ r.counterQuantity }} units
          </span>
          @if (r.requiresHumanApproval) {
            <ar-chip tone="warn">Needs approval</ar-chip>
          }
        </div>
        <p class="wp__sub" style="margin-top: 6px">{{ r.internalRationale }}</p>
        <p class="wp__muted" translate="no" style="white-space: pre-wrap">
          {{ r.whatsAppMessageDraft }}
        </p>
      }
    </section>
  `,
})
export class ArCounterOfferCheck {
  private readonly api = inject(NegotiationAgentService);

  readonly sessionId = input.required<string>();

  protected readonly session = signal<NegotiationSessionDto | null>(null);
  protected readonly amount = signal('');
  protected readonly terms = signal('');
  protected readonly quantity = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly result = signal<EvaluateOfferResultDto | null>(null);

  constructor() {
    effect(() => {
      const id = this.sessionId();
      untracked(() => void this.load(id));
    });
  }

  protected action(a: NegotiationAction) {
    return ACTION[a] ?? ACTION[NegotiationAction.CounterOffer];
  }

  private async load(id: string): Promise<void> {
    this.result.set(null);
    this.error.set(null);
    try {
      this.session.set(await firstValueFrom(this.api.getSession(id, { skipHandleError: true })));
    } catch (e: unknown) {
      this.session.set(null);
      this.error.set(readApiError(e, 'The negotiation could not be loaded.'));
    }
  }

  protected async check(): Promise<void> {
    const s = this.session();
    const proposed = rupeeTextToPaise(this.amount());
    if (!s || proposed === null) {
      this.error.set('Enter the amount the customer offered.');
      return;
    }
    const qty = Number(this.quantity());
    this.busy.set(true);
    this.error.set(null);
    try {
      this.result.set(
        await firstValueFrom(
          this.api.evaluateCounterOffer(
            {
              sessionId: s.id,
              quotationId: s.quotationId,
              baselineAmountInPaise: s.originalAmountInPaise,
              estimatedCostInPaise: s.estimatedCostInPaise,
              proposedAmountInPaise: proposed,
              currentRound: s.roundCount,
              currentPaymentTerms: s.paymentTerms,
              proposedPaymentTerms: this.terms().trim() || undefined,
              currentQuantity: s.volumeUnits,
              proposedQuantity: Number.isFinite(qty) && qty > 0 ? qty : undefined,
            },
            { skipHandleError: true },
          ),
        ),
      );
    } catch (e: unknown) {
      this.error.set(readApiError(e, 'The offer could not be checked.'));
    } finally {
      this.busy.set(false);
    }
  }
}
