import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbpTenantService,
  AuthService,
  ConfigStateService,
  SessionStateService,
} from '@abp/ng.core';
import { firstValueFrom, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ProfileDto, ProfileService, UpdateProfileDto } from '../../proxy/account';
import { initials } from '../util/format';

const MOCK = environment.useMockData;
/** Mock mode has no auth server, so "signed in" is this local flag. Absent = signed out. */
const MOCK_SIGNED_IN_KEY = 'ar.mock.signedIn';

/** The shape the whole app reads for "who is signed in". */
export interface CurrentUser {
  isAuthenticated: boolean;
  userName: string;
  name: string;
  surname: string;
  email: string;
  phoneNumber: string;
  roles: string[];
}

const SEED_USER: CurrentUser = {
  isAuthenticated: true,
  userName: 'rahul.kanade',
  name: 'Rahul',
  surname: 'Kanade',
  email: 'rahul.kanade@vertexautomation.in',
  phoneNumber: '+91 98200 11234',
  roles: ['admin'],
};

/** A mock user derived from what was typed into the login form. */
function mockIdentityFrom(login: string): CurrentUser {
  const raw = login.trim();
  if (!raw) return { ...SEED_USER };
  const local = raw.includes('@') ? raw.slice(0, raw.indexOf('@')) : raw;
  const parts = local.split(/[._-]+/).filter(Boolean);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return {
    ...SEED_USER,
    userName: raw.includes('@') ? local : raw,
    name: parts[0] ? cap(parts[0]) : local,
    surname: parts[1] ? cap(parts[1]) : '',
    email: raw.includes('@') ? raw : SEED_USER.email,
  };
}

/**
 * The signed-in user: identity for the shell (name, role, avatar), sign-out, and
 * profile read/update against ABP's Account module. In mock mode a seeded user
 * stands in and edits update the local copy so the screen is reviewable without an
 * auth server. Login itself is handled by ABP's route guard + OAuth flow.
 */
