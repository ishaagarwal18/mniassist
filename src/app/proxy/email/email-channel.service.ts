import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

import type { EmailOAuthProvider } from './email-oauth.service';

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
  /** Whether email carries a tracking pixel, so opens show on messages. */
  trackOpens: boolean;
  /** Set when tracking is on but the platform cannot build tracking links, so no pixel is added. */
  trackingProblem?: string | null;
  hasImap: boolean;
  imapHost?: string | null;
  imapPort?: number | null;
  imapImplicitTls: boolean;
  imapUsername?: string | null;
  imapHasPassword: boolean;
  imapFolder?: string | null;
  /** Which provider the mailbox was signed into through, or None for a plain IMAP password (or no mailbox at all). */
  imapOAuthProvider: EmailOAuthProvider;
  /** Whether this deployment can offer "Connect Gmail" / "Connect Microsoft 365" — false hides the button rather than let it fail after it's clicked. */
  googleOAuthAvailable: boolean;
  microsoftOAuthAvailable: boolean;
  /** Whether replies are being read from the mailbox. */
  syncEnabled: boolean;
  lastSyncedAtUtc?: string | null;
  /** Why the last attempt failed, when it did. Sync stops by itself after a run of failures. */
  lastSyncError?: string | null;
}

export interface UpdateEmailImapInput {
  host: string;
  port: number;
  implicitTls: boolean;
  username: string;
  /** Send only to set or change it; null keeps the stored password. */
  password?: string | null;
  /** Blank means INBOX. */
  folder?: string | null;
}

/** What one pass of reading the mailbox did. */
export interface EmailSyncResultDto {
  succeeded: boolean;
  error?: string | null;
  imported: number;
  skipped: number;
  bounces: number;
  moreWaiting: boolean;
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

  setOpenTracking = (enabled: boolean, config?: Partial<Rest.Config>) =>
    this.restService.request<{ enabled: boolean }, EmailChannelDto>(
      { method: 'POST', url: '/api/auto-reach/email-channel/set-open-tracking', body: { enabled } },
      { apiName: this.apiName, ...config },
    );

  useImapSync = (input: UpdateEmailImapInput, config?: Partial<Rest.Config>) =>
    this.restService.request<UpdateEmailImapInput, EmailChannelDto>(
      { method: 'POST', url: '/api/auto-reach/email-channel/use-imap-sync', body: input },
      { apiName: this.apiName, ...config },
    );

  pauseSync = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, EmailChannelDto>(
      { method: 'POST', url: '/api/auto-reach/email-channel/pause-sync' },
      { apiName: this.apiName, ...config },
    );

  resumeSync = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, EmailChannelDto>(
      { method: 'POST', url: '/api/auto-reach/email-channel/resume-sync' },
      { apiName: this.apiName, ...config },
    );

  removeImap = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, EmailChannelDto>(
      { method: 'DELETE', url: '/api/auto-reach/email-channel/imap' },
      { apiName: this.apiName, ...config },
    );

  syncNow = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, EmailSyncResultDto>(
      { method: 'POST', url: '/api/auto-reach/email-channel/sync-now' },
      { apiName: this.apiName, ...config },
    );

  sendTestEmail = (toAddress: string, config?: Partial<Rest.Config>) =>
    this.restService.request<{ toAddress: string }, void>(
      { method: 'POST', url: '/api/auto-reach/email-channel/send-test-email', body: { toAddress } },
      { apiName: this.apiName, ...config },
    );
}
