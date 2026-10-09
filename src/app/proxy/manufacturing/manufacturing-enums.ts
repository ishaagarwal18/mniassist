export enum BomType {
  Manufacturing = 0,
  Engineering = 1,
  Kit = 2,
}

export enum BomStatus {
  Draft = 0,
  Active = 1,
  Obsolete = 2,
}

export enum WorkOrderStatus {
  Draft = 0,
  Scheduled = 1,
  InProgress = 2,
  QualityHold = 3,
  Completed = 4,
  Cancelled = 5,
}

export enum RoutingStage {
  MaterialKitting = 0,
  Machining = 1,
  Fabrication = 2,
  HeatTreatment = 3,
  Assembly = 4,
  FinalTesting = 5,
  FinishedGoodsReceipt = 6,
}

export enum AmcContractType {
  Comprehensive = 0,
  NonComprehensive = 1,
  PreventiveOnly = 2,
  OnDemand = 3,
}

export enum AmcStatus {
  Active = 0,
  ExpiringSoon = 1,
  Expired = 2,
  Terminated = 3,
}

export enum ServiceTicketType {
  Breakdown = 0,
  PreventiveMaintenance = 1,
  InstallationCommissioning = 2,
  Calibration = 3,
}

export enum ServiceTicketPriority {
  Low = 0,
  Medium = 1,
  High = 2,
  CriticalEmergency = 3,
}

export enum ServiceTicketStatus {
  Open = 0,
  Assigned = 1,
  InTransit = 2,
  InProgress = 3,
  AwaitingSpares = 4,
  Resolved = 5,
  Closed = 6,
}
