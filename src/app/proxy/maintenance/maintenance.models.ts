import { FullAuditedEntityDto, EntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import {
  MaintenanceChannel,
  MaintenanceSeverity,
  MaintenanceSessionStatus,
  EquipmentCategory,
  DiagnosticTurnType,
} from './maintenance-enums';

export interface RemoteMaintenanceSessionDto extends FullAuditedEntityDto<string> {
  sessionCode: string;
  customerId: string;
  customerName: string;
  customerContactPhone: string;
  contactId?: string;
  equipmentCategory: EquipmentCategory;
  equipmentModel: string;
  equipmentSerialNumber: string;
  installedAssetId?: string;
  preferredChannel: MaintenanceChannel;
  status: MaintenanceSessionStatus;
  severity: MaintenanceSeverity;
  faultCode?: string;
  reportedSymptoms: string;
  telemetrySnapshotJson?: string;
  rootCauseDiagnosis?: string;
  confidencePercent: number;
  remediationStepsJson?: string;
  recommendedSparePartsJson?: string;
  estimatedDowntimeMinutes: number;
  resolvedRemotely: boolean;
  resolutionNotes?: string;
  escalatedTicketId?: string;
  fieldVisitRequired: boolean;
  diagnosticTurns: MaintenanceDiagnosticTurnDto[];
}

export interface MaintenanceDiagnosticTurnDto extends EntityDto<string> {
  sessionId: string;
  turnNumber: number;
  turnType: DiagnosticTurnType;
  channel: MaintenanceChannel;
  inputOrPrompt: string;
  aiResponseOrGuidance: string;
  actionTaken?: string;
  createdAtUtc: string;
}

export interface InitiateRemoteMaintenanceInput {
  customerId: string;
  customerName: string;
  customerContactPhone: string;
  contactId?: string;
  equipmentCategory: EquipmentCategory;
  equipmentModel: string;
  equipmentSerialNumber: string;
  installedAssetId?: string;
  preferredChannel: MaintenanceChannel;
  faultCode?: string;
  reportedSymptoms: string;
  telemetrySnapshotJson?: string;
  severity: MaintenanceSeverity;
}

export interface SimulateChannelTurnInput {
  sessionId: string;
  turnType: DiagnosticTurnType;
  channel: MaintenanceChannel;
  inputOrPrompt: string;
  actionTaken?: string;
}

export interface EscalateToFieldTicketInput {
  sessionId: string;
  reason: string;
  preferredVisitDate?: string;
  assignedFieldEngineer?: string;
}

export interface ResolveRemotelyInput {
  sessionId: string;
  resolutionNotes: string;
}

export interface SwitchChannelInput {
  sessionId: string;
  newChannel: MaintenanceChannel;
}

export interface GetRemoteMaintenanceListInput extends PagedAndSortedResultRequestDto {
  channel?: MaintenanceChannel;
  status?: MaintenanceSessionStatus;
  severity?: MaintenanceSeverity;
  searchFilter?: string;
}

export interface RemoteMaintenanceStatsDto {
  totalSessions: number;
  resolvedRemotelyCount: number;
  remoteResolutionRatePercent: number;
  escalatedToFieldCount: number;
  fieldDeflectionRatePercent: number;
  whatsAppSessionCount: number;
  ivrSessionCount: number;
  averageResolutionTimeMinutes: number;
  estimatedCostSavingsInPaise: number;
  estimatedCostSavingsInRupees: number;
}
