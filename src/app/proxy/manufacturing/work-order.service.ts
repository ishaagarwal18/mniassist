import { Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PagedResultDto } from '@abp/ng.core';
import {
  CompleteRoutingStepDto,
  CompleteWorkOrderDto,
  CreateWorkOrderDto,
  GetWorkOrdersInput,
  IssueMaterialToWorkOrderDto,
  WorkOrderDto,
} from './work-order.models';

@Injectable({
  providedIn: 'root',
})
export class WorkOrderService {
  private readonly restService = inject(RestService);
  apiName = 'AutoReach';

  getList(
    input: GetWorkOrdersInput,
    config?: Partial<Rest.Config>,
  ): Observable<PagedResultDto<WorkOrderDto>> {
    return this.restService.request<any, PagedResultDto<WorkOrderDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/work-order',
        params: {
          filter: input.filter,
          status: input.status,
          currentStage: input.currentStage,
          salesOrderId: input.salesOrderId,
          billOfMaterialId: input.billOfMaterialId,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );
  }

  get(id: string, config?: Partial<Rest.Config>): Observable<WorkOrderDto> {
    return this.restService.request<any, WorkOrderDto>(
      {
        method: 'GET',
        url: `/api/auto-reach/work-order/${id}`,
      },
      { apiName: this.apiName, ...config },
    );
  }

  create(input: CreateWorkOrderDto, config?: Partial<Rest.Config>): Observable<WorkOrderDto> {
    return this.restService.request<any, WorkOrderDto>(
      {
        method: 'POST',
        url: '/api/auto-reach/work-order',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
  }

  release(id: string, config?: Partial<Rest.Config>): Observable<WorkOrderDto> {
    return this.restService.request<any, WorkOrderDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/work-order/${id}/release`,
      },
      { apiName: this.apiName, ...config },
    );
  }

  issueMaterial(
    id: string,
    input: IssueMaterialToWorkOrderDto,
    config?: Partial<Rest.Config>,
  ): Observable<WorkOrderDto> {
    return this.restService.request<any, WorkOrderDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/work-order/${id}/issue-material`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
  }

  completeStep(
    id: string,
    input: CompleteRoutingStepDto,
    config?: Partial<Rest.Config>,
  ): Observable<WorkOrderDto> {
    return this.restService.request<any, WorkOrderDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/work-order/${id}/complete-step`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
  }

  completeWorkOrder(
    id: string,
    input: CompleteWorkOrderDto,
    config?: Partial<Rest.Config>,
  ): Observable<WorkOrderDto> {
    return this.restService.request<any, WorkOrderDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/work-order/${id}/complete-work-order`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
  }

  cancel(id: string, config?: Partial<Rest.Config>): Observable<WorkOrderDto> {
    return this.restService.request<any, WorkOrderDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/work-order/${id}/cancel`,
      },
      { apiName: this.apiName, ...config },
    );
  }
}
