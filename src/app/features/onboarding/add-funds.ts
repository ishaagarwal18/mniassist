import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PermissionService } from '@abp/ng.core';
import { firstValueFrom } from 'rxjs';
import { PlatformCheckoutRunner } from '../../core/services/platform-checkout';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { inr } from '../../core/util/format';
import { WalletService } from '../../proxy/billing';
import {
  PlatformCheckoutService,
  type CheckoutGatewayDto,
} from '../../proxy/billing/platform-checkout.service';
import { ArButton } from '../../ui/button';

/** Quick amounts, in rupees. */
export const TOP_UP_PRESETS = [1_000, 5_000, 10_000, 25_000] as const;
export const MIN_TOP_UP = 100;
export const MAX_TOP_UP = 1_000_000;

/** What is wrong with an amount, or null. */
export function topUpProblem(rupees: number): string | null {
  if (!Number.isFinite(rupees) || rupees < MIN_TOP_UP)
    return `Add at least ${inr(MIN_TOP_UP * 100)}.`;
  if (rupees > MAX_TOP_UP) return `Add at most ${inr(MAX_TOP_UP * 100)} at a time.`;
  if (!Number.isInteger(rupees)) return 'Enter a whole number of rupees.';
  return null;
}

interface WalletView {
  balanceInPaise: number;
  chargesStartOn: string | null;
  daysRemaining: number | null;
}

/**
 * Get started, "Add funds": the one thing the step is about — the wallet's balance and a top-up — instead of the
 * whole Billing page (plan, usage, statements). Paying goes through the same checkout as Billing; the server credits
 * the wallet once the gateway confirms, and that ticks the step.
 */
