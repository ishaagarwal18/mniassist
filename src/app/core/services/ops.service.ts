import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { NotificationService as NotificationApi } from '../../proxy/notifications';
import { InvoiceService as InvoiceApi, ReconciliationService as ReconciliationApi } from '../../proxy/billing';
import { WebhookSubscriptionService as WebhookApi } from '../../proxy/integrations';
import { SupportAccessService as SupportApi } from '../../proxy/platform';
import {
  Invoice,
  OpsNotification,
  ReconciliationRun,
  SupportGrant,
  SupportSession,
  WebhookDelivery,
  WebhookSubscription,
} from '../models/ops.model';
import {
  toInvoice,
  toNotification,
  toReconciliationRun,
  toSupportGrant,
  toSupportSession,
  toWebhookSubscription,
} from '../api/ops-mapping';

/**
 * Store for the operational screens: notifications, invoicing, reconciliation,
 * outbound webhooks and support access.
 *
 * One service rather than five because these screens share a shape — a list, a
 * detail, and one or two state-changing actions — and five near-identical services
 * would be five places to keep the mock/API switch consistent. The seeds below are
 * chosen to show the states that are hard to get right, not the happy path: a
 * reconciliation run that is out of tolerance, a webhook that disabled itself, a
 * support grant that is read-only and about to expire.
 */
@Injectable({ providedIn: 'root' })
export class OpsService {
  private readonly notificationApi = inject(NotificationApi);
  private readonly invoiceApi = inject(InvoiceApi);
  private readonly reconciliationApi = inject(ReconciliationApi);
  private readonly webhookApi = inject(WebhookApi);
  private readonly supportApi = inject(SupportApi);

  // ---- seeds ---------------------------------------------------------------

  /**
   * Seed timestamps are relative to now, never absolute.
   *
   * An absolute date in a seed is correct for exactly as long as nobody looks at it
   * again: a grant hard-coded to expire on 26 August still says "Active" in
   * September while its own expiry reads "expired", and the demo contradicts itself
   * in front of whoever is being shown it.
   */
  private static hoursAgo(h: number): string {
    return new Date(Date.now() - h * 3_600_000).toISOString();
  }

  private static hoursAhead(h: number): string {
    return new Date(Date.now() + h * 3_600_000).toISOString();
  }

  private static daysAgo(d: number): string {
    return OpsService.hoursAgo(d * 24);
  }

  private readonly notificationSeed: readonly OpsNotification[] = [
    {
      id: 'n-1',
      kind: 'QualityDowngrade',
      tone: 'critical',
      title: 'Quality on +91 90210 44xxx is Red — 2 campaigns suspended',
      body: 'Meta has rated this number’s quality as Red. Marketing campaigns have been stopped '
        + 'automatically to protect the number from being restricted. Reminders and replies are unaffected.',
      occurredAt: OpsService.hoursAgo(3),
      read: false,
      route: '/campaigns',
      emailState: 'sent',
    },
    {
      id: 'n-2',
      kind: 'TemplateCategoryChanged',
      tone: 'warning',
      title: 'Template ‘amc_renewal_30d’ re-categorised to Marketing',
      body: 'Meta changed this template’s category. It will now be billed at the marketing rate, '
        + 'and may only be sent to contacts with marketing consent.',
      occurredAt: OpsService.hoursAgo(5),
      read: false,
      route: '/templates',
      emailState: 'sent',
    },
    {
      id: 'n-3',
      kind: 'ReconciliationVariance',
      tone: 'warning',
      title: 'Billing variance of 1.84% on +91 90210 44xxx',
      body: 'Our meter recorded ₹1,204.60 more than Meta billed for 01 Jul – 31 Jul 2026. '
        + 'Marketing is the category that is out.',
      occurredAt: OpsService.hoursAgo(16),
      read: false,
      route: '/billing/reconciliation',
      emailState: 'sent',
    },
    {
      id: 'n-4',
      kind: 'AccessTokenExpiring',
      tone: 'critical',
      title: 'Your WhatsApp connection expires in 6 days',
      body: 'Reconnect the channel in Settings → Channels. Once it expires, nothing can be sent '
        + 'or received on that number until it is reconnected.',
      occurredAt: OpsService.daysAgo(1),
      read: true,
      route: '/channels',
      emailState: 'sent',
    },
    {
      id: 'n-5',
      kind: 'LowWalletBalance',
      tone: 'warning',
      title: 'Message balance is low: ₹3,410.00',
      body: 'Top up before your next campaign so it is not held at the pre-flight check.',
      occurredAt: OpsService.daysAgo(2),
      read: true,
      route: '/billing',
      emailState: 'failed',
    },
    {
      id: 'n-6',
      kind: 'SupportAccessStarted',
      tone: 'info',
      title: 'AutoReach support has entered your account',
      body: 'p.deshmukh started a read-only support session under the access you granted: '
        + '“Investigating stuck campaign #4180”.',
      occurredAt: OpsService.daysAgo(3),
      read: true,
      route: '/settings/support-access',
      emailState: 'sent',
    },
    {
      id: 'n-7',
      kind: 'WebhookEndpointDisabled',
      tone: 'warning',
      title: 'A webhook endpoint was disabled',
      body: 'https://crm.vertexautomation.in/hooks/autoreach failed 20 times in a row and has been '
        + 'switched off. Fix the endpoint and re-enable it in Integrations.',
      occurredAt: OpsService.daysAgo(4),
      read: true,
      route: '/settings/integrations',
      emailState: 'sent',
    },
  ];

