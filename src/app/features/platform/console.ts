import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, forkJoin, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PlatformAdminService } from '../../proxy/administration';
import { AtRiskStore } from '../../core/services/at-risk.store';
import { RateCardDto } from '../../proxy/billing';
import { SubscriptionPlan } from '../../proxy/billing/subscription-plan.enum';
import { MessagingTier } from '../../proxy/channels/messaging-tier.enum';
import { QualityRating } from '../../proxy/channels/quality-rating.enum';
import { PricingCategory } from '../../proxy/messaging/pricing-category.enum';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArDialog, ArStatTile } from '../../ui';

type Quality = 'green' | 'yellow' | 'red' | 'unknown';

interface PlatformMetrics {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  tenantsAtRisk: number;
  mrrInPaise: number;
  messageMarginMonthInPaise: number;
  messagesMonth: number;
  averageDeliveryRate: number;
  openComplianceRequests: number;
  tenantsToBreakEven: number;
}

interface TenantOverview {
  id: string;
  name: string;
  plan: string;
  isTrial: boolean;
  channelCount: number;
  worstQuality: Quality;
  tier: string;
  messages30d: number;
  spend30dInPaise: number;
  walletBalanceInPaise: number;
  activeUsers: number;
  lastActivityAt?: string;
}

interface RateHistoryPoint {
  effectiveFrom: string;
  rateInPaise: number;
  changeInPaise: number;
  changePercent: number;
  isCurrent: boolean;
}

interface RateHistory {
  category: string;
  currentRateInPaise: number;
  nextChangeFrom?: string;
  nextRateInPaise?: number;
  points: RateHistoryPoint[];
}

const QUALITY: Record<QualityRating, Quality> = {
  [QualityRating.Unknown]: 'unknown',
  [QualityRating.Green]: 'green',
  [QualityRating.Yellow]: 'yellow',
  [QualityRating.Red]: 'red',
};

const TIER: Record<MessagingTier, string> = {
  [MessagingTier.Starting]: '250 / 24h',
  [MessagingTier.Tier1]: '1K / 24h',
  [MessagingTier.Tier2]: '10K / 24h',
  [MessagingTier.Tier3]: '100K / 24h',
  [MessagingTier.Tier4]: 'Unlimited',
};

const PLAN: Record<SubscriptionPlan, string> = {
  [SubscriptionPlan.Starter]: 'Starter',
  [SubscriptionPlan.Growth]: 'Growth',
  [SubscriptionPlan.Pro]: 'Pro',
  [SubscriptionPlan.Enterprise]: 'Enterprise',
};

const CATEGORY: Record<PricingCategory, string> = {
  [PricingCategory.Unknown]: 'Unknown',
  [PricingCategory.Marketing]: 'Marketing',
  [PricingCategory.Utility]: 'Utility',
  [PricingCategory.Authentication]: 'Authentication',
  [PricingCategory.Service]: 'Service',
  [PricingCategory.UtilityInWindow]: 'Utility, in service window',
};

const SEED_METRICS: PlatformMetrics = {
  totalTenants: 34,
  activeTenants: 27,
  trialTenants: 9,
  tenantsAtRisk: 4,
  mrrInPaise: 4_86_000_00,
  messageMarginMonthInPaise: 1_92_450_00,
  messagesMonth: 486_210,
  averageDeliveryRate: 0.9642,
  openComplianceRequests: 3,
  tenantsToBreakEven: 6,
};

const SEED_TENANTS: TenantOverview[] = [
  {
    id: 't1',
    name: 'Meridian Automation',
    plan: 'Growth',
    isTrial: false,
    channelCount: 3,
    worstQuality: 'yellow',
    tier: '10K / 24h',
    messages30d: 84_120,
    spend30dInPaise: 72_18_400,
    walletBalanceInPaise: 3_41_000,
    activeUsers: 11,
    lastActivityAt: new Date().toISOString(),
  },
  {
    id: 't2',
    name: 'Sanghvi Controls',
    plan: 'Starter',
    isTrial: false,
    channelCount: 1,
    worstQuality: 'green',
    tier: '1K / 24h',
    messages30d: 12_480,
    spend30dInPaise: 10_92_300,
    walletBalanceInPaise: 84_000,
    activeUsers: 4,
    lastActivityAt: new Date().toISOString(),
  },
  {
    id: 't4',
    name: 'Kohinoor Instruments',
    plan: 'Starter',
    isTrial: true,
    channelCount: 1,
    worstQuality: 'unknown',
    tier: '250 / 24h',
    messages30d: 0,
    spend30dInPaise: 0,
    walletBalanceInPaise: 0,
    activeUsers: 2,
    lastActivityAt: new Date(Date.now() - 9 * 86_400_000).toISOString(),
  },
  {
    id: 't5',
    name: 'Deccan Valves',
    plan: 'Growth',
    isTrial: false,
    channelCount: 2,
    worstQuality: 'red',
    tier: '10K / 24h',
    messages30d: 41_200,
    spend30dInPaise: 34_86_000,
    walletBalanceInPaise: 12_400,
    activeUsers: 7,
    lastActivityAt: new Date(Date.now() - 86_400_000).toISOString(),
  },
];

