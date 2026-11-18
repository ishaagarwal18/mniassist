import type { PurchaseOrderDto } from '../../../proxy/inventory/purchasing.service';
import type {
  CreateVendorBillDto,
  GoodsReceiptNoteDto,
  VendorBillReadingDto,
} from '../../../proxy/purchasing';

export interface BillFormLine {
  purchaseOrderLineId?: string;
  goodsReceiptNoteLineId?: string;
  /** The item's name, typed or picked from the catalogue. Saved as the start of the description. */
  partName?: string;
  /** The catalogue product picked for this line, if any. */
  productId?: string;
  partNumber: string;
  description: string;
  hsnCode: string;
  quantity: number;
  /** Rupees, as typed. */
  rate: number;
  discountPercent: number;
  taxRateBasisPoints: number;
}

export interface BillForm {
  supplierId: string;
  supplierName: string;
  supplierGstin: string;
  vendorInvoiceNumber: string;
  /** yyyy-MM-dd */
  invoiceDate: string;
  dueDate: string;
  isInterState: boolean;
  purchaseOrderId: string;
  purchaseOrderReference: string;
  goodsReceiptNoteId: string;
  goodsReceiptNoteNumber: string;
  /** One of TDS_OPTIONS' keys. */
  tds: string;
  isReverseCharge: boolean;
  remarks: string;
  lines: BillFormLine[];
}

/** TDS on purchases, by section and rate (the rate depends on who the supplier is). */
export const TDS_OPTIONS: readonly { key: string; section?: string; bps: number; label: string }[] =
  [
    { key: '194Q', section: '194Q', bps: 10, label: '194Q · purchase of goods · 0.1%' },
    { key: '194C-1', section: '194C', bps: 100, label: '194C · job work, individual/HUF · 1%' },
    { key: '194C-2', section: '194C', bps: 200, label: '194C · job work, company/firm · 2%' },
    { key: '194J-2', section: '194J', bps: 200, label: '194J · technical services · 2%' },
    { key: '194J-10', section: '194J', bps: 1000, label: '194J · professional fees · 10%' },
    { key: 'none', bps: 0, label: 'No TDS' },
  ];

export function tdsOption(key: string) {
  return TDS_OPTIONS.find((t) => t.key === key) ?? TDS_OPTIONS[TDS_OPTIONS.length - 1];
}

export function blankBillLine(): BillFormLine {
  return {
    partNumber: '',
    description: '',
    hsnCode: '',
    quantity: 1,
    rate: 0,
    discountPercent: 0,
    taxRateBasisPoints: 1800,
  };
}

/** Taxable value of a line, in paise. */
export function lineTaxable(l: BillFormLine): number {
  const gross = (l.quantity || 0) * (l.rate || 0) * 100;
  return Math.round(gross * (1 - Math.min(100, Math.max(0, l.discountPercent || 0)) / 100));
}

export interface BillTotals {
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  grand: number;
  tds: number;
  net: number;
}

/** What the bill comes to, in paise: GST split by supply type, TDS on the taxable value. */
export function billTotals(f: Pick<BillForm, 'lines' | 'isInterState' | 'tds'>): BillTotals {
  let taxable = 0;
  let tax = 0;
  for (const l of f.lines) {
    const t = lineTaxable(l);
    taxable += t;
    tax += Math.round((t * l.taxRateBasisPoints) / 10000);
  }
  const cgst = f.isInterState ? 0 : Math.round(tax / 2);
  const sgst = f.isInterState ? 0 : tax - cgst;
  const igst = f.isInterState ? tax : 0;
  const grand = taxable + tax;
  const tds = Math.round((taxable * tdsOption(f.tds).bps) / 10000);
  return { taxable, cgst, sgst, igst, grand, tds, net: grand - tds };
}

