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

/** Whole numbers plainly, fractions to at most three places: 12, 2.5, 0.125. */
export function qty(value: number): string {
  return Number.isInteger(value)
    ? value.toLocaleString('en-IN')
    : value.toLocaleString('en-IN', { maximumFractionDigits: 3 });
}
