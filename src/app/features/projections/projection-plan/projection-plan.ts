import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { inr, inrCompact } from '../../../core/util/format';
import { ToastService } from '../../../core/ui/toast.service';
import { ArTopbar } from '../../../layout/topbar';
import {
  BusinessLine,
  businessLineOptions,
  ExecutiveProjectionDashboardDto,
  GenerateProjectionPlanInput,
  ProjectionHorizon,
  projectionHorizonOptions,
  ProjectionItemStatus,
  ProjectionPlanDto,
  ProjectionPlanItemDto,
  ProjectionPlanService,
  ProjectionPlanStatus,
  ProjectionScenario,
  ScenarioAnalysisResultDto,
} from '../../../proxy/projections';
import { ArButton, ArCard, ArChip, ArDialog, ArIcon, ChipTone } from '../../../ui';

const STATUS_TONES: Record<ProjectionItemStatus, ChipTone> = {
  [ProjectionItemStatus.Planned]: 'neutral',
  [ProjectionItemStatus.OnTrack]: 'good',
  [ProjectionItemStatus.AtRisk]: 'warn',
  [ProjectionItemStatus.Achieved]: 'teal',
};

const STATUS_LABELS: Record<ProjectionItemStatus, string> = {
  [ProjectionItemStatus.Planned]: 'Planned',
  [ProjectionItemStatus.OnTrack]: 'On Track',
  [ProjectionItemStatus.AtRisk]: 'At Risk',
  [ProjectionItemStatus.Achieved]: 'Achieved',
};

const PLAN_STATUS_TONES: Record<ProjectionPlanStatus, ChipTone> = {
  [ProjectionPlanStatus.Draft]: 'neutral',
  [ProjectionPlanStatus.Active]: 'good',
  [ProjectionPlanStatus.UnderReview]: 'amber',
  [ProjectionPlanStatus.Archived]: 'neutral',
};

const PLAN_STATUS_LABELS: Record<ProjectionPlanStatus, string> = {
  [ProjectionPlanStatus.Draft]: 'Draft',
  [ProjectionPlanStatus.Active]: 'Active Plan',
  [ProjectionPlanStatus.UnderReview]: 'Under Review',
  [ProjectionPlanStatus.Archived]: 'Archived',
};

const BUSINESS_LINE_NAMES: Record<BusinessLine, string> = {
  [BusinessLine.TurnkeyAutomation]: 'Turnkey Automation & Panels',
  [BusinessLine.DrivesAndMotors]: 'Drives, VFDs & Motion Control',
  [BusinessLine.Instrumentation]: 'Process Instrumentation & Sensors',
  [BusinessLine.AmcAndServices]: 'AMC & Field Service SLA',
  [BusinessLine.SparesAndConsumables]: 'Spares, Consumables & Re-orders',
};

