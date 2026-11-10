import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, forkJoin, map } from 'rxjs';
import { WorkspaceMemberService } from '../../proxy/identity';
import { TwoFactorService } from '../../proxy/identity/two-factor.service';
import { InvitationState } from '../../proxy/identity/invitation-state.enum';
import { settled } from '../util/resource';

export interface Member {
  readonly userId: string;
  readonly userName: string;
  readonly name?: string;
  readonly email: string;
  readonly isActive: boolean;
  readonly roles: readonly string[];
  readonly teamNames: readonly string[];
  readonly openConversationCount: number;
  readonly sessionsRevokedAt?: string;
  readonly twoFactorEnabled?: boolean;
}

export interface Invitation {
  readonly id: string;
  readonly email: string;
  readonly roleName: string;
  readonly teamName?: string;
  readonly state: 'pending' | 'accepted' | 'revoked' | 'expired';
  readonly expiresAt?: string;
  readonly invitedAt?: string;
  readonly note?: string;
  readonly isExpired: boolean;
}

/** The roles AutoReach seeds. Invitations and role changes pick from this list. */
export const WORKSPACE_ROLES = [
  'Owner',
  'Administrator',
  'Manager',
  'Agent',
  'Analyst',
  'Billing',
] as const;

const INVITE_STATE: Record<InvitationState, Invitation['state']> = {
  [InvitationState.Pending]: 'pending',
  [InvitationState.Accepted]: 'accepted',
  [InvitationState.Revoked]: 'revoked',
  [InvitationState.Expired]: 'expired',
};

/**
 * The workspace's people: who is in it, what they can do, and who has been invited
 * but not joined. Deactivating a member is the sharp edge here — it hands their open
 * conversations to someone else and ends their sessions — so the store surfaces the
 * handover count rather than letting it happen silently.
 */
@Injectable({ providedIn: 'root' })
export class WorkspaceStore {
  private readonly api = inject(WorkspaceMemberService);
  private readonly twoFactor = inject(TwoFactorService);

  private readonly reloadTick = signal(0);

  private readonly resource = rxResource({
    params: () => ({ tick: this.reloadTick() }),
    stream: () =>
      forkJoin({
        members: this.api.getList(),
        pending: this.api.getInvitations(InvitationState.Pending, {
          skipCount: 0,
          maxResultCount: 100,
        }),
        closed: this.api.getInvitations(InvitationState.Revoked, {
          skipCount: 0,
          maxResultCount: 50,
        }),
      }).pipe(
        map((r) => ({
          members: (r.members.items ?? []).map((m): Member => ({
            userId: m.userId ?? '',
            userName: m.userName ?? '',
            name: m.name ?? undefined,
            email: m.email ?? '',
            isActive: m.isActive ?? false,
            roles: m.roles ?? [],
            teamNames: m.teamNames ?? [],
            openConversationCount: m.openConversationCount ?? 0,
            sessionsRevokedAt: m.lastSessionRevokedAtUtc ?? undefined,
            twoFactorEnabled: m.twoFactorEnabled ?? false,
          })),
          invitations: [...(r.pending.items ?? []), ...(r.closed.items ?? [])].map(
            (i): Invitation => ({
              id: i.id ?? '',
              email: i.email ?? '',
              roleName: i.roleName ?? '',
              teamName: i.teamName ?? undefined,
              state: i.state != null ? INVITE_STATE[i.state] : 'pending',
              expiresAt: i.expiresAtUtc ?? undefined,
              invitedAt: i.creationTime ?? undefined,
              note: i.note ?? undefined,
              isExpired: i.isExpired ?? false,
            }),
          ),
        })),
      ),
    defaultValue: { members: [] as Member[], invitations: [] as Invitation[] },
  });

  readonly loading = computed(() => this.resource.isLoading());

  readonly members = computed<readonly Member[]>(
    () =>
      settled(this.resource, { members: [] as Member[], invitations: [] as Invitation[] }).members,
  );

  readonly invitations = computed<readonly Invitation[]>(
    () =>
      settled(this.resource, { members: [] as Member[], invitations: [] as Invitation[] })
        .invitations,
  );

  private reload(): void {
    this.reloadTick.update((n) => n + 1);
  }

  async invite(email: string, roleName: string, note?: string): Promise<string | null> {
    const created = await firstValueFrom(
      this.api.invite({ email: email.trim(), roleName, note: note?.trim() || undefined }),
    );
    this.reload();
    return created.acceptUrl ?? null;
  }

  async resendInvitation(id: string): Promise<void> {
    await firstValueFrom(this.api.resendInvitation(id));
    this.reload();
  }

  async revokeInvitation(id: string): Promise<void> {
    await firstValueFrom(this.api.revokeInvitation(id));
    this.reload();
  }

  /** Returns the number of conversations handed over. */
  async deactivate(
    userId: string,
    handoverToUserId: string | undefined,
    reason: string | undefined,
  ): Promise<number> {
    const result = await firstValueFrom(
      this.api.deactivate({ userId, handoverToUserId: handoverToUserId || undefined, reason }),
    );
    this.reload();
    return result.conversationsHandedOver ?? 0;
  }

  async reactivate(userId: string): Promise<void> {
    await firstValueFrom(this.api.reactivate(userId));
    this.reload();
  }

  /** Turns off a member's two-step sign-in, for the lost-phone case. */
  async resetTwoFactor(userId: string): Promise<void> {
    await firstValueFrom(this.twoFactor.resetForUser(userId));
    this.reload();
  }

  async revokeSessions(userId: string, reason: string | undefined): Promise<void> {
    await firstValueFrom(this.api.revokeSessions({ userId, reason }));
    this.reload();
  }
}
