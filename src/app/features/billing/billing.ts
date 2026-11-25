import { grantedPolicy } from '../../core/auth/permission';
import { PermissionService } from '@abp/ng.core';
import { ArAutoTopUpCard } from './auto-top-up-card';
import { ArRateHistoryCard } from './rate-history-card';
import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin, map } from 'rxjs';
import {
  BillingService,
  PlanUsageDto,
  SubscriptionPlan,
  WalletService,
  WalletTransactionType,
} from '../../proxy/billing';
import { inr } from '../../core/util/format';
import { readApiError } from '../../core/util/api-error';
import { PlatformCheckoutRunner, readCheckoutReturn } from '../../core/services/platform-checkout';
import {
  PlatformCheckoutService,
  type CheckoutGatewayDto,
} from '../../proxy/billing/platform-checkout.service';
import { ArTopbar } from '../../layout/topbar';
import { planByKey, priceLabel } from '../landing/landing-plans';
import { ArBanner, ArButton, ArDialog, ArIcon, ArMeter } from '../../ui';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { PlanCatalogService, type PlanDefinitionDto } from '../../proxy/billing/plan-catalog.service';
import { ArGrid } from '../../ui/grid';
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

/** While the wallet loads, or if it cannot be read: zeros and no plan, never sample figures. */
const EMPTY = {
  balanceInPaise: 0,
  graceInPaise: 0,
  isLow: false,
  daysRemaining: 0,
  chargesStartOn: null as string | null,
  autoTopUp: false,
  lowThresholdInPaise: 0,
  autoAmountInPaise: 0,
  plan: undefined as unknown as SubscriptionPlan,
  feeInPaise: 0,
  seats: 0,
  periodEnd: '',
  billed: 0,
  tax: 0,
  free: 0,
  avoided: 0,
  usage: {} as PlanUsageDto,
  transactions: [] as Txn[],
};

/**
 * Billing & wallet (M13). Prepaid balance with the runway estimate, the plan and
 * what it costs, this period's usage split (free vs billed), and the ledger. Top-up
 * and plan change go through the API — a real gateway plugs in behind
 * `IPaymentGateway` server-side.
 */