const MOCK_ITEMS: ProjectionPlanItemDto[] = [
  // Q1
  {
    id: 'item-1',
    planId: 'plan-1',
    periodLabel: 'Q1 (Apr - Jun)',
    periodStartDate: '2026-04-01T00:00:00Z',
    periodEndDate: '2026-06-30T23:59:59Z',
    businessLine: BusinessLine.TurnkeyAutomation,
    projectedRevenueInPaise: 120_000_000_00,
    projectedRevenueInRupees: 12_000_000,
    projectedCogsInPaise: 88_800_000_00,
    projectedCogsInRupees: 8_880_000,
    projectedOperatingExpensesInPaise: 14_400_000_00,
    projectedOperatingExpensesInRupees: 1_440_000,
    projectedMarginPercent: 26.0,
    conservativeRevenueInPaise: 102_000_000_00,
    conservativeRevenueInRupees: 10_200_000,
    optimisticRevenueInPaise: 138_000_000_00,
    optimisticRevenueInRupees: 13_800_000,
    actualRevenueInPaise: 118_500_000_00,
    actualRevenueInRupees: 11_850_000,
    actualCogsInPaise: 87_400_000_00,
    actualCogsInRupees: 8_740_000,
    capacityHoursRequired: 1600,
    status: ProjectionItemStatus.Achieved,
  },
  {
    id: 'item-2',
    planId: 'plan-1',
    periodLabel: 'Q1 (Apr - Jun)',
    periodStartDate: '2026-04-01T00:00:00Z',
    periodEndDate: '2026-06-30T23:59:59Z',
    businessLine: BusinessLine.DrivesAndMotors,
    projectedRevenueInPaise: 75_000_000_00,
    projectedRevenueInRupees: 7_500_000,
    projectedCogsInPaise: 58_500_000_00,
    projectedCogsInRupees: 5_850_000,
    projectedOperatingExpensesInPaise: 6_000_000_00,
    projectedOperatingExpensesInRupees: 600_000,
    projectedMarginPercent: 22.0,
    conservativeRevenueInPaise: 63_750_000_00,
    conservativeRevenueInRupees: 6_375_000,
    optimisticRevenueInPaise: 86_250_000_00,
    optimisticRevenueInRupees: 8_625_000,
    actualRevenueInPaise: 72_000_000_00,
    actualRevenueInRupees: 7_200_000,
    actualCogsInPaise: 56_160_000_00,
    actualCogsInRupees: 5_616_000,
    capacityHoursRequired: 400,
    status: ProjectionItemStatus.OnTrack,
  },
  {
    id: 'item-3',
    planId: 'plan-1',
    periodLabel: 'Q1 (Apr - Jun)',
    periodStartDate: '2026-04-01T00:00:00Z',
    periodEndDate: '2026-06-30T23:59:59Z',
    businessLine: BusinessLine.Instrumentation,
    projectedRevenueInPaise: 45_000_000_00,
    projectedRevenueInRupees: 4_500_000,
    projectedCogsInPaise: 30_600_000_00,
    projectedCogsInRupees: 3_060_000,
    projectedOperatingExpensesInPaise: 4_500_000_00,
    projectedOperatingExpensesInRupees: 450_000,
    projectedMarginPercent: 32.0,
    conservativeRevenueInPaise: 38_250_000_00,
    conservativeRevenueInRupees: 3_825_000,
    optimisticRevenueInPaise: 51_750_000_00,
    optimisticRevenueInRupees: 5_175_000,
    actualRevenueInPaise: 44_200_000_00,
    actualRevenueInRupees: 4_420_000,
    actualCogsInPaise: 30_050_000_00,
    actualCogsInRupees: 3_005_000,
    capacityHoursRequired: 300,
    status: ProjectionItemStatus.OnTrack,
  },
  {
    id: 'item-4',
    planId: 'plan-1',
    periodLabel: 'Q1 (Apr - Jun)',
    periodStartDate: '2026-04-01T00:00:00Z',
    periodEndDate: '2026-06-30T23:59:59Z',
    businessLine: BusinessLine.AmcAndServices,
    projectedRevenueInPaise: 35_000_000_00,
    projectedRevenueInRupees: 3_500_000,
    projectedCogsInPaise: 19_250_000_00,
    projectedCogsInRupees: 1_925_000,
    projectedOperatingExpensesInPaise: 5_250_000_00,
    projectedOperatingExpensesInRupees: 525_000,
    projectedMarginPercent: 45.0,
    conservativeRevenueInPaise: 29_750_000_00,
    conservativeRevenueInRupees: 2_975_000,
    optimisticRevenueInPaise: 40_250_000_00,
    optimisticRevenueInRupees: 4_025_000,
    actualRevenueInPaise: 36_100_000_00,
    actualRevenueInRupees: 3_610_000,
    actualCogsInPaise: 19_855_000_00,
    actualCogsInRupees: 1_985_500,
    capacityHoursRequired: 800,
    status: ProjectionItemStatus.Achieved,
  },
  {
    id: 'item-5',
    planId: 'plan-1',
    periodLabel: 'Q1 (Apr - Jun)',
    periodStartDate: '2026-04-01T00:00:00Z',
    periodEndDate: '2026-06-30T23:59:59Z',
    businessLine: BusinessLine.SparesAndConsumables,
    projectedRevenueInPaise: 25_000_000_00,
    projectedRevenueInRupees: 2_500_000,
    projectedCogsInPaise: 18_000_000_00,
    projectedCogsInRupees: 1_800_000,
    projectedOperatingExpensesInPaise: 2_000_000_00,
    projectedOperatingExpensesInRupees: 200_000,
    projectedMarginPercent: 28.0,
    conservativeRevenueInPaise: 21_250_000_00,
    conservativeRevenueInRupees: 2_125_000,
    optimisticRevenueInPaise: 28_750_000_00,
    optimisticRevenueInRupees: 2_875_000,
    actualRevenueInPaise: 26_200_000_00,
    actualRevenueInRupees: 2_620_000,
    actualCogsInPaise: 18_864_000_00,
    actualCogsInRupees: 1_886_400,
    capacityHoursRequired: 200,
    status: ProjectionItemStatus.Achieved,
  },

  // Q2
  {
    id: 'item-6',
    planId: 'plan-1',
    periodLabel: 'Q2 (Jul - Sep)',
    periodStartDate: '2026-07-01T00:00:00Z',
    periodEndDate: '2026-09-30T23:59:59Z',
    businessLine: BusinessLine.TurnkeyAutomation,
    projectedRevenueInPaise: 135_000_000_00,
    projectedRevenueInRupees: 13_500_000,
    projectedCogsInPaise: 99_900_000_00,
    projectedCogsInRupees: 9_990_000,
    projectedOperatingExpensesInPaise: 16_200_000_00,
    projectedOperatingExpensesInRupees: 1_620_000,
    projectedMarginPercent: 26.0,
    conservativeRevenueInPaise: 114_750_000_00,
    conservativeRevenueInRupees: 11_475_000,
    optimisticRevenueInPaise: 155_250_000_00,
    optimisticRevenueInRupees: 15_525_000,
    actualRevenueInPaise: 128_000_000_00,
    actualRevenueInRupees: 12_800_000,
    actualCogsInPaise: 95_200_000_00,
    actualCogsInRupees: 9_520_000,
    capacityHoursRequired: 1800,
    status: ProjectionItemStatus.OnTrack,
  },
  {
    id: 'item-7',
    planId: 'plan-1',
    periodLabel: 'Q2 (Jul - Sep)',
    periodStartDate: '2026-07-01T00:00:00Z',
    periodEndDate: '2026-09-30T23:59:59Z',
    businessLine: BusinessLine.DrivesAndMotors,
    projectedRevenueInPaise: 80_000_000_00,
    projectedRevenueInRupees: 8_000_000,
    projectedCogsInPaise: 62_400_000_00,
    projectedCogsInRupees: 6_240_000,
    projectedOperatingExpensesInPaise: 6_400_000_00,
    projectedOperatingExpensesInRupees: 640_000,
    projectedMarginPercent: 22.0,
    conservativeRevenueInPaise: 68_000_000_00,
    conservativeRevenueInRupees: 6_800_000,
    optimisticRevenueInPaise: 92_000_000_00,
    optimisticRevenueInRupees: 9_200_000,
    actualRevenueInPaise: 76_500_000_00,
    actualRevenueInRupees: 7_650_000,
    actualCogsInPaise: 59_670_000_00,
    actualCogsInRupees: 5_967_000,
    capacityHoursRequired: 450,
    status: ProjectionItemStatus.OnTrack,
  },
  {
    id: 'item-8',
    planId: 'plan-1',
    periodLabel: 'Q2 (Jul - Sep)',
    periodStartDate: '2026-07-01T00:00:00Z',
    periodEndDate: '2026-09-30T23:59:59Z',
    businessLine: BusinessLine.Instrumentation,
    projectedRevenueInPaise: 50_000_000_00,
    projectedRevenueInRupees: 5_000_000,
    projectedCogsInPaise: 34_000_000_00,
    projectedCogsInRupees: 3_400_000,
    projectedOperatingExpensesInPaise: 5_000_000_00,
    projectedOperatingExpensesInRupees: 500_000,
    projectedMarginPercent: 32.0,
    conservativeRevenueInPaise: 42_500_000_00,
    conservativeRevenueInRupees: 4_250_000,
    optimisticRevenueInPaise: 57_500_000_00,
    optimisticRevenueInRupees: 5_750_000,
    actualRevenueInPaise: 46_000_000_00,
    actualRevenueInRupees: 4_600_000,
    actualCogsInPaise: 31_280_000_00,
    actualCogsInRupees: 3_128_000,
    capacityHoursRequired: 350,
    status: ProjectionItemStatus.OnTrack,
  },
  {
    id: 'item-9',
    planId: 'plan-1',
    periodLabel: 'Q2 (Jul - Sep)',
    periodStartDate: '2026-07-01T00:00:00Z',
    periodEndDate: '2026-09-30T23:59:59Z',
    businessLine: BusinessLine.AmcAndServices,
    projectedRevenueInPaise: 40_000_000_00,
    projectedRevenueInRupees: 4_000_000,
    projectedCogsInPaise: 22_000_000_00,
    projectedCogsInRupees: 2_200_000,
    projectedOperatingExpensesInPaise: 6_000_000_00,
    projectedOperatingExpensesInRupees: 600_000,
    projectedMarginPercent: 45.0,
    conservativeRevenueInPaise: 34_000_000_00,
    conservativeRevenueInRupees: 3_400_000,
    optimisticRevenueInPaise: 46_000_000_00,
    optimisticRevenueInRupees: 4_600_000,
    actualRevenueInPaise: 41_200_000_00,
    actualRevenueInRupees: 4_120_000,
    actualCogsInPaise: 22_660_000_00,
    actualCogsInRupees: 2_266_000,
    capacityHoursRequired: 900,
    status: ProjectionItemStatus.Achieved,
  },
  {
    id: 'item-10',
    planId: 'plan-1',
    periodLabel: 'Q2 (Jul - Sep)',
    periodStartDate: '2026-07-01T00:00:00Z',
    periodEndDate: '2026-09-30T23:59:59Z',
    businessLine: BusinessLine.SparesAndConsumables,
    projectedRevenueInPaise: 30_000_000_00,
    projectedRevenueInRupees: 3_000_000,
    projectedCogsInPaise: 21_600_000_00,
    projectedCogsInRupees: 2_160_000,
    projectedOperatingExpensesInPaise: 2_400_000_00,
    projectedOperatingExpensesInRupees: 240_000,
    projectedMarginPercent: 28.0,
    conservativeRevenueInPaise: 25_500_000_00,
    conservativeRevenueInRupees: 2_550_000,
    optimisticRevenueInPaise: 34_500_000_00,
    optimisticRevenueInRupees: 3_450_000,
    actualRevenueInPaise: 28_000_000_00,
    actualRevenueInRupees: 2_800_000,
    actualCogsInPaise: 20_160_000_00,
    actualCogsInRupees: 2_016_000,
    capacityHoursRequired: 250,
    status: ProjectionItemStatus.OnTrack,
  },

  // Q3
  {
    id: 'item-11',
    planId: 'plan-1',
    periodLabel: 'Q3 (Oct - Dec)',
    periodStartDate: '2026-10-01T00:00:00Z',
    periodEndDate: '2026-12-31T23:59:59Z',
    businessLine: BusinessLine.TurnkeyAutomation,
    projectedRevenueInPaise: 150_000_000_00,
    projectedRevenueInRupees: 15_000_000,
    projectedCogsInPaise: 111_000_000_00,
    projectedCogsInRupees: 11_100_000,
    projectedOperatingExpensesInPaise: 18_000_000_00,
    projectedOperatingExpensesInRupees: 1_800_000,
    projectedMarginPercent: 26.0,
    conservativeRevenueInPaise: 127_500_000_00,
    conservativeRevenueInRupees: 12_750_000,
    optimisticRevenueInPaise: 172_500_000_00,
    optimisticRevenueInRupees: 17_250_000,
    actualRevenueInPaise: 0,
    actualRevenueInRupees: 0,
    actualCogsInPaise: 0,
    actualCogsInRupees: 0,
    capacityHoursRequired: 2000,
    status: ProjectionItemStatus.Planned,
  },
  {
    id: 'item-12',
    planId: 'plan-1',
    periodLabel: 'Q3 (Oct - Dec)',
    periodStartDate: '2026-10-01T00:00:00Z',
    periodEndDate: '2026-12-31T23:59:59Z',
    businessLine: BusinessLine.DrivesAndMotors,
    projectedRevenueInPaise: 85_000_000_00,
    projectedRevenueInRupees: 8_500_000,
    projectedCogsInPaise: 66_300_000_00,
    projectedCogsInRupees: 6_630_000,
    projectedOperatingExpensesInPaise: 6_800_000_00,
    projectedOperatingExpensesInRupees: 680_000,
    projectedMarginPercent: 22.0,
    conservativeRevenueInPaise: 72_250_000_00,
    conservativeRevenueInRupees: 7_225_000,
    optimisticRevenueInPaise: 97_750_000_00,
    optimisticRevenueInRupees: 9_775_000,
    actualRevenueInPaise: 0,
    actualRevenueInRupees: 0,
    actualCogsInPaise: 0,
    actualCogsInRupees: 0,
    capacityHoursRequired: 480,
    status: ProjectionItemStatus.Planned,
  },
  {
    id: 'item-13',
    planId: 'plan-1',
    periodLabel: 'Q3 (Oct - Dec)',
    periodStartDate: '2026-10-01T00:00:00Z',
    periodEndDate: '2026-12-31T23:59:59Z',
    businessLine: BusinessLine.Instrumentation,
    projectedRevenueInPaise: 55_000_000_00,
    projectedRevenueInRupees: 5_500_000,
    projectedCogsInPaise: 37_400_000_00,
    projectedCogsInRupees: 3_740_000,
    projectedOperatingExpensesInPaise: 5_500_000_00,
    projectedOperatingExpensesInRupees: 550_000,
    projectedMarginPercent: 32.0,
    conservativeRevenueInPaise: 46_750_000_00,
    conservativeRevenueInRupees: 4_675_000,
    optimisticRevenueInPaise: 63_250_000_00,
    optimisticRevenueInRupees: 6_325_000,
    actualRevenueInPaise: 0,
    actualRevenueInRupees: 0,
    actualCogsInPaise: 0,
    actualCogsInRupees: 0,
    capacityHoursRequired: 380,
    status: ProjectionItemStatus.Planned,
  },
  {
    id: 'item-14',
    planId: 'plan-1',
    periodLabel: 'Q3 (Oct - Dec)',
    periodStartDate: '2026-10-01T00:00:00Z',
    periodEndDate: '2026-12-31T23:59:59Z',
    businessLine: BusinessLine.AmcAndServices,
    projectedRevenueInPaise: 42_000_000_00,
    projectedRevenueInRupees: 4_200_000,
    projectedCogsInPaise: 23_100_000_00,
    projectedCogsInRupees: 2_310_000,
    projectedOperatingExpensesInPaise: 6_300_000_00,
    projectedOperatingExpensesInRupees: 630_000,
    projectedMarginPercent: 45.0,
    conservativeRevenueInPaise: 35_700_000_00,
    conservativeRevenueInRupees: 3_570_000,
    optimisticRevenueInPaise: 48_300_000_00,
    optimisticRevenueInRupees: 4_830_000,
    actualRevenueInPaise: 0,
    actualRevenueInRupees: 0,
    actualCogsInPaise: 0,
    actualCogsInRupees: 0,
    capacityHoursRequired: 950,
    status: ProjectionItemStatus.Planned,
  },
  {
    id: 'item-15',
    planId: 'plan-1',
    periodLabel: 'Q3 (Oct - Dec)',
    periodStartDate: '2026-10-01T00:00:00Z',
    periodEndDate: '2026-12-31T23:59:59Z',
    businessLine: BusinessLine.SparesAndConsumables,
    projectedRevenueInPaise: 32_000_000_00,
    projectedRevenueInRupees: 3_200_000,
    projectedCogsInPaise: 23_040_000_00,
    projectedCogsInRupees: 2_304_000,
    projectedOperatingExpensesInPaise: 2_560_000_00,
    projectedOperatingExpensesInRupees: 256_000,
    projectedMarginPercent: 28.0,
    conservativeRevenueInPaise: 27_200_000_00,
    conservativeRevenueInRupees: 2_720_000,
    optimisticRevenueInPaise: 36_800_000_00,
    optimisticRevenueInRupees: 3_680_000,
    actualRevenueInPaise: 0,
    actualRevenueInRupees: 0,
    actualCogsInPaise: 0,
    actualCogsInRupees: 0,
    capacityHoursRequired: 270,
    status: ProjectionItemStatus.Planned,
  },

  // Q4
  {
    id: 'item-16',
    planId: 'plan-1',
    periodLabel: 'Q4 (Jan - Mar)',
    periodStartDate: '2027-01-01T00:00:00Z',
    periodEndDate: '2027-03-31T23:59:59Z',
    businessLine: BusinessLine.TurnkeyAutomation,
    projectedRevenueInPaise: 165_000_000_00,
    projectedRevenueInRupees: 16_500_000,
    projectedCogsInPaise: 122_100_000_00,
    projectedCogsInRupees: 12_210_000,
    projectedOperatingExpensesInPaise: 19_800_000_00,
    projectedOperatingExpensesInRupees: 1_980_000,
    projectedMarginPercent: 26.0,
    conservativeRevenueInPaise: 140_250_000_00,
    conservativeRevenueInRupees: 14_025_000,
    optimisticRevenueInPaise: 189_750_000_00,
    optimisticRevenueInRupees: 18_975_000,
    actualRevenueInPaise: 0,
    actualRevenueInRupees: 0,
    actualCogsInPaise: 0,
    actualCogsInRupees: 0,
    capacityHoursRequired: 2200,
    status: ProjectionItemStatus.Planned,
  },
  {
    id: 'item-17',
    planId: 'plan-1',
    periodLabel: 'Q4 (Jan - Mar)',
    periodStartDate: '2027-01-01T00:00:00Z',
    periodEndDate: '2027-03-31T23:59:59Z',
    businessLine: BusinessLine.DrivesAndMotors,
    projectedRevenueInPaise: 90_000_000_00,
    projectedRevenueInRupees: 9_000_000,
    projectedCogsInPaise: 70_200_000_00,
    projectedCogsInRupees: 7_020_000,
    projectedOperatingExpensesInPaise: 7_200_000_00,
    projectedOperatingExpensesInRupees: 720_000,
    projectedMarginPercent: 22.0,
    conservativeRevenueInPaise: 76_500_000_00,
    conservativeRevenueInRupees: 7_650_000,
    optimisticRevenueInPaise: 103_500_000_00,
    optimisticRevenueInRupees: 10_350_000,
    actualRevenueInPaise: 0,
    actualRevenueInRupees: 0,
    actualCogsInPaise: 0,
    actualCogsInRupees: 0,
    capacityHoursRequired: 500,
    status: ProjectionItemStatus.Planned,
  },
  {
    id: 'item-18',
    planId: 'plan-1',
    periodLabel: 'Q4 (Jan - Mar)',
    periodStartDate: '2027-01-01T00:00:00Z',
    periodEndDate: '2027-03-31T23:59:59Z',
    businessLine: BusinessLine.Instrumentation,
    projectedRevenueInPaise: 60_000_000_00,
    projectedRevenueInRupees: 6_000_000,
    projectedCogsInPaise: 40_800_000_00,
    projectedCogsInRupees: 4_080_000,
    projectedOperatingExpensesInPaise: 6_000_000_00,
    projectedOperatingExpensesInRupees: 600_000,
    projectedMarginPercent: 32.0,
    conservativeRevenueInPaise: 51_000_000_00,
    conservativeRevenueInRupees: 5_100_000,
    optimisticRevenueInPaise: 69_000_000_00,
    optimisticRevenueInRupees: 6_900_000,
    actualRevenueInPaise: 0,
    actualRevenueInRupees: 0,
    actualCogsInPaise: 0,
    actualCogsInRupees: 0,
    capacityHoursRequired: 420,
    status: ProjectionItemStatus.Planned,
  },
  {
    id: 'item-19',
    planId: 'plan-1',
    periodLabel: 'Q4 (Jan - Mar)',
    periodStartDate: '2027-01-01T00:00:00Z',
    periodEndDate: '2027-03-31T23:59:59Z',
    businessLine: BusinessLine.AmcAndServices,
    projectedRevenueInPaise: 45_000_000_00,
    projectedRevenueInRupees: 4_500_000,
    projectedCogsInPaise: 24_750_000_00,
    projectedCogsInRupees: 2_475_000,
    projectedOperatingExpensesInPaise: 6_750_000_00,
    projectedOperatingExpensesInRupees: 675_000,
    projectedMarginPercent: 45.0,
    conservativeRevenueInPaise: 38_250_000_00,
    conservativeRevenueInRupees: 3_825_000,
    optimisticRevenueInPaise: 51_750_000_00,
    optimisticRevenueInRupees: 5_175_000,
    actualRevenueInPaise: 0,
    actualRevenueInRupees: 0,
    actualCogsInPaise: 0,
    actualCogsInRupees: 0,
    capacityHoursRequired: 1000,
    status: ProjectionItemStatus.Planned,
  },
  {
    id: 'item-20',
    planId: 'plan-1',
    periodLabel: 'Q4 (Jan - Mar)',
    periodStartDate: '2027-01-01T00:00:00Z',
    periodEndDate: '2027-03-31T23:59:59Z',
    businessLine: BusinessLine.SparesAndConsumables,
    projectedRevenueInPaise: 35_000_000_00,
    projectedRevenueInRupees: 3_500_000,
    projectedCogsInPaise: 25_200_000_00,
    projectedCogsInRupees: 2_520_000,
    projectedOperatingExpensesInPaise: 2_800_000_00,
    projectedOperatingExpensesInRupees: 280_000,
    projectedMarginPercent: 28.0,
    conservativeRevenueInPaise: 29_750_000_00,
    conservativeRevenueInRupees: 2_975_000,
    optimisticRevenueInPaise: 40_250_000_00,
    optimisticRevenueInRupees: 4_025_000,
    actualRevenueInPaise: 0,
    actualRevenueInRupees: 0,
    actualCogsInPaise: 0,
    actualCogsInRupees: 0,
    capacityHoursRequired: 300,
    status: ProjectionItemStatus.Planned,
  },
];

