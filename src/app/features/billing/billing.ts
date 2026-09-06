import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, forkJoin, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  BillingService,
  SubscriptionPlan,
  WalletService,
  WalletTransactionType,
} from '../../proxy/billing';
import { inr } from '../../core/util/format';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArMeter, ArStatTile } from '../../ui';

const PLAN_NAME: Record<SubscriptionPlan, string> = {
  [SubscriptionPlan.Starter]: 'Starter',
  [SubscriptionPlan.Growth]: 'Growth',
  [SubscriptionPlan.Pro]: 'Pro',
  [SubscriptionPlan.Enterprise]: 'Enterprise',
};
const TXN: Record<WalletTransactionType, string> = {
  [WalletTransactionType.TopUp]: 'Top-up',
  [WalletTransactionType.MessageCharge]: 'Message charge',
  [WalletTransactionType.Refund]: 'Refund',
  [WalletTransactionType.Adjustment]: 'Adjustment',
};

interface Txn {
  id: string;
  kind: string;
  amountInPaise: number;
  balanceAfterInPaise: number;
  description?: string;
  at?: string;
}

const SEED = {
  balanceInPaise: 18_420_00,
  isLow: false,
  daysRemaining: 21,
  autoTopUp: true,
  autoAmountInPaise: 20_000_00,
  plan: SubscriptionPlan.Growth,
  feeInPaise: 49_99_00,
  seats: 10,
  periodEnd: '2026-09-30',
  billed: 8_640_00,
  tax: 1_555_00,
  free: 3_240,
  avoided: 372_600,
  transactions: [
    {
      id: 't-1',
      kind: 'Top-up',
      amountInPaise: 20_000_00,
      balanceAfterInPaise: 32_800_00,
      description: 'Razorpay pay_Nx…',
      at: '2026-08-28',
    },
    {
      id: 't-2',
      kind: 'Message charge',
      amountInPaise: -4_380_00,
      balanceAfterInPaise: 28_420_00,
      description: 'August newsletter',
      at: '2026-08-29',
    },
    {
      id: 't-3',
      kind: 'Message charge',
      amountInPaise: -10_000_00,
      balanceAfterInPaise: 18_420_00,
      description: 'AMC + quotation cadence',
      at: '2026-09-04',
    },
  ] as Txn[],
};

/**
 * Billing & wallet (M13). Prepaid balance with the runway estimate, the plan and
 * what it costs, this period's usage split (free vs billed), and the ledger. Top-up
 * and plan change go through the API — a real gateway plugs in behind
 * `IPaymentGateway` server-side.
 */
@Component({
  selector: 'ar-billing',
  imports: [ArTopbar, ArButton, ArChip, ArMeter, ArStatTile, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './billing.html',
  styleUrl: './billing.scss',
})
export class ArBilling {
  private readonly walletApi = inject(WalletService);
  private readonly billingApi = inject(BillingService);

  protected readonly busy = signal(false);
  private readonly tick = signal(0);

  private readonly resource = rxResource({
    params: () => (environment.useMockData ? undefined : { tick: this.tick() }),
    stream: () =>
      forkJoin({
        wallet: this.walletApi.get(),
        txns: this.walletApi.getTransactions({ skipCount: 0, maxResultCount: 20 }),
        summary: this.billingApi.getSummary(),
        sub: this.billingApi.getSubscription(),
      }).pipe(
        map((r) => ({
          balanceInPaise: r.wallet.balanceInPaise,
          isLow: r.wallet.isLow,
          daysRemaining: r.wallet.estimatedDaysRemaining ?? null,
          autoTopUp: r.wallet.autoTopUpEnabled,
          autoAmountInPaise: r.wallet.autoTopUpAmountInPaise,
          plan: r.sub.plan,
          feeInPaise: r.sub.monthlyFeeInPaise,
          seats: r.sub.includedAgentSeats,
          periodEnd: r.sub.currentPeriodEndUtc,
          billed: r.summary.totalBilledInPaise,
          tax: r.summary.taxInPaise,
          free: r.summary.freeMessageCount,
          avoided: r.summary.avoidedChargeInPaise,
          transactions: (r.txns.items ?? []).map(
            (t) =>
              ({
                id: t.id!,
                kind: t.type != null ? TXN[t.type] : TXN[0],
                amountInPaise: t.amountInPaise,
                balanceAfterInPaise: t.balanceAfterInPaise,
                description: t.description ?? t.reference,
                at: t.occurredAtUtc,
              }) as Txn,
          ),
        })),
      ),
    defaultValue: { ...SEED, daysRemaining: SEED.daysRemaining as number | null },
  });

  protected readonly loading = computed(
    () => !environment.useMockData && this.resource.isLoading(),
  );
  protected readonly d = computed(() =>
    environment.useMockData
      ? { ...SEED, daysRemaining: SEED.daysRemaining as number | null }
      : this.resource.value(),
  );

  protected readonly planName = computed(() => this.d().plan != null ? PLAN_NAME[this.d().plan!] : PLAN_NAME[0]);
  protected readonly runway = computed(() => {
    const days = this.d().daysRemaining;
    return days == null ? null : Math.min(1, days / 30);
  });

  protected readonly planLadder = [
    SubscriptionPlan.Starter,
    SubscriptionPlan.Growth,
    SubscriptionPlan.Pro,
    SubscriptionPlan.Enterprise,
  ];

  protected money(paise: number | null | undefined): string {
    return inr(paise ?? 0);
  }
  protected planLabel(p: SubscriptionPlan): string {
    return PLAN_NAME[p];
  }
  protected when(iso?: string | null): string {
    return iso
      ? new Date(iso).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '—';
  }

  protected async topUp(): Promise<void> {
    const rupees = Number(window.prompt('Top-up amount (₹):', '20000'));
    if (!(rupees >= 100)) return;
    const reference = window.prompt('Payment reference from the gateway:')?.trim();
    if (!reference) return;
    this.busy.set(true);
    try {
      await firstValueFrom(
        this.walletApi.topUp({ amountInPaise: Math.round(rupees * 100), reference }),
      );
      this.tick.update((n) => n + 1);
    } catch {
      window.alert('The payment could not be verified.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async changePlan(plan: SubscriptionPlan): Promise<void> {
    if (plan === this.d().plan) return;
    if (!window.confirm(`Move to the ${this.planLabel(plan)} plan?`)) return;
    this.busy.set(true);
    try {
      await firstValueFrom(this.billingApi.changePlan({ plan }));
      this.tick.update((n) => n + 1);
    } finally {
      this.busy.set(false);
    }
  }
}
