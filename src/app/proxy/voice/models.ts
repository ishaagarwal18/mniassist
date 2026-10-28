import type { AuditedEntityDto, EntityDto } from '@abp/ng.core';
import type { ChannelState } from '../channels/channel-state.enum';
import type { VoiceNumberSeries } from './voice-number-series.enum';
import type { IvrBranchAction } from './ivr-branch-action.enum';
import type { VoiceCallDirection } from './voice-call-direction.enum';
import type { VoiceCallStatus } from './voice-call-status.enum';

export interface VoiceChannelDto extends AuditedEntityDto<string> {
  exoPhone: string;
  accountSid: string;
  subdomain: string;
  numberSeries?: VoiceNumberSeries;
  state?: ChannelState;
  restrictionReason?: string | null;
  passthruWebhookUrl?: string | null;
  /** The Exotel call-flow URL of the one-time skeleton flow; null until pasted in. */
  flowUrl?: string | null;
  /** The Exotel flow AI calls go into (Voicebot applet, then Hangup). */
  aiFlowUrl?: string | null;
  /** The WhatsApp number whose agent answers incoming calls reaching the AI call flow. */
  inboundAiAgentChannelId?: string | null;
  ivrSetup?: VoiceIvrSetupDto;

  softphoneEnabled?: boolean;
  sipDomain?: string | null;
  sipWebSocketUrl?: string | null;
  sipUsername?: string | null;
}

/** Turns the in-browser phone on or off and records the SIP identity reps' browsers register with. */
export interface SetSoftphoneInput {
  enabled: boolean;
  sipDomain?: string | null;
  sipWebSocketUrl?: string | null;
  sipUsername?: string | null;
  /** Only sent to rotate the password — omitted keeps whatever is already stored. */
  sipPassword?: string | null;
}

/** What to type into Exotel's dashboard, once. The menu itself is edited in AutoReach. */
export interface VoiceIvrSetupDto {
  ready: boolean;
  problem?: string | null;
  /** Application URL for Gather applet 1, 2 and 3, in that order. */
  gatherUrls: string[];
  /** The Passthru URL after Gather 1 and Gather 2. */
  routeUrls: string[];
  connectUrl?: string | null;
  /** The Voicebot applet's URL in the AI call flow. */
  voicebotUrl?: string | null;
  statusCallbackUrl?: string | null;
}

export interface SetVoiceFlowUrlInput {
  flowUrl?: string | null;
}

/** 0 info, 1 warning, 2 error. */
export type IvrIssueSeverity = 0 | 1 | 2;

export interface IvrIssueDto {
  severity: IvrIssueSeverity;
  promptId?: string | null;
  message: string;
}

export interface SimulateIvrInput {
  keyPresses: (string | null)[];
}

/** 0 stay, 1 next, 2 hangup, 3 transfer. */
export type IvrDecisionKind = 0 | 1 | 2 | 3;

export interface IvrSimulationStepDto {
  promptId: string;
  promptName: string;
  sayText: string;
  keyPressed?: string | null;
  outcome: IvrDecisionKind;
  detail?: string | null;
}

export interface SetVoiceAccountInput {
  exoPhone: string;
  accountSid: string;
  subdomain: string;
  numberSeries?: VoiceNumberSeries;
  apiCredential?: string | null;
}

export interface IvrBranchDto {
  digit: string;
  action?: IvrBranchAction;
  nextPromptId?: string | null;
  transferToNumber?: string | null;
}

export interface IvrPromptDto extends AuditedEntityDto<string> {
  name: string;
  sayText: string;
  isEntryPoint?: boolean;
  maxDigits?: number;
  inputTimeoutSeconds?: number;
  branches: IvrBranchDto[];
}

export interface CreateIvrPromptInput {
  name: string;
  sayText: string;
  maxDigits?: number;
  inputTimeoutSeconds?: number;
  isEntryPoint?: boolean;
}

export interface UpdateIvrPromptInput {
  name: string;
  sayText: string;
  maxDigits?: number;
  inputTimeoutSeconds?: number;
}

export interface SetIvrBranchInput {
  digit: string;
  action?: IvrBranchAction;
  nextPromptId?: string | null;
  transferToNumber?: string | null;
}

export interface PlaceVoiceCallInput {
  contactId: string;
  useIvr?: boolean;
  record?: boolean;
  isMarketing?: boolean | null;
}

export interface VoiceCallDto extends EntityDto<string> {
  contactId?: string;
  providerCallSid?: string | null;
  direction?: VoiceCallDirection;
  status?: VoiceCallStatus;
  currentPromptId?: string | null;
  lastDigits?: string | null;
  durationSeconds?: number;
  recordingUrl?: string | null;
  errorMessage?: string | null;
  startedAtUtc?: string | null;
  endedAtUtc?: string | null;
}
