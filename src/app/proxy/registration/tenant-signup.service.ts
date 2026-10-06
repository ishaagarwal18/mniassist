import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export interface TenantSignupDto {
  workspaceName: string;
  adminEmailAddress: string;
  adminPassword: string;
  adminDisplayName?: string;
  /** The human-verification token, when the signup page shows a captcha. */
  captchaToken?: string | null;
}

export interface TenantSignupResultDto {
  tenantId: string;
  tenantName: string;
}

/** The anonymous "create a workspace" endpoint. */
@Injectable({ providedIn: 'root' })
export class TenantSignupService {
  private readonly rest = inject(RestService);

  register = (input: TenantSignupDto, config?: Partial<Rest.Config>) =>
    this.rest.request<TenantSignupDto, TenantSignupResultDto>(
      { method: 'POST', url: '/api/auto-reach/tenant-signup/register', body: input },
      { apiName: 'default', skipHandleError: true, ...config },
    );
}
