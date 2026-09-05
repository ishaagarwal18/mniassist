import { Injectable, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { environment } from '../../../environments/environment';
import { AnalyticsService as AnalyticsApi, DashboardDto } from '../../proxy/analytics';
import { QualityRating } from '../../proxy/channels';

/** A client-side "needs you today" item derived from the dashboard snapshot. */
export interface ActionItem {
  readonly icon: 'quotation' | 'enquiry' | 'inbox' | 'alert' | 'billing' | 'machine';
  readonly tone: 'amber' | 'teal' | 'good' | 'bad';
  readonly title: string;
  readonly meta: string;
  readonly route: string;
}

const SEED: DashboardDto = {
  generatedAtUtc: new Date().toISOString(),
  channels: [],
  volume: {
    sent24h: 1_240, received24h: 318, delivered24h: 1_206, failed24h: 12, withheld24h: 4, deliveryRate: 0.972,
  },
  inbox: { openConversations: 23, unassigned: 5, windowClosingWithinHour: 3, medianFirstResponseMinutes: 8 },
  pipeline: {
    openEnquiries: 18, newThisWeek: 4, openValueInPaise: 42_60_00_000,
    quotationsAwaitingDecision: 11, winRate: 0.34,
  },
  spend: {
    spend24hInPaise: 2_247_00, spendMonthInPaise: 41_80_000, freeMessages24h: 612,
    avoidedCharge24hInPaise: 7_040_00, walletBalanceInPaise: 18_42_000,
  },
  trend: [],
};

@Injectable({ providedIn: 'root' })
export class DashboardStore {
  private readonly api = inject(AnalyticsApi);

  private readonly resource = rxResource({
    params: () => (environment.useMockData ? undefined : {}),
    stream: () => this.api.getDashboard(),
    defaultValue: SEED,
  });

  readonly loading = computed(() => !environment.useMockData && this.resource.isLoading());
  readonly data = computed<DashboardDto>(() => (environment.useMockData ? SEED : this.resource.value() ?? SEED));

  readonly volume = computed(() => this.data().volume);
  readonly inbox = computed(() => this.data().inbox);
  readonly pipeline = computed(() => this.data().pipeline);
  readonly spend = computed(() => this.data().spend);
  readonly trend = computed(() => this.data().trend ?? []);

  /** Message mix for the current window, from the trend series (falls back to a sensible split). */
  readonly mix = computed(() => {
    const t = this.trend();
    const totals = t.reduce(
      (acc, p) => ({
        marketing: acc.marketing + p.marketing,
        utility: acc.utility + p.utility,
        service: acc.service + p.service,
      }),
      { marketing: 0, utility: 0, service: 0 },
    );

    const sum = totals.marketing + totals.utility + totals.service || 1;
    const pct = (n: number) => Math.round((n / sum) * 100);

    return [
      { label: 'Marketing', share: pct(totals.marketing), colour: 'var(--ar-chart-marketing)', free: false },
      { label: 'Utility', share: pct(totals.utility), colour: 'var(--ar-chart-utility)', free: false },
      { label: 'Service — free', share: pct(totals.service), colour: 'var(--ar-line-300)', free: true },
    ];
  });

  /** "Needs you today", derived from the snapshot — there is no server list for this. */
  readonly actionItems = computed<ActionItem[]>(() => {
    const d = this.data();
    const items: ActionItem[] = [];

    if (d.pipeline.quotationsAwaitingDecision > 0) {
      items.push({
        icon: 'quotation', tone: 'amber',
        title: `${d.pipeline.quotationsAwaitingDecision} quotation(s) awaiting a decision`,
        meta: `${this.inr(d.pipeline.openValueInPaise)} in play across the pipeline`,
        route: '/quotations',
      });
    }

    if (d.inbox.windowClosingWithinHour > 0) {
      items.push({
        icon: 'inbox', tone: 'teal',
        title: `${d.inbox.windowClosingWithinHour} conversation window(s) closing within the hour`,
        meta: 'Reply now or the next message needs an approved template',
        route: '/inbox',
      });
    }

    if (d.inbox.unassigned > 0) {
      items.push({
        icon: 'inbox', tone: 'teal',
        title: `${d.inbox.unassigned} unassigned conversation(s)`,
        meta: 'Route them to an owner from the inbox',
        route: '/inbox',
      });
    }

    if (d.volume.failed24h > 0) {
      items.push({
        icon: 'alert', tone: 'bad',
        title: `${d.volume.failed24h} message(s) failed in the last 24 hours`,
        meta: `Delivery rate ${(d.volume.deliveryRate * 100).toFixed(1)}%`,
        route: '/analytics',
      });
    }

    const atRisk = (d.channels ?? []).filter((c) => c.quality === QualityRating.Red || !c.canSend);
    for (const c of atRisk) {
      items.push({
        icon: 'alert', tone: 'bad',
        title: `${c.displayPhoneNumber ?? 'A channel'} needs attention`,
        meta: c.canSend ? 'Quality has dropped' : 'This number cannot send right now',
        route: '/channels',
      });
    }

    if (d.spend.walletBalanceInPaise < 50_000_00) {
      items.push({
        icon: 'billing', tone: 'amber',
        title: 'Wallet balance is running low',
        meta: `${this.inr(d.spend.walletBalanceInPaise)} left`,
        route: '/billing',
      });
    }

    return items;
  });

  private inr(paise: number): string {
    return (paise / 100).toLocaleString('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0,
    });
  }
}
