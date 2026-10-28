import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArTopbar } from '../../layout/topbar';
import { PlatformAdminService } from '../../proxy/administration';
import { ArPhoneNumbers, PhoneNumberPurchaseService } from './phone-numbers';

@Component({ selector: 'ar-topbar', template: '' })
class TestTopbar {
  readonly title = input<string>();
  readonly help = input<string>();
}

describe('Phone numbers', () => {
  const api = { search: vi.fn(), purchase: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    api.search.mockReturnValue(
      of([
        {
          phoneNumber: '+918069991111',
          region: 'KA',
          numberType: 'Landline',
          rentalPrice: '499.000000',
        },
      ]),
    );
    api.purchase.mockReturnValue(
      of({
        lineNumberId: 'n1',
        phoneNumber: '+918069991111',
        exotelSid: 's1',
        rentalPrice: '499.000000',
        currency: 'INR',
      }),
    );
    TestBed.configureTestingModule({
      imports: [ArPhoneNumbers],
      providers: [
        { provide: PhoneNumberPurchaseService, useValue: api },
        {
          provide: PlatformAdminService,
          useValue: {
            getTenants: () => of({ items: [{ id: 't1', name: 'Meridian' }], totalCount: 1 }),
          },
        },
      ],
    }).overrideComponent(ArPhoneNumbers, {
      remove: { imports: [ArTopbar] },
      add: { imports: [TestTopbar] },
    });
  });
  afterEach(() => TestBed.resetTestingModule());

  const button = (root: HTMLElement, text: string) =>
    [...root.querySelectorAll('button')].find((b) => b.textContent?.includes(text))!;

  it('rents a number only after it is typed again, on the chosen workspace', async () => {
    const fixture = TestBed.createComponent(ArPhoneNumbers);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const workspace = root.querySelector('select') as HTMLSelectElement;
    workspace.value = 't1';
    workspace.dispatchEvent(new Event('change'));
    button(root, 'Search').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.search).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 't1', numberType: 'Landline' }),
    );
    expect(root.textContent).toContain('499.000000');

    button(root, 'Rent…').click();
    fixture.detectChanges();
    expect(button(root, 'Rent this number').disabled).toBe(true); // nothing to confirm with yet
    const again = [...root.querySelectorAll<HTMLLabelElement>('label')]
      .find((l) => l.textContent?.includes('Type the number again'))!
      .querySelector('input') as HTMLInputElement;
    again.value = '08069991111';
    again.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    button(root, 'Rent this number').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.purchase).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 't1',
        phoneNumber: '+918069991111',
        confirmPhoneNumber: '08069991111',
        route: 'menu',
      }),
    );
    expect(root.textContent).toContain('Rented');
  });
});