const MOCK_ACTIVE_PLAN: ProjectionPlanDto = {
  id: 'plan-1',
  planCode: 'PLAN-2026-FY',
  title: 'FY 2026-27 Corporate Industrial Projection',
  fiscalYear: '2026-27',
  horizon: ProjectionHorizon.Quarterly,
  status: ProjectionPlanStatus.Active,
  baseScenario: ProjectionScenario.Realistic,
  targetRevenueInPaise: 13_820_000_000_00,
  targetRevenueInRupees: 138_200_000,
  targetCogsInPaise: 10_024_000_000_00,
  targetCogsInRupees: 100_240_000,
  targetGrossMarginPercent: 27.47,
  targetEbitdaInPaise: 2_340_000_000_00,
  targetEbitdaInRupees: 23_400_000,
  targetWorkingCapitalInPaise: 2_200_000_000_00,
  targetWorkingCapitalInRupees: 22_000_000,
  actualRevenueInPaise: 5_185_000_000_00,
  actualRevenueInRupees: 51_850_000,
  actualCogsInPaise: 3_756_710_000_00,
  actualCogsInRupees: 37_567_100,
  actualGrossMarginPercent: 27.55,
  variancePercent: -2.3,
  notes: 'Strategic operating plan calibrated against Q1/Q2 actuals and weighted pipeline deals.',
  items: MOCK_ITEMS,
};

const MOCK_DASHBOARD: ExecutiveProjectionDashboardDto = {
  totalProjectedAnnualRevenueInPaise: 13_820_000_000_00,
  totalProjectedAnnualRevenueInRupees: 138_200_000,
  ytdActualRevenueInPaise: 5_185_000_000_00,
  ytdActualRevenueInRupees: 51_850_000,
  ytdRealizationPercent: 74.5,
  projectedAnnualGrossMarginPercent: 27.5,
  actualYtdGrossMarginPercent: 27.55,
  projectedEbitdaInPaise: 2_340_000_000_00,
  projectedEbitdaInRupees: 23_400_000,
  forecastedYearEndLandingInPaise: 13_520_000_000_00,
  forecastedYearEndLandingInRupees: 135_200_000,
  businessLines: [
    {
      businessLine: BusinessLine.TurnkeyAutomation,
      businessLineName: 'Turnkey Automation & Panels',
      projectedRevenueInPaise: 5_700_000_000_00,
      projectedRevenueInRupees: 57_000_000,
      actualRevenueInPaise: 2_465_000_000_00,
      actualRevenueInRupees: 24_650_000,
      realizationPercent: 73.8,
      marginPercent: 26.0,
    },
    {
      businessLine: BusinessLine.DrivesAndMotors,
      businessLineName: 'Drives, VFDs & Motion Control',
      projectedRevenueInPaise: 3_300_000_000_00,
      projectedRevenueInRupees: 33_000_000,
      actualRevenueInPaise: 1_485_000_000_00,
      actualRevenueInRupees: 14_850_000,
      realizationPercent: 70.2,
      marginPercent: 22.0,
    },
    {
      businessLine: BusinessLine.Instrumentation,
      businessLineName: 'Process Instrumentation & Sensors',
      projectedRevenueInPaise: 2_100_000_000_00,
      projectedRevenueInRupees: 21_000_000,
      actualRevenueInPaise: 902_000_000_00,
      actualRevenueInRupees: 9_020_000,
      realizationPercent: 72.1,
      marginPercent: 32.0,
    },
    {
      businessLine: BusinessLine.AmcAndServices,
      businessLineName: 'AMC & Field Service SLA',
      projectedRevenueInPaise: 1_620_000_000_00,
      projectedRevenueInRupees: 16_200_000,
      actualRevenueInPaise: 773_000_000_00,
      actualRevenueInRupees: 7_730_000,
      realizationPercent: 81.3,
      marginPercent: 45.0,
    },
    {
      businessLine: BusinessLine.SparesAndConsumables,
      businessLineName: 'Spares, Consumables & Re-orders',
      projectedRevenueInPaise: 1_100_000_000_00,
      projectedRevenueInRupees: 11_000_000,
      actualRevenueInPaise: 542_000_000_00,
      actualRevenueInRupees: 5_420_000,
      realizationPercent: 80.8,
      marginPercent: 28.0,
    },
  ],
  quarterlyTrajections: [
    {
      quarterLabel: 'Q1 (Apr - Jun)',
      targetRevenueInPaise: 3_000_000_000_00,
      targetRevenueInRupees: 30_000_000,
      actualRevenueInPaise: 2_969_000_000_00,
      actualRevenueInRupees: 29_690_000,
      conservativeInPaise: 2_550_000_000_00,
      conservativeInRupees: 25_500_000,
      optimisticInPaise: 3_450_000_000_00,
      optimisticInRupees: 34_500_000,
      status: ProjectionItemStatus.Achieved,
    },
    {
      quarterLabel: 'Q2 (Jul - Sep)',
      targetRevenueInPaise: 3_350_000_000_00,
      targetRevenueInRupees: 33_500_000,
      actualRevenueInPaise: 3_197_000_000_00,
      actualRevenueInRupees: 31_970_000,
      conservativeInPaise: 2_847_500_000_00,
      conservativeInRupees: 28_475_000,
      optimisticInPaise: 3_852_500_000_00,
      optimisticInRupees: 38_525_000,
      status: ProjectionItemStatus.OnTrack,
    },
    {
      quarterLabel: 'Q3 (Oct - Dec)',
      targetRevenueInPaise: 3_640_000_000_00,
      targetRevenueInRupees: 36_400_000,
      actualRevenueInPaise: 0,
      actualRevenueInRupees: 0,
      conservativeInPaise: 3_094_000_000_00,
      conservativeInRupees: 30_940_000,
      optimisticInPaise: 4_186_000_000_00,
      optimisticInRupees: 41_860_000,
      status: ProjectionItemStatus.Planned,
    },
    {
      quarterLabel: 'Q4 (Jan - Mar)',
      targetRevenueInPaise: 3_830_000_000_00,
      targetRevenueInRupees: 38_300_000,
      actualRevenueInPaise: 0,
      actualRevenueInRupees: 0,
      conservativeInPaise: 3_255_500_000_00,
      conservativeInRupees: 32_555_000,
      optimisticInPaise: 4_404_500_000_00,
      optimisticInRupees: 44_045_000,
      status: ProjectionItemStatus.Planned,
    },
  ],
};