  private readonly invoiceSeed: readonly Invoice[] = [
    {
      id: 'inv-1',
      number: 'AR/2026-27/000114',
      state: 'issued',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      issuedAt: '2026-08-01',
      dueAt: '2026-08-08',
      customerName: 'Vertex Automation Pvt Ltd',
      customerGstin: '27AABCV1234M1ZP',
      placeOfSupply: '27',
      interState: false,
      taxableValueInPaise: 4_86_240_00,
      cgstInPaise: 43_761_60,
      sgstInPaise: 43_761_60,
      igstInPaise: 0,
      roundOffInPaise: -80,
      totalInPaise: 5_73_763_00,
      lines: [
        {
          description: 'AutoReach Growth plan — 01 Jul 2026 – 31 Jul 2026',
          sac: '998434',
          quantity: 1,
          taxableValueInPaise: 2_00_000_00,
          gstRateBasisPoints: 1800,
        },
        {
          description: 'Marketing conversations — 01 Jul 2026 – 31 Jul 2026',
          sac: '998434',
          quantity: 28_412,
          taxableValueInPaise: 2_45_240_00,
          gstRateBasisPoints: 1800,
        },
        {
          description: 'Utility conversations — 01 Jul 2026 – 31 Jul 2026',
          sac: '998434',
          quantity: 9_180,
          taxableValueInPaise: 41_000_00,
          gstRateBasisPoints: 1800,
        },
      ],
    },
    {
      id: 'inv-2',
      number: 'AR/2026-27/000098',
      state: 'paid',
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
      issuedAt: '2026-07-01',
      dueAt: '2026-07-08',
      customerName: 'Vertex Automation Pvt Ltd',
      customerGstin: '27AABCV1234M1ZP',
      placeOfSupply: '27',
      interState: false,
      taxableValueInPaise: 4_12_880_00,
      cgstInPaise: 37_159_20,
      sgstInPaise: 37_159_20,
      igstInPaise: 0,
      roundOffInPaise: 60,
      totalInPaise: 4_87_199_00,
      lines: [],
    },
    {
      id: 'inv-3',
      number: 'AR/2026-27/000121',
      state: 'draft',
      periodStart: '2026-08-01',
      periodEnd: '2026-08-31',
      customerName: 'Vertex Automation Pvt Ltd',
      customerGstin: '27AABCV1234M1ZP',
      placeOfSupply: '27',
      interState: false,
      taxableValueInPaise: 3_94_100_00,
      cgstInPaise: 35_469_00,
      sgstInPaise: 35_469_00,
      igstInPaise: 0,
      roundOffInPaise: 0,
      totalInPaise: 4_65_038_00,
      lines: [],
    },
  ];

