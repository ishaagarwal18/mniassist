import type { ChipTone } from '../../ui/chip';
import {
  AcceptanceTestKind,
  AcceptanceTestStatus,
  AcceptanceTestItemDto,
  TestItemResult,
} from '../../proxy/project-billing/acceptance-test.service';

export const TEST_KIND_TEXT: Record<AcceptanceTestKind, string> = {
  [AcceptanceTestKind.Fat]: 'Factory acceptance test (FAT)',
  [AcceptanceTestKind.Sat]: 'Site acceptance test (SAT)',
  [AcceptanceTestKind.Commissioning]: 'Commissioning',
};

export const TEST_STATUS_TEXT: Record<AcceptanceTestStatus, string> = {
  [AcceptanceTestStatus.Draft]: 'Draft',
  [AcceptanceTestStatus.InProgress]: 'In progress',
  [AcceptanceTestStatus.SentForSignature]: 'Sent for signature',
  [AcceptanceTestStatus.Signed]: 'Signed',
  [AcceptanceTestStatus.Reissued]: 'Replaced',
};

export const TEST_STATUS_TONE: Record<AcceptanceTestStatus, ChipTone> = {
  [AcceptanceTestStatus.Draft]: 'neutral',
  [AcceptanceTestStatus.InProgress]: 'amber',
  [AcceptanceTestStatus.SentForSignature]: 'teal',
  [AcceptanceTestStatus.Signed]: 'good',
  [AcceptanceTestStatus.Reissued]: 'neutral',
};

/** A checklist row as edited: result, remark and, for a failed item, the punch details. */
export interface ResultRow {
  itemId: string;
  text: string;
  result: TestItemResult;
  remark: string;
  critical: boolean;
  dueOn: string;
  closedOn: string | null;
}

export function resultRowOf(i: AcceptanceTestItemDto): ResultRow {
  return {
    itemId: i.id,
    text: i.text,
    result: i.result,
    remark: i.remark ?? '',
    critical: i.punchCritical,
    dueOn: i.punchDueOn ? i.punchDueOn.slice(0, 10) : '',
    closedOn: i.punchClosedOn ?? null,
  };
}

/** What stops a test going for signature, or null: every item recorded, no open critical punch item. */
export function signatureProblem(rows: readonly ResultRow[]): string | null {
  if (!rows.length) return 'The checklist is empty.';
  const pending = rows.filter((r) => r.result === TestItemResult.Pending).length;
  if (pending) return `${pending} items have no result yet.`;
  const critical = rows.find((r) => r.result === TestItemResult.Fail && r.critical && !r.closedOn);
  if (critical) return `The punch item "${critical.text}" is critical: close it first.`;
  return null;
}
