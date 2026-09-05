import type {
  EntityDto,
  FullAuditedEntityDto,
  PagedAndSortedResultRequestDto,
  PagedResultDto,
} from '@abp/ng.core';
import { RestService, Rest, mapEnumToOptions } from '@abp/ng.core';
import { Injectable } from '@angular/core';

export enum AutomationState {
  Draft = 0,
  Active = 1,
  Paused = 2,
}
export const automationStateOptions = mapEnumToOptions(AutomationState);

export enum AutomationTriggerKind {
  InboundKeyword = 0,
  ButtonReply = 1,
  ContactCreated = 2,
  AttributeChanged = 3,
  EnquiryStageChanged = 4,
  ScheduledDate = 5,
  FlowSubmitted = 6,
}
export const automationTriggerKindOptions = mapEnumToOptions(AutomationTriggerKind);

export enum AutomationNodeKind {
  Trigger = 0,
  SendTemplate = 1,
  SendSessionMessage = 2,
  Condition = 3,
  Wait = 4,
  AssignAgent = 5,
  UpdateAttribute = 6,
  CreateEnquiry = 7,
  Webhook = 8,
  End = 9,
}

export interface AutomationNodeDto extends EntityDto<string> {
  kind: AutomationNodeKind;
  configJson: string;
  nextNodeId?: string;
  trueNodeId?: string;
  falseNodeId?: string;
  positionX: number;
  positionY: number;
  enteredCount: number;
  exitedCount: number;
  dropOffRate: number;
}

export interface AutomationDto extends FullAuditedEntityDto<string> {
  name: string;
  description?: string;
  channelId: string;
  trigger: AutomationTriggerKind;
  triggerConfigJson: string;
  state: AutomationState;
  enrolledCount: number;
  completedCount: number;
  completionRate: number;
  lastRunAtUtc?: string;
  nodes: AutomationNodeDto[];
}

export interface CreateUpdateAutomationNodeDto {
  kind: AutomationNodeKind;
  configJson: string;
  nextNodeId?: string;
  trueNodeId?: string;
  falseNodeId?: string;
  positionX: number;
  positionY: number;
}

export interface CreateUpdateAutomationDto {
  name: string;
  description?: string;
  channelId: string;
  trigger: AutomationTriggerKind;
  triggerConfigJson: string;
  nodes: CreateUpdateAutomationNodeDto[];
}

export interface GetAutomationListInput extends PagedAndSortedResultRequestDto {
  state?: AutomationState;
  trigger?: AutomationTriggerKind;
  filter?: string;
}

@Injectable({ providedIn: 'root' })
export class AutomationService {
  apiName = 'AutoReach';
  private c = (config?: Partial<Rest.Config>) => ({ apiName: this.apiName, ...config });

  getList = (input: GetAutomationListInput, config?: Partial<Rest.Config>) =>
    this.rest.request<any, PagedResultDto<AutomationDto>>(
      { method: 'GET', url: '/api/auto-reach/automation', params: { ...input } },
      this.c(config),
    );

  create = (input: CreateUpdateAutomationDto, config?: Partial<Rest.Config>) =>
    this.rest.request<any, AutomationDto>(
      { method: 'POST', url: '/api/auto-reach/automation', body: input },
      this.c(config),
    );

  update = (id: string, input: CreateUpdateAutomationDto, config?: Partial<Rest.Config>) =>
    this.rest.request<any, AutomationDto>(
      { method: 'PUT', url: `/api/auto-reach/automation/${id}`, body: input },
      this.c(config),
    );

  activate = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<any, AutomationDto>(
      { method: 'POST', url: `/api/auto-reach/automation/${id}/activate` },
      this.c(config),
    );

  pause = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<any, AutomationDto>(
      { method: 'POST', url: `/api/auto-reach/automation/${id}/pause` },
      this.c(config),
    );

  simulate = (id: string, contactId: string, config?: Partial<Rest.Config>) =>
    this.rest.request<any, string[]>(
      { method: 'POST', url: `/api/auto-reach/automation/${id}/simulate`, params: { contactId } },
      this.c(config),
    );

  constructor(private rest: RestService) {}
}
