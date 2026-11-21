import { describe, expect, it } from 'vitest';

import { SALES_GREETING, salesChatUrl } from './sales-chat';

describe('salesChatUrl', () => {
  it('is null when no number is set', () => {
    expect(salesChatUrl('')).toBeNull();
    expect(salesChatUrl(undefined)).toBeNull();
  });

  it('is null for something that is not a phone number', () => {
    expect(salesChatUrl('12345')).toBeNull();
    expect(salesChatUrl('91 98AB 12345')).toBeNull();
  });

  it('accepts a formatted number and strips the formatting', () => {
    expect(salesChatUrl('+91 98123-45678')).toBe(
      `https://wa.me/919812345678?text=${encodeURIComponent(SALES_GREETING)}`,
    );
  });
});
