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
}

export interface PublicReorderMachineDto {
  description: string;
  serialNumber?: string | null;
  site?: string | null;
  parts: PublicReorderPartDto[];
}

export interface PublicReorderHistoryDto {
  reference: string;
  status: string;
  totalInPaise: number;
  sentAtUtc: string;
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
}