const SEED_RATES: RateHistory[] = [
  {
    category: 'Marketing',
    currentRateInPaise: 86.31,
    points: [
      {
        effectiveFrom: '2024-06-01T00:00:00Z',
        rateInPaise: 78.46,
        changeInPaise: 0,
        changePercent: 0,
        isCurrent: false,
      },
      {
        effectiveFrom: '2026-01-01T00:00:00Z',
        rateInPaise: 86.31,
        changeInPaise: 7.85,
        changePercent: 10.01,
        isCurrent: true,
      },
    ],
  },
  {
    category: 'Utility',
    currentRateInPaise: 11.5,
    nextChangeFrom: new Date(Date.now() + 43 * 86_400_000).toISOString(),
    nextRateInPaise: 12.2,
    points: [
      {
        effectiveFrom: '2024-06-01T00:00:00Z',
        rateInPaise: 11.0,
        changeInPaise: 0,
        changePercent: 0,
        isCurrent: false,
      },
      {
        effectiveFrom: '2026-01-01T00:00:00Z',
        rateInPaise: 11.5,
        changeInPaise: 0.5,
        changePercent: 4.55,
        isCurrent: true,
      },
    ],
  },
];

function toRateHistory(cards: RateCardDto[]): RateHistory[] {
  const now = Date.now();
  const byCategory = new Map<string, RateCardDto[]>();
  for (const card of cards) {
    const key = card.category != null ? CATEGORY[card.category] : 'Unknown';
    const bucket = byCategory.get(key) ?? [];
    bucket.push(card);
    byCategory.set(key, bucket);
  }

  return [...byCategory.entries()].map(([category, list]) => {
    const sorted = [...list].sort(
      (a, b) =>
        new Date(a.effectiveFromUtc ?? 0).getTime() - new Date(b.effectiveFromUtc ?? 0).getTime(),
    );
    const past = sorted.filter((c) => new Date(c.effectiveFromUtc ?? 0).getTime() <= now);
    const scheduled = sorted.find((c) => new Date(c.effectiveFromUtc ?? 0).getTime() > now);
    const currentRate = past.at(-1)?.sellRateInPaise ?? 0;

    const points: RateHistoryPoint[] = past.map((c, i) => {
      const rate = c.sellRateInPaise ?? 0;
      const prev = i > 0 ? (past[i - 1].sellRateInPaise ?? rate) : rate;
      const delta = rate - prev;
      return {
        effectiveFrom: c.effectiveFromUtc ?? '',
        rateInPaise: rate,
        changeInPaise: delta,
        changePercent: prev ? Math.round((delta / prev) * 10_000) / 100 : 0,
        isCurrent: c.effectiveToUtc == null,
      };
    });

    return {
      category,
      currentRateInPaise: currentRate,
      nextChangeFrom: scheduled?.effectiveFromUtc ?? undefined,
      nextRateInPaise: scheduled?.sellRateInPaise ?? undefined,
      points,
    };
  });
}

/**
 * Our own back office: how the platform is doing, and which tenants need a human.
 *
 * The list is ordered by the two things that actually prompt action — a degraded
 * number, and an account that has stopped sending. Both are quiet failures: nobody
 * raises a ticket to say "we drifted away", and by the time they cancel the reason
 * has been visible in this table for a month.
 *
 * Every figure here comes from a nightly rollup, not a live scan across tenants.
 */
