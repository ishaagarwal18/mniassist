import { Injectable, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { environment } from '../../../environments/environment';
import { AnalyticsService as AnalyticsApi, DashboardDto } from '../../proxy/analytics';
import { ChannelHealthDto, QualityRating } from '../../proxy/channels';

/** A client-side "needs you today" item derived from the dashboard snapshot. */
export interface ActionItem {
  readonly icon: 'quotation' | 'enquiry' | 'inbox' | 'alert' | 'billing' | 'machine';
  readonly tone: 'amber' | 'teal' | 'good' | 'bad';
  readonly title: string;
  readonly meta: string;
  readonly route: string;
}

/** The DTO with every field filled — the templates read this, not the raw proxy shape. */
interface Dashboard {
  channels: ChannelHealthDto[];
  volume: { sent24h: number; received24h: number; delivered24h: number; failed24h: number; deliveryRate: number };
  inbox: { openConversations: number; unassigned: number; windowClosingWithinHour: number };
  pipeline: {
    openEnquiries: number; newThisWeek: number; openValueInPaise: number;
    quotationsAwaitingDecision: number; winRate: number;
  };
  spend: {
    spend24hInPaise: number; spendMonthInPaise: number; freeMessages24h: number;
    avoidedCharge24hInPaise: number; walletBalanceInPaise: number;
  };
  trend: { marketing: number; utility: number; service: number }[];
}

const SEED: Dashboard = {
  channels: [],
  volume: { sent24h: 1_240, received24h: 318, delivered24h: 1_206, failed24h: 12, deliveryRate: 0.972 },
  inbox: { openConversations: 23, unassigned: 5, windowClosingWithinHour: 3 },
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

function normalise(dto: DashboardDto | undefined): Dashboard {
  const v = dto?.volume ?? {};
  const i = dto?.inbox ?? {};
  const p = dto?.pipeline ?? {};
  const s = dto?.spend ?? {};

  return {
    channels: dto?.channels ?? [],
    volume: {
      sent24h: v.sent24h ?? 0, received24h: v.received24h ?? 0, delivered24h: v.delivered24h ?? 0,
      failed24h: v.failed24h ?? 0, deliveryRate: v.deliveryRate ?? 0,
    },
    inbox: {
      openConversations: i.openConversations ?? 0, unassigned: i.unassigned ?? 0,
      windowClosingWithinHour: i.windowClosingWithinHour ?? 0,
    },
    pipeline: {
      openEnquiries: p.openEnquiries ?? 0, newThisWeek: p.newThisWeek ?? 0,
      openValueInPaise: p.openValueInPaise ?? 0, quotationsAwaitingDecision: p.quotationsAwaitingDecision ?? 0,
      winRate: p.winRate ?? 0,
    },
    spend: {
      spend24hInPaise: s.spend24hInPaise ?? 0, spendMonthInPaise: s.spendMonthInPaise ?? 0,
      freeMessages24h: s.freeMessages24h ?? 0, avoidedCharge24hInPaise: s.avoidedCharge24hInPaise ?? 0,
      walletBalanceInPaise: s.walletBalanceInPaise ?? 0,
    },
    trend: (dto?.trend ?? []).map(t => ({
      marketing: t.marketing ?? 0, utility: t.utility ?? 0, service: t.service ?? 0,
    })),
  };
}

@Injectable({ providedIn: 'root' })
export class DashboardStore {
  private readonly api = inject(AnalyticsApi);

  private readonly resource = rxResource({
    params: () => (environment.useMockData ? undefined : {}),
    stream: () => this.api.getDashboard(),
    defaultValue: undefined as DashboardDto | undefined,
  });

  readonly loading = computed(() => !environment.useMockData && this.resource.isLoading());

  readonly data = computed<Dashboard>(() =>
    environment.useMockData ? SEED : normalise(this.resource.value()));

  readonly volume = computed(() => this.data().volume);
  readonly inbox = computed(() => this.data().inbox);
  readonly pipeline = computed(() => this.data().pipeline);
  readonly spend = computed(() => this.data().spend);

  readonly mix = computed(() => {
    const totals = this.data().trend.reduce(
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

  readonly actionItems = computed<ActionItem[]>(() => {
    const d = this.data();
    const items: ActionItem[] = [];

    if (d.pipeline.quotationsAwaitingDecision > 0) {
      items.push({
        icon: 'quotation', tone: 'amber',
        title: `${d.pipeline.quotationsAwaitingDecision} quotation(s) awaiting a decision`,
        meta: `${inr(d.pipeline.openValueInPaise)} in play across the pipeline`,
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

    for (const c of d.channels.filter(x => x.quality === QualityRating.Red || x.canSend === false)) {
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
        meta: `${inr(d.spend.walletBalanceInPaise)} left`,
        route: '/billing',
      });
    }

    return items;
  });
}

function inr(paise: number): string {
  return (paise / 100).toLocaleString('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  });
}
