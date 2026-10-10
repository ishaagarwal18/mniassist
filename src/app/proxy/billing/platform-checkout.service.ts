import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export enum CheckoutStatus {
  Pending = 0,
  Paid = 1,
  Failed = 2,
}

export enum CheckoutPurpose {
  WalletTopUp = 0,
  Invoice = 1,
}

export interface CheckoutGatewayDto {
  /** `Razorpay` or `PayU`. */
  name: string;
  label: string;
}

export interface RazorpayCheckoutDto {
  keyId: string;
  orderId: string;
  name: string;
  description: string;
  prefillName?: string | null;
  prefillEmail?: string | null;
  prefillContact?: string | null;
}

export interface PayUCheckoutDto {
  actionUrl: string;
  fields: Record<string, string>;
}

export interface CheckoutStartDto {
  checkoutId: string;
  gateway: string;
  amountInPaise: number;
  currency: string;
  razorpay?: RazorpayCheckoutDto | null;
  payU?: PayUCheckoutDto | null;
}

export interface CheckoutStatusDto {
  id: string;
  purpose: CheckoutPurpose;
  invoiceId?: string | null;
  gateway: string;
  amountInPaise: number;
  status: CheckoutStatus;
  failureReason?: string | null;
}

export interface CompleteRazorpayCheckoutInput {
  checkoutId: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}

/** Paying the platform by Razorpay or PayU, the workspace's choice (M11-7). */
@Injectable({ providedIn: 'root' })
export class PlatformCheckoutService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getGateways = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<CheckoutGatewayDto>>(
      { method: 'GET', url: '/api/auto-reach/platform-checkout/gateways' },
      { apiName: this.apiName, ...config },
    );

  startTopUp = (input: { gateway: string; amountInPaise: number }, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CheckoutStartDto>(
      { method: 'POST', url: '/api/auto-reach/platform-checkout/start-top-up', body: input },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  startInvoicePayment = (
    input: { gateway: string; invoiceId: string },
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, CheckoutStartDto>(
      {
        method: 'POST',
        url: '/api/auto-reach/platform-checkout/start-invoice-payment',
        body: input,
      },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  completeRazorpay = (input: CompleteRazorpayCheckoutInput, config?: Partial<Rest.Config>) =>
    this.restService.request<CompleteRazorpayCheckoutInput, CheckoutStatusDto>(
      { method: 'POST', url: '/api/auto-reach/platform-checkout/complete-razorpay', body: input },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CheckoutStatusDto>(
      { method: 'GET', url: `/api/auto-reach/platform-checkout/${id}` },
      { apiName: this.apiName, ...config },
    );
}
