import { PermissionService } from '@abp/ng.core';
import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CampaignStore } from '../../core/services/campaign.service';
import { ChannelService } from '../../core/services/channel.service';
import { ToastService } from '../../core/ui/toast.service';
import { ArTopbar } from '../../layout/topbar';
import { TemplateService as TemplateApi } from '../../proxy/messaging/template.service';
import { ArCampaignForm } from './campaign-form';

@Component({ selector: 'ar-topbar', template: '<ng-content />' })
class TestTopbar {
  readonly title = input<string>();
  readonly subtitle = input<string>();
  readonly help = input<string>();
}

describe('ArCampaignForm (New Campaign Page)', () => {
  let routerNavigate: ReturnType<typeof vi.fn>;
  let toastSuccess: ReturnType<typeof vi.fn>;
  let toastWarning: ReturnType<typeof vi.fn>;
  let storeCreate: ReturnType<typeof vi.fn>;
  let templateApiGetList: ReturnType<typeof vi.fn>;

  const mockChannels = [
    { id: 'ch-1', displayName: 'Meridian WA', displayPhone: '+91 98210 11111' },
    { id: 'ch-2', displayName: 'Pune Plant WA', displayPhone: '+91 98220 22222' },
  ];

  const mockTemplates = [
    { id: 'tmpl-1', name: 'amc_renewal_v1', languageCode: 'en', category: 'Marketing' },
  ];

  beforeEach(() => {
    routerNavigate = vi.fn();
    toastSuccess = vi.fn();
    toastWarning = vi.fn();
    storeCreate = vi.fn().mockResolvedValue('c-101');
    templateApiGetList = vi.fn().mockReturnValue(of({ items: mockTemplates, totalCount: 1 }));

    TestBed.configureTestingModule({
      imports: [ArCampaignForm],
      providers: [
        {
          provide: Router,
          useValue: { navigate: routerNavigate },
        },
        {
          provide: CampaignStore,
          useValue: {
            create: storeCreate,
          },
        },
        {
          provide: ChannelService,
          useValue: {
            channels: () => mockChannels,
          },
        },
        {
          provide: TemplateApi,
          useValue: {
            getList: templateApiGetList,
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
    }).overrideComponent(ArCampaignForm, {
      remove: { imports: [ArTopbar] },
      add: { imports: [TestTopbar] },
    });
  });

  async function createFixture() {
    const fixture = TestBed.createComponent(ArCampaignForm);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('renders New Campaign page with channels and loaded templates', async () => {
    const fixture = await createFixture();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Campaign Identity & Channel');
    expect(el.textContent).toContain('Approved WhatsApp Message Template');

    const channelSelect = el.querySelector('select[name="channelId"]') as HTMLSelectElement;
    expect(channelSelect).toBeDefined();
    expect(channelSelect.options.length).toBe(2);

    expect(templateApiGetList).toHaveBeenCalledWith(expect.objectContaining({ channelId: 'ch-1' }));
  });

  it('navigates back to /campaigns on cancel', async () => {
    const fixture = await createFixture();
    const cancelButton = [...fixture.nativeElement.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Cancel'),
    );
    cancelButton?.click();

    expect(routerNavigate).toHaveBeenCalledWith(['/campaigns']);
  });

  it('validates campaign name before submitting', async () => {
    const fixture = await createFixture();
    const submitButton = [...fixture.nativeElement.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Create Draft'),
    );
    submitButton?.click();
    await fixture.whenStable();

    expect(storeCreate).not.toHaveBeenCalled();
    expect(toastWarning).toHaveBeenCalledWith('Give the campaign a name.', 'Campaign');
  });

  it('creates draft campaign and navigates to builder cockpit with open query param', async () => {
    const fixture = await createFixture();
    const nameInput = fixture.nativeElement.querySelector('input[name="name"]') as HTMLInputElement;

    nameInput.value = 'Q4 Special Retrofit Discount';
    nameInput.dispatchEvent(new Event('input'));

    fixture.detectChanges();
    await fixture.whenStable();

    const submitButton = [...fixture.nativeElement.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Create Draft'),
    );
    submitButton?.click();
    await fixture.whenStable();

    expect(storeCreate).toHaveBeenCalledWith('Q4 Special Retrofit Discount', 'ch-1', 'tmpl-1');
    expect(toastSuccess).toHaveBeenCalledWith(expect.stringContaining('created as draft'));
    expect(routerNavigate).toHaveBeenCalledWith(['/campaigns'], {
      queryParams: { open: 'c-101' },
    });
  });
});
