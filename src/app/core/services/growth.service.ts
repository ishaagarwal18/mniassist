import { Injectable, computed, signal } from '@angular/core';

import {
  ManagedNumber,
  PlatformMetrics,
  RateHistory,
  SavedSegment,
  SegmentClause,
  SegmentField,
  SegmentGroup,
  SegmentPreview,
  SegmentSampleContact,
  TenantOverview,
  isGroup,
} from '../models/growth.model';

/**
 * Store for the audience builder, number management, rate history and the platform
 * console.
 *
 * The segment preview is computed locally against a seeded contact set rather than
 * faked with a constant. That matters: the whole point of the screen is that editing
 * a rule changes three numbers and a cost, and a preview that returns the same
 * figures whatever you click teaches the wrong thing to whoever is being shown it.
 * The evaluator below mirrors the server's compiler, including its two rules that
 * surprise people — an unknown field matches nobody, and consent is applied after
 * the rule, never inside it.
 */
@Injectable({ providedIn: 'root' })
export class GrowthService {
  private static daysAgo(d: number): string {
    return new Date(Date.now() - d * 86_400_000).toISOString();
  }

  private static daysAhead(d: number): string {
    return new Date(Date.now() + d * 86_400_000).toISOString();
  }

  // ---- The field catalogue -------------------------------------------------

