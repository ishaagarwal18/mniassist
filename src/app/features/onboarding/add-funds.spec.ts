import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PermissionService } from '@abp/ng.core';
import { of } from 'rxjs';

import { PlatformCheckoutRunner } from '../../core/services/platform-checkout';
import { ToastService } from '../../core/ui/toast.service';
import { WalletService } from '../../proxy/billing';
import { PlatformCheckoutService } from '../../proxy/billing/platform-checkout.service';
import { ArOnboardingAddFunds, topUpProblem } from './add-funds';

describe('Get started add funds: amounts', () => {
  it('takes whole rupees from ₹100 to ₹10 lakh', () => {
    expect(topUpProblem(5000)).toBeNull();
    expect(topUpProblem(99)).toMatch(/at least/);
    expect(topUpProblem(2_000_000)).toMatch(/at most/);
    expect(topUpProblem(150.5)).toMatch(/whole number/);
    expect(topUpProblem(Number.NaN)).toMatch(/at least/);
  });
});

describe('Get started add funds: paying', () => {
  let startTopUp: ReturnType<typeof vi.fn>;
  let pay: ReturnType<typeof vi.fn>;
  let toasts: Record<string, ReturnType<typeof vi.fn>>;

  function setup(gateways: { name: string; label: string }[], granted = true) {
    startTopUp = vi.fn(() => of({ checkoutId: 'c-1' }));
    pay = vi.fn(async () => 'paid');
    toasts = { success: vi.fn(), error: vi.fn(), warning: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: WalletService,
          useValue: {
            get: () => of({ balanceInPaise: 25_000, estimatedDaysRemaining: 3 }),
          },
        },
        { provide: PlatformCheckoutService, useValue: { startTopUp } },
        { provide: PlatformCheckoutRunner, useValue: { gateways: async () => gateways, pay } },
        { provide: PermissionService, useValue: { getGrantedPolicy: () => granted } },
        { provide: ToastService, useValue: toasts },
      ],
    });
    const fixture = TestBed.createComponent(ArOnboardingAddFunds);
    fixture.detectChanges();
    return fixture;
  }

  it('pays the chosen amount through the gateway and reports the wallet funded', async () => {
    const fixture = setup([{ name: 'Razorpay', label: 'Razorpay' }]);
    const comp = fixture.componentInstance as any;
    const funded = vi.fn();
    comp.funded.subscribe(funded);
    await vi.waitFor(() => expect(comp.gatewaysLoaded()).toBe(true));

    comp.amount.set(10_000);
    await comp.pay();

    expect(startTopUp).toHaveBeenCalledWith({ gateway: 'Razorpay', amountInPaise: 1_000_000 });
    expect(pay).toHaveBeenCalled();
    expect(funded).toHaveBeenCalled();
    expect(toasts['success']).toHaveBeenCalled();
  });

  it('does not report funded when the payment is dismissed', async () => {
    const fixture = setup([{ name: 'Razorpay', label: 'Razorpay' }]);
    const comp = fixture.componentInstance as any;
    const funded = vi.fn();
    comp.funded.subscribe(funded);
    await vi.waitFor(() => expect(comp.gatewaysLoaded()).toBe(true));
    pay.mockResolvedValueOnce('dismissed');

    await comp.pay();

    expect(funded).not.toHaveBeenCalled();
  });

  it('without a gateway, never credits the wallet and says online payment is not set up', async () => {
    const fixture = setup([]);
    const comp = fixture.componentInstance as any;
    await vi.waitFor(() => expect(comp.gatewaysLoaded()).toBe(true));
    fixture.detectChanges();

    await comp.pay();
    expect(startTopUp).not.toHaveBeenCalled();
    expect(pay).not.toHaveBeenCalled();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Online payment is not set up yet');
    expect(el.querySelector('input[placeholder*="UTR"]')).toBeNull();
  });

  it('tells someone without the top-up permission who can add funds', () => {
    const fixture = setup([], false);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Ask your workspace owner');
    expect(el.querySelector('.af__form')).toBeNull();
  });
});
