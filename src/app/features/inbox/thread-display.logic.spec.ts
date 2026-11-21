import { describe, expect, it } from 'vitest';

import { channelBadge, clockTime, dayHeading, statusTicks } from './thread-display.logic';

const now = new Date(2026, 10, 20, 15, 0);
const at = (d: number, h = 10) => new Date(2026, 10, d, h, 0).toISOString();

describe('dayHeading', () => {
  it('names today and yesterday', () => {
    expect(dayHeading(at(20), undefined, now)).toBe('Today');
    expect(dayHeading(at(19), undefined, now)).toBe('Yesterday');
  });

  it('gives an older day a date', () => {
    expect(dayHeading(at(16), undefined, now)).toContain('16');
  });

  it('adds no heading inside the same day', () => {
    expect(dayHeading(at(20, 14), at(20, 9), now)).toBeNull();
  });

  it('adds a heading when the day changes', () => {
    expect(dayHeading(at(20, 9), at(19, 22), now)).toBe('Today');
  });

  it('ignores a missing or bad time', () => {
    expect(dayHeading(undefined, undefined, now)).toBeNull();
    expect(dayHeading('not a date', undefined, now)).toBeNull();
  });
});

describe('clockTime', () => {
  it('falls back when there is no time', () => {
    expect(clockTime(undefined, 'Mon 10:00')).toBe('Mon 10:00');
  });

  it('shows hours and minutes', () => {
    expect(clockTime(at(20, 9), '')).toMatch(/09:00/);
  });
});

describe('statusTicks', () => {
  it('maps each status', () => {
    expect(statusTicks('sent')?.ticks).toBe('✓');
    expect(statusTicks('delivered')?.ticks).toBe('✓✓');
    expect(statusTicks('read')?.read).toBe(true);
    expect(statusTicks(undefined)).toBeNull();
  });
});

describe('channelBadge', () => {
  it('names each channel', () => {
    expect(channelBadge(undefined, false).kind).toBe('wa');
    expect(channelBadge('Instagram', false).kind).toBe('ig');
    expect(channelBadge('Messenger', false).kind).toBe('fb');
    expect(channelBadge('Email', false).kind).toBe('email');
    expect(channelBadge('Email', true).kind).toBe('sms');
  });
});
