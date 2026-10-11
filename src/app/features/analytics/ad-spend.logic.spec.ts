import { accountWarning, daysLeft, money } from './ad-spend.logic';

describe('ad spend logic', () => {
  const now = new Date('2026-10-11T06:00:00Z');
  const inDays = (d: number) => new Date(now.getTime() + d * 86_400_000).toISOString();

  it('shows INR spend in rupees and other currencies in their own', () => {
    expect(money(1_234_56, 'INR')).toBe('₹1,235');
    expect(money(null, 'INR')).toBe('—');
    expect(money(1500, 'USD')).toContain('15');
    expect(money(1500, 'JPY')).toContain('1,500');
  });

  it('counts the days left on the sign-in', () => {
    expect(daysLeft({ tokenExpiresAtUtc: inDays(10.5) }, now)).toBe(10);
  });

  it('warns about a refused sign-in first, then an error, then one about to run out', () => {
    expect(
      accountWarning({ needsReconnect: true, lastError: 'x', tokenExpiresAtUtc: inDays(40) }, now)
        ?.tone,
    ).toBe('bad');
    expect(
      accountWarning(
        { needsReconnect: false, lastError: 'Rate limited', tokenExpiresAtUtc: inDays(40) },
        now,
      )?.text,
    ).toBe('Rate limited');
    expect(
      accountWarning({ needsReconnect: false, lastError: null, tokenExpiresAtUtc: inDays(3) }, now)
        ?.text,
    ).toContain('about 3 days');
    expect(
      accountWarning(
        { needsReconnect: false, lastError: null, tokenExpiresAtUtc: inDays(40) },
        now,
      ),
    ).toBeNull();
  });
});
