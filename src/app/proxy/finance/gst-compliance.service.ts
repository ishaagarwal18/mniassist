import { Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PagedResultDto } from '@abp/ng.core';
import {
  CancelGstDocumentInput,
  CreateGstAuditRegisterDto,
  GenerateEWayBillInput,
  GetGstAuditRegistersInput,
  GstAuditRegisterDto,
  GstPortalReadinessDto,
  GstPortalSettingsDto,
  GstPortalTestResultDto,
  Gstr1SummaryDto,
  Gstr3bSummaryDto,
  UpdateGstPortalSettingsInput,
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

  /** Brings the period's issued sales invoices that are not yet in the register into it; returns how many were added. */
  recordIssuedInvoices(returnPeriod: string, config?: Partial<Rest.Config>): Observable<number> {
    return this.restService.request<any, number>(
      {
        method: 'POST',
        url: '/api/auto-reach/gst-compliance/record-issued-invoices',
        params: { returnPeriod },
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

  /** Cancels the IRN on the portal: within 24 hours, and not while an e-way bill is active. */
  cancelEInvoice(
    id: string,
    input: CancelGstDocumentInput,
    config?: Partial<Rest.Config>,
  ): Observable<GstAuditRegisterDto> {
    return this.restService.request<any, GstAuditRegisterDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/gst-compliance/${id}/cancel-einvoice`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
  }

  /** Cancels the e-way bill on the portal: within 24 hours of generating it. */
  cancelEWayBill(
    id: string,
    input: CancelGstDocumentInput,
    config?: Partial<Rest.Config>,
  ): Observable<GstAuditRegisterDto> {
    return this.restService.request<any, GstAuditRegisterDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/gst-compliance/${id}/cancel-eway-bill`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
  }

  /** What the portal would refuse this invoice for, checked before anything is sent. */
  getReadiness(id: string, config?: Partial<Rest.Config>): Observable<GstPortalReadinessDto> {
    return this.restService.request<any, GstPortalReadinessDto>(
      {
        method: 'GET',
        url: `/api/auto-reach/gst-compliance/${id}/readiness`,
      },
      { apiName: this.apiName, ...config },
    );
  }
}

/** The workspace's connection to the e-invoice and e-way bill portals (through Masters India). */
@Injectable({
  providedIn: 'root',
})
export class GstPortalSettingsService {
  private readonly restService = inject(RestService);
  apiName = 'AutoReach';

  get(config?: Partial<Rest.Config>): Observable<GstPortalSettingsDto> {
    return this.restService.request<any, GstPortalSettingsDto>(
      { method: 'GET', url: '/api/auto-reach/gst-portal-settings' },
      { apiName: this.apiName, ...config },
    );
  }

  update(
    input: UpdateGstPortalSettingsInput,
    config?: Partial<Rest.Config>,
  ): Observable<GstPortalSettingsDto> {
    return this.restService.request<any, GstPortalSettingsDto>(
      { method: 'PUT', url: '/api/auto-reach/gst-portal-settings', body: input },
      { apiName: this.apiName, ...config },
    );
  }

  /** Signs in to the provider with the saved account and says whether it worked. */
  test(config?: Partial<Rest.Config>): Observable<GstPortalTestResultDto> {
    return this.restService.request<any, GstPortalTestResultDto>(
      { method: 'POST', url: '/api/auto-reach/gst-portal-settings/test' },
      { apiName: this.apiName, ...config },
    );
  }
}
