import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

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
  imports: [ArTopbar, ArButton, ArChip, ArMeter, RouterLink, ArConnectNumberDialog, ArSmsInboundCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './channels.html',
  styleUrl: './channels.scss',
})
export class ArChannels {
  private readonly store = inject(ChannelService);

  protected readonly channels = this.store.channels;
  protected readonly loading = this.store.loading;
  protected readonly connectOpen = signal(false);

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
