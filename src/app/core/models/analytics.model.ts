/** Analytics view models (M12). Flattened from the API DTOs, money kept in paise. */

export type PricingCategory = 'unknown' | 'marketing' | 'utility' | 'authentication' | 'service';
export type TemplateCategory = 'marketing' | 'utility' | 'authentication';
export type TemplateQuality = 'unknown' | 'high' | 'medium' | 'low';

export interface TrendPoint {
  readonly date: string;
  readonly marketing: number;
  readonly utility: number;
  readonly service: number;
  readonly spendInPaise: number;
}

export interface CategoryBreakdown {
  readonly category: PricingCategory;
  readonly count: number;
  readonly spendInPaise: number;
  readonly shareOfVolume: number;
}

export interface TemplatePerformance {
  readonly templateId: string;
  readonly name: string;
  readonly category: TemplateCategory;
  readonly quality: TemplateQuality;
  readonly sent: number;
  readonly deliveryRate: number;
  readonly readRate: number;
  readonly replyRate: number;
}

export interface AgentPerformance {
  readonly userId: string;
  readonly userName: string;
  readonly conversationsHandled: number;
  readonly messagesSent: number;
  readonly medianFirstResponseMinutes?: number;
  readonly enquiriesCreated: number;
  /** Satisfaction answers about this agent's conversations (M12-4). */
  readonly csatResponses?: number;
  readonly csatPercent?: number;
}

export interface TeamSatisfaction {
  readonly teamId: string;
  readonly name: string;
  readonly responses: number;
  readonly csatPercent?: number;
  readonly good: number;
  readonly okay: number;
  readonly poor: number;
}