  private readonly reconciliationSeed: readonly ReconciliationRun[] = [
    {
      id: 'rec-1',
      channelNumber: '+91 90210 44xxx',
      periodLabel: '01 Jul – 31 Jul 2026',
      ranAt: '2026-08-02',
      source: 'Meta statement export, 02 Aug',
      ourConversations: 37_592,
      metaConversations: 36_918,
      ourCostInPaise: 2_86_240_00,
      metaCostInPaise: 2_81_072_00,
      varianceBasisPoints: 184,
      withinTolerance: false,
      acknowledged: false,
      variances: [
        {
          category: 'Marketing',
          ourCount: 28_412,
          metaCount: 27_744,
          ourCostInPaise: 2_45_240_00,
          metaCostInPaise: 2_39_480_00,
          likelyCause:
            'We counted more than Meta billed. Most often a withheld message (131049) metered as '
            + 'billable, or a conversation we opened twice inside one 24-hour window.',
        },
        {
          category: 'Utility',
          ourCount: 9_180,
          metaCount: 9_174,
          ourCostInPaise: 41_000_00,
          metaCostInPaise: 41_592_00,
          likelyCause:
            'Meta billed more than we counted. Most often a template Meta re-categorised after we '
            + 'priced it.',
        },
      ],
    },
  ];

  private readonly webhookSeed: readonly WebhookSubscription[] = [
    {
      id: 'wh-1',
      url: 'https://crm.vertexautomation.in/hooks/autoreach',
      description: 'Zoho CRM lead sync',
      enabled: false,
      events: ['InboundMessage', 'EnquiryCreated', 'ContactOptedOut'],
      lastSuccessAt: OpsService.daysAgo(5),
      lastFailureAt: OpsService.daysAgo(4),
      consecutiveFailures: 20,
      lastError: 'Endpoint returned 502',
    },
    {
      id: 'wh-2',
      url: 'https://hooks.vertexautomation.in/quotations',
      description: 'Quotation status → Tally',
      enabled: true,
      events: ['QuotationStatusChanged'],
      lastSuccessAt: OpsService.hoursAgo(2),
      consecutiveFailures: 0,
    },
  ];

  private readonly deliverySeed: readonly WebhookDelivery[] = [
    { id: 'd-1', event: 'InboundMessage', state: 'abandoned', attempts: 6, createdAt: OpsService.daysAgo(4), statusCode: 502, error: 'Endpoint returned 502' },
    { id: 'd-2', event: 'EnquiryCreated', state: 'abandoned', attempts: 6, createdAt: OpsService.daysAgo(4), statusCode: 502, error: 'Endpoint returned 502' },
    { id: 'd-3', event: 'QuotationStatusChanged', state: 'delivered', attempts: 1, createdAt: OpsService.hoursAgo(2), statusCode: 200 },
    { id: 'd-4', event: 'QuotationStatusChanged', state: 'delivered', attempts: 2, createdAt: OpsService.hoursAgo(18), statusCode: 200 },
  ];

  private readonly grantSeed: readonly SupportGrant[] = [
    {
      id: 'g-1',
      reason: 'Investigating stuck campaign #4180',
      grantedBy: 'r.kulkarni',
      grantedTo: 'p.deshmukh',
      grantedAt: OpsService.daysAgo(3),
      expiresAt: OpsService.hoursAhead(21),
      allowsWrite: false,
      active: true,
      sessionCount: 2,
      ticketRef: 'SUP-2291',
    },
    {
      id: 'g-2',
      reason: 'Template rejection appeal',
      grantedBy: 'r.kulkarni',
      grantedAt: OpsService.daysAgo(49),
      expiresAt: OpsService.daysAgo(48),
      allowsWrite: true,
      revokedAt: OpsService.daysAgo(48),
      active: false,
      sessionCount: 1,
      ticketRef: 'SUP-2104',
    },
  ];

  private readonly sessionSeed: readonly SupportSession[] = [
    { id: 's-1', engineer: 'p.deshmukh', startedAt: OpsService.daysAgo(3), endedAt: OpsService.hoursAgo(71.4), writeEnabled: false, actionCount: 41, writeCount: 0 },
    { id: 's-2', engineer: 'p.deshmukh', startedAt: OpsService.daysAgo(2), endedAt: OpsService.hoursAgo(47.8), writeEnabled: false, actionCount: 12, writeCount: 0 },
    { id: 's-3', engineer: 'a.menon', startedAt: OpsService.daysAgo(49), endedAt: OpsService.hoursAgo(1174.5), writeEnabled: true, actionCount: 88, writeCount: 6 },
  ];

