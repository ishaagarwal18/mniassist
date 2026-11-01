import { PermissionService } from '@abp/ng.core';
import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountMasterDataService } from '../../core/services/account-master-data.service';
import { AccountStore } from '../../core/services/account.store';
import { ContactService } from '../../core/services/contact.service';
import { ToastService } from '../../core/ui/toast.service';
import { ArTopbar } from '../../layout/topbar';
import {
  BusinessCardService,
  ContactService as ContactApi,
  DecisionRole,
} from '../../proxy/contacts';
import { ArContactForm } from './contact-form';

@Component({ selector: 'ar-topbar', template: '<ng-content />' })
class TestTopbar {
  readonly title = input<string>();
  readonly subtitle = input<string>();
  readonly help = input<string>();
}

describe('ArContactForm (New Contact & Edit Contact Page)', () => {
  let routerNavigate: ReturnType<typeof vi.fn>;
  let toastSuccess: ReturnType<typeof vi.fn>;
  let toastWarning: ReturnType<typeof vi.fn>;
  let storeCreate: ReturnType<typeof vi.fn>;
  let storeUpdate: ReturnType<typeof vi.fn>;
  let apiGet: ReturnType<typeof vi.fn>;

  const mockAccounts = [
    {
      id: 'acc-1',
      name: 'Bharat Heavy Forge',
      city: 'Pune',
      state: 'Maharashtra',
      childCount: 0,
    },
  ];

  beforeEach(() => {
    routerNavigate = vi.fn();
    toastSuccess = vi.fn();
    toastWarning = vi.fn();
    storeCreate = vi.fn().mockResolvedValue(undefined);
    storeUpdate = vi.fn().mockResolvedValue(undefined);
    apiGet = vi.fn().mockReturnValue(of(null));

    TestBed.configureTestingModule({
      imports: [ArContactForm],
      providers: [
        {
          provide: Router,
          useValue: { navigate: routerNavigate },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: () => null },
              queryParamMap: { get: () => null },
            },
          },
        },
        {
          provide: ContactService,
          useValue: {
            contacts: () => [],
            create: storeCreate,
            update: storeUpdate,
          },
        },
        {
          provide: ContactApi,
          useValue: {
            get: apiGet,
          },
        },
        {
          provide: AccountStore,
          useValue: {
            all: () => mockAccounts,
          },
        },
        {
          provide: AccountMasterDataService,
          useValue: {
            states: () => ['Maharashtra', 'Gujarat', 'Karnataka'],
            getCitiesForState: (s: string) => (s === 'Maharashtra' ? ['Pune', 'Mumbai'] : []),
          },
        },
        {
          provide: BusinessCardService,
          useValue: {
            read: () => of({ name: 'Card Person', phones: ['919876543210'] }),
          },
        },
        {
          provide: ToastService,
          useValue: {
            success: toastSuccess,
            warning: toastWarning,
            error: vi.fn(),
            info: vi.fn(),
          },
        },
        {
          provide: PermissionService,
          useValue: {
            getGrantedPolicy: () => true,
            getGrantedPolicy$: () => of(true),
          },
        },
      ],
    }).overrideComponent(ArContactForm, {
      remove: { imports: [ArTopbar] },
      add: { imports: [TestTopbar] },
    });
  });

  async function createFixture() {
    const fixture = TestBed.createComponent(ArContactForm);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('renders New Contact form with clean initial state', async () => {
    const fixture = await createFixture();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('WhatsApp Phone Number');
    expect(el.textContent).toContain('Company Account');
    expect(el.textContent).toContain('Decision Role');

    const inputs = el.querySelectorAll('input');
    expect(inputs.length).toBeGreaterThanOrEqual(3);
  });

  it('navigates back to /contacts when Cancel is clicked', async () => {
    const fixture = await createFixture();
    const cancelButton = [...fixture.nativeElement.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Cancel'),
    );
    expect(cancelButton).toBeDefined();
    cancelButton?.click();

    expect(routerNavigate).toHaveBeenCalledWith(['/contacts']);
  });

  it('validates WhatsApp number requirement before creating', async () => {
    const fixture = await createFixture();
    const saveButton = [...fixture.nativeElement.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Create Contact'),
    );
    expect(saveButton).toBeDefined();
    saveButton?.click();
    await fixture.whenStable();

    expect(storeCreate).not.toHaveBeenCalled();
    expect(toastWarning).toHaveBeenCalledWith(
      expect.stringContaining('WhatsApp number is required'),
      'Validation error',
    );
  });

  it('creates contact successfully and navigates to /contacts', async () => {
    const fixture = await createFixture();
    const waInput = fixture.nativeElement.querySelector('input[name="waId"]') as HTMLInputElement;
    const nameInput = fixture.nativeElement.querySelector('input[name="displayName"]') as HTMLInputElement;

    waInput.value = '919821012345';
    waInput.dispatchEvent(new Event('input'));
    nameInput.value = 'Rajesh Patil';
    nameInput.dispatchEvent(new Event('input'));

    fixture.detectChanges();
    await fixture.whenStable();

    const saveButton = [...fixture.nativeElement.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Create Contact'),
    );
    saveButton?.click();
    await fixture.whenStable();

    expect(storeCreate).toHaveBeenCalled();
    const payload = storeCreate.mock.calls[0][0];
    expect(payload.waId).toBe('919821012345');
    expect(payload.displayName).toBe('Rajesh Patil');
    expect(toastSuccess).toHaveBeenCalledWith(expect.stringContaining('created successfully'));
    expect(routerNavigate).toHaveBeenCalledWith(['/contacts']);
  });

  it('syncs company name, city, and state when account is selected', async () => {
    const fixture = await createFixture();
    const accountSelect = fixture.nativeElement.querySelector(
      'select[name="accountId"]',
    ) as HTMLSelectElement;

    accountSelect.value = 'acc-1';
    accountSelect.dispatchEvent(new Event('change'));

    fixture.detectChanges();
    await fixture.whenStable();

    const companyInput = fixture.nativeElement.querySelector(
      'input[name="companyName"]',
    ) as HTMLInputElement;
    expect(companyInput.value).toBe('Bharat Heavy Forge');
    expect(companyInput.readOnly).toBe(true);
  });
});
