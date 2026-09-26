import { PagedResultDto, Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export type WhatsAppCallStatus =
  'Ringing' | 'Answered' | 'Ended' | 'Missed' | 'Rejected' | 'Failed';

export interface WhatsAppCallDto {
  id: string;
  contactId: string;
  contactName?: string | null;
  contactWaId?: string | null;
  conversationId?: string | null;
  status: WhatsAppCallStatus;
  /** Only while ringing. */
  offerSdp?: string | null;
  rangAtUtc: string;
  answeredAtUtc?: string | null;
  answeredByUserId?: string | null;
  endedAtUtc?: string | null;
  durationSeconds: number;
}

export interface CallPermissionDto {
  state: 'Requested' | 'Granted' | 'Declined';
  canCall: boolean;
  requestedAtUtc: string;
  respondedAtUtc?: string | null;
  expiresAtUtc?: string | null;
  isPermanent: boolean;
}

export interface GetWhatsAppCallLogInput {
  contactId?: string | null;
  missedOnly?: boolean;
  skipCount?: number;
  maxResultCount?: number;
}

/** M3: WhatsApp Calling (Meta Cloud API). */
@Injectable({ providedIn: 'root' })
export class WhatsAppCallService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getRinging = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, WhatsAppCallDto[]>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/whats-app-call/ringing',
      },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  getLog = (input: GetWhatsAppCallLogInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<WhatsAppCallDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/whats-app-call/log',
        params: {
          contactId: input.contactId ?? undefined,
          missedOnly: input.missedOnly,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  answer = (id: string, sdpAnswer: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WhatsAppCallDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/whats-app-call/${id}/answer`,
        body: { sdpAnswer },
      },
      { apiName: this.apiName, ...config },
    );

  reject = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WhatsAppCallDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/whats-app-call/${id}/reject`,
      },
      { apiName: this.apiName, ...config },
    );

  hangUp = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WhatsAppCallDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/whats-app-call/${id}/hang-up`,
      },
      { apiName: this.apiName, ...config },
    );

  requestPermission = (conversationId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CallPermissionDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/whats-app-call/request-permission/${conversationId}`,
      },
      { apiName: this.apiName, ...config },
    );

  getPermission = (conversationId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CallPermissionDto | null>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/whats-app-call/permission/${conversationId}`,
      },
      { apiName: this.apiName, ...config },
    );
}
