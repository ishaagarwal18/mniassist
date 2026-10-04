import type { PricingCategory } from '../messaging/pricing-category.enum';
import type { ChannelHealthDto } from '../channels/models';
import type { TemplateCategory } from '../messaging/template-category.enum';
import type { TemplateQuality } from '../messaging/template-quality.enum';

export interface AdAttributionDto {
  sourceId?: string | null;
  sourceType?: string;
  headline?: string | null;
  sourceUrl?: string | null;
  conversations?: number;
  contacts?: number;
  replied?: number;
  enquiriesCreated?: number;
  /** Of those enquiries, the ones won, and their value. */
  won?: number;
  wonValueInPaise?: number;
  firstSeenUtc?: string;
  lastSeenUtc?: string;
}

export interface AgentPerformanceDto {
  userId?: string;
  userName?: string;
  conversationsHandled?: number;
  messagesSent?: number;
  medianFirstResponseMinutes?: number | null;
  enquiriesCreated?: number;
}

export interface CategoryBreakdownDto {
  category?: PricingCategory;
  count?: number;
  spendInPaise?: number;
  shareOfVolume?: number;
}

export interface DashboardDto {
  generatedAtUtc?: string;
  channels?: ChannelHealthDto[];
  volume?: MessageVolumeDto;
  inbox?: InboxSnapshotDto;
  pipeline?: PipelineSnapshotDto;
  spend?: SpendSnapshotDto;
  trend?: TrendPointDto[];
}

export interface GetAnalyticsInput {
  fromUtc?: string | null;
  toUtc?: string | null;
  channelId?: string | null;
}

export interface GetConversionReportInput extends GetAnalyticsInput {
  dimension?: string | null;
  pipelineId?: string | null;
}

export interface ConversionRowDto {
  key?: string;
  label?: string;
  won?: number;
  lost?: number;
  open?: number;
  wonValueInPaise?: number;
  winRate?: number;
}

export interface ConversionReportDto {
  dimension?: string;
  rows?: ConversionRowDto[];
  lostReasonBreakdown?: Record<string, number>;
}

export interface MarketingLiteRowDto {
  path?: string;
  sent?: number;
  delivered?: number;
  read?: number;
  replied?: number;
  spendInPaise?: number;
  deliveryRate?: number;
  readRate?: number;
  replyRate?: number;
}

export interface MarketingLiteComparisonDto {
  viaMarketingLite?: MarketingLiteRowDto;
  standard?: MarketingLiteRowDto;
}

export interface InboxSnapshotDto {
  openConversations?: number;
  unassigned?: number;
  windowClosingWithinHour?: number;
  medianFirstResponseMinutes?: number | null;
}

export interface MessageVolumeDto {
  sent24h?: number;
  received24h?: number;
  delivered24h?: number;
  failed24h?: number;
  withheld24h?: number;
  deliveryRate?: number;
}

export interface PipelineSnapshotDto {
  openEnquiries?: number;
  newThisWeek?: number;
  openValueInPaise?: number;
  quotationsAwaitingDecision?: number;
  winRate?: number;
}

export interface SpendSnapshotDto {
  spend24hInPaise?: number;
  spendMonthInPaise?: number;
  freeMessages24h?: number;
  avoidedCharge24hInPaise?: number;
  walletBalanceInPaise?: number;
}

export interface TemplatePerformanceDto {
  templateId?: string;
  name?: string;
  category?: TemplateCategory;
  quality?: TemplateQuality;
  sent?: number;
  deliveryRate?: number;
  readRate?: number;
  replyRate?: number;
  optOutRate?: number;
}

export interface TrendPointDto {
  date?: string;
  marketing?: number;
  utility?: number;
  service?: number;
  spendInPaise?: number;
}

export enum KpiUnit {
  Count = 0,
  Rupees = 1,
  Rate = 2,
  Minutes = 3,
}

export interface KpiDto {
  key: string;
  label: string;
  unit: KpiUnit;
  current?: number | null;
  previous?: number | null;
  higherIsBetter?: boolean | null;
  /** "workspace" when the figure covers every channel even though one was picked. */
  scope: string;
}

export interface AnalyticsSummaryDto {
  fromUtc: string;
  toUtc: string;
  previousFromUtc: string;
  previousToUtc: string;
  kpis: KpiDto[];
}

export interface CampaignResultDto {
  campaignId: string;
  name: string;
  state: number;
  startedAtUtc?: string | null;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  replied: number;
  enquiries: number;
  won: number;
  wonValueInPaise: number;
  spendInPaise: number;
  deliveryRate: number;
  readRate: number;
  replyRate: number;
  costPerEnquiryInPaise?: number | null;
}

export interface CampaignResultsDto {
  attributionDays: number;
  items: CampaignResultDto[];
}

export interface GetConversionEnquiriesInput extends GetConversionReportInput {
  key: string;
  /** "won", "lost" or "open"; empty for all three. */
  outcome?: string | null;
}

export interface ConversionEnquiryDto {
  id: string;
  reference: string;
  title?: string | null;
  contact: string;
  company?: string | null;
  outcome: 'won' | 'lost' | 'open';
  lostReason?: string | null;
  valueInPaise?: number | null;
  owner?: string | null;
  source: string;
  openedAtUtc: string;
  closedAtUtc?: string | null;
}

export interface AnalyticsNarrativeDto {
  text?: string | null;
  generatedAtUtc?: string | null;
  /** Why there is no summary: no model on the server, or the plan leaves it out. */
  unavailable?: string | null;
}
