import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export enum EscalationAppliesTo {
  All = 0,
  AmcOrCritical = 1,
  Amc = 2,
  HighCriticality = 3,
}

export enum EscalationCondition {
  NoEngineer = 0,
  NoFirstResponse = 1,
  NoVisit = 2,
  NotResolved = 3,
}

/** Flags: a step may do several. */
export enum EscalationActions {
  None = 0,
  NotifyCoordinator = 1,
  NotifyManager = 2,
  AutoAssign = 4,
  UpdateCustomer = 8,
  NotifyAccountOwner = 16,
  NotifyAdmin = 32,
  FlagDashboard = 64,
  ShowOnHealthCard = 128,
}

export interface EscalationStepDto {
  minutes: number;
  condition: EscalationCondition;
  actions: EscalationActions;
}

export interface BusinessHoursDto {
  alwaysOpen: boolean;
  /** 0 = Sunday … 6 = Saturday. */
  days: number[];
  opensAtMinute: number;
  closesAtMinute: number;
}

export interface EscalationPolicyDto {
  id: string;
  name: string;
  appliesTo: EscalationAppliesTo;
  order: number;
  isEnabled: boolean;
  hours: BusinessHoursDto;
  steps: EscalationStepDto[];
  coordinatorUserId?: string | null;
  coordinatorName?: string | null;
  managerUserId?: string | null;
  managerName?: string | null;
  openTickets: number;
}

export interface SaveEscalationPolicyInput {
  name: string;
  appliesTo: EscalationAppliesTo;
  order: number;
  isEnabled: boolean;
  hours: BusinessHoursDto;
  steps: EscalationStepDto[];
  coordinatorUserId?: string | null;
  managerUserId?: string | null;
}

export interface EscalationPersonDto {
  userId: string;
  name: string;
}

export interface BreakdownClockStepDto {
  number: number;
  minutes: number;
  condition: EscalationCondition;
  actions: EscalationActions;
  /** "fired", "met" or "upcoming". */
  state: string;
}

export interface BreakdownClockDto {
  policyName?: string | null;
  reportedAtUtc: string;
  elapsedMinutes: number;
  paused: boolean;
  running: boolean;
  alwaysOpen: boolean;
  steps: BreakdownClockStepDto[];
}

@Injectable({ providedIn: 'root' })
export class EscalationPolicyService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getList = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, EscalationPolicyDto[]>(
      { method: 'GET', url: '/api/auto-reach/escalation-policy' },
      { apiName: this.apiName, ...config },
    );

  create = (input: SaveEscalationPolicyInput, config?: Partial<Rest.Config>) =>
    this.restService.request<SaveEscalationPolicyInput, EscalationPolicyDto>(
      { method: 'POST', url: '/api/auto-reach/escalation-policy', body: input },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: SaveEscalationPolicyInput, config?: Partial<Rest.Config>) =>
    this.restService.request<SaveEscalationPolicyInput, EscalationPolicyDto>(
      { method: 'PUT', url: `/api/auto-reach/escalation-policy/${id}`, body: input },
      { apiName: this.apiName, ...config },
    );

  getPeople = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, EscalationPersonDto[]>(
      { method: 'GET', url: '/api/auto-reach/escalation-policy/people' },
      { apiName: this.apiName, ...config },
    );
}

@Injectable({ providedIn: 'root' })
export class BreakdownClockService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, BreakdownClockDto | null>(
      { method: 'GET', url: `/api/auto-reach/breakdown-clock/${id}` },
      { apiName: this.apiName, ...config },
    );
}
