import { Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export interface VoiceAgentTestDto {
  id: string;
  channelId: string;
  versionId: string;
  agentName: string;
  startedByUserId: string;
  startedAtUtc: string;
  endedAtUtc?: string | null;
  passed?: boolean | null;
  note?: string | null;
  turns: { itemId: string; speaker: 'caller' | 'agent'; text: string; receivedAtUtc: string }[];
}

/** Browser test calls with a channel's voice agent. Nothing the agent does in a test is written. */
@Injectable({ providedIn: 'root' })
export class VoiceAgentTestService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  start = (
    channelId: string,
    input: { sdpOffer: string; versionId?: string | null },
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, { sessionId: string; sdpAnswer: string }>(
      {
        method: 'POST',
        url: `/api/auto-reach/voice-agent-test/start/${channelId}`,
        body: input,
      },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, VoiceAgentTestDto>(
      { method: 'GET', url: `/api/auto-reach/voice-agent-test/${id}` },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  end = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, VoiceAgentTestDto>(
      { method: 'POST', url: `/api/auto-reach/voice-agent-test/${id}/end` },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  rate = (
    id: string,
    input: { passed?: boolean | null; note?: string | null },
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, VoiceAgentTestDto>(
      { method: 'POST', url: `/api/auto-reach/voice-agent-test/${id}/rate`, body: input },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  getList = (channelId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, VoiceAgentTestDto[]>(
      { method: 'GET', url: '/api/auto-reach/voice-agent-test', params: { channelId } },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );
}
