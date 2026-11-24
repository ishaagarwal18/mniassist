import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export interface SmsChannelDto {
  id: string;
  senderId: string;
  state: number;
  restrictionReason?: string | null;
  /** The virtual number customers' SMS replies arrive on; null when none is set. */
  inboundNumber?: string | null;
  provider: SmsProvider;
  exotelAccountSid?: string | null;
  exotelSubdomain?: string | null;
  dltEntityId?: string | null;
  /** Whether an API credential is saved (never the credential itself). */
  hasCredential: boolean;
  /** What still blocks sending, or null when the account is ready. */
  setupProblem?: string | null;
}

/** Who carries the workspace's SMS. Stored values: MSG91 is 0 (accounts from before the choice). */
export enum SmsProvider {
  Msg91 = 0,
  Exotel = 1,
}

export interface SetSmsInboundNumberInput {
  inboundNumber?: string | null;
}

export enum SmsTemplateStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
}

export interface SmsTemplateDto {
  id: string;
  name: string;
  dltTemplateId: string;
  /** MSG91 only. */
  flowId?: string | null;
  /** DLT body, with a {#var#} placeholder for each variable in registration order. */
  content: string;
  category: number;
  status: SmsTemplateStatus;
  rejectionReason?: string | null;
  variableNames: string[];
}

export interface SendSmsInput {
  contactId: string;
  templateId: string;
  variables: Record<string, string>;
  isMarketing?: boolean | null;
}

export interface SetSmsSenderInput {
  /** The 6-character DLT header (sender ID). */
  senderId: string;
  /** MSG91: the auth key. Exotel: the API key. Blank keeps the stored credential. */
  authKey?: string | null;
  provider: SmsProvider;
  /** Exotel: the API token that goes with the API key. */
  apiToken?: string | null;
  exotelAccountSid?: string | null;
  exotelSubdomain?: string | null;
  dltEntityId?: string | null;
}

export enum SmsTemplateCategory {
  Transactional = 0,
  ServiceImplicit = 1,
  ServiceExplicit = 2,
  Promotional = 3,
}

export interface CreateSmsTemplateInput {
  name: string;
  dltTemplateId: string;
  flowId?: string | null;
  content: string;
  category: SmsTemplateCategory;
  variableNames: string[];
}

export interface MarkSmsTemplateRejectedInput {
  reason?: string | null;
}

/** The workspace's SMS channel (Exotel or MSG91). Routes follow ABP's conventional-controller naming for SmsChannelAppService. */
@Injectable({ providedIn: 'root' })
export class SmsChannelService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getOrCreate = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, SmsChannelDto>(
      { method: 'GET', url: '/api/auto-reach/sms-channel/or-create' },
      { apiName: this.apiName, ...config },
    );

  setInboundNumber = (input: SetSmsInboundNumberInput, config?: Partial<Rest.Config>) =>
    this.restService.request<SetSmsInboundNumberInput, SmsChannelDto>(
      { method: 'POST', url: '/api/auto-reach/sms-channel/set-inbound-number', body: input },
      { apiName: this.apiName, ...config },
    );

  setSender = (input: SetSmsSenderInput, config?: Partial<Rest.Config>) =>
    this.restService.request<SetSmsSenderInput, SmsChannelDto>(
      { method: 'POST', url: '/api/auto-reach/sms-channel/set-sender', body: input },
      { apiName: this.apiName, ...config },
    );

  createTemplate = (input: CreateSmsTemplateInput, config?: Partial<Rest.Config>) =>
    this.restService.request<CreateSmsTemplateInput, SmsTemplateDto>(
      { method: 'POST', url: '/api/auto-reach/sms-channel/template', body: input },
      { apiName: this.apiName, ...config },
    );

  markTemplateApproved = (templateId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SmsTemplateDto>(
      { method: 'POST', url: `/api/auto-reach/sms-channel/mark-template-approved/${templateId}` },
      { apiName: this.apiName, ...config },
    );

  markTemplateRejected = (
    templateId: string,
    input: MarkSmsTemplateRejectedInput,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<MarkSmsTemplateRejectedInput, SmsTemplateDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/sms-channel/mark-template-rejected/${templateId}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  getTemplates = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, SmsTemplateDto[]>(
      { method: 'GET', url: '/api/auto-reach/sms-channel/templates' },
      { apiName: this.apiName, ...config },
    );

  send = (input: SendSmsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<SendSmsInput, void>(
      { method: 'POST', url: '/api/auto-reach/sms-channel/send', body: input },
      { apiName: this.apiName, ...config },
    );
}
