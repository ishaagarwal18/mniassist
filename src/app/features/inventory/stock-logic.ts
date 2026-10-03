export type MoveKind = 'receive' | 'issue' | 'adjust' | 'count' | 'min';

export const MOVE_LABEL: Record<MoveKind, { title: string; quantity: string; done: string }> = {
  receive: { title: 'Receive stock', quantity: 'Quantity received', done: 'Received' },
  issue: { title: 'Issue stock', quantity: 'Quantity issued', done: 'Issued' },
  adjust: {
    title: 'Adjust stock',
    quantity: 'Change (e.g. -2 for damaged, 3 for found)',
    done: 'Adjusted',
  },
  count: { title: 'Record a count', quantity: 'Quantity counted', done: 'Counted' },
  min: {
    title: 'Minimum level',
    quantity: 'Alert below (blank: no alert)',
    done: 'Minimum set for',
  },
};

/**
 * What a stock form means: receive and issue need a quantity above zero, an adjustment a signed change other than zero and a reason,
 * a count zero or more, and a minimum level zero or more (blank clears it). Up to three decimals: metres of cable, litres of oil.
 */
export function parseMove(
  kind: MoveKind,
  text: string,
  reason: string,
): { quantity: number | null } | { error: string } {
  const t = text.trim().replace(/,/g, '');
  if (kind === 'min' && t === '') return { quantity: null };
  if (!/^-?\d{1,8}(\.\d{1,3})?$/.test(t)) return { error: 'Enter a number, up to three decimals.' };
  const n = Number(t);
  switch (kind) {
    case 'receive':
    case 'issue':
      return n > 0 ? { quantity: n } : { error: 'Enter a quantity above zero.' };
    case 'adjust':
      if (n === 0) return { error: 'Enter a change other than zero.' };
      return reason.trim()
        ? { quantity: n }
        : { error: 'Say why: damage, a return, a correction…' };
    case 'count':
    case 'min':
      return n >= 0 ? { quantity: n } : { error: 'Enter zero or more.' };
  }
}

export type Tracking = 'None' | 'Batch' | 'Serial';

export interface LotLine {
  number: string;
  quantity: number;
  expiresOn?: string | null;
}

/**
 * The batch or serial numbers a stock form carries for a tracked part. Serials: one per line (or separated by commas), as many as the
 * quantity, each once; receiving needs them, issuing may leave them blank (the oldest go first), adjusting and counting take one.
 * Batch: one batch number, with an optional expiry (yyyy-mm-dd) when receiving; issuing may leave it blank. Untracked parts carry none.
 */
export function parseLots(
  kind: MoveKind,
  tracking: Tracking,
  quantity: number | null,
  numbers: string,
  expiry: string,
): { lots: LotLine[] | null } | { error: string } {
  if (tracking === 'None' || kind === 'min') return { lots: null };
  const list = numbers
    .split(/[\n,]+/)
    .map((n) => n.trim())
    .filter((n) => n.length > 0);
  if (list.some((n) => n.length > 64)) return { error: 'Numbers are at most 64 characters.' };
  const single = kind === 'adjust' || kind === 'count';
  const what = tracking === 'Serial' ? 'serial number' : 'batch number';

  if (list.length === 0) {
    return kind === 'issue'
      ? { lots: null }
      : { error: `Enter the ${what}${tracking === 'Serial' && !single ? 's, one per line' : ''}.` };
  }
  if ((single || tracking === 'Batch') && list.length > 1) {
    return { error: `Enter one ${what}.` };
  }

  if (tracking === 'Serial') {
    const upper = list.map((n) => n.toUpperCase());
    if (new Set(upper).size !== upper.length) return { error: 'Each serial number once.' };
    if (!single && quantity !== list.length) {
      return {
        error: `${list.length} serial number${list.length === 1 ? '' : 's'} for a quantity of ${quantity}: they must match.`,
      };
    }
    return { lots: list.map((n) => ({ number: n, quantity: 1 })) };
  }

  const e = expiry.trim();
  if (e && !/^\d{4}-\d{2}-\d{2}$/.test(e)) return { error: 'Enter the expiry as a date.' };
  return {
    lots: [
      {
        number: list[0],
        quantity: Math.abs(quantity ?? 0),
        expiresOn: kind === 'receive' && e ? e : null,
      },
    ],
  };
}

/** Whole numbers plainly, fractions to at most three places: 12, 2.5, 0.125. */
export function qty(value: number): string {
  return Number.isInteger(value)
    ? value.toLocaleString('en-IN')
    : value.toLocaleString('en-IN', { maximumFractionDigits: 3 });
}
