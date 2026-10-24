import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom, map, filter } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';
import { PermissionService } from '@abp/ng.core';

import { environment } from '../../../environments/environment';
import { grantedPolicy } from '../auth/permission';
import { NotificationService as NotificationApi } from '../../proxy/notifications';
import {
  GenerateInvoiceDto,
  InvoiceService as InvoiceApi,
  RunReconciliationDto,
  ReconciliationService as ReconciliationApi,
} from '../../proxy/billing';
import { WebhookSubscriptionService as WebhookApi } from '../../proxy/integrations';
import { WebhookEvent } from '../../proxy/integrations/webhook-event.enum';
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

/** A resource's value, or its default (empty) value once a request has failed. */
function settled<T>(resource: { hasValue(): boolean; value(): T }, fallback = [] as T): T {
  return resource.hasValue() ? resource.value() : fallback;
}

@Injectable({ providedIn: 'root' })
export class OpsService {
  private readonly router = inject(Router);
  private readonly path = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects.split(/[?#]/)[0]),
    ),
    { initialValue: this.router.url },
  );
  private readonly notificationApi = inject(NotificationApi);
  private readonly invoiceApi = inject(InvoiceApi);
  private readonly reconciliationApi = inject(ReconciliationApi);
  private readonly webhookApi = inject(WebhookApi);
  private readonly supportApi = inject(SupportApi);
  private readonly canReadWebhooks = grantedPolicy(
    'AutoReach.Integrations',
    inject(PermissionService),
  );

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
      body:
        'Meta has rated this number’s quality as Red. Marketing campaigns have been stopped ' +
        'automatically to protect the number from being restricted. Reminders and replies are unaffected.',
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
      body:
        'Meta changed this template’s category. It will now be billed at the marketing rate, ' +
        'and may only be sent to contacts with marketing consent.',
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
      body:
        'Our meter recorded ₹1,204.60 more than Meta billed for 01 Jul – 31 Jul 2026. ' +
        'Marketing is the category that is out.',
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
      body:
        'Reconnect the channel in Settings → Channels. Once it expires, nothing can be sent ' +
        'or received on that number until it is reconnected.',
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
      title: 'MNI Assist support has entered your account',
      body:
        'p.deshmukh started a read-only support session under the access you granted: ' +
        '“Investigating stuck campaign #4180”.',
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
      body:
        'https://crm.Sun Energyautomation.in/hooks/autoreach failed 20 times in a row and has been ' +
        'switched off. Fix the endpoint and re-enable it in Integrations.',
      occurredAt: OpsService.daysAgo(4),
      read: true,
      route: '/settings/integrations',
      emailState: 'sent',
    },
    {
      id: 'n-8',
      kind: 'SubscriptionChanged',
      tone: 'info',
      title: 'Your plan has been upgraded to Growth',
      body:
        'The workspace is now on the Growth plan. New limits and features are active immediately. ' +
        'Your next invoice will reflect the prorated difference.',
      occurredAt: OpsService.daysAgo(5),
      read: true,
      route: '/billing',
      emailState: 'sent',
    },
    {
      id: 'n-9',
      kind: 'TrialEnded',
      tone: 'warning',
      title: 'Your 14-day trial has ended',
      body:
        'Choose a plan to keep your campaigns, contacts and conversation history. ' +
        'Without a plan, sending is paused but nothing is deleted for 30 days.',
      occurredAt: OpsService.daysAgo(6),
      read: false,
      route: '/billing',
      emailState: 'sent',
    },
    {
      id: 'n-10',
      kind: 'SubscriptionExpired',
      tone: 'critical',
      title: 'Your subscription has expired — sending is paused',
      body:
        'All outbound messages, campaigns and automations have been paused. ' +
        'Renew or upgrade your plan in Billing to resume.',
      occurredAt: OpsService.daysAgo(7),
      read: false,
      route: '/billing',
      emailState: 'sent',
    },
    {
      id: 'n-11',
      kind: 'PlatformAccessStarted',
      tone: 'info',
      title: 'Platform access has been activated for your workspace',
      body:
        'An administrator has granted this workspace access to the MNI Assist platform. ' +
        'All plan features are now available.',
      occurredAt: OpsService.daysAgo(8),
      read: true,
      route: '/settings',
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
      customerName: 'Sun Energy Automation Pvt Ltd',
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
          description: 'MNI Assist Growth plan — 01 Jul 2026 – 31 Jul 2026',
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
      customerName: 'Sun Energy Automation Pvt Ltd',
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
      customerName: 'Sun Energy Automation Pvt Ltd',
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
      source: 'Meta invoice FBADS-IN-2026-0731',
      needsAttention: true,
      unit: 'messages',
      ourCount: 37_592,
      metaCount: 36_918,
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
            'We counted more than Meta billed. Most often a withheld message (131049) metered as ' +
            'paid, or a message Meta later marked free (a free entry point).',
        },
        {
          category: 'Utility',
          ourCount: 9_180,
          metaCount: 9_174,
          ourCostInPaise: 41_000_00,
          metaCostInPaise: 41_592_00,
          likelyCause:
            'Meta billed more than we counted. Most often a template Meta re-categorised after we ' +
            'priced it.',
        },
      ],
    },
  ];

  private readonly webhookSeed: readonly WebhookSubscription[] = [
    {
      id: 'wh-1',
      url: 'https://crm.Sun Energyautomation.in/hooks/autoreach',
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
      url: 'https://hooks.Sun Energyautomation.in/quotations',
      description: 'Quotation status → Tally',
      enabled: true,
      events: ['QuotationStatusChanged'],
      lastSuccessAt: OpsService.hoursAgo(2),
      consecutiveFailures: 0,
    },
  ];

  private readonly deliverySeed: readonly WebhookDelivery[] = [
    {
      id: 'd-1',
      event: 'InboundMessage',
      state: 'abandoned',
      attempts: 6,
      createdAt: OpsService.daysAgo(4),
      statusCode: 502,
      error: 'Endpoint returned 502',
    },
    {
      id: 'd-2',
      event: 'EnquiryCreated',
      state: 'abandoned',
      attempts: 6,
      createdAt: OpsService.daysAgo(4),
      statusCode: 502,
      error: 'Endpoint returned 502',
    },
    {
      id: 'd-3',
      event: 'QuotationStatusChanged',
      state: 'delivered',
      attempts: 1,
      createdAt: OpsService.hoursAgo(2),
      statusCode: 200,
    },
    {
      id: 'd-4',
      event: 'QuotationStatusChanged',
      state: 'delivered',
      attempts: 2,
      createdAt: OpsService.hoursAgo(18),
      statusCode: 200,
    },
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
    {
      id: 's-1',
      engineer: 'p.deshmukh',
      startedAt: OpsService.daysAgo(3),
      endedAt: OpsService.hoursAgo(71.4),
      writeEnabled: false,
      actionCount: 41,
      writeCount: 0,
    },
    {
      id: 's-2',
      engineer: 'p.deshmukh',
      startedAt: OpsService.daysAgo(2),
      endedAt: OpsService.hoursAgo(47.8),
      writeEnabled: false,
      actionCount: 12,
      writeCount: 0,
    },
    {
      id: 's-3',
      engineer: 'a.menon',
      startedAt: OpsService.daysAgo(49),
      endedAt: OpsService.hoursAgo(1174.5),
      writeEnabled: true,
      actionCount: 88,
      writeCount: 6,
    },
  ];

  // ---- resources -----------------------------------------------------------

  private readonly notificationsResource = rxResource({
    params: () => (environment.useMockData ? undefined : { unreadOnly: false }),
    stream: ({ params }) =>
      this.notificationApi
        .getList({ unreadOnly: params.unreadOnly, skipCount: 0, maxResultCount: 100 })
        .pipe(map((r) => (r.items ?? []).map(toNotification))),
    defaultValue: [] as OpsNotification[],
  });

  private readonly invoicesResource = rxResource({
    params: () =>
      environment.useMockData || !this.path().startsWith('/billing/invoices') ? undefined : {},
    stream: () =>
      this.invoiceApi
        .getList({ skipCount: 0, maxResultCount: 50 })
        .pipe(map((r) => (r.items ?? []).map(toInvoice))),
    defaultValue: [] as Invoice[],
  });

  private readonly reconciliationResource = rxResource({
    params: () =>
      environment.useMockData || !this.path().startsWith('/billing/invoices') ? undefined : {},
    stream: () =>
      this.reconciliationApi
        .getList({ skipCount: 0, maxResultCount: 25 })
        .pipe(map((r) => (r.items ?? []).map(toReconciliationRun))),
    defaultValue: [] as ReconciliationRun[],
  });

  private readonly webhooksResource = rxResource({
    params: () =>
      environment.useMockData ||
      !this.canReadWebhooks() ||
      !this.path().startsWith('/settings/integrations')
        ? undefined
        : {},
    stream: () =>
      this.webhookApi
        .getList({ skipCount: 0, maxResultCount: 100 })
        .pipe(map((r) => (r.items ?? []).map(toWebhookSubscription))),
    defaultValue: [] as WebhookSubscription[],
  });

  private readonly grantsResource = rxResource({
    params: () =>
      environment.useMockData || !this.path().startsWith('/settings/support-access')
        ? undefined
        : {},
    stream: () =>
      this.supportApi.getMyGrants(false).pipe(map((r) => (r.items ?? []).map(toSupportGrant))),
    defaultValue: [] as SupportGrant[],
  });

  private readonly sessionsResource = rxResource({
    params: () =>
      environment.useMockData || !this.path().startsWith('/settings/support-access')
        ? undefined
        : {},
    stream: () =>
      this.supportApi
        .getSessionHistory({ skipCount: 0, maxResultCount: 50 })
        .pipe(map((r) => (r.items ?? []).map(toSupportSession))),
    defaultValue: [] as SupportSession[],
  });

  /** Local overlay so "mark read" feels instant in mock mode as well as against the API. */
  private readonly readLocally = signal<ReadonlySet<string>>(new Set());

  // ---- public views --------------------------------------------------------
  // A failed request (a 403 for a user without the permission, say) reads as an
  // empty list: Angular's resource.value() throws once a request has failed,
  // which would take the whole screen down with it.

  readonly notifications = computed<readonly OpsNotification[]>(() => {
    const base = environment.useMockData
      ? this.notificationSeed
      : settled(this.notificationsResource);
    const read = this.readLocally();
    return base.map((n) => (read.has(n.id) ? { ...n, read: true } : n));
  });

  readonly unreadCount = computed(() => this.notifications().filter((n) => !n.read).length);

  readonly unreadCriticalCount = computed(
    () => this.notifications().filter((n) => !n.read && n.tone === 'critical').length,
  );

  readonly invoices = computed<readonly Invoice[]>(() =>
    environment.useMockData ? this.invoiceSeed : settled(this.invoicesResource),
  );

  readonly reconciliationRuns = computed<readonly ReconciliationRun[]>(() =>
    environment.useMockData ? this.reconciliationSeed : settled(this.reconciliationResource),
  );

  readonly webhooks = computed<readonly WebhookSubscription[]>(() =>
    environment.useMockData ? this.webhookSeed : settled(this.webhooksResource),
  );

  readonly deliveries = computed<readonly WebhookDelivery[]>(() => this.deliverySeed);

  readonly grants = computed<readonly SupportGrant[]>(() =>
    environment.useMockData ? this.grantSeed : settled(this.grantsResource),
  );

  readonly sessions = computed<readonly SupportSession[]>(() =>
    environment.useMockData ? this.sessionSeed : settled(this.sessionsResource),
  );

  // ---- actions -------------------------------------------------------------

  markRead(id: string): void {
    this.readLocally.update((set) => new Set(set).add(id));

    if (!environment.useMockData) {
      this.notificationApi.markRead(id).subscribe();
    }
  }

  markAllRead(): void {
    this.readLocally.set(new Set(this.notifications().map((n) => n.id)));

    if (!environment.useMockData) {
      this.notificationApi.markAllRead().subscribe();
    }
  }

  // ---- create-dialog actions ---------------------------------------------

  /** Lets MNI Assist support into this workspace for a while; it expires on its own. */
  async grantSupport(input: {
    reason: string;
    durationHours: number;
    allowsWrite: boolean;
    ticketRef?: string | null;
  }): Promise<void> {
    if (environment.useMockData) return;
    await firstValueFrom(this.supportApi.grant(input));
    this.grantsResource.reload();
  }

  /** Ends a grant at once, closing any session in progress. */
  async revokeSupport(grantId: string): Promise<void> {
    if (environment.useMockData) return;
    await firstValueFrom(this.supportApi.revoke(grantId));
    this.grantsResource.reload();
    this.sessionsResource.reload();
  }

  /** After an invoice is paid online (M11-7). */
  reloadInvoices(): void {
    this.invoicesResource.reload();
  }

  async generateInvoice(input: GenerateInvoiceDto): Promise<void> {
    if (environment.useMockData) return;
    await firstValueFrom(this.invoiceApi.generate(input));
    this.invoicesResource.reload();
  }

  /** Closes a month against Meta's invoice. Returns the run so the page can say whether it matched. */
  async reconcileInvoice(input: RunReconciliationDto): Promise<ReconciliationRun | null> {
    if (environment.useMockData) return null;
    const run = await firstValueFrom(this.reconciliationApi.run(input));
    this.reconciliationResource.reload();
    return toReconciliationRun(run);
  }

  /** Someone looked at a variance and is closing it, with a note saying why. */
  async acknowledgeReconciliation(id: string, note: string): Promise<void> {
    if (environment.useMockData) return;
    await firstValueFrom(this.reconciliationApi.acknowledge(id, { note: note || undefined }));
    this.reconciliationResource.reload();
  }

  async createWebhook(url: string, description: string, events: WebhookEvent[]): Promise<void> {
    if (environment.useMockData) return;
    await firstValueFrom(
      this.webhookApi.create({
        url: url.trim(),
        description: description.trim() || undefined,
        events,
        isEnabled: true,
      }),
    );
    this.webhooksResource.reload();
  }
}
