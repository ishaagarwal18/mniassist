import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export interface ForgotPasswordInput {
  /** The workspace name as typed at sign-in; blank means the host. */
  workspace?: string | null;
  email: string;
}

export interface ForgotWorkspaceInput {
  email: string;
}

export interface ResetPasswordInput {
  tenantId?: string | null;
  userId: string;
  token: string;
  newPassword: string;
}

export interface ResetPasswordResultDto {
  succeeded: boolean;
  /** `invalid_token` or `password_rejected`; null on success. */
  error?: string | null;
  /** The password policy's own reasons — safe to show. */
  messages: string[];
}

/**
 * Signed-out account recovery. Not a conventional ABP proxy — the backend serves it
 * behind an explicit anonymous controller (AccountRecoveryController) so it can answer
 * 204 whether or not an address has an account. `skipHandleError` because the screens
 * word their own errors (a 429 must not become ABP's generic red toast).
 */
@Injectable({ providedIn: 'root' })
export class AccountRecoveryService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  forgotPassword = (input: ForgotPasswordInput, config?: Partial<Rest.Config>) =>
    this.restService.request<ForgotPasswordInput, void>(
      { method: 'POST', url: '/api/auto-reach/account-recovery/forgot-password', body: input },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  forgotWorkspace = (input: ForgotWorkspaceInput, config?: Partial<Rest.Config>) =>
    this.restService.request<ForgotWorkspaceInput, void>(
      { method: 'POST', url: '/api/auto-reach/account-recovery/forgot-workspace', body: input },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  resetPassword = (input: ResetPasswordInput, config?: Partial<Rest.Config>) =>
    this.restService.request<ResetPasswordInput, ResetPasswordResultDto>(
      { method: 'POST', url: '/api/auto-reach/account-recovery/reset-password', body: input },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );
}
