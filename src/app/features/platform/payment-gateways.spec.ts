import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ArTopbar } from '../../layout/topbar';
import {
  PaymentGatewayConfigDto,
  PaymentGatewayConfigService,
} from '../../proxy/billing/payment-gateway-config.service';
import { BillDeskEnvironment, PaymentService } from '../../proxy/payments/payment.service';
import { ArPaymentGateways } from './payment-gateways';

@Component({ selector: 'ar-topbar', template: '<ng-content />' })
class TestTopbar {
  readonly title = input<string>();
  readonly help = input<string>();
}

const config: PaymentGatewayConfigDto = {
  razorpay: {
    active: true,
    enabled: true,
    keyId: 'rzp_test_abc123',
    keyIdSource: 'saved',
    testMode: true,
    keySecretSource: 'saved',
    webhookSecretSource: 'none',
    verifyAmountViaApi: true,
  },
  payU: {
    active: true,
    enabled: false,
    merchantKey: 'cfgKey',
    merchantKeySource: 'config',
    merchantSaltSource: 'none',
    testMode: false,
  },
  razorpayWebhookUrl: 'https://api.example.test/api/payments/razorpay/webhook',
  payUReturnUrl: 'https://api.example.test/api/payments/payu/return',
};

describe('Payment gateways', () => {
  const api = {
    get: vi.fn(),
    updateRazorpay: vi.fn(),
    updatePayU: vi.fn(),
    testRazorpay: vi.fn(),
    testPayU: vi.fn(),
  };
  const dialogs = { confirm: vi.fn() };

  beforeEach(() => {
    vi.resetAllMocks();
    api.get.mockReturnValue(of(config));
    api.updateRazorpay.mockReturnValue(of(config));
    api.updatePayU.mockReturnValue(of(config));
    TestBed.configureTestingModule({
      imports: [ArPaymentGateways],
      providers: [
        { provide: PaymentGatewayConfigService, useValue: api },
        { provide: ConfirmService, useValue: dialogs },
        {
          provide: PaymentService,
          useValue: {
            getGateway: () =>
              of({
                merchantId: '',
                clientId: '',
                hasSecret: false,
                environment: BillDeskEnvironment.Uat,
                enabled: false,
                webhookUrl: '',
              }),
            getList: () => of({ totalCount: 0, items: [] }),
            setGateway: vi.fn(),
            cancel: vi.fn(),
          },
        },
      ],
    }).overrideComponent(ArPaymentGateways, {
      remove: { imports: [ArTopbar] },
      add: { imports: [TestTopbar] },
    });
  });
  afterEach(() => TestBed.resetTestingModule());

  async function create() {
    const fixture = TestBed.createComponent(ArPaymentGateways);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    await fixture.whenStable();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }

  const button = (root: HTMLElement, text: string) =>
    [...root.querySelectorAll('button')].find((b) => b.textContent?.includes(text))!;

  it('shows each gateway’s state and where its values come from, with secrets left empty', async () => {
    const { root } = await create();
    expect(root.textContent).toContain('Offered at checkout');
    expect(root.textContent).toContain('Test keys');
    expect(root.textContent).toContain('Keys missing');
    expect(root.textContent).toContain('In use from the server configuration: cfgKey');
    expect(root.textContent).toContain('/api/payments/razorpay/webhook');
    const keyId = root.querySelector<HTMLInputElement>('input[name="rzpKeyId"]')!;
    expect(keyId.value).toBe('rzp_test_abc123');
    const secret = root.querySelector<HTMLInputElement>('input[name="rzpKeySecret"]')!;
    expect(secret.value).toBe('');
    expect(secret.placeholder).toContain('Saved');
    // A key from the server configuration is not copied into the field, so saving does not pin it.
    expect(root.querySelector<HTMLInputElement>('input[name="payuKey"]')!.value).toBe('');
  });

  it('saves Razorpay, sending a secret only when one was typed', async () => {
    const { fixture, root } = await create();
    const hook = root.querySelector<HTMLInputElement>('input[name="rzpWebhookSecret"]')!;
    hook.value = ' whsec ';
    hook.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    button(root, 'Save Razorpay').click();
    await fixture.whenStable();
    expect(api.updateRazorpay).toHaveBeenCalledWith({
      active: true,
      keyId: 'rzp_test_abc123',
      keySecret: null,
      webhookSecret: 'whsec',
      verifyAmountViaApi: true,
    });
  });

  it('refuses a key id that is not a Razorpay key before sending anything', async () => {
    const { fixture, root } = await create();
    const keyId = root.querySelector<HTMLInputElement>('input[name="rzpKeyId"]')!;
    keyId.value = 'sk_live_123';
    keyId.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    button(root, 'Save Razorpay').click();
    await fixture.whenStable();
    expect(api.updateRazorpay).not.toHaveBeenCalled();
  });

  it('removes a saved secret only after confirmation, keeping the other values', async () => {
    const { fixture, root } = await create();
    dialogs.confirm.mockResolvedValueOnce(false);
    button(root, 'Remove saved key secret').click();
    await fixture.whenStable();
    expect(api.updateRazorpay).not.toHaveBeenCalled();

    dialogs.confirm.mockResolvedValueOnce(true);
    button(root, 'Remove saved key secret').click();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    expect(api.updateRazorpay).toHaveBeenCalledWith({
      active: true,
      keyId: 'rzp_test_abc123',
      verifyAmountViaApi: true,
      clearKeySecret: true,
      clearWebhookSecret: false,
    });
  });

  it('shows what the key test found', async () => {
    api.testPayU.mockReturnValue(
      of({ ok: false, message: 'PayU refused the merchant key or salt: Invalid Hash.' }),
    );
    const { fixture, root } = await create();
    [...root.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Test PayU keys'))!
      .click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.testPayU).toHaveBeenCalled();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Invalid Hash.');
  });
});