  /**
   * What the rule builder offers. Grouped the way a salesperson thinks — who they
   * are, what they bought, how they reacted — rather than by which table the column
   * lives in.
   */
  readonly fields: readonly SegmentField[] = [
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

  // ---- Seeded audience -----------------------------------------------------

  /**
   * A small, deliberately awkward contact set: enough opted-out and suppressed rows
   * that the gap between "matching" and "can actually be messaged" is visible, which
   * is the number this screen exists to make obvious.
   */
  private readonly contacts: readonly SeedContact[] = [
    seed('c1', 'Rakesh Mehta', 'Aurus Pharma', 'Sr. Manager, Projects', 'Vapi', 'Gujarat', 'Purchase',
      { plc_platform: 'Siemens', industry: 'Pharma' }, ['amc', 'pharma'],
      'Quoted', 'Expired', 'Read', 3, 41, 'marketing', 'none'),
    seed('c2', 'Sunita Iyer', 'Meridian Foods', 'Head — Engineering', 'Pune', 'Maharashtra', 'Engineering',
      { plc_platform: 'Rockwell', industry: 'Food' }, ['amc'],
      'Engaged', 'None', 'Replied', 2, 0, 'marketing', 'none'),
    seed('c3', 'Vasai Panels', 'Vasai Panels', 'Proprietor', 'Vasai', 'Maharashtra', 'Dealer',
      { plc_platform: 'Delta' }, ['dealer'],
      'Customer', 'Won', 'Clicked', 5, 12, 'marketing', 'none'),
    seed('c4', 'Imran Shaikh', 'Kohinoor Textiles', 'Maintenance In-charge', 'Bhiwandi', 'Maharashtra', 'Maintenance',
      { plc_platform: 'Siemens', industry: 'Textile' }, ['amc', 'breakdown'],
      'Quoted', 'Issued', 'Delivered', 4, 63, 'marketing', 'none'),
    seed('c5', 'Priya Nair', 'Southern Auto Components', 'DGM — Purchase', 'Hosur', 'Tamil Nadu', 'Purchase',
      { plc_platform: 'Mitsubishi', industry: 'Auto' }, [],
      'Enquired', 'Draft', 'NotDelivered', 1, 8, 'utility', 'none'),
    seed('c6', 'Ashok Bhatt', 'Gujarat Polychem', 'Plant Head', 'Ankleshwar', 'Gujarat', 'PlantHead',
      { plc_platform: 'Siemens', industry: 'Pharma' }, ['amc'],
      'Quoted', 'Expired', 'NotTargeted', 0, 120, 'marketing', 'none'),
    seed('c7', 'Deepa Rao', 'Nutriva Foods', 'QA Manager', 'Hubli', 'Karnataka', 'Engineering',
      { industry: 'Food' }, [],
      'Dormant', 'Lost', 'Delivered', 6, 210, 'utility', 'optedOut'),
    seed('c8', 'Manoj Kulkarni', 'Sahyadri Sugars', 'Instrumentation', 'Sangli', 'Maharashtra', 'Maintenance',
      { plc_platform: 'Rockwell' }, ['amc'],
      'Engaged', 'None', 'Read', 2, 2, 'marketing', 'none'),
    seed('c9', 'Faisal Khan', 'Deccan Drives', 'Service Head', 'Hyderabad', 'Telangana', 'Maintenance',
      { plc_platform: 'Delta' }, ['dealer'],
      'Customer', 'Won', 'Replied', 3, 0, 'marketing', 'none'),
    seed('c10', 'Unknown number', undefined, undefined, undefined, undefined, 'Unknown',
      {}, [],
      'New', 'None', 'NotTargeted', 0, 400, 'utility', 'invalid'),
  ];

  /** India's marketing rate from 1 January 2026, in paise. */
  private static readonly MarketingRatePaise = 86.31;
  private static readonly UtilityRatePaise = 11.5;
  private static readonly AuthenticationRatePaise = 12.8;

  private readonly walletBalancePaise = signal(341_000);

  // ---- Segment evaluation --------------------------------------------------

  readonly rule = signal<SegmentGroup>({
    mode: 'all',
    children: [
      { field: 'tag', op: 'eq', value: 'amc' },
      {
        mode: 'any',
        children: [
          { field: 'quotationState', op: 'eq', value: 'Expired' },
          { field: 'campaignResponse', op: 'lte', value: 'Delivered' },
        ],
      },
    ],
  });

  /**
   * The live preview. Recomputed from the rule signal, so every edit in the builder
   * moves the counts and the cost together — which is the point of the screen.
   */
  readonly preview = computed<SegmentPreview>(() => {
    const rule = this.rule();
    const problems: string[] = [];
    const constrains = this.groupConstrains(rule);

    const matching = constrains
      ? this.contacts.filter(c => this.matchesGroup(c, rule, problems))
      : [...this.contacts];

    const marketing = matching.filter(c => c.consent === 'marketing' && c.suppression === 'none');
    const utility = matching.filter(c => c.suppression === 'none' || c.suppression === 'optedOut');
    const optedOut = matching.filter(c => c.suppression === 'optedOut');
    const suppressed = matching.filter(c => c.suppression !== 'none');
    const inWindow = matching.filter(c => c.lastInboundDays < 1);

    return {
      totalMatching: matching.length,
      marketingEligible: marketing.length,
      utilityEligible: utility.length,
      optedOut: optedOut.length,
      suppressed: suppressed.length,
      insideServiceWindow: inWindow.length,
      matchesEveryone: !constrains,
      problems: [...new Set(problems)],
      cost: [
        this.costLine('Marketing', marketing.length, GrowthService.MarketingRatePaise),
        this.costLine('Utility', utility.length, GrowthService.UtilityRatePaise),
        this.costLine('Authentication', utility.length, GrowthService.AuthenticationRatePaise),
      ],
      sample: matching.slice(0, 6).map(toSample),
    };
  });

  private costLine(category: string, recipients: number, ratePaise: number) {
    const total = Math.round(recipients * ratePaise);
    return {
      category,
      recipients,
      rateInPaise: ratePaise,
      estimatedTotalInPaise: total,
      exceedsWalletBalance: total > this.walletBalancePaise(),
    };
  }

  readonly walletBalanceInPaise = this.walletBalancePaise.asReadonly();

  // ---- Rule mutation -------------------------------------------------------

  setRule(rule: SegmentGroup): void {
    this.rule.set(rule);
  }

  addClause(path: readonly number[]): void {
    this.rule.update(root =>
      mutateGroup(root, path, group => ({
        ...group,
        children: [...group.children, { field: 'city', op: 'eq', value: '' } as SegmentClause],
      })),
    );
  }

  addGroup(path: readonly number[], mode: 'all' | 'any' | 'not'): void {
    this.rule.update(root =>
      mutateGroup(root, path, group => ({
        ...group,
        children: [
          ...group.children,
          { mode, children: [{ field: 'city', op: 'eq', value: '' } as SegmentClause] },
        ],
      })),
    );
  }

  removeAt(path: readonly number[], index: number): void {
    this.rule.update(root =>
      mutateGroup(root, path, group => ({
        ...group,
        children: group.children.filter((_, i) => i !== index),
      })),
    );
  }

  updateClause(path: readonly number[], index: number, patch: Partial<SegmentClause>): void {
    this.rule.update(root =>
      mutateGroup(root, path, group => ({
        ...group,
        children: group.children.map((child, i) =>
          i === index && !isGroup(child) ? { ...child, ...patch } : child,
        ),
      })),
    );
  }

  setGroupMode(path: readonly number[], mode: 'all' | 'any' | 'not'): void {
    this.rule.update(root => mutateGroup(root, path, group => ({ ...group, mode })));
  }

  // ---- The evaluator -------------------------------------------------------

  private groupConstrains(group: SegmentGroup): boolean {
    return group.children.some(child => (isGroup(child) ? this.groupConstrains(child) : true));
  }

  private matchesGroup(contact: SeedContact, group: SegmentGroup, problems: string[]): boolean {
    if (group.children.length === 0) return true;

    const results = group.children.map(child =>
      isGroup(child) ? this.matchesGroup(contact, child, problems) : this.matchesClause(contact, child, problems),
    );

    if (group.mode === 'all') return results.every(Boolean);
    if (group.mode === 'any') return results.some(Boolean);
    return !results.some(Boolean);
  }

  private matchesClause(contact: SeedContact, clause: SegmentClause, problems: string[]): boolean {
    const { field, op } = clause;
    const value = (clause.value ?? '').trim();

    // An empty value is a half-built condition, not a filter. Treated as "no
    // constraint" so the preview stays useful while someone is still typing —
    // unlike an unknown field, which is a mistake and fails closed.
    if (!value && op !== 'exists' && field !== 'inServiceWindow') return true;

    if (field.startsWith('attr:')) {
      const key = field.slice(5);
      const held = contact.attributes[key];
      if (op === 'exists') return held !== undefined;
      if (op === 'ne') return held !== value;
      return held === value;
    }

    switch (field) {
      case 'tag':
        return op === 'ne' ? !contact.tags.includes(value) : contact.tags.includes(value);
      case 'city':
        return compareText(contact.city, value, op);
      case 'state':
        return compareText(contact.state, value, op);
      case 'company':
        return (contact.company ?? '').toLowerCase().includes(value.toLowerCase());
      case 'designation':
        return (contact.designation ?? '').toLowerCase().includes(value.toLowerCase());
      case 'role':
        return op === 'ne' ? contact.role !== value : contact.role === value;
      case 'lifecycle':
        return compareOrdered(LIFECYCLE_ORDER, contact.lifecycle, value, op);
      case 'quotationState':
        return op === 'ne' ? contact.quotationState !== value : contact.quotationState === value;
      case 'campaignResponse':
        return compareOrdered(RESPONSE_ORDER, contact.campaignResponse, value, op);
      case 'campaignsReceived':
        return compareNumber(contact.campaignsReceived, Number(value), op);
      case 'lastInboundDays':
        // "At least N days quiet" must include people who have never written. In the
        // seed those carry a very large number rather than null, which keeps the
        // comparison honest without a special case here.
        return op === 'gte'
          ? contact.lastInboundDays >= Number(value)
          : contact.lastInboundDays <= Number(value);
      case 'inServiceWindow':
        return contact.lastInboundDays < 1;
      default:
        problems.push(`‘${field}’ is not a field the segment builder knows, so the condition was dropped.`);
        return false;
    }
  }

  // ---- Saved segments ------------------------------------------------------

  readonly savedSegments = signal<readonly SavedSegment[]>([
    {
      id: 's1',
      name: 'Lapsed quotes — AMC accounts',
      description: 'Quoted, past validity, no decision. The follow-up list.',
      rule: {
        mode: 'all',
        children: [
          { field: 'tag', op: 'eq', value: 'amc' },
          { field: 'quotationState', op: 'eq', value: 'Expired' },
        ],
      },
      cachedMemberCount: 2,
      isCountStale: false,
      lastEvaluatedAt: GrowthService.daysAgo(0),
    },
    {
      id: 's2',
      name: 'Siemens plants in Gujarat',
      rule: {
        mode: 'all',
        children: [
          { field: 'state', op: 'eq', value: 'Gujarat' },
          { field: 'attr:plc_platform', op: 'eq', value: 'Siemens' },
        ],
      },
      cachedMemberCount: 2,
      isCountStale: true,
      lastEvaluatedAt: GrowthService.daysAgo(6),
    },
    {
      id: 's3',
      name: 'Never replied, not over-messaged',
      description: 'Delivered but never engaged, excluding anyone already sent four campaigns.',
      rule: {
        mode: 'all',
        children: [{ field: 'campaignResponse', op: 'lte', value: 'Delivered' }],
      },
      cachedMemberCount: 4,
      isCountStale: true,
      lastEvaluatedAt: GrowthService.daysAgo(3),
    },
  ]);

  // ---- Number management ---------------------------------------------------

  readonly numbers = signal<readonly ManagedNumber[]>([
    {
      channelId: 'ch-1',
      displayPhoneNumber: '+91 90210 44872',
      verifiedName: 'Meridian Automation',
      nameReviewState: 'approved',
      hasTwoStepPin: true,
      pinUpdatedAt: GrowthService.daysAgo(112),
      isRegistered: true,
      quality: 'green',
      tier: '10K / 24h',
    },
    {
      channelId: 'ch-2',
      displayPhoneNumber: '+91 90210 44873',
      verifiedName: 'Meridian Automation Service',
      nameReviewState: 'pending',
      requestedName: 'Meridian Service & Support',
      nameRequestedAt: GrowthService.daysAgo(2),
      hasTwoStepPin: true,
      pinUpdatedAt: GrowthService.daysAgo(9),
      isRegistered: true,
      quality: 'yellow',
      tier: '1K / 24h',
    },
    {
      channelId: 'ch-3',
      displayPhoneNumber: '+91 90210 44874',
      verifiedName: 'Meridian Spares',
      nameReviewState: 'rejected',
      nameRejectionReason:
        'The requested name did not match the business name on the verified Meta Business Portfolio.',
      hasTwoStepPin: false,
      isRegistered: false,
      quality: 'unknown',
      tier: '250 / 24h',
    },
  ]);

  requestName(channelId: string, name: string): void {
    this.numbers.update(list =>
      list.map(n =>
        n.channelId === channelId
          ? {
              ...n,
              nameReviewState: 'pending' as const,
              requestedName: name,
              nameRequestedAt: new Date().toISOString(),
              nameRejectionReason: undefined,
            }
          : n,
      ),
    );
  }

  setPin(channelId: string): void {
    this.numbers.update(list =>
      list.map(n =>
        n.channelId === channelId
          ? { ...n, hasTwoStepPin: true, isRegistered: true, pinUpdatedAt: new Date().toISOString() }
          : n,
      ),
    );
  }

  // ---- Rate history (M13-4) ------------------------------------------------

  readonly rateHistory = signal<readonly RateHistory[]>([
    {
      category: 'Marketing',
      currentRateInPaise: 86.31,
      points: [
        { effectiveFrom: '2024-06-01T00:00:00Z', effectiveTo: '2026-01-01T00:00:00Z', rateInPaise: 78.46, changeInPaise: 0, changePercent: 0, isCurrent: false },
        { effectiveFrom: '2026-01-01T00:00:00Z', rateInPaise: 86.31, changeInPaise: 7.85, changePercent: 10.01, isCurrent: true },
      ],
    },
    {
      category: 'Utility',
      currentRateInPaise: 11.5,
      nextChangeFrom: GrowthService.daysAhead(43),
      nextRateInPaise: 12.2,
      points: [
        { effectiveFrom: '2024-06-01T00:00:00Z', effectiveTo: '2026-01-01T00:00:00Z', rateInPaise: 11.0, changeInPaise: 0, changePercent: 0, isCurrent: false },
        { effectiveFrom: '2026-01-01T00:00:00Z', rateInPaise: 11.5, changeInPaise: 0.5, changePercent: 4.55, isCurrent: true },
      ],
    },
    {
      category: 'Authentication',
      currentRateInPaise: 12.8,
      points: [
        { effectiveFrom: '2024-06-01T00:00:00Z', rateInPaise: 12.8, changeInPaise: 0, changePercent: 0, isCurrent: true },
      ],
    },
  ]);

  // ---- Platform console ----------------------------------------------------

  readonly platformMetrics = signal<PlatformMetrics>({
    totalTenants: 34,
    activeTenants: 27,
    trialTenants: 9,
    tenantsAtRisk: 4,
    mrrInPaise: 4_86_000_00,
    messageMarginMonthInPaise: 1_92_450_00,
    messagesMonth: 486_210,
    averageDeliveryRate: 0.9642,
    openComplianceRequests: 3,
    tenantsToBreakEven: 6,
  });

  readonly tenants = signal<readonly TenantOverview[]>([
    tenant('t1', 'Meridian Automation', 'Growth', false, 3, 'yellow', '10K / 24h', 84_120, 72_18_400, 3_41_000, 11, 0),
    tenant('t2', 'Sanghvi Controls', 'Starter', false, 1, 'green', '1K / 24h', 12_480, 10_92_300, 84_000, 4, 0),
    tenant('t3', 'Precision Drives', 'Scale', false, 5, 'green', 'Unlimited', 186_400, 1_58_44_000, 12_10_000, 23, 0),
    tenant('t4', 'Kohinoor Instruments', 'Starter', true, 1, 'unknown', '250 / 24h', 0, 0, 0, 2, 9),
    tenant('t5', 'Deccan Valves', 'Growth', false, 2, 'red', '10K / 24h', 41_200, 34_86_000, 12_400, 7, 1),
    tenant('t6', 'Nirmal Pneumatics', 'Starter', false, 1, 'green', '1K / 24h', 0, 0, 41_000, 3, 46),
  ]);
}

// ---- helpers ----------------------------------------------------------------

interface SeedContact {
  readonly id: string;
  readonly name: string;
  readonly company?: string;
  readonly designation?: string;
  readonly city?: string;
  readonly state?: string;
  readonly role: string;
  readonly attributes: Record<string, string>;
  readonly tags: readonly string[];
  readonly lifecycle: string;
  readonly quotationState: string;
  readonly campaignResponse: string;
  readonly campaignsReceived: number;
  readonly lastInboundDays: number;
  readonly consent: 'marketing' | 'utility';
  readonly suppression: 'none' | 'optedOut' | 'invalid';
}

function seed(
  id: string,
  name: string,
  company: string | undefined,
  designation: string | undefined,
  city: string | undefined,
  state: string | undefined,
  role: string,
  attributes: Record<string, string>,
  tags: readonly string[],
  lifecycle: string,
  quotationState: string,
  campaignResponse: string,
  campaignsReceived: number,
  lastInboundDays: number,
  consent: 'marketing' | 'utility',
  suppression: 'none' | 'optedOut' | 'invalid',
): SeedContact {
  return {
    id, name, company, designation, city, state, role, attributes, tags,
    lifecycle, quotationState, campaignResponse, campaignsReceived, lastInboundDays,
    consent, suppression,
  };
}

function toSample(c: SeedContact): SegmentSampleContact {
  return {
    id: c.id,
    name: c.name,
    company: c.company,
    designation: c.designation,
    city: c.city,
    lifecycle: c.lifecycle,
    quotationState: c.quotationState,
    lastCampaignResponse: c.campaignResponse,
    canReceiveMarketing: c.consent === 'marketing' && c.suppression === 'none',
    suppression: c.suppression,
  };
}

function tenant(
  id: string, name: string, plan: string, isTrial: boolean, channelCount: number,
  worstQuality: 'green' | 'yellow' | 'red' | 'unknown', tier: string,
  messages30d: number, spend30dInPaise: number, walletBalanceInPaise: number,
  activeUsers: number, lastActivityDaysAgo: number,
): TenantOverview {
  return {
    id, name, plan, isTrial, channelCount, worstQuality, tier,
    messages30d, spend30dInPaise, walletBalanceInPaise, activeUsers,
    lastActivityAt: new Date(Date.now() - lastActivityDaysAgo * 86_400_000).toISOString(),
  };
}

const LIFECYCLE_ORDER = ['New', 'Engaged', 'Enquired', 'Quoted', 'Customer', 'Lost', 'Dormant'];
const RESPONSE_ORDER = ['NotTargeted', 'NotDelivered', 'Delivered', 'Read', 'Clicked', 'Replied'];

function compareText(held: string | undefined, value: string, op: string): boolean {
  if (op === 'ne') return (held ?? '') !== value;
  return (held ?? '').toLowerCase() === value.toLowerCase();
}

function compareNumber(held: number, value: number, op: string): boolean {
  if (Number.isNaN(value)) return true;
  switch (op) {
    case 'lte': return held <= value;
    case 'lt': return held < value;
    case 'gt': return held > value;
    case 'eq': return held === value;
    default: return held >= value;
  }
}

/** Ordered enums compare by position, which is what makes "at least Read" one test. */
function compareOrdered(order: readonly string[], held: string, value: string, op: string): boolean {
  const a = order.indexOf(held);
  const b = order.indexOf(value);
  if (b < 0) return false;

  switch (op) {
    case 'gte': return a >= b;
    case 'lte': return a <= b;
    case 'ne': return a !== b;
    default: return a === b;
  }
}

/**
 * Rebuilds the tree with one group replaced, leaving every other node untouched.
 *
 * Immutable because the whole tree is behind a signal: mutating a child in place
 * would leave the signal's reference unchanged and the preview would not recompute,
 * which reads as "editing the rule does nothing".
 */
function mutateGroup(
  group: SegmentGroup,
  path: readonly number[],
  fn: (g: SegmentGroup) => SegmentGroup,
): SegmentGroup {
  if (path.length === 0) return fn(group);

  const [head, ...rest] = path;

  return {
    ...group,
    children: group.children.map((child, i) => {
      if (i !== head || !isGroup(child)) return child;
      return mutateGroup(child, rest, fn);
    }),
  };
}