@Component({
  selector: 'ar-onboarding-add-funds',
  imports: [ArButton, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="af">
      <div class="af__bal">
        <span class="af__k">Wallet balance</span>
        @if (wallet(); as w) {
          <span class="af__v ar-mono" translate="no">{{ money(w.balanceInPaise) }}</span>
          @if (w.daysRemaining !== null) {
            <span class="af__n">about {{ w.daysRemaining }} days at your current sending</span>
          }
        } @else {
          <span class="af__v af__v--wait">…</span>
        }
      </div>
      <ul class="af__why">
        <li>
          The wallet pays for WhatsApp messages, at Meta’s rates for your plan. Your plan’s monthly
          fee is billed separately.
        </li>
        <li>
          Before a campaign sends, its cost is checked against the wallet. If the balance cannot
          cover it, the campaign waits until you add funds.
        </li>
        @if (chargesStart(); as day) {
          <li>
            Messages are free until <strong>{{ day }}</strong
            >. Add funds before then so campaigns keep sending.
          </li>
        }
      </ul>
    </div>

    @if (!canTopUp) {
      <p class="af__note" role="status">
        Your role cannot add funds. Ask your workspace owner or an admin to top up the wallet.
      </p>
    } @else {
      <fieldset class="af__form" [disabled]="busy()">
        <legend class="af__k">Amount to add</legend>
        <div class="af__presets">
          @for (p of presets; track p) {
            <button
              type="button"
              class="af__chip"
              [class.af__chip--on]="amount() === p"
              [attr.aria-pressed]="amount() === p"
              (click)="amount.set(p)"
            >
              {{ rupees(p) }}
            </button>
          }
          <label class="af__custom">
            <span class="af__sr">Other amount in rupees</span>
            <span aria-hidden="true">₹</span>
            <input
              class="ar-field__input ar-mono"
              type="number"
              [min]="min"
              [max]="max"
              step="1"
              inputmode="numeric"
              [value]="amount()"
              (input)="amount.set(+$any($event.target).value)"
            />
          </label>
        </div>
        @if (problem(); as p) {
          <p class="af__err" role="alert">{{ p }}</p>
        }

        @if (gateways().length > 1) {
          <label class="ar-field af__pay">
            <span class="ar-field__label">Pay with</span>
            <select class="ar-field__input" (change)="gateway.set($any($event.target).value)">
              @for (g of gateways(); track g.name) {
                <option [value]="g.name" [selected]="g.name === gateway()">{{ g.label }}</option>
              }
            </select>
          </label>
        } @else if (gatewaysLoaded() && gateways().length === 0) {
          <p class="af__note">
            Online payment is not set up for this platform yet. Pay by bank transfer, then enter the
            payment reference below: the wallet is credited once the payment is confirmed.
          </p>
          <label class="ar-field af__pay">
            <span class="ar-field__label">Payment reference</span>
            <input
              class="ar-field__input"
              placeholder="e.g. UTR or gateway payment ID"
              [value]="reference()"
              (input)="reference.set($any($event.target).value)"
            />
          </label>
        }

        <div class="af__row">
          <button
            ar-button
            type="button"
            variant="primary"
            icon="billing"
            [disabled]="busy() || !!problem() || !gatewaysLoaded()"
            (click)="pay()"
          >
            {{ busy() ? 'Processing…' : 'Add ' + rupees(amount()) }}
          </button>
          <span class="af__n">You pay on the gateway’s secure page.</span>
        </div>
      </fieldset>
    }

    <p class="af__more">
      Plan, usage, statements and auto top-up are on the
      <a routerLink="/billing">Billing page</a>.
    </p>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 4px;
    }
    .af {
      display: grid;
      grid-template-columns: minmax(180px, 220px) 1fr;
      gap: 18px;
      padding: 14px 18px;
      background: var(--ar-bg-100);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
    }
    @media (max-width: 640px) {
      .af {
        grid-template-columns: 1fr;
      }
    }
    .af__bal {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .af__k {
      padding: 0;
      font: 600 10.5px var(--ar-font-sans);
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--ar-ink-400);
    }
    .af__v {
      font: 600 24px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .af__v--wait {
      color: var(--ar-ink-400);
    }
    .af__n {
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .af__why {
      margin: 0;
      padding-left: 18px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font: 400 13px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .af__form {
      margin: 0;
      padding: 0;
      border: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .af__presets {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .af__chip {
      height: 32px;
      padding: 0 14px;
      border: 1px solid var(--ar-line-300);
      border-radius: 999px;
      background: var(--ar-white);
      font: 600 13px var(--ar-font-sans);
      color: var(--ar-ink-700);
      cursor: pointer;
    }
    .af__chip:hover,
    .af__chip:focus-visible {
      border-color: var(--ar-primary);
    }
    .af__chip--on {
      border-color: var(--ar-primary);
      background: color-mix(in srgb, var(--ar-primary) 10%, transparent);
      color: var(--ar-ink-900);
    }
    .af__custom {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font: 600 13px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .af__custom input {
      width: 130px;
    }
    .af__sr {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
    .af__pay {
      max-width: 360px;
    }
    .af__row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
    }
    .af__err {
      margin: 0;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-red-500, #c62828);
    }
    .af__note {
      margin: 0;
      font: 400 13px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .af__more {
      margin: 0;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
  `,
})
export class ArOnboardingAddFunds implements OnInit {
  private readonly walletApi = inject(WalletService);
  private readonly checkoutApi = inject(PlatformCheckoutService);
  private readonly checkout = inject(PlatformCheckoutRunner);
  private readonly toasts = inject(ToastService);

  /** The wallet was credited here: the wizard re-reads the checklist (the server ticked the step). */
  readonly funded = output<void>();

  protected readonly canTopUp =
    inject(PermissionService).getGrantedPolicy('AutoReach.Billing.TopUp');
  protected readonly presets = TOP_UP_PRESETS;
  protected readonly min = MIN_TOP_UP;
  protected readonly max = MAX_TOP_UP;

  protected readonly wallet = signal<WalletView | null>(null);
  protected readonly gateways = signal<CheckoutGatewayDto[]>([]);
  protected readonly gatewaysLoaded = signal(false);
  protected readonly gateway = signal('');
  protected readonly amount = signal<number>(TOP_UP_PRESETS[1]);
  protected readonly reference = signal('');
  protected readonly busy = signal(false);

  protected readonly problem = computed(() => topUpProblem(this.amount()));
  protected readonly chargesStart = computed(() => {
    const iso = this.wallet()?.chargesStartOn;
    if (!iso || new Date(iso).getTime() <= Date.now()) return null;
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  });

  ngOnInit(): void {
    void this.loadWallet();
    void this.loadGateways();
  }

  protected money(paise: number): string {
    return inr(paise);
  }

  protected rupees(r: number): string {
    return inr((Number.isFinite(r) ? r : 0) * 100);
  }

  private async loadWallet(): Promise<void> {
    try {
      const w = await firstValueFrom(this.walletApi.get());
      this.wallet.set({
        balanceInPaise: w.balanceInPaise ?? 0,
        chargesStartOn: w.chargesStartOnUtc ?? null,
        daysRemaining: w.estimatedDaysRemaining ?? null,
      });
    } catch {
      // The balance is a nicety here; topping up still works.
      this.wallet.set({ balanceInPaise: 0, chargesStartOn: null, daysRemaining: null });
    }
  }

  private async loadGateways(): Promise<void> {
    const g = await this.checkout.gateways();
    this.gateways.set(g);
    if (g.length > 0) this.gateway.set(g[0].name);
    this.gatewaysLoaded.set(true);
  }

  protected async pay(): Promise<void> {
    const rupees = this.amount();
    const problem = topUpProblem(rupees);
    if (problem) {
      this.toasts.warning(problem, 'Add funds');
      return;
    }
    const amountInPaise = Math.round(rupees * 100);
    this.busy.set(true);
    try {
      if (this.gateways().length > 0) {
        const start = await firstValueFrom(
          this.checkoutApi.startTopUp({ gateway: this.gateway(), amountInPaise }),
        );
        const outcome = await this.checkout.pay(start);
        if (outcome === 'paid') this.credited(amountInPaise);
        else if (outcome === 'failed')
          this.toasts.error('The payment did not go through. Nothing was charged.', 'Add funds');
        // 'redirected': PayU takes the browser to its page and back to Billing, which shows the result.
      } else {
        const ref = this.reference().trim();
        if (!ref) {
          this.toasts.warning(
            'Enter the payment reference from your bank or gateway.',
            'Add funds',
          );
          return;
        }
        await firstValueFrom(this.walletApi.topUp({ amountInPaise, reference: ref }));
        this.credited(amountInPaise);
      }
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The payment could not be processed.'), 'Add funds');
    } finally {
      this.busy.set(false);
    }
  }

  private credited(amountInPaise: number): void {
    this.toasts.success(`${inr(amountInPaise)} added to the wallet.`, 'Add funds');
    this.reference.set('');
    void this.loadWallet();
    this.funded.emit();
  }
}
