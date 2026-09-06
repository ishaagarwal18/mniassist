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
