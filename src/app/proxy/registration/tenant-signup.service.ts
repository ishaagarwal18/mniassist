import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export interface TenantSignupDto {
  workspaceName: string;
  adminEmailAddress: string;
  adminPassword: string;
  adminDisplayName?: string;
  /** The human-verification token, when the signup page shows a captcha. */
  captchaToken?: string | null;
  /** The owner's mobile (M01-1); verified first when the platform requires it. */
  mobileNumber?: string | null;
  mobileVerificationId?: string | null;
}

export interface SignupMobileCodeSentDto {
  verificationId: string;
  /** "+91 98•••••234" */
  sentTo: string;
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

  getMobileVerification = (config?: Partial<Rest.Config>) =>
    this.rest.request<void, { required: boolean }>(
      { method: 'GET', url: '/api/auto-reach/tenant-signup/mobile-verification' },
      { apiName: 'default', skipHandleError: true, ...config },
    );

  sendMobileCode = (mobileNumber: string, config?: Partial<Rest.Config>) =>
    this.rest.request<{ mobileNumber: string }, SignupMobileCodeSentDto>(
      { method: 'POST', url: '/api/auto-reach/tenant-signup/mobile-code', body: { mobileNumber } },
      { apiName: 'default', skipHandleError: true, ...config },
    );

  verifyMobileCode = (verificationId: string, code: string, config?: Partial<Rest.Config>) =>
    this.rest.request<{ verificationId: string; code: string }, void>(
      {
        method: 'POST',
        url: '/api/auto-reach/tenant-signup/mobile-code/verify',
        body: { verificationId, code },
      },
      { apiName: 'default', skipHandleError: true, ...config },
    );
}
