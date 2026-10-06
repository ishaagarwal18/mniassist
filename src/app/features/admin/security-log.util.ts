import type { ChipTone } from '../../ui';

/** What ABP's sign-in and AutoReach's own security changes record, in words. */
export const SECURITY_ACTIONS: readonly { value: string; label: string; tone: ChipTone }[] = [
  { value: 'LoginSucceeded', label: 'Signed in', tone: 'good' },
  { value: 'LoginInvalidUserNameOrPassword', label: 'Wrong password', tone: 'amber' },
  { value: 'LoginInvalidUserName', label: 'Unknown username', tone: 'amber' },
  { value: 'LoginLockedout', label: 'Locked out', tone: 'bad' },
  { value: 'LoginNotAllowed', label: 'Sign-in not allowed', tone: 'bad' },
  { value: 'LoginRequiresTwoFactor', label: 'Asked for 2-step code', tone: 'neutral' },
  { value: 'Logout', label: 'Signed out', tone: 'neutral' },
  { value: 'ChangePassword', label: 'Password changed', tone: 'teal' },
  { value: 'TwoFactorEnabled', label: '2-step turned on', tone: 'teal' },
  { value: 'TwoFactorDisabled', label: '2-step turned off', tone: 'amber' },
  { value: 'TwoFactorRecoveryCodesRegenerated', label: 'New recovery codes', tone: 'teal' },
  { value: 'TwoFactorResetByAdmin', label: '2-step reset by an admin', tone: 'amber' },
];

/** `LoginSucceeded` → "Signed in"; an action we have no words for → "Some action". */
export function securityActionLabel(action: string | null | undefined): string {
  if (!action) return '—';
  const known = SECURITY_ACTIONS.find((a) => a.value === action);
  if (known) return known.label;
  const words = action.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function securityActionTone(action: string | null | undefined): ChipTone {
  return SECURITY_ACTIONS.find((a) => a.value === action)?.tone ?? 'neutral';
}

/** A short browser description from a User-Agent, for a list: "Chrome · Windows". */
export function browserSummary(userAgent: string | null | undefined): string {
  if (!userAgent) return '—';
  const ua = userAgent;
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/.test(ua)
      ? 'Opera'
      : /Firefox\/|FxiOS/.test(ua)
        ? 'Firefox'
        : /Chrome\/|CriOS/.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : null;
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Android/.test(ua)
      ? 'Android'
      : /iPhone|iPad/.test(ua)
        ? 'iOS'
        : /Mac OS X|Macintosh/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : null;
  return [browser, os].filter(Boolean).join(' · ') || 'Other';
}
