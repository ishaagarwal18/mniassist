import { describe, expect, it } from 'vitest';

import { isThemedPath, parseTheme } from './theme-logic';

describe('theme', () => {
  it('defaults to light for anything but "dark"', () => {
    expect(parseTheme('dark')).toBe('dark');
    expect(parseTheme('light')).toBe('light');
    expect(parseTheme(null)).toBe('light');
    expect(parseTheme('purple')).toBe('light');
  });

  it('follows the choice inside the app and on sign-in', () => {
    for (const p of [
      '/home',
      '/inbox',
      '/settings/profile',
      '/login',
      '/signup',
      '/reset-password',
    ]) {
      expect(isThemedPath(p), p).toBe(true);
    }
  });

  it('keeps every public customer page light', () => {
    for (const p of [
      '/',
      '/sign/abc',
      '/f/form1',
      '/pay/tok',
      '/t/acme',
      '/r/tok',
      '/reorder/acme',
      '/catalogue/acme',
      '/privacy',
      '/field',
      '/?x=1',
    ]) {
      expect(isThemedPath(p), p).toBe(false);
    }
  });

  it('does not mistake app routes that merely start like a public prefix', () => {
    expect(isThemedPath('/reorders')).toBe(true);
    expect(isThemedPath('/forms')).toBe(true);
    expect(isThemedPath('/tasks')).toBe(true);
  });
});
