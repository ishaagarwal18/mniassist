import { PermissionService } from '@abp/ng.core';
import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PipelineStore } from '../../core/services/pipeline.service';
import { ToastService } from '../../core/ui/toast.service';
import { ArTopbar } from '../../layout/topbar';
import { ContactService as ContactApi } from '../../proxy/contacts/contact.service';
import { LeadSource } from '../../proxy/pipeline';
import { ArEnquiryForm } from './enquiry-form';

@Component({ selector: 'ar-topbar', template: '<ng-content />' })
class TestTopbar {
  readonly title = input<string>();
  readonly subtitle = input<string>();
  readonly help = input<string>();
}

describe('ArEnquiryForm (New Enquiry Page)', () => {
  let routerNavigate: ReturnType<typeof vi.fn>;
  let toastSuccess: ReturnType<typeof vi.fn>;
  let toastWarning: ReturnType<typeof vi.fn>;
  let storeCreateEnquiry: ReturnType<typeof vi.fn>;

  const mockPipelines = [
    { id: 'pipe-1', name: 'Industrial Direct Sales' },
    { id: 'pipe-2', name: 'Dealer Network Pipeline' },
  ];

  beforeEach(() => {
    routerNavigate = vi.fn();
    toastSuccess = vi.fn();
    toastWarning = vi.fn();
    storeCreateEnquiry = vi.fn().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      imports: [ArEnquiryForm],
      providers: [
        {
          provide: Router,
          useValue: { navigate: routerNavigate },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: { get: () => null },
            },
          },
        },
        {
          provide: PipelineStore,
          useValue: {
            pipelines: () => mockPipelines,
            currentPipeline: () => mockPipelines[0],
            pipelineId: () => 'pipe-1',
            createEnquiry: storeCreateEnquiry,
            searchContacts: () => Promise.resolve([]),
          },
        },
        {
          provide: ContactApi,
          useValue: {
            getList: () => of({ items: [] }),
            create: () => of({ id: 'c-new', displayName: 'New Contact' }),
          },
        },
        {
          provide: ToastService,
          useValue: {
            success: toastSuccess,
            warning: toastWarning,
            error: vi.fn(),
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
    }).overrideComponent(ArEnquiryForm, {
      remove: { imports: [ArTopbar] },
      add: { imports: [TestTopbar] },
    });
  });

  async function createFixture() {
    const fixture = TestBed.createComponent(ArEnquiryForm);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('renders New Enquiry page with pipelines and form controls', async () => {
    const fixture = await createFixture();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Customer Contact & Sales Pipeline');
    expect(el.textContent).toContain('Requirement & Commercial Scope');

    const pipeSelect = el.querySelector('select[name="pipelineId"]') as HTMLSelectElement;
    expect(pipeSelect).toBeDefined();
    expect(pipeSelect.options.length).toBe(2);
  });

  it('navigates back to /enquiries on cancel', async () => {
    const fixture = await createFixture();
    const cancelButton = [...fixture.nativeElement.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Cancel'),
    );
    cancelButton?.click();

    expect(routerNavigate).toHaveBeenCalledWith(['/enquiries']);
  });

  it('validates contact and title before creating enquiry', async () => {
    const fixture = await createFixture();
    const submitButton = [...fixture.nativeElement.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Create Enquiry'),
    );
    submitButton?.click();
    await fixture.whenStable();

    expect(storeCreateEnquiry).not.toHaveBeenCalled();
    expect(toastWarning).toHaveBeenCalledWith('Pick the contact this enquiry is for.', 'Enquiry');
  });

  it('creates enquiry successfully and navigates to /enquiries', async () => {
    const fixture = await createFixture();
    const component = fixture.componentInstance;

    // Simulate contact picked
    component['onContactPicked']({ id: 'c-100', label: 'Anil Deshmukh · Tata Steel' });

    // Set title and value
    const titleInput = fixture.nativeElement.querySelector(
      'input[name="title"]',
    ) as HTMLInputElement;
    titleInput.value = '500 kW Furnace Automation Panel';
    titleInput.dispatchEvent(new Event('input'));

    const valueInput = fixture.nativeElement.querySelector(
      'input[name="valueRupees"]',
    ) as HTMLInputElement;
    valueInput.value = '15,00,000';
    valueInput.dispatchEvent(new Event('input'));

    fixture.detectChanges();
    await fixture.whenStable();

    const submitButton = [...fixture.nativeElement.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Create Enquiry'),
    );
    submitButton?.click();
    await fixture.whenStable();

    expect(storeCreateEnquiry).toHaveBeenCalledWith({
      contactId: 'c-100',
      pipelineId: 'pipe-1',
      source: LeadSource.Manual,
      title: '500 kW Furnace Automation Panel',
      requirement: undefined,
      estimatedValueInPaise: 150000000,
    });
    expect(toastSuccess).toHaveBeenCalledWith(expect.stringContaining('created successfully'));
    expect(routerNavigate).toHaveBeenCalledWith(['/enquiries']);
  });
});
