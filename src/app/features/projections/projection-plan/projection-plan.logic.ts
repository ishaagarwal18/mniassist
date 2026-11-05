import {
  BusinessLine,
  CreateUpdateProjectionPlanItemDto,
  ProjectionPlanItemDto,
} from '../../../proxy/projections';

/** How a year's revenue is spread over business lines by default (the same mix the API uses when it generates a plan). */
export const LINE_MIX: {
  line: BusinessLine;
  name: string;
  share: number;
  margin: number;
  opexShare: number;
  hours: number;
}[] = [
  {
    line: BusinessLine.TurnkeyAutomation,
    name: 'Turnkey automation & panels',
    share: 0.4,
    margin: 0.28,
    opexShare: 0.08,
    hours: 450,
  },
  {
    line: BusinessLine.DrivesAndMotors,
    name: 'Drives, VFDs & motion',
    share: 0.25,
    margin: 0.22,
    opexShare: 0.05,
    hours: 180,
  },
  {
    line: BusinessLine.Instrumentation,
    name: 'Instrumentation & sensors',
    share: 0.15,
    margin: 0.3,
    opexShare: 0.04,
    hours: 120,
  },
  {
    line: BusinessLine.AmcAndServices,
    name: 'AMC & field service',
    share: 0.12,
    margin: 0.45,
    opexShare: 0.1,
    hours: 320,
  },
  {
    line: BusinessLine.SparesAndConsumables,
    name: 'Spares & consumables',
    share: 0.08,
    margin: 0.35,
    opexShare: 0.03,
    hours: 80,
  },
];

export function lineName(line: BusinessLine): string {
  return LINE_MIX.find((l) => l.line === line)?.name ?? 'Other';
}

/** The Indian fiscal year a date falls in: April to March, as "2026-27". */
export function fiscalYearOf(date: Date): string {
  const start = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

/** The next two fiscal years, this one and the last one, newest first. */
export function fiscalYearOptions(today: Date): string[] {
  const start = Number(fiscalYearOf(today).slice(0, 4));
  return [start + 2, start + 1, start, start - 1].map(
    (y) => `${y}-${String((y + 1) % 100).padStart(2, '0')}`,
  );
}

/** The four quarters of a fiscal year, labelled as the API labels them. */
export function quartersOf(fy: string): { label: string; start: string; end: string }[] {
  const y = Number(fy.slice(0, 4));
  const iso = (year: number, month: number) => new Date(Date.UTC(year, month, 1)).toISOString();
  return [
    { label: `Q1 FY${fy} (Apr–Jun)`, start: iso(y, 3), end: iso(y, 6) },
    { label: `Q2 FY${fy} (Jul–Sep)`, start: iso(y, 6), end: iso(y, 9) },
    { label: `Q3 FY${fy} (Oct–Dec)`, start: iso(y, 9), end: iso(y + 1, 0) },
    { label: `Q4 FY${fy} (Jan–Mar)`, start: iso(y + 1, 0), end: iso(y + 1, 3) },
  ];
}

/** A number typed with commas, spaces or a rupee sign; NaN when it is not one. */
export function parseNumber(text: string): number {
  const cleaned = String(text).replace(/[₹,\s]/g, '');
  if (cleaned === '') return NaN;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

/** A plan's line as edited: rupees and percent as typed. */
export interface PlanRow {
  key: string;
  periodLabel: string;
  periodStartDate: string;
  periodEndDate: string;
  businessLine: BusinessLine;
  revenue: string;
  margin: string;
  /** Operating cost as a share of revenue, kept as it was. */
  opexShare: number;
  hours: number;
}

type RowShape = Omit<PlanRow, 'key' | 'revenue' | 'margin'>;

function item(
  row: RowShape,
  revenuePaise: number,
  marginPct: number,
): CreateUpdateProjectionPlanItemDto {
  const revenue = Math.max(0, Math.round(revenuePaise));
  const margin = Math.min(95, Math.max(0, marginPct)) / 100;
  return {
    periodLabel: row.periodLabel,
    periodStartDate: row.periodStartDate,
    periodEndDate: row.periodEndDate,
    businessLine: row.businessLine,
    projectedRevenueInPaise: revenue,
    projectedCogsInPaise: Math.round(revenue * (1 - margin)),
    projectedOperatingExpensesInPaise: Math.round(revenue * row.opexShare),
    conservativeRevenueInPaise: Math.round(revenue * 0.85),
    optimisticRevenueInPaise: Math.round(revenue * 1.15),
    capacityHoursRequired: row.hours,
  };
}

/**
 * A year's lines from one annual figure: a quarter each, split across business lines by the default mix, with each line's margin
 * scaled so the whole comes to the gross margin asked for.
 */
export function itemsFromAnnualTarget(
  fy: string,
  annualRupees: number,
  grossMarginPct: number,
): CreateUpdateProjectionPlanItemDto[] {
  const blended = LINE_MIX.reduce((sum, l) => sum + l.share * l.margin, 0);
  const scale = blended > 0 ? grossMarginPct / 100 / blended : 1;
  const quarterly = (annualRupees * 100) / 4;
  return quartersOf(fy).flatMap((q) =>
    LINE_MIX.map((l) =>
      item(
        {
          periodLabel: q.label,
          periodStartDate: q.start,
          periodEndDate: q.end,
          businessLine: l.line,
          opexShare: l.opexShare,
          hours: l.hours,
        },
        quarterly * l.share,
        l.margin * scale * 100,
      ),
    ),
  );
}

export function rowsOf(items: ProjectionPlanItemDto[]): PlanRow[] {
  return items.map((i, n) => ({
    key: i.id ?? String(n),
    periodLabel: i.periodLabel,
    periodStartDate: i.periodStartDate,
    periodEndDate: i.periodEndDate,
    businessLine: i.businessLine,
    revenue: String(Math.round(i.projectedRevenueInPaise / 100)),
    margin: String(Math.round((i.projectedMarginPercent ?? 0) * 10) / 10),
    opexShare:
      i.projectedRevenueInPaise > 0
        ? i.projectedOperatingExpensesInPaise / i.projectedRevenueInPaise
        : 0,
    hours: i.capacityHoursRequired,
  }));
}

/** What is wrong with the edited lines, or null. */
export function rowsProblem(rows: PlanRow[]): string | null {
  for (const r of rows) {
    const rev = parseNumber(r.revenue);
    const m = parseNumber(r.margin);
    const where = `${r.periodLabel}, ${lineName(r.businessLine)}`;
    if (!Number.isFinite(rev) || rev < 0) return `${where}: revenue must be a number of rupees.`;
    if (!Number.isFinite(m) || m < 0 || m > 95) return `${where}: margin must be 0 to 95%.`;
  }
  return null;
}

export function itemsOfRows(rows: PlanRow[]): CreateUpdateProjectionPlanItemDto[] {
  return rows.map((r) => item(r, parseNumber(r.revenue) * 100, parseNumber(r.margin)));
}

/** What stops a new plan being made, or null. */
export function newPlanProblem(
  title: string,
  annualRupees: string,
  marginPct: string,
): string | null {
  if (!title.trim()) return 'Give the plan a name.';
  const a = parseNumber(annualRupees);
  if (!Number.isFinite(a) || a <= 0) return 'Enter the year’s revenue target in rupees.';
  const m = parseNumber(marginPct);
  if (!Number.isFinite(m) || m < 0 || m > 95) return 'Gross margin must be 0 to 95%.';
  return null;
}

export function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;
}
