import type { ImportProductRow } from '../../proxy/library';

/**
 * Turns pasted spreadsheet rows into products. Columns, in order: part number, name, price (₹),
 * unit, category, HSN, GST %. Comma or tab separated (tab wins when a row has one, so names can hold commas).
 * A first row that starts with "part" is a header and dropped. Nothing is judged here beyond reading
 * the price: rows with no part number or name are still sent, and the server reports them as skipped.
 */
export function parseProductRows(text: string): ImportProductRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length && /^\s*part/i.test(lines[0])) lines.shift();

  return lines.map((line) => {
    const cells = (line.includes('\t') ? line.split('\t') : line.split(',')).map((c) => c.trim());
    const rupees = Number((cells[2] ?? '').replace(/[₹,\s]/g, ''));
    const gst = (cells[6] ?? '').replace(/[%\s]/g, '');
    const gstPercent = gst === '' ? NaN : Number(gst);
    return {
      partNumber: cells[0] || null,
      name: cells[1] || null,
      listPriceInPaise: Number.isFinite(rupees) ? Math.round(rupees * 100) : 0,
      unit: cells[3] || null,
      category: cells[4] || null,
      hsnCode: cells[5] || null,
      taxRateBasisPoints: Number.isFinite(gstPercent) ? Math.round(gstPercent * 100) : null,
      isActive: true,
    };
  });
}
