import { Rest, RestService, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import type {
  CreateDeliveryChallanDto,
  DeliveryChallanDto,
  DispatchDeliveryChallanDto,
  GetDeliveryChallansInput,
} from './delivery-challan.models';

@Injectable({
  providedIn: 'root',
})
export class DeliveryChallanService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getList = (input: GetDeliveryChallansInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<DeliveryChallanDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/delivery-challan',
        params: {
          filter: input.filter,
          status: input.status,
          type: input.type,
          salesOrderId: input.salesOrderId,
          customerId: input.customerId,
          customerAccountId: input.customerAccountId,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DeliveryChallanDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/delivery-challan/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  create = (input: CreateDeliveryChallanDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DeliveryChallanDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/delivery-challan',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  createFromSalesOrder = (salesOrderId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DeliveryChallanDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/delivery-challan/from-sales-order/${salesOrderId}`,
      },
      { apiName: this.apiName, ...config },
    );

  dispatch = (id: string, input: DispatchDeliveryChallanDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DeliveryChallanDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/delivery-challan/${id}/dispatch`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  markDelivered = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DeliveryChallanDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/delivery-challan/${id}/mark-delivered`,
      },
      { apiName: this.apiName, ...config },
    );

  cancel = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DeliveryChallanDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/delivery-challan/${id}/cancel`,
      },
      { apiName: this.apiName, ...config },
    );
}
