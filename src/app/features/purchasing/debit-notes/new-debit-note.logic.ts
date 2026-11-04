import type {
  CreateVendorDebitNoteDto,
  GoodsReceiptNoteDto,
  VendorBillDto,
} from '../../../proxy/purchasing';

export interface DebitFormLine {
  partNumber: string;
  description: string;
  quantity: number;
  /** Rupees, as typed. */
  rate: number;
  taxRateBasisPoints: number;
}

export interface DebitForm {
  supplierId: string;
  supplierName: string;
  vendorBillId: string;
  vendorBillNumber: string;
  goodsReceiptNoteId: string;
  goodsReceiptNoteNumber: string;
  reason: string;
  isInterState: boolean;
  remarks: string;
  lines: DebitFormLine[];
}

/** The usual reasons, offered as one-click starts for the reason field. */
export const DEBIT_REASONS: readonly string[] = [
  'QC rejection',
  'Short supply',
  'Rate difference',
  'Damaged in transit',
  'Purchase return',
];

export function blankDebitLine(): DebitFormLine {
  return { partNumber: '', description: '', quantity: 1, rate: 0, taxRateBasisPoints: 1800 };
}

/** The rejected quantities on a goods receipt, priced from the bill when one is linked. */
export function linesFromRejections(
  grn: GoodsReceiptNoteDto,
  bill?: VendorBillDto | null,
): DebitFormLine[] {
  return grn.lines
    .filter((l) => l.rejectedQuantity > 0)
    .map((l) => {
      const billed = bill?.lines.find(
        (b) => b.goodsReceiptNoteLineId === l.id || b.partNumber === l.partNumber,
      );
      return {
        partNumber: l.partNumber,
        description: l.rejectionReason ? `${l.description} — ${l.rejectionReason}` : l.description,
        quantity: l.rejectedQuantity,
        rate: billed ? billed.unitPriceInPaise / 100 : 0,
        taxRateBasisPoints: billed?.taxRateBasisPoints ?? 1800,
      };
    });
}

/** A bill's lines, to debit part of it (rate difference, return). */
export function linesFromBill(bill: VendorBillDto): DebitFormLine[] {
  return bill.lines.map((l) => ({
    partNumber: l.partNumber,
    description: l.description,
    quantity: l.billedQuantity,
    rate: l.unitPriceInPaise / 100,
    taxRateBasisPoints: l.taxRateBasisPoints,
  }));
}

export function debitLineTaxable(l: DebitFormLine): number {
  return Math.round((l.quantity || 0) * (l.rate || 0) * 100);
}

export function debitTotals(f: Pick<DebitForm, 'lines' | 'isInterState'>) {
  let taxable = 0;
  let tax = 0;
  for (const l of f.lines) {
    const t = debitLineTaxable(l);
    taxable += t;
    tax += Math.round((t * l.taxRateBasisPoints) / 10000);
  }
  const cgst = f.isInterState ? 0 : Math.round(tax / 2);
  return {
    taxable,
    cgst,
    sgst: f.isInterState ? 0 : tax - cgst,
    igst: f.isInterState ? tax : 0,
    grand: taxable + tax,
  };
}

function isBlank(l: DebitFormLine): boolean {
  return !l.partNumber.trim() && !l.description.trim();
}

export function validateDebitForm(f: DebitForm): Record<string, string> {
  const e: Record<string, string> = {};
  if (!f.supplierId) e['supplier'] = 'Pick the supplier to debit.';
  if (!f.reason.trim()) e['reason'] = 'Say why the supplier is being debited.';
  const lines = f.lines.map((l, i) => ({ l, i })).filter(({ l }) => !isBlank(l));
  if (!lines.length) e['lines'] = 'Add at least one item.';
  for (const { l, i } of lines) {
    if (!(l.quantity > 0)) e[`line.${i}.quantity`] = 'More than zero.';
    if (!(l.rate > 0)) e[`line.${i}.rate`] = 'Enter the rate.';
  }
  return e;
}

export function toCreateDebitDto(f: DebitForm): CreateVendorDebitNoteDto {
  const opt = (s: string) => s.trim() || undefined;
  return {
    supplierId: f.supplierId,
    supplierName: f.supplierName,
    reason: f.reason.trim(),
    isInterState: f.isInterState,
    vendorBillId: f.vendorBillId || undefined,
    vendorBillNumber: opt(f.vendorBillNumber),
    goodsReceiptNoteId: f.goodsReceiptNoteId || undefined,
    goodsReceiptNoteNumber: opt(f.goodsReceiptNoteNumber),
    remarks: opt(f.remarks),
    lines: f.lines
      .filter((l) => !isBlank(l))
      .map((l) => ({
        partNumber: l.partNumber.trim() || l.description.trim(),
        description: l.description.trim() || l.partNumber.trim(),
        quantity: l.quantity,
        unitPriceInPaise: Math.round(l.rate * 100),
        taxRateBasisPoints: l.taxRateBasisPoints,
      })),
  };
}