@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  private readonly auth = inject(AuthService);
  private readonly config = inject(ConfigStateService);
  private readonly api = inject(ProfileService);
  private readonly router = inject(Router);
  private readonly tenants = inject(AbpTenantService);
  private readonly session = inject(SessionStateService);

  /** Multi-tenancy is on outside mock mode — the login form offers a workspace field. */
  readonly tenancyEnabled = !MOCK;

  /** The workspace the sign-in form last resolved (for the shell to show). */
  readonly currentTenantName = signal<string>(this.session.getTenant()?.name ?? '');

  /** Mock-mode only: whether the local sign-in flag is set, and who as. */
  private readonly mockSignedIn = signal(this.readMockState() !== null);
  private readonly mockUser = signal<CurrentUser>(
    this.readMockState() ? mockIdentityFrom(this.readMockState()!) : { ...SEED_USER },
  );

  private readMockState(): string | null {
    try {
      return localStorage.getItem(MOCK_SIGNED_IN_KEY);
    } catch {
      return null;
    }
  }

  private readonly configUser = toSignal(
    MOCK ? of(undefined) : this.config.getOne$('currentUser'),
    { initialValue: undefined },
  );

  readonly user = computed<CurrentUser>(() => {
    if (MOCK) return this.mockUser();
    const u = (this.configUser() ?? {}) as Record<string, unknown>;
    return {
      isAuthenticated: Boolean(u['isAuthenticated']),
      userName: (u['userName'] as string) ?? '',
      name: (u['name'] as string) ?? '',
      surname: ((u['surname'] ?? u['surName']) as string) ?? '',
      email: (u['email'] as string) ?? '',
      phoneNumber: (u['phoneNumber'] as string) ?? '',
      roles: ((u['roles'] as string[]) ?? []).slice(),
    };
  });

  readonly isAuthenticated = computed(() =>
    MOCK ? this.mockSignedIn() : this.user().isAuthenticated,
  );

  readonly fullName = computed(() => {
    const u = this.user();
    return [u.name, u.surname].filter(Boolean).join(' ').trim() || u.userName || 'Signed in';
  });

  readonly initials = computed(() => initials(this.fullName()));

  readonly primaryRole = computed(() => {
    const role = this.user().roles[0];
    return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Member';
  });

  /**
   * Resolves a workspace (tenant) name to an id and pins it on the session, so the
   * token request and every later API call carry the `__tenant` header. A blank
   * name clears it (host login). Throws if the name does not match a live tenant.
   * No-ops in mock mode.
   */
  async selectTenant(name: string): Promise<void> {
    if (MOCK) return;
    const wanted = name.trim();
    if (!wanted) {
      this.session.setTenant(null);
      this.currentTenantName.set('');
      return;
    }
    const result = await firstValueFrom(this.tenants.findTenantByName(wanted));
    if (!result?.success || !result.tenantId) {
      throw new Error(`Workspace "${wanted}" was not found.`);
    }
    if (!result.isActive) {
      throw new Error(`Workspace "${wanted}" is not active.`);
    }
    this.session.setTenant({ id: result.tenantId, name: result.name ?? wanted, isAvailable: true });
    this.currentTenantName.set(result.name ?? wanted);
  }

  /**
   * Signs in with a username and password, optionally scoped to a workspace. In
   * mock mode there is no auth server, so any non-empty credentials are accepted
   * and the local session flag is flipped. In real mode this resolves the tenant
   * then runs ABP's password grant against the OpenIddict token endpoint.
   */
  async signIn(
    username: string,
    password: string,
    rememberMe: boolean,
    tenant = '',
  ): Promise<void> {
    if (MOCK) {
      this.mockUser.set(mockIdentityFrom(username));
      try {
        localStorage.setItem(MOCK_SIGNED_IN_KEY, username.trim() || 'demo');
      } catch {
        /* ignore */
      }
      this.mockSignedIn.set(true);
      await this.router.navigateByUrl('/home');
      return;
    }
    await this.selectTenant(tenant);
    await firstValueFrom(this.auth.login({ username, password, rememberMe, redirectUrl: '/home' }));
  }

  /** Fallback for identity providers that only support the redirect (code) flow. */
  redirectToProvider(): void {
    if (!MOCK) this.auth.navigateToLogin();
  }

  logout(): void {
    if (MOCK) {
      try {
        localStorage.removeItem(MOCK_SIGNED_IN_KEY);
        localStorage.removeItem('ar.agency.acting');
      } catch {
        /* ignore */
      }
      this.mockSignedIn.set(false);
      this.mockUser.set({ ...SEED_USER });
      void this.router.navigateByUrl('/login');
      return;
    }
    this.auth.logout().subscribe({
      complete: () => {
        this.session.setTenant(null);
        this.currentTenantName.set('');
        try {
          localStorage.removeItem('ar.agency.acting');
        } catch {
          /* ignore */
        }
      },
    });
  }

  // ---- profile ------------------------------------------------------

  async loadProfile(): Promise<ProfileDto> {
    if (MOCK) {
      const u = this.user();
      return {
        userName: u.userName,
        email: u.email,
        name: u.name,
        surname: u.surname,
        phoneNumber: u.phoneNumber,
        hasPassword: true,
        isExternal: false,
      };
    }
    return firstValueFrom(this.api.get());
  }

  async saveProfile(input: UpdateProfileDto): Promise<void> {
    if (MOCK) {
      this.mockUser.update((u) => ({
        ...u,
        userName: input.userName,
        email: input.email,
        name: input.name ?? '',
        surname: input.surname ?? '',
        phoneNumber: input.phoneNumber ?? '',
      }));
      return;
    }
    await firstValueFrom(this.api.update(input));
    await firstValueFrom(this.config.refreshAppState());
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (MOCK) return;
    await firstValueFrom(
      this.api.changePassword({ currentPassword: currentPassword || null, newPassword }),
    );
  }
}
