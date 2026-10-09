export enum ProjectionHorizon {
  Monthly = 0,
  Quarterly = 1,
  Annual = 2,
  MultiYear = 3,
}

export const projectionHorizonOptions = [
  { value: ProjectionHorizon.Monthly, label: 'Monthly' },
  { value: ProjectionHorizon.Quarterly, label: 'Quarterly' },
  { value: ProjectionHorizon.Annual, label: 'Annual' },
  { value: ProjectionHorizon.MultiYear, label: 'Multi-Year' },
];

export enum ProjectionPlanStatus {
  Draft = 0,
  Active = 1,
  UnderReview = 2,
  Archived = 3,
}

export enum ProjectionScenario {
  Conservative = 0,
  Realistic = 1,
  Optimistic = 2,
}

export enum BusinessLine {
  TurnkeyAutomation = 0,
  DrivesAndMotors = 1,
  Instrumentation = 2,
  AmcAndServices = 3,
  SparesAndConsumables = 4,
}

export const businessLineOptions = [
  { value: BusinessLine.TurnkeyAutomation, label: 'Turnkey Automation & Panels' },
  { value: BusinessLine.DrivesAndMotors, label: 'Drives, VFDs & Motion Control' },
  { value: BusinessLine.Instrumentation, label: 'Process Instrumentation & Sensors' },
  { value: BusinessLine.AmcAndServices, label: 'AMC & Field Service SLA' },
  { value: BusinessLine.SparesAndConsumables, label: 'Spares, Consumables & Re-orders' },
];

export enum ProjectionItemStatus {
  Planned = 0,
  OnTrack = 1,
  AtRisk = 2,
  Achieved = 3,
}
