import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { GrowthService } from '../../core/services/growth.service';
import { TenantOverview } from '../../core/models/growth.model';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArStatTile } from '../../ui';

/**
 * Our own back office: how the platform is doing, and which tenants need a human.
 *
 * The list is ordered by the two things that actually prompt action — a degraded
 * number, and an account that has stopped sending. Both are quiet failures: nobody
 * raises a ticket to say "we drifted away", and by the time they cancel the reason
 * has been visible in this table for a month.
 *
 * Every figure here comes from a nightly rollup, not a live scan across tenants.
 * That is why the delivery rate and the message count are as of the last run rather
 * than to the second, and the header says so instead of implying a freshness the
 * numbers do not have.
 */
@Component({
  selector: 'ar-platform-console',
  imports: [ArTopbar, ArButton, ArChip, ArStatTile],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './console.html',
  styleUrl: './console.scss',
})
export class ArPlatformConsole {
  private readonly growth = inject(GrowthService);

  protected readonly metrics = this.growth.platformMetrics;
  protected readonly rates = this.growth.rateHistory;

  protected readonly atRiskOnly = signal(false);

  protected readonly tenants = computed(() => {
    const all = this.growth.tenants();
    const rows = this.atRiskOnly() ? all.filter(t => this.isAtRisk(t)) : [...all];

    // At-risk first, then by spend. The console is a work queue before it is a
    // report, so what needs attention sorts above what is merely large.
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
    return t.worstQuality === 'yellow' || t.worstQuality === 'red' ||
      (t.channelCount > 0 && t.messages30d === 0);
  }

  protected riskReason(t: TenantOverview): string | null {
    if (t.worstQuality === 'red') return 'Number quality is Red';
    if (t.worstQuality === 'yellow') return 'Number quality is Yellow';

    if (t.channelCount > 0 && t.messages30d === 0) {
      // A trial that connected a number and never sent is a stalled onboarding, not a
      // lapsing customer — and saying "nothing in 30 days" about an account nine days
      // old is simply false. Same signal, different problem, different sentence.
      return t.isTrial ? 'Trial connected a number but never sent' : 'Connected but sent nothing in 30 days';
    }

    return null;
  }

  protected qualityTone(q: TenantOverview['worstQuality']): 'good' | 'warn' | 'bad' | 'neutral' {
    return q === 'green' ? 'good' : q === 'yellow' ? 'warn' : q === 'red' ? 'bad' : 'neutral';
  }

  // ---- Formatting ----------------------------------------------------------

  /** Lakh-scale money reads better abbreviated; a bill does not. This is a dashboard. */
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
