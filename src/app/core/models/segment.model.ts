/**
 * The audience-builder view models, the field catalogue the rule editor offers, and
 * the converter between the editor's tree and the `ruleJson` string the API stores.
 *
 * The API compiles `ruleJson` with `SegmentRuleCompiler` server-side. Its shape is a
 * tree of groups keyed by connective — `{ "all": [ … ], "not": [ … ] }` — where a
 * child is either a leaf clause (`{ field, op, value }`) or another group. The editor
 * works in a slightly friendlier shape (`{ mode, children }`); `ruleToJson` and
 * `ruleFromJson` are the single place the two meet.
 */

export type RuleOperator = 'eq' | 'ne' | 'in' | 'gte' | 'lte' | 'gt' | 'lt' | 'contains' | 'exists';

/** A single condition. `field` may be `attr:<key>` for a vertical attribute. */
export interface SegmentClause {
  readonly field: string;
  readonly op: RuleOperator;
  readonly value?: string;
  readonly values?: readonly string[];
}

/**
 * A group of conditions. `all` narrows, `any` widens, `not` excludes — and a group
 * may nest, which is what makes "in Gujarat, and either quoted-and-lapsed or never
 * replied" expressible as one segment.
 */
export interface SegmentGroup {
  readonly mode: 'all' | 'any' | 'not';
  readonly children: readonly (SegmentClause | SegmentGroup)[];
}

export function isGroup(node: SegmentClause | SegmentGroup): node is SegmentGroup {
  return (node as SegmentGroup).mode !== undefined;
}

export interface SegmentField {
  readonly value: string;
  readonly label: string;
  readonly group: string;
  readonly kind: 'text' | 'enum' | 'number' | 'days' | 'flag';
  readonly options?: readonly { readonly value: string; readonly label: string }[];
  /** Shown under the field picker so the meaning is not guessed from the name. */
  readonly hint?: string;
}

export interface SegmentCostLine {
  readonly category: string;
  readonly recipients: number;
  readonly rateInPaise: number;
  readonly estimatedTotalInPaise: number;
  readonly exceedsWalletBalance: boolean;
}

export interface SegmentSampleContact {
  readonly id: string;
  readonly name: string;
  readonly company?: string;
  readonly designation?: string;
  readonly city?: string;
  readonly lifecycle: string;
  readonly quotationState: string;
  readonly lastCampaignResponse: string;
  readonly canReceiveMarketing: boolean;
  readonly suppression: string;
}

export interface SegmentPreview {
  readonly totalMatching: number;
  readonly marketingEligible: number;
  readonly utilityEligible: number;
  readonly optedOut: number;
  readonly suppressed: number;
  readonly insideServiceWindow: number;
  /** True when the rule constrains nothing — the whole contact list. */
  readonly matchesEveryone: boolean;
  /** Conditions the server could not honour, in words. */
  readonly problems: readonly string[];
  readonly cost: readonly SegmentCostLine[];
  readonly sample: readonly SegmentSampleContact[];
}

export interface SavedSegment {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly rule: SegmentGroup;
  /** People added by hand, on top of whoever the rule matches. */
  readonly picked?: readonly PickedContact[];
  readonly cachedMemberCount: number;
  readonly isCountStale: boolean;
  readonly lastEvaluatedAt?: string;
}

// ---- The field catalogue ---------------------------------------------------

/**
 * What the rule builder offers. Grouped the way a salesperson thinks — who they
 * are, what they bought, how they reacted — rather than by which table the column
 * lives in. Every `value` here is a field name the server's `SegmentRuleCompiler`
 * recognises; an unknown field matches nobody and is reported, so the two lists
 * must stay in step.
 */
