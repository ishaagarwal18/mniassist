import { Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PagedResultDto } from '@abp/ng.core';
import {
  CompleteQcInspectionDto,
  CreateGoodsReceiptNoteDto,
  GetGoodsReceiptNotesInput,
  GoodsReceiptNoteDto,
} from './goods-receipt-note.models';

@Injectable({
  providedIn: 'root',
})
export class GoodsReceiptNoteService {
  private readonly restService = inject(RestService);
  apiName = 'AutoReach';

  getList(input: GetGoodsReceiptNotesInput, config?: Partial<Rest.Config>): Observable<PagedResultDto<GoodsReceiptNoteDto>> {
    return this.restService.request<any, PagedResultDto<GoodsReceiptNoteDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/goods-receipt-note',
        params: {
          filter: input.filter,
          status: input.status,
          qcStatus: input.qcStatus,
          supplierId: input.supplierId,
          purchaseOrderId: input.purchaseOrderId,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );
  }

  get(id: string, config?: Partial<Rest.Config>): Observable<GoodsReceiptNoteDto> {
    return this.restService.request<any, GoodsReceiptNoteDto>(
      {
        method: 'GET',
        url: `/api/auto-reach/goods-receipt-note/${id}`,
      },
      { apiName: this.apiName, ...config },
    );
  }

  create(input: CreateGoodsReceiptNoteDto, config?: Partial<Rest.Config>): Observable<GoodsReceiptNoteDto> {
    return this.restService.request<any, GoodsReceiptNoteDto>(
      {
        method: 'POST',
        url: '/api/auto-reach/goods-receipt-note',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
  }

  createFromPurchaseOrder(purchaseOrderId: string, challanNumber: string, config?: Partial<Rest.Config>): Observable<GoodsReceiptNoteDto> {
    return this.restService.request<any, GoodsReceiptNoteDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/goods-receipt-note/from-purchase-order/${purchaseOrderId}`,
        params: { challanNumber },
      },
      { apiName: this.apiName, ...config },
    );
  }

  startInspection(id: string, config?: Partial<Rest.Config>): Observable<GoodsReceiptNoteDto> {
    return this.restService.request<any, GoodsReceiptNoteDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/goods-receipt-note/${id}/start-inspection`,
      },
      { apiName: this.apiName, ...config },
    );
  }

  completeInspection(id: string, input: CompleteQcInspectionDto, config?: Partial<Rest.Config>): Observable<GoodsReceiptNoteDto> {
    return this.restService.request<any, GoodsReceiptNoteDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/goods-receipt-note/${id}/complete-inspection`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
  }

  cancel(id: string, config?: Partial<Rest.Config>): Observable<GoodsReceiptNoteDto> {
    return this.restService.request<any, GoodsReceiptNoteDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/goods-receipt-note/${id}/cancel`,
      },
      { apiName: this.apiName, ...config },
    );
  }
}
