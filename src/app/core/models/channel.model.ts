/** Meta's quality rating for a business phone number.
 *  `unknown` is a real state, not a placeholder: a freshly registered number has
 *  no rating until it has sent enough traffic, and showing it as green would be
 *  telling the operator something Meta has not said. */
export type QualityRating = 'unknown' | 'green' | 'yellow' | 'red';

/** Messaging limit tier. Scoped to the business portfolio, not the number. */
export type MessagingTier = 'starting' | 'tier1' | 'tier2' | 'tier3' | 'tier4';

export const TIER_LIMIT: Record<MessagingTier, number | null> = {
  starting: 250,
  tier1: 2_000,
  tier2: 10_000,
  tier3: 100_000,
  tier4: null, // unlimited
};

export const TIER_LABEL: Record<MessagingTier, string> = {
  starting: 'Starting',
  tier1: 'Tier 1',
  tier2: 'Tier 2',
  tier3: 'Tier 3',
  tier4: 'Tier 4',
};

export interface Channel {
  readonly id: string;
  readonly wabaId: string;
  readonly phoneNumberId: string;
  readonly displayPhone: string;
  readonly displayName: string;
  readonly nameStatus: 'approved' | 'pending' | 'rejected';
  readonly quality: QualityRating;
  readonly tier: MessagingTier;
  /** Unique recipients used in the rolling 24-hour window, portfolio-scoped. */
  readonly used24h: number;
  /** Messages per second Meta reports for this number. */
  readonly throughput: number;
  readonly restricted: boolean;
}
