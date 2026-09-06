import type { EntityDto, FullAuditedEntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import type { AutomationTriggerKind } from '../messaging/automation-trigger-kind.enum';
import type { AutomationState } from '../messaging/automation-state.enum';
import type { AutomationNodeKind } from '../messaging/automation-node-kind.enum';

export interface AutomationDto extends FullAuditedEntityDto<string> {
  name?: string;
  description?: string | null;
  channelId?: string;
  trigger?: AutomationTriggerKind;
  triggerConfigJson?: string;
  state?: AutomationState;
  enrolledCount?: number;
  completedCount?: number;
  completionRate?: number;
  lastRunAtUtc?: string | null;
  nodes?: AutomationNodeDto[];
}

export interface AutomationNodeDto extends EntityDto<string> {
  kind?: AutomationNodeKind;
  configJson?: string;
  nextNodeId?: string | null;
  trueNodeId?: string | null;
  falseNodeId?: string | null;
  positionX?: number;
  positionY?: number;
  enteredCount?: number;
  exitedCount?: number;
  dropOffRate?: number;
}

export interface CreateUpdateAutomationDto {
  name: string;
  description?: string | null;
  channelId?: string;
  trigger?: AutomationTriggerKind;
  triggerConfigJson?: string;
  nodes?: CreateUpdateAutomationNodeDto[];
}

export interface CreateUpdateAutomationNodeDto {
  id?: string;
  kind?: AutomationNodeKind;
  configJson?: string;
  nextNodeId?: string | null;
  trueNodeId?: string | null;
  falseNodeId?: string | null;
  positionX?: number;
  positionY?: number;
}

export interface GetAutomationListInput extends PagedAndSortedResultRequestDto {
  state?: AutomationState | null;
  trigger?: AutomationTriggerKind | null;
  filter?: string | null;
}
