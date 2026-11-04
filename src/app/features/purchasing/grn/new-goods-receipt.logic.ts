import type { PurchaseOrderDto } from '../../../proxy/inventory/purchasing.service';
import type { CreateGoodsReceiptNoteDto } from '../../../proxy/purchasing';

/** One line of goods received at the gate. `orderedQuantity` is set only for lines from a purchase order. */
export interface GrnFormLine {
  purchaseOrderLineId?: string;
  productId?: string;
  partNumber: string;
  description: string;
  orderedQuantity: number | null;
  challanQuantity: number;
  receivedQuantity: number;
  unitOfMeasure: string;
  storageBin: string;
  batchOrSerialNumber: string;
}

export interface GrnForm {
  supplierId: string;
  supplierName: string;
  purchaseOrderId: string;
  purchaseOrderReference: string;
  locationId: string;
  locationName: string;
  challanNumber: string;
  /** yyyy-MM-dd */
  challanDate: string;
  gateEntryNumber: string;
  /** yyyy-MM-ddTHH:mm, local time */
  gateInTime: string;
  vehicleNumber: string;
  transporterName: string;
  remarks: string;
  lines: GrnFormLine[];
}

/** What is wrong with the form, by field (`line.<i>.<field>` for lines). Empty when it can be saved. */
export type GrnFormErrors = Record<string, string>;

export const GRN_UNITS = ['NOS', 'SET', 'KG', 'MTR', 'LTR', 'BOX', 'PAIR', 'LOT'] as const;

export function blankGrnLine(): GrnFormLine {
  return {
    partNumber: '',
    description: '',
    orderedQuantity: null,
    challanQuantity: 1,
    receivedQuantity: 1,
    unitOfMeasure: 'NOS',
    storageBin: '',
    batchOrSerialNumber: '',
  };
}

/** The open quantities of a purchase order, as lines to receive: what the challan should carry. */
export function linesFromOrder(po: PurchaseOrderDto): GrnFormLine[] {
  return po.lines
    .filter((l) => l.outstanding > 0)
    .map((l) => ({
      purchaseOrderLineId: l.id,
      productId: l.productId,
      partNumber: l.partNumber,
      description: l.description,
      orderedQuantity: l.quantity,
      challanQuantity: l.outstanding,
      receivedQuantity: l.outstanding,
      unitOfMeasure: 'NOS',
      storageBin: '',
      batchOrSerialNumber: '',
    }));
}

/** A line the user left untouched (no part number, no description) is ignored rather than refused. */
function isBlank(l: GrnFormLine): boolean {
  return !l.partNumber.trim() && !l.description.trim();
}

export function validateGrnForm(f: GrnForm): GrnFormErrors {
  const errors: GrnFormErrors = {};
  if (!f.supplierId) errors['supplier'] = 'Pick the supplier the goods came from.';
  if (!f.challanNumber.trim())
    errors['challanNumber'] = "Enter the supplier's delivery challan number.";
  const lines = f.lines.map((l, i) => ({ l, i })).filter(({ l }) => !isBlank(l));
  if (!lines.length) errors['lines'] = 'Add at least one item received.';
  for (const { l, i } of lines) {
    if (!l.partNumber.trim()) errors[`line.${i}.partNumber`] = 'Part number is needed.';
    if (!(l.receivedQuantity > 0)) errors[`line.${i}.receivedQuantity`] = 'More than zero.';
    if (l.challanQuantity < 0) errors[`line.${i}.challanQuantity`] = "Can't be negative.";
  }
  return errors;
}

/** How many fewer arrived than the challan says (0 when none short). */
export function shortBy(l: GrnFormLine): number {
  return Math.max(0, (l.challanQuantity || 0) - (l.receivedQuantity || 0));
}

export function toCreateGrnDto(f: GrnForm): CreateGoodsReceiptNoteDto {
  const opt = (s: string) => s.trim() || undefined;
  return {
    supplierId: f.supplierId,
    supplierName: f.supplierName,
    purchaseOrderId: f.purchaseOrderId || undefined,
    purchaseOrderReference: opt(f.purchaseOrderReference),
    locationId: f.locationId || undefined,
    locationName: f.locationId ? opt(f.locationName) : undefined,
    challanNumber: f.challanNumber.trim(),
    challanDateUtc: f.challanDate ? new Date(f.challanDate).toISOString() : undefined,
    gateEntryNumber: opt(f.gateEntryNumber),
    gateInTimeUtc: f.gateInTime ? new Date(f.gateInTime).toISOString() : undefined,
    vehicleNumber: opt(f.vehicleNumber.toUpperCase()),
    transporterName: opt(f.transporterName),
    remarks: opt(f.remarks),
    lines: f.lines
      .filter((l) => !isBlank(l))
      .map((l) => ({
        purchaseOrderLineId: l.purchaseOrderLineId,
        productId: l.productId,
        partNumber: l.partNumber.trim(),
        description: l.description.trim() || l.partNumber.trim(),
        orderedQuantity: l.orderedQuantity ?? l.challanQuantity,
        challanQuantity: l.challanQuantity,
        receivedQuantity: l.receivedQuantity,
        unitOfMeasure: l.unitOfMeasure,
        storageBin: opt(l.storageBin),
        batchOrSerialNumber: opt(l.batchOrSerialNumber),
      })),
  };
}

/** `yyyy-MM-ddTHH:mm` in local time, for a datetime-local input. */
export function localDateTime(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