/** The accepted goods on a goods receipt, as bill lines; rates from the order when it is known. */
export function linesFromReceipt(
  grn: GoodsReceiptNoteDto,
  order?: PurchaseOrderDto | null,
): BillFormLine[] {
  return grn.lines
    .map((l) => {
      // Before QC nothing is accepted or rejected yet: bill what was received. After QC, only what passed.
      const inspected = l.acceptedQuantity > 0 || l.rejectedQuantity > 0;
      const accepted = inspected ? l.acceptedQuantity : l.receivedQuantity;
      const poLine = order?.lines.find(
        (o) => o.id === l.purchaseOrderLineId || o.partNumber === l.partNumber,
      );
      return {
        ...blankBillLine(),
        purchaseOrderLineId: l.purchaseOrderLineId ?? undefined,
        goodsReceiptNoteLineId: l.id ?? undefined,
        partNumber: l.partNumber,
        description: l.description,
        quantity: accepted,
        rate: poLine ? poLine.unitCostInPaise / 100 : 0,
      };
    })
    .filter((l) => l.quantity > 0);
}

function isBlank(l: BillFormLine): boolean {
  return !l.partNumber.trim() && !l.description.trim() && !(l.partName ?? '').trim();
}

/** What the bill line's description holds: the part name, then any extra description. */
export function lineDescription(l: BillFormLine): string {
  const name = (l.partName ?? '').trim();
  const desc = l.description.trim();
  if (!name) return desc;
  if (!desc || desc.toLowerCase() === name.toLowerCase()) return name;
  return desc.toLowerCase().startsWith(name.toLowerCase()) ? desc : `${name} – ${desc}`;
}

export function validateBillForm(f: BillForm): Record<string, string> {
  const e: Record<string, string> = {};
  if (!f.supplierId) e['supplier'] = 'Pick the supplier who sent the invoice.';
  if (!f.vendorInvoiceNumber.trim())
    e['vendorInvoiceNumber'] = "Enter the supplier's invoice number.";
  if (!f.invoiceDate) e['invoiceDate'] = 'Enter the invoice date.';
  if (!f.dueDate) e['dueDate'] = 'Enter when it is due.';
  else if (f.invoiceDate && f.dueDate < f.invoiceDate) e['dueDate'] = 'Due after the invoice date.';
  const gstin = f.supplierGstin.trim();
  if (gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/i.test(gstin))
    e['supplierGstin'] = 'A GSTIN has 15 characters, e.g. 27AABCB1234F1Z5.';
  const lines = f.lines.map((l, i) => ({ l, i })).filter(({ l }) => !isBlank(l));
  if (!lines.length) e['lines'] = 'Add at least one billed item.';
  for (const { l, i } of lines) {
    if (!l.partNumber.trim() && !lineDescription(l)) e[`line.${i}.partNumber`] = 'Needed.';
    if (!(l.quantity > 0)) e[`line.${i}.quantity`] = 'More than zero.';
    if (!(l.rate > 0)) e[`line.${i}.rate`] = 'Enter the rate.';
    if (l.hsnCode && !/^\d{4,8}$/.test(l.hsnCode.trim())) e[`line.${i}.hsnCode`] = '4–8 digits.';
  }
  return e;
}

export function toCreateBillDto(f: BillForm): CreateVendorBillDto {
  const opt = (s: string) => s.trim() || undefined;
  const tds = tdsOption(f.tds);
  return {
    vendorInvoiceNumber: f.vendorInvoiceNumber.trim(),
    vendorInvoiceDateUtc: new Date(f.invoiceDate).toISOString(),
    supplierId: f.supplierId,
    supplierName: f.supplierName,
    supplierGstin: opt(f.supplierGstin.toUpperCase()),
    dueDateUtc: new Date(f.dueDate).toISOString(),
    isInterState: f.isInterState,
    purchaseOrderId: f.purchaseOrderId || undefined,
    purchaseOrderReference: opt(f.purchaseOrderReference),
    goodsReceiptNoteId: f.goodsReceiptNoteId || undefined,
    goodsReceiptNoteNumber: opt(f.goodsReceiptNoteNumber),
    tdsSection: tds.section,
    tdsRateBasisPoints: tds.bps,
    isReverseCharge: f.isReverseCharge,
    remarks: opt(f.remarks),
    discountInPaise: 0,
    lines: f.lines
      .filter((l) => !isBlank(l))
      .map((l) => ({
        purchaseOrderLineId: l.purchaseOrderLineId,
        goodsReceiptNoteLineId: l.goodsReceiptNoteLineId,
        partNumber: l.partNumber.trim() || lineDescription(l),
        description: lineDescription(l) || l.partNumber.trim(),
        hsnCode: opt(l.hsnCode),
        billedQuantity: l.quantity,
        unitPriceInPaise: Math.round(l.rate * 100),
        discountPercent: l.discountPercent || 0,
        taxRateBasisPoints: l.taxRateBasisPoints,
      })),
  };
}