@Component({
  selector: 'ar-platform-console',
  imports: [ArTopbar, ArButton, ArChip, ArDialog, ArStatTile],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './console.html',
  styleUrl: './console.scss',
})
export class ArPlatformConsole {
  private readonly api = inject(PlatformAdminService);
  private readonly atRisk = inject(AtRiskStore);

  protected readonly atRiskOnly = signal(false);

  // ---- scheduling a rate (Q2: service and in-window utility are priced only once a row exists) ----
  protected readonly rateCategories = [
    PricingCategory.Marketing,
    PricingCategory.Utility,
    PricingCategory.Authentication,
    PricingCategory.Service,
    PricingCategory.UtilityInWindow,
  ].map((value) => ({ value, label: CATEGORY[value] }));
  protected readonly rateOpen = signal(false);
  protected readonly rateCategory = signal<PricingCategory>(PricingCategory.Service);
  protected readonly rateMeta = signal('');
  protected readonly rateSell = signal('');
  protected readonly rateFrom = signal('');
  protected readonly rateSaving = signal(false);
  protected readonly rateError = signal<string | null>(null);

  protected openRate(): void {
    this.rateError.set(null);
    this.rateMeta.set('');
    this.rateSell.set('');
    this.rateFrom.set(new Date().toISOString().slice(0, 10));
    this.rateOpen.set(true);
  }

  protected async saveRate(): Promise<void> {
    const meta = Number(this.rateMeta().trim());
    const sell = Number(this.rateSell().trim());
    if (
      !Number.isFinite(meta) ||
      !Number.isFinite(sell) ||
      meta < 0 ||
      sell < 0 ||
      this.rateSell().trim() === ''
    ) {
      this.rateError.set('Enter both rates in rupees, e.g. 0.12 or 0.86 (stored to the paisa).');
      return;
    }
    if (!this.rateFrom()) {
      this.rateError.set('Choose the date the rate takes effect.');
      return;
    }
    const input = {
      countryCode: 'IN',
      category: this.rateCategory(),
      metaRateInPaise: Math.round(meta * 100),
      sellRateInPaise: Math.round(sell * 100),
      effectiveFromUtc: `${this.rateFrom()}T00:00:00Z`,
    };
    this.rateSaving.set(true);
    this.rateError.set(null);
    try {
      const open = this.resource
        .value()
        .cards.find(
          (c) =>
            c.category === input.category && c.countryCode === 'IN' && c.effectiveToUtc == null,
        );
      await firstValueFrom(
        open?.id ? this.api.supersedeRateCard(open.id, input) : this.api.createRateCard(input),
      );
      this.rateOpen.set(false);
      this.resource.reload();
    } catch (e: unknown) {
      this.rateError.set(
        (e as { error?: { error?: { message?: string } } })?.error?.error?.message ??
          'The rate could not be saved.',
      );
    } finally {
      this.rateSaving.set(false);
    }
  }

  // ---- At-risk queue (M15-3) -----------------------------------------
  protected readonly alerts = this.atRisk.alerts;
  protected readonly showResolvedAlerts = this.atRisk.showResolved;

  protected ackAlert(id: string): void {
    void this.atRisk.acknowledge(id);
  }

  protected resolveAlert(id: string): void {
    const note = window.prompt('Closing note (what did you do?):')?.trim();
    void this.atRisk.resolve(id, note || undefined);
  }

  protected alertTone(status: string): 'bad' | 'amber' | 'good' {
    return status === 'open' ? 'bad' : status === 'acknowledged' ? 'amber' : 'good';
  }