const MOCK_SCENARIO_RESULT: ScenarioAnalysisResultDto = {
  planId: 'plan-1',
  fiscalYear: '2026-27',
  conservative: {
    scenario: ProjectionScenario.Conservative,
    totalRevenueInPaise: 11_747_000_000_00,
    totalRevenueInRupees: 117_470_000,
    totalCogsInPaise: 8_520_400_000_00,
    totalCogsInRupees: 85_204_000,
    grossMarginPercent: 27.47,
    projectedEbitdaInPaise: 1_650_000_000_00,
    projectedEbitdaInRupees: 16_500_000,
    workingCapitalRequirementInPaise: 1_870_000_000_00,
    workingCapitalRequirementInRupees: 18_700_000,
  },
  realistic: {
    scenario: ProjectionScenario.Realistic,
    totalRevenueInPaise: 13_820_000_000_00,
    totalRevenueInRupees: 138_200_000,
    totalCogsInPaise: 10_024_000_000_00,
    totalCogsInRupees: 100_240_000,
    grossMarginPercent: 27.47,
    projectedEbitdaInPaise: 2_340_000_000_00,
    projectedEbitdaInRupees: 23_400_000,
    workingCapitalRequirementInPaise: 2_200_000_000_00,
    workingCapitalRequirementInRupees: 22_000_000,
  },
  optimistic: {
    scenario: ProjectionScenario.Optimistic,
    totalRevenueInPaise: 15_893_000_000_00,
    totalRevenueInRupees: 158_930_000,
    totalCogsInPaise: 11_527_600_000_00,
    totalCogsInRupees: 115_276_000,
    grossMarginPercent: 27.47,
    projectedEbitdaInPaise: 3_120_000_000_00,
    projectedEbitdaInRupees: 31_200_000,
    workingCapitalRequirementInPaise: 2_540_000_000_00,
    workingCapitalRequirementInRupees: 25_400_000,
  },
  executiveSummary:
    'Sensitivity modeling indicates an operational revenue floor of ₹11.75 Cr under conservative macroeconomic drag (-15%) with a resilient EBITDA of ₹1.65 Cr. Optimistic upside delivers ₹15.89 Cr (+15%) revenue requiring an incremental ₹34L in working capital buffer to finance upfront Siemens PLC and ABB drive inventories.',
};

