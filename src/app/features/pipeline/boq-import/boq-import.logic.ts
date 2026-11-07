import type { ChipTone } from '../../../ui/chip';
import {
  BoqConfidence,
  BoqImportDto,
  BoqImportLineDto,
  BoqImportState,
  BoqLineDecision,
  BoqMatchKind,
  BoqSheetMapDto,
} from '../../../proxy/pipeline/boq-import.service';

/** Files one import takes, as the API enforces. */
export const MAX_FILES = 12;

/** The file types the reader takes, for the file picker's `accept`. */
export const ACCEPT = '.xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png,.webp,.gif';

const EXTENSIONS = ['xlsx', 'xls', 'csv', 'pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif'];

/** Whether the reader can take a file, by its extension (the API checks again). */
export function isReadable(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return fileName.includes('.') && EXTENSIONS.includes(ext);
}

/** The size the API takes for a file: 5 MB for images, 10 MB for PDFs and sheets. */
export function maxBytes(fileName: string): number {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
}

export const STATE_LABEL: Record<BoqImportState, string> = {
  [BoqImportState.Uploading]: 'Adding files',
  [BoqImportState.Reading]: 'Reading',
  [BoqImportState.Review]: 'Ready to review',
  [BoqImportState.Drafted]: 'Quotation drafted',
  [BoqImportState.Failed]: 'Could not be read',
  [BoqImportState.Discarded]: 'Discarded',
  [BoqImportState.Mapping]: 'Choose the columns',
};

export const STATE_TONE: Record<BoqImportState, ChipTone> = {
  [BoqImportState.Uploading]: 'neutral',
  [BoqImportState.Reading]: 'ai',
  [BoqImportState.Review]: 'amber',
  [BoqImportState.Drafted]: 'good',
  [BoqImportState.Failed]: 'bad',
  [BoqImportState.Discarded]: 'neutral',
  [BoqImportState.Mapping]: 'amber',
};

/** The match chip: what was found and how. */
export function matchLabel(line: BoqImportLineDto): { label: string; tone: ChipTone } {
  if (line.decision === BoqLineDecision.Changed) return { label: 'Changed', tone: 'teal' };
  if (line.decision === BoqLineDecision.ManualPrice)
    return { label: 'Priced by hand', tone: 'teal' };
  switch (line.matchKind) {
    case BoqMatchKind.Exact:
      return line.confidence === BoqConfidence.High
        ? { label: 'Exact', tone: 'good' }
        : { label: 'Exact, check', tone: 'warn' };
    case BoqMatchKind.Search:
      return { label: 'Suggested', tone: 'amber' };
    default:
      return { label: 'Not found', tone: 'bad' };
  }
}

export const DECISION_LABEL: Record<BoqLineDecision, string> = {
  [BoqLineDecision.Pending]: 'To decide',
  [BoqLineDecision.Accepted]: 'Accepted',
  [BoqLineDecision.Changed]: 'Changed',
  [BoqLineDecision.Skipped]: 'Skipped',
  [BoqLineDecision.ManualPrice]: 'Priced by hand',
};

export type LineFilter = 'check' | 'notFound' | 'all';

/**
 * The lines to show. "Needs checking" is every line still to decide; a line decided a moment ago stays in view until the
 * filter is changed, so it doesn't jump away under the cursor.
 */
export function filterLines(
  lines: BoqImportLineDto[],
  filter: LineFilter,
  keep: ReadonlySet<string> = new Set(),
): BoqImportLineDto[] {
  switch (filter) {
    case 'check':
      return lines.filter((l) => l.decision === BoqLineDecision.Pending || keep.has(l.id));
    case 'notFound':
      return lines.filter((l) => l.matchKind === BoqMatchKind.None);
    default:
      return lines;
  }
}

/** The lines a "accept every suggestion" click would accept: pending lines that have something matched. */
export function acceptableSuggestions(lines: BoqImportLineDto[]): BoqImportLineDto[] {
  return lines.filter((l) => l.decision === BoqLineDecision.Pending && !!l.partNumber);
}

/** The summary line above the grid. */
export function summary(i: BoqImportDto): string {
  const parts = [
    `${i.lines.length} line${i.lines.length === 1 ? '' : 's'}`,
    `${i.matchedCount} matched`,
    `${i.suggestedCount} suggested`,
    `${i.notFoundCount} not found`,
  ];
  return parts.join(' · ');
}

/** What the progress panel says while the files are read. */
export function progress(i: BoqImportDto): string {
  const total = i.files.length;
  if (i.state === BoqImportState.Uploading) return 'Waiting to start';
  return total <= 1
    ? 'Reading the file and matching each line. A long BOQ takes a few minutes.'
    : `Reading file ${Math.min(i.filesRead + 1, total)} of ${total}. A long BOQ takes a few minutes.`;
}

/** Still being worked on in the background: the page keeps asking. */
export function isBusy(state: BoqImportState): boolean {
  return state === BoqImportState.Reading;
}

/** Rupees typed by hand ("1,250.50") as paise; null when it isn't a price. */
export function paiseOf(rupees: string): number | null {
  const n = Number(rupees.replace(/[,\s₹]/g, ''));
  return rupees.trim() !== '' && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

/** "2.4 MB", "380 KB". */
export function size(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// ---- Column mapping (slice 2) ----------------------------------------------------------------------------------------

export type ColumnRole = 'partNumber' | 'description' | 'quantity' | 'unit' | 'make';

/** What a column can be, in the order the picker offers them. */
export const COLUMN_ROLES: { role: ColumnRole; label: string }[] = [
  { role: 'partNumber', label: 'Part number' },
  { role: 'description', label: 'Description' },
  { role: 'quantity', label: 'Quantity' },
  { role: 'unit', label: 'Unit' },
  { role: 'make', label: 'Make' },
];

/** "A", "B" … "Z", "AA": the column's spreadsheet letter. */
export function columnLetter(index: number): string {
  let n = index + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** What a column is in a mapping, or null when it is ignored. */
export function roleOf(map: BoqSheetMapDto, column: number): ColumnRole | null {
  return COLUMN_ROLES.find((r) => map[r.role] === column)?.role ?? null;
}

/**
 * The mapping with `column` set to `role` (null ignores the column). Each role belongs to one column and each column to one
 * role, so whatever held either before lets go.
 */
export function assign(
  map: BoqSheetMapDto,
  column: number,
  role: ColumnRole | null,
): BoqSheetMapDto {
  const next: BoqSheetMapDto = { ...map };
  for (const r of COLUMN_ROLES) {
    if (next[r.role] === column) next[r.role] = null;
  }
  if (role) next[role] = column;
  return next;
}

/** What stops a sheet's mapping from being read; null when it can be. */
export function mapProblem(map: BoqSheetMapDto): string | null {
  if (!map.include) return null;
  if (map.partNumber == null && map.description == null)
    return `Sheet “${map.sheet}”: choose the part number or the description column.`;
  return null;
}
