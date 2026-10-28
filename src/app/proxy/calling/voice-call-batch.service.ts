import { PagedResultDto, Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export interface SaveVoiceCallBatchInput {
  name: string;
  channelId: string;
  purpose?: string | null;
  /** whatsapp (needs each contact's call permission) or phone (the workspace's Exotel line). */
  line?: 'whatsapp' | 'phone' | 'sip' | null;
  startsAtUtc?: string | null;
  windowStartMinute: number;
  windowEndMinute: number;
  maxConcurrent: number;
  maxAttempts: number;
  retryAfterMinutes: number;
}

export type VoiceCallBatchStatus = 'Draft' | 'Running' | 'Paused' | 'Completed' | 'Cancelled';
export type VoiceCallRecipientStatus =
  'Pending' | 'Calling' | 'Reached' | 'Unreached' | 'Skipped' | 'Failed' | 'Cancelled';

export interface VoiceCallBatchDto extends SaveVoiceCallBatchInput {
  id: string;
  status: VoiceCallBatchStatus;
  creationTime: string;
  completedAtUtc?: string | null;
  total: number;
  pending: number;
  calling: number;
  reached: number;
  unreached: number;
  skipped: number;
  failed: number;
  cancelled: number;
}

export interface VoiceCallRecipientImportDto {
  added: number;
  alreadyIn: number;
  problems: string[];
}

export interface VoiceCallRecipientDto {
  id: string;
  contactId: string;
  contactName?: string | null;
  phone?: string | null;
  status: VoiceCallRecipientStatus;
  attempts: number;
  nextAttemptAtUtc?: string | null;
  lastOutcome?: string | null;
  lastCallId?: string | null;
  updatedAtUtc: string;
  variables: Record<string, string>;
}

/** Batches of AI calls placed by a channel's published voice agent. */
@Injectable({ providedIn: 'root' })
export class VoiceCallBatchService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getList = (
    input: { skipCount?: number; maxResultCount?: number },
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, PagedResultDto<VoiceCallBatchDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/voice-call-batch',
        params: { skipCount: input.skipCount, maxResultCount: input.maxResultCount },
      },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, VoiceCallBatchDto>(
      { method: 'GET', url: `/api/auto-reach/voice-call-batch/${id}` },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  create = (input: SaveVoiceCallBatchInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, VoiceCallBatchDto>(
      { method: 'POST', url: '/api/auto-reach/voice-call-batch', body: input },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  update = (id: string, input: SaveVoiceCallBatchInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, VoiceCallBatchDto>(
      { method: 'PUT', url: `/api/auto-reach/voice-call-batch/${id}`, body: input },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  importRecipients = (id: string, csv: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, VoiceCallRecipientImportDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/voice-call-batch/${id}/import-recipients`,
        body: { csv },
      },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  getRecipients = (
    id: string,
    input: { status?: string | null; skipCount?: number; maxResultCount?: number },
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, PagedResultDto<VoiceCallRecipientDto>>(
      {
        method: 'GET',
        url: `/api/auto-reach/voice-call-batch/${id}/recipients`,
        params: {
          status: input.status ?? undefined,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  start = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, VoiceCallBatchDto>(
      { method: 'POST', url: `/api/auto-reach/voice-call-batch/${id}/start` },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  pause = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, VoiceCallBatchDto>(
      { method: 'POST', url: `/api/auto-reach/voice-call-batch/${id}/pause` },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  cancel = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, VoiceCallBatchDto>(
      { method: 'POST', url: `/api/auto-reach/voice-call-batch/${id}/cancel` },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );
}
