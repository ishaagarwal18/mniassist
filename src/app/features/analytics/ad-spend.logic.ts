import type { MetaAdAccountDto } from '../../proxy/meta-ads/meta-ads.service';
import { inr } from '../../core/util/format';

const STATE_KEY = 'ar.metaAds.state';

export function rememberAdsState(state: string): void {
  try {
    sessionStorage.setItem(STATE_KEY, state);
  } catch {
    /* private mode: the callback then refuses, and the person starts again */
  }
}

/** The state this tab sent to Facebook, removed as it is read: a callback is good once. */
export function takeAdsState(): string | null {
  try {
    const s = sessionStorage.getItem(STATE_KEY);
    sessionStorage.removeItem(STATE_KEY);
    return s;
  } catch {
    return null;
  }
}

/** Spend in the ad account's currency; Meta's minor units are paise for INR. */
export function money(
  minor: number | null | undefined,
  currency: string | null | undefined,
): string {
  if (minor == null) return '—';
  if (!currency || currency === 'INR') return inr(minor);
  const zeroDecimal = ['JPY', 'KRW', 'VND', 'CLP', 'ISK', 'PYG', 'UGX', 'XAF', 'XOF'].includes(
    currency,
  );
  const major = zeroDecimal ? minor : minor / 100;
  try {
    return major.toLocaleString('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 });
  } catch {
    return `${currency} ${major.toFixed(2)}`;
  }
}

/** Days before Facebook's sign-in for the account runs out, from the token's expected expiry. */
export function daysLeft(
  account: Pick<MetaAdAccountDto, 'tokenExpiresAtUtc'>,
  now = new Date(),
): number {
  return Math.floor((new Date(account.tokenExpiresAtUtc).getTime() - now.getTime()) / 86_400_000);
}

/** What the account card should warn about, if anything. */
export function accountWarning(
  account: Pick<MetaAdAccountDto, 'needsReconnect' | 'lastError' | 'tokenExpiresAtUtc'>,
  now = new Date(),
): { tone: 'bad' | 'warn'; text: string } | null {
  if (account.needsReconnect) {
    return {
      tone: 'bad',
      text: 'Facebook no longer accepts this sign-in. Connect the ad account again to keep spend up to date.',
    };
  }
  if (account.lastError) return { tone: 'bad', text: account.lastError };
  const left = daysLeft(account, now);
  if (left <= 7) {
    return {
      tone: 'warn',
      text:
        left <= 0
          ? 'Facebook’s sign-in for this account has probably run out. Connect it again.'
          : `Facebook’s sign-in for this account runs out in about ${left} day${left === 1 ? '' : 's'}. Connect it again to keep spend coming in.`,
    };
  }
  return null;
}
