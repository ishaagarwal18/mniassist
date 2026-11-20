import type { ListResultDto } from '@abp/ng.core';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

import type { PlanFeature } from './plan-feature.enum';
import type { SubscriptionPlan } from './subscription-plan.enum';

/** A plan as the platform team set it up on Platform › Plans. */
export interface PlanDefinitionDto {
  id: string;
  name: string;
  description?: string | null;
  /** Set on the four built-in plans. */
  builtIn?: SubscriptionPlan | null;
  basePlan: SubscriptionPlan;
  monthlyFeeInPaise: number;
  includedAgentSeats: number;
  /** 2147483647 is unlimited. */
  channelLimit: number;
  /** 2147483647 is unlimited. */
  contactLimit: number;
  /** `PlanFeature` names, e.g. `PipelineCrm`. */
  features: string[];
  /** Selling points shown on Billing; they unlock nothing. */
  highlights: string[];
  isPublic: boolean;
  sortOrder: number;
  isArchived: boolean;
  /** Platform › Plans: workspaces on it now. */
  workspaceCount: number;
  /** Billing: the workspace asking is on it. */
  isCurrent: boolean;
}

export interface SavePlanDefinitionInput {
  name: string;
  description?: string | null;
  basePlan: SubscriptionPlan;
  monthlyFeeInPaise: number;
  includedAgentSeats: number;
  channelLimit: number;
  contactLimit: number;
  features: PlanFeature[];
  highlights: string[];
  isPublic: boolean;
  sortOrder: number;
}

/** The plans. Routes follow ABP's conventional-controller naming for PlanCatalogAppService. */
@Injectable({ providedIn: 'root' })
export class PlanCatalogService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getOffered = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<PlanDefinitionDto>>(
      { method: 'GET', url: '/api/auto-reach/plan-catalog/offered' },
      { apiName: this.apiName, ...config },
    );

  getList = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<PlanDefinitionDto>>(
      { method: 'GET', url: '/api/auto-reach/plan-catalog' },
      { apiName: this.apiName, ...config },
    );

  create = (input: SavePlanDefinitionInput, config?: Partial<Rest.Config>) =>
    this.restService.request<SavePlanDefinitionInput, PlanDefinitionDto>(
      { method: 'POST', url: '/api/auto-reach/plan-catalog', body: input },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: SavePlanDefinitionInput, config?: Partial<Rest.Config>) =>
    this.restService.request<SavePlanDefinitionInput, PlanDefinitionDto>(
      { method: 'PUT', url: `/api/auto-reach/plan-catalog/${id}`, body: input },
      { apiName: this.apiName, ...config },
    );

  setArchived = (id: string, archived: boolean, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PlanDefinitionDto>(
      { method: 'POST', url: `/api/auto-reach/plan-catalog/${id}/set-archived`, params: { archived } },
      { apiName: this.apiName, ...config },
    );
}