@Component({
  selector: 'ar-projection-plan',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ArTopbar, ArButton, ArCard, ArChip, ArDialog, ArIcon],
  template: `
    <div class="projection-page">
      <ar-topbar
        title="Strategic Projection Plan"
        subtitle="Multi-horizon revenue, COGS, margin targets, ERP actual variance & scenario sensitivity"
      >
        <div class="topbar-actions">
          <button
            type="button"
            ar-button
            variant="ai"
            icon="sparkle"
            (click)="showGenerateModal.set(true)"
          >
            AI Auto-Generate Plan
          </button>
          <button
            type="button"
            ar-button
            variant="ghost"
            icon="refresh"
            [disabled]="isLoading() || !currentPlan()"
            (click)="syncActualsFromErp()"
          >
            Sync ERP Actuals
          </button>
          <button
            type="button"
            ar-button
            variant="ghost"
            icon="analytics"
            [disabled]="isLoading() || !currentPlan()"
            (click)="runScenarioAnalysis()"
          >
            Scenario Sensitivity
          </button>
          <button
            type="button"
            ar-button
            variant="primary"
            icon="plus"
            (click)="showCreateModal.set(true)"
          >
            New Plan
          </button>
        </div>
      </ar-topbar>

      <!-- KPI Executive Summary Cards -->
      <section class="kpi-grid">
        <ar-card class="kpi-card">
          <div class="kpi-label">Projected FY Revenue</div>
          <div class="kpi-value text-accent">
            {{ formatPaiseCompact(currentPlan()?.targetRevenueInPaise ?? 0) }}
          </div>
          <div class="kpi-subtext">
            <span>Target: {{ formatPaise(currentPlan()?.targetRevenueInPaise ?? 0) }}</span>
            <ar-chip tone="teal">FY {{ currentPlan()?.fiscalYear ?? '2026-27' }}</ar-chip>
          </div>
        </ar-card>

        <ar-card class="kpi-card">
          <div class="kpi-label">YTD Actual Realized</div>
          <div class="kpi-value text-good">
            {{ formatPaiseCompact(currentPlan()?.actualRevenueInPaise ?? 0) }}
          </div>
          <div class="kpi-subtext">
            <span
              >Landing:
              {{ formatPaiseCompact(dashboard()?.forecastedYearEndLandingInPaise ?? 0) }}</span
            >
            <span class="pill-badge" [class.positive]="ytdPacing() >= 70">
              {{ ytdPacing() }}% pace
            </span>
          </div>
        </ar-card>

        <ar-card class="kpi-card">
          <div class="kpi-label">Gross Margin %</div>
          <div class="kpi-value">
            {{
              (
                currentPlan()?.actualGrossMarginPercent ??
                currentPlan()?.targetGrossMarginPercent ??
                0
              ).toFixed(1)
            }}%
          </div>
          <div class="kpi-subtext">
            <span>Target: {{ (currentPlan()?.targetGrossMarginPercent ?? 0).toFixed(1) }}%</span>
            <span
              class="margin-delta"
              [class.above]="
                (currentPlan()?.actualGrossMarginPercent ?? 0) >=
                (currentPlan()?.targetGrossMarginPercent ?? 0)
              "
            >
              {{
                (
                  (currentPlan()?.actualGrossMarginPercent ?? 0) -
                  (currentPlan()?.targetGrossMarginPercent ?? 0)
                ).toFixed(1)
              }}% diff
            </span>
          </div>
        </ar-card>

        <ar-card class="kpi-card">
          <div class="kpi-label">Projected EBITDA</div>
          <div class="kpi-value text-good">
            {{ formatPaiseCompact(currentPlan()?.targetEbitdaInPaise ?? 0) }}
          </div>
          <div class="kpi-subtext">
            <span>EBITDA Margin: {{ ebitdaPercent().toFixed(1) }}%</span>
            <ar-chip tone="neutral">Realistic</ar-chip>
          </div>
        </ar-card>

        <ar-card class="kpi-card">
          <div class="kpi-label">Working Capital Required</div>
          <div class="kpi-value text-warn">
            {{ formatPaiseCompact(currentPlan()?.targetWorkingCapitalInPaise ?? 0) }}
          </div>
          <div class="kpi-subtext">
            <span>Variance: {{ (currentPlan()?.variancePercent ?? 0).toFixed(1) }}%</span>
            <ar-chip [tone]="getPlanStatusTone(currentPlan()?.status ?? 0)">
              {{ getPlanStatusLabel(currentPlan()?.status ?? 0) }}
            </ar-chip>
          </div>
        </ar-card>
      </section>

      <!-- Navigation Tabs -->
      <div class="tab-bar">
        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab() === 'dashboard'"
          (click)="activeTab.set('dashboard')"
        >
          <ar-icon name="analytics"></ar-icon>
          Executive Dashboard
        </button>
        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab() === 'matrix'"
          (click)="activeTab.set('matrix')"
        >
          <ar-icon name="document"></ar-icon>
          Projection Matrix ({{ currentPlan()?.items?.length ?? 0 }})
        </button>
        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab() === 'scenarios'"
          (click)="activeTab.set('scenarios')"
        >
          <ar-icon name="sparkle"></ar-icon>
          Scenario Sensitivity
        </button>
        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab() === 'plans'"
          (click)="activeTab.set('plans')"
        >
          <ar-icon name="refresh"></ar-icon>
          All Plans ({{ plans().length }})
        </button>
      </div>

      <!-- Tab 1: Executive Dashboard -->
      @if (activeTab() === 'dashboard') {
        <div class="dashboard-container">
          <!-- Trajectory & Quarterly Breakdown -->
          <div class="dashboard-grid">
            <ar-card class="section-card">
              <div class="card-head">
                <h3>Quarterly Trajectory & Realization</h3>
                <span class="subhead">Target vs Actual vs Sensitivity Range</span>
              </div>
              <div class="trajectories-list">
                @for (q of dashboard()?.quarterlyTrajections ?? []; track q.quarterLabel) {
                  <div class="trajectory-item">
                    <div class="traj-header">
                      <span class="traj-name font-semibold">{{ q.quarterLabel }}</span>
                      <ar-chip [tone]="getItemStatusTone(q.status)">
                        {{ getItemStatusLabel(q.status) }}
                      </ar-chip>
                    </div>
                    <div class="traj-metrics">
                      <div class="metric-row">
                        <span class="label">Target:</span>
                        <span class="val font-semibold tabular-nums">{{
                          formatPaise(q.targetRevenueInPaise)
                        }}</span>
                      </div>
                      <div class="metric-row">
                        <span class="label">Actual Realized:</span>
                        <span class="val text-good font-semibold tabular-nums">
                          {{
                            q.actualRevenueInPaise > 0
                              ? formatPaise(q.actualRevenueInPaise)
                              : 'In Progress'
                          }}
                        </span>
                      </div>
                      <div class="metric-row">
                        <span class="label">Range (Cons - Opt):</span>
                        <span class="val text-muted tabular-nums">
                          {{ formatPaiseCompact(q.conservativeInPaise) }} –
                          {{ formatPaiseCompact(q.optimisticInPaise) }}
                        </span>
                      </div>
                    </div>
                    <!-- Progress Bar -->
                    @if (q.targetRevenueInPaise > 0) {
                      <div class="progress-bar-bg">
                        <div
                          class="progress-bar-fill"
                          [style.width.%]="
                            calcPercentage(q.actualRevenueInPaise, q.targetRevenueInPaise)
                          "
                        ></div>
                      </div>
                    }
                  </div>
                }
              </div>
            </ar-card>

            <!-- Business Line Contribution Breakdown -->
            <ar-card class="section-card">
              <div class="card-head">
                <h3>Industrial Business Line Contribution</h3>
                <span class="subhead">5 Strategic Revenue Pillars</span>
              </div>
              <div class="bl-list">
                @for (bl of dashboard()?.businessLines ?? []; track bl.businessLine) {
                  <div class="bl-item">
                    <div class="bl-head">
                      <span class="bl-title">{{ bl.businessLineName }}</span>
                      <span class="bl-share-tag">{{ bl.marginPercent }}% Margin</span>
                    </div>
                    <div class="bl-stats">
                      <div class="stat-col">
                        <span class="meta-lbl">Target</span>
                        <span class="meta-val tabular-nums">{{
                          formatPaiseCompact(bl.projectedRevenueInPaise)
                        }}</span>
                      </div>
                      <div class="stat-col">
                        <span class="meta-lbl">Realized</span>
                        <span class="meta-val text-good tabular-nums">{{
                          formatPaiseCompact(bl.actualRevenueInPaise)
                        }}</span>
                      </div>
                      <div class="stat-col">
                        <span class="meta-lbl">Realization</span>
                        <span class="meta-val font-semibold tabular-nums"
                          >{{ bl.realizationPercent.toFixed(1) }}%</span
                        >
                      </div>
                    </div>
                    <div class="progress-bar-bg">
                      <div
                        class="progress-bar-fill bg-brand"
                        [style.width.%]="Math.min(100, bl.realizationPercent)"
                      ></div>
                    </div>
                  </div>
                }
              </div>
            </ar-card>
          </div>

          <!-- Executive Insights Banner -->
          <div class="insights-banner">
            <ar-icon name="sparkle" class="insight-icon"></ar-icon>
            <div class="insight-content">
              <h4>AI Projection Strategic Assessment</h4>
              <p>
                Based on current Q1 & Q2 invoicing run-rates and weighted quotation probability in
                the pipeline, FY 2026-27 is tracking towards
                <strong>{{
                  formatPaiseCompact(dashboard()?.forecastedYearEndLandingInPaise ?? 0)
                }}</strong>
                (97.8% of annual plan). Turnkey Automation and AMC renewals show highest resilience,
                while Drive & Motor deliveries face longer lead-time buffer requirements in Q3.
              </p>
            </div>
          </div>
        </div>
      }

      <!-- Tab 2: Projection Matrix Table -->
      @if (activeTab() === 'matrix') {
        <ar-card class="matrix-card">
          <div class="matrix-toolbar">
            <div class="filter-group">
              <label for="quarterFilter">Quarter:</label>
              <select id="quarterFilter" [(ngModel)]="periodFilter" (change)="onFilterChanged()">
                <option value="All">All Quarters</option>
                <option value="Q1">Q1 (Apr - Jun)</option>
                <option value="Q2">Q2 (Jul - Sep)</option>
                <option value="Q3">Q3 (Oct - Dec)</option>
                <option value="Q4">Q4 (Jan - Mar)</option>
              </select>
            </div>
            <div class="filter-group">
              <label for="blFilter">Business Line:</label>
              <select id="blFilter" [(ngModel)]="businessLineFilter" (change)="onFilterChanged()">
                <option [ngValue]="null">All Business Lines</option>
                @for (opt of businessLineOptions; track opt.value) {
                  <option [ngValue]="opt.value">{{ opt.label }}</option>
                }
              </select>
            </div>
            <div class="record-counter">
              Showing {{ filteredItems().length }} of {{ currentPlan()?.items?.length ?? 0 }} items
            </div>
          </div>

          <div
            class="table-responsive"
            tabindex="0"
            role="region"
            aria-label="Strategic Projection Matrix"
          >
            <table class="projection-table">
              <thead>
                <tr>
                  <th scope="col">Period</th>
                  <th scope="col">Business Line</th>
                  <th scope="col" class="text-right">Projected Revenue</th>
                  <th scope="col" class="text-right">Projected COGS</th>
                  <th scope="col" class="text-center">Margin %</th>
                  <th scope="col" class="text-right">Conservative</th>
                  <th scope="col" class="text-right">Optimistic</th>
                  <th scope="col" class="text-right">ERP Actual</th>
                  <th scope="col" class="text-center">Capacity (Hrs)</th>
                  <th scope="col" class="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                @for (item of filteredItems(); track item.id) {
                  <tr>
                    <td class="font-semibold">{{ item.periodLabel }}</td>
                    <td>
                      <span class="bl-tag">{{ getBusinessLineName(item.businessLine) }}</span>
                    </td>
                    <td class="text-right font-semibold tabular-nums">
                      {{ formatPaise(item.projectedRevenueInPaise) }}
                    </td>
                    <td class="text-right text-muted tabular-nums">
                      {{ formatPaise(item.projectedCogsInPaise) }}
                    </td>
                    <td class="text-center font-medium tabular-nums">
                      {{ item.projectedMarginPercent.toFixed(1) }}%
                    </td>
                    <td class="text-right text-muted tabular-nums">
                      {{ formatPaiseCompact(item.conservativeRevenueInPaise) }}
                    </td>
                    <td class="text-right text-muted tabular-nums">
                      {{ formatPaiseCompact(item.optimisticRevenueInPaise) }}
                    </td>
                    <td
                      class="text-right font-semibold tabular-nums"
                      [class.text-good]="item.actualRevenueInPaise > 0"
                    >
                      {{
                        item.actualRevenueInPaise > 0 ? formatPaise(item.actualRevenueInPaise) : '—'
                      }}
                    </td>
                    <td class="text-center tabular-nums">{{ item.capacityHoursRequired }} hrs</td>
                    <td class="text-center">
                      <ar-chip [tone]="getItemStatusTone(item.status)">
                        {{ getItemStatusLabel(item.status) }}
                      </ar-chip>
                    </td>
                  </tr>
                }
                @if (filteredItems().length === 0) {
                  <tr>
                    <td colspan="10" class="empty-state">
                      No projection items match the selected filter.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </ar-card>
      }

      <!-- Tab 3: Scenario Sensitivity -->
      @if (activeTab() === 'scenarios') {
        <div class="scenarios-container">
          <div class="scenario-summary-banner">
            <h3>Executive Sensitivity Narrative</h3>
            <p>{{ scenarioResult()?.executiveSummary }}</p>
          </div>

          <div class="scenario-cards-grid">
            <!-- Conservative -->
            <ar-card class="scenario-card conservative-border">
              <div class="scenario-badge conservative-badge">Conservative (-15%)</div>
              <div class="scenario-rev tabular-nums">
                {{ formatPaiseCompact(scenarioResult()?.conservative?.totalRevenueInPaise ?? 0) }}
              </div>
              <div class="scenario-lbl">Revenue Floor</div>
              <div class="scenario-details">
                <div class="s-row">
                  <span>COGS:</span>
                  <span class="font-semibold tabular-nums">{{
                    formatPaiseCompact(scenarioResult()?.conservative?.totalCogsInPaise ?? 0)
                  }}</span>
                </div>
                <div class="s-row">
                  <span>Gross Margin:</span>
                  <span class="font-semibold tabular-nums"
                    >{{
                      (scenarioResult()?.conservative?.grossMarginPercent ?? 0).toFixed(1)
                    }}%</span
                  >
                </div>
                <div class="s-row">
                  <span>Projected EBITDA:</span>
                  <span class="font-semibold text-good tabular-nums">{{
                    formatPaiseCompact(scenarioResult()?.conservative?.projectedEbitdaInPaise ?? 0)
                  }}</span>
                </div>
                <div class="s-row">
                  <span>Working Capital:</span>
                  <span class="font-semibold text-warn tabular-nums">{{
                    formatPaiseCompact(
                      scenarioResult()?.conservative?.workingCapitalRequirementInPaise ?? 0
                    )
                  }}</span>
                </div>
              </div>
              <div class="scenario-note">
                Stress-tested against capital expenditure deferrals and project execution delays.
              </div>
            </ar-card>

            <!-- Realistic (Base) -->
            <ar-card class="scenario-card realistic-border active-plan-highlight">
              <div class="scenario-badge realistic-badge">Realistic (Base Plan)</div>
              <div class="scenario-rev text-accent tabular-nums">
                {{ formatPaiseCompact(scenarioResult()?.realistic?.totalRevenueInPaise ?? 0) }}
              </div>
              <div class="scenario-lbl">Target Operating Plan</div>
              <div class="scenario-details">
                <div class="s-row">
                  <span>COGS:</span>
                  <span class="font-semibold tabular-nums">{{
                    formatPaiseCompact(scenarioResult()?.realistic?.totalCogsInPaise ?? 0)
                  }}</span>
                </div>
                <div class="s-row">
                  <span>Gross Margin:</span>
                  <span class="font-semibold tabular-nums"
                    >{{ (scenarioResult()?.realistic?.grossMarginPercent ?? 0).toFixed(1) }}%</span
                  >
                </div>
                <div class="s-row">
                  <span>Projected EBITDA:</span>
                  <span class="font-semibold text-good tabular-nums">{{
                    formatPaiseCompact(scenarioResult()?.realistic?.projectedEbitdaInPaise ?? 0)
                  }}</span>
                </div>
                <div class="s-row">
                  <span>Working Capital:</span>
                  <span class="font-semibold text-warn tabular-nums">{{
                    formatPaiseCompact(
                      scenarioResult()?.realistic?.workingCapitalRequirementInPaise ?? 0
                    )
                  }}</span>
                </div>
              </div>
              <div class="scenario-note">
                Calibrated to historical conversion velocity and committed pipeline RFQs.
              </div>
            </ar-card>

            <!-- Optimistic -->
            <ar-card class="scenario-card optimistic-border">
              <div class="scenario-badge optimistic-badge">Optimistic (+15%)</div>
              <div class="scenario-rev text-good tabular-nums">
                {{ formatPaiseCompact(scenarioResult()?.optimistic?.totalRevenueInPaise ?? 0) }}
              </div>
              <div class="scenario-lbl">Upside Potential</div>
              <div class="scenario-details">
                <div class="s-row">
                  <span>COGS:</span>
                  <span class="font-semibold tabular-nums">{{
                    formatPaiseCompact(scenarioResult()?.optimistic?.totalCogsInPaise ?? 0)
                  }}</span>
                </div>
                <div class="s-row">
                  <span>Gross Margin:</span>
                  <span class="font-semibold tabular-nums"
                    >{{ (scenarioResult()?.optimistic?.grossMarginPercent ?? 0).toFixed(1) }}%</span
                  >
                </div>
                <div class="s-row">
                  <span>Projected EBITDA:</span>
                  <span class="font-semibold text-good tabular-nums">{{
                    formatPaiseCompact(scenarioResult()?.optimistic?.projectedEbitdaInPaise ?? 0)
                  }}</span>
                </div>
                <div class="s-row">
                  <span>Working Capital:</span>
                  <span class="font-semibold text-warn tabular-nums">{{
                    formatPaiseCompact(
                      scenarioResult()?.optimistic?.workingCapitalRequirementInPaise ?? 0
                    )
                  }}</span>
                </div>
              </div>
              <div class="scenario-note">
                Assumes 100% win rate on Tier-1 turnkey tenders and accelerated commissioning.
              </div>
            </ar-card>
          </div>
        </div>
      }

      <!-- Tab 4: All Plans List -->
      @if (activeTab() === 'plans') {
        <div class="plans-list-container">
          @for (p of plans(); track p.id) {
            <ar-card class="plan-card" [class.is-active]="p.id === currentPlan()?.id">
              <div class="plan-card-left">
                <div class="plan-top-row">
                  <span class="plan-code">{{ p.planCode }}</span>
                  <ar-chip [tone]="getPlanStatusTone(p.status)">
                    {{ getPlanStatusLabel(p.status) }}
                  </ar-chip>
                  <span class="fy-tag">FY {{ p.fiscalYear }}</span>
                </div>
                <h3 class="plan-title">{{ p.title }}</h3>
                <p class="plan-notes">{{ p.notes || 'No description provided.' }}</p>
                <div class="plan-meta-stats">
                  <span
                    >Target Revenue:
                    <strong class="tabular-nums">{{
                      formatPaise(p.targetRevenueInPaise)
                    }}</strong></span
                  >
                  <span
                    >Margin:
                    <strong class="tabular-nums"
                      >{{ p.targetGrossMarginPercent.toFixed(1) }}%</strong
                    ></span
                  >
                  <span
                    >EBITDA:
                    <strong class="tabular-nums">{{
                      formatPaiseCompact(p.targetEbitdaInPaise)
                    }}</strong></span
                  >
                </div>
              </div>
              <div class="plan-card-right">
                @if (p.id !== currentPlan()?.id) {
                  <button type="button" ar-button variant="ghost" (click)="selectPlan(p)">
                    Select Plan
                  </button>
                  @if (p.status !== ProjectionPlanStatus.Active) {
                    <button type="button" ar-button variant="primary" (click)="activatePlan(p)">
                      Make Active
                    </button>
                  }
                } @else {
                  <ar-chip tone="good">Currently Active</ar-chip>
                }
              </div>
            </ar-card>
          }
        </div>
      }

      <!-- Modal: AI Auto-Generate Plan -->
      @if (showGenerateModal()) {
        <ar-dialog
          title="AI Strategic Projection Plan Generator"
          (dismiss)="showGenerateModal.set(false)"
        >
          <div class="dialog-form">
            <p class="dialog-explainer">
              The AI projection engine analyzes historical order-to-cash invoices, pipeline weighted
              stages, and bill-of-materials costs to synthesize quarterly revenue and capacity
              targets across all 5 industrial business lines.
            </p>
            <div class="form-row">
              <label for="genFY">Fiscal Year</label>
              <input
                id="genFY"
                type="text"
                [(ngModel)]="genFiscalYear"
                class="form-input"
                placeholder="e.g. 2026-27"
              />
            </div>
            <div class="form-row">
              <label for="genGrowth">Annual Growth Rate Target (%)</label>
              <input
                id="genGrowth"
                type="number"
                [(ngModel)]="genGrowthRate"
                step="0.5"
                class="form-input"
              />
            </div>
            <div class="form-row">
              <label for="genMargin">Target Gross Margin (%)</label>
              <input
                id="genMargin"
                type="number"
                [(ngModel)]="genGrossMargin"
                step="0.5"
                class="form-input"
              />
            </div>
            <div class="form-row">
              <label for="genHoriz">Planning Horizon</label>
              <select id="genHoriz" [(ngModel)]="genHorizon" class="form-input">
                @for (opt of projectionHorizonOptions; track opt.value) {
                  <option [ngValue]="opt.value">{{ opt.label }}</option>
                }
              </select>
            </div>
            <div class="checkbox-row">
              <label>
                <input type="checkbox" [(ngModel)]="genIncludePipeline" />
                Include probability-weighted pipeline opportunities
              </label>
            </div>
          </div>
          <div dialogActions class="dialog-actions">
            <button type="button" ar-button variant="ghost" (click)="showGenerateModal.set(false)">
              Cancel
            </button>
            <button
              type="button"
              ar-button
              variant="ai"
              icon="sparkle"
              [disabled]="isGenerating()"
              (click)="onGenerateSubmit()"
            >
              {{ isGenerating() ? 'Synthesizing...' : 'Generate Strategic Plan' }}
            </button>
          </div>
        </ar-dialog>
      }

      <!-- Modal: Create New Plan -->
      @if (showCreateModal()) {
        <ar-dialog title="Create Projection Plan" (dismiss)="showCreateModal.set(false)">
          <div class="dialog-form">
            <div class="form-row">
              <label for="newPlanTitle">Plan Title *</label>
              <input
                id="newPlanTitle"
                type="text"
                [(ngModel)]="newPlanTitle"
                class="form-input"
                placeholder="e.g. FY 2027-28 Executive Expansion Plan"
              />
            </div>
            <div class="form-row">
              <label for="newPlanFY">Fiscal Year *</label>
              <input
                id="newPlanFY"
                type="text"
                [(ngModel)]="newPlanFiscalYear"
                class="form-input"
                placeholder="e.g. 2026-27"
              />
            </div>
            <div class="form-row">
              <label for="newPlanHoriz">Planning Horizon</label>
              <select id="newPlanHoriz" [(ngModel)]="newPlanHorizon" class="form-input">
                @for (opt of projectionHorizonOptions; track opt.value) {
                  <option [ngValue]="opt.value">{{ opt.label }}</option>
                }
              </select>
            </div>
            <div class="form-row">
              <label for="newPlanNotes">Notes & Strategic Context</label>
              <textarea
                id="newPlanNotes"
                [(ngModel)]="newPlanNotes"
                rows="3"
                class="form-input"
                placeholder="Describe key targets or operational assumptions..."
              ></textarea>
            </div>
          </div>
          <div dialogActions class="dialog-actions">
            <button type="button" ar-button variant="ghost" (click)="showCreateModal.set(false)">
              Cancel
            </button>
            <button
              type="button"
              ar-button
              variant="primary"
              [disabled]="!newPlanTitle.trim()"
              (click)="onCreatePlanSubmit()"
            >
              Create Plan
            </button>
          </div>
        </ar-dialog>
      }
    </div>
  `,
  styles: [
    `
      .projection-page {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        padding: 1.5rem;
        max-width: 1400px;
        margin: 0 auto;
      }

      .topbar-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      /* KPI Grid */
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 1rem;
      }

      .kpi-card {
        padding: 1.125rem 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
        background: var(--ar-white);
        border: 1px solid var(--ar-line-200);
        border-radius: var(--ar-radius-card);
        box-shadow: var(--ar-shadow-card);
        position: relative;
        overflow: hidden;
        transition:
          transform var(--ar-ease),
          box-shadow var(--ar-ease);
      }

      .kpi-card:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(16, 24, 40, 0.08);
      }

      .kpi-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: var(--ar-blue-500);
      }

      .kpi-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--ar-ink-400);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .kpi-value {
        font-size: 1.75rem;
        font-weight: 700;
        line-height: 1.15;
        color: var(--ar-ink-900);
      }

      .kpi-subtext {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 0.75rem;
        color: var(--ar-ink-500);
        margin-top: 0.25rem;
      }

      .pill-badge {
        padding: 0.125rem 0.4rem;
        border-radius: var(--ar-radius-chip);
        background: var(--ar-bg-100);
        color: var(--ar-ink-700);
        font-weight: 600;
      }

      .pill-badge.positive {
        color: var(--ar-green-600);
        background: var(--ar-green-100);
      }

      .margin-delta {
        font-weight: 600;
        font-size: 0.75rem;
      }

      .margin-delta.above {
        color: var(--ar-green-600);
      }

      .text-accent {
        color: var(--ar-blue-600);
      }

      .text-good {
        color: var(--ar-green-600);
      }

      .text-warn {
        color: var(--ar-amber-600);
      }

      .text-muted {
        color: var(--ar-ink-400);
      }

      .tabular-nums {
        font-variant-numeric: tabular-nums;
      }

      /* Tabs */
      .tab-bar {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        border-bottom: 1px solid var(--ar-line-200);
        padding-bottom: 0.5rem;
        overflow-x: auto;
      }

      .tab-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.875rem;
        font-size: 0.85rem;
        font-weight: 500;
        border: 1px solid transparent;
        background: none;
        color: var(--ar-ink-500);
        cursor: pointer;
        border-radius: var(--ar-radius-control);
        transition: all var(--ar-ease);
        white-space: nowrap;
      }

      .tab-btn:hover {
        color: var(--ar-ink-900);
        background: var(--ar-bg-50);
      }

      .tab-btn.active {
        color: var(--ar-blue-700);
        background: var(--ar-blue-100);
        border-color: var(--ar-blue-200);
        font-weight: 600;
      }

      /* Dashboard Layout */
      .dashboard-container {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(460px, 1fr));
        gap: 1.25rem;
      }

      .section-card {
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        background: var(--ar-white);
        border: 1px solid var(--ar-line-200);
        border-radius: var(--ar-radius-card);
        box-shadow: var(--ar-shadow-card);
      }

      .card-head h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: var(--ar-ink-900);
      }

      .card-head .subhead {
        font-size: 0.75rem;
        color: var(--ar-ink-400);
      }

      .trajectories-list,
      .bl-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .trajectory-item,
      .bl-item {
        padding: 0.875rem 1rem;
        background: var(--ar-bg-50);
        border-radius: var(--ar-radius-inset);
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        border: 1px solid var(--ar-line-200);
        transition:
          border-color var(--ar-ease),
          background var(--ar-ease);
      }

      .trajectory-item:hover,
      .bl-item:hover {
        background: var(--ar-white);
        border-color: var(--ar-blue-200);
      }

      .traj-header,
      .bl-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .bl-title {
        font-weight: 600;
        font-size: 0.9rem;
        color: var(--ar-ink-900);
      }

      .bl-share-tag {
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.125rem 0.5rem;
        border-radius: 9999px;
        background: var(--ar-blue-100);
        color: var(--ar-blue-700);
      }

      .traj-metrics,
      .bl-stats {
        display: flex;
        justify-content: space-between;
        gap: 0.5rem;
        font-size: 0.8125rem;
      }

      .metric-row {
        display: flex;
        gap: 0.375rem;
      }

      .metric-row .label,
      .stat-col .meta-lbl {
        color: var(--ar-ink-400);
      }

      .stat-col {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
      }

      .progress-bar-bg {
        height: 6px;
        width: 100%;
        background: var(--ar-line-200);
        border-radius: 9999px;
        overflow: hidden;
      }

      .progress-bar-fill {
        height: 100%;
        background: var(--ar-green-500);
        border-radius: 9999px;
        transition: width 0.3s ease;
      }

      .progress-bar-fill.bg-brand {
        background: var(--ar-blue-500);
      }

      .insights-banner {
        display: flex;
        gap: 1rem;
        align-items: flex-start;
        background: linear-gradient(135deg, var(--ar-ai-100) 0%, var(--ar-blue-100) 100%);
        border: 1px solid var(--ar-ai-200);
        border-radius: var(--ar-radius-card);
        padding: 1.25rem;
      }

      .insight-icon {
        font-size: 1.5rem;
        color: var(--ar-ai-700);
        margin-top: 0.125rem;
      }

      .insight-content h4 {
        margin: 0 0 0.375rem;
        font-size: 0.95rem;
        font-weight: 600;
        color: var(--ar-ai-800);
      }

      .insight-content p {
        margin: 0;
        font-size: 0.85rem;
        line-height: 1.5;
        color: var(--ar-ink-700);
      }

      /* Matrix Table */
      .matrix-card {
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        background: var(--ar-white);
        border: 1px solid var(--ar-line-200);
        border-radius: var(--ar-radius-card);
        box-shadow: var(--ar-shadow-card);
      }

      .matrix-toolbar {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        flex-wrap: wrap;
      }

      .filter-group {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.85rem;
        font-weight: 500;
        color: var(--ar-ink-700);
      }

      .filter-group select {
        height: var(--ar-control-h);
        padding: 0 0.75rem;
        border-radius: var(--ar-radius-control);
        border: 1px solid var(--ar-line-300);
        background: var(--ar-white);
        color: var(--ar-ink-900);
        font-size: 0.85rem;
        font-family: inherit;
      }

      .filter-group select:focus {
        outline: none;
        border-color: var(--ar-blue-500);
        box-shadow: var(--ar-focus-ring);
      }

      .record-counter {
        margin-left: auto;
        font-size: 0.8125rem;
        color: var(--ar-ink-400);
      }

      .table-responsive {
        overflow: auto;
        max-inline-size: 100%;
        max-block-size: min(560px, 80vh);
        border: 1px solid var(--ar-line-200);
        border-radius: var(--ar-radius-inset);
        container-type: inline-size;
      }

      .projection-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        font-size: 0.85rem;
      }

      .projection-table thead {
        position: sticky;
        inset-block-start: 0;
        z-index: 1;
      }

      .projection-table th {
        padding: 0.75rem 0.875rem;
        background: var(--ar-bg-50);
        border-bottom: 2px solid var(--ar-line-200);
        color: var(--ar-ink-500);
        font-weight: 600;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        white-space: nowrap;
      }

      .projection-table td {
        padding: 0.75rem 0.875rem;
        border-bottom: 1px solid var(--ar-line-200);
        vertical-align: middle;
        color: var(--ar-ink-900);
      }

      .projection-table tbody tr:hover {
        background: var(--ar-bg-50);
      }

      .projection-table tbody tr:last-child td {
        border-bottom: none;
      }

      .bl-tag {
        font-weight: 500;
        color: var(--ar-ink-900);
      }

      .empty-state {
        text-align: center;
        padding: 2.5rem !important;
        color: var(--ar-ink-400);
        font-style: italic;
      }

      /* Scenarios */
      .scenarios-container {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .scenario-summary-banner {
        background: var(--ar-bg-50);
        border: 1px solid var(--ar-line-200);
        border-radius: var(--ar-radius-card);
        padding: 1.25rem;
      }

      .scenario-summary-banner h3 {
        margin: 0 0 0.5rem;
        font-size: 0.95rem;
        font-weight: 600;
        color: var(--ar-ink-900);
      }

      .scenario-summary-banner p {
        margin: 0;
        font-size: 0.85rem;
        line-height: 1.5;
        color: var(--ar-ink-700);
      }

      .scenario-cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 1.25rem;
      }

      .scenario-card {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        background: var(--ar-white);
        border: 1px solid var(--ar-line-200);
        border-radius: var(--ar-radius-card);
        box-shadow: var(--ar-shadow-card);
        border-top-width: 4px;
      }

      .conservative-border {
        border-top-color: var(--ar-ink-400);
      }

      .realistic-border {
        border-top-color: var(--ar-blue-500);
      }

      .optimistic-border {
        border-top-color: var(--ar-green-500);
      }

      .active-plan-highlight {
        box-shadow: 0 4px 16px rgba(23, 105, 255, 0.12);
        border-color: var(--ar-blue-200);
      }

      .scenario-badge {
        display: inline-block;
        align-self: flex-start;
        padding: 0.25rem 0.625rem;
        border-radius: var(--ar-radius-chip);
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .conservative-badge {
        background: var(--ar-bg-100);
        color: var(--ar-ink-700);
      }

      .realistic-badge {
        background: var(--ar-blue-100);
        color: var(--ar-blue-700);
      }

      .optimistic-badge {
        background: var(--ar-green-100);
        color: var(--ar-green-600);
      }

      .scenario-rev {
        font-size: 2rem;
        font-weight: 700;
        line-height: 1.1;
        color: var(--ar-ink-900);
      }

      .scenario-lbl {
        font-size: 0.8125rem;
        color: var(--ar-ink-400);
        margin-top: -0.5rem;
      }

      .scenario-details {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 0.75rem 0;
        border-top: 1px solid var(--ar-line-200);
        border-bottom: 1px solid var(--ar-line-200);
      }

      .s-row {
        display: flex;
        justify-content: space-between;
        font-size: 0.85rem;
        color: var(--ar-ink-700);
      }

      .scenario-note {
        font-size: 0.75rem;
        color: var(--ar-ink-400);
        line-height: 1.4;
        font-style: italic;
      }

      /* All Plans */
      .plans-list-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .plan-card {
        padding: 1.25rem 1.5rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1.5rem;
        background: var(--ar-white);
        border: 1px solid var(--ar-line-200);
        border-radius: var(--ar-radius-card);
        box-shadow: var(--ar-shadow-card);
      }

      .plan-card.is-active {
        border-left: 4px solid var(--ar-blue-500);
      }

      .plan-card-left {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
      }

      .plan-top-row {
        display: flex;
        align-items: center;
        gap: 0.625rem;
      }

      .plan-code {
        font-weight: 700;
        font-size: 0.875rem;
        color: var(--ar-ink-900);
      }

      .fy-tag {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--ar-ink-400);
      }

      .plan-title {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: var(--ar-ink-900);
      }

      .plan-notes {
        margin: 0;
        font-size: 0.8125rem;
        color: var(--ar-ink-500);
      }

      .plan-meta-stats {
        display: flex;
        gap: 1.5rem;
        font-size: 0.8125rem;
        margin-top: 0.25rem;
        color: var(--ar-ink-700);
      }

      .plan-card-right {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      /* Dialog styling */
      .dialog-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 0.5rem 0;
      }

      .dialog-explainer {
        font-size: 0.8125rem;
        color: var(--ar-ink-500);
        line-height: 1.4;
        background: var(--ar-bg-50);
        border: 1px solid var(--ar-line-200);
        padding: 0.75rem;
        border-radius: var(--ar-radius-inset);
        margin: 0;
      }

      .form-row {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
      }

      .form-row label {
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--ar-ink-700);
      }

      .form-input {
        padding: 0.5rem 0.75rem;
        border-radius: var(--ar-radius-control);
        border: 1px solid var(--ar-line-300);
        font-size: 0.875rem;
        width: 100%;
        box-sizing: border-box;
        background: var(--ar-white);
        color: var(--ar-ink-900);
        font-family: inherit;
      }

      .form-input:focus {
        outline: none;
        border-color: var(--ar-blue-500);
        box-shadow: var(--ar-focus-ring);
      }

      .checkbox-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.8125rem;
        color: var(--ar-ink-700);
        margin-top: 0.25rem;
      }

      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 1.25rem;
        padding-top: 1rem;
        border-top: 1px solid var(--ar-line-200);
      }

      .text-right {
        text-align: right;
      }
      .text-center {
        text-align: center;
      }
      .font-semibold {
        font-weight: 600;
      }
      .font-medium {
        font-weight: 500;
      }
    `,
  ],
})
export class ArProjectionPlan implements OnInit {
  private projectionService = inject(ProjectionPlanService);
  private toasts = inject(ToastService);