  // ---- resources -----------------------------------------------------------

  private readonly notificationsResource = rxResource({
    params: () => (environment.useMockData ? undefined : { unreadOnly: false }),
    stream: ({ params }) =>
      this.notificationApi
        .getList({ unreadOnly: params.unreadOnly, skipCount: 0, maxResultCount: 100 })
        .pipe(map(r => (r.items ?? []).map(toNotification))),
    defaultValue: [] as OpsNotification[],
  });

  private readonly invoicesResource = rxResource({
    params: () => (environment.useMockData ? undefined : {}),
    stream: () =>
      this.invoiceApi
        .getList({ skipCount: 0, maxResultCount: 50 })
        .pipe(map(r => (r.items ?? []).map(toInvoice))),
    defaultValue: [] as Invoice[],
  });

  private readonly reconciliationResource = rxResource({
    params: () => (environment.useMockData ? undefined : {}),
    stream: () =>
      this.reconciliationApi
        .getList({ skipCount: 0, maxResultCount: 25 })
        .pipe(map(r => (r.items ?? []).map(toReconciliationRun))),
    defaultValue: [] as ReconciliationRun[],
  });

  private readonly webhooksResource = rxResource({
    params: () => (environment.useMockData ? undefined : {}),
    stream: () => this.webhookApi.getList().pipe(map(r => (r.items ?? []).map(toWebhookSubscription))),
    defaultValue: [] as WebhookSubscription[],
  });

  private readonly grantsResource = rxResource({
    params: () => (environment.useMockData ? undefined : {}),
    stream: () => this.supportApi.getMyGrants(false).pipe(map(r => (r.items ?? []).map(toSupportGrant))),
    defaultValue: [] as SupportGrant[],
  });

  private readonly sessionsResource = rxResource({
    params: () => (environment.useMockData ? undefined : {}),
    stream: () =>
      this.supportApi
        .getSessionHistory({ skipCount: 0, maxResultCount: 50 })
        .pipe(map(r => (r.items ?? []).map(toSupportSession))),
    defaultValue: [] as SupportSession[],
  });

  /** Local overlay so "mark read" feels instant in mock mode as well as against the API. */
  private readonly readLocally = signal<ReadonlySet<string>>(new Set());

  // ---- public views --------------------------------------------------------

  readonly notifications = computed<readonly OpsNotification[]>(() => {
    const base = environment.useMockData ? this.notificationSeed : this.notificationsResource.value();
    const read = this.readLocally();
    return base.map(n => (read.has(n.id) ? { ...n, read: true } : n));
  });

  readonly unreadCount = computed(() => this.notifications().filter(n => !n.read).length);

  readonly unreadCriticalCount = computed(
    () => this.notifications().filter(n => !n.read && n.tone === 'critical').length,
  );

  readonly invoices = computed<readonly Invoice[]>(() =>
    environment.useMockData ? this.invoiceSeed : this.invoicesResource.value(),
  );

  readonly reconciliationRuns = computed<readonly ReconciliationRun[]>(() =>
    environment.useMockData ? this.reconciliationSeed : this.reconciliationResource.value(),
  );

  readonly webhooks = computed<readonly WebhookSubscription[]>(() =>
    environment.useMockData ? this.webhookSeed : this.webhooksResource.value(),
  );

  readonly deliveries = computed<readonly WebhookDelivery[]>(() => this.deliverySeed);

  readonly grants = computed<readonly SupportGrant[]>(() =>
    environment.useMockData ? this.grantSeed : this.grantsResource.value(),
  );

  readonly sessions = computed<readonly SupportSession[]>(() =>
    environment.useMockData ? this.sessionSeed : this.sessionsResource.value(),
  );

  // ---- actions -------------------------------------------------------------

  markRead(id: string): void {
    this.readLocally.update(set => new Set(set).add(id));

    if (!environment.useMockData) {
      this.notificationApi.markRead(id).subscribe();
    }
  }

  markAllRead(): void {
    this.readLocally.set(new Set(this.notifications().map(n => n.id)));

    if (!environment.useMockData) {
      this.notificationApi.markAllRead().subscribe();
    }
  }
}