/** The files a bill can be read from, and their size limits (the API's). */
export const BILL_UPLOAD_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

export function billUploadProblem(file: { type: string; size: number }): string | null {
  if (!BILL_UPLOAD_TYPES.includes(file.type))
    return 'Upload a PDF, or a JPEG, PNG or WebP photo of the bill.';
  const max = file.type === 'application/pdf' ? 10 : 5;
  return file.size > max * 1024 * 1024 ? `That file is over ${max} MB.` : null;
}

/**
 * The bill form filled from what the AI read: the matched supplier (else none, with a warning), invoice, dates (due 30 days on
 * when the bill gives none), supply type, PO and lines. What it couldn't settle comes back as warnings to show.
 */
export function formFromReading(
  form: BillForm,
  r: VendorBillReadingDto,
): { form: BillForm; warnings: string[] } {
  const warnings: string[] = [];
  const supplier = r.matchedSupplierId
    ? {
        supplierId: r.matchedSupplierId,
        supplierName: r.matchedSupplierName ?? r.supplierName ?? '',
      }
    : { supplierId: '', supplierName: '' };
  if (!r.matchedSupplierId)
    warnings.push(
      r.supplierName
        ? `${r.supplierName}${r.supplierGstin ? ` (${r.supplierGstin})` : ''} isn't in your suppliers. Pick the supplier, or add them first.`
        : 'The supplier could not be read. Pick the supplier.',
    );
  const invoiceDate = r.invoiceDate ?? form.invoiceDate;
  const due = r.dueDate ?? addDays(invoiceDate, 30);
  if (r.isInterState == null)
    warnings.push('Check the supply type: the bill does not make it clear.');
  const lines: BillFormLine[] = r.lines.map((l) => ({
    ...blankBillLine(),
    partNumber: l.partNumber ?? '',
    description: l.description,
    hsnCode: l.hsnCode ?? '',
    quantity: l.quantity,
    rate: l.unitPriceInPaise / 100,
    discountPercent: l.discountPercent,
    taxRateBasisPoints: l.taxRateBasisPoints,
  }));
  if (!lines.length) warnings.push('No items could be read. Add them below.');
  const next: BillForm = {
    ...form,
    ...supplier,
    supplierGstin: r.supplierGstin ?? form.supplierGstin,
    vendorInvoiceNumber: r.invoiceNumber ?? form.vendorInvoiceNumber,
    invoiceDate,
    dueDate: due,
    isInterState: r.isInterState ?? form.isInterState,
    isReverseCharge: r.isReverseCharge,
    purchaseOrderReference: r.purchaseOrderReference ?? form.purchaseOrderReference,
    goodsReceiptNoteId: '',
    goodsReceiptNoteNumber: '',
    purchaseOrderId: '',
    lines: lines.length ? lines : [blankBillLine()],
  };
  // The bill's own total against what the lines add up to: a difference means a line was misread.
  if (r.grandTotalInPaise != null && lines.length) {
    const ours = billTotals({ ...next, tds: 'none' }).grand;
    if (Math.abs(ours - r.grandTotalInPaise) > Math.max(100, r.grandTotalInPaise * 0.005))
      warnings.push(
        `The items add up to ₹${(ours / 100).toLocaleString('en-IN')} but the bill says ₹${(r.grandTotalInPaise / 100).toLocaleString('en-IN')}. Check the quantities and rates.`,
      );
  }
  return { form: next, warnings };
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
