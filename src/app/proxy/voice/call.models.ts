import type { CallOutcome } from './call-outcome.enum';
import type { VoiceCallDirection } from './voice-call-direction.enum';
import type { VoiceCallMode } from './voice-call-mode.enum';
import type { VoiceCallStatus } from './voice-call-status.enum';

/** What a rep needs to know before clicking to call. */
export interface CallSetupDto {
  channelReady: boolean;
  /** Why not, in a sentence, when the channel is not ready. */
  channelProblem?: string | null;
  /** Digits with the country code the rep's own phone is rung on; null until they set one. */
  myNumber?: string | null;
}

export interface StartCallInput {
  contactId: string;
  enquiryId?: string | null;
  /** The number to ring the rep on for this call. Blank uses the number saved on their profile. */
  repNumber?: string | null;
  saveNumber?: boolean;
  record?: boolean;
}

export interface LogManualCallInput {
  contactId: string;
  enquiryId?: string | null;
  direction: VoiceCallDirection;
  startedAtUtc: string;
  durationSeconds: number;
  outcome: CallOutcome;
  notes?: string | null;
}

export interface SetCallOutcomeInput {
  outcome: CallOutcome;
  notes?: string | null;
  enquiryId?: string | null;
}

export interface GetCallsInput {
  contactId?: string | null;
  enquiryId?: string | null;
  repUserId?: string | null;
  mine?: boolean;
  status?: VoiceCallStatus | null;
  needsOutcome?: boolean;
  fromUtc?: string | null;
  toUtc?: string | null;
  skipCount?: number;
  maxResultCount?: number;
}

/** What a browser needs to register the workspace's shared softphone line. */
export interface SoftphoneCredentialsDto {
  ready: boolean;
  /** Why not, in a sentence, when ready is false. */
  problem?: string | null;
  /** The wss:// address the browser's SIP client connects to. */
  wsServer?: string | null;
  /** The SIP address of record, e.g. sip:sales@voice.example.com. */
  sipUri?: string | null;
  password?: string | null;
  /** The signed-in rep's own name, for the softphone's own display. */
  displayName?: string | null;
}

export interface StartSoftphoneCallInput {
  /** Who to call. Either this or `number` is given — never neither. */
  contactId?: string | null;
  /** A number typed straight into the softphone's own dialler, with no contact picked. Ignored when contactId is given. */
  number?: string | null;
  enquiryId?: string | null;
}

export interface ReportSoftphoneInboundInput {
  fromNumber: string;
}

export interface ReportSoftphoneEventInput {
  status: VoiceCallStatus;
  durationSeconds?: number | null;
}

export interface CallLogDto {
  id: string;
  contactId: string;
  contactName?: string | null;
  contactNumber?: string | null;
  enquiryId?: string | null;
  enquiryReference?: string | null;
  repUserId?: string | null;
  repName?: string | null;
  mode: VoiceCallMode;
  direction: VoiceCallDirection;
  status: VoiceCallStatus;
  /** What the outcome probably was, when the rep has not said. A hint for the form, never their answer. */
  suggestedOutcome: CallOutcome;
  outcome: CallOutcome;
  notes?: string | null;
  outcomeRecordedAtUtc?: string | null;
  durationSeconds: number;
  recordingUrl?: string | null;
  errorMessage?: string | null;
  startedAtUtc?: string | null;
  endedAtUtc?: string | null;
  creationTime: string;
  isOver: boolean;
}
