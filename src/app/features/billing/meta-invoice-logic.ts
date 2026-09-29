import type { MetaBilledFigureDto } from '../../proxy/billing/models';
import { PricingCategory } from '../../proxy/messaging/pricing-category.enum';

/** The lines on Meta's WhatsApp invoice that are charged. Service and in-window messages are free and aren't entered. */
export const INVOICE_CATEGORIES: readonly {
  key: 'Marketing' | 'Utility' | 'Authentication';
  label: string;
}[] = [
  { key: 'Marketing', label: 'Marketing' },
  { key: 'Utility', label: 'Utility' },
  { key: 'Authentication', label: 'Authentication' },
];

export interface InvoiceLine {
  messages: string;
  amount: string;
}

/** "2026-09" → the whole calendar month in UTC, as Meta's invoice covers it. */
export function monthRange(month: string): { startUtc: string; endUtc: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(month.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const index = Number(m[2]) - 1;
  if (index < 0 || index > 11) return null;
  return {
    startUtc: new Date(Date.UTC(year, index, 1)).toISOString(),
    endUtc: new Date(Date.UTC(year, index + 1, 1)).toISOString(),
  };
}

/** Last calendar month, "2026-08", the usual one to close. */
export function lastMonth(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** "₹2,34,000.50" or "234000.5" → paise. Null when it isn't an amount. */
export function rupeesToPaise(text: string): number | null {
  const t = text.replace(/[₹,\s]/g, '');
  if (t === '') return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(Number(t) * 100);
}

/**
 * The invoice's lines as the API takes them: paid messages and amount per category, keyed by the category's name. Blank lines are
 * left out; a line with a bad number returns an error naming it.
 */
export function metaFigures(
  lines: Record<string, InvoiceLine>,
): { figures: Partial<Record<string, MetaBilledFigureDto>> } | { error: string } {
  const figures: Partial<Record<string, MetaBilledFigureDto>> = {};
  for (const { key, label } of INVOICE_CATEGORIES) {
    const line = lines[key] ?? { messages: '', amount: '' };
    if (!line.messages.trim() && !line.amount.trim()) continue;
    const messages = line.messages.replace(/[,\s]/g, '');
    if (!/^\d+$/.test(messages)) return { error: `${label}: enter the number of paid messages.` };
    const paise = rupeesToPaise(line.amount);
    if (paise === null) return { error: `${label}: enter the amount in rupees, e.g. 2,34,000.50.` };
    figures[key] = { messageCount: Number(messages), costInPaise: paise };
  }
  return Object.keys(figures).length
    ? { figures }
    : { error: 'Enter at least one line from the invoice.' };
}

/** A category from the API (number or name) as a person reads it. */
export function categoryLabel(category: unknown): string {
  if (typeof category === 'number') {
    return category === PricingCategory.UtilityInWindow
      ? 'Utility (in window)'
      : (PricingCategory[category] ?? String(category));
  }
  return String(category);
}
