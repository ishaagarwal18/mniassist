import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { GridModule } from '@syncfusion/ej2-angular-grids';

import { OpsService } from '../../core/services/ops.service';
import { ArTopbar } from '../../layout/topbar';
import { ArBanner, ArButton, ArChip, ArDialog } from '../../ui';
import { ArSelect } from '../../ui/select';
import { ConfirmService } from '../../core/ui/confirm.service';
import { CurrentUserService } from '../../core/services/current-user.service';
import { SupportGrant } from '../../core/models/ops.model';
import { ArGrid } from '../../ui/grid';

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
  imports: [ArTopbar, ArBanner, ArButton, ArChip, ArDialog, ArSelect, ArGrid, GridModule, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './support-access.html',
  styleUrl: './support-access.scss',
})
export class ArSupportAccess {
  private readonly ops = inject(OpsService);
  private readonly dialogs = inject(ConfirmService);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly router = inject(Router, { optional: true });

  protected readonly mode = (this.route?.snapshot?.data?.['mode'] as string | undefined) ?? 'list';
  protected readonly isPage = this.mode !== 'list';

  constructor() {
    if (this.mode === 'grant') {
      this.openGrant();
    }
  }

  protected goGrant(): void {
    if (this.router) void this.router.navigate(['/settings/support-access/grant']);
    else this.openGrant();
  }

  protected close(): void {
    this.grantOpen.set(false);
    if (this.isPage && this.router) {
      void this.router.navigate(['/settings/support-access']);
    }
  }
  /** Grants belong to a workspace; a host (platform) user has none to give. */
  protected readonly isHost = inject(CurrentUserService).isHost;

  protected readonly grants = this.ops.grants;

  // ---- granting and revoking --------------------------------------------------

  protected readonly durations = [
    { hours: 1, label: '1 hour' },
    { hours: 4, label: '4 hours' },
    { hours: 24, label: '1 day' },
    { hours: 72, label: '3 days' },
    { hours: 168, label: '7 days (the longest allowed)' },
  ];
  protected readonly grantOpen = signal(false);
  protected readonly reason = signal('');
  protected readonly hours = signal(4);
  protected readonly ticket = signal('');
  protected readonly allowsWrite = signal(false);
  protected readonly busy = signal(false);

  protected openGrant(): void {
    this.reason.set('');
    this.hours.set(4);
    this.ticket.set('');
    this.allowsWrite.set(false);
    this.grantOpen.set(true);
  }

  /** The dialog has checked the reason before this runs. */
  protected async grant(): Promise<void> {
    this.busy.set(true);
    try {
      await this.ops.grantSupport({
        reason: this.reason().trim(),
        durationHours: this.hours(),
        allowsWrite: this.allowsWrite(),
        ticketRef: this.ticket().trim() || null,
      });
      this.close();
    } catch {
      /* the server's reason is shown as a toast; the dialog stays open */
    } finally {
      this.busy.set(false);
    }
  }

  protected async revoke(g: SupportGrant): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: 'Revoke support access?',
      message: 'Support loses access at once and any session in progress is closed.',
      confirmText: 'Revoke now',
      tone: 'danger',
    });
    if (!ok) return;
    this.busy.set(true);
    try {
      await this.ops.revokeSupport(g.id);
    } catch {
      /* shown as a toast */
    } finally {
      this.busy.set(false);
    }
  }
  protected readonly sessions = this.ops.sessions;

  protected readonly active = computed(() => this.grants().filter((g) => g.active));
  protected readonly past = computed(() => this.grants().filter((g) => !g.active));

  /** Grid rows: plain values to sort, filter and export by. */
  protected readonly sessionRows = computed(() =>
    this.sessions().map((s) => ({
      id: s.id,
      engineer: s.engineer,
      started: this.when(s.startedAt),
      duration: this.duration(s),
      writeEnabled: s.writeEnabled,
      access: s.writeEnabled ? 'Read and write' : 'Read only',
      actionCount: s.actionCount,
      writeCount: s.writeCount,
    })),
  );
  protected readonly pastRows = computed(() =>
    this.past().map((g) => ({
      id: g.id,
      reason: g.reason,
      granted: this.when(g.grantedAt),
      ended: g.revokedAt
        ? `Revoked ${this.when(g.revokedAt)}`
        : `Expired ${this.when(g.expiresAt)}`,
      allowsWrite: g.allowsWrite,
      access: g.allowsWrite ? 'Read and write' : 'Read only',
      sessionCount: g.sessionCount,
    })),
  );

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
