import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { OpsService } from '../../core/services/ops.service';
import { ArTopbar } from '../../layout/topbar';
import { ArBanner, ArButton, ArChip } from '../../ui';

/**
 * The tenant's view of, and control over, AutoReach support entering their account.
 *
 * The framing matters as much as the data: this is not an admin panel showing what
 * we did, it is a consent record showing what they allowed. So the active grant is
 * the first thing on the page, revoking is one click and needs no reason, and the
 * session log shows exactly how many actions were taken and how many of those
 * changed anything.
 */
@Component({
  selector: 'ar-support-access',
  imports: [ArTopbar, ArBanner, ArButton, ArChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './support-access.html',
  styleUrl: './support-access.scss',
})
export class ArSupportAccess {
  private readonly ops = inject(OpsService);

  protected readonly grants = this.ops.grants;
  protected readonly sessions = this.ops.sessions;

  protected readonly active = computed(() => this.grants().filter((g) => g.active));
  protected readonly past = computed(() => this.grants().filter((g) => !g.active));

  protected readonly subtitle = computed(() => {
    const n = this.active().length;
    if (n === 0) return 'No one from MNI Assist can access your account';
    return `${n} active grant${n === 1 ? '' : 's'}`;
  });

  protected when(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /** "expires in 3 days" is the number that decides whether someone acts. */
  protected expiresIn(iso: string): string {
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return 'expired';

    const hours = Math.round(ms / 3_600_000);
    if (hours < 24) return `expires in ${hours}h`;

    const days = Math.round(hours / 24);
    return `expires in ${days} day${days === 1 ? '' : 's'}`;
  }

  protected duration(session: { startedAt: string; endedAt?: string }): string {
    if (!session.endedAt) return 'open';

    const minutes = Math.max(
      1,
      Math.round(
        (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 60_000,
      ),
    );

    return minutes < 60 ? `${minutes} min` : `${Math.round(minutes / 60)}h ${minutes % 60}m`;
  }
}
