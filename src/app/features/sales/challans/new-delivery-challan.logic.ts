import type { ProductDto } from '../../../proxy/library/product.service';
import type { CreateDeliveryChallanLineDto } from '../../../proxy/sales/delivery-challan.models';

/** One item on a new challan, as typed or picked from the catalogue. */
export interface ChallanLine {
  /** The product's name, as searched; not sent (the description carries it). */
  itemName: string;
  partNumber: string;
  description: string;
  hsnCode: string;
  quantity: number;
  unitOfMeasure: string;
  productId: string | null;
}

export const blankChallanLine = (): ChallanLine => ({
  itemName: '',
  partNumber: '',
  description: '',
  hsnCode: '',
  quantity: 1,
  unitOfMeasure: 'Nos',
  productId: null,
});

/** A line filled from a catalogue product: name, part number, description (the name when it has none), HSN and unit. */
export function challanLineFromProduct(p: ProductDto, current: ChallanLine): ChallanLine {
  const name = p.name?.trim() ?? '';
  return {
    ...current,
    itemName: name,
    partNumber: p.partNumber?.trim() ?? '',
    description: p.description?.trim() || name,
    hsnCode: p.hsnCode?.trim() ?? '',
    unitOfMeasure: p.unit?.trim() || current.unitOfMeasure,
    productId: p.id ?? null,
  };
}

/** Typing over a picked item's name or number makes it a hand-typed line again. */
export function editChallanLine(line: ChallanLine, patch: Partial<ChallanLine>): ChallanLine {
  const unlinks = 'itemName' in patch || 'partNumber' in patch;
  return { ...line, ...patch, ...(unlinks && line.productId ? { productId: null } : {}) };
}

/**
 * The units a line's select offers: the workspace's list (Settings → Pick lists), plus the catalogue's own unit when it is another.
 */
export function unitsFor(line: ChallanLine, units: readonly string[]): readonly string[] {
  const u = line.unitOfMeasure;
  return u && !units.includes(u) ? [...units, u] : units;
}

/** The lines worth sending: those with a name, number or description. */
export const filledChallanLines = (lines: readonly ChallanLine[]): ChallanLine[] =>
  lines.filter((l) => l.partNumber.trim() || l.description.trim() || l.itemName.trim());

/** The API lines; a missing part number or description borrows from the other (and the item name). */
export function toChallanLines(lines: readonly ChallanLine[]): CreateDeliveryChallanLineDto[] {
  return filledChallanLines(lines).map((l) => {
    const description = l.description.trim() || l.itemName.trim() || l.partNumber.trim();
    return {
      productId: l.productId ?? undefined,
      partNumber: l.partNumber.trim() || description,
      description,
      hsnCode: l.hsnCode.trim() || undefined,
      quantity: l.quantity,
      unitOfMeasure: l.unitOfMeasure,
    };
  });
}
