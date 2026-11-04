import { GrnStatus, QcInspectionStatus } from '../../../proxy/purchasing';
import type { ChipTone } from '../../../ui';

/** How a goods receipt's status and QC result read, and their chip colours. */
export function grnStatusChip(status: GrnStatus): { label: string; tone: ChipTone } {
  switch (status) {
    case GrnStatus.Approved:
      return { label: 'Approved', tone: 'good' };
    case GrnStatus.Billed:
      return { label: 'Billed', tone: 'teal' };
    case GrnStatus.UnderInspection:
      return { label: 'Under QC', tone: 'amber' };
    case GrnStatus.Rejected:
      return { label: 'Rejected', tone: 'bad' };
    case GrnStatus.Cancelled:
      return { label: 'Cancelled', tone: 'neutral' };
    default:
      return { label: 'Draft', tone: 'neutral' };
  }
}

export function qcChip(status: QcInspectionStatus): { label: string; tone: ChipTone } {
  switch (status) {
    case QcInspectionStatus.Passed:
      return { label: 'QC passed', tone: 'good' };
    case QcInspectionStatus.PartiallyPassed:
      return { label: 'Partly passed', tone: 'warn' };
    case QcInspectionStatus.Failed:
      return { label: 'QC failed', tone: 'bad' };
    default:
      return { label: 'Awaiting QC', tone: 'neutral' };
  }
}