export const SEGMENT_FIELDS: readonly SegmentField[] = [
  { value: 'city', label: 'City', group: 'Who they are', kind: 'text' },
  { value: 'state', label: 'State', group: 'Who they are', kind: 'text' },
  { value: 'company', label: 'Company name', group: 'Who they are', kind: 'text' },
  { value: 'designation', label: 'Designation', group: 'Who they are', kind: 'text' },
  {
    value: 'role',
    label: 'Decision role',
    group: 'Who they are',
    kind: 'enum',
    options: [
      { value: 'Maintenance', label: 'Maintenance' },
      { value: 'Purchase', label: 'Purchase' },
      { value: 'Engineering', label: 'Engineering' },
      { value: 'PlantHead', label: 'Plant head' },
      { value: 'Dealer', label: 'Dealer' },
    ],
  },
  { value: 'tag', label: 'Tag', group: 'Who they are', kind: 'text' },
  {
    value: 'attr:plc_platform',
    label: 'PLC platform',
    group: 'Their plant',
    kind: 'enum',
    options: [
      { value: 'Siemens', label: 'Siemens' },
      { value: 'Rockwell', label: 'Rockwell' },
      { value: 'Mitsubishi', label: 'Mitsubishi' },
      { value: 'Delta', label: 'Delta' },
    ],
  },
  {
    value: 'attr:industry',
    label: 'Industry',
    group: 'Their plant',
    kind: 'enum',
    options: [
      { value: 'Pharma', label: 'Pharma' },
      { value: 'Food', label: 'Food & beverage' },
      { value: 'Textile', label: 'Textile' },
      { value: 'Auto', label: 'Automotive' },
    ],
  },
  {
    value: 'lifecycle',
    label: 'Lifecycle stage',
    group: 'Where they are',
    kind: 'enum',
    hint: 'Moves forward on its own as enquiries and quotations progress.',
    options: [
      { value: 'New', label: 'New' },
      { value: 'Engaged', label: 'Engaged' },
      { value: 'Enquired', label: 'Enquired' },
      { value: 'Quoted', label: 'Quoted' },
      { value: 'Customer', label: 'Customer' },
      { value: 'Lost', label: 'Lost' },
      { value: 'Dormant', label: 'Dormant' },
    ],
  },
  {
    value: 'quotationState',
    label: 'Quotation state',
    group: 'Where they are',
    kind: 'enum',
    hint: 'Expired means past validity with no answer — the best re-engagement list you have.',
    options: [
      { value: 'Draft', label: 'Draft' },
      { value: 'Issued', label: 'Issued' },
      { value: 'Revised', label: 'Revised' },
      { value: 'Won', label: 'Won' },
      { value: 'Lost', label: 'Lost' },
      { value: 'Expired', label: 'Expired' },
    ],
  },
  {
    value: 'campaignResponse',
    label: 'Last campaign response',
    group: 'How they react',
    kind: 'enum',
    hint: 'Ordered by strength, so “at least Read” is one condition rather than three.',
    options: [
      { value: 'NotTargeted', label: 'Never targeted' },
      { value: 'NotDelivered', label: 'Not delivered' },
      { value: 'Delivered', label: 'Delivered' },
      { value: 'Read', label: 'Read' },
      { value: 'Clicked', label: 'Clicked' },
      { value: 'Replied', label: 'Replied' },
    ],
  },
  {
    value: 'campaignsReceived',
    label: 'Campaigns received',
    group: 'How they react',
    kind: 'number',
    hint: 'Use with “exclude” to cap fatigue.',
  },
  {
    value: 'score',
    label: 'Engagement score',
    group: 'How they react',
    kind: 'number',
    hint: '0–100, from recency, campaign response and flow completion.',
  },
  {
    value: 'lastInboundDays',
    label: 'Days since they last wrote',
    group: 'How they react',
    kind: 'days',
    hint: '“At least” includes contacts who have never written at all.',
  },
  {
    value: 'inServiceWindow',
    label: 'Inside the 24-hour window',
    group: 'How they react',
    kind: 'flag',
    hint: 'Reachable with a free-form message right now, at no per-message cost.',
  },
];

/** The rule a fresh builder opens on: one AND group, no conditions. */
export const EMPTY_RULE: SegmentGroup = { mode: 'all', children: [] };

