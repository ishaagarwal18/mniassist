import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { WalletService } from '../../proxy/billing/wallet.service';
import { ArButton } from '../../ui';

/** Rupees typed by a person → paise for the API; NaN and negatives become 0. */
export function rupeesToPaise(value: string | number): number {
  const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}

/** Edits the wallet's low-balance threshold and auto top-up (WalletAppService.ConfigureAutoTopUpAsync). */
@Component({
  selector: 'ar-auto-top-up-card',
  imports: [ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../shared/work-page.scss',
  styles: `
    :host {
      display: block;
      height: auto;
    }
  `,
  template: `
    <section class="wp__card">
      <h2 class="wp__title">Low balance & auto top-up</h2>
      <p class="wp__muted">You are alerted when the balance falls to the threshold.</p>
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
  private readonly toasts = inject(ToastService);

  readonly enabledIn = input(false);
  readonly amountInPaise = input(0);
  readonly thresholdInPaise = input(0);
  readonly saved = output<void>();

  protected readonly enabled = signal(false);
  protected readonly amount = signal<string>('0');
  protected readonly threshold = signal<string>('0');
  protected readonly saving = signal(false);

  constructor() {
    effect(() => {
      const e = this.enabledIn();
      const a = this.amountInPaise();
      const t = this.thresholdInPaise();
      untracked(() => {
        this.enabled.set(e);
        this.amount.set(String((a ?? 0) / 100));
        this.threshold.set(String((t ?? 0) / 100));
      });
    });
  }

  protected problem(): string | null {
    if (this.enabled() && rupeesToPaise(this.amount()) < 100 * 100)
      return 'Top up at least ₹100 at a time.';
    return null;
  }

  protected async save(): Promise<void> {
    this.saving.set(true);
    try {
      await firstValueFrom(
        this.api.configureAutoTopUp(
          {
            enabled: this.enabled(),
            amountInPaise: rupeesToPaise(this.amount()),
            thresholdInPaise: rupeesToPaise(this.threshold()),
          },
          { skipHandleError: true },
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
