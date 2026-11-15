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
import { RememberMeService } from '@abp/ng.oauth';
import {
  catchError,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  map,
  of,
  pairwise,
  timeout,
} from 'rxjs';
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
import { EXTERNAL_LOGIN_GRANT, SSO_LOGIN_GRANT } from '../auth/external-login';
import { isHostAdministrator, isHostContext } from '../auth/host-access';
import { ToastService } from '../ui/toast.service';
import { LanguageService } from '../i18n/language.service';
/** The page a session ended on, to return to after signing in again. */
const RETURN_URL_KEY = 'ar.returnUrl';

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

/**
 * The signed-in user: identity for the shell (name, role, avatar), sign-out, and
 * profile read/update against ABP's Account module. Login itself is handled by ABP's route guard + OAuth flow.
 */
@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  private readonly auth = inject(AuthService);
  private readonly toasts = inject(ToastService);
  private readonly i18n = inject(LanguageService);
  private readonly config = inject(ConfigStateService);
  private readonly api = inject(ProfileService);
  private readonly sessions = inject(SessionService);
  private readonly router = inject(Router);
  private readonly tenants = inject(AbpTenantService);
  private readonly session = inject(SessionStateService);
  private readonly injector = inject(Injector);

  /** Multi-tenancy is on — the login form offers a workspace field. */
  readonly tenancyEnabled = true;

  /** The workspace the sign-in form last resolved (for the shell to show). */
  readonly currentTenantName = signal<string>(this.session.getTenant()?.name ?? '');

  private readonly configUser = toSignal(this.config.getOne$('currentUser'), {
    initialValue: undefined,
  });

  readonly user = computed<CurrentUser>(() => {
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
  readonly id = computed<string | null>(
    () => (((this.configUser() ?? {}) as Record<string, unknown>)['id'] as string) ?? null,
  );

  private readonly configTenant = toSignal(this.config.getOne$('currentTenant'), {
    initialValue: undefined,
  });

  /** Invalidates menu checks when grants change without an identity or plan change. */
  readonly permissionState = toSignal(this.config.getOne$('auth'), {
    initialValue: undefined,
  });

  /**
   * The workspace the signed-in user belongs to, from the server's view of the
   * session; empty for a host (platform) user, who belongs to none.
   */
  readonly tenantName = computed(() => {
    const t = (this.configTenant() ?? {}) as { isAvailable?: boolean; name?: string };
    return t.isAvailable ? (t.name ?? this.currentTenantName()) : '';
  });

  /** Signed in on the host side (platform administration), not in a workspace. */
  readonly isHost = computed(() =>
    isHostContext({
      currentUser: this.configUser(),
      currentTenant: this.configTenant(),
    }),
  );

  /** Full platform access belongs only to the host's built-in admin role. */
  readonly isHostAdmin = computed(() =>
    isHostAdministrator({
      currentUser: this.configUser(),
      currentTenant: this.configTenant(),
    }),
  );

  readonly isAuthenticated = computed(() => this.user().isAuthenticated);

  constructor() {
    // ABP ends a sign-in by itself when the token expires and cannot be refreshed, or the
    // auth server refuses it: it clears the stored tokens and reloads the app state, but
    // leaves the page up. Treat that like any other ended session and go to sign-in.

    this.config
      .getOne$('currentUser')
      .pipe(
        map((u) => Boolean((u as { isAuthenticated?: boolean } | undefined)?.isAuthenticated)),
        distinctUntilChanged(),
        pairwise(),
        filter(([was, now]) => was && !now),
      )
      .subscribe(() => this.sessionEnded());
  }

  /**
   * This browser was signed in until just now: a 401 from the API then means the session
   * ended, even when the stored token was already cleared before the request went out.
   */
  wasSignedIn(): boolean {
    return this.isAuthenticated() || this.endingSession;
  }

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
   */
  async selectTenant(name: string): Promise<void> {
    const wanted = name.trim();
    if (!wanted) {
      this.session.setTenant(null);
      this.currentTenantName.set('');
      return;
    }
    const result = await this.resolveTenant(wanted);
    if (!result?.success || !result.tenantId) {
      throw new Error(`Workspace "${wanted}" was not found.`);
    }
    if (result.isActive === false) {
      throw new Error(`Workspace "${wanted}" is not active.`);
    }
    this.session.setTenant({ id: result.tenantId, name: result.name ?? wanted, isAvailable: true });
    this.currentTenantName.set(result.name ?? wanted);
  }

  private tenantLookup?: {
    name: string;
    expires: number;
    result: ReturnType<CurrentUserService['fetchTenant']>;
  };

  private fetchTenant(name: string) {
    return firstValueFrom(this.tenants.findTenantByName(name));
  }

  /** Share branding's lookup with sign-in, including an in-flight lookup. */
  resolveTenant(name: string) {
    const wanted = name.trim();
    if (this.tenantLookup?.name === wanted && this.tenantLookup.expires > Date.now())
      return this.tenantLookup.result;
    const result = this.fetchTenant(wanted)
      .then((value) => {
        // A workspace can be created immediately after a failed lookup. Never
        // let an earlier branding preview hide that newly created workspace.
        if (!value?.success && this.tenantLookup?.result === result) this.tenantLookup = undefined;
        return value;
      })
      .catch((error) => {
        if (this.tenantLookup?.result === result) this.tenantLookup = undefined;
        throw error;
      });
    this.tenantLookup = { name: wanted, expires: Date.now() + 30_000, result };
    return result;
  }

  /**
   * Signs in with a username and password, optionally scoped to a workspace. This resolves the tenant
   * then runs ABP's password grant against the OpenIddict token endpoint.
   */
  async signIn(
    username: string,
    password: string,
    rememberMe: boolean,
    tenant = '',
    /** Where to land instead of the usual place, e.g. Get started after creating a workspace. */
    landOn?: string,
  ): Promise<void> {
    this.endingSession = false;

    await this.selectTenant(tenant);
    try {
      await firstValueFrom(
        this.auth.login({
          username,
          password,
          rememberMe,
          redirectUrl: landOn ?? this.afterSignInUrl(),
        }),
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
    const tenant = this.session.getTenant();
    const headers = new HttpHeaders(
      tenant?.id ? { [this.injector.get(TENANT_KEY)]: tenant.id } : {},
    );
    await this.injector
      .get(OAuthService)
      .fetchTokenUsingGrant('password', { username, password, ...extra }, headers);
    const afterLogin = this.injector.get(PIPE_TO_LOGIN_FN_KEY);
    await firstValueFrom(
      of(null).pipe(afterLogin({ rememberMe, redirectUrl: this.afterSignInUrl() }, this.injector)),
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
    this.endingSession = false;

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
      of(null).pipe(afterLogin({ rememberMe, redirectUrl: this.afterSignInUrl() }, this.injector)),
    );
  }

  /**
   * Signs in with an ID token from the workspace's own identity provider (M01-7 SSO) through
   * the auth server's `sso_login` grant. The email tells the server whose IdP this is; the IdP
   * owns any second factor, so there is no code step. The first sign-in creates the user.
   */
  async signInSso(
    email: string,
    idToken: string,
    nonce: string,
    rememberMe: boolean,
    workspace: string,
  ): Promise<void> {
    this.endingSession = false;

    await this.selectTenant(workspace);
    const tenant = this.session.getTenant();
    const headers = new HttpHeaders(
      tenant?.id ? { [this.injector.get(TENANT_KEY)]: tenant.id } : {},
    );
    await this.injector
      .get(OAuthService)
      .fetchTokenUsingGrant(SSO_LOGIN_GRANT, { email, id_token: idToken, nonce }, headers);
    const afterLogin = this.injector.get(PIPE_TO_LOGIN_FN_KEY);
    await firstValueFrom(
      of(null).pipe(afterLogin({ rememberMe, redirectUrl: this.afterSignInUrl() }, this.injector)),
    );
  }

  /** Where to land after signing in: the page a session ended on, else home. Used once. */
  private afterSignInUrl(): string {
    let url: string | null = null;
    try {
      url = sessionStorage.getItem(RETURN_URL_KEY);
      sessionStorage.removeItem(RETURN_URL_KEY);
    } catch {
      /* storage blocked: go home */
    }
    // Only a path inside this app, never another site or the sign-in page itself.
    return url && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/login')
      ? url
      : '/home';
  }

  private endingSession = false;

  /**
   * The server no longer accepts this sign-in (it expired, or it was revoked from another
   * device or by an administrator). Clears it here too and goes to the sign-in screen, which
   * brings the person back to this page afterwards. Many requests can fail together; this
   * runs once.
   */
  sessionEnded(why: 'ended' | 'role-changed' = 'ended'): void {
    if (this.endingSession) return;
    this.endingSession = true;
    const here = this.router.url;
    try {
      if (here && !here.startsWith('/login')) sessionStorage.setItem(RETURN_URL_KEY, here);
    } catch {
      /* storage blocked: they land on home instead */
    }
    if (why === 'role-changed') {
      this.toasts.warning(
        this.i18n.t('Your role has been changed. Please sign in again.'),
        this.i18n.t('Signed out'),
      );
    } else {
      this.toasts.warning(
        this.i18n.t('Your session has ended. Sign in again to continue.'),
        this.i18n.t('Signed out'),
      );
    }
    // The session is already rejected. ABP's logout waits for token revocation
    // and a configuration fetch before redirecting; either can hang or fail here.
    // Clear local tokens without a remote logout redirect, and clear the cached
    // identity so the login screen cannot immediately bounce back to /home.
    this.clearLocalSession();
  }

  private clearLocalSession(): void {
    this.tenantLookup = undefined;
    this.injector.get(OAuthService).logOut(true);
    this.injector.get(RememberMeService).remove();
    this.session.setTenant(null);
    this.currentTenantName.set('');
    try {
      localStorage.removeItem('ar.agency.acting');
    } catch {
      /* storage blocked */
    }
    this.config.setState({
      ...this.config.getAll(),
      currentUser: {
        isAuthenticated: false,
        emailVerified: false,
        phoneNumberVerified: false,
        roles: [],
      },
      currentTenant: { isAvailable: false },
      auth: { grantedPolicies: {} },
    });
    void this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  logout(): void {
    // End this device's session on the server first, so it leaves the device list and
    // its tokens stop working even if a copy of them survives. Best effort: a failure
    // here must never keep someone signed in.
    if (this.endingSession) return;
    this.endingSession = true;
    this.sessions
      .endCurrent({ skipHandleError: true })
      .pipe(
        timeout(3000),
        catchError(() => of(undefined)),
      )
      .subscribe();
    this.finishLogout();
  }

  private finishLogout(done?: () => void): void {
    this.clearLocalSession();
    done?.();
  }

  // ---- profile ------------------------------------------------------

  async loadProfile(): Promise<ProfileDto> {
    return firstValueFrom(this.api.get());
  }

  async saveProfile(input: UpdateProfileDto): Promise<void> {
    await firstValueFrom(this.api.update(input));
    await firstValueFrom(this.config.refreshAppState());
  }

  /**
   * Changes the password, then signs out here as well: the server has just ended every session of
   * this user (all devices, this one included), so the person signs in again with the new password.
   * A refused change throws before anything is signed out.
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await firstValueFrom(
      this.api.changePassword({ currentPassword: currentPassword || null, newPassword }),
    );
    // Requests already in flight now come back 401; don't let them show "session ended" too.
    this.endingSession = true;
    this.toasts.success(
      this.i18n.t(
        'Password changed. You have been signed out on all your devices — sign in again with your new password.',
      ),
      this.i18n.t('Signed out'),
    );

    this.finishLogout(() => (this.endingSession = false));
  }
}
