import { EntityDto, FullAuditedEntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import { RoutingStage, WorkOrderStatus } from './manufacturing-enums';

export interface WorkOrderMaterialIssueDto extends EntityDto<string> {
  workOrderId: string;
  componentPartNumber: string;
  componentDescription: string;
  requiredQuantity: number;
  issuedQuantity: number;
  wastedQuantity: number;
  unitOfMeasure: string;
  issuedFromWarehouse?: string;
  issueDateUtc: string;
}

export interface WorkOrderRoutingStepDto extends EntityDto<string> {
  workOrderId: string;
  stepSequence: number;
  stage: RoutingStage;
  workCenterName: string;
  estimatedHours: number;
  actualHours: number;
  isCompleted: boolean;
  completedAtUtc?: string;
  inspectedBy?: string;
  qcPassed: boolean;
}

export interface WorkOrderDto extends FullAuditedEntityDto<string> {
  workOrderNumber: string;
  billOfMaterialId?: string;
  bomNumber?: string;
  salesOrderId?: string;
  salesOrderNumber?: string;
  customerName?: string;
  partNumber: string;
  description: string;
  batchNumber: string;
  plannedQuantity: number;
  producedQuantity: number;
  scrappedQuantity: number;
  status: WorkOrderStatus;
  currentStage: RoutingStage;
  plannedStartDateUtc: string;
  plannedEndDateUtc: string;
  actualStartDateUtc?: string;
  actualCompletionDateUtc?: string;
  assignedSupervisor?: string;
  remarks?: string;
  materialIssues: WorkOrderMaterialIssueDto[];
  routingSteps: WorkOrderRoutingStepDto[];
}

export interface CreateWorkOrderDto {
  workOrderNumber?: string;
  billOfMaterialId?: string;
  salesOrderId?: string;
  partNumber: string;
  description: string;
  batchNumber: string;
  plannedQuantity: number;
  plannedStartDateUtc: string;
  plannedEndDateUtc: string;
  assignedSupervisor?: string;
  remarks?: string;
}

export interface IssueMaterialToWorkOrderDto {
  componentPartNumber: string;
  componentDescription: string;
  requiredQuantity: number;
  issuedQuantity: number;
  wastedQuantity: number;
  unitOfMeasure: string;
  issuedFromWarehouse?: string;
}

export interface CompleteRoutingStepDto {
  stepId: string;
  actualHours: number;
  inspectedBy?: string;
  qcPassed: boolean;
}

export interface CompleteWorkOrderDto {
  producedQuantity: number;
  scrappedQuantity: number;
  destinationLocation?: string;
  remarks?: string;
}

export interface GetWorkOrdersInput extends PagedAndSortedResultRequestDto {
  filter?: string;
  status?: WorkOrderStatus;
  currentStage?: RoutingStage;
  salesOrderId?: string;
  billOfMaterialId?: string;
}
