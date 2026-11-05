import { FullAuditedEntityDto, EntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import {
  ProjectionHorizon,
  ProjectionPlanStatus,
  ProjectionScenario,
  BusinessLine,
  ProjectionItemStatus,
} from './projection-enums';

export interface ProjectionPlanDto extends FullAuditedEntityDto<string> {
  planCode: string;
  title: string;
  fiscalYear: string;
  horizon: ProjectionHorizon;
  status: ProjectionPlanStatus;
  baseScenario: ProjectionScenario;
  targetRevenueInPaise: number;
  targetRevenueInRupees: number;
  targetCogsInPaise: number;
  targetCogsInRupees: number;
  targetGrossMarginPercent: number;
  targetEbitdaInPaise: number;
  targetEbitdaInRupees: number;
  targetWorkingCapitalInPaise: number;
  targetWorkingCapitalInRupees: number;
  actualRevenueInPaise: number;
  actualRevenueInRupees: number;
  actualCogsInPaise: number;
  actualCogsInRupees: number;
  actualGrossMarginPercent: number;
  variancePercent: number;
  notes?: string;
  items: ProjectionPlanItemDto[];
}

export interface ProjectionPlanItemDto extends EntityDto<string> {
  planId: string;
  periodLabel: string;
  periodStartDate: string;
  periodEndDate: string;
  businessLine: BusinessLine;
  projectedRevenueInPaise: number;
  projectedRevenueInRupees: number;
  projectedCogsInPaise: number;
  projectedCogsInRupees: number;
  projectedOperatingExpensesInPaise: number;
  projectedOperatingExpensesInRupees: number;
  projectedMarginPercent: number;
  conservativeRevenueInPaise: number;
  conservativeRevenueInRupees: number;
  optimisticRevenueInPaise: number;
  optimisticRevenueInRupees: number;
  actualRevenueInPaise: number;
  actualRevenueInRupees: number;
  actualCogsInPaise: number;
  actualCogsInRupees: number;
  capacityHoursRequired: number;
  status: ProjectionItemStatus;
}

export interface CreateUpdateProjectionPlanDto {
  title: string;
  fiscalYear: string;
  horizon: ProjectionHorizon;
  baseScenario: ProjectionScenario;
  notes?: string;
  items: CreateUpdateProjectionPlanItemDto[];
}

export interface CreateUpdateProjectionPlanItemDto {
  periodLabel: string;
  periodStartDate: string;
  periodEndDate: string;
  businessLine: BusinessLine;
  projectedRevenueInPaise: number;
  projectedCogsInPaise: number;
  projectedOperatingExpensesInPaise: number;
  conservativeRevenueInPaise?: number;
  optimisticRevenueInPaise?: number;
  capacityHoursRequired: number;
}

export interface GetProjectionPlanListInput extends PagedAndSortedResultRequestDto {
  fiscalYear?: string;
  horizon?: ProjectionHorizon;
  status?: ProjectionPlanStatus;
  searchFilter?: string;
}

export interface GenerateProjectionPlanInput {
  fiscalYear: string;
  horizon: ProjectionHorizon;
  growthRatePercent: number;
  targetGrossMarginPercent: number;
  includePipelineWeightings: boolean;
}

export interface ScenarioSummaryDto {
  scenario: ProjectionScenario;
  totalRevenueInPaise: number;
  totalRevenueInRupees: number;
  totalCogsInPaise: number;
  totalCogsInRupees: number;
  grossMarginPercent: number;
  projectedEbitdaInPaise: number;
  projectedEbitdaInRupees: number;
  workingCapitalRequirementInPaise: number;
  workingCapitalRequirementInRupees: number;
}

export interface ScenarioAnalysisResultDto {
  planId: string;
  fiscalYear: string;
  conservative: ScenarioSummaryDto;
  realistic: ScenarioSummaryDto;
  optimistic: ScenarioSummaryDto;
  executiveSummary: string;
}

export interface BusinessLineProjectionSummaryDto {
  businessLine: BusinessLine;
  businessLineName: string;
  projectedRevenueInPaise: number;
  projectedRevenueInRupees: number;
  actualRevenueInPaise: number;
  actualRevenueInRupees: number;
  realizationPercent: number;
  marginPercent: number;
}

export interface PeriodQuarterlySummaryDto {
  quarterLabel: string;
  targetRevenueInPaise: number;
  targetRevenueInRupees: number;
  actualRevenueInPaise: number;
  actualRevenueInRupees: number;
  conservativeInPaise: number;
  conservativeInRupees: number;
  optimisticInPaise: number;
  optimisticInRupees: number;
  status: ProjectionItemStatus;
}

export interface ExecutiveProjectionDashboardDto {
  /** False when the workspace has no plan yet; everything else is zero. */
  hasPlan: boolean;
  planId?: string | null;
  planCode?: string | null;
  totalProjectedAnnualRevenueInPaise: number;
  totalProjectedAnnualRevenueInRupees: number;
  ytdActualRevenueInPaise: number;
  ytdActualRevenueInRupees: number;
  ytdRealizationPercent: number;
  projectedAnnualGrossMarginPercent: number;
  actualYtdGrossMarginPercent: number;
  projectedEbitdaInPaise: number;
  projectedEbitdaInRupees: number;
  forecastedYearEndLandingInPaise: number;
  forecastedYearEndLandingInRupees: number;
  businessLines: BusinessLineProjectionSummaryDto[];
  quarterlyTrajections: PeriodQuarterlySummaryDto[];
}

export interface GenerateProjectionPlanResultDto {
  plan: ProjectionPlanDto;
  trailingRevenueInPaise: number;
  trailingInvoiceCount: number;
  weightedPipelineInPaise: number;
  openEnquiryCount: number;
  usedPlaceholderBaseline: boolean;
  /** The working, in a few sentences. */
  steps: string[];
}

export interface SyncProjectionActualsResultDto {
  plan: ProjectionPlanDto;
  invoiceCount: number;
  invoicedInPaise: number;
  periodsWithActuals: number;
  periodCount: number;
  previousActualRevenueInPaise: number;
  summary: string;
}
