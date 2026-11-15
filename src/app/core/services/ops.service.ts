import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom, map, filter } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';
import { PermissionService } from '@abp/ng.core';
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
  toWebhookDelivery,
  toWebhookSubscription,
} from '../api/ops-mapping';

/**
 * Store for the operational screens: notifications, invoicing, reconciliation,
 * outbound webhooks and support access.
 *
 * One service rather than five because these screens share a shape — a list, a
 * detail, and one or two state-changing actions — and five near-identical services
 * would be five places to keep consistent.
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

  // ---- resources -----------------------------------------------------------

  private readonly notificationsResource = rxResource({
    params: () => ({ unreadOnly: false }),
    stream: ({ params }) =>
      this.notificationApi
        .getList({ unreadOnly: params.unreadOnly, skipCount: 0, maxResultCount: 100 })
        .pipe(map((r) => (r.items ?? []).map(toNotification))),
    defaultValue: [] as OpsNotification[],
  });

  private readonly invoicesResource = rxResource({
    params: () => (!this.path().startsWith('/billing/invoices') ? undefined : {}),
    stream: () =>
      this.invoiceApi
        .getList({ skipCount: 0, maxResultCount: 50 })
        .pipe(map((r) => (r.items ?? []).map(toInvoice))),
    defaultValue: [] as Invoice[],
  });

  private readonly reconciliationResource = rxResource({
    params: () => (!this.path().startsWith('/billing/invoices') ? undefined : {}),
    stream: () =>
      this.reconciliationApi
        .getList({ skipCount: 0, maxResultCount: 25 })
        .pipe(map((r) => (r.items ?? []).map(toReconciliationRun))),
    defaultValue: [] as ReconciliationRun[],
  });

  private readonly webhooksResource = rxResource({
    params: () =>
      !this.canReadWebhooks() || !this.path().startsWith('/settings/integrations') ? undefined : {},
    stream: () =>
      this.webhookApi
        .getList({ skipCount: 0, maxResultCount: 100 })
        .pipe(map((r) => (r.items ?? []).map(toWebhookSubscription))),
    defaultValue: [] as WebhookSubscription[],
  });

  private readonly grantsResource = rxResource({
    params: () => (!this.path().startsWith('/settings/support-access') ? undefined : {}),
    stream: () =>
      this.supportApi.getMyGrants(false).pipe(map((r) => (r.items ?? []).map(toSupportGrant))),
    defaultValue: [] as SupportGrant[],
  });

  private readonly sessionsResource = rxResource({
    params: () => (!this.path().startsWith('/settings/support-access') ? undefined : {}),
    stream: () =>
      this.supportApi
        .getSessionHistory({ skipCount: 0, maxResultCount: 50 })
        .pipe(map((r) => (r.items ?? []).map(toSupportSession))),
    defaultValue: [] as SupportSession[],
  });

  /** Local overlay so "mark read" feels instant, before the API answers. */
  private readonly readLocally = signal<ReadonlySet<string>>(new Set());

  // ---- public views --------------------------------------------------------
  // A failed request (a 403 for a user without the permission, say) reads as an
  // empty list: Angular's resource.value() throws once a request has failed,
  // which would take the whole screen down with it.

  readonly notifications = computed<readonly OpsNotification[]>(() => {
    const base = settled(this.notificationsResource);
    const read = this.readLocally();
    return base.map((n) => (read.has(n.id) ? { ...n, read: true } : n));
  });

  readonly unreadCount = computed(() => this.notifications().filter((n) => !n.read).length);

  readonly unreadCriticalCount = computed(
    () => this.notifications().filter((n) => !n.read && n.tone === 'critical').length,
  );

  readonly invoices = computed<readonly Invoice[]>(() => settled(this.invoicesResource));

  readonly reconciliationRuns = computed<readonly ReconciliationRun[]>(() =>
    settled(this.reconciliationResource),
  );

  readonly webhooks = computed<readonly WebhookSubscription[]>(() =>
    settled(this.webhooksResource),
  );

  /** The webhook endpoint whose recent deliveries are shown (the integrations page sets it). */
  readonly deliveryEndpoint = signal<string | null>(null);
  private readonly deliveriesResource = rxResource({
    params: () => {
      const id = this.deliveryEndpoint();
      return id && this.canReadWebhooks() ? { id } : undefined;
    },
    stream: ({ params }) =>
      this.webhookApi
        .getDeliveries(params.id, { skipCount: 0, maxResultCount: 50 })
        .pipe(map((r) => (r.items ?? []).map(toWebhookDelivery))),
    defaultValue: [] as WebhookDelivery[],
  });
  readonly deliveries = computed<readonly WebhookDelivery[]>(() =>
    this.deliveryEndpoint() ? settled(this.deliveriesResource) : [],
  );

  readonly grants = computed<readonly SupportGrant[]>(() => settled(this.grantsResource));

  readonly sessions = computed<readonly SupportSession[]>(() => settled(this.sessionsResource));

  // ---- actions -------------------------------------------------------------

  markRead(id: string): void {
    this.readLocally.update((set) => new Set(set).add(id));

    this.notificationApi.markRead(id).subscribe();
  }

  markAllRead(): void {
    this.readLocally.set(new Set(this.notifications().map((n) => n.id)));

    this.notificationApi.markAllRead().subscribe();
  }

  // ---- create-dialog actions ---------------------------------------------

  /** Lets MNI Assist support into this workspace for a while; it expires on its own. */
  async grantSupport(input: {
    reason: string;
    durationHours: number;
    allowsWrite: boolean;
    ticketRef?: string | null;
    grantedToSupportUserId?: string | null;
  }): Promise<void> {
    await firstValueFrom(this.supportApi.grant(input));
    this.grantsResource.reload();
  }

  /** Ends a grant at once, closing any session in progress. */
  async revokeSupport(grantId: string): Promise<void> {
    await firstValueFrom(this.supportApi.revoke(grantId));
    this.grantsResource.reload();
    this.sessionsResource.reload();
  }

  /** After an invoice is paid online (M11-7). */
  reloadInvoices(): void {
    this.invoicesResource.reload();
  }

  async generateInvoice(input: GenerateInvoiceDto): Promise<void> {
    await firstValueFrom(this.invoiceApi.generate(input));
    this.invoicesResource.reload();
  }

  /** Closes a month against Meta's invoice. Returns the run so the page can say whether it matched. */
  async reconcileInvoice(input: RunReconciliationDto): Promise<ReconciliationRun | null> {
    const run = await firstValueFrom(this.reconciliationApi.run(input));
    this.reconciliationResource.reload();
    return toReconciliationRun(run);
  }

  /** Someone looked at a variance and is closing it, with a note saying why. */
  async acknowledgeReconciliation(id: string, note: string): Promise<void> {
    await firstValueFrom(this.reconciliationApi.acknowledge(id, { note: note || undefined }));
    this.reconciliationResource.reload();
  }

  async createWebhook(url: string, description: string, events: WebhookEvent[]): Promise<void> {
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

  /** Changes where an endpoint points and what it receives; whether it is on stays as it was. */
  async updateWebhook(
    id: string,
    url: string,
    description: string,
    events: WebhookEvent[],
    enabled: boolean,
  ): Promise<void> {
    await firstValueFrom(
      this.webhookApi.update(id, {
        url: url.trim(),
        description: description.trim() || undefined,
        events,
        isEnabled: enabled,
      }),
    );
    this.webhooksResource.reload();
  }

  /** Stops sending to an endpoint for good; its delivery history goes with it. */
  async deleteWebhook(id: string): Promise<void> {
    await firstValueFrom(this.webhookApi.delete(id));
    this.webhooksResource.reload();
    this.deliveriesResource.reload();
  }

  /** A new signing secret; the old one stops working at once. The only time the secret is ever shown. */
  async rotateWebhookSecret(id: string): Promise<string> {
    const result = await firstValueFrom(this.webhookApi.rotateSecret(id));
    this.webhooksResource.reload();
    return result.signingSecret ?? '';
  }

  async sendWebhookTest(id: string): Promise<void> {
    await firstValueFrom(this.webhookApi.sendTest(id));
    this.webhooksResource.reload();
    this.deliveriesResource.reload();
  }

  async retryWebhookDelivery(deliveryId: string): Promise<void> {
    await firstValueFrom(this.webhookApi.retryDelivery(deliveryId));
    this.deliveriesResource.reload();
  }

  async reenableWebhook(id: string): Promise<void> {
    await firstValueFrom(this.webhookApi.reenable(id));
    this.webhooksResource.reload();
  }
}
