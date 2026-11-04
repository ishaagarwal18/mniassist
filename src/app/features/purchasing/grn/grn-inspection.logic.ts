import {
  CompleteQcInspectionDto,
  GoodsReceiptNoteDto,
  GrnStatus,
  QcInspectionStatus,
} from '../../../proxy/purchasing';

/** One received line as the inspector records it. */
export interface InspectionRow {
  lineId: string;
  partNumber: string;
  description: string;
  unit: string;
  received: number;
  accepted: number;
  rejected: number;
  storageBin: string;
  rejectionReason: string;
}

/** The API accepts an inspection only on draft or under-inspection receipts. */
export function canInspect(g: Pick<GoodsReceiptNoteDto, 'status'>): boolean {
  return g.status === GrnStatus.Draft || g.status === GrnStatus.UnderInspection;
}

/** Starts with everything accepted, into the bin the gate entry gave. */
export function inspectionRows(g: GoodsReceiptNoteDto): InspectionRow[] {
  return g.lines.map((l) => ({
    lineId: l.id ?? '',
    partNumber: l.partNumber,
    description: l.description,
    unit: l.unitOfMeasure ?? 'NOS',
    received: l.receivedQuantity,
    accepted: l.receivedQuantity,
    rejected: 0,
    storageBin: l.storageBin ?? '',
    rejectionReason: '',
  }));
}

/** The receipt's QC result from its lines: all accepted passes, none accepted fails, otherwise partly. */
export function qcResult(rows: readonly InspectionRow[]): QcInspectionStatus {
  if (rows.every((r) => r.rejected === 0)) return QcInspectionStatus.Passed;
  if (rows.some((r) => r.accepted > 0)) return QcInspectionStatus.PartiallyPassed;
  return QcInspectionStatus.Failed;
}

export function validateInspection(
  inspector: string,
  rows: readonly InspectionRow[],
): Record<string, string> {
  const e: Record<string, string> = {};
  if (!inspector.trim()) e['inspector'] = 'Enter who inspected the goods.';
  rows.forEach((r, i) => {
    if (r.accepted < 0 || r.rejected < 0) e[`row.${i}`] = "Quantities can't be negative.";
    else if (Math.abs(r.accepted + r.rejected - r.received) > 1e-9)
      e[`row.${i}`] = `Accepted and rejected must add up to the ${r.received} received.`;
    else if (r.rejected > 0 && !r.rejectionReason.trim())
      e[`reason.${i}`] = 'Say why it was rejected.';
  });
  return e;
}

export function toCompleteInspectionDto(
  inspector: string,
  remarks: string,
  rows: readonly InspectionRow[],
): CompleteQcInspectionDto {
  const notes = [inspector.trim(), remarks.trim()].filter(Boolean).join(': ');
  return {
    qcStatus: qcResult(rows),
    inspectorNotes: notes || undefined,
    lineInspections: rows.map((r) => ({
      lineId: r.lineId,
      acceptedQuantity: r.accepted,
      rejectedQuantity: r.rejected,
      storageBin: r.storageBin.trim() || undefined,
      rejectionReason: r.rejected > 0 ? r.rejectionReason.trim() || undefined : undefined,
    })),
  };
}
