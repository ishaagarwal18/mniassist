import { PermissionService } from '@abp/ng.core';
import { grantedPolicy } from '../auth/permission';
import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { SaveSsoConfigurationInput, TenantSsoConfigurationDto } from '../../proxy/identity';
import { SsoService } from '../../proxy/controllers';
import { settled } from '../util/resource';

const SSO_SEED: TenantSsoConfigurationDto = {
  isConfigured: false,
  isEnabled: false,
  allowedEmailDomains: [],
  defaultRoleName: 'Agent',
  enforceSso: false,
};

@Injectable({ providedIn: 'root' })
export class SettingsStore {
  private readonly ssoApi = inject(SsoService);
  private readonly tick = signal(0);

  /** The SSO settings need Members.ManageSso; without it nothing is requested. */
  private readonly canManageSso = grantedPolicy(
    'AutoReach.Members.ManageSso',
    inject(PermissionService),
  );
  private readonly ssoResource = rxResource({
    params: () => (this.canManageSso() ? { tick: this.tick() } : undefined),
    stream: () => this.ssoApi.get(),
    defaultValue: SSO_SEED,
  });

  readonly ssoLoading = computed(() => this.ssoResource.isLoading());
  readonly sso = computed<TenantSsoConfigurationDto>(
    () => settled(this.ssoResource, SSO_SEED) ?? SSO_SEED,
  );

  async saveSso(input: SaveSsoConfigurationInput): Promise<void> {
    await firstValueFrom(this.ssoApi.save(input));
    this.tick.update((n) => n + 1);
  }

  async disableSso(): Promise<void> {
    await firstValueFrom(this.ssoApi.disable());
    this.tick.update((n) => n + 1);
  }
}
