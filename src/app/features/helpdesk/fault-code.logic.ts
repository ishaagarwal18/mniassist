import {
  FaultCheckDto,
  FaultCheckRole,
  FaultCodeSource,
  FaultCodeState,
  FaultExtractionState,
  FaultSeverity,
  SaveFaultCodeInput,
} from '../../proxy/support/fault-code.service';
import type { ChipTone } from '../../ui/chip';

export const STATE_TEXT: Record<FaultCodeState, string> = {
  [FaultCodeState.Draft]: 'Draft',
  [FaultCodeState.Approved]: 'Approved',
  [FaultCodeState.Retired]: 'Retired',
};

export const STATE_TONE: Record<FaultCodeState, ChipTone> = {
  [FaultCodeState.Draft]: 'amber',
  [FaultCodeState.Approved]: 'good',
  [FaultCodeState.Retired]: 'neutral',
};

export const SOURCE_TEXT: Record<FaultCodeSource, string> = {
  [FaultCodeSource.Typed]: 'Typed',
  [FaultCodeSource.Imported]: 'Imported',
  [FaultCodeSource.Manual]: 'OEM manual',
  [FaultCodeSource.Learned]: 'Learned from tickets',
};

export const ROLE_TEXT: Record<FaultCheckRole, string> = {
  [FaultCheckRole.Operator]: 'Operator',
  [FaultCheckRole.Electrician]: 'Electrician only',
  [FaultCheckRole.Engineer]: 'Engineer only',
};

export const EXTRACTION_TEXT: Record<FaultExtractionState, string> = {
  [FaultExtractionState.Queued]: 'Waiting',
  [FaultExtractionState.Reading]: 'Reading',
  [FaultExtractionState.Done]: 'Done',
  [FaultExtractionState.Failed]: 'Failed',
};

/** The CSV template's header and one example row, for the download. The example is made up, not from any manual. */
export const CSV_TEMPLATE =
  'make,series,code,aliases,title,severity,causes,checks,safety note,spares,call an engineer when\n' +
  'ABB,ACS580,2310,F2310;Overcurrent,Overcurrent,stop,Acceleration time too short|Motor cable or motor fault,' +
  'Check the acceleration time setting|Megger test the motor cable [electrician],' +
  'Isolate and wait 5 minutes for the DC bus to discharge before opening the drive,,' +
  'Fault returns after reset with no load\n';

export function blankEntry(): SaveFaultCodeInput {
  return {
    make: '',
    series: '',
    code: '',
    aliases: [],
    title: '',
    severity: FaultSeverity.StopsMachine,
    causes: [''],
    checks: [{ text: '', role: FaultCheckRole.Operator }],
    safetyNote: '',
    sparePartNumbers: [],
    escalateWhen: '',
  };
}

/** "F2310; Overcurrent" → ["F2310", "Overcurrent"]. */
export function splitList(value: string): string[] {
  return value
    .split(/[;,]/)
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

/** What the server would refuse before an entry is sent, or what stops it being approved later. */
export function entryProblem(e: SaveFaultCodeInput): string | null {
  if (!e.make.trim()) return 'Enter the make.';
  if (!e.code.trim()) return 'Enter the code.';
  if (!/[a-z0-9]/i.test(e.code)) return 'The code needs letters or digits.';
  if (!e.title.trim()) return 'Enter a title.';
  if (e.causes.filter((c) => c.trim()).length > 8) return 'At most 8 causes.';
  if (e.checks.filter((c) => c.text.trim()).length > 10) return 'At most 10 checks.';
  return null;
}

export function approvalWarning(e: SaveFaultCodeInput): string | null {
  const hasContent = e.causes.some((c) => c.trim()) || e.checks.some((c) => c.text.trim());
  if (!hasContent) return 'Add at least one cause or check before approving.';
  if (e.severity === FaultSeverity.StopsMachine && !(e.safetyNote ?? '').trim())
    return 'A code that stops the machine needs a safety note before it can be approved.';
  return null;
}

/** The entry as sent: blanks dropped, series and notes null when empty. */
export function cleanEntry(e: SaveFaultCodeInput): SaveFaultCodeInput {
  const blank = (v: string | null | undefined) => ((v ?? '').trim() ? (v ?? '').trim() : null);
  return {
    ...e,
    make: e.make.trim(),
    series: blank(e.series),
    code: e.code.trim(),
    title: e.title.trim(),
    causes: e.causes.map((c) => c.trim()).filter((c) => c),
    checks: e.checks
      .map((c): FaultCheckDto => ({ text: c.text.trim(), role: +c.role }))
      .filter((c) => c.text),
    aliases: e.aliases.map((a) => a.trim()).filter((a) => a),
    sparePartNumbers: e.sparePartNumbers.map((a) => a.trim()).filter((a) => a),
    severity: +e.severity,
    safetyNote: blank(e.safetyNote),
    escalateWhen: blank(e.escalateWhen),
  };
}
