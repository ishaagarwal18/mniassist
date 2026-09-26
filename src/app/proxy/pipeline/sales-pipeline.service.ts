import type {
  CreateSalesPipelineInput,
  DeletePipelineStageInput,
  DeleteSalesPipelineInput,
  ReorderPipelineStagesInput,
  SalesPipelineDto,
  SavePipelineStageInput,
  UpdateSalesPipelineInput,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SalesPipelineService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  addStage = (pipelineId: string, input: SavePipelineStageInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SalesPipelineDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/sales-pipeline/stage/${pipelineId}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  create = (input: CreateSalesPipelineInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SalesPipelineDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/sales-pipeline',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, input: DeleteSalesPipelineInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'DELETE',
        url: `/api/auto-reach/sales-pipeline/${id}`,
        params: { moveEnquiriesToPipelineId: input.moveEnquiriesToPipelineId },
      },
      { apiName: this.apiName, ...config },
    );

  deleteStage = (stageId: string, input: DeletePipelineStageInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SalesPipelineDto>(
      {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/sales-pipeline/stage/${stageId}`,
        params: { moveEnquiriesToStageId: input.moveEnquiriesToStageId },
      },
      { apiName: this.apiName, ...config },
    );

  getList = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<SalesPipelineDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/sales-pipeline',
      },
      { apiName: this.apiName, ...config },
    );

  reorderStages = (
    pipelineId: string,
    input: ReorderPipelineStagesInput,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, SalesPipelineDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/sales-pipeline/reorder-stages/${pipelineId}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  setDefault = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SalesPipelineDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/sales-pipeline/${id}/set-default`,
      },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: UpdateSalesPipelineInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SalesPipelineDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/sales-pipeline/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  updateStage = (stageId: string, input: SavePipelineStageInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SalesPipelineDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/sales-pipeline/stage/${stageId}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
