import type { ChipTone } from '../../ui/chip';
import { LeadAdImportStatus } from '../../proxy/lead-ads/lead-ads.service';

const STATE_KEY = 'ar.leadAds.state';

export function rememberState(state: string): void {
  try {
    sessionStorage.setItem(STATE_KEY, state);
  } catch {
    /* private mode: the callback then refuses, and the person starts again */
  }
}

/** The state this tab sent to Facebook, removed as it is read: a callback is good once. */
export function takeState(): string | null {
  try {
    const s = sessionStorage.getItem(STATE_KEY);
    sessionStorage.removeItem(STATE_KEY);
    return s;
  } catch {
    return null;
  }
}

export type CallbackResult = { ok: true; code: string; state: string } | { ok: false; reason: string };

/** What Facebook's redirect back carries, checked against the state this tab started with. */
export function readCallback(
  query: Record<string, string | undefined>,
  expectedState: string | null,
): CallbackResult {
  if (query['error']) {
    return {
      ok: false,
      reason:
        query['error_reason'] === 'user_denied'
          ? 'Facebook sign-in was cancelled. Nothing was connected.'
          : query['error_description'] || 'Facebook refused the sign-in.',
    };
  }
  if (!expectedState || query['state'] !== expectedState) {
    return { ok: false, reason: 'This sign-in was not started here. Connect again.' };
  }
  if (!query['code']) return { ok: false, reason: 'Facebook did not send a sign-in code.' };
  return { ok: true, code: query['code'], state: query['state'] };
}

export function statusLabel(s: LeadAdImportStatus): string {
  return s === LeadAdImportStatus.Imported
    ? 'Imported'
    : s === LeadAdImportStatus.Failed
      ? 'Failed'
      : 'Waiting';
}

export function statusTone(s: LeadAdImportStatus): ChipTone {
  return s === LeadAdImportStatus.Imported
    ? 'good'
    : s === LeadAdImportStatus.Failed
      ? 'bad'
      : 'neutral';
}

export function platformLabel(p: string | null | undefined): string {
  return p === 'ig' ? 'Instagram' : p === 'fb' ? 'Facebook' : '—';
}
