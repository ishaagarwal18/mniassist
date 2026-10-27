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
  /** Native IVR: None, Menu (the caller is choosing) or Queued; AiHandoff when the AI agent asked for a person. */
  ivrStatus?: 'None' | 'Menu' | 'Queued' | 'AiHandoff';
  /** The key the caller pressed; null when the menu fell back to its first option. */
  ivrDigit?: string | null;
  /** The menu option the caller chose (e.g. "Hindi", or "Service › Spares" below the top menu) and the team it rings. */
  queueLabel?: string | null;
  /** What the caller looked up in the menu and what was found, so the agent doesn't ask again. */
  ivrLookup?: string | null;
  queueTeamId?: string | null;
  /** Why the AI agent asked for a person, and its summary of the call so far. */
  handoffReason?: string | null;
  handoffSummary?: string | null;
  /** When a person took the call from the AI. */
  handoffTakenAtUtc?: string | null;
}

export type WhatsAppIvrOptionKind = 'RingTeam' | 'SubMenu' | 'Lookup';

/** What a lookup option reads out to the caller. All but MyAccount ask them to key in a number first. */
export type WhatsAppIvrLookup =
  'ServiceTicket' | 'SalesOrder' | 'PurchaseOrder' | 'Product' | 'MyAccount' | 'FaultCode';

export interface WhatsAppIvrOptionDto {
  digit: string;
  label: string;
  /** The team it rings (after the answer, for a lookup). Unused for a sub-menu. */
  teamId: string;
  /** RingTeam when absent. */
  kind?: WhatsAppIvrOptionKind | null;
  lookup?: WhatsAppIvrLookup | null;
  /** Words spoken for a sub-menu's opening or a lookup's question, in place of the default. */
  say?: string | null;
  /** A sub-menu's own options. */
  options?: WhatsAppIvrOptionDto[];
  /** Read-only. */
  teamName?: string | null;
  teamMembers?: number;
}

export interface WhatsAppIvrSettingsDto {
  enabled: boolean;
  options: WhatsAppIvrOptionDto[];
  inputSeconds: number;
  attempts: number;
  hasPrompt: boolean;
  promptSeconds?: number | null;
  /** Read-only: the words the prompt was spoken from, one line per option; null for an uploaded recording. */
  spokenPrompt?: string | null;
  /** Read-only: this server can speak the menu from its options, so no recording is needed. */
  canSpeakPrompt: boolean;
  /** Read-only: callers get the menu now. */
  active: boolean;
  /** Read-only: what stops the menu answering calls. */
  problems: string[];
  queueMinutes: number;
  /** The greeting spoken before the top menu. */
  welcome?: string | null;
  /** Read-only: how deep the menu may go (the top menu counts as one). */
  maxLevels?: number;
  /** Read-only: the words each sub-menu and lookup question is spoken from, by path ("3", "32"). */
  stepPrompts?: Record<string, string>;
}

export type WhatsAppIvrOptionInput = Pick<
  WhatsAppIvrOptionDto,
  'digit' | 'label' | 'teamId' | 'kind' | 'lookup' | 'say'
> & { options?: WhatsAppIvrOptionInput[] };

export interface UpdateWhatsAppIvrInput {
  enabled: boolean;
  welcome?: string | null;
  options: WhatsAppIvrOptionInput[];
  inputSeconds: number;
  attempts: number;
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

/** A retained AI call transcript in a search result: preview text only. */
export interface VoiceConversationListItemDto {
  callId: string;
  contactId: string;
  contactName?: string | null;
  callStartedAtUtc: string;
  expiresAtUtc: string;
  ended: boolean;
  transcriptIncomplete: boolean;
  preview: string;
  sentiment?: string | null;
  goalAchieved?: boolean | null;
  summary?: string | null;
}

export interface VoiceConversationSnapshotDto {
  callId: string;
  persisted: boolean;
  expiresAtUtc?: string | null;
  ended: boolean;
  transcriptIncomplete: boolean;
  transcriptEnabled: boolean;
  truncated: boolean;
  inputTokens: number;
  outputTokens: number;
  completedResponses: number;
  turns: { itemId: string; speaker: 'caller' | 'agent'; text: string; receivedAtUtc: string }[];
  contactName?: string | null;
  summary?: string | null;
  sentiment?: string | null;
  goalAchieved?: boolean | null;
  goalReason?: string | null;
  analyzedAtUtc?: string | null;
  analysisError?: string | null;
  fields?: { key: string; label: string; type: string; value?: string | null }[];
  actions?: { name: string; status: string; say?: string | null; atUtc: string }[];
  annotations?: {
    itemId: string;
    good?: boolean | null;
    note?: string | null;
    userId: string;
    atUtc: string;
  }[];
  hasRecording?: boolean;
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

