import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import type { ListResultDto } from '@abp/ng.core';

/** A provider the deployment has a client id for (M01-7). */
export interface ExternalLoginProviderDto {
  /** `Google` or `Microsoft`. */
  name: string;
  clientId: string;
  authorizeEndpoint: string;
}

export interface ExternalLoginLinkDto {
  provider: string;
  /** The email the provider gave when it was linked. */
  displayName?: string | null;
}

export interface LinkExternalLoginInput {
  provider: string;
  idToken: string;
  nonce: string;
}

/** "Sign in with Google / Microsoft": which buttons to show, and the signed-in person's links. */
@Injectable({ providedIn: 'root' })
export class ExternalLoginService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getProviders = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<ExternalLoginProviderDto>>(
      { method: 'GET', url: '/api/auto-reach/external-login/providers' },
      { apiName: this.apiName, ...config },
    );

  getMyLinks = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<ExternalLoginLinkDto>>(
      { method: 'GET', url: '/api/auto-reach/external-login/my-links' },
      { apiName: this.apiName, ...config },
    );

  link = (input: LinkExternalLoginInput, config?: Partial<Rest.Config>) =>
    this.restService.request<LinkExternalLoginInput, ExternalLoginLinkDto>(
      { method: 'POST', url: '/api/auto-reach/external-login/link', body: input },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  unlink = (provider: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      { method: 'POST', url: '/api/auto-reach/external-login/unlink', params: { provider } },
      { apiName: this.apiName, ...config },
    );
}
