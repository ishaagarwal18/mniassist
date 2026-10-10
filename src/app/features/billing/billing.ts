import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, forkJoin, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  BillingService,
  PlanUsageDto,
  SubscriptionPlan,
  WalletService,
  WalletTransactionType,
} from '../../proxy/billing';
import { inr } from '../../core/util/format';
import { ArTopbar } from '../../layout/topbar';
import { planByKey, priceLabel } from '../landing/landing-plans';
import { ArBanner, ArButton, ArChip, ArMeter, ArStatTile } from '../../ui';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';

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
  graceInPaise: 0,
  isLow: false,
  daysRemaining: 21,
  chargesStartOn: null as string | null,
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
  usage: {
    channelLimit: 2,
    channelsUsed: 1,
    seatLimit: 10,
    seatsUsed: 6,
    contactLimit: 25_000,
    contactsUsed: 12_486,
    features: [
      'AutomationBuilder',
      'Flows',
      'DocumentLibrary',
      'FullAnalytics',
      'ClickToWhatsAppAttribution',
    ],
  } as PlanUsageDto,
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
  imports: [ArTopbar, ArBanner, ArButton, ArChip, ArMeter, ArStatTile, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './billing.html',
  styleUrl: './billing.scss',
})
export class ArBilling {
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);
  private readonly walletApi = inject(WalletService);
  private readonly billingApi = inject(BillingService);
  private readonly router = inject(Router);

  /**
   * The plan a link asked for (`/billing?plan=growth`), from the landing page's
   * plan buttons or straight after sign-up. Shown as a banner to activate it.
   */
  private readonly requestedKey = signal(inject(ActivatedRoute).snapshot.queryParamMap.get('plan'));
  protected readonly requested = computed(() => {
    const chosen = planByKey(this.requestedKey());
    if (!chosen) return null;
    // Plan names match the enum's member names (Starter, Growth, Pro, Enterprise).
    const plan = SubscriptionPlan[chosen.name as keyof typeof SubscriptionPlan];
    if (plan === undefined || plan === this.d().plan) return null;
    return { plan, name: chosen.name, price: priceLabel(chosen, 'monthly') };
  });

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
        usage: this.billingApi.getPlanUsage(),
      }).pipe(
        map((r) => ({
          usage: r.usage,
          balanceInPaise: r.wallet.balanceInPaise,
          graceInPaise: r.wallet.graceOverdraftInPaise ?? 0,
          isLow: r.wallet.isLow,
          daysRemaining: r.wallet.estimatedDaysRemaining ?? null,
          chargesStartOn: r.wallet.chargesStartOnUtc ?? null,
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

  /** "15 October 2026": the day per-message charges start. */
  protected chargeDay(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  protected readonly planName = computed(() =>
    this.d().plan != null ? PLAN_NAME[this.d().plan!] : PLAN_NAME[0],
  );

  protected readonly usage = computed(() => this.d().usage);
  protected readonly usageRows = computed(() => {
    const u = this.usage();
    const row = (label: string, used = 0, limit = 0) => ({
      label,
      used,
      limit,
      unlimited: limit >= 2_000_000_000,
      fraction: limit > 0 ? Math.min(1, used / limit) : 0,
      over: limit > 0 && used > limit,
    });
    return [
      row('Members', u.seatsUsed, u.seatLimit),
      row('Connected numbers', u.channelsUsed, u.channelLimit),
      row('Contacts', u.contactsUsed, u.contactLimit),
    ];
  });
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
    const answer = await this.dialogs.prompt({
      title: 'Top up the wallet',
      fields: [
        {
          key: 'rupees',
          label: 'Amount (₹)',
          type: 'number',
          value: '20000',
          min: 100,
          required: true,
        },
        {
          key: 'reference',
          label: 'Payment reference from the gateway',
          required: true,
          maxLength: 128,
        },
      ],
      confirmText: 'Top up',
    });
    if (!answer) return;
    const rupees = Number(answer['rupees']);
    const reference = answer['reference'];
    this.busy.set(true);
    try {
      await firstValueFrom(
        this.walletApi.topUp({ amountInPaise: Math.round(rupees * 100), reference }),
      );
      this.tick.update((n) => n + 1);
    } catch {
      this.toasts.error('The payment could not be verified.', 'Top-up');
    } finally {
      this.busy.set(false);
    }
  }

  protected async activateRequested(): Promise<void> {
    const r = this.requested();
    if (!r) return;
    await this.changePlan(r.plan);
    if (this.d().plan === r.plan || !this.requested()) this.dismissRequested();
  }

  protected dismissRequested(): void {
    this.requestedKey.set(null);
    void this.router.navigate([], { queryParams: { plan: null }, replaceUrl: true });
  }

  protected async changePlan(plan: SubscriptionPlan): Promise<void> {
    if (plan === this.d().plan) return;
    if (
      !(await this.dialogs.confirm({
        title: `Move to the ${this.planLabel(plan)} plan?`,
        message: 'The new plan and its limits apply straight away.',
        confirmText: 'Change plan',
      }))
    )
      return;
    this.busy.set(true);
    try {
      await firstValueFrom(this.billingApi.changePlan({ plan }));
      this.tick.update((n) => n + 1);
    } finally {
      this.busy.set(false);
    }
  }
}
