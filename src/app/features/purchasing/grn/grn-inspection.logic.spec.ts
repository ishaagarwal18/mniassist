import { describe, expect, it } from 'vitest';

import type { GoodsReceiptNoteDto } from '../../../proxy/purchasing/goods-receipt-note.models';
import { GrnStatus, QcInspectionStatus } from '../../../proxy/purchasing/purchasing-enums';
import {
  canInspect,
  inspectionRows,
  qcResult,
  toCompleteInspectionDto,
  validateInspection,
} from './grn-inspection.logic';

const grn = {
  status: GrnStatus.UnderInspection,
  lines: [
    {
      id: 'l1',
      partNumber: 'BLT-16',
      description: 'Bolt',
      receivedQuantity: 200,
      storageBin: 'BIN-A1',
    },
    { id: 'l2', partNumber: 'NUT-16', description: 'Nut', receivedQuantity: 50 },
  ],
} as unknown as GoodsReceiptNoteDto;

describe('GRN inspection', () => {
  it('can inspect drafts and receipts under QC only', () => {
    expect(canInspect({ status: GrnStatus.Draft })).toBe(true);
    expect(canInspect({ status: GrnStatus.UnderInspection })).toBe(true);
    expect(canInspect({ status: GrnStatus.Approved })).toBe(false);
  });

  it('starts with everything accepted into the gate bin', () => {
    const rows = inspectionRows(grn);
    expect(rows[0]).toMatchObject({ accepted: 200, rejected: 0, storageBin: 'BIN-A1' });
    expect(qcResult(rows)).toBe(QcInspectionStatus.Passed);
  });

  it('works out the result from the lines', () => {
    const rows = inspectionRows(grn);
    rows[0] = { ...rows[0], accepted: 185, rejected: 15 };
    expect(qcResult(rows)).toBe(QcInspectionStatus.PartiallyPassed);
    expect(qcResult(rows.map((r) => ({ ...r, accepted: 0, rejected: r.received })))).toBe(
      QcInspectionStatus.Failed,
    );
  });

  it('needs the inspector, quantities that add up and a reason for rejections', () => {
    const rows = inspectionRows(grn);
    rows[0] = { ...rows[0], accepted: 185, rejected: 15 };
    rows[1] = { ...rows[1], accepted: 40, rejected: 0 };
    const e = validateInspection('', rows);
    expect(Object.keys(e).sort()).toEqual(['inspector', 'reason.0', 'row.1']);
  });

  it('builds the API input', () => {
    const rows = inspectionRows(grn);
    rows[0] = { ...rows[0], accepted: 185, rejected: 15, rejectionReason: ' Pitch ' };
    const dto = toCompleteInspectionDto('Ramesh', 'Sampled', rows);
    expect(dto.qcStatus).toBe(QcInspectionStatus.PartiallyPassed);
    expect(dto.inspectorNotes).toBe('Ramesh: Sampled');
    expect(dto.lineInspections[0]).toEqual({
      lineId: 'l1',
      acceptedQuantity: 185,
      rejectedQuantity: 15,
      storageBin: 'BIN-A1',
      rejectionReason: 'Pitch',
    });
    expect(dto.lineInspections[1].rejectionReason).toBeUndefined();
  });
});
