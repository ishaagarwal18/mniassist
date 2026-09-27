import { recordingType } from './whatsapp-call.session';

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
