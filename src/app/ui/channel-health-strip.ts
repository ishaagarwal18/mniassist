import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Channel, TIER_LABEL, TIER_LIMIT } from '../core/models/channel.model';
import { count, pct } from '../core/util/format';
import { ArMeter } from './meter';

/** The product's signature component: quality, tier and rolling 24-hour
 *  consumption. These three numbers decide whether a tenant can send at all,
 *  so the strip is pinned to the top bar of every screen rather than buried
 *  in a channel settings page. Portfolio-scoped since October 2025 — adding a
 *  number does not add capacity. */
@Component({
  selector: 'ar-channel-health-strip',
  imports: [ArMeter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="chs__group">
      <span class="chs__dot" [class]="'chs__dot--' + channel().quality" aria-hidden="true"></span>
      <span class="chs__quality">{{ qualityLabel() }}</span>
    </span>
    <span class="chs__rule" aria-hidden="true"></span>
    <span class="chs__group">
      <span class="chs__tier">{{ tierLabel() }}</span>
      @if (limit(); as l) {
        <ar-meter class="chs__meter" [value]="channel().used24h" [max]="l"
                  [thickness]="5" [tone]="usageTone()"
                  [label]="'Rolling 24-hour recipients used: ' + usageText()" />
        <span class="chs__usage">{{ usageText() }}</span>
      } @else {
        <span class="chs__usage">Unlimited</span>
      }
    </span>
  `,
  styles: `
    :host {
      display: inline-flex; align-items: center; gap: 14px;
      height: var(--ar-control-h); padding: 0 12px;
      background: var(--ar-bg-100); border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-control);
    }
    .chs__group { display: inline-flex; align-items: center; gap: 7px; }
    .chs__rule { width: 1px; height: 16px; background: var(--ar-line-300); }
    .chs__dot { width: 7px; height: 7px; border-radius: 50%; flex: none; }
    .chs__dot--unknown { background: var(--ar-ink-400); box-shadow: 0 0 0 3px var(--ar-line-200); }
    .chs__dot--green  { background: var(--ar-green-600); box-shadow: 0 0 0 3px var(--ar-green-100); }
    .chs__dot--yellow { background: var(--ar-warn-600); box-shadow: 0 0 0 3px var(--ar-warn-100); }
    .chs__dot--red    { background: var(--ar-red-600); box-shadow: 0 0 0 3px var(--ar-red-100); }
    .chs__quality { font: 500 12px var(--ar-font-sans); color: var(--ar-ink-700); }
    .chs__tier { font: 500 12px var(--ar-font-sans); color: var(--ar-ink-500); }
    .chs__meter { width: 64px; }
    .chs__usage { font: 500 11px var(--ar-font-mono); color: var(--ar-ink-500); white-space: nowrap; }
  `,
})
export class ArChannelHealthStrip {
  readonly channel = input.required<Channel>();

  protected readonly limit = computed(() => TIER_LIMIT[this.channel().tier]);
  protected readonly tierLabel = computed(() => TIER_LABEL[this.channel().tier]);
  protected readonly qualityLabel = computed(() =>
    ({ unknown: 'Not rated yet', green: 'Green', yellow: 'Yellow', red: 'Red' })[this.channel().quality]);

  protected readonly usageText = computed(() => {
    const l = this.limit();
    return l ? `${count(this.channel().used24h)}/${count(l)}` : count(this.channel().used24h);
  });

  /** Warn before the tenant hits the ceiling, not after a campaign has failed. */
  protected readonly usageTone = computed(() => {
    const l = this.limit();
    if (!l) return 'teal' as const;
    const used = this.channel().used24h / l;
    return used > 0.9 ? ('bad' as const) : used > 0.7 ? ('warn' as const) : ('amber' as const);
  });

  protected readonly usagePct = computed(() => {
    const l = this.limit();
    return l ? pct(this.channel().used24h, l, 0) : '—';
  });
}
