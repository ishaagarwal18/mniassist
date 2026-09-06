import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, forkJoin, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { WorkspaceMemberService } from '../../proxy/identity';
import { InvitationState } from '../../proxy/identity/invitation-state.enum';

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
  'Admin',
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

const SEED_MEMBERS: readonly Member[] = [
  {
    userId: 'u-1',
    userName: 'rahul.k',
    name: 'Rahul Kanade',
    email: 'rahul@vertexautomation.in',
    isActive: true,
    roles: ['Owner'],
    teamNames: ['Sales'],
    openConversationCount: 3,
  },
  {
    userId: 'u-2',
    userName: 'sneha.p',
    name: 'Sneha Patil',
    email: 'sneha@vertexautomation.in',
    isActive: true,
    roles: ['Manager'],
    teamNames: ['Sales', 'Service'],
    openConversationCount: 7,
  },
  {
    userId: 'u-3',
    userName: 'imtiaz.a',
    name: 'Imtiaz Ahmed',
    email: 'imtiaz@vertexautomation.in',
    isActive: true,
    roles: ['Agent'],
    teamNames: ['Service'],
    openConversationCount: 12,
  },
  {
    userId: 'u-4',
    userName: 'deepa.r',
    name: 'Deepa Rao',
    email: 'deepa@vertexautomation.in',
    isActive: false,
    roles: ['Agent'],
    teamNames: [],
    openConversationCount: 0,
    sessionsRevokedAt: new Date(Date.now() - 40 * 86_400_000).toISOString(),
  },
];

const SEED_INVITES: readonly Invitation[] = [
  {
    id: 'i-1',
    email: 'ravi@vertexautomation.in',
    roleName: 'Agent',
    teamName: 'Service',
    state: 'pending',
    expiresAt: new Date(Date.now() + 5 * 86_400_000).toISOString(),
    invitedAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    isExpired: false,
  },
  {
    id: 'i-2',
    email: 'priya@vertexautomation.in',
    roleName: 'Analyst',
    state: 'expired',
    expiresAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    invitedAt: new Date(Date.now() - 12 * 86_400_000).toISOString(),
    isExpired: true,
  },
];

/**
 * The workspace's people: who is in it, what they can do, and who has been invited
 * but not joined. Deactivating a member is the sharp edge here — it hands their open
 * conversations to someone else and ends their sessions — so the store surfaces the
 * handover count rather than letting it happen silently.
 */
@Injectable({ providedIn: 'root' })
export class WorkspaceStore {
  private readonly api = inject(WorkspaceMemberService);

  private readonly reloadTick = signal(0);

  private readonly resource = rxResource({
    params: () => (environment.useMockData ? undefined : { tick: this.reloadTick() }),
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

  readonly loading = computed(() => !environment.useMockData && this.resource.isLoading());

  readonly members = computed<readonly Member[]>(() =>
    environment.useMockData ? SEED_MEMBERS : this.resource.value().members,
  );

  readonly invitations = computed<readonly Invitation[]>(() =>
    environment.useMockData ? SEED_INVITES : this.resource.value().invitations,
  );

  private reload(): void {
    this.reloadTick.update((n) => n + 1);
  }

  async invite(email: string, roleName: string, note?: string): Promise<string | null> {
    if (environment.useMockData) return null;
    const created = await firstValueFrom(
      this.api.invite({ email: email.trim(), roleName, note: note?.trim() || undefined }),
    );
    this.reload();
    return created.acceptUrl ?? null;
  }

  async resendInvitation(id: string): Promise<void> {
    if (!environment.useMockData) {
      await firstValueFrom(this.api.resendInvitation(id));
      this.reload();
    }
  }

  async revokeInvitation(id: string): Promise<void> {
    if (!environment.useMockData) {
      await firstValueFrom(this.api.revokeInvitation(id));
      this.reload();
    }
  }

  /** Returns the number of conversations handed over. */
  async deactivate(
    userId: string,
    handoverToUserId: string | undefined,
    reason: string | undefined,
  ): Promise<number> {
    if (environment.useMockData) return 0;
    const result = await firstValueFrom(
      this.api.deactivate({ userId, handoverToUserId: handoverToUserId || undefined, reason }),
    );
    this.reload();
    return result.conversationsHandedOver ?? 0;
  }

  async reactivate(userId: string): Promise<void> {
    if (!environment.useMockData) {
      await firstValueFrom(this.api.reactivate(userId));
      this.reload();
    }
  }

  async revokeSessions(userId: string, reason: string | undefined): Promise<void> {
    if (!environment.useMockData) {
      await firstValueFrom(this.api.revokeSessions({ userId, reason }));
      this.reload();
    }
  }
}