  readonly Math = Math;
  readonly businessLineOptions = businessLineOptions;
  readonly projectionHorizonOptions = projectionHorizonOptions;
  readonly ProjectionPlanStatus = ProjectionPlanStatus;

  activeTab = signal<'dashboard' | 'matrix' | 'scenarios' | 'plans'>('dashboard');
  isLoading = signal(false);
  isGenerating = signal(false);

  plans = signal<ProjectionPlanDto[]>([MOCK_ACTIVE_PLAN]);
  currentPlan = signal<ProjectionPlanDto | null>(MOCK_ACTIVE_PLAN);
  dashboard = signal<ExecutiveProjectionDashboardDto | null>(MOCK_DASHBOARD);
  scenarioResult = signal<ScenarioAnalysisResultDto | null>(MOCK_SCENARIO_RESULT);

  // Filters
  periodFilter = 'All';
  businessLineFilter: BusinessLine | null = null;
  filteredItems = signal<ProjectionPlanItemDto[]>(MOCK_ITEMS);

  // Modals
  showGenerateModal = signal(false);
  showCreateModal = signal(false);

  // Generate form
  genFiscalYear = '2026-27';
  genGrowthRate = 15.0;
  genGrossMargin = 26.0;
  genHorizon = ProjectionHorizon.Quarterly;
  genIncludePipeline = true;

