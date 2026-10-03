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
  /** Customers see the quantity available ("12 in stock") rather than a band. */
  showExactStock?: boolean;
  /** Customers can sign in with their WhatsApp number and a password. */
  passwordSignIn?: boolean;
  /** Read-only: the sign-in page's address. */
  signInUrl?: string | null;
  /** A public catalogue anyone can browse and send an enquiry from. */
  publicCatalogue?: boolean;
  /** The public catalogue shows list prices; otherwise "price on request". */
  catalogueShowsPrices?: boolean;
  /** Read-only: the public catalogue's address. */
  catalogueUrl?: string | null;
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
  /** Why it was outside the customer's credit terms when sent. */
  creditNote?: string | null;
  creationTime: string;
}

export type ReorderBuyerRole = 'Orders' | 'NeedsApproval' | 'Approver';

export interface ReorderBuyerDto {
  contactId: string;
  name: string;
  waId?: string | null;
  role: ReorderBuyerRole;
  /** For NeedsApproval: requests up to this go straight through. Null: every request waits. */
  approvalAboveInPaise?: number | null;
  /** The buyer has a password for the sign-in page. */
  hasPassword?: boolean;
}

export interface ReorderApprovalDto {
  id: string;
  contactId: string;
  contactName?: string | null;
  companyName?: string | null;
  lineCount: number;
  subtotalInPaise: number;
  state: string;
  creationTime: string;
}

export interface CustomerCreditDto {
  customerId: string;
  creditLimitInPaise?: number | null;
  paymentTermsDays?: number | null;
  holdWhenOverdueDays?: number | null;
  onHold: boolean;
  holdReason?: string | null;
  /** Read-only: what the ERP says they owe. */
  owedInPaise: number;
  /** Read-only: issued quotations not yet decided. */
  onOrderInPaise: number;
  /** Read-only: the oldest unpaid invoice's days past due. */
  overdueDays: number;
  /** Read-only: limit less owed and on order. */
  availableInPaise?: number | null;
  /** Read-only: why a new order would need a word with the customer now. */
  problems: string[];
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

  getBuyers = (accountId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ReorderBuyerDto[]>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `${this.base}/buyers/${accountId}`,
      },
      { apiName: this.apiName, ...config },
    );

  setBuyer = (
    input: { contactId: string; role: ReorderBuyerRole; approvalAboveInPaise?: number | null },
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, ReorderBuyerDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `${this.base}/set-buyer`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  getCredit = (customerId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CustomerCreditDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `${this.base}/credit/${customerId}`,
      },
      { apiName: this.apiName, ...config },
    );

  setCredit = (
    input: {
      customerId: string;
      creditLimitInPaise?: number | null;
      paymentTermsDays?: number | null;
      holdWhenOverdueDays?: number | null;
      onHold: boolean;
      holdReason?: string | null;
    },
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, CustomerCreditDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `${this.base}/set-credit`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  clearPassword = (contactId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `${this.base}/clear-password/${contactId}`,
      },
      { apiName: this.apiName, ...config },
    );

  getApprovals = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ReorderApprovalDto[]>(
      { method: 'GET', headers: { Accept: 'application/json' }, url: `${this.base}/approvals` },
      { apiName: this.apiName, ...config },
    );
}
