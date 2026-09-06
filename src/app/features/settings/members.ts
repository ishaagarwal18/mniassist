import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { Member, WORKSPACE_ROLES, WorkspaceStore } from '../../core/services/workspace.store';
import { ArTopbar } from '../../layout/topbar';
import { ArBanner, ArButton, ArChip } from '../../ui';

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
  imports: [ArTopbar, ArBanner, ArButton, ArChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './members.html',
  styleUrl: './members.scss',
})
export class ArMembers {
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
      window.alert('Enter a valid email address.');
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
    if (window.confirm(`Revoke the invitation to ${email}?`)) {
      await this.store.revokeInvitation(id);
    }
  }

  // ---- Member actions --------------------------------------------------

  protected async deactivate(member: Member): Promise<void> {
    const others = this.active().filter((m) => m.userId !== member.userId);
    let handoverToUserId: string | undefined;

    if (member.openConversationCount > 0) {
      const names = others.map((m, i) => `${i + 1}. ${m.name ?? m.userName}`).join('\n');
      const pick = window.prompt(
        `${member.name ?? member.userName} has ${member.openConversationCount} open ` +
          `conversation${member.openConversationCount === 1 ? '' : 's'}. Hand them to which member?\n\n${names}\n\n` +
          `Enter a number, or leave blank to unassign them.`,
      );
      if (pick === null) return;
      const idx = Number(pick) - 1;
      if (pick.trim() && others[idx]) handoverToUserId = others[idx].userId;
    } else if (
      !window.confirm(
        `Deactivate ${member.name ?? member.userName}? Their sessions end immediately.`,
      )
    ) {
      return;
    }

    const reason =
      window.prompt('Reason (optional, kept on the audit record):')?.trim() || undefined;
    const moved = await this.store.deactivate(member.userId, handoverToUserId, reason);
    if (moved > 0) {
      window.alert(`${moved} conversation${moved === 1 ? '' : 's'} handed over.`);
    }
  }

  protected async reactivate(member: Member): Promise<void> {
    if (window.confirm(`Reactivate ${member.name ?? member.userName}?`)) {
      await this.store.reactivate(member.userId);
    }
  }

  protected async revokeSessions(member: Member): Promise<void> {
    if (
      window.confirm(
        `Sign ${member.name ?? member.userName} out of every device? They can sign back in.`,
      )
    ) {
      const reason = window.prompt('Reason (optional):')?.trim() || undefined;
      await this.store.revokeSessions(member.userId, reason);
    }
  }

  // ---- Formatting -----------------------------------------------------

  protected roleTone(role: string): 'amber' | 'teal' | 'neutral' {
    if (role === 'Owner' || role === 'Admin') return 'amber';
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
