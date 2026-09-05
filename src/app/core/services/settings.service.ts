import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  SaveSsoConfigurationInput,
  SsoService,
  TenantSsoConfigurationDto,
} from '../../proxy/identity';

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

  private readonly ssoResource = rxResource({
    params: () => (environment.useMockData ? undefined : { tick: this.tick() }),
    stream: () => this.ssoApi.get(),
    defaultValue: SSO_SEED,
  });

  readonly ssoLoading = computed(() => !environment.useMockData && this.ssoResource.isLoading());
  readonly sso = computed<TenantSsoConfigurationDto>(() =>
    environment.useMockData ? SSO_SEED : this.ssoResource.value() ?? SSO_SEED);

  async saveSso(input: SaveSsoConfigurationInput): Promise<void> {
    if (environment.useMockData) {
      return;
    }
    await firstValueFrom(this.ssoApi.save(input));
    this.tick.update((n) => n + 1);
  }

  async disableSso(): Promise<void> {
    if (environment.useMockData) {
      return;
    }
    await firstValueFrom(this.ssoApi.disable());
    this.tick.update((n) => n + 1);
  }
}
