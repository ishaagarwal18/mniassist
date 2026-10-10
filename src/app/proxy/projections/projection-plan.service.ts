import { Rest, RestService, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import type {
  CreateUpdateProjectionPlanDto,
  ExecutiveProjectionDashboardDto,
  GenerateProjectionPlanInput,
  GetProjectionPlanListInput,
  ProjectionPlanDto,
  ScenarioAnalysisResultDto,
} from './projection-plan.models';

@Injectable({
  providedIn: 'root',
})
export class ProjectionPlanService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getList = (input: GetProjectionPlanListInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<ProjectionPlanDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/projection-plan',
        params: {
          fiscalYear: input.fiscalYear,
          horizon: input.horizon,
          status: input.status,
          searchFilter: input.searchFilter,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ProjectionPlanDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/projection-plan/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  create = (input: CreateUpdateProjectionPlanDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ProjectionPlanDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/projection-plan',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: CreateUpdateProjectionPlanDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ProjectionPlanDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/projection-plan/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/projection-plan/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  activatePlan = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ProjectionPlanDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/projection-plan/${id}/activate-plan`,
      },
      { apiName: this.apiName, ...config },
    );

  generatePlanFromPipelineAndActuals = (
    input: GenerateProjectionPlanInput,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, ProjectionPlanDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/projection-plan/generate-plan-from-pipeline-and-actuals',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  runScenarioAnalysis = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ScenarioAnalysisResultDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/projection-plan/${id}/run-scenario-analysis`,
      },
      { apiName: this.apiName, ...config },
    );

  getExecutiveDashboard = (fiscalYear?: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ExecutiveProjectionDashboardDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/projection-plan/executive-dashboard',
        params: { fiscalYear },
      },
      { apiName: this.apiName, ...config },
    );

  syncActualsFromErp = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ProjectionPlanDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/projection-plan/${id}/sync-actuals-from-erp`,
      },
      { apiName: this.apiName, ...config },
    );
}
