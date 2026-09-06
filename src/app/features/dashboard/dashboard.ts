import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ChannelService } from '../../core/services/channel.service';
import { DashboardStore } from '../../core/services/dashboard.service';
import { CampaignStore } from '../../core/services/campaign.service';
import { count, inr, inrCompact, pct } from '../../core/util/format';
import { TIER_LIMIT } from '../../core/models/channel.model';
import { ArTopbar } from '../../layout/topbar';
import {
  ArButton, ArCard, ArChannelHealthStrip, ArChip, ArIcon, ArMeter, ArStatTile,
} from '../../ui';

@Component({
  selector: 'ar-dashboard',
  imports: [
    RouterLink, ArTopbar, ArCard, ArStatTile, ArChip, ArIcon, ArButton, ArMeter, ArChannelHealthStrip,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class ArDashboard {
  private readonly channels = inject(ChannelService);
  private readonly dashboard = inject(DashboardStore);
  private readonly campaignStore = inject(CampaignStore);

  protected readonly channel = this.channels.active;

  protected readonly volume = this.dashboard.volume;
  protected readonly inbox = this.dashboard.inbox;
  protected readonly pipeline = this.dashboard.pipeline;
  protected readonly spend = this.dashboard.spend;
  protected readonly mix = this.dashboard.mix;
  protected readonly todo = this.dashboard.actionItems;

  protected readonly walletLabel = computed(() => inr(this.spend().walletBalanceInPaise));

  protected readonly pipelineValueLabel = computed(() =>
    inrCompact(this.pipeline().openValueInPaise / 100));

  protected readonly deliveryLabel = computed(() =>
    `${(this.volume().deliveryRate * 100).toFixed(1)}% delivered`);

  protected readonly freeShare = computed(() =>
    this.mix().filter((s) => s.free).reduce((n, s) => n + s.share, 0));

  protected readonly freeShareLabel = computed(() => `${this.freeShare()}%`);

  protected readonly avoidedLabel = computed(() =>
    inr(this.spend().avoidedCharge24hInPaise) + ' avoided in the last 24h');

  protected readonly freeMessagesLabel = computed(() => count(this.spend().freeMessages24h));

  /** The five most recent campaigns, for the table. */
  protected readonly recent = computed(() =>
    this.campaignStore.campaigns()
      .slice()
      .sort((a, b) => (b.scheduledAt ?? '').localeCompare(a.scheduledAt ?? ''))
      .slice(0, 5)
      .map((c) => ({
        name: c.name,
        state: c.state,
        sent: c.dispatched,
        recipients: c.estimatedRecipients,
        cost: inr(c.estimatedCostInPaise),
        free: c.estimatedCostInPaise === 0,
      })));

  protected readonly usageLabel = computed(() => {
    const ch = this.channel();
    if (!ch) return '—';
    const limit = TIER_LIMIT[ch.tier];
    return limit ? `${count(ch.used24h)} / ${count(limit)}` : count(ch.used24h);
  });

  protected readonly usagePct = computed(() => {
    const ch = this.channel();
    if (!ch) return '—';
    const limit = TIER_LIMIT[ch.tier];
    return limit ? pct(ch.used24h, limit, 0) : '—';
  });

  protected readonly tierLimit = computed(() => {
    const ch = this.channel();
    return ch ? TIER_LIMIT[ch.tier] ?? 0 : 0;
  });

  protected readonly count = count;

  protected chipToneFor(state: string): 'neutral' | 'amber' | 'teal' | 'good' | 'warn' | 'bad' {
    switch (state) {
      case 'running': return 'teal';
      case 'completed': return 'good';
      case 'scheduled': return 'amber';
      case 'suspended':
      case 'cancelled': return 'bad';
      default: return 'neutral';
    }
  }
}
