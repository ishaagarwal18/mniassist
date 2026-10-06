import type {
  AuthenticatorSetupDto,
  DisableTwoFactorInput,
  RecoveryCodesDto,
  TwoFactorStatusDto,
  VerifyTwoFactorCodeInput,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TwoFactorService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getStatus = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, TwoFactorStatusDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/two-factor/status',
      },
      { apiName: this.apiName, ...config },
    );

  startAuthenticatorSetup = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, AuthenticatorSetupDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/two-factor/start-authenticator-setup',
      },
      { apiName: this.apiName, ...config },
    );

  enableAuthenticator = (input: VerifyTwoFactorCodeInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RecoveryCodesDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/two-factor/enable-authenticator',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  disable = (input: DisableTwoFactorInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'POST',
        url: '/api/auto-reach/two-factor/disable',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  regenerateRecoveryCodes = (input: VerifyTwoFactorCodeInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RecoveryCodesDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/two-factor/regenerate-recovery-codes',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  resetForUser = (userId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'POST',
        url: `/api/auto-reach/two-factor/reset-for-user/${userId}`,
      },
      { apiName: this.apiName, ...config },
    );
}
