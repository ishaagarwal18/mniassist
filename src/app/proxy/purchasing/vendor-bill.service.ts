import { Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PagedResultDto } from '@abp/ng.core';
import {
  CreateVendorBillDto,
  GetVendorBillsInput,
  RecordVendorBillPaymentDto,
  VendorBillDto,
} from './vendor-bill.models';
import { Gstr2bMatchStatus } from './purchasing-enums';

@Injectable({
  providedIn: 'root',
})
export class VendorBillService {
  private readonly restService = inject(RestService);
  apiName = 'AutoReach';

  getList(input: GetVendorBillsInput, config?: Partial<Rest.Config>): Observable<PagedResultDto<VendorBillDto>> {
    return this.restService.request<any, PagedResultDto<VendorBillDto>>(
      {
        method: 'GET',
        url: '/api/app/vendor-bill',
        params: {
          filter: input.filter,
          status: input.status,
          threeWayMatchStatus: input.threeWayMatchStatus,
          gstr2bMatchStatus: input.gstr2bMatchStatus,
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

  get(id: string, config?: Partial<Rest.Config>): Observable<VendorBillDto> {
    return this.restService.request<any, VendorBillDto>(
      {
        method: 'GET',
        url: `/api/app/vendor-bill/${id}`,
      },
      { apiName: this.apiName, ...config },
    );
  }

  create(input: CreateVendorBillDto, config?: Partial<Rest.Config>): Observable<VendorBillDto> {
    return this.restService.request<any, VendorBillDto>(
      {
        method: 'POST',
        url: '/api/app/vendor-bill',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
  }

  createFromGrn(grnId: string, vendorInvoiceNumber: string, invoiceDate: string, config?: Partial<Rest.Config>): Observable<VendorBillDto> {
    return this.restService.request<any, VendorBillDto>(
      {
        method: 'POST',
        url: `/api/app/vendor-bill/create-from-grn/${grnId}`,
        params: { vendorInvoiceNumber, invoiceDate },
      },
      { apiName: this.apiName, ...config },
    );
  }

  approve(id: string, config?: Partial<Rest.Config>): Observable<VendorBillDto> {
    return this.restService.request<any, VendorBillDto>(
      {
        method: 'POST',
        url: `/api/app/vendor-bill/${id}/approve`,
      },
      { apiName: this.apiName, ...config },
    );
  }

  recordPayment(id: string, input: RecordVendorBillPaymentDto, config?: Partial<Rest.Config>): Observable<VendorBillDto> {
    return this.restService.request<any, VendorBillDto>(
      {
        method: 'POST',
        url: `/api/app/vendor-bill/${id}/record-payment`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
  }

  reconcileGstr2b(id: string, status: Gstr2bMatchStatus, config?: Partial<Rest.Config>): Observable<VendorBillDto> {
    return this.restService.request<any, VendorBillDto>(
      {
        method: 'POST',
        url: `/api/app/vendor-bill/${id}/reconcile-gstr2b`,
        params: { status },
      },
      { apiName: this.apiName, ...config },
    );
  }

  cancel(id: string, config?: Partial<Rest.Config>): Observable<VendorBillDto> {
    return this.restService.request<any, VendorBillDto>(
      {
        method: 'POST',
        url: `/api/app/vendor-bill/${id}/cancel`,
      },
      { apiName: this.apiName, ...config },
    );
  }
}