  private readonly resource = rxResource({
    params: () => (environment.useMockData ? undefined : { atRisk: this.atRiskOnly() }),
    stream: ({ params }) =>
      forkJoin({
        metrics: this.api.getMetrics(),
        tenants: this.api.getTenants({
          skipCount: 0,
          maxResultCount: 100,
          atRiskOnly: params.atRisk || undefined,
        }),
        rates: this.api.getRateCards(true),
      }).pipe(
        map((r) => ({
          metrics: {
            totalTenants: r.metrics.totalTenants ?? 0,
            activeTenants: r.metrics.activeTenants ?? 0,
            trialTenants: r.metrics.trialTenants ?? 0,
            tenantsAtRisk: r.metrics.tenantsAtRisk ?? 0,
            mrrInPaise: r.metrics.monthlyRecurringRevenueInPaise ?? 0,
            messageMarginMonthInPaise: r.metrics.messageMarginMonthInPaise ?? 0,
            messagesMonth: r.metrics.messagesMonth ?? 0,
            averageDeliveryRate: r.metrics.averageDeliveryRate ?? 0,
            openComplianceRequests: r.metrics.openComplianceRequests ?? 0,
            tenantsToBreakEven: r.metrics.tenantsToBreakEven ?? 0,
          } as PlatformMetrics,
          tenants: (r.tenants.items ?? []).map((t): TenantOverview => ({
            id: t.id!,
            name: t.name ?? '(unnamed tenant)',
            plan: t.plan != null ? PLAN[t.plan] : '—',
            isTrial: t.isTrial ?? false,
            channelCount: t.channelCount ?? 0,
            worstQuality: t.worstQuality != null ? QUALITY[t.worstQuality] : 'unknown',
            tier: t.bestTier != null ? TIER[t.bestTier] : '—',
            messages30d: t.messages30d ?? 0,
            spend30dInPaise: t.spend30dInPaise ?? 0,
            walletBalanceInPaise: t.walletBalanceInPaise ?? 0,
            activeUsers: t.activeUsers ?? 0,
            lastActivityAt: t.lastActivityUtc ?? undefined,
          })),
          rates: toRateHistory(r.rates.items ?? []),
          cards: r.rates.items ?? [],
        })),
      ),
    defaultValue: {
      metrics: SEED_METRICS,
      tenants: SEED_TENANTS,
      rates: SEED_RATES,
      cards: [] as RateCardDto[],
    },
  });

  protected readonly metrics = computed(() =>
    environment.useMockData ? SEED_METRICS : this.resource.value().metrics,
  );
  protected readonly rates = computed(() =>
    environment.useMockData ? SEED_RATES : this.resource.value().rates,
  );

  protected readonly tenants = computed(() => {
    const all = environment.useMockData ? SEED_TENANTS : this.resource.value().tenants;
    const rows = this.atRiskOnly() ? all.filter((t) => this.isAtRisk(t)) : [...all];

    return rows.sort((a, b) => {
      const risk = Number(this.isAtRisk(b)) - Number(this.isAtRisk(a));
      return risk !== 0 ? risk : b.spend30dInPaise - a.spend30dInPaise;
    });
  });

  protected readonly subtitle = computed(() => {
    const m = this.metrics();
    return `${m.activeTenants} of ${m.totalTenants} tenants active · ${m.tenantsAtRisk} need attention`;
  });

  /** A degraded number, or a connected tenant that has stopped sending entirely. */
  protected isAtRisk(t: TenantOverview): boolean {
    return (
      t.worstQuality === 'yellow' ||
      t.worstQuality === 'red' ||
      (t.channelCount > 0 && t.messages30d === 0)
    );
  }

  protected riskReason(t: TenantOverview): string | null {
    if (t.worstQuality === 'red') return 'Number quality is Red';
    if (t.worstQuality === 'yellow') return 'Number quality is Yellow';

    if (t.channelCount > 0 && t.messages30d === 0) {
      return t.isTrial
        ? 'Trial connected a number but never sent'
        : 'Connected but sent nothing in 30 days';
    }

    return null;
  }

  protected qualityTone(q: Quality): 'good' | 'warn' | 'bad' | 'neutral' {
    return q === 'green' ? 'good' : q === 'yellow' ? 'warn' : q === 'red' ? 'bad' : 'neutral';
  }

  // ---- Formatting --------------------------------------------------------

  protected lakhs(paise: number): string {
    const rupees = paise / 100;
    if (rupees >= 1_00_000) return `₹${(rupees / 1_00_000).toFixed(2)} L`;
    if (rupees >= 1_000) return `₹${(rupees / 1_000).toFixed(1)} K`;
    return `₹${rupees.toFixed(0)}`;
  }

  protected rupees(paise: number, precise = false): string {
    return (paise / 100).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: precise ? 4 : 2,
      maximumFractionDigits: precise ? 4 : 2,
    });
  }

  protected count(n: number): string {
    return n.toLocaleString('en-IN');
  }

  protected percent(fraction: number): string {
    return `${(fraction * 100).toFixed(2)}%`;
  }

  protected lastSeen(iso?: string): string {
    if (!iso) return 'never';
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    return `${days} days ago`;
  }

  protected month(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  }
}
