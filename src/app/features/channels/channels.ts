import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LocalizationPipe, PermissionService } from '@abp/ng.core';
import { grantedPolicy } from '../../core/auth/permission';
import { ArVoiceAgentDialog } from './voice-agent-dialog';

import { ChannelService } from '../../core/services/channel.service';
import { Channel, QualityRating, TIER_LABEL, TIER_LIMIT } from '../../core/models/channel.model';
import { count } from '../../core/util/format';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArMeter } from '../../ui';
import { ChipTone } from '../../ui/chip';
import { ArConnectNumberDialog } from './connect-number-dialog';
import { ArSmsInboundCard } from './sms-inbound-card';

/**
 * Channels overview (M02). One card per connected number with its quality, tier and
 * rolling-24h consumption — the "channel health" surface the spec asks for. The
 * per-number PIN and display-name management is on /channels/numbers.
 */
@Component({
  selector: 'ar-channels',
  imports: [
    ArTopbar,
    ArButton,
    ArChip,
    ArMeter,
    RouterLink,
    ArConnectNumberDialog,
    ArSmsInboundCard,
    ArVoiceAgentDialog,
    LocalizationPipe,
    NgTemplateOutlet,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './channels.html',
  styleUrl: './channels.scss',
})
export class ArChannels {
  private readonly store = inject(ChannelService);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly router = inject(Router, { optional: true });

  protected readonly mode = (this.route?.snapshot?.data?.['mode'] as string | undefined) ?? 'list';
  protected readonly isPage = this.mode !== 'list';

  protected readonly channels = this.store.channels;
  protected readonly loading = this.store.loading;
  protected readonly connectOpen = signal(false);
  protected readonly voiceAgentChannel = signal<string | null>(null);
  protected readonly canManageVoiceAgent = grantedPolicy(
    'AutoReach.Channels.Manage',
    inject(PermissionService),
  );

  protected readonly pageTitle = computed(() =>
    this.mode === 'connect' ? 'Connect a number' : 'Voice agent',
  );

  constructor() {
    if (this.mode === 'connect') {
      this.connectOpen.set(true);
    } else if (this.mode === 'voice-agent') {
      const id = this.route?.snapshot?.paramMap?.get('id');
      if (id) this.voiceAgentChannel.set(id);
    }
  }

  protected goConnect(): void {
    if (this.router) void this.router.navigate(['/channels/connect']);
    else this.connectOpen.set(true);
  }

  protected goVoiceAgent(channelId: string): void {
    if (this.router && channelId) void this.router.navigate(['/channels', channelId, 'voice-agent']);
    else this.voiceAgentChannel.set(channelId);
  }

  protected close(): void {
    this.connectOpen.set(false);
    this.voiceAgentChannel.set(null);
    if (this.isPage && this.router) {
      void this.router.navigate(['/channels']);
    }
  }

  protected readonly restrictedCount = computed(
    () => this.channels().filter((c) => c.restricted).length,
  );

  protected tierLabel(c: Channel): string {
    return TIER_LABEL[c.tier];
  }
  protected limit(c: Channel): number | null {
    return TIER_LIMIT[c.tier];
  }
  protected utilisation(c: Channel): number {
    const l = TIER_LIMIT[c.tier];
    return l == null ? 0 : Math.min(100, Math.round((c.used24h / l) * 100));
  }
  protected qualityTone(q: QualityRating): ChipTone {
    return q === 'green' ? 'good' : q === 'yellow' ? 'amber' : q === 'red' ? 'bad' : 'neutral';
  }
  protected count(n: number): string {
    return count(n);
  }
}
