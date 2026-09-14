import type {
  PublicTenantBrandingDto,
  TenantBrandingDto,
  UpdateTenantBrandingInput,
  UploadLogoInput,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class BrandingService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  get = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, TenantBrandingDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/branding',
      },
      { apiName: this.apiName, ...config },
    );

  updateColors = (input: UpdateTenantBrandingInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, TenantBrandingDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/branding/colors',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  uploadLogo = (input: UploadLogoInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, TenantBrandingDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/branding/upload-logo',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  /** The one anonymous read — for the login/signup screens, before anyone has
   *  signed in. `tenantId` is resolved client-side from the typed workspace name
   *  via ABP's own tenant-by-name lookup, the same one sign-in itself uses. */
  publicByTenantId = (tenantId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PublicTenantBrandingDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/branding/public/${tenantId}`,
      },
      { apiName: this.apiName, ...config },
    );

  removeLogo = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, TenantBrandingDto>(
      {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/branding/logo',
      },
      { apiName: this.apiName, ...config },
    );
}
