import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { PermissionService } from '@abp/ng.core';
import { BehaviorSubject, of } from 'rxjs';
import { AgencyService } from '../../proxy/agencies';
import { NotificationService } from '../../proxy/notifications';
import { InvoiceService, ReconciliationService } from '../../proxy/billing';
import { WebhookSubscriptionService } from '../../proxy/integrations';
import { SupportAccessService } from '../../proxy/platform';
import { CallService } from '../../proxy/voice';
import { AgencyActingStore } from './agency-acting.store';
import { OpsService } from './ops.service';
import { SoftphoneService } from './softphone.service';
import { PlanService } from './plan.service';

describe('app shell optional feature access', () => {
  let granted: BehaviorSubject<boolean>;
  let getWebhooks: ReturnType<typeof vi.fn>;
  let getActingSession: ReturnType<typeof vi.fn>;
  let getCredentials: ReturnType<typeof vi.fn>;
  let voice: boolean;

  beforeEach(() => {
    granted = new BehaviorSubject(false);
    voice = false;
    getWebhooks = vi.fn(() => of({ items: [] }));
    getActingSession = vi.fn(() => of(null));
    getCredentials = vi.fn(() => of({ ready: false }));
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Router,
          useValue: { url: '/settings/integrations', events: new BehaviorSubject(null) },
        },
        {
          provide: PermissionService,
          useValue: {
            getGrantedPolicy: () => granted.value,
            getGrantedPolicy$: () => granted.asObservable(),
          },
        },
        { provide: AgencyService, useValue: { getMyActingSession: getActingSession } },
        { provide: WebhookSubscriptionService, useValue: { getList: getWebhooks } },
        { provide: NotificationService, useValue: { getList: () => of({ items: [] }) } },
        { provide: InvoiceService, useValue: { getList: () => of({ items: [] }) } },
        { provide: ReconciliationService, useValue: { getList: () => of({ items: [] }) } },
        {
          provide: SupportAccessService,
          useValue: { getMyGrants: () => of([]), getSessionHistory: () => of({ items: [] }) },
        },
        { provide: CallService, useValue: { getSoftphoneCredentials: getCredentials } },
        { provide: PlanService, useValue: { hasFeature: () => voice } },
      ],
    });
  });

  it('does not request Agency or webhooks without their permissions', async () => {
    await TestBed.inject(AgencyActingStore).refresh();
    const ops = TestBed.inject(OpsService);
    TestBed.tick();
    expect(getActingSession).not.toHaveBeenCalled();
    expect(getWebhooks).not.toHaveBeenCalled();
    expect(ops.webhooks()).toEqual([]);
  });

  it('does not load invoices from home, and loads them when the invoice page opens', async () => {
    const router = TestBed.inject(Router);
    (router as { url: string }).url = '/home';
    const invoices = vi.spyOn(TestBed.inject(InvoiceService), 'getList');
    const reconciliation = vi.spyOn(TestBed.inject(ReconciliationService), 'getList');
    TestBed.inject(OpsService);
    TestBed.tick();
    expect(invoices).not.toHaveBeenCalled();
    expect(reconciliation).not.toHaveBeenCalled();
    (router.events as BehaviorSubject<unknown>).next(
      new NavigationEnd(1, '/billing/invoices', '/billing/invoices'),
    );
    TestBed.tick();
    await vi.waitFor(() => expect(invoices).toHaveBeenCalledTimes(1));
    expect(reconciliation).toHaveBeenCalledTimes(1);
  });

  it('loads optional features when granted and reacts to permission changes', async () => {
    TestBed.inject(OpsService);
    TestBed.tick();
    granted.next(true);
    TestBed.tick();
    await vi.waitFor(() => expect(getWebhooks).toHaveBeenCalledTimes(1));
    await TestBed.inject(AgencyActingStore).refresh();
    expect(getActingSession).toHaveBeenCalledTimes(1);
    granted.next(false);
    TestBed.tick();
    expect(TestBed.inject(OpsService).webhooks()).toEqual([]);
  });

  it('requires both Voice entitlement and reply permission before fetching SIP credentials', async () => {
    const phone = TestBed.inject(SoftphoneService);
    granted.next(true);
    expect(await phone.ensureConnected()).toBe(false);
    expect(getCredentials).not.toHaveBeenCalled();
    voice = true;
    granted.next(false);
    expect(await phone.ensureConnected()).toBe(false);
    expect(getCredentials).not.toHaveBeenCalled();
    granted.next(true);
    expect(await phone.ensureConnected()).toBe(false); // Available, but not configured yet.
    expect(getCredentials).toHaveBeenCalledTimes(1);
  });
});