// ---- Tree ↔ ruleJson -----------------------------------------------------

/** The server field name for `lastInboundDays` and friends — the compiler lowercases. */
const CONNECTIVES = ['all', 'any', 'not'] as const;

function clauseToJson(clause: SegmentClause): Record<string, unknown> {
  const out: Record<string, unknown> = { field: clause.field, op: clause.op };
  if (clause.values && clause.values.length > 0) {
    out['values'] = [...clause.values];
  } else {
    out['value'] = clause.value ?? '';
  }
  return out;
}

function groupToJsonObject(group: SegmentGroup): Record<string, unknown> {
  return {
    [group.mode]: group.children.map((child) =>
      isGroup(child) ? groupToJsonObject(child) : clauseToJson(child),
    ),
  };
}

/**
 * Serialises the editor tree to the `ruleJson` the API stores. An empty top group
 * becomes `{}` — the compiler reads that as "everyone", which the preview then shows
 * as a hazard before anything is sent.
 */
export function ruleToJson(group: SegmentGroup): string {
  if (group.children.length === 0) {
    return '{}';
  }
  return JSON.stringify(groupToJsonObject(group));
}

function nodeFromJson(raw: unknown): SegmentClause | SegmentGroup | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  if (CONNECTIVES.some((k) => Array.isArray(obj[k]))) {
    return groupFromJsonObject(obj);
  }
  if (typeof obj['field'] !== 'string') {
    return null;
  }
  const clause: SegmentClause = {
    field: obj['field'] as string,
    op: (typeof obj['op'] === 'string' ? obj['op'] : 'eq') as RuleOperator,
  };
  if (Array.isArray(obj['values'])) {
    return { ...clause, values: (obj['values'] as unknown[]).map((v) => String(v)) };
  }
  return { ...clause, value: obj['value'] != null ? String(obj['value']) : '' };
}

function groupFromJsonObject(obj: Record<string, unknown>): SegmentGroup | null {
  const mode = CONNECTIVES.find((k) => Array.isArray(obj[k]));
  if (!mode) {
    return null;
  }
  const children = (obj[mode] as unknown[])
    .map(nodeFromJson)
    .filter((n): n is SegmentClause | SegmentGroup => n !== null);

  // The server shape allows `all` and `not` as siblings on the same object. The
  // editor only nests, so fold a sibling `not` into an explicit exclusion group
  // rather than dropping it silently.
  if (mode !== 'not' && Array.isArray(obj['not'])) {
    const excluded = (obj['not'] as unknown[])
      .map(nodeFromJson)
      .filter((n): n is SegmentClause | SegmentGroup => n !== null);
    if (excluded.length > 0) {
      return { mode, children: [...children, { mode: 'not', children: excluded }] };
    }
  }

  return { mode, children };
}

/** A contact added to an audience by hand, with the name it was picked under. */
export interface PickedContact {
  readonly id: string;
  readonly label: string;
}

/**
 * The stored rule for an audience: hand-picked people, plus anyone the rule matches.
 * Either can be empty. Names ride along in `labels` (the server ignores them) so the
 * list can be shown again without looking every contact up.
 */
export function audienceToJson(rule: SegmentGroup, picked: readonly PickedContact[]): string {
  if (picked.length === 0) return ruleToJson(rule);
  const people = {
    field: 'contact',
    op: 'in',
    values: picked.map((p) => p.id),
    labels: picked.map((p) => p.label),
  };
  if (rule.children.length === 0) return JSON.stringify({ all: [people] });
  return JSON.stringify({ any: [people, groupToJsonObject(rule)] });
}

