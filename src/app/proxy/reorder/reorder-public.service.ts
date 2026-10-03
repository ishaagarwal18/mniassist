import { Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export type StockBand = 'InStock' | 'Limited' | 'OnOrder';

export interface PublicReorderLinkDto {
  heading?: string | null;
  intro?: string | null;
  /** "••••••2222": where the code goes. */
  sendsCodeTo: string;
  expiresAtUtc: string;
}

export interface ReorderSessionDto {
  session: string;
  expiresAtUtc: string;
}

export interface PublicReorderPartDto {
  partNumber: string;
  description: string;
  unit: string;
  /** The customer's own price before GST; 0 when sales will price it. */
  unitPriceInPaise: number;
  taxRateBasisPoints: number;
  suggestedQuantity: number;
  dueInDays?: number | null;
  availability?: StockBand | null;
  /** How many are available now, when the workspace shows exact stock; null otherwise. */
  availableQuantity?: number | null;
}

export interface PublicReorderMachineDto {
  description: string;
  serialNumber?: string | null;
  site?: string | null;
  parts: PublicReorderPartDto[];
}

export interface PublicReorderHistoryDto {
  reference: string;
  /** With sales, Quoted, Ordered, Closed, Waiting for approval, Not approved. */
  status: string;
  totalInPaise: number;
  sentAtUtc: string;
  /** The colleague who sent it; null when it was this buyer. */
  sentBy?: string | null;
  /** Why an approver declined it. */
  reason?: string | null;
  /** Once dispatched: Dispatched, InTransit, OutForDelivery, Delivered or Exception, with the carrier and docket. */
  delivery?: string | null;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  expectedOn?: string | null;
}

/** A colleague's request waiting for this approver. */
export interface PublicReorderApprovalDto {
  id: string;
  sentBy: string;
  sentAtUtc: string;
  subtotalInPaise: number;
  poNumber?: string | null;
  deliverySite?: string | null;
  note?: string | null;
  lines: { partNumber: string; description: string; quantity: number; unitPriceInPaise: number }[];
}

export interface PublicReorderPortalDto {
  heading?: string | null;
  intro?: string | null;
  customerName: string;
  minimumOrderInPaise?: number | null;
  showsStock: boolean;
  /** A fully priced request becomes an order to pay for at once. */
  orderAndPay?: boolean;
  machines: PublicReorderMachineDto[];
  recent: PublicReorderHistoryDto[];
  /** This buyer approves the company's held requests. */
  isApprover?: boolean;
  /** For an approver: colleagues' requests waiting for them. */
  pending?: PublicReorderApprovalDto[];
  /** Payment terms in days from invoice; null when none are set. */
  paymentTermsDays?: number | null;
  /** Shown when the account needs a word before new orders are confirmed. */
  accountNotice?: string | null;
  /** The workspace lets customers sign in with a password, at this address. */
  passwordSignIn?: boolean;
  signInUrl?: string | null;
  /** This buyer already has a password. */
  hasPassword?: boolean;
}

/** Where a signed-in customer goes: their page at /r/{token}, with the session already started. */
export interface PublicSignedInDto {
  token: string;
  session: string;
  expiresAtUtc: string;
}

export interface SubmitReorderInput {
  lines: { partNumber: string; quantity: number }[];
  poNumber?: string | null;
  deliverySite?: string | null;
  note?: string | null;
}

export interface PublicReorderSubmittedDto {
  reference: string;
  subtotalInPaise: number;
  taxInPaise: number;
  unpriced: number;
  /** "Order and pay": where to pay. Null when the request went to sales for a quotation. */
  payUrl?: string | null;
  /** The request waits for an approver at the customer's company. */
  heldForApproval?: boolean;
  message: string;
}

/**
 * What a customer's browser calls on the re-order page. Anonymous: the personal link is all they hold, and the one-time code starts a
 * session sent back in `X-Reorder-Session`. The page handles its own errors.
 */
@Injectable({ providedIn: 'root' })
export class ReorderPublicService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  private readonly own: Partial<Rest.Config> = { skipHandleError: true };

  private url = (token: string, tail = '') => `/api/reorder/public/${token}${tail}`;

  private session = (session: string) => ({ 'X-Reorder-Session': session });

  open = (token: string) =>
    this.restService.request<any, PublicReorderLinkDto>(
      { method: 'GET', url: this.url(token) },
      { apiName: this.apiName, ...this.own },
    );

  sendCode = (token: string) =>
    this.restService.request<any, { sentTo: string; validForMinutes: number }>(
      { method: 'POST', url: this.url(token, '/code') },
      { apiName: this.apiName, ...this.own },
    );

  verify = (token: string, code: string) =>
    this.restService.request<any, ReorderSessionDto>(
      { method: 'POST', url: this.url(token, '/verify'), body: { code } },
      { apiName: this.apiName, ...this.own },
    );

  portal = (token: string, session: string) =>
    this.restService.request<any, PublicReorderPortalDto>(
      { method: 'GET', url: this.url(token, '/portal'), headers: this.session(session) },
      { apiName: this.apiName, ...this.own },
    );

  search = (token: string, session: string, q: string) =>
    this.restService.request<any, PublicReorderPartDto[]>(
      {
        method: 'GET',
        url: this.url(token, '/search'),
        params: { q },
        headers: this.session(session),
      },
      { apiName: this.apiName, ...this.own },
    );

  submit = (token: string, session: string, input: SubmitReorderInput) =>
    this.restService.request<any, PublicReorderSubmittedDto>(
      {
        method: 'POST',
        url: this.url(token, '/submit'),
        body: input,
        headers: this.session(session),
      },
      { apiName: this.apiName, ...this.own },
    );

  /** A buyer on their page chooses a password for the workspace's sign-in page. */
  setPassword = (token: string, session: string, password: string) =>
    this.restService.request<any, void>(
      {
        method: 'POST',
        url: this.url(token, '/password'),
        body: { password },
        headers: this.session(session),
      },
      { apiName: this.apiName, ...this.own },
    );

  // ---- The workspace's password sign-in page (/reorder/{code}) -----------------------------------------------------------

  private signInUrl = (code: string, tail = '') => `/api/reorder/sign-in/${code}${tail}`;

  openSignIn = (code: string) =>
    this.restService.request<any, { heading?: string | null; intro?: string | null }>(
      { method: 'GET', url: this.signInUrl(code) },
      { apiName: this.apiName, ...this.own },
    );

  signIn = (code: string, phone: string, password: string) =>
    this.restService.request<any, PublicSignedInDto>(
      { method: 'POST', url: this.signInUrl(code), body: { phone, password } },
      { apiName: this.apiName, ...this.own },
    );

  sendSignInCode = (code: string, phone: string) =>
    this.restService.request<any, { message: string; validForMinutes: number }>(
      { method: 'POST', url: this.signInUrl(code, '/code'), body: { phone } },
      { apiName: this.apiName, ...this.own },
    );

  setPasswordWithCode = (code: string, phone: string, whatsAppCode: string, password: string) =>
    this.restService.request<any, PublicSignedInDto>(
      {
        method: 'POST',
        url: this.signInUrl(code, '/password'),
        body: { phone, code: whatsAppCode, password },
      },
      { apiName: this.apiName, ...this.own },
    );

  decide = (
    token: string,
    session: string,
    approvalId: string,
    approve: boolean,
    reason?: string | null,
  ) =>
    this.restService.request<any, { state: string; message: string }>(
      {
        method: 'POST',
        url: this.url(token, `/approvals/${approvalId}`),
        body: { approve, reason },
        headers: this.session(session),
      },
      { apiName: this.apiName, ...this.own },
    );
}
