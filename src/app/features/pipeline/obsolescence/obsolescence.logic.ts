import type { ChipTone } from '../../../ui';
import {
  LifecycleAccessoryDto,
  LifecycleStage,
  MigrationState,
  RadarRowDto,
  ReplacementRelation,
  RiskBand,
} from '../../../proxy/pipeline/obsolescence.service';

export const STAGES: readonly LifecycleStage[] = [
  LifecycleStage.Active,
  LifecycleStage.PhaseOut,
  LifecycleStage.LastBuy,
  LifecycleStage.Discontinued,
  LifecycleStage.EndOfSupport,
];

const STAGE_LABEL: Record<LifecycleStage, string> = {
  [LifecycleStage.Active]: 'Active',
  [LifecycleStage.PhaseOut]: 'Phase-out',
  [LifecycleStage.LastBuy]: 'Last-buy',
  [LifecycleStage.Discontinued]: 'Discontinued',
  [LifecycleStage.EndOfSupport]: 'End of support',
};

const STAGE_TONE: Record<LifecycleStage, ChipTone> = {
  [LifecycleStage.Active]: 'good',
  [LifecycleStage.PhaseOut]: 'amber',
  [LifecycleStage.LastBuy]: 'warn',
  [LifecycleStage.Discontinued]: 'bad',
  [LifecycleStage.EndOfSupport]: 'bad',
};

export const RELATIONS: readonly ReplacementRelation[] = [
  ReplacementRelation.DirectSwap,
  ReplacementRelation.NeedsAdapter,
  ReplacementRelation.NeedsReengineering,
];

const RELATION_LABEL: Record<ReplacementRelation, string> = {
  [ReplacementRelation.DirectSwap]: 'Direct swap',
  [ReplacementRelation.NeedsAdapter]: 'Needs adapter',
  [ReplacementRelation.NeedsReengineering]: 'Needs re-engineering',
};

const BAND_LABEL: Record<RiskBand, string> = {
  [RiskBand.Low]: 'Low',
  [RiskBand.Medium]: 'Medium',
  [RiskBand.High]: 'High',
};

const BAND_TONE: Record<RiskBand, ChipTone> = {
  [RiskBand.Low]: 'neutral',
  [RiskBand.Medium]: 'warn',
  [RiskBand.High]: 'bad',
};

const STATE_LABEL: Record<MigrationState, string> = {
  [MigrationState.None]: 'None',
  [MigrationState.Notified]: 'Notified',
  [MigrationState.EnquiryOpen]: 'Enquiry open',
  [MigrationState.Quoted]: 'Quoted',
  [MigrationState.Won]: 'Won',
  [MigrationState.Lost]: 'Lost',
  [MigrationState.Dismissed]: 'Dismissed',
};

/** The reasons offered when a row is taken off the radar (spec); any other can be typed. */
export const DISMISS_REASONS: readonly string[] = [
  'Customer already migrating',
  'Machine to be scrapped',
  'Not our customer any more',
];

export const stageText = (s: LifecycleStage): string => STAGE_LABEL[s] ?? String(s);
export const stageTone = (s: LifecycleStage): ChipTone => STAGE_TONE[s] ?? 'neutral';
export const relationText = (r: ReplacementRelation): string => RELATION_LABEL[r] ?? String(r);
export const bandText = (b: RiskBand): string => BAND_LABEL[b] ?? String(b);
export const bandTone = (b: RiskBand): ChipTone => BAND_TONE[b] ?? 'neutral';
export const stateText = (s: MigrationState): string => STATE_LABEL[s] ?? String(s);

/** A band from the URL (?band=High) or a select value ("2"); null when it is neither. */
export function parseBand(value: string | null | undefined): RiskBand | null {
  if (value === null || value === undefined || value === '') return null;
  const byName = (Object.keys(BAND_LABEL) as unknown as RiskBand[]).find(
    (b) => BAND_LABEL[b].toLowerCase() === value.toLowerCase(),
  );
  if (byName !== undefined) return Number(byName) as RiskBand;
  const n = Number(value);
  return n in BAND_LABEL ? (n as RiskBand) : null;
}

export interface RadarSite {
  key: string;
  site: string;
  city: string | null;
  rows: RadarRowDto[];
  /** A site's score is its highest component score. */
  score: number;
}

