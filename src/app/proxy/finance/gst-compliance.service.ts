import { Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ListResultDto, PagedResultDto } from '@abp/ng.core';
import {
  CancelGstDocumentInput,
  CreateGstAuditRegisterDto,
  GenerateEWayBillInput,
  GetGstAuditRegistersInput,
  GstAuditRegisterDto,
  GstCreditOpeningDto,
  GstPortalSessionDto,
  GstPortalReadinessDto,
  SetGstCreditOpeningInput,
  GstPortalSettingsDto,
  GstPortalTestResultDto,
  Gstr1SummaryDto,
  Gstr3bSummaryDto,
  UpdateGstPortalSettingsInput,
  GetGstr2bLinesInput,
  Gstr2bLineDto,
  Gstr2bMissingBillDto,
  Gstr2bStatementDto,
  ImportGstr2bInput,
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

  /** The month's electronic credit ledger opening balance, or null when none is entered. */
  getCreditOpening(
    returnPeriod: string,
    config?: Partial<Rest.Config>,
  ): Observable<GstCreditOpeningDto | null> {
    return this.restService.request<any, GstCreditOpeningDto | null>(
      {
        method: 'GET',
        url: '/api/auto-reach/gst-compliance/credit-opening',
        params: { returnPeriod },
      },
      { apiName: this.apiName, ...config },
    );
  }

  setCreditOpening(
    input: SetGstCreditOpeningInput,
    config?: Partial<Rest.Config>,
  ): Observable<GstCreditOpeningDto> {
    return this.restService.request<any, GstCreditOpeningDto>(
      {
        method: 'POST',
        url: '/api/auto-reach/gst-compliance/set-credit-opening',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
  }

  clearCreditOpening(returnPeriod: string, config?: Partial<Rest.Config>): Observable<void> {
    return this.restService.request<any, void>(
      {
        method: 'POST',
        url: '/api/auto-reach/gst-compliance/clear-credit-opening',
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

/** GSTR-2B statements downloaded from the GST portal, matched against vendor bills. */
@Injectable({
  providedIn: 'root',
})
export class Gstr2bService {
  private readonly restService = inject(RestService);
  apiName = 'AutoReach';

  /** Whether GSTR-2B can be pulled from the GST portal here, and whether a session is open. */
  getPortalSession(config?: Partial<Rest.Config>): Observable<GstPortalSessionDto> {
    return this.restService.request<any, GstPortalSessionDto>(
      { method: 'GET', url: '/api/auto-reach/gstr2b/portal-session' },
      { apiName: this.apiName, ...config },
    );
  }

  /** Step 1 of signing in: the GST portal sends an OTP to the registered mobile. */
  requestPortalOtp(portalUsername: string, config?: Partial<Rest.Config>): Observable<void> {
    return this.restService.request<any, void>(
      {
        method: 'POST',
        url: '/api/auto-reach/gstr2b/request-portal-otp',
        body: { portalUsername },
      },
      { apiName: this.apiName, ...config },
    );
  }

  verifyPortalOtp(
    portalUsername: string,
    otp: string,
    config?: Partial<Rest.Config>,
  ): Observable<GstPortalSessionDto> {
    return this.restService.request<any, GstPortalSessionDto>(
      {
        method: 'POST',
        url: '/api/auto-reach/gstr2b/verify-portal-otp',
        body: { portalUsername, otp },
      },
      { apiName: this.apiName, ...config },
    );
  }

  signOutPortal(config?: Partial<Rest.Config>): Observable<void> {
    return this.restService.request<any, void>(
      { method: 'POST', url: '/api/auto-reach/gstr2b/sign-out-portal' },
      { apiName: this.apiName, ...config },
    );
  }

  /** Downloads the month's GSTR-2B from the GST portal and imports it. */
  pullFromPortal(
    returnPeriod: string,
    config?: Partial<Rest.Config>,
  ): Observable<Gstr2bStatementDto> {
    return this.restService.request<any, Gstr2bStatementDto>(
      { method: 'POST', url: '/api/auto-reach/gstr2b/pull-from-portal', params: { returnPeriod } },
      { apiName: this.apiName, ...config },
    );
  }

  /** Imports (or replaces) the period's GSTR-2B and matches it against vendor bills. */
  import(input: ImportGstr2bInput, config?: Partial<Rest.Config>): Observable<Gstr2bStatementDto> {
    return this.restService.request<any, Gstr2bStatementDto>(
      { method: 'POST', url: '/api/auto-reach/gstr2b/import', body: input },
      { apiName: this.apiName, ...config },
    );
  }

  /** The period's statement, or null when none is imported. */
  get(returnPeriod: string, config?: Partial<Rest.Config>): Observable<Gstr2bStatementDto | null> {
    return this.restService.request<any, Gstr2bStatementDto | null>(
      { method: 'GET', url: '/api/auto-reach/gstr2b', params: { returnPeriod } },
      { apiName: this.apiName, ...config },
    );
  }

  getLines(
    input: GetGstr2bLinesInput,
    config?: Partial<Rest.Config>,
  ): Observable<PagedResultDto<Gstr2bLineDto>> {
    return this.restService.request<any, PagedResultDto<Gstr2bLineDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/gstr2b/lines',
        params: {
          returnPeriod: input.returnPeriod,
          match: input.match,
          filter: input.filter,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );
  }

  /** Approved bills up to the period's end that no GSTR-2B carries. */
  getBillsMissing(
    returnPeriod: string,
    config?: Partial<Rest.Config>,
  ): Observable<ListResultDto<Gstr2bMissingBillDto>> {
    return this.restService.request<any, ListResultDto<Gstr2bMissingBillDto>>(
      { method: 'GET', url: '/api/auto-reach/gstr2b/bills-missing', params: { returnPeriod } },
      { apiName: this.apiName, ...config },
    );
  }

  delete(returnPeriod: string, config?: Partial<Rest.Config>): Observable<void> {
    return this.restService.request<any, void>(
      { method: 'DELETE', url: '/api/auto-reach/gstr2b', params: { returnPeriod } },
      { apiName: this.apiName, ...config },
    );
  }
}
