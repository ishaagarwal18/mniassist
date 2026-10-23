import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PermissionService } from '@abp/ng.core';

import { AgencyService, AgencySessionDto } from '../../proxy/agencies';
import { checkPolicy } from '../auth/permission';

const STORAGE_KEY = 'ar.agency.acting';

/**
 * Holds the current "acting as a client" session (M01-8). The
 * {@link AgencyActingInterceptor} reads {@link clientTenantId} to stamp the
 * X-AutoReach-Client-Tenant header on every API call while a session is open, so
 * the whole app renders the client's data. Persisted to localStorage so a refresh
 * keeps the session; the server is the authority and expires it after 8 hours.
 */
@Injectable({ providedIn: 'root' })
export class AgencyActingStore {
  private readonly api = inject(AgencyService);
  private readonly permissions = inject(PermissionService);

  private readonly _session = signal<AgencySessionDto | null>(this.load());
  readonly session = this._session.asReadonly();
  readonly isActing = computed(() => this._session() !== null);
  readonly clientTenantId = computed(() => this._session()?.clientTenantId ?? null);

  private load(): AgencySessionDto | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as AgencySessionDto;
      return new Date(s.expiresAtUtc).getTime() > Date.now() ? s : null;
    } catch {
      return null;
    }
  }

  private persist(session: AgencySessionDto | null): void {
    this._session.set(session);
    try {
      if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* private window / storage disabled — the session still works for this tab */
    }
  }

  /** Confirms with the server what the open session is (called on app start). */
  async refresh(): Promise<void> {
    if (!checkPolicy('AutoReach.Agency', this.permissions)) {
      this.persist(null);
      return;
    }
    try {
      const server = await firstValueFrom(this.api.getMyActingSession());
      this.persist(server ?? null);
    } catch {
      /* leave whatever we had; the interceptor's calls will 401/expire naturally */
    }
  }

  async enter(linkId: string): Promise<void> {
    const session = await firstValueFrom(this.api.enterClient(linkId));
    this.persist(session);
  }

  async leave(): Promise<void> {
    const current = this._session();
    this.persist(null);
    if (current) {
      try {
        await firstValueFrom(this.api.endActingSession(current.id));
      } catch {
        /* the server also expires it; clearing locally is what matters */
      }
    }
  }
}
