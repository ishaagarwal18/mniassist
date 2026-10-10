import { Injectable, Injector, computed, inject } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { ConfigStateService, SessionStateService, TENANT_KEY } from '@abp/ng.core';
import { OAuthService } from 'angular-oauth2-oidc';
import { of } from 'rxjs';

import { environment } from '../../../environments/environment';

/**
 * The ways one signed-in person can become another account. The names are what the
 * auth server's `account_switch` grant reads as `kind`.
 */
export type AccountSwitchKind =
  'ImpersonateUser' | 'ManageWorkspace' | 'LinkedAccount' | 'Delegation' | 'ReturnToSelf';

export interface AccountSwitchRequest {
  kind: AccountSwitchKind;
  userId?: string | null;
  delegationId?: string | null;
  /** The workspace the switch lands in; null for the host; left out to stay in this one. */
  tenant?: { id: string; name: string } | null;
}

/** Who is really at the keyboard while acting as someone else. */
export interface ActingAs {
  userName: string;
  tenantId: string | null;
  tenantName: string | null;
}

export const ACCOUNT_SWITCH_GRANT = 'account_switch';

/** The token request's own parameters; the OAuth library adds client id and scopes. */
export function accountSwitchParameters(request: AccountSwitchRequest): Record<string, string> {
  const params: Record<string, string> = { kind: request.kind };
  if (request.userId) params['user_id'] = request.userId;
  if (request.delegationId) params['delegation_id'] = request.delegationId;
  if (request.tenant?.id && request.kind !== 'ReturnToSelf')
    params['tenant_id'] = request.tenant.id;
  return params;
}

/**
 * Reads ABP's impersonator fields from the application configuration's `currentUser`.
 * Present for every switch except to a linked account, which is the person's own.
 */
export function actingAsFrom(currentUser: unknown): ActingAs | null {
  const u = (currentUser ?? {}) as Record<string, unknown>;
  const id = u['impersonatorUserId'] as string | null | undefined;
  if (!id) return null;
  return {
    userName: (u['impersonatorUserName'] as string) || 'another account',
    tenantId: (u['impersonatorTenantId'] as string) || null,
    tenantName: (u['impersonatorTenantName'] as string) || null,
  };
}

/**
 * Switches the signed-in session to another account through the `account_switch` grant,
 * and back. The current access token proves who is asking; the server decides whether
 * the switch is allowed and records it. The page reloads afterwards, so no screen keeps
 * the previous account's data.
 */
@Injectable({ providedIn: 'root' })
export class AccountSwitcher {
  private readonly injector = inject(Injector);
  private readonly config = inject(ConfigStateService);
  private readonly session = inject(SessionStateService);

  private readonly currentUser = toSignal(
    environment.useMockData ? of(undefined) : this.config.getOne$('currentUser'),
    { initialValue: undefined },
  );

  /** Set while acting as someone else; null on one's own account. */
  readonly actingAs = computed(() => actingAsFrom(this.currentUser()));

  async switchTo(request: AccountSwitchRequest, landOn = '/home'): Promise<void> {
    if (environment.useMockData) {
      throw new Error(
        'Switching accounts needs the API — it is not available in the standalone build.',
      );
    }
    const oauth = this.injector.get(OAuthService);
    let headers = new HttpHeaders({ Authorization: `Bearer ${oauth.getAccessToken()}` });
    const current = this.session.getTenant();
    if (current?.id) headers = headers.set(this.injector.get(TENANT_KEY), current.id);

    await oauth.fetchTokenUsingGrant(
      ACCOUNT_SWITCH_GRANT,
      accountSwitchParameters(request),
      headers,
    );

    // Later calls carry the new workspace's header; the reload loads its configuration.
    // No workspace given (acting as a colleague, a delegation): it stays the same one.
    if (request.tenant !== undefined) {
      this.session.setTenant(
        request.tenant
          ? { id: request.tenant.id, name: request.tenant.name, isAvailable: true }
          : null,
      );
    }
    window.location.assign(landOn);
  }

  /** Back to the account that started the switch, in its own workspace. */
  async returnToSelf(): Promise<void> {
    const acting = this.actingAs();
    await this.switchTo(
      {
        kind: 'ReturnToSelf',
        tenant: acting?.tenantId ? { id: acting.tenantId, name: acting.tenantName ?? '' } : null,
      },
      acting?.tenantId ? '/home' : '/admin/tenants',
    );
  }
}
