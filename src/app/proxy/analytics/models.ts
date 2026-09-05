import type { ChannelHealthDto } from '../channels/models';
import type { PricingCategory } from '../messaging/pricing-category.enum';
import type { TemplateCategory } from '../messaging/template-category.enum';
import type { TemplateQuality } from '../messaging/template-quality.enum';

export interface AgentPerformanceDto {
  userId?: string;
  userName?: string;
  conversationsHandled: number;
  messagesSent: number;
  medianFirstResponseMinutes?: number;
  enquiriesCreated: number;
}

export interface CategoryBreakdownDto {
  category: PricingCategory;
  count: number;
  spendInPaise: number;
  shareOfVolume: number;
}

export interface DashboardDto {
  generatedAtUtc?: string;
  channels: ChannelHealthDto[];
  volume: MessageVolumeDto;
  inbox: InboxSnapshotDto;
  pipeline: PipelineSnapshotDto;
  spend: SpendSnapshotDto;
  trend: TrendPointDto[];
}

export interface GetAnalyticsInput {
  fromUtc?: string;
  toUtc?: string;
  channelId?: string;
}

export interface InboxSnapshotDto {
  openConversations: number;
  unassigned: number;
  windowClosingWithinHour: number;
  /** Median, not mean — one conversation left open overnight would skew a mean. */
  medianFirstResponseMinutes?: number;
}

export interface MessageVolumeDto {
  sent24h: number;
  received24h: number;
  delivered24h: number;
  failed24h: number;
  withheld24h: number;
  deliveryRate: number;
}

export interface PipelineSnapshotDto {
  openEnquiries: number;
  newThisWeek: number;
  openValueInPaise: number;
  quotationsAwaitingDecision: number;
  winRate: number;
}

export interface SpendSnapshotDto {
  spend24hInPaise: number;
  spendMonthInPaise: number;
  freeMessages24h: number;
  /** Utility traffic only. Free service replies are not a saving. */
  avoidedCharge24hInPaise: number;
  walletBalanceInPaise: number;
}

export interface TemplatePerformanceDto {
  templateId?: string;
  name?: string;
  category: TemplateCategory;
  quality: TemplateQuality;
  sent: number;
  deliveryRate: number;
  readRate: number;
  replyRate: number;
  optOutRate: number;
}

export interface TrendPointDto {
  date?: string;
  marketing: number;
  utility: number;
  service: number;
  spendInPaise: number;
}
