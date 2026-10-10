import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { firstValueFrom } from 'rxjs';

import { Member, WORKSPACE_ROLES, WorkspaceStore } from '../../core/services/workspace.store';
import { ArTopbar } from '../../layout/topbar';
import { ArBanner, ArButton, ArChip, ArDialog } from '../../ui';
import { SessionService } from '../../proxy/identity/session.service';
import type { UserSessionDto } from '../../proxy/identity/models';
import { environment } from '../../../environments/environment';
import { readApiError } from '../../core/util/api-error';
import { ArHasPermissionDirective } from '../../core/auth/permission';
import { ArGrid } from '../../ui/grid';
import { ArSelect } from '../../ui/select';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { AccountSwitcher } from '../../core/auth/account-switch';
import { CurrentUserService } from '../../core/services/current-user.service';

/**
 * Users & roles (M07). Who is in the workspace, what each can do, and who has been
 * invited but not joined.
 *
 * Deactivating someone is the one destructive action on the page, so it is never a
 * single click: it asks who inherits the open conversations and says how many will
 * move. An invite is a link with an expiry, shown here until it is accepted or
 * lapses — a pending invite that nobody can see is a pending invite nobody chases.
 */
@Component({
  selector: 'ar-members',
  imports: [
    ArTopbar,
    ArBanner,
    ArButton,
    ArChip,
    ArSelect,
    ArGrid,
    GridModule,
    ArHasPermissionDirective,
    ArDialog,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './members.html',
  styleUrl: './members.scss',
})
export class ArMembers {
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);
  private readonly store = inject(WorkspaceStore);

  protected readonly roles = WORKSPACE_ROLES;
  protected readonly members = this.store.members;
  protected readonly invitations = this.store.invitations;
  protected readonly loading = this.store.loading;

  protected readonly active = computed(() => this.members().filter((m) => m.isActive));
  protected readonly deactivated = computed(() => this.members().filter((m) => !m.isActive));
  protected readonly pendingInvites = computed(() =>
    this.invitations().filter((i) => i.state === 'pending'),
  );
  protected readonly closedInvites = computed(() =>
    this.invitations().filter((i) => i.state !== 'pending' && i.state !== 'accepted'),
  );

  /** Grid rows: plain values to sort, filter and export by, plus the member for the actions. */
  protected readonly activeRows = computed(() => this.active().map((m) => this.memberRow(m)));
  protected readonly deactivatedRows = computed(() =>
    this.deactivated().map((m) => this.memberRow(m)),
  );
  protected readonly pendingRows = computed(() =>
    this.pendingInvites().map((i) => ({
      id: i.id,
      email: i.email,
      roleName: i.roleName,
      team: i.teamName ?? '—',
      sent: this.when(i.invitedAt),
      expiry: this.expiresIn(i.expiresAt),
      isExpired: i.isExpired,
    })),
  );
  protected readonly closedRows = computed(() =>
    this.closedInvites().map((i) => ({
      id: i.id,
      email: i.email,
      roleName: i.roleName,
      state: i.state,
      sent: this.when(i.invitedAt),
    })),
  );

  private memberRow(m: Member) {
    return {
      member: m,
      userId: m.userId,
      initials: this.initials(m),
      name: m.name ?? m.userName,
      email: m.email,
      roles: m.roles,
      roleText: m.roles.length ? m.roles.join(', ') : '—',
      teams: m.teamNames.length ? m.teamNames.join(', ') : '—',
      open: m.openConversationCount,
      sessionsEnded: this.when(m.sessionsRevokedAt),
      twoStep: m.twoFactorEnabled ? 'On' : 'Off',
    };
  }

  protected readonly subtitle = computed(() => {
    const n = this.active().length;
    const p = this.pendingInvites().length;
    return p > 0
      ? `${n} member${n === 1 ? '' : 's'} · ${p} invite${p === 1 ? '' : 's'} outstanding`
      : `${n} member${n === 1 ? '' : 's'}`;
  });

  // ---- Invite panel ------------------------------------------------------

  protected readonly inviting = signal(false);
  protected readonly inviteEmail = signal('');
  protected readonly inviteRole = signal<string>('Agent');
  protected readonly inviteNote = signal('');
  protected readonly inviteBusy = signal(false);
  protected readonly lastInviteUrl = signal<string | null>(null);

  protected openInvite(): void {
    this.inviteEmail.set('');
    this.inviteRole.set('Agent');
    this.inviteNote.set('');
    this.lastInviteUrl.set(null);
    this.inviting.set(true);
  }

  protected async sendInvite(): Promise<void> {
    const email = this.inviteEmail().trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      this.toasts.warning('Enter a valid email address, like name@company.com.', 'Invitation');
      return;
    }
    this.inviteBusy.set(true);
    try {
      const url = await this.store.invite(email, this.inviteRole(), this.inviteNote() || undefined);
      this.lastInviteUrl.set(url);
      this.inviting.set(false);
    } finally {
      this.inviteBusy.set(false);
    }
  }

  protected async resend(id: string): Promise<void> {
    await this.store.resendInvitation(id);
  }

  protected async revokeInvite(id: string, email: string): Promise<void> {
    if (
      await this.dialogs.confirm({
        title: 'Revoke invitation?',
        message: `The invitation to ${email} stops working at once. You can invite them again later.`,
        confirmText: 'Revoke',
        tone: 'danger',
      })
    ) {
      await this.store.revokeInvitation(id);
    }
  }

  // ---- Member actions --------------------------------------------------

  protected async deactivate(member: Member): Promise<void> {
    const others = this.active().filter((m) => m.userId !== member.userId);
    let handoverToUserId: string | undefined;

    const who = member.name ?? member.userName;
    const open = member.openConversationCount;
    const answer = await this.dialogs.prompt({
      title: `Deactivate ${who}?`,
      message:
        `Their sessions end immediately and they can no longer sign in.` +
        (open > 0
          ? ` They have ${open} open conversation${open === 1 ? '' : 's'}; choose who takes them over, or leave them unassigned.`
          : ''),
      fields: [
        ...(open > 0
          ? [
              {
                key: 'handover',
                label: 'Hand conversations to',
                options: others.map((m) => ({ value: m.userId, label: m.name ?? m.userName })),
              },
            ]
          : []),
        { key: 'reason', label: 'Reason', hint: 'Kept on the audit record.', maxLength: 500 },
      ],
      confirmText: 'Deactivate',
    });
    if (!answer) return;
    handoverToUserId = answer['handover'] || undefined;
    const reason = answer['reason'] || undefined;
    const moved = await this.store.deactivate(member.userId, handoverToUserId, reason);
    if (moved > 0) {
      this.toasts.success(`${moved} conversation${moved === 1 ? '' : 's'} handed over.`, 'Member');
    }
  }

  protected async reactivate(member: Member): Promise<void> {
    if (
      await this.dialogs.confirm({
        title: `Reactivate ${member.name ?? member.userName}?`,
        message: 'They can sign in again with their last roles.',
        confirmText: 'Reactivate',
      })
    ) {
      await this.store.reactivate(member.userId);
    }
  }

  // ---- Acting as a member ---------------------------------------------------

  private readonly switcher = inject(AccountSwitcher);
  private readonly me = inject(CurrentUserService);

  /** Not oneself, and never another admin: the server refuses those too. */
  protected canActAs(member: Member): boolean {
    if (!member.isActive || member.userId === this.me.id()) return false;
    return !member.roles.some((r) => ['owner', 'admin'].includes(r.toLowerCase()));
  }

  protected async actAs(member: Member): Promise<void> {
    const who = member.name ?? member.userName;
    if (
      !(await this.dialogs.confirm({
        title: `Act as ${who}?`,
        message: `You see and do exactly what ${who} can. Everything is recorded as ${who}'s, with your name beside it, and you cannot act as anyone else until you return.`,
        confirmText: 'Act as them',
      }))
    )
      return;
    try {
      await this.switcher.switchTo({ kind: 'ImpersonateUser', userId: member.userId });
    } catch (e) {
      this.toasts.error(readApiError(e));
    }
  }

  protected async resetTwoFactor(member: Member): Promise<void> {
    const who = member.name ?? member.userName;
    if (
      await this.dialogs.confirm({
        title: `Turn off two-step verification for ${who}?`,
        message:
          'Do this only when you are sure it is them — usually they have lost their phone and their recovery codes. They sign in with just their password and can set it up again.',
        confirmText: 'Turn off',
      })
    ) {
      await this.store.resetTwoFactor(member.userId);
      this.toasts.success(`Two-step verification turned off for ${who}.`);
    }
  }

  // ---- A member's devices ----------------------------------------------

  private readonly sessionApi = inject(SessionService);
  protected readonly devicesOf = signal<Member | null>(null);
  protected readonly devices = signal<UserSessionDto[] | null>(null);
  protected readonly devicesError = signal<string | null>(null);

  protected async openDevices(member: Member): Promise<void> {
    this.devicesOf.set(member);
    this.devices.set(null);
    this.devicesError.set(null);
    await this.loadDevices(member);
  }

  private async loadDevices(member: Member): Promise<void> {
    try {
      const r = environment.useMockData
        ? { items: [] as UserSessionDto[] }
        : await firstValueFrom(this.sessionApi.getUserSessions(member.userId));
      if (this.devicesOf() === member) this.devices.set(r.items ?? []);
    } catch (e) {
      this.devicesError.set(readApiError(e));
    }
  }

  protected async endDevice(member: Member, s: UserSessionDto): Promise<void> {
    const confirmed = await this.dialogs.confirm({
      title: 'Sign this device out?',
      message: `${s.deviceInfo || s.device || 'This device'} has to sign in again. ${member.name ?? member.userName}'s other devices stay signed in.`,
      confirmText: 'Sign out',
    });
    if (!confirmed) return;
    try {
      await firstValueFrom(this.sessionApi.revokeUserSession(member.userId, s.sessionId));
      await this.loadDevices(member);
    } catch (e) {
      this.devicesError.set(readApiError(e));
    }
  }

  protected async endAllDevices(member: Member): Promise<void> {
    this.devicesOf.set(null);
    await this.revokeSessions(member);
  }

  protected lastActive(s: UserSessionDto): string {
    const iso = s.lastAccessedUtc ?? s.signedInUtc;
    if (!iso) return 'unknown';
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.round(hrs / 24)}d ago`;
  }

  protected async revokeSessions(member: Member): Promise<void> {
    const answer = await this.dialogs.prompt({
      title: `Sign ${member.name ?? member.userName} out everywhere?`,
      message: 'Every device they are signed in on is signed out. They can sign back in.',
      fields: [{ key: 'reason', label: 'Reason', maxLength: 500 }],
      confirmText: 'Sign out',
    });
    if (answer) await this.store.revokeSessions(member.userId, answer['reason'] || undefined);
  }

  // ---- Formatting -----------------------------------------------------

  protected roleTone(role: string): 'amber' | 'teal' | 'neutral' {
    if (role === 'Owner' || role === 'Administrator' || role === 'admin') return 'amber';
    if (role === 'Manager') return 'teal';
    return 'neutral';
  }

  protected when(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  protected expiresIn(iso?: string): string {
    if (!iso) return '';
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return 'expired';
    const days = Math.round(ms / 86_400_000);
    return days < 1 ? 'expires today' : `expires in ${days} day${days === 1 ? '' : 's'}`;
  }

  protected initials(m: Member): string {
    const source = m.name ?? m.userName;
    return source
      .split(/\s+/)
      .map((w) => w[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
}
