import {
  CallLogDto,
  CallOutcome,
  VoiceCallDirection,
  VoiceCallMode,
  VoiceCallStatus,
} from '../../proxy/voice';

/** What a rep can say came of a call, in the order the form offers them. */
export const OUTCOME_CHOICES: readonly CallOutcome[] = [
  CallOutcome.Connected,
  CallOutcome.NoAnswer,
  CallOutcome.LeftMessage,
  CallOutcome.CallBackLater,
  CallOutcome.WrongNumber,
  CallOutcome.NotInterested,
];

export const OUTCOME_LABEL: Record<CallOutcome, string> = {
  [CallOutcome.None]: 'Not recorded',
  [CallOutcome.Connected]: 'Spoke to them',
  [CallOutcome.NoAnswer]: 'No answer',
  [CallOutcome.LeftMessage]: 'Left a message',
  [CallOutcome.CallBackLater]: 'Asked to call back',
  [CallOutcome.WrongNumber]: 'Wrong number',
  [CallOutcome.NotInterested]: 'Not interested',
};

export const STATUS_LABEL: Record<VoiceCallStatus, string> = {
  [VoiceCallStatus.Queued]: 'Starting',
  [VoiceCallStatus.Ringing]: 'Ringing',
  [VoiceCallStatus.InProgress]: 'In progress',
  [VoiceCallStatus.Completed]: 'Answered',
  [VoiceCallStatus.Busy]: 'Busy',
  [VoiceCallStatus.Failed]: 'Failed',
  [VoiceCallStatus.NoAnswer]: 'Not answered',
  [VoiceCallStatus.Canceled]: 'Cancelled',
};

/** "2m 05s", "45s", "1m". */
export function durationLabel(seconds: number | null | undefined): string {
  const s = Math.max(0, Math.round(seconds ?? 0));
  if (s < 60) return `${s}s`;
  const rest = s % 60;
  return rest === 0
    ? `${Math.floor(s / 60)}m`
    : `${Math.floor(s / 60)}m ${String(rest).padStart(2, '0')}s`;
}

/** Whether what was typed could be a phone number: 10 to 15 digits, with the usual punctuation and nothing else. */
export function looksLikeNumber(text: string): boolean {
  const t = text.trim();
  if (!t || /[^0-9+\s\-().]/.test(t)) return false;
  const digits = t.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

/** What a typed number becomes on the wire: a bare 10-digit Indian number gets the country code added; anything else is kept as
 *  typed, digits only. Mirrors the server's own `PhoneNumberRules.Normalise` for the one case a client can resolve without it. */
export function toE164Digits(typed: string): string {
  const digits = typed.replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

/** Digits with the country code shown the way people read them: "+91 98123 45678". */
export function displayNumber(digits: string | null | undefined): string {
  if (!digits) return '';
  const d = digits.replace(/\D/g, '');
  return d.length === 12 && d.startsWith('91') ? `+91 ${d.slice(2, 7)} ${d.slice(7)}` : `+${d}`;
}

/** Who is on the other end and how it went, in a line. */
export function callHeadline(c: CallLogDto): string {
  const dir = c.direction === VoiceCallDirection.Inbound ? 'Inbound' : 'Outbound';
  const how = c.mode === VoiceCallMode.Manual ? 'written up' : STATUS_LABEL[c.status].toLowerCase();
  const who = c.mode === VoiceCallMode.VoiceAi ? ' by the AI agent' : '';
  return `${dir} call${who} · ${how}${c.durationSeconds > 0 ? ' · ' + durationLabel(c.durationSeconds) : ''}`;
}

/** An ended call the rep has not said anything about yet. */
export function needsOutcome(c: CallLogDto): boolean {
  return (
    c.isOver &&
    c.outcome === CallOutcome.None &&
    c.mode !== VoiceCallMode.Ivr &&
    c.mode !== VoiceCallMode.VoiceAi
  );
}

/** The outcome to start the form on: what the rep said, else what the telephony suggests, else that they spoke. */
export function outcomeToOffer(c: Pick<CallLogDto, 'outcome' | 'suggestedOutcome'>): CallOutcome {
  if (c.outcome !== CallOutcome.None) return c.outcome;
  return c.suggestedOutcome !== CallOutcome.None ? c.suggestedOutcome : CallOutcome.Connected;
}

/** Whether the call has not ended: the rep's phone or the customer's is still ringing, or they are talking. */
export function isLive(c: Pick<CallLogDto, 'isOver'>): boolean {
  return !c.isOver;
}
