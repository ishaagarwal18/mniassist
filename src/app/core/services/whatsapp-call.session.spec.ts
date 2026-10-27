import { isQueued, recordingType, transferLinkOutcome } from './whatsapp-call.session';

describe('A call the IVR queued', () => {
  it('is answerable without an offer: the relay already holds the customer', () => {
    expect(isQueued({ ivrStatus: 'Queued' })).toBe(true);
    expect(isQueued({ ivrStatus: 'AiHandoff' })).toBe(true);
  });

  it('is not one still in the menu, or an ordinary ringing call', () => {
    expect(isQueued({ ivrStatus: 'Menu' })).toBe(false);
    expect(isQueued({ ivrStatus: 'None' })).toBe(false);
    expect(isQueued({})).toBe(false);
  });
});

describe('A transferred call losing its relay', () => {
  it('is the normal end when the call itself has ended', () => {
    expect(transferLinkOutcome({ endedAtUtc: '2026-09-30T10:00:00Z' })).toBe('call-ended');
  });

  it("is a lost relay when the call is still on: the customer didn't hang up", () => {
    expect(transferLinkOutcome({ endedAtUtc: null })).toBe('relay-lost');
  });

  it("says nothing when the call can't be read", () => {
    expect(transferLinkOutcome(null)).toBe('unknown');
  });
});

describe('WhatsApp call recording format', () => {
  it('prefers Opus in WebM, then Ogg, then MP4', () => {
    expect(recordingType(() => true)).toBe('audio/webm;codecs=opus');
    expect(recordingType((t) => t.startsWith('audio/ogg'))).toBe('audio/ogg;codecs=opus');
    expect(recordingType((t) => t === 'audio/mp4')).toBe('audio/mp4');
  });

  it('records nothing when the browser supports none of them', () => {
    expect(recordingType(() => false)).toBeNull();
  });
});
