import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ChannelService } from '../../core/services/channel.service';
import { count, inr, pct } from '../../core/util/format';
import { TIER_LIMIT } from '../../core/models/channel.model';
import { ArTopbar } from '../../layout/topbar';
import {
  ArBanner, ArButton, ArCard, ArChannelHealthStrip, ArChip, ArIcon, ArMeter, ArStatTile,
} from '../../ui';
import { IconName } from '../../ui/icon';

interface TodoItem {
  readonly icon: IconName;
  readonly tone: 'amber' | 'teal' | 'good' | 'bad';
  readonly title: string;
  readonly meta: string;
  readonly action: string;
}

interface MixSegment {
  readonly label: string;
  readonly share: number;
  readonly colour: string;
  readonly free: boolean;
}

@Component({
  selector: 'ar-dashboard',
  imports: [ArTopbar, ArCard, ArStatTile, ArChip, ArIcon, ArButton, ArBanner, ArMeter, ArChannelHealthStrip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class ArDashboard {
  private readonly channels = inject(ChannelService);
  protected readonly channel = this.channels.active;

  protected readonly messagesThisMonth = 7_240;

  /** Category mix. Shares are authored; the free share is derived, so the
   *  headline number and the bar can never disagree. */
  protected readonly mix: readonly MixSegment[] = [
    { label: 'Marketing', share: 41, colour: 'var(--ar-chart-marketing)', free: false },
    { label: 'Utility — charged', share: 12, colour: 'var(--ar-chart-utility)', free: false },
    { label: 'Utility — free window', share: 31, colour: 'var(--ar-teal-100)', free: true },
    { label: 'Service — free', share: 16, colour: 'var(--ar-line-300)', free: true },
  ];

  protected readonly freeShare = computed(() =>
    this.mix.filter(s => s.free).reduce((n, s) => n + s.share, 0));

  protected readonly freeMessages = computed(() =>
    Math.round(this.messagesThisMonth * this.freeShare() / 100));

  /** Only the utility slice represents an avoided charge — service messages
   *  are free regardless, so counting them as a saving would overstate it. */
  private readonly utilityFreeShare = 31;
  protected readonly savedPaise = computed(() =>
    Math.round(this.messagesThisMonth * this.utilityFreeShare / 100 * 11.5));

  protected readonly freeShareLabel = computed(() => `${this.freeShare()}%`);
  protected readonly savedLabel = computed(() => inr(this.savedPaise()));
  protected readonly freeMessagesLabel = computed(() => count(this.freeMessages()));

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

  protected readonly todo: readonly TodoItem[] = [
    { icon: 'quotation', tone: 'amber', title: 'Quotation QT-2617 R2 · Meridian Foods, Pune',
      meta: 'Day 5 follow-up due · ₹8,40,000 · no reply since 23 Aug', action: 'Send follow-up' },
    { icon: 'machine', tone: 'teal', title: '3 AMC contracts expire in 30 days',
      meta: 'Kanpur, Sanand and Hosur sites · utility reminders ready', action: 'Review batch' },
    { icon: 'enquiry', tone: 'good', title: 'New RFQ from a Click-to-WhatsApp ad',
      meta: 'Bottling line vision inspection · ~64 I/O · EtherNet/IP', action: 'Assign owner' },
    { icon: 'alert', tone: 'bad', title: 'Calibration overdue · 2 instruments at Sanand',
      meta: 'Due 18 Aug · site contact has not responded', action: 'Escalate' },
  ];

  protected readonly recent = [
    { name: 'Aug technical bulletin — VFD retrofit', category: 'Marketing', tone: 'amber' as const, sent: 2_140, read: 2_016, replied: 184, cost: '₹2,247' },
    { name: 'AMC renewal — Q3 batch', category: 'Utility', tone: 'teal' as const, sent: 412, read: 389, replied: 96, cost: '₹0' },
    { name: 'Dealer price revision — West', category: 'Utility', tone: 'teal' as const, sent: 187, read: 181, replied: 43, cost: '₹21' },
    { name: 'IMTS stall follow-up', category: 'Marketing', tone: 'amber' as const, sent: 96, read: 91, replied: 38, cost: '₹101' },
  ];

  protected readonly count = count;
}
