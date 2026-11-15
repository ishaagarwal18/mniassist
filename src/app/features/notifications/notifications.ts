import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { OpsService } from '../../core/services/ops.service';
import { NotificationTone } from '../../core/models/ops.model';
import { ArTopbar } from '../../layout/topbar';
import { ArAlertTemplateStatus } from './alert-template-status';
import { ArButton, ArChip, ArIcon } from '../../ui';
import { ChipTone } from '../../ui/chip';
import { IconName } from '../../ui/icon';

type Filter = 'all' | 'unread' | 'critical';

/** Alert severity is the only thing that decides colour here — the kind never does. */
const TONE_CHIP: Record<NotificationTone, ChipTone> = {
  info: 'neutral',
  warning: 'warn',
  critical: 'bad',
};

const TONE_ICON: Record<NotificationTone, IconName> = {
  info: 'clock',
  warning: 'alert',
  critical: 'alert',
};

/**
 * The alert stream: quality downgrades, expiring tokens, billing variances,
 * template pauses.
 *
 * Every row here is something that either has already stopped messages going out or
 * will stop them shortly, which is why the list is ordered strictly by time rather
 * than grouped by kind — an operator needs to know what happened most recently, not
 * how many of each type there are.
 */
@Component({
  selector: 'ar-notifications',
  imports: [ArAlertTemplateStatus, ArTopbar, ArButton, ArChip, ArIcon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
})
export class ArNotifications {
  private readonly ops = inject(OpsService);

  protected readonly filter = signal<Filter>('all');

  protected readonly unreadCount = this.ops.unreadCount;
  protected readonly criticalCount = this.ops.unreadCriticalCount;

  protected readonly visible = computed(() => {
    const all = this.ops.notifications();

    switch (this.filter()) {
      case 'unread':
        return all.filter((n) => !n.read);
      case 'critical':
        return all.filter((n) => n.tone === 'critical');
      default:
        return all;
    }
  });

  protected readonly subtitle = computed(() => {
    const unread = this.unreadCount();
    const critical = this.criticalCount();

    if (unread === 0) return 'Nothing needs attention';
    if (critical === 0) return `${unread} unread`;
    return `${unread} unread · ${critical} critical`;
  });

  protected chipTone(tone: NotificationTone): ChipTone {
    return TONE_CHIP[tone];
  }

  protected icon(tone: NotificationTone): IconName {
    return TONE_ICON[tone];
  }

  protected setFilter(f: Filter): void {
    this.filter.set(f);
  }

  protected markRead(id: string): void {
    this.ops.markRead(id);
  }

  protected markAllRead(): void {
    this.ops.markAllRead();
  }

  /** "4h ago" is what an operator scanning an alert list actually reads. */
  protected ago(iso: string): string {
    const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.round(hours / 24);
    return days === 1 ? 'yesterday' : `${days}d ago`;
  }

  protected kindLabel(kind: string): string {
    return kind.replace(/([a-z])([A-Z])/g, '$1 $2');
  }
}
