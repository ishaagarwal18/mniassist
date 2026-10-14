import { Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PagedResultDto } from '@abp/ng.core';
import {
  CreateGstAuditRegisterDto,
  GenerateEWayBillInput,
  GetGstAuditRegistersInput,
  GstAuditRegisterDto,
  Gstr1SummaryDto,
  Gstr3bSummaryDto,
} from './gst-compliance.models';

@Injectable({
  providedIn: 'root',
})
export class GstComplianceService {
  private readonly restService = inject(RestService);
  apiName = 'AutoReach';

  getList(
    input: GetGstAuditRegistersInput,
    config?: Partial<Rest.Config>,
  ): Observable<PagedResultDto<GstAuditRegisterDto>> {
    return this.restService.request<any, PagedResultDto<GstAuditRegisterDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/gst-compliance',
        params: {
          filter: input.filter,
          returnPeriod: input.returnPeriod,
          section: input.section,
          eInvoiceStatus: input.eInvoiceStatus,
          eWayBillStatus: input.eWayBillStatus,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );
  }

  get(id: string, config?: Partial<Rest.Config>): Observable<GstAuditRegisterDto> {
    return this.restService.request<any, GstAuditRegisterDto>(
      {
        method: 'GET',
        url: `/api/auto-reach/gst-compliance/${id}`,
      },
      { apiName: this.apiName, ...config },
    );
  }

  create(
    input: CreateGstAuditRegisterDto,
    config?: Partial<Rest.Config>,
  ): Observable<GstAuditRegisterDto> {
    return this.restService.request<any, GstAuditRegisterDto>(
      {
        method: 'POST',
        url: '/api/auto-reach/gst-compliance',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
  }

  getGstr1Summary(
    returnPeriod: string,
    config?: Partial<Rest.Config>,
  ): Observable<Gstr1SummaryDto> {
    return this.restService.request<any, Gstr1SummaryDto>(
      {
        method: 'GET',
        url: '/api/auto-reach/gst-compliance/gstr1Summary',
        params: { returnPeriod },
      },
      { apiName: this.apiName, ...config },
    );
  }

  getGstr3bSummary(
    returnPeriod: string,
    config?: Partial<Rest.Config>,
  ): Observable<Gstr3bSummaryDto> {
    return this.restService.request<any, Gstr3bSummaryDto>(
      {
        method: 'GET',
        url: '/api/auto-reach/gst-compliance/gstr3b-summary',
        params: { returnPeriod },
      },
      { apiName: this.apiName, ...config },
    );
  }

  generateEInvoice(id: string, config?: Partial<Rest.Config>): Observable<GstAuditRegisterDto> {
    return this.restService.request<any, GstAuditRegisterDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/gst-compliance/${id}/generate-einvoice`,
      },
      { apiName: this.apiName, ...config },
    );
  }

  generateEWayBill(
    id: string,
    input: GenerateEWayBillInput,
    config?: Partial<Rest.Config>,
  ): Observable<GstAuditRegisterDto> {
    return this.restService.request<any, GstAuditRegisterDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/gst-compliance/${id}/generate-eway-bill`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
  }
}
