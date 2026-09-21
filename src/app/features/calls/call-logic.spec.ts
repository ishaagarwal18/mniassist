import { describe, expect, it } from 'vitest';

import { CallLogDto, CallOutcome, VoiceCallDirection, VoiceCallMode, VoiceCallStatus } from '../../proxy/voice';
import { callHeadline, displayNumber, durationLabel, looksLikeNumber, needsOutcome, outcomeToOffer } from './call-logic';

const call = (over: Partial<CallLogDto> = {}): CallLogDto => ({
  id: 'c1',
  contactId: 'k1',
  mode: VoiceCallMode.ClickToCall,
  direction: VoiceCallDirection.Outbound,
  status: VoiceCallStatus.Completed,
  suggestedOutcome: CallOutcome.None,
  outcome: CallOutcome.None,
  durationSeconds: 125,
  creationTime: '2027-03-01T10:00:00Z',
  isOver: true,
  ...over,
});

describe('durationLabel', () => {
  it('reads as seconds, minutes, or minutes and seconds', () => {
    expect(durationLabel(0)).toBe('0s');
    expect(durationLabel(45)).toBe('45s');
    expect(durationLabel(60)).toBe('1m');
    expect(durationLabel(125)).toBe('2m 05s');
    expect(durationLabel(null)).toBe('0s');
    expect(durationLabel(-4)).toBe('0s');
  });
});

describe('looksLikeNumber', () => {
  it('accepts the ways people write a number and refuses the rest', () => {
    expect(looksLikeNumber('98123 45678')).toBe(true);
    expect(looksLikeNumber('+91 98123-45678')).toBe(true);
    expect(looksLikeNumber('(981) 234-5678')).toBe(true);
    expect(looksLikeNumber('12345')).toBe(false);
    expect(looksLikeNumber('call me')).toBe(false);
    expect(looksLikeNumber('98123 4567x')).toBe(false);
    expect(looksLikeNumber('')).toBe(false);
    expect(looksLikeNumber('1234567890123456')).toBe(false);
  });
});

describe('displayNumber', () => {
  it('shows an Indian number the way it is read and others with a plus', () => {
    expect(displayNumber('919812345678')).toBe('+91 98123 45678');
    expect(displayNumber('442079460958')).toBe('+442079460958');
    expect(displayNumber(null)).toBe('');
  });
});

describe('callHeadline', () => {
  it('names the direction, how it ended and how long', () => {
    expect(callHeadline(call())).toBe('Outbound call · answered · 2m 05s');
    expect(callHeadline(call({ status: VoiceCallStatus.NoAnswer, durationSeconds: 0 }))).toBe('Outbound call · not answered');
    expect(callHeadline(call({ mode: VoiceCallMode.Manual, direction: VoiceCallDirection.Inbound, durationSeconds: 60 }))).toBe(
      'Inbound call · written up · 1m',
    );
  });
});

describe('needsOutcome', () => {
  it('is true for an ended rep call with nothing said, and for nothing else', () => {
    expect(needsOutcome(call())).toBe(true);
    expect(needsOutcome(call({ isOver: false }))).toBe(false);
    expect(needsOutcome(call({ outcome: CallOutcome.Connected }))).toBe(false);
    expect(needsOutcome(call({ mode: VoiceCallMode.Ivr }))).toBe(false);
  });
});

describe('outcomeToOffer', () => {
  it('prefers what the rep said, then the suggestion, then that they spoke', () => {
    expect(outcomeToOffer({ outcome: CallOutcome.WrongNumber, suggestedOutcome: CallOutcome.NoAnswer })).toBe(CallOutcome.WrongNumber);
    expect(outcomeToOffer({ outcome: CallOutcome.None, suggestedOutcome: CallOutcome.NoAnswer })).toBe(CallOutcome.NoAnswer);
    expect(outcomeToOffer({ outcome: CallOutcome.None, suggestedOutcome: CallOutcome.None })).toBe(CallOutcome.Connected);
  });
});
