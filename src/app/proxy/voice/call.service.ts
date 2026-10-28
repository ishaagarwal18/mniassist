import type { VoiceConversationSnapshotDto } from '../messaging/whats-app-call.service';
import type { PagedResultDto } from '@abp/ng.core';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

import type {
  CallLogDto,
  CallSetupDto,
  GetCallsInput,
  LogManualCallInput,
  ReportSoftphoneEventInput,
  ReportSoftphoneInboundInput,
  SetCallOutcomeInput,
  SoftphoneCredentialsDto,
  StartCallInput,
  StartSoftphoneCallInput,
} from './call.models';

/** The rep's side of calling. Routes follow ABP's conventional-controller naming for CallAppService. */
@Injectable({ providedIn: 'root' })
export class CallService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getSetup = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, CallSetupDto>(
      { method: 'GET', url: '/api/auto-reach/call/setup' },
      { apiName: this.apiName, ...config },
    );

  setMyNumber = (phoneNumber: string, config?: Partial<Rest.Config>) =>
    this.restService.request<{ phoneNumber: string }, CallSetupDto>(
      { method: 'POST', url: '/api/auto-reach/call/set-my-number', body: { phoneNumber } },
      { apiName: this.apiName, ...config },
    );

  start = (input: StartCallInput, config?: Partial<Rest.Config>) =>
    this.restService.request<StartCallInput, CallLogDto>(
      { method: 'POST', url: '/api/auto-reach/call/start', body: input },
      { apiName: this.apiName, ...config },
    );

  getSoftphoneCredentials = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, SoftphoneCredentialsDto>(
      { method: 'GET', url: '/api/auto-reach/call/softphone-credentials' },
      { apiName: this.apiName, ...config },
    );

  startSoftphoneCall = (input: StartSoftphoneCallInput, config?: Partial<Rest.Config>) =>
    this.restService.request<StartSoftphoneCallInput, CallLogDto>(
      { method: 'POST', url: '/api/auto-reach/call/start-softphone-call', body: input },
      { apiName: this.apiName, ...config },
    );

  reportSoftphoneInbound = (input: ReportSoftphoneInboundInput, config?: Partial<Rest.Config>) =>
    this.restService.request<ReportSoftphoneInboundInput, CallLogDto>(
      { method: 'POST', url: '/api/auto-reach/call/report-softphone-inbound', body: input },
      { apiName: this.apiName, ...config },
    );

  reportSoftphoneEvent = (
    id: string,
    input: ReportSoftphoneEventInput,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<ReportSoftphoneEventInput, CallLogDto>(
      { method: 'POST', url: `/api/auto-reach/call/${id}/report-softphone-event`, body: input },
      { apiName: this.apiName, ...config },
    );

  logManual = (input: LogManualCallInput, config?: Partial<Rest.Config>) =>
    this.restService.request<LogManualCallInput, CallLogDto>(
      { method: 'POST', url: '/api/auto-reach/call/log-manual', body: input },
      { apiName: this.apiName, ...config },
    );

  setOutcome = (id: string, input: SetCallOutcomeInput, config?: Partial<Rest.Config>) =>
    this.restService.request<SetCallOutcomeInput, CallLogDto>(
      { method: 'POST', url: `/api/auto-reach/call/${id}/set-outcome`, body: input },
      { apiName: this.apiName, ...config },
    );

  getList = (input: GetCallsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<CallLogDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/call',
        params: {
          contactId: input.contactId,
          enquiryId: input.enquiryId,
          repUserId: input.repUserId,
          mine: input.mine,
          status: input.status,
          needsOutcome: input.needsOutcome,
          fromUtc: input.fromUtc,
          toUtc: input.toUtc,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CallLogDto>(
      { method: 'GET', url: `/api/auto-reach/call/${id}` },
      { apiName: this.apiName, ...config },
    );

  /** An AI phone call's transcript, kept 180 days; null when there is none. */
  getAiConversation = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, VoiceConversationSnapshotDto | null>(
      { method: 'GET', url: `/api/auto-reach/call/${id}/ai-conversation` },
      { apiName: this.apiName, ...config },
    );
}
