import type { ChipTone } from '../../ui/chip';
import type { NetworkLeadState, TerritoryDto } from '../../proxy/network/network.service';

/** "Maharashtra, Goa" or one per line → trimmed, de-duplicated entries. */
export function parseList(text: string): string[] {
  const seen = new Set<string>();
  return text
    .split(/[,\n;]/)
    .map((s) => s.trim().replace(/\s+/g, ' '))
    .filter((s) => {
      const key = s.toUpperCase();
      if (!s || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** PIN prefixes must be 1–6 digits; spaces inside a PIN ("411 0") are ignored. Returns the bad entries too. */
export function parsePins(text: string): { pins: string[]; bad: string[] } {
  const all = parseList(text).map((p) => p.replace(/\s/g, ''));
  return {
    pins: all.filter((p) => /^\d{1,6}$/.test(p)),
    bad: all.filter((p) => !/^\d{1,6}$/.test(p)),
  };
}

/** A short plain-language line for a territory: "PIN 4110…, 4111… · Pune · Maharashtra · Drives only". */
export function describeTerritory(t: TerritoryDto): string {
  const parts: string[] = [];
  if (t.pinPrefixes.length) parts.push('PIN ' + t.pinPrefixes.map((p) => p + '…').join(', '));
  if (t.cities.length) parts.push(t.cities.map(title).join(', '));
  if (t.states.length) parts.push(t.states.map(title).join(', '));
  const where = parts.length ? parts.join(' · ') : 'No territory yet';
  return t.productLines.length ? `${where} · ${t.productLines.map(title).join(', ')} only` : where;
}

/** Stored upper case for matching; shown in title case. */
export function title(s: string): string {
  return s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

export const LEAD_STATE_LABEL: Record<NetworkLeadState, string> = {
  Unrouted: 'In your queue',
  Offered: 'Waiting for dealer',
  Accepted: 'With dealer',
  Won: 'Won by dealer',
  Lost: 'Lost by dealer',
  Closed: 'Closed',
};

export function leadTone(state: string): ChipTone {
  switch (state) {
    case 'Unrouted':
      return 'amber';
    case 'Offered':
      return 'warn';
    case 'Accepted':
      return 'teal';
    case 'Won':
      return 'good';
    case 'Lost':
      return 'bad';
    default:
      return 'neutral';
  }
}

/** "3 h left", "45 min left", "overdue" — how long a dealer has to answer. */
export function timeLeft(answerByUtc: string | null | undefined, now = Date.now()): string {
  if (!answerByUtc) return '';
  const ms = new Date(answerByUtc).getTime() - now;
  if (ms <= 0) return 'time up';
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} min left`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${hours} h left` : `${Math.round(hours / 24)} days left`;
}

/** "411045 Pune, Maharashtra" from whichever parts are known. */
export function place(pin?: string | null, city?: string | null, state?: string | null): string {
  const where = [city, state].filter(Boolean).join(', ');
  return [pin, where].filter(Boolean).join(' ') || 'Location not given';
}