@Component({
  selector: 'ar-billing',
  imports: [
    ArAutoTopUpCard,
    ArRateHistoryCard,
    ArTopbar,
    ArBanner,
    ArButton,
    ArDialog,
    ArIcon,
    ArMeter,
    DecimalPipe,
    ArGrid,
    GridModule,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './billing.html',
  styleUrl: './billing.scss',
})
export class ArBilling {
  private readonly permissionGate = inject(PermissionService);
  protected readonly canManagePlan = grantedPolicy(
    'AutoReach.Billing.ManagePlan',
    this.permissionGate,
  );
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);
  private readonly walletApi = inject(WalletService);
  private readonly billingApi = inject(BillingService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly checkout = inject(PlatformCheckoutRunner);
  private readonly checkoutApi = inject(PlatformCheckoutService);
  private readonly planCatalog = inject(PlanCatalogService);

  /** The plans this workspace can pick, each with its own price, limits, modules and selling points. */
  private readonly offeredResource = rxResource({
    params: () => ({ tick: this.tick() }),
    stream: () =>
      this.planCatalog.getOffered({ skipHandleError: true }).pipe(map((r) => r.items ?? [])),
    defaultValue: [] as PlanDefinitionDto[],
  });
  protected readonly offered = computed(() => {
    try {
      return this.offeredResource.value();
    } catch {
      return [] as PlanDefinitionDto[];
    }
  });

  protected readonly mode = (this.route?.snapshot?.data?.['mode'] as string | undefined) ?? 'list';
  protected readonly isPage = this.mode !== 'list';

  protected readonly pageTitle = computed(() => 'Top up wallet');

  protected readonly topUpOpen = signal(false);
  protected readonly topUpAmount = signal(5000);
  protected readonly topUpGateway = signal('Razorpay');
  protected readonly availableGateways = signal<CheckoutGatewayDto[]>([]);
  protected readonly topUpPresets = [1000, 2500, 5000, 10000, 20000];

  protected setTopUpPreset(amount: number): void {
    this.topUpAmount.set(amount);
  }

  protected onAmountInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = parseInt(input.value, 10);
    this.topUpAmount.set(isNaN(val) ? 0 : val);
  }

  protected readonly amountError = computed(() => {
    const amt = this.topUpAmount();
    if (isNaN(amt) || amt <= 0) return 'Please enter a valid recharge amount.';
    if (amt < 100) return 'Minimum recharge amount is ₹100.';
    if (amt > 1000000) return 'Maximum recharge amount per transaction is ₹10,00,000.';
    return null;
  });

  protected readonly isAmountValid = computed(() => this.amountError() === null);

  protected readonly expectedBalance = computed(() => {
    const current = this.d().balanceInPaise ?? 0;
    const recharge = (this.topUpAmount() || 0) * 100;
    return current + recharge;
  });

  protected txnTone(kind: string): 'good' | 'bad' | 'neutral' {
    if (kind === 'Top-up' || kind === 'Refund') return 'good';
    if (kind === 'Message charge') return 'bad';
    return 'neutral';
  }

  constructor() {
    this.announceCheckoutReturn();
    // Follow the link's plan while on the page too (e.g. another plan link opened from here).
    this.route.queryParamMap
      .pipe(takeUntilDestroyed())
      .subscribe((q) => this.requestedKey.set(q.get('plan')));

    if (this.mode === 'topup') {
      this.topUpOpen.set(true);
    }
    void this.loadGateways();
  }

  private async loadGateways(): Promise<void> {
    try {
      const g = await this.checkout.gateways();
      this.availableGateways.set(g);
      if (g.length > 0) this.topUpGateway.set(g[0].name);
    } catch {
      this.availableGateways.set([]);
    }
  }

  protected goTopUp(): void {
    if (this.router && !this.isPage) {
      void this.router.navigate(['/billing/top-up']);
    } else {
      this.topUpOpen.set(true);
    }
  }

  protected close(): void {
    this.topUpOpen.set(false);
    if (this.isPage && this.router) {
      void this.router.navigate(['/billing']);
    }
  }

  protected async submitTopUp(): Promise<void> {
    const rupees = Number(this.topUpAmount());
    if (!rupees || rupees < 100) {
      this.toasts.warning('Amount must be at least ₹100.', 'Top-up');
      return;
    }
    const amountInPaise = Math.round(rupees * 100);
    const gateways = this.availableGateways();
    if (gateways.length === 0) {
      // The wallet is credited only by a gateway confirming a real payment.
      this.toasts.warning('Online payment is not set up yet, so the wallet cannot be topped up. A platform administrator turns on Razorpay or PayU under Platform › Payment gateways.', 'Top-up');
      return;
    }
    this.busy.set(true);
    try {
      const gateway = this.topUpGateway() || gateways[0].name;
      const start = await firstValueFrom(this.checkoutApi.startTopUp({ gateway, amountInPaise }));
      const outcome = await this.checkout.pay(start);
      if (outcome === 'paid') {
        this.toasts.success(`${inr(amountInPaise)} added to the wallet.`, 'Top-up');
        this.tick.update((n) => n + 1);
        this.close();
      } else if (outcome === 'failed') {
        this.toasts.error('The payment did not go through.', 'Top-up');
      }
    } catch (e: unknown) {
      this.toasts.error(readApiError(e) || 'The payment could not be processed.', 'Top-up');
    } finally {
      this.busy.set(false);
    }
  }

  /**
   * The plan a link asked for (`/billing?plan=growth`), from the landing page's
   * plan buttons or straight after sign-up. Shown as a banner to activate it, and
   * as the selected plan in the Plan card.
   */
  private readonly requestedKey = signal<string | null>(null);
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
  protected reloadWallet(): void {
    this.tick.update((n) => n + 1);
  }

  private readonly resource = rxResource({
    params: () => ({ tick: this.tick() }),
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
          balanceInPaise: r.wallet.balanceInPaise ?? 0,
          graceInPaise: r.wallet.graceOverdraftInPaise ?? 0,
          isLow: !!r.wallet.isLow,
          daysRemaining: r.wallet.estimatedDaysRemaining ?? null,
          chargesStartOn: r.wallet.chargesStartOnUtc ?? null,
          autoTopUp: r.wallet.autoTopUpEnabled,
          autoAmountInPaise: r.wallet.autoTopUpAmountInPaise,
          lowThresholdInPaise: r.wallet.lowBalanceThresholdInPaise ?? 0,
          plan: r.sub.plan,
          feeInPaise: r.sub.monthlyFeeInPaise ?? 0,
          seats: r.sub.includedAgentSeats ?? 0,
          periodEnd: r.sub.currentPeriodEndUtc,
          billed: r.summary.totalBilledInPaise ?? 0,
          tax: r.summary.taxInPaise ?? 0,
          free: r.summary.freeMessageCount ?? 0,
          avoided: r.summary.avoidedChargeInPaise ?? 0,
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
    defaultValue: { ...EMPTY, daysRemaining: null as number | null },
  });

  protected readonly loading = computed(() => this.resource.isLoading());
  protected readonly d = computed(() =>
    this.resource.error()
      ? { ...EMPTY, daysRemaining: null as number | null }
      : this.resource.value(),
  );
  protected readonly failed = computed(() => this.resource.error() != null);

  /** "15 October 2026": the day per-message charges start. */
  protected chargeDay(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  protected readonly planName = computed(
    () =>
      this.usage().planName ?? (this.d().plan != null ? PLAN_NAME[this.d().plan!] : PLAN_NAME[0]),
  );

  protected readonly usage = computed(() => this.d().usage);
  /** Plan feature codes ("PipelineCrm") as readable names ("Pipeline CRM"), A–Z. */
  protected readonly featureLabels = computed(() =>
    (this.usage().features ?? []).map(featureLabel).sort((a, b) => a.localeCompare(b)),
  );
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
    // Razorpay / PayU, when the platform has either: the payment happens on the gateway's page.
    const gateways = await this.checkout.gateways();
    if (gateways.length === 0) {
      // The wallet is credited only by a gateway confirming a real payment.
      this.toasts.warning('Online payment is not set up yet, so the wallet cannot be topped up. A platform administrator turns on Razorpay or PayU under Platform › Payment gateways.', 'Top-up');
      return;
    }
    await this.topUpByGateway(gateways);
  }

  private async topUpByGateway(gateways: CheckoutGatewayDto[]): Promise<void> {
    const answer = await this.dialogs.prompt({
      title: 'Top up the wallet',
      message:
        'You pay on the gateway’s secure page; the wallet is credited as soon as it confirms.',
      fields: [
        {
          key: 'rupees',
          label: 'Amount (₹)',
          type: 'number',
          value: '20000',
          min: 100,
          max: 1000000,
          required: true,
        },
        ...(gateways.length > 1
          ? [
              {
                key: 'gateway',
                label: 'Pay with',
                value: gateways[0].name,
                options: gateways.map((g) => ({ value: g.name, label: g.label })),
                required: true,
              },
            ]
          : []),
      ],
      confirmText: 'Continue to payment',
    });
    if (!answer) return;
    const amountInPaise = Math.round(Number(answer['rupees']) * 100);
    const gateway = answer['gateway'] ?? gateways[0].name;
    this.busy.set(true);
    try {
      const start = await firstValueFrom(this.checkoutApi.startTopUp({ gateway, amountInPaise }));
      const outcome = await this.checkout.pay(start);
      if (outcome === 'paid') {
        this.toasts.success(`${inr(amountInPaise)} added to the wallet.`, 'Top-up');
        this.tick.update((n) => n + 1);
      } else if (outcome === 'failed') {
        this.toasts.error(
          'The payment did not go through. Nothing was charged to the wallet.',
          'Top-up',
        );
      }
    } catch (e) {
      this.toasts.error(readApiError(e, 'The payment could not be started.'), 'Top-up');
    } finally {
      this.busy.set(false);
    }
  }

  /** Back from PayU: say what happened, then drop the query so a reload doesn't repeat it. */
  private announceCheckoutReturn(): void {
    const back = readCheckoutReturn(this.route.snapshot.queryParams);
    if (!back) return;
    if (back.outcome === 'paid') this.toasts.success('Payment received. Thank you.', 'Payment');
    else if (back.outcome === 'failed')
      this.toasts.error(
        'The payment did not go through. You have not been charged by us.',
        'Payment',
      );
    else
      this.toasts.error(
        'We could not confirm that payment. If money left your account it will be credited once the gateway confirms it.',
        'Payment',
      );
    void this.router.navigate([], {
      queryParams: { payment: null, checkout: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
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

  /** A plan's modules as readable names, A–Z. */
  protected planFeatures(p: PlanDefinitionDto): string[] {
    return (p.features ?? []).map(featureLabel).sort((a, b) => a.localeCompare(b));
  }

  protected limit(n: number): string {
    return n >= 2_000_000_000 ? 'Unlimited' : n.toLocaleString('en-IN');
  }

  /** Moves to a plan from the comparison. */
  protected async choosePlan(p: PlanDefinitionDto): Promise<void> {
    if (p.isCurrent) return;
    if (
      !(await this.dialogs.confirm({
        title: `Move to the ${p.name} plan?`,
        message: `${this.money(p.monthlyFeeInPaise)}/month + GST. The new plan, its modules and limits apply straight away; the difference for the rest of this period is on your next invoice.`,
        confirmText: 'Change plan',
      }))
    )
      return;
    this.busy.set(true);
    try {
      await firstValueFrom(
        this.billingApi.changePlan({ plan: p.basePlan, planId: p.id }, { skipHandleError: true }),
      );
      this.toasts.success(`You are now on the ${p.name} plan.`, 'Plan changed');
      this.tick.update((n) => n + 1);
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The plan could not be changed.'), 'Billing');
    } finally {
      this.busy.set(false);
    }
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

const FEATURE_NAMES: Record<string, string> = {
  AiAssistant: 'AI assistant',
  ClickToWhatsAppAttribution: 'Click-to-WhatsApp ad tracking',
  Email: 'Email',
  ErpSync: 'ERP sync',
  FullAnalytics: 'Full analytics',
  OemNetwork: 'OEM network',
  OemPricing: 'OEM pricing',
  PipelineCrm: 'Pipeline CRM',
  PublicApi: 'Public API',
  SalesAndPurchasing: 'Sales & purchasing',
  Sms: 'SMS',
  Sso: 'Single sign-on (SSO)',
  Voice: 'Voice calls',
};

/** "AutomationBuilder" → "Automation builder"; known codes use their proper names. */
export function featureLabel(code: string): string {
  if (FEATURE_NAMES[code]) return FEATURE_NAMES[code];
  const words = code.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
