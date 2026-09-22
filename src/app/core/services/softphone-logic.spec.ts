import { describe, expect, it } from 'vitest';

import { formatDuration, sipTarget } from './softphone-logic';

describe('formatDuration', () => {
  it('reads as minutes and seconds, no leading zero on minutes', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(5)).toBe('0:05');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(600)).toBe('10:00');
  });

  it('never goes negative', () => {
    expect(formatDuration(-4)).toBe('0:00');
  });
});

describe('sipTarget', () => {
  it('dials the destination number on the same domain as the workspace line', () => {
    expect(sipTarget('sip:sales@voice.example.com', '919900112233')).toBe('sip:919900112233@voice.example.com');
  });

  it('is null when there is no address of record to read a domain from', () => {
    expect(sipTarget(null, '919900112233')).toBeNull();
    expect(sipTarget(undefined, '919900112233')).toBeNull();
    expect(sipTarget('not-a-sip-uri', '919900112233')).toBeNull();
  });
});