  /** Retained AI transcripts (180 days), searched by text; needs call-recording access. */
  getConversations = (
    input: { query?: string; skipCount?: number; maxResultCount?: number },
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, PagedResultDto<VoiceConversationListItemDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/whats-app-call/conversations',
        params: {
          query: input.query,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  updateConversationField = (
    id: string,
    input: { key: string; value?: string | null },
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, VoiceConversationSnapshotDto>(
      {
        method: 'PUT',
        url: `/api/auto-reach/whats-app-call/${id}/conversation-field`,
        body: input,
      },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  annotateConversation = (
    id: string,
    input: { itemId: string; good?: boolean | null; note?: string | null },
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, VoiceConversationSnapshotDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/whats-app-call/${id}/annotate-conversation`,
        body: input,
      },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  suggestPromptChanges = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, { suggestion?: string | null }>(
      { method: 'POST', url: `/api/auto-reach/whats-app-call/${id}/suggest-prompt-changes` },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  getConversationsCsv = (input: { query?: string }, config?: Partial<Rest.Config>) =>
    this.restService.request<any, Blob>(
      {
        method: 'GET',
        url: '/api/auto-reach/whats-app-call/conversations-csv',
        params: { query: input.query },
        responseType: 'blob',
      },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  /** The channel's published AI agent calls this conversation's customer. */
  startAi = (
    conversationId: string,
    input: { purpose?: string | null },
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, WhatsAppCallDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/whats-app-call/start-ai/${conversationId}`,
        body: input,
      },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  getConversation = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, VoiceConversationSnapshotDto | null>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/whats-app-call/${id}/conversation`,
      },
      { apiName: this.apiName, skipHandleError: true, ...config },
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

  /** Native WhatsApp IVR: the menu, its prompt, and whether it answers calls now (and if not, why). */
  /** Deletes a call from the log, with its recording (not one still in progress). Needs Inbox.CallRecordings. */
  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'DELETE',
        url: `/api/auto-reach/whats-app-call/${id}`,
      },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  getIvr = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, WhatsAppIvrSettingsDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/whats-app-call/ivr',
      },
      { apiName: this.apiName, ...config },
    );

  updateIvr = (input: UpdateWhatsAppIvrInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WhatsAppIvrSettingsDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/whats-app-call/ivr',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  /** FormData with File: a WAV or Ogg/Opus prompt under 30 seconds. */
  uploadIvrPrompt = (form: FormData, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WhatsAppIvrSettingsDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/whats-app-call/upload-ivr-prompt',
        body: form,
      },
      { apiName: this.apiName, ...config },
    );

  /** Speaks the prompt from the menu options (text to speech), replacing any recording. */
  speakIvrPrompt = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, WhatsAppIvrSettingsDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/whats-app-call/speak-ivr-prompt',
      },
      { apiName: this.apiName, ...config },
    );

  deleteIvrPrompt = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, WhatsAppIvrSettingsDto>(
      {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/whats-app-call/ivr-prompt',
      },
      { apiName: this.apiName, ...config },
    );

  /** The prompt as callers hear it (Ogg/Opus). */
  getIvrPrompt = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, Blob>(
      {
        method: 'GET',
        responseType: 'blob',
        url: '/api/auto-reach/whats-app-call/ivr-prompt',
      },
      { apiName: this.apiName, ...config },
    );
}
