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
