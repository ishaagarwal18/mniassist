import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

import type {
  SigningCodeSentDto,
  SigningResultDto,
  SigningViewDto,
  SubmitSignatureInput,
} from './quotation-signature.models';

/**
 * What a customer's signing link calls. Anonymous: the link's secret is the only credential. Errors are handled by the page
 * itself, so the app-wide handler (which would talk about sessions) is skipped.
 */
@Injectable({ providedIn: 'root' })
export class QuoteSigningService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  private readonly own: Partial<Rest.Config> = { skipHandleError: true };

  get = (token: string) =>
    this.restService.request<any, SigningViewDto>(
      { method: 'GET', url: `/api/quote-signing/${token}` },
      { apiName: this.apiName, ...this.own },
    );

  /** Emails the signer a one-time code, when the request asks for one. */
  sendCode = (token: string) =>
    this.restService.request<any, SigningCodeSentDto>(
      { method: 'POST', url: `/api/quote-signing/${token}/code` },
      { apiName: this.apiName, ...this.own },
    );

  sign = (token: string, input: SubmitSignatureInput) =>
    this.restService.request<any, SigningResultDto>(
      { method: 'POST', url: `/api/quote-signing/${token}/sign`, body: input },
      { apiName: this.apiName, ...this.own },
    );

  decline = (token: string, reason: string | null) =>
    this.restService.request<any, SigningResultDto>(
      { method: 'POST', url: `/api/quote-signing/${token}/decline`, body: { reason } },
      { apiName: this.apiName, ...this.own },
    );

  /** Where the document downloads from, for a link. */
  documentPath = (token: string) => `/api/quote-signing/${token}/document`;
}
