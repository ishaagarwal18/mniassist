import { Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PagedResultDto } from '@abp/ng.core';
import {
  CreateVendorDebitNoteDto,
  GetVendorDebitNotesInput,
  VendorDebitNoteDto,
} from './vendor-debit-note.models';

@Injectable({
  providedIn: 'root',
})
export class VendorDebitNoteService {
  private readonly restService = inject(RestService);
  apiName = 'AutoReach';

  getList(input: GetVendorDebitNotesInput, config?: Partial<Rest.Config>): Observable<PagedResultDto<VendorDebitNoteDto>> {
    return this.restService.request<any, PagedResultDto<VendorDebitNoteDto>>(
      {
        method: 'GET',
        url: '/api/app/vendor-debit-note',
        params: {
          filter: input.filter,
          status: input.status,
          supplierId: input.supplierId,
          vendorBillId: input.vendorBillId,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );
  }

  get(id: string, config?: Partial<Rest.Config>): Observable<VendorDebitNoteDto> {
    return this.restService.request<any, VendorDebitNoteDto>(
      {
        method: 'GET',
        url: `/api/app/vendor-debit-note/${id}`,
      },
      { apiName: this.apiName, ...config },
    );
  }

  create(input: CreateVendorDebitNoteDto, config?: Partial<Rest.Config>): Observable<VendorDebitNoteDto> {
    return this.restService.request<any, VendorDebitNoteDto>(
      {
        method: 'POST',
        url: '/api/app/vendor-debit-note',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
  }

  createFromGrnRejection(grnId: string, reason: string, config?: Partial<Rest.Config>): Observable<VendorDebitNoteDto> {
    return this.restService.request<any, VendorDebitNoteDto>(
      {
        method: 'POST',
        url: `/api/app/vendor-debit-note/create-from-grn-rejection/${grnId}`,
        params: { reason },
      },
      { apiName: this.apiName, ...config },
    );
  }

  issue(id: string, config?: Partial<Rest.Config>): Observable<VendorDebitNoteDto> {
    return this.restService.request<any, VendorDebitNoteDto>(
      {
        method: 'POST',
        url: `/api/app/vendor-debit-note/${id}/issue`,
      },
      { apiName: this.apiName, ...config },
    );
  }

  settle(id: string, config?: Partial<Rest.Config>): Observable<VendorDebitNoteDto> {
    return this.restService.request<any, VendorDebitNoteDto>(
      {
        method: 'POST',
        url: `/api/app/vendor-debit-note/${id}/settle`,
      },
      { apiName: this.apiName, ...config },
    );
  }

  cancel(id: string, config?: Partial<Rest.Config>): Observable<VendorDebitNoteDto> {
    return this.restService.request<any, VendorDebitNoteDto>(
      {
        method: 'POST',
        url: `/api/app/vendor-debit-note/${id}/cancel`,
      },
      { apiName: this.apiName, ...config },
    );
  }
}
