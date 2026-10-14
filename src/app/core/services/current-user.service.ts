import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbpTenantService,
  AuthService,
  ConfigStateService,
  PIPE_TO_LOGIN_FN_KEY,
  SessionStateService,
  TENANT_KEY,
} from '@abp/ng.core';
import { OAuthService } from 'angular-oauth2-oidc';
import { catchError, firstValueFrom, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ProfileDto, ProfileService, UpdateProfileDto } from '../../proxy/account';
import { SessionService } from '../../proxy/identity/session.service';
import { initials } from '../util/format';
import {
  SecondFactor,
  TwoFactorRequiredError,
  isTwoFactorChallenge,
  secondFactorParameters,
} from '../auth/two-factor';
import { passwordChangeParameters, signInChallenge } from '../auth/sign-in-challenge';
import { EXTERNAL_LOGIN_GRANT } from '../auth/external-login';
import { isHostAdministrator, isHostContext } from '../auth/host-access';

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
  private readonly sessions = inject(SessionService);
  private readonly router = inject(Router);
  private readonly tenants = inject(AbpTenantService);
  private readonly session = inject(SessionStateService);
  private readonly injector = inject(Injector);

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

  /** The signed-in user's id; null in the standalone build and before sign-in. */
  readonly id = computed<string | null>(() =>
    MOCK
      ? null
      : ((((this.configUser() ?? {}) as Record<string, unknown>)['id'] as string) ?? null),
  );

  private readonly configTenant = toSignal(
    MOCK ? of(undefined) : this.config.getOne$('currentTenant'),
    { initialValue: undefined },
  );

  /** Invalidates menu checks when grants change without an identity or plan change. */
  readonly permissionState = toSignal(MOCK ? of(undefined) : this.config.getOne$('auth'), {
    initialValue: undefined,
  });

  /**
   * The workspace the signed-in user belongs to, from the server's view of the
   * session; empty for a host (platform) user, who belongs to none. Mock mode
   * shows the seeded workspace.
   */
  readonly tenantName = computed(() => {
    if (MOCK) return 'Vertex Automation';
    const t = (this.configTenant() ?? {}) as { isAvailable?: boolean; name?: string };
    return t.isAvailable ? (t.name ?? this.currentTenantName()) : '';
  });

  /** Signed in on the host side (platform administration), not in a workspace. */
  readonly isHost = computed(
    () =>
      !MOCK &&
      isHostContext({
        currentUser: this.configUser(),
        currentTenant: this.configTenant(),
      }),
  );

  /** Full platform access belongs only to the host's built-in admin role. */
  readonly isHostAdmin = computed(
    () =>
      !MOCK &&
      isHostAdministrator({
        currentUser: this.configUser(),
        currentTenant: this.configTenant(),
      }),
  );

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
    if (result.isActive === false) {
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
    try {
      await firstValueFrom(
        this.auth.login({ username, password, rememberMe, redirectUrl: '/home' }),
      );
    } catch (e) {
      if (isTwoFactorChallenge(e)) throw new TwoFactorRequiredError();
      throw signInChallenge(e) ?? e;
    }
  }

  /**
   * The second half of a two-factor sign-in: the same password grant again, with the
   * authenticator code or a recovery code. Runs ABP's own after-login steps (app
   * configuration, remember-me, redirect) exactly as `signIn` does. The workspace was
   * already chosen by the first attempt.
   */
  async completeTwoFactorSignIn(
    username: string,
    password: string,
    rememberMe: boolean,
    proof: SecondFactor,
  ): Promise<void> {
    await this.completeSignIn(username, password, rememberMe, secondFactorParameters(proof));
  }

  /**
   * The second half of a sign-in that needed a new password first: the same grant again
   * with the server's one-time token and the new password. ABP changes the password and
   * signs in in one step.
   */
  async completeSignInWithNewPassword(
    username: string,
    password: string,
    rememberMe: boolean,
    changePasswordToken: string,
    newPassword: string,
  ): Promise<void> {
    await this.completeSignIn(
      username,
      password,
      rememberMe,
      passwordChangeParameters(changePasswordToken, newPassword),
    );
  }

  /** Repeats the password grant with extra parameters, then ABP's usual after-login steps. */
  private async completeSignIn(
    username: string,
    password: string,
    rememberMe: boolean,
    extra: Record<string, string>,
  ): Promise<void> {
    if (MOCK) {
      await this.signIn(username, password, rememberMe);
      return;
    }
    const tenant = this.session.getTenant();
    const headers = new HttpHeaders(
      tenant?.id ? { [this.injector.get(TENANT_KEY)]: tenant.id } : {},
    );
    await this.injector
      .get(OAuthService)
      .fetchTokenUsingGrant('password', { username, password, ...extra }, headers);
    const afterLogin = this.injector.get(PIPE_TO_LOGIN_FN_KEY);
    await firstValueFrom(
      of(null).pipe(afterLogin({ rememberMe, redirectUrl: '/home' }, this.injector)),
    );
  }

  /**
   * Signs in with a Google or Microsoft ID token (M01-7) through the auth server's
   * `external_login` grant, in the workspace typed on the sign-in screen. An account with
   * two-step verification still needs its code: the first try throws
   * `TwoFactorRequiredError` and the screen repeats this with the proof.
   */
  async signInExternal(
    provider: string,
    idToken: string,
    nonce: string,
    rememberMe: boolean,
    workspace: string,
    proof?: SecondFactor,
  ): Promise<void> {
    if (MOCK) throw new Error('Signing in with Google or Microsoft needs the API.');
    await this.selectTenant(workspace);
    const tenant = this.session.getTenant();
    const headers = new HttpHeaders(
      tenant?.id ? { [this.injector.get(TENANT_KEY)]: tenant.id } : {},
    );
    try {
      await this.injector
        .get(OAuthService)
        .fetchTokenUsingGrant(
          EXTERNAL_LOGIN_GRANT,
          { provider, id_token: idToken, nonce, ...(proof ? secondFactorParameters(proof) : {}) },
          headers,
        );
    } catch (e) {
      if (isTwoFactorChallenge(e)) throw new TwoFactorRequiredError();
      throw e;
    }
    const afterLogin = this.injector.get(PIPE_TO_LOGIN_FN_KEY);
    await firstValueFrom(
      of(null).pipe(afterLogin({ rememberMe, redirectUrl: '/home' }, this.injector)),
    );
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
    // End this device's session on the server first, so it leaves the device list and
    // its tokens stop working even if a copy of them survives. Best effort: a failure
    // here must never keep someone signed in.
    this.sessions
      .endCurrent({ skipHandleError: true })
      .pipe(catchError(() => of(undefined)))
      .subscribe(() => this.finishLogout());
  }

  private finishLogout(): void {
    this.auth.logout().subscribe({
      complete: () => {
        this.session.setTenant(null);
        this.currentTenantName.set('');
        try {
          localStorage.removeItem('ar.agency.acting');
        } catch {
          /* ignore */
        }
        // ABP's password flow ends sign-out on `/`, which is now the public front
        // page. Finish on the sign-in screen instead, the same as mock mode.
        void this.router.navigateByUrl('/login');
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