  // Create form
  newPlanTitle = '';
  newPlanFiscalYear = '2026-27';
  newPlanHorizon = ProjectionHorizon.Quarterly;
  newPlanNotes = '';

  ytdPacing = computed(() => {
    const target = this.currentPlan()?.targetRevenueInPaise ?? 0;
    const actual = this.currentPlan()?.actualRevenueInPaise ?? 0;
    if (target <= 0) return 0;
    // Assuming 2 quarters passed (50% target pace), pacing = (actual / (target * 0.5)) * 100
    const halfYearTarget = target * 0.5;
    return Math.round((actual / halfYearTarget) * 100);
  });

  ebitdaPercent = computed(() => {
    const target = this.currentPlan()?.targetRevenueInPaise ?? 0;
    const ebitda = this.currentPlan()?.targetEbitdaInPaise ?? 0;
    return target > 0 ? (ebitda / target) * 100 : 0;
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    if (environment.useMockData) {
      this.plans.set([MOCK_ACTIVE_PLAN]);
      this.currentPlan.set(MOCK_ACTIVE_PLAN);
      this.dashboard.set(MOCK_DASHBOARD);
      this.scenarioResult.set(MOCK_SCENARIO_RESULT);
      this.onFilterChanged();
      return;
    }

    this.isLoading.set(true);
    this.projectionService.getList({ maxResultCount: 20 }).subscribe({
      next: (res) => {
        if (res.items && res.items.length > 0) {
          this.plans.set(res.items);
          const active =
            res.items.find((p) => p.status === ProjectionPlanStatus.Active) ?? res.items[0];
          this.selectPlan(active);
        } else {
          // Fallback to active mock if server has 0 plans
          this.plans.set([MOCK_ACTIVE_PLAN]);
          this.currentPlan.set(MOCK_ACTIVE_PLAN);
          this.filteredItems.set(MOCK_ITEMS);
        }
        this.isLoading.set(false);
      },
      error: () => {
        // Fallback to rich mock
        this.plans.set([MOCK_ACTIVE_PLAN]);
        this.currentPlan.set(MOCK_ACTIVE_PLAN);
        this.filteredItems.set(MOCK_ITEMS);
        this.isLoading.set(false);
      },
    });

    this.projectionService.getExecutiveDashboard().subscribe({
      next: (dash) => this.dashboard.set(dash),
      error: () => this.dashboard.set(MOCK_DASHBOARD),
    });
  }

  selectPlan(plan: ProjectionPlanDto): void {
    if (!plan.id) return;
    if (environment.useMockData) {
      this.currentPlan.set(plan);
      this.onFilterChanged();
      return;
    }

    this.isLoading.set(true);
    this.projectionService.get(plan.id).subscribe({
      next: (fullPlan) => {
        this.currentPlan.set(fullPlan);
        this.onFilterChanged();
        this.isLoading.set(false);
      },
      error: () => {
        this.currentPlan.set(plan);
        this.onFilterChanged();
        this.isLoading.set(false);
      },
    });
  }

  activatePlan(plan: ProjectionPlanDto): void {
    if (!plan.id) return;
    if (environment.useMockData) {
      const updated = { ...plan, status: ProjectionPlanStatus.Active };
      this.plans.update((all) =>
        all.map((p) => (p.id === plan.id ? updated : { ...p, status: ProjectionPlanStatus.Draft })),
      );
      this.currentPlan.set(updated);
      this.toasts.success(`Projection plan ${plan.planCode} activated successfully.`);
      return;
    }

    this.isLoading.set(true);
    this.projectionService.activatePlan(plan.id).subscribe({
      next: (activated) => {
        this.currentPlan.set(activated);
        this.loadData();
        this.toasts.success(`Projection plan ${activated.planCode} activated.`);
      },
      error: (err) => {
        this.toasts.error(err?.message ?? 'Failed to activate projection plan.');
        this.isLoading.set(false);
      },
    });
  }

  syncActualsFromErp(): void {
    const plan = this.currentPlan();
    if (!plan?.id) return;

    if (environment.useMockData) {
      this.toasts.success('ERP sales invoices and actuals synced successfully.');
      return;
    }

    this.isLoading.set(true);
    this.projectionService.syncActualsFromErp(plan.id).subscribe({
      next: (synced) => {
        this.currentPlan.set(synced);
        this.onFilterChanged();
        this.toasts.success('ERP invoice bookings & BOM actuals reconciled.');
        this.isLoading.set(false);
      },
      error: (err) => {
        this.toasts.error(err?.message ?? 'Failed to sync actuals from ERP.');
        this.isLoading.set(false);
      },
    });
  }

  runScenarioAnalysis(): void {
    const plan = this.currentPlan();
    if (!plan?.id) return;

    if (environment.useMockData) {
      this.scenarioResult.set(MOCK_SCENARIO_RESULT);
      this.activeTab.set('scenarios');
      this.toasts.info('Scenario sensitivity models computed.');
      return;
    }

    this.isLoading.set(true);
    this.projectionService.runScenarioAnalysis(plan.id).subscribe({
      next: (res) => {
        this.scenarioResult.set(res);
        this.activeTab.set('scenarios');
        this.toasts.info('Scenario sensitivity updated.');
        this.isLoading.set(false);
      },
      error: (err) => {
        this.toasts.error(err?.message ?? 'Failed to execute scenario analysis.');
        this.isLoading.set(false);
      },
    });
  }

  onGenerateSubmit(): void {
    this.isGenerating.set(true);
    const input: GenerateProjectionPlanInput = {
      fiscalYear: this.genFiscalYear,
      growthRatePercent: this.genGrowthRate,
      targetGrossMarginPercent: this.genGrossMargin,
      horizon: this.genHorizon,
      includePipelineWeightings: this.genIncludePipeline,
    };

    if (environment.useMockData) {
      setTimeout(() => {
        this.isGenerating.set(false);
        this.showGenerateModal.set(false);
        this.toasts.success(`AI strategic projection plan generated for FY ${this.genFiscalYear}!`);
        this.activeTab.set('matrix');
      }, 700);
      return;
    }

    this.projectionService.generatePlanFromPipelineAndActuals(input).subscribe({
      next: (newPlan) => {
        this.isGenerating.set(false);
        this.showGenerateModal.set(false);
        this.plans.update((all) => [newPlan, ...all]);
        this.currentPlan.set(newPlan);
        this.onFilterChanged();
        this.activeTab.set('matrix');
        this.toasts.success(`AI Strategic Projection Plan ${newPlan.planCode} generated!`);
      },
      error: (err) => {
        this.isGenerating.set(false);
        this.toasts.error(err?.message ?? 'Failed to generate projection plan.');
      },
    });
  }

  onCreatePlanSubmit(): void {
    if (!this.newPlanTitle.trim()) return;

    if (environment.useMockData) {
      const createdPlan: ProjectionPlanDto = {
        ...MOCK_ACTIVE_PLAN,
        id: 'plan-' + Date.now(),
        planCode: 'PLAN-' + (this.plans().length + 1).toString().padStart(4, '0'),
        title: this.newPlanTitle,
        fiscalYear: this.newPlanFiscalYear,
        notes: this.newPlanNotes,
        status: ProjectionPlanStatus.Draft,
      };
      this.plans.update((all) => [createdPlan, ...all]);
      this.currentPlan.set(createdPlan);
      this.showCreateModal.set(false);
      this.toasts.success('Projection plan draft created.');
      return;
    }

    this.projectionService
      .create({
        title: this.newPlanTitle,
        fiscalYear: this.newPlanFiscalYear,
        horizon: this.newPlanHorizon,
        baseScenario: ProjectionScenario.Realistic,
        notes: this.newPlanNotes,
        items: [],
      })
      .subscribe({
        next: (created) => {
          this.plans.update((all) => [created, ...all]);
          this.currentPlan.set(created);
          this.showCreateModal.set(false);
          this.toasts.success('Projection plan created.');
        },
        error: (err) => {
          this.toasts.error(err?.message ?? 'Failed to create projection plan.');
        },
      });
  }

  onFilterChanged(): void {
    const items = this.currentPlan()?.items ?? MOCK_ITEMS;
    let filtered = [...items];

    if (this.periodFilter !== 'All') {
      filtered = filtered.filter((i) =>
        i.periodLabel.toLowerCase().includes(this.periodFilter.toLowerCase()),
      );
    }

    if (this.businessLineFilter !== null) {
      filtered = filtered.filter((i) => i.businessLine === this.businessLineFilter);
    }

    this.filteredItems.set(filtered);
  }

  calcPercentage(part: number, total: number): number {
    if (total <= 0) return 0;
    return Math.min(100, Math.round((part / total) * 100));
  }

  formatPaise(paise: number): string {
    return inr(paise);
  }

  formatPaiseCompact(paise: number): string {
    return inrCompact(paise / 100);
  }

  getBusinessLineName(bl: BusinessLine): string {
    return BUSINESS_LINE_NAMES[bl] ?? 'General Business Line';
  }

  getItemStatusTone(status: ProjectionItemStatus): ChipTone {
    return STATUS_TONES[status] ?? 'neutral';
  }

  getItemStatusLabel(status: ProjectionItemStatus): string {
    return STATUS_LABELS[status] ?? 'Planned';
  }

  getPlanStatusTone(status: ProjectionPlanStatus): ChipTone {
    return PLAN_STATUS_TONES[status] ?? 'neutral';
  }

  getPlanStatusLabel(status: ProjectionPlanStatus): string {
    return PLAN_STATUS_LABELS[status] ?? 'Draft';
  }
}
