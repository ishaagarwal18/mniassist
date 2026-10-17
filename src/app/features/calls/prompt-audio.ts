/**
 * Turns whatever audio file someone picks (MP3, M4A, Ogg Vorbis, any kind of WAV) into the one
 * format the IVR prompt upload takes: 16-bit PCM WAV, mono, 48 kHz. The browser decodes it, so no
 * codec has to live on the server, and the length is checked before anything is uploaded.
 */
export const PROMPT_SAMPLE_RATE = 48000;
export const PROMPT_MAX_SECONDS = 30;

export class PromptAudioError extends Error {}

export async function toPromptWav(file: File): Promise<{ wav: Blob; seconds: number }> {
  const bytes = await file.arrayBuffer();
  let decoded: AudioBuffer;
  try {
    // An offline context decodes without needing a user gesture or a sound device.
    decoded = await new OfflineAudioContext(1, 1, PROMPT_SAMPLE_RATE).decodeAudioData(bytes);
  } catch {
    throw new PromptAudioError(
      "This browser can't read that file as audio. Use a WAV, MP3, M4A or Ogg recording.",
    );
  }

  const seconds = decoded.duration;
  if (seconds < 0.1) throw new PromptAudioError('That file has no audio in it.');
  if (seconds >= PROMPT_MAX_SECONDS) {
    throw new PromptAudioError(
      `The prompt is ${Math.round(seconds)} seconds long. Keep it under ${PROMPT_MAX_SECONDS} seconds.`,
    );
  }

  // Render once more through a mono 48 kHz context: that mixes the channels down and resamples.
  const length = Math.ceil(seconds * PROMPT_SAMPLE_RATE);
  const ctx = new OfflineAudioContext(1, length, PROMPT_SAMPLE_RATE);
  const source = ctx.createBufferSource();
  source.buffer = decoded;
  source.connect(ctx.destination);
  source.start();
  const rendered = await ctx.startRendering();

  return { wav: encodeWav16(rendered.getChannelData(0), PROMPT_SAMPLE_RATE), seconds };
}

/** Float samples (-1…1) as a 16-bit PCM mono WAV file. */
export function encodeWav16(samples: Float32Array, sampleRate: number): Blob {
  const dataBytes = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const text = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i));
  };
  text(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // bytes per second
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  text(36, 'data');
  view.setUint32(40, dataBytes, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}
