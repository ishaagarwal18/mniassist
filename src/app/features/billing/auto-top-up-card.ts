import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { PlatformCheckoutRunner } from '../../core/services/platform-checkout';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import type { WalletDto } from '../../proxy/billing/models';
import { PlatformCheckoutService } from '../../proxy/billing/platform-checkout.service';
import { WalletService } from '../../proxy/billing/wallet.service';
import { ArButton, ArChip } from '../../ui';

/** Rupees typed by a person → paise for the API; NaN and negatives become 0. */
export function rupeesToPaise(value: string | number): number {
  const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}

/** Why the automatic top-up settings cannot be saved as typed, or null when they can. */
export function autoTopUpProblem(
  enabled: boolean,
  hasCard: boolean,
  amountInPaise: number,
  maxInPaise: number,
): string | null {
  if (!enabled) return null;
  if (!hasCard) return 'Save a card first: automatic top-ups are charged to it.';
  if (amountInPaise < 100_00) return 'Top up at least ₹100 at a time.';
  if (maxInPaise > 0 && amountInPaise > maxInPaise)
    return `One automatic top-up can be at most ₹${(maxInPaise / 100).toLocaleString('en-IN')}.`;
  return null;
}

/**
 * The wallet's low-balance threshold and automatic top-up. Automatic top-ups are charged to a card saved at a Razorpay
 * checkout (a recurring card mandate, at most ₹15,000 a charge under RBI's rules); the wallet is credited once Razorpay
 * confirms each charge.
 */
