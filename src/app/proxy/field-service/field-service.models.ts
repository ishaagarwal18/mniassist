import { EntityDto, FullAuditedEntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import {
  AmcContractType,
  AmcStatus,
  ServiceTicketPriority,
  ServiceTicketStatus,
  ServiceTicketType,
} from '../manufacturing/manufacturing-enums';

export interface AmcVisitScheduleDto extends EntityDto<string> {
  amcContractId: string;
  visitNumber: number;
  scheduledDateUtc: string;
  completedDateUtc?: string;
  assignedEngineer?: string;
  isCompleted: boolean;
  visitNotes?: string;
}

export interface AmcContractDto extends FullAuditedEntityDto<string> {
  contractNumber: string;
  customerId: string;
  customerName: string;
  customerSiteAddress?: string;
  equipmentSerialNumber: string;
  equipmentModel: string;
  contractType: AmcContractType;
  status: AmcStatus;
  startDateUtc: string;
  endDateUtc: string;
  slaResponseHours: number;
  contractValueInPaise: number;
  scheduledVisitsPerYear: number;
  visitsCompleted: number;
  sparesIncluded: boolean;
  remarks?: string;
  schedules: AmcVisitScheduleDto[];
}

export interface CreateAmcContractDto {
  contractNumber?: string;
  customerId: string;
  customerName: string;
  customerSiteAddress?: string;
  equipmentSerialNumber: string;
  equipmentModel: string;
  contractType: AmcContractType;
  startDateUtc: string;
  endDateUtc: string;
  slaResponseHours: number;
  contractValueInPaise: number;
  scheduledVisitsPerYear: number;
  sparesIncluded: boolean;
  remarks?: string;
}

export interface RenewAmcContractDto {
  newStartDateUtc: string;
  newEndDateUtc: string;
  newContractValueInPaise: number;
  newContractType?: AmcContractType;
}

export interface CompleteAmcVisitDto {
  scheduleId: string;
  assignedEngineer?: string;
  visitNotes?: string;
}

export interface GetAmcContractsInput extends PagedAndSortedResultRequestDto {
  filter?: string;
  status?: AmcStatus;
  contractType?: AmcContractType;
  customerId?: string;
}

export interface ServiceTicketSpareConsumedDto extends EntityDto<string> {
  serviceTicketId: string;
  partNumber: string;
  description: string;
  quantity: number;
  unitPriceInPaise: number;
  isBillableToCustomer: boolean;
  lineTotalInPaise: number;
}

export interface FieldServiceTicketDto extends FullAuditedEntityDto<string> {
  ticketNumber: string;
  customerId: string;
  customerName: string;
  customerSiteAddress?: string;
  customerContactPhone?: string;
  amcContractId?: string;
  equipmentSerialNumber: string;
  equipmentModel: string;
  ticketType: ServiceTicketType;
  priority: ServiceTicketPriority;
  status: ServiceTicketStatus;
  issueDescription: string;
  rootCauseAnalysis?: string;
  resolutionSummary?: string;
  assignedFieldEngineer?: string;
  scheduledVisitDateUtc?: string;
  visitStartTimeUtc?: string;
  visitEndTimeUtc?: string;
  customerSignoffName?: string;
  customerSatisfactionRating?: number;
  totalSparesCostInPaise: number;
  sparesConsumed: ServiceTicketSpareConsumedDto[];
}

export interface CreateFieldServiceTicketDto {
  ticketNumber?: string;
  customerId: string;
  customerName: string;
  customerSiteAddress?: string;
  customerContactPhone?: string;
  amcContractId?: string;
  equipmentSerialNumber: string;
  equipmentModel: string;
  ticketType: ServiceTicketType;
  priority: ServiceTicketPriority;
  issueDescription: string;
  assignedFieldEngineer?: string;
  scheduledVisitDateUtc?: string;
}

export interface AssignFieldServiceTicketDto {
  assignedFieldEngineer: string;
  scheduledVisitDateUtc: string;
}

export interface RecordSpareConsumedDto {
  partNumber: string;
  description: string;
  quantity: number;
  unitPriceInPaise: number;
  isBillableToCustomer: boolean;
}

export interface ResolveFieldServiceTicketDto {
  rootCauseAnalysis: string;
  resolutionSummary: string;
  customerSignoffName?: string;
  customerSatisfactionRating: number;
}

export interface GetFieldServiceTicketsInput extends PagedAndSortedResultRequestDto {
  filter?: string;
  status?: ServiceTicketStatus;
  priority?: ServiceTicketPriority;
  ticketType?: ServiceTicketType;
  customerId?: string;
  equipmentSerialNumber?: string;
}
