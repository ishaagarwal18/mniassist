import { Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export interface ReorderPortalSettingsDto {
  enabled: boolean;
  linkLifetimeDays: number;
  heading?: string | null;
  intro?: string | null;
  minimumOrderInPaise?: number | null;
  limitedStockBelow: number;
  linkTemplateId?: string | null;
  codeTemplateId?: string | null;
  /** SendForQuotation (the default) or OrderAndPay. */
  mode?: 'SendForQuotation' | 'OrderAndPay';
  /** Read-only: payment links can be made, which "order and pay" needs. */
  paymentsReady?: boolean;
  /** Read-only: the workspace has the add-on. */
  included?: boolean;
  /** Read-only: stock is kept in AutoReach, so availability shows on the page. */
  showsStock?: boolean;
}

export interface SentReorderLinkDto {
  url: string;
  expiresAtUtc: string;
  sent: boolean;
  /** Why it wasn't sent, when it wasn't. */
  note?: string | null;
}

export interface ReorderRequestDto {
  id: string;
  contactId: string;
  contactName?: string | null;
  enquiryId: string;
  quotationId: string;
  quotationReference: string;
  /** The quotation's state: Draft, Issued, Revised, Won, Lost, Expired. */
  state: string;
  lineCount: number;
  subtotalInPaise: number;
  poNumber?: string | null;
  deliverySite?: string | null;
  note?: string | null;
  /** "Order and pay": the payment request the customer was given. */
  paymentRequestId?: string | null;
  creationTime: string;
}

/** The staff side of the spares re-order portal (add-on). */
@Injectable({ providedIn: 'root' })
export class ReorderPortalService {
  private restService = inject(RestService);
  apiName = 'AutoReach';
  private base = '/api/auto-reach/reorder-portal';

  getSettings = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ReorderPortalSettingsDto>(
      { method: 'GET', headers: { Accept: 'application/json' }, url: `${this.base}/settings` },
      { apiName: this.apiName, ...config },
    );

  updateSettings = (input: ReorderPortalSettingsDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ReorderPortalSettingsDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `${this.base}/settings`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  sendLink = (contactId: string, sendOnWhatsApp = true, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SentReorderLinkDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `${this.base}/send-link`,
        body: { contactId, sendOnWhatsApp },
      },
      { apiName: this.apiName, ...config },
    );

  getRequests = (contactId?: string | null, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ReorderRequestDto[]>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `${this.base}/requests`,
        params: { contactId: contactId || undefined },
      },
      { apiName: this.apiName, ...config },
    );
}
