import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService, ConfigStateService } from '@abp/ng.core';
import { firstValueFrom, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ProfileDto, ProfileService, UpdateProfileDto } from '../../proxy/account';
import { initials } from '../util/format';

const MOCK = environment.useMockData;

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

  private readonly configUser = toSignal(
    MOCK ? of(undefined) : this.config.getOne$('currentUser'),
    { initialValue: undefined },
  );

  readonly user = computed<CurrentUser>(() => {
    if (MOCK) return SEED_USER;
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

  readonly isAuthenticated = computed(() => (MOCK ? true : this.user().isAuthenticated));

  readonly fullName = computed(() => {
    const u = this.user();
    return [u.name, u.surname].filter(Boolean).join(' ').trim() || u.userName || 'Signed in';
  });

  readonly initials = computed(() => initials(this.fullName()));

  readonly primaryRole = computed(() => {
    const role = this.user().roles[0];
    return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Member';
  });

  login(): void {
    if (!MOCK) this.auth.navigateToLogin();
  }

  logout(): void {
    if (MOCK) {
      try {
        localStorage.clear();
      } catch {
        /* ignore */
      }
      window.location.assign('/');
      return;
    }
    void this.auth.logout();
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
      Object.assign(SEED_USER, {
        userName: input.userName,
        email: input.email,
        name: input.name ?? '',
        surname: input.surname ?? '',
        phoneNumber: input.phoneNumber ?? '',
      });
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
