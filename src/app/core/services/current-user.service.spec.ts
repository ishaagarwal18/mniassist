import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import {
  AbpTenantService,
  AuthService,
  ConfigStateService,
  SessionStateService,
} from '@abp/ng.core';
import { RememberMeService } from '@abp/ng.oauth';
import { OAuthService } from 'angular-oauth2-oidc';
import { BehaviorSubject, NEVER, map, of } from 'rxjs';
import { CurrentUserService } from './current-user.service';
import { ProfileService } from '../../proxy/account';
import { SessionService } from '../../proxy/identity/session.service';
import { LanguageService } from '../i18n/language.service';
import { ToastService } from '../ui/toast.service';

describe('expired session redirect', () => {
  const signedIn = {
    currentUser: { isAuthenticated: true, id: 'owner', userName: 'admin', roles: ['admin'] },
    currentTenant: { isAvailable: true, id: 'workspace', name: 'Workspace' },
    auth: { grantedPolicies: { 'AutoReach.Templates': true } },
  };
  let config: BehaviorSubject<typeof signedIn>;
  let navigate: ReturnType<typeof vi.fn>;
  let warning: ReturnType<typeof vi.fn>;
  let remoteLogout: ReturnType<typeof vi.fn>;
  let localLogout: ReturnType<typeof vi.fn>;
  let removeRememberMe: ReturnType<typeof vi.fn>;
  let setTenant: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    config = new BehaviorSubject(signedIn);
    navigate = vi.fn(() => Promise.resolve(true));
    warning = vi.fn();
    remoteLogout = vi.fn(() => NEVER);
    localLogout = vi.fn();
    removeRememberMe = vi.fn();
    setTenant = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { url: '/inbox?channel=one', navigateByUrl: navigate } },
        {
          provide: AuthService,
          useValue: { logout: remoteLogout, login: vi.fn(() => of(null)) },
        },
        { provide: OAuthService, useValue: { logOut: localLogout } },
        { provide: RememberMeService, useValue: { remove: removeRememberMe } },
        {
          provide: ConfigStateService,
          useValue: {
            getOne$: (key: keyof typeof signedIn) => config.pipe(map((value) => value[key])),
            getAll: () => config.value,
            setState: (value: typeof signedIn) => config.next(value),
          },
        },
        {
          provide: SessionStateService,
          useValue: { getTenant: () => ({ id: 'workspace', name: 'Workspace' }), setTenant },
        },
        { provide: AbpTenantService, useValue: {} },
        { provide: ProfileService, useValue: {} },
        { provide: SessionService, useValue: {} },
        { provide: ToastService, useValue: { warning } },
        { provide: LanguageService, useValue: { t: (text: string) => text } },
      ],
    });
  });

  it('redirects immediately without waiting for a stalled remote logout', () => {
    const account = TestBed.inject(CurrentUserService);
    expect(account.isAuthenticated()).toBe(true);
    account.sessionEnded();
    expect(remoteLogout).not.toHaveBeenCalled();
    expect(localLogout).toHaveBeenCalledWith(true);
    expect(removeRememberMe).toHaveBeenCalledOnce();
    expect(account.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith('/login', { replaceUrl: true });
    expect(sessionStorage.getItem('ar.returnUrl')).toBe('/inbox?channel=one');
  });

  it('clears workspace, permissions and agency context before showing login', () => {
    localStorage.setItem('ar.agency.acting', 'stale-session');
    const account = TestBed.inject(CurrentUserService);
    account.sessionEnded();
    expect(setTenant).toHaveBeenCalledWith(null);
    expect(account.currentTenantName()).toBe('');
    expect(config.value.currentUser.isAuthenticated).toBe(false);
    expect(config.value.auth.grantedPolicies).toEqual({});
    expect(config.value.currentTenant.isAvailable).toBe(false);
    expect(localStorage.getItem('ar.agency.acting')).toBeNull();
  });

  it('handles concurrent rejected requests with one warning and one redirect', () => {
    const account = TestBed.inject(CurrentUserService);
    account.sessionEnded();
    account.sessionEnded();
    expect(warning).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledOnce();
    expect(localLogout).toHaveBeenCalledOnce();
  });

  it('can end a later session after a new sign-in attempt', async () => {
    const account = TestBed.inject(CurrentUserService);
    account.sessionEnded();
    await account.signIn('admin', 'test-password', false);
    config.next(signedIn);
    account.sessionEnded();
    expect(warning).toHaveBeenCalledTimes(2);
    expect(account.isAuthenticated()).toBe(false);
  });
});
