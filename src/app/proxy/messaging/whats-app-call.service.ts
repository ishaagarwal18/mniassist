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
  direction: 'Inbound' | 'Outbound';
  /** Inbound, only while ringing. */
  offerSdp?: string | null;
  /** Outbound, once the customer picks up. */
  answerSdp?: string | null;
  rangAtUtc: string;
  answeredAtUtc?: string | null;
  answeredByUserId?: string | null;
  endedAtUtc?: string | null;
  durationSeconds: number;
  hasRecording: boolean;
  transferCount: number;
  /** The call relay holds the customer's side. */
  viaRelay?: boolean;
  /** With the call relay, in the reply to answering, calling or rejoining: the relay's answer for this browser. */
  agentAnswerSdp?: string | null;
}

export interface IceServerDto {
  urls: string[];
  username?: string | null;
  credential?: string | null;
}

export interface WhatsAppCallSettingsDto {
  recordCalls: boolean;
  /** Read-only. */
  hasAnnouncement?: boolean;
  /** Read-only: STUN/TURN servers from the API's configuration. */
  iceServers?: IceServerDto[];
  /** Read-only: calls are held by the call relay, not the answering browser. */
  serverRelay?: boolean;
}

export interface CallAgentDto {
  userId: string;
  name: string;
}

export interface CallTransferDto {
  id: string;
  callId: string;
  fromUserId?: string | null;
  fromName?: string | null;
  toUserId: string;
  toName?: string | null;
  contactName?: string | null;
  contactWaId?: string | null;
  state: 'Offered' | 'Accepted' | 'Declined' | 'Cancelled' | 'Expired';
  offerSdp?: string | null;
  answerSdp?: string | null;
  /** On the relay: the colleague joins the relay; nothing passes between the browsers. */
  viaRelay?: boolean;
  /** With the call relay, in the reply to accepting: the relay's answer for this browser. */
  agentAnswerSdp?: string | null;
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

  /** Without the call relay: the browser's answer to the customer. With it: the browser's offer to the relay. */
  answer = (
    id: string,
    input: { sdpAnswer?: string | null; sdpOffer?: string | null },
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, WhatsAppCallDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/whats-app-call/${id}/answer`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  /** Calls the conversation's customer with the browser's SDP offer. Needs their call permission. */
  start = (conversationId: string, sdpOffer: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WhatsAppCallDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/whats-app-call/start/${conversationId}`,
        body: { sdpOffer },
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WhatsAppCallDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/whats-app-call/${id}`,
      },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  getSettings = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, WhatsAppCallSettingsDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/whats-app-call/settings',
      },
      { apiName: this.apiName, ...config },
    );

  updateSettings = (input: WhatsAppCallSettingsDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WhatsAppCallSettingsDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/whats-app-call/settings',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  /** FormData with CallId and File. */
  uploadRecording = (form: FormData, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WhatsAppCallDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/whats-app-call/upload-recording',
        body: form,
      },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  getRecording = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, Blob>(
      {
        method: 'GET',
        responseType: 'blob',
        url: `/api/auto-reach/whats-app-call/${id}/recording`,
      },
      { apiName: this.apiName, ...config },
    );

  /** FormData with File: the workspace's "this call is recorded" clip. */
  uploadAnnouncement = (form: FormData, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WhatsAppCallSettingsDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/whats-app-call/upload-announcement',
        body: form,
      },
      { apiName: this.apiName, ...config },
    );

  deleteAnnouncement = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, WhatsAppCallSettingsDto>(
      {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/whats-app-call/announcement',
      },
      { apiName: this.apiName, ...config },
    );

  getAnnouncement = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, Blob>(
      {
        method: 'GET',
        responseType: 'blob',
        url: '/api/auto-reach/whats-app-call/announcement',
      },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  getAgents = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, CallAgentDto[]>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/whats-app-call/agents',
      },
      { apiName: this.apiName, ...config },
    );

  transfer = (
    id: string,
    toUserId: string,
    sdpOffer: string | null,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, CallTransferDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/whats-app-call/${id}/transfer`,
        body: { toUserId, sdpOffer },
      },
      { apiName: this.apiName, ...config },
    );

  getIncomingTransfers = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, CallTransferDto[]>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/whats-app-call/incoming-transfers',
      },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  getTransfer = (transferId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CallTransferDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/whats-app-call/transfer/${transferId}`,
      },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  /** Without the call relay: my answer to the colleague's offer. With it: my browser's offer to the relay. */
  acceptTransfer = (
    transferId: string,
    input: { sdpAnswer?: string | null; sdpOffer?: string | null },
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, CallTransferDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/whats-app-call/accept-transfer/${transferId}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  declineTransfer = (transferId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CallTransferDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/whats-app-call/decline-transfer/${transferId}`,
      },
      { apiName: this.apiName, ...config },
    );

  cancelTransfer = (transferId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CallTransferDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/whats-app-call/cancel-transfer/${transferId}`,
      },
      { apiName: this.apiName, ...config },
    );

  /** With the call relay: my browser joins again a live call I'm on (after a reload or a dropped connection). */
  rejoin = (id: string, sdpOffer: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WhatsAppCallDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/whats-app-call/${id}/rejoin`,
        body: { sdpOffer },
      },
      { apiName: this.apiName, ...config },
    );

  /** With the call relay: the live call I'm on, if any. */
  getMyLiveCall = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, WhatsAppCallDto | null>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/whats-app-call/my-live-call',
      },
      { apiName: this.apiName, skipHandleError: true, ...config },
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