/** Splits a stored audience back into its hand-picked people and its rule. */
export function audienceFromJson(json: string | null | undefined): {
  rule: SegmentGroup;
  picked: PickedContact[];
} {
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse((json ?? '').trim() || '{}');
  } catch {
    parsed = null;
  }
  const isPeople = (n: unknown): n is { values: unknown[]; labels?: unknown[] } =>
    !!n &&
    typeof n === 'object' &&
    (n as Record<string, unknown>)['field'] === 'contact' &&
    Array.isArray((n as Record<string, unknown>)['values']);
  const toPicked = (n: { values: unknown[]; labels?: unknown[] }): PickedContact[] =>
    n.values.map((v, i) => ({
      id: String(v),
      label: Array.isArray(n.labels) && n.labels[i] != null ? String(n.labels[i]) : String(v),
    }));

  const all = parsed?.['all'];
  if (Array.isArray(all) && all.length === 1 && isPeople(all[0])) {
    return { rule: { mode: 'all', children: [] }, picked: toPicked(all[0]) };
  }
  const any = parsed?.['any'];
  if (Array.isArray(any) && any.length === 2 && isPeople(any[0])) {
    return {
      rule: groupFromJsonObject(any[1] as Record<string, unknown>) ?? { mode: 'all', children: [] },
      picked: toPicked(any[0]),
    };
  }
  return { rule: ruleFromJson(json), picked: [] };
}

/**
 * Parses a stored `ruleJson` back into the editor tree. A missing, empty or
 * unreadable rule opens as a fresh AND group rather than throwing — a saved segment
 * with a broken rule should still be openable so it can be fixed.
 */
export function ruleFromJson(json: string | null | undefined): SegmentGroup {
  const trimmed = (json ?? '').trim();
  if (trimmed === '' || trimmed === '{}') {
    return { mode: 'all', children: [] };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { mode: 'all', children: [] };
  }
  if (!parsed || typeof parsed !== 'object') {
    return { mode: 'all', children: [] };
  }
  return groupFromJsonObject(parsed as Record<string, unknown>) ?? { mode: 'all', children: [] };
}

// ---- Immutable tree edits ------------------------------------------------

/**
 * Rebuilds the tree with one group replaced, leaving every other node untouched.
 *
 * Immutable because the whole tree sits behind a signal: mutating a child in place
 * would leave the signal's reference unchanged and the preview would not recompute,
 * which reads as "editing the rule does nothing".
 */
function mutateGroup(
  group: SegmentGroup,
  path: readonly number[],
  fn: (g: SegmentGroup) => SegmentGroup,
): SegmentGroup {
  if (path.length === 0) {
    return fn(group);
  }
  const [head, ...rest] = path;
  return {
    ...group,
    children: group.children.map((child, i) => {
      if (i !== head || !isGroup(child)) {
        return child;
      }
      return mutateGroup(child, rest, fn);
    }),
  };
}

export function addClauseAt(root: SegmentGroup, path: readonly number[]): SegmentGroup {
  return mutateGroup(root, path, (group) => ({
    ...group,
    children: [...group.children, { field: 'city', op: 'eq', value: '' } as SegmentClause],
  }));
}

export function addGroupAt(
  root: SegmentGroup,
  path: readonly number[],
  mode: 'all' | 'any' | 'not',
): SegmentGroup {
  return mutateGroup(root, path, (group) => ({
    ...group,
    children: [
      ...group.children,
      { mode, children: [{ field: 'city', op: 'eq', value: '' } as SegmentClause] },
    ],
  }));
}

export function removeNodeAt(
  root: SegmentGroup,
  path: readonly number[],
  index: number,
): SegmentGroup {
  return mutateGroup(root, path, (group) => ({
    ...group,
    children: group.children.filter((_, i) => i !== index),
  }));
}

export function updateClauseAt(
  root: SegmentGroup,
  path: readonly number[],
  index: number,
  patch: Partial<SegmentClause>,
): SegmentGroup {
  return mutateGroup(root, path, (group) => ({
    ...group,
    children: group.children.map((child, i) =>
      i === index && !isGroup(child) ? { ...child, ...patch } : child,
    ),
  }));
}

export function setGroupModeAt(
  root: SegmentGroup,
  path: readonly number[],
  mode: 'all' | 'any' | 'not',
): SegmentGroup {
  return mutateGroup(root, path, (group) => ({ ...group, mode }));
}
