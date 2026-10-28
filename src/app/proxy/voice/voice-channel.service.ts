import type {
  CreateIvrPromptInput,
  IvrIssueDto,
  IvrPromptDto,
  IvrSimulationStepDto,
  PlaceVoiceCallInput,
  SetIvrBranchInput,
  SetSoftphoneInput,
  SetVoiceAccountInput,
  SetVoiceFlowUrlInput,
  SimulateIvrInput,
  UpdateIvrPromptInput,
  VoiceCallDto,
  VoiceChannelDto,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class VoiceChannelService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getOrCreate = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, VoiceChannelDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/voice-channel/or-create',
      },
      { apiName: this.apiName, ...config },
    );

  setAccount = (input: SetVoiceAccountInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, VoiceChannelDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/voice-channel/set-account',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  setSoftphone = (input: SetSoftphoneInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, VoiceChannelDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/voice-channel/set-softphone',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  getPrompts = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, IvrPromptDto[]>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/voice-channel/prompts',
      },
      { apiName: this.apiName, ...config },
    );

  createPrompt = (input: CreateIvrPromptInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, IvrPromptDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/voice-channel/prompt',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  updatePrompt = (promptId: string, input: UpdateIvrPromptInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, IvrPromptDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/voice-channel/prompt/${promptId}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  setEntryPoint = (promptId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, IvrPromptDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/voice-channel/set-entry-point/${promptId}`,
      },
      { apiName: this.apiName, ...config },
    );

  deletePrompt = (promptId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'DELETE',
        url: `/api/auto-reach/voice-channel/prompt/${promptId}`,
      },
      { apiName: this.apiName, ...config },
    );

  setBranch = (promptId: string, input: SetIvrBranchInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, IvrPromptDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/voice-channel/set-branch/${promptId}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  removeBranch = (promptId: string, digit: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, IvrPromptDto>(
      {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/voice-channel/branch/${promptId}`,
        params: { digit },
      },
      { apiName: this.apiName, ...config },
    );

  placeCall = (input: PlaceVoiceCallInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, VoiceCallDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/voice-channel/place-call',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  setFlowUrl = (input: SetVoiceFlowUrlInput, config?: Partial<Rest.Config>) =>
    this.restService.request<SetVoiceFlowUrlInput, VoiceChannelDto>(
      {
        method: 'POST',
        url: '/api/auto-reach/voice-channel/set-flow-url',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  setAiFlowUrl = (input: SetVoiceFlowUrlInput, config?: Partial<Rest.Config>) =>
    this.restService.request<SetVoiceFlowUrlInput, VoiceChannelDto>(
      {
        method: 'POST',
        url: '/api/auto-reach/voice-channel/set-ai-flow-url',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  setInboundAiAgent = (input: { agentChannelId: string | null }, config?: Partial<Rest.Config>) =>
    this.restService.request<unknown, VoiceChannelDto>(
      {
        method: 'POST',
        url: '/api/auto-reach/voice-channel/set-inbound-ai-agent',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  getNumbers = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, VoiceLineNumberDto[]>(
      { method: 'GET', url: '/api/auto-reach/voice-channel/numbers' },
      { apiName: this.apiName, ...config },
    );

  addNumber = (input: { number: string; name?: string | null }, config?: Partial<Rest.Config>) =>
    this.restService.request<unknown, VoiceLineNumberDto>(
      { method: 'POST', url: '/api/auto-reach/voice-channel/number', body: input },
      { apiName: this.apiName, ...config },
    );

  updateNumber = (
    id: string,
    input: { name?: string | null; agentChannelId?: string | null },
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<unknown, VoiceLineNumberDto>(
      { method: 'PUT', url: `/api/auto-reach/voice-channel/${id}/number`, body: input },
      { apiName: this.apiName, ...config },
    );

  deleteNumber = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      { method: 'DELETE', url: `/api/auto-reach/voice-channel/${id}/number` },
      { apiName: this.apiName, ...config },
    );

  syncNumbers = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, VoiceLineNumberSyncDto>(
      { method: 'POST', url: '/api/auto-reach/voice-channel/sync-numbers' },
      { apiName: this.apiName, ...config },
    );

  getIvrIssues = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, IvrIssueDto[]>(
      {
        method: 'GET',
        url: '/api/auto-reach/voice-channel/ivr-issues',
      },
      { apiName: this.apiName, ...config },
    );

  simulateIvr = (input: SimulateIvrInput, config?: Partial<Rest.Config>) =>
    this.restService.request<SimulateIvrInput, IvrSimulationStepDto[]>(
      {
        method: 'POST',
        url: '/api/auto-reach/voice-channel/simulate-ivr',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}

/** One of the line's other numbers (beside its main one). */
export interface VoiceLineNumberDto {
  id: string;
  number: string;
  name?: string | null;
  /** The WhatsApp number whose agent answers incoming calls on it and calls out from it. */
  agentChannelId?: string | null;
  fromExotel: boolean;
}

export interface VoiceLineNumberSyncDto {
  added: number;
  notInExotel: string[];
  numbers: VoiceLineNumberDto[];
}
