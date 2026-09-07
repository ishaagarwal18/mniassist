import type { EntityDto, FullAuditedEntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import type { FlowState } from '../messaging/flow-state.enum';
import type { FlowFieldType } from './flow-field-type.enum';

export interface CreateUpdateFlowDto {
  name: string;
  channelId?: string;
  definitionJson: string;
  dataEndpointUrl?: string | null;
  screens?: CreateUpdateFlowScreenDto[];
  /** The designer sets this so its screens/fields regenerate the Flow JSON. */
  generateDefinitionFromScreens?: boolean;
}

export interface CreateUpdateFlowScreenFieldDto {
  name: string;
  label: string;
  fieldType?: FlowFieldType;
  required?: boolean;
  order?: number;
  optionsText?: string | null;
}

export interface FlowScreenFieldDto extends EntityDto<string> {
  name?: string;
  label?: string;
  fieldType?: FlowFieldType;
  required?: boolean;
  order?: number;
  optionsText?: string | null;
}

export interface CreateUpdateFlowScreenDto {
  screenId: string;
  title: string;
  order?: number;
  webhookUrl?: string | null;
  fields?: CreateUpdateFlowScreenFieldDto[];
}

export interface FlowDto extends FullAuditedEntityDto<string> {
  name?: string;
  channelId?: string;
  metaFlowId?: string | null;
  state?: FlowState;
  version?: number;
  definitionJson?: string;
  dataEndpointUrl?: string | null;
  publishedAtUtc?: string | null;
  blockReason?: string | null;
  screens?: FlowScreenDto[];
}

export interface FlowEncryptionKeyDto extends EntityDto<string> {
  channelId?: string;
  channelDisplayNumber?: string | null;
  publicKeyPem?: string;
  fingerprint?: string;
  keySizeBits?: number;
  createdAtUtc?: string;
  uploadedToMetaAtUtc?: string | null;
  supersededAtUtc?: string | null;
  isActive?: boolean;
  isUsable?: boolean;
}

export interface FlowPackInstallResultDto {
  created?: FlowSummaryDto[];
  skippedExisting?: string[];
}

export interface FlowResponseDto extends EntityDto<string> {
  flowId?: string;
  contactId?: string;
  contactDisplayName?: string | null;
  payloadJson?: string;
  submittedAtUtc?: string;
  createdEnquiryId?: string | null;
}

export interface FlowScreenDto extends EntityDto<string> {
  screenId?: string;
  title?: string;
  order?: number;
  enteredCount?: number;
  completedCount?: number;
  webhookUrl?: string | null;
  fields?: FlowScreenFieldDto[];
  dropOffRate?: number;
}

export interface FlowFunnelDto {
  flowId?: string;
  flowName?: string;
  started?: number;
  completed?: number;
  completionRate?: number;
  screens?: FlowScreenDto[];
}

export interface FlowSummaryDto extends EntityDto<string> {
  name?: string;
  description?: string;
  state?: FlowState;
  screenCount?: number;
  needsDataEndpoint?: boolean;
}

export interface GetFlowListInput extends PagedAndSortedResultRequestDto {
  state?: FlowState | null;
  filter?: string | null;
}