@Component({
  selector: 'ar-auto-top-up-card',
  imports: [ArButton, ArChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../shared/work-page.scss',
  styles: `
    :host {
      display: block;
      height: auto;
    }
    .atu__card {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      padding: 10px 12px;
      margin: 10px 0;
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-control);
      background: var(--ar-bg-50);
    }
    .atu__card strong {
      font: 600 13px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .atu__grow {
      flex: 1;
    }
    .atu__save {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      flex-wrap: wrap;
    }
    .atu__save .wp__field {
      max-width: 180px;
    }
  `,
  template: `
    <section class="wp__card">
      <h2 class="wp__title">Low balance &amp; auto top-up</h2>
      <p class="wp__muted">
        You are alerted when the balance falls to the threshold. With a saved card, the wallet tops
        itself up then.
      </p>

      @if (wallet(); as w) {
        @if (w.hasCard) {
          <div class="atu__card">
            <strong translate="no">{{ w.cardLabel || 'Saved card' }}</strong>
            @if (w.cardTestMode) {
              <ar-chip tone="amber">Test card</ar-chip>
            }
            @if (w.autoTopUpWaiting) {
              <ar-chip tone="teal" [dot]="true">Charge waiting for the bank</ar-chip>
            }
            <span class="atu__grow"></span>
            <button ar-button type="button" variant="quiet" [disabled]="busy()" (click)="removeCard()">
              Remove card
            </button>
          </div>
          @if (w.autoTopUpLastError) {
            @if (w.autoTopUpEnabled) {
              <p class="wp__error" role="alert">
                The last automatic top-up failed: {{ w.autoTopUpLastError }}
              </p>
            } @else {
              <p class="wp__error" role="alert">
                Automatic top-up paused after {{ w.autoTopUpFailures }} failed charges: {{
                  w.autoTopUpLastError
                }}
              </p>
            }
          }
        } @else if (hasRazorpay()) {
          <div class="atu__save">
            <label class="wp__field">
              <span>First top-up (₹)</span>
              <input
                class="ar-field__input"
                type="number"
                min="100"
                step="500"
                [value]="firstAmount()"
                (input)="firstAmount.set($any($event.target).value)"
              />
            </label>
            <button
              ar-button
              type="button"
              variant="ghost"
              icon="billing"
              [disabled]="busy() || rupeesToPaise(firstAmount()) < 10000"
              (click)="saveCard()"
            >
              {{ busy() ? 'Opening Razorpay…' : 'Pay and save card' }}
            </button>
          </div>
          <p class="wp__muted">
            Pay a first top-up by card through Razorpay and the card is saved for automatic top-ups,
            of up to ₹15,000 each.
          </p>
        } @else {
          <p class="wp__muted">
            Automatic top-up needs Razorpay, which a platform administrator turns on under Platform ›
            Payment gateways.
          </p>
        }
      }

      <div class="wp__grid">
        <label class="wp__field">
          <span>Low-balance threshold (₹)</span>
          <input
            class="ar-field__input"
            type="number"
            min="0"
            step="100"
            [value]="threshold()"
            (input)="threshold.set($any($event.target).value)"
          />
        </label>
        <label class="wp__field">
          <span>Top-up amount (₹)</span>
          <input
            class="ar-field__input"
            type="number"
            min="0"
            step="500"
            [max]="maxRupees()"
            [disabled]="!enabled()"
            [value]="amount()"
            (input)="amount.set($any($event.target).value)"
          />
        </label>
      </div>
      <label class="wp__row" style="margin-top: 10px">
        <input
          type="checkbox"
          [checked]="enabled()"
          [disabled]="!wallet()?.hasCard"
          (change)="enabled.set($any($event.target).checked)"
        />
        <span>Top up automatically when the balance reaches the threshold</span>
      </label>
      @if (problem(); as p) {
        <p class="wp__error">{{ p }}</p>
      }
      <div class="wp__actions">
        <button
          ar-button
          type="button"
          variant="primary"
          [disabled]="saving() || problem() !== null"
          (click)="save()"
        >
          {{ saving() ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </section>
  `,
})
export class ArAutoTopUpCard {
  private readonly api = inject(WalletService);
  private readonly checkoutApi = inject(PlatformCheckoutService);
  private readonly checkout = inject(PlatformCheckoutRunner);
  private readonly dialogs = inject(ConfirmService);
  private readonly toasts = inject(ToastService);

  /** The wallet changed (settings saved, card saved with a top-up, card removed). */
  readonly saved = output<void>();

  protected readonly wallet = signal<WalletDto | null>(null);
  protected readonly hasRazorpay = signal(false);
  protected readonly enabled = signal(false);
  protected readonly amount = signal<string>('0');
  protected readonly threshold = signal<string>('0');
  protected readonly firstAmount = signal<string>('1000');
  protected readonly saving = signal(false);
  protected readonly busy = signal(false);
  protected readonly rupeesToPaise = rupeesToPaise;

  protected readonly maxRupees = computed(() => (this.wallet()?.maxAutoTopUpInPaise ?? 0) / 100 || null);
  protected readonly problem = computed(() =>
    autoTopUpProblem(
      this.enabled(),
      !!this.wallet()?.hasCard,
      rupeesToPaise(this.amount()),
      this.wallet()?.maxAutoTopUpInPaise ?? 0,
    ),
  );

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const [w, gateways] = await Promise.all([
        firstValueFrom(this.api.get({ skipHandleError: true })),
        this.checkout.gateways(),
      ]);
      this.apply(w);
      this.hasRazorpay.set(gateways.some((g) => g.name === 'Razorpay'));
    } catch {
      /* the Billing page shows its own error */
    }
  }

  private apply(w: WalletDto): void {
    this.wallet.set(w);
    this.enabled.set(!!w.autoTopUpEnabled);
    this.amount.set(String((w.autoTopUpAmountInPaise ?? 0) / 100));
    this.threshold.set(String((w.lowBalanceThresholdInPaise ?? 0) / 100));
  }

  protected async saveCard(): Promise<void> {
    const amountInPaise = rupeesToPaise(this.firstAmount());
    this.busy.set(true);
    try {
      const start = await firstValueFrom(this.checkoutApi.startCardSetup({ amountInPaise }));
      const outcome = await this.checkout.pay(start);
      if (outcome === 'paid') {
        this.toasts.success('Payment received and card saved for automatic top-ups.', 'Billing');
        await this.load();
        this.saved.emit();
      } else if (outcome === 'failed') {
        this.toasts.error('The payment did not go through. No card was saved.', 'Billing');
      }
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The card could not be saved.'), 'Billing');
    } finally {
      this.busy.set(false);
    }
  }

  protected async removeCard(): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: 'Remove the saved card?',
      message: 'Automatic top-up stops. You can save a card again with your next top-up.',
      confirmText: 'Remove',
      tone: 'danger',
    });
    if (!ok) return;
    this.busy.set(true);
    try {
      this.apply(await firstValueFrom(this.api.removeSavedCard({ skipHandleError: true })));
      this.toasts.success('Card removed. Automatic top-up is off.', 'Billing');
      this.saved.emit();
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The card could not be removed.'), 'Billing');
    } finally {
      this.busy.set(false);
    }
  }

  protected async save(): Promise<void> {
    this.saving.set(true);
    try {
      this.apply(
        await firstValueFrom(
          this.api.configureAutoTopUp(
            {
              enabled: this.enabled(),
              amountInPaise: Math.max(rupeesToPaise(this.amount()), 100_00),
              thresholdInPaise: rupeesToPaise(this.threshold()),
            },
            { skipHandleError: true },
          ),
        ),
      );
      this.toasts.success('Wallet settings saved.', 'Billing');
      this.saved.emit();
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The settings could not be saved.'), 'Billing');
    } finally {
      this.saving.set(false);
    }
  }
}
