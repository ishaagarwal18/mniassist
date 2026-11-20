import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

/** Where a value in use comes from: saved on the page, the server configuration, or nowhere. */
export type PaymentConfigSource = 'saved' | 'config' | 'none';

export interface RazorpayConfigDto {
  active: boolean;
  /** Offered at checkout now: switched on and both keys present. */
  enabled: boolean;
  /** The test pair is in use: payments are simulated and no money moves. */
  testMode: boolean;
  /** Live key id, `rzp_live_…`. */
  keyId?: string | null;
  keyIdSource: PaymentConfigSource;
  keySecretSource: PaymentConfigSource;
  webhookSecretSource: PaymentConfigSource;
  /** Test key id, `rzp_test_…`. */
  testKeyId?: string | null;
  testKeyIdSource: PaymentConfigSource;
  testKeySecretSource: PaymentConfigSource;
  testWebhookSecretSource: PaymentConfigSource;
  verifyAmountViaApi: boolean;
}

export interface PayUConfigDto {
  active: boolean;
  enabled: boolean;
  merchantKey?: string | null;
  merchantKeySource: PaymentConfigSource;
  merchantSaltSource: PaymentConfigSource;
  testMode: boolean;
}

export interface PaymentGatewayConfigDto {
  razorpay: RazorpayConfigDto;
  payU: PayUConfigDto;
  razorpayWebhookUrl?: string | null;
  payUReturnUrl?: string | null;
}

export interface UpdateRazorpayConfigInput {
  active: boolean;
  /** Use the test pair instead of the live one. */
  testMode: boolean;
  /** Live key id. Empty: use the server configuration's, if any. */
  keyId?: string | null;
  /** Empty keeps the stored secret. */
  keySecret?: string | null;
  clearKeySecret?: boolean;
  webhookSecret?: string | null;
  clearWebhookSecret?: boolean;
  /** Test key id. Empty: use the server configuration's, if any. */
  testKeyId?: string | null;
  testKeySecret?: string | null;
  clearTestKeySecret?: boolean;
  testWebhookSecret?: string | null;
  clearTestWebhookSecret?: boolean;
  verifyAmountViaApi: boolean;
}

export interface UpdatePayUConfigInput {
  active: boolean;
  merchantKey?: string | null;
  merchantSalt?: string | null;
  clearMerchantSalt?: boolean;
  testMode: boolean;
}

export interface PaymentGatewayTestResultDto {
  ok: boolean;
  message: string;
}

/** The platform's own Razorpay and PayU accounts, for the platform administrator. Secrets are write-only. */
@Injectable({ providedIn: 'root' })
export class PaymentGatewayConfigService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  get = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, PaymentGatewayConfigDto>(
      { method: 'GET', url: '/api/auto-reach/payment-gateway-config' },
      { apiName: this.apiName, ...config },
    );

  updateRazorpay = (input: UpdateRazorpayConfigInput, config?: Partial<Rest.Config>) =>
    this.restService.request<UpdateRazorpayConfigInput, PaymentGatewayConfigDto>(
      { method: 'PUT', url: '/api/auto-reach/payment-gateway-config/razorpay', body: input },
      { apiName: this.apiName, ...config },
    );

  updatePayU = (input: UpdatePayUConfigInput, config?: Partial<Rest.Config>) =>
    this.restService.request<UpdatePayUConfigInput, PaymentGatewayConfigDto>(
      { method: 'PUT', url: '/api/auto-reach/payment-gateway-config/pay-u', body: input },
      { apiName: this.apiName, ...config },
    );

  testRazorpay = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, PaymentGatewayTestResultDto>(
      { method: 'POST', url: '/api/auto-reach/payment-gateway-config/test-razorpay' },
      { apiName: this.apiName, ...config },
    );

  testPayU = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, PaymentGatewayTestResultDto>(
      { method: 'POST', url: '/api/auto-reach/payment-gateway-config/test-pay-u' },
      { apiName: this.apiName, ...config },
    );
}
