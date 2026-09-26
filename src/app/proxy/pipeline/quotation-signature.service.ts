import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

import type {
  QuotationSignatureSummaryDto,
  RequestSignatureInput,
  SignatureRequestDto,
} from './quotation-signature.models';

/** Asking customers to sign quotations, and seeing where those requests stand. */
@Injectable({ providedIn: 'root' })
export class QuotationSignatureService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  request = (id: string, input: RequestSignatureInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SignatureRequestDto>(
      { method: 'POST', url: `/api/auto-reach/quotation-signature/${id}/request`, body: input },
      { apiName: this.apiName, ...config },
    );

  getForQuotation = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SignatureRequestDto[]>(
      { method: 'GET', url: `/api/auto-reach/quotation-signature/${id}/for-quotation` },
      { apiName: this.apiName, ...config },
    );

  lookupStatuses = (quotationIds: string[], config?: Partial<Rest.Config>) =>
    this.restService.request<any, QuotationSignatureSummaryDto[]>(
      {
        method: 'POST',
        url: '/api/auto-reach/quotation-signature/lookup-statuses',
        body: { quotationIds },
      },
      { apiName: this.apiName, ...config },
    );

  void = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SignatureRequestDto>(
      { method: 'POST', url: `/api/auto-reach/quotation-signature/${id}/void` },
      { apiName: this.apiName, ...config },
    );
}
