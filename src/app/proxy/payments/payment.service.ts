import type { PagedResultDto } from '@abp/ng.core';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export enum PaymentRequestStatus {
  Pending = 0,
  Paid = 1,
  Failed = 2,
  Expired = 3,
  Cancelled = 4,
}

export enum BillDeskEnvironment {
  Uat = 0,
  Production = 1,
}

export interface PaymentGatewayDto {
  merchantId?: string | null;
  clientId?: string | null;
  environment: BillDeskEnvironment;
  enabled: boolean;
  hasSecret: boolean;
  webhookUrl: string;
}

export interface SetPaymentGatewayInput {
  merchantId?: string | null;
  clientId?: string | null;
  /** Only when setting or rotating it; empty keeps the stored one. */
  secret?: string | null;
  environment: BillDeskEnvironment;
  enabled: boolean;
}

export interface CreatePaymentRequestInput {
  conversationId: string;
  /** Rupees. */
  amount: number;
  description: string;
}

export interface PaymentRequestDto {
  id: string;
  reference: string;
  contactId: string;
  contactName?: string | null;
  conversationId?: string | null;
  amountInPaise: number;
  description: string;
  status: PaymentRequestStatus;
  payUrl: string;
  expiresAtUtc: string;
  paidAtUtc?: string | null;
  transactionId?: string | null;
  failureReason?: string | null;
  creationTime: string;
}

export interface GetPaymentRequestsInput {
  status?: PaymentRequestStatus | null;
  contactId?: string | null;
  skipCount?: number;
  maxResultCount?: number;
}

export interface PublicPaymentDto {
  reference: string;
  payeeName: string;
  description: string;
  amountInPaise: number;
  status: PaymentRequestStatus;
  canPay: boolean;
  expiresAtUtc: string;
  failureReason?: string | null;
}

export interface PaymentCheckoutDto {
  actionUrl: string;
  fields: Record<string, string>;
}

/** Payment requests and the workspace's BillDesk account. Routes follow ABP's conventional-controller naming for PaymentAppService. */
@Injectable({ providedIn: 'root' })
export class PaymentService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getGateway = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, PaymentGatewayDto>(
      { method: 'GET', url: '/api/auto-reach/payment/gateway' },
      { apiName: this.apiName, ...config },
    );

  setGateway = (input: SetPaymentGatewayInput, config?: Partial<Rest.Config>) =>
    this.restService.request<SetPaymentGatewayInput, PaymentGatewayDto>(
      { method: 'POST', url: '/api/auto-reach/payment/set-gateway', body: input },
      { apiName: this.apiName, ...config },
    );

  create = (input: CreatePaymentRequestInput, config?: Partial<Rest.Config>) =>
    this.restService.request<CreatePaymentRequestInput, PaymentRequestDto>(
      { method: 'POST', url: '/api/auto-reach/payment', body: input },
      { apiName: this.apiName, ...config },
    );

  getList = (input: GetPaymentRequestsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<PaymentRequestDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/payment',
        params: {
          status: input.status,
          contactId: input.contactId,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  cancel = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PaymentRequestDto>(
      { method: 'POST', url: `/api/auto-reach/payment/${id}/cancel` },
      { apiName: this.apiName, ...config },
    );
}

/** What the customer's browser calls. Anonymous; errors are handled by the page itself. */
@Injectable({ providedIn: 'root' })
export class PaymentPublicService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  private readonly own: Partial<Rest.Config> = { skipHandleError: true };

  get = (token: string) =>
    this.restService.request<any, PublicPaymentDto>(
      { method: 'GET', url: `/api/payments/public/${token}` },
      { apiName: this.apiName, ...this.own },
    );

  checkout = (token: string) =>
    this.restService.request<any, PaymentCheckoutDto>(
      { method: 'POST', url: `/api/payments/public/${token}/checkout` },
      { apiName: this.apiName, ...this.own },
    );
}