export interface RadarAccount {
  contactId: string;
  account: string;
  sites: RadarSite[];
  score: number;
  count: number;
}

/**
 * The radar's rows grouped by account and then by site, as the page shows them. Within a site the riskiest component comes first;
 * accounts and sites keep the order the API sent (account name, then site name).
 */
export function groupRadar(rows: readonly RadarRowDto[]): RadarAccount[] {
  const accounts = new Map<string, RadarAccount>();
  for (const row of rows) {
    let account = accounts.get(row.contactId);
    if (!account) {
      account = {
        contactId: row.contactId,
        account: row.accountName?.trim() || 'Unnamed account',
        sites: [],
        score: 0,
        count: 0,
      };
      accounts.set(row.contactId, account);
    }
    const siteName = row.siteName?.trim() || 'No site recorded';
    const key = `${row.contactId}|${siteName.toLowerCase()}`;
    let site = account.sites.find((s) => s.key === key);
    if (!site) {
      site = { key, site: siteName, city: row.siteCity?.trim() || null, rows: [], score: 0 };
      account.sites.push(site);
    }
    site.rows.push(row);
    site.score = Math.max(site.score, row.score);
    account.score = Math.max(account.score, row.score);
    account.count++;
  }
  for (const account of accounts.values()) {
    for (const site of account.sites) site.rows.sort((a, b) => b.score - a.score);
  }
  return [...accounts.values()];
}

/** "38 components at 12 sites are now at risk." — what a saved rule or import did. */
export function atRiskSentence(components: number, sites: number, announced = 0): string {
  const parts: string[] = [];
  if (components > 0) {
    parts.push(
      `${components} component${components === 1 ? '' : 's'} at ${sites} site${sites === 1 ? '' : 's'} ${components === 1 ? 'is' : 'are'} now at risk`,
    );
  } else {
    parts.push('No installed components are at risk from this');
  }
  if (announced > 0) {
    parts.push(`${announced} more ${announced === 1 ? 'is' : 'are'} announced for a later date`);
  }
  return parts.join('; ') + '.';
}

/** The maker's list the lifecycle import reads. */
export const LIFECYCLE_TEMPLATE = [
  'Make,Series,Part number,Stage,Effective on,Last-buy on,Replacement,Relation,Note,Source',
  'Siemens,S7-300,,Phase-out,01-10-2023,,S7-1500,Needs re-engineering,Plan migration with the customer,PM400 notice',
  'ABB,,ACS550-01-031A-4,Discontinued,01-12-2025,,ACS580-01-033A-4,Direct swap,,ABB notice 2025-11',
  '',
].join(String.fromCharCode(13, 10));

/** A yyyy-MM-dd date for an <input type="date"> from an API date-time. */
export function dateOnly(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : '';
}

/** "6ES7972-0BB12-0XA0 × 2, CABLE-1" as typed: one entry per comma or line, a quantity after x or × (1 when left out). */
export function parseAccessories(text: string): {
  items: LifecycleAccessoryDto[];
  problem: string | null;
} {
  const items: LifecycleAccessoryDto[] = [];
  for (const raw of text.split(/[,;\n]+/)) {
    const entry = raw.trim();
    if (!entry) continue;
    const m = /^(.+?)(?:\s*[x×*]\s*(\d+(?:\.\d+)?))?$/i.exec(entry);
    const part = m?.[1]?.trim() ?? '';
    const qty = m?.[2] === undefined ? 1 : Number(m[2]);
    if (!part || /\s/.test(part) || !(qty > 0)) {
      return {
        items: [],
        problem: `“${entry}” isn't a part number and quantity, such as 6ES7972-0BB12-0XA0 × 2.`,
      };
    }
    const same = items.find((i) => i.partNumber.toUpperCase() === part.toUpperCase());
    if (same) same.quantityPerUnit += qty;
    else items.push({ partNumber: part, quantityPerUnit: qty });
  }
  return { items, problem: null };
}

export function formatAccessories(
  items: readonly LifecycleAccessoryDto[] | null | undefined,
): string {
  return (items ?? []).map((a) => `${a.partNumber} × ${a.quantityPerUnit}`).join(', ');
}
