import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { SessionService } from '../../proxy/identity/session.service';
import { settled } from '../util/resource';

export interface UserSession {
  readonly sessionId: string;
  readonly device: string;
  readonly deviceInfo?: string;
  readonly client?: string;
  readonly ip?: string;
  readonly signedInAt?: string;
  readonly lastActiveAt?: string;
  readonly isCurrent: boolean;
}

const SEED: readonly UserSession[] = [
  {
    sessionId: 'this',
    device: 'Chrome on Windows',
    deviceInfo: 'Windows 11 · Pune, IN',
    client: 'AutoReach_App',
    ip: '49.36.x.x',
    signedInAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    lastActiveAt: new Date().toISOString(),
    isCurrent: true,
  },
  {
    sessionId: 's-2',
    device: 'Safari on iPhone',
    deviceInfo: 'iOS 18 · Pune, IN',
    client: 'AutoReach_App',
    ip: '106.51.x.x',
    signedInAt: new Date(Date.now() - 5 * 86_400_000).toISOString(),
    lastActiveAt: new Date(Date.now() - 6 * 3_600_000).toISOString(),
    isCurrent: false,
  },
];

/**
 * The current user's signed-in devices (M01-5). Backed by ABP's IdentitySession
 * store via the ABP OpenIddict auth server; empty rather than erroring when no auth
 * server shares the database.
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly api = inject(SessionService);
  private readonly reloadTick = signal(0);

  private readonly resource = rxResource({
    params: () => (environment.useMockData ? undefined : { tick: this.reloadTick() }),
    stream: () =>
      this.api.getMySessions().pipe(
        map((r) =>
          (r.items ?? []).map((s): UserSession => ({
            sessionId: s.sessionId,
            device: s.device || 'Unknown device',
            deviceInfo: s.deviceInfo ?? undefined,
            client: s.clientId ?? undefined,
            ip: s.ipAddresses ?? undefined,
            signedInAt: s.signedInUtc ?? undefined,
            lastActiveAt: s.lastAccessedUtc ?? undefined,
            isCurrent: s.isCurrent ?? false,
          })),
        ),
      ),
    defaultValue: [] as UserSession[],
  });

  readonly loading = computed(() => !environment.useMockData && this.resource.isLoading());
  readonly sessions = computed<readonly UserSession[]>(() =>
    environment.useMockData ? SEED : settled(this.resource, [] as UserSession[]),
  );

  async revoke(sessionId: string): Promise<void> {
    if (!environment.useMockData) {
      await firstValueFrom(this.api.revokeMySession(sessionId));
      this.reloadTick.update((n) => n + 1);
    }
  }

  async revokeOthers(): Promise<void> {
    if (!environment.useMockData) {
      await firstValueFrom(this.api.revokeMyOtherSessions());
      this.reloadTick.update((n) => n + 1);
    }
  }
}
