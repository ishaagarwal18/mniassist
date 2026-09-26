import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export interface SmsChannelDto {
  id: string;
  senderId: string;
  state: number;
  restrictionReason?: string | null;
  /** The virtual number customers' SMS replies arrive on; null when none is set. */
  inboundNumber?: string | null;
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
  flowId: string;
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

/** The workspace's MSG91 SMS channel. Routes follow ABP's conventional-controller naming for SmsChannelAppService. */
@Injectable({ providedIn: 'root' })
export class SmsChannelService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getOrCreate = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, SmsChannelDto>({ method: 'GET', url: '/api/auto-reach/sms-channel/or-create' }, { apiName: this.apiName, ...config });

  setInboundNumber = (input: SetSmsInboundNumberInput, config?: Partial<Rest.Config>) =>
    this.restService.request<SetSmsInboundNumberInput, SmsChannelDto>(
      { method: 'POST', url: '/api/auto-reach/sms-channel/set-inbound-number', body: input },
      { apiName: this.apiName, ...config },
    );

  getTemplates = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, SmsTemplateDto[]>({ method: 'GET', url: '/api/auto-reach/sms-channel/templates' }, { apiName: this.apiName, ...config });

  send = (input: SendSmsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<SendSmsInput, void>({ method: 'POST', url: '/api/auto-reach/sms-channel/send', body: input }, { apiName: this.apiName, ...config });
}
