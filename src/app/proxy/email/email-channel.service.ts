import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export interface EmailChannelDto {
  id: string;
  fromName: string;
  fromAddress: string;
  replyToAddress?: string | null;
  /** False while the sender is still the placeholder — nothing can be sent yet. */
  isSenderConfigured: boolean;
  usesCustomSmtp: boolean;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpImplicitTls: boolean;
  smtpUsername?: string | null;
  /** Whether a password is stored. The password itself is never returned. */
  smtpHasPassword: boolean;
  /** Set when the platform cannot build unsubscribe links, so marketing email is refused. */
  unsubscribeProblem?: string | null;
}

export interface UpdateEmailSenderProfileInput {
  fromName: string;
  fromAddress: string;
  replyToAddress?: string | null;
}

export interface UpdateEmailSmtpInput {
  host: string;
  port: number;
  implicitTls: boolean;
  username?: string | null;
  /** Send only to set or change it; null keeps the stored password. */
  password?: string | null;
}

/** Routes follow ABP's conventional-controller naming for EmailChannelAppService. */
@Injectable({ providedIn: 'root' })
export class EmailChannelService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getOrCreate = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, EmailChannelDto>(
      { method: 'GET', url: '/api/auto-reach/email-channel/or-create' },
      { apiName: this.apiName, ...config },
    );

  updateSenderProfile = (input: UpdateEmailSenderProfileInput, config?: Partial<Rest.Config>) =>
    this.restService.request<UpdateEmailSenderProfileInput, EmailChannelDto>(
      { method: 'PUT', url: '/api/auto-reach/email-channel/sender-profile', body: input },
      { apiName: this.apiName, ...config },
    );

  useCustomSmtp = (input: UpdateEmailSmtpInput, config?: Partial<Rest.Config>) =>
    this.restService.request<UpdateEmailSmtpInput, EmailChannelDto>(
      { method: 'POST', url: '/api/auto-reach/email-channel/use-custom-smtp', body: input },
      { apiName: this.apiName, ...config },
    );

  useSharedRelay = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, EmailChannelDto>(
      { method: 'POST', url: '/api/auto-reach/email-channel/use-shared-relay' },
      { apiName: this.apiName, ...config },
    );

  sendTestEmail = (toAddress: string, config?: Partial<Rest.Config>) =>
    this.restService.request<{ toAddress: string }, void>(
      { method: 'POST', url: '/api/auto-reach/email-channel/send-test-email', body: { toAddress } },
      { apiName: this.apiName, ...config },
    );
}
