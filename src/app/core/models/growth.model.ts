/**
 * View models for the audience, number-management and platform screens added with
 * the coverage build.
 *
 * Client shapes, not server DTOs. The proxy under `src/app/proxy` mirrors the API
 * exactly; `core/api/growth-mapping.ts` is the single place the two meet.
 */

// ---- Segments (M03-5, M03-6) ------------------------------------------------

export type RuleOperator =
  | 'eq'
  | 'ne'
  | 'in'
  | 'gte'
  | 'lte'
  | 'gt'
  | 'lt'
  | 'contains'
  | 'exists';

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

export interface SavedSegment {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly rule: SegmentGroup;
  readonly cachedMemberCount: number;
  readonly isCountStale: boolean;
  readonly lastEvaluatedAt?: string;
}

// ---- Number management (M02-2, M02-3) ---------------------------------------

export type NameReviewState = 'pending' | 'approved' | 'rejected';

export interface ManagedNumber {
  readonly channelId: string;
  readonly displayPhoneNumber: string;
  readonly verifiedName: string;
  readonly nameReviewState: NameReviewState;
  readonly requestedName?: string;
  readonly nameRequestedAt?: string;
  readonly nameRejectionReason?: string;
  readonly hasTwoStepPin: boolean;
  readonly pinUpdatedAt?: string;
  readonly isRegistered: boolean;
  readonly quality: 'green' | 'yellow' | 'red' | 'unknown';
  readonly tier: string;
}

// ---- Rate history (M13-4) ---------------------------------------------------

export interface RateHistoryPoint {
  readonly effectiveFrom: string;
  readonly effectiveTo?: string;
  readonly rateInPaise: number;
  readonly changeInPaise: number;
  readonly changePercent: number;
  readonly isCurrent: boolean;
}

export interface RateHistory {
  readonly category: string;
  readonly currentRateInPaise: number;
  readonly nextChangeFrom?: string;
  readonly nextRateInPaise?: number;
  readonly points: readonly RateHistoryPoint[];
}

// ---- Platform console (M15-1, M15-6) ----------------------------------------

export interface PlatformMetrics {
  readonly totalTenants: number;
  readonly activeTenants: number;
  readonly trialTenants: number;
  readonly tenantsAtRisk: number;
  readonly mrrInPaise: number;
  readonly messageMarginMonthInPaise: number;
  readonly messagesMonth: number;
  readonly averageDeliveryRate: number;
  readonly openComplianceRequests: number;
  readonly tenantsToBreakEven: number;
}

export interface TenantOverview {
  readonly id: string;
  readonly name: string;
  readonly plan: string;
  readonly isTrial: boolean;
  readonly channelCount: number;
  readonly worstQuality: 'green' | 'yellow' | 'red' | 'unknown';
  readonly tier: string;
  readonly messages30d: number;
  readonly spend30dInPaise: number;
  readonly walletBalanceInPaise: number;
  readonly activeUsers: number;
  readonly lastActivityAt?: string;
}
