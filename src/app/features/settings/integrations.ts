import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { firstValueFrom } from 'rxjs';

import { OpsService } from '../../core/services/ops.service';
import { WebhookSubscription } from '../../core/models/ops.model';
import { ArApiKeysCard } from './api-keys-card';
import { ConfirmService } from '../../core/ui/confirm.service';
import { readApiError } from '../../core/util/api-error';
import { WebhookEvent } from '../../proxy/integrations/webhook-event.enum';
import {
  CrmOAuthService,
  CrmSyncConnectionStatusDto,
  CrmSyncService,
  IntegrationService,
} from '../../proxy/integrations';
import { ArTopbar } from '../../layout/topbar';
import { ArBanner, ArButton, ArChip, ArDialog } from '../../ui';
import { ArTabs } from '../../ui/tabs';
import { ArGrid } from '../../ui/grid';
import { ChipTone } from '../../ui/chip';
import { ArErpSyncSection } from './erp-sync-section';
import { ArHelpdeskShopSection } from './helpdesk-shop-section';
import { ToastService } from '../../core/ui/toast.service';

/** The CRM kinds with real deal/contact sync — matches ICrmDealSync/ICrmContactSync's
 * actual registered implementations, not every IntegrationKind. */
type SyncableKind = 2 | 6 | 9;

/** The OAuth connect flow only exists for these three — see CrmOAuthController. */
const OAUTH_KINDS: { kind: SyncableKind; label: string }[] = [
  { kind: 2, label: 'Zoho CRM' },
  { kind: 6, label: 'HubSpot' },
  { kind: 9, label: 'Salesforce' },
];

/** A canonical deal/contact field CrmFieldMapping (API) knows how to remap. */
interface MappableField {
  key: string;
  label: string;
  /** Undefined when the kind's connector never reads this canonical key. */
  defaultByKind: Partial<Record<SyncableKind, string>>;
}

const DEAL_FIELDS: MappableField[] = [
  { key: 'name', label: 'Deal name', defaultByKind: { 2: 'Deal_Name', 6: 'dealname', 9: 'Name' } },
  { key: 'stage', label: 'Stage', defaultByKind: { 2: 'Stage', 6: 'dealstage', 9: 'StageName' } },
  { key: 'amount', label: 'Amount', defaultByKind: { 2: 'Amount', 6: 'amount', 9: 'Amount' } },
  {
    key: 'closingDate',
    label: 'Closing date',
    defaultByKind: { 2: 'Closing_Date', 6: 'closedate', 9: 'CloseDate' },
  },
  {
    key: 'description',
    label: 'Description',
    defaultByKind: { 2: 'Description', 6: 'description', 9: 'Description' },
  },
  // Salesforce's ContactId is a plain lookup field, same canonical slot as Zoho's
  // Contact_Name lookup — HubSpot links a contact through its associations API
  // instead, so it never reads this key.
  {
    key: 'contactLookup',
    label: 'Contact link',
    defaultByKind: { 2: 'Contact_Name', 9: 'ContactId' },
  },
  {
    key: 'currency',
    label: 'Currency field',
    defaultByKind: { 2: 'Currency', 6: 'deal_currency_code', 9: 'CurrencyIsoCode' },
  },
];

const CONTACT_FIELDS: MappableField[] = [
  {
    key: 'firstName',
    label: 'First name',
    defaultByKind: { 2: 'First_Name', 6: 'firstname', 9: 'FirstName' },
  },
  {
    key: 'lastName',
    label: 'Last name',
    defaultByKind: { 2: 'Last_Name', 6: 'lastname', 9: 'LastName' },
  },
  { key: 'phone', label: 'Phone', defaultByKind: { 2: 'Phone', 6: 'phone', 9: 'Phone' } },
  { key: 'email', label: 'Email', defaultByKind: { 2: 'Email', 6: 'email', 9: 'Email' } },
  // No Salesforce entry: a Contact's employer there is the Account it links to, not a
  // free-text field — see SalesforceContactSync's doc comment on the API side.
  { key: 'company', label: 'Company', defaultByKind: { 2: 'Account_Name', 6: 'company' } },
  { key: 'city', label: 'City', defaultByKind: { 2: 'Mailing_City', 6: 'city', 9: 'MailingCity' } },
  {
    key: 'state',
    label: 'State',
    defaultByKind: { 2: 'Mailing_State', 6: 'state', 9: 'MailingState' },
  },
  {
    key: 'description',
    label: 'Description',
    defaultByKind: { 2: 'Description', 9: 'Description' },
  },
];

const DELIVERY_TONE: Record<string, ChipTone> = {
  delivered: 'good',
  pending: 'neutral',
  failed: 'warn',
  abandoned: 'bad',
};

/**
 * Outbound webhooks: where a tenant's own systems find out what happened.
 *
 * The screen leads with failure state rather than configuration because that is
 * what people come here for. An endpoint that disabled itself after twenty
 * consecutive failures has been silently not feeding someone's CRM, and the whole
 * point of surfacing it is that nobody discovers it three weeks later.
 */
@Component({
  selector: 'ar-integrations',
  imports: [
    ArApiKeysCard,
    ArTopbar,
    ArBanner,
    ArButton,
    ArChip,
    ArDialog,
    ArTabs,
    ArErpSyncSection,
    ArHelpdeskShopSection,
    ArGrid,
    GridModule,
    NgTemplateOutlet,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './integrations.html',
  styleUrl: './integrations.scss',
})
export class ArIntegrations {
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);
  private readonly ops = inject(OpsService);
  private readonly crmSync = inject(CrmSyncService);
  private readonly integrations = inject(IntegrationService);
  private readonly crmOAuth = inject(CrmOAuthService);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly router = inject(Router, { optional: true });

  protected readonly mode = (this.route?.snapshot?.data?.['mode'] as string | undefined) ?? 'list';
  protected readonly isPage = this.mode !== 'list';

  protected readonly tabs = [
    'Webhooks',
    'CRM sync',
    'ERP (Tally / SAP)',
    'Helpdesk & store',
    'API keys',
  ] as const;
  protected readonly activeTab = signal<string>('Webhooks');

  protected readonly pageTitle = computed(() => {
    if (this.mode === 'endpoint-new') return 'Add webhook endpoint';
    if (this.mode === 'mapping') {
      const mc = this.mappingConnection();
      return mc ? `${mc.name} — field mapping` : 'CRM field mapping';
    }
    return 'Integrations';
  });

  protected readonly webhooks = this.ops.webhooks;
  protected readonly deliveries = this.ops.deliveries;
  protected readonly selectedId = signal<string | null>(null);

  // ---- CRM two-way sync (M10-9) -----------------------------------
  protected readonly crm = signal<CrmSyncConnectionStatusDto[]>([]);
  protected readonly crmError = signal<string | null>(null);
  protected readonly resyncing = signal<string | null>(null);
  protected readonly mappingConnection = signal<CrmSyncConnectionStatusDto | null>(null);
  protected readonly mappingLoading = signal(false);
  protected readonly mappingSaving = signal(false);
  protected readonly mappingError = signal<string | null>(null);
  protected readonly mappingCurrency = signal('');
  protected readonly timelineEnabled = signal(false);
  protected readonly timelineCampaigns = signal(true);
  protected readonly accountsEnabled = signal(false);
  protected readonly mappingDeal = signal<Record<string, string>>({});
  protected readonly mappingContact = signal<Record<string, string>>({});

  protected readonly dealFields = computed(() => this.fieldsFor(DEAL_FIELDS));
  protected readonly contactFields = computed(() => this.fieldsFor(CONTACT_FIELDS));

  private fieldsFor(fields: MappableField[]): MappableField[] {
    const kind = this.mappingConnection()?.kind as SyncableKind | undefined;
    return kind === undefined ? [] : fields.filter((f) => f.defaultByKind[kind] !== undefined);
  }

  protected defaultFor(field: MappableField, kind: number): string | undefined {
    return field.defaultByKind[kind as SyncableKind];
  }

  protected dealValue(key: string): string {
    return this.mappingDeal()[key] ?? '';
  }

  protected contactValue(key: string): string {
    return this.mappingContact()[key] ?? '';
  }

  // ---- OAuth connect flow (M10-9) ------------------------------------
  protected readonly oAuthKinds = OAUTH_KINDS;
  protected readonly oAuthStarting = signal<SyncableKind | null>(null);
  /** Salesforce only: connect (or reconnect) a sandbox org, which signs in at test.salesforce.com. */
  protected readonly salesforceSandbox = signal(false);
  protected readonly oAuthBanner = signal<{ tone: 'good' | 'bad'; message: string } | null>(null);

  constructor() {
    this.consumeOAuthRedirectParams();
    void this.loadCrm();

    if (this.mode === 'endpoint-new') {
      this.openDialog();
    }
    effect(() => {
      if (this.mode === 'mapping') {
        const id = this.route?.snapshot?.paramMap?.get('id');
        const conn = this.crm().find((c) => c.connectionId === id);
        if (
          conn &&
          (!this.mappingConnection() ||
            this.mappingConnection()?.connectionId !== conn.connectionId)
        ) {
          void this.openMapping(conn);
        }
      }
    });
  }

  protected goAddEndpoint(): void {
    if (this.router) void this.router.navigate(['/settings/integrations/endpoints/new']);
    else this.openDialog();
  }

  protected goMapping(c: CrmSyncConnectionStatusDto): void {
    if (this.router)
      void this.router.navigate(['/settings/integrations/crm', c.connectionId, 'mapping']);
    else void this.openMapping(c);
  }

  protected close(): void {
    this.dialogOpen.set(false);
    this.mappingConnection.set(null);
    if (this.isPage && this.router) {
      void this.router.navigate(['/settings/integrations']);
    }
  }

  /**
   * CrmOAuthController's callback redirects the browser back here with
   * ?crmOAuthConnected=<kind> or ?crmOAuthError=<reason> — read it once, show a
   * banner, then strip it from the URL so a page refresh doesn't re-show it.
   */
  private consumeOAuthRedirectParams(): void {
    const params = new URLSearchParams(window.location.search);
    const connectedKind = params.get('crmOAuthConnected');
    const error = params.get('crmOAuthError');

    if (connectedKind !== null) {
      this.oAuthBanner.set({
        tone: 'good',
        message: 'CRM connected — token refresh is now automatic.',
      });
    } else if (error !== null) {
      this.oAuthBanner.set({
        tone: 'bad',
        message: `The CRM connect flow did not finish (${error}).`,
      });
    } else {
      return;
    }

    params.delete('crmOAuthConnected');
    params.delete('crmOAuthError');
    const query = params.toString();
    history.replaceState(null, '', window.location.pathname + (query ? `?${query}` : ''));
  }

  /**
   * Starts the interactive connect flow and leaves the SPA — the CRM's own consent
   * screen isn't an Angular route. `connectionId` reconnects an existing connection
   * whose refresh token has died; omitted, this creates a new one.
   */
  protected async startOAuth(kind: SyncableKind, connectionId?: string): Promise<void> {
    this.oAuthStarting.set(kind);
    this.crmError.set(null);
    try {
      const label = this.oAuthKinds.find((k) => k.kind === kind)?.label ?? `Kind ${kind}`;
      const result = await firstValueFrom(
        this.crmOAuth.start(kind, {
          ...(connectionId ? { connectionId } : { name: label }),
          ...(kind === 9 && !connectionId ? { sandbox: this.salesforceSandbox() } : {}),
        }),
      );
      window.location.href = result.authorizeUrl;
    } catch (e: unknown) {
      this.crmError.set(e instanceof Error ? e.message : 'The connect flow could not be started.');
      this.oAuthStarting.set(null);
    }
  }

  private async loadCrm(): Promise<void> {
    try {
      const status = await firstValueFrom(this.crmSync.getStatus());
      this.crm.set(status.connections ?? []);
    } catch {
      this.crmError.set('Could not load CRM sync status.');
    }
  }

  protected async resync(connectionId: string): Promise<void> {
    this.resyncing.set(connectionId);
    this.crmError.set(null);
    try {
      await firstValueFrom(this.crmSync.resync(connectionId));
      await this.loadCrm();
    } catch (e: unknown) {
      this.crmError.set(e instanceof Error ? e.message : 'The resync could not be started.');
    } finally {
      this.resyncing.set(null);
    }
  }

  protected crmKindLabel(kind: number): string {
    return { 2: 'Zoho CRM', 6: 'HubSpot', 9: 'Salesforce' }[kind] ?? `Kind ${kind}`;
  }

  protected isOAuthKind(kind: number): boolean {
    return OAUTH_KINDS.some((k) => k.kind === kind);
  }

  protected async openMapping(connection: CrmSyncConnectionStatusDto): Promise<void> {
    this.mappingConnection.set(connection);
    this.mappingError.set(null);
    this.mappingCurrency.set('');
    this.timelineEnabled.set(false);
    this.timelineCampaigns.set(true);
    this.accountsEnabled.set(false);
    this.mappingDeal.set({});
    this.mappingContact.set({});
    this.mappingLoading.set(true);

    try {
      const config = this.parseConfig(
        (await firstValueFrom(this.integrations.get(connection.connectionId))).configJson,
      );

      this.mappingCurrency.set(
        typeof config['currency'] === 'string' ? (config['currency'] as string) : '',
      );
      const timeline = config['timeline'] as { enabled?: boolean; campaigns?: boolean } | undefined;
      this.timelineEnabled.set(timeline?.enabled === true);
      this.timelineCampaigns.set(timeline?.campaigns ?? true);
      this.accountsEnabled.set(
        (config['accounts'] as { enabled?: boolean } | undefined)?.enabled === true,
      );
      const mapping =
        (config['fieldMapping'] as Record<string, Record<string, string>> | undefined) ?? {};
      this.mappingDeal.set({ ...(mapping['deal'] ?? {}) });
      this.mappingContact.set({ ...(mapping['contact'] ?? {}) });
    } catch (e: unknown) {
      this.mappingError.set(
        e instanceof Error ? e.message : 'Could not load the current configuration.',
      );
    } finally {
      this.mappingLoading.set(false);
    }
  }

  protected closeMapping(): void {
    this.close();
  }

  protected setDealField(key: string, value: string): void {
    this.mappingDeal.update((m) => ({ ...m, [key]: value }));
  }

  protected setContactField(key: string, value: string): void {
    this.mappingContact.update((m) => ({ ...m, [key]: value }));
  }

  protected async saveMapping(): Promise<void> {
    const connection = this.mappingConnection();
    if (!connection) return;

    this.mappingSaving.set(true);
    this.mappingError.set(null);

    try {
      const config = this.parseConfig(
        (await firstValueFrom(this.integrations.get(connection.connectionId))).configJson,
      );

      const currency = this.mappingCurrency().trim();
      if (currency) {
        config['currency'] = currency;
      } else {
        delete config['currency'];
      }

      if (this.timelineEnabled()) {
        config['timeline'] = { enabled: true, campaigns: this.timelineCampaigns() };
      } else {
        delete config['timeline'];
      }

      if (this.accountsEnabled()) {
        config['accounts'] = { enabled: true };
      } else {
        delete config['accounts'];
      }

      const deal = this.trimmed(this.mappingDeal());
      const contact = this.trimmed(this.mappingContact());
      if (Object.keys(deal).length || Object.keys(contact).length) {
        config['fieldMapping'] = {
          ...(Object.keys(deal).length ? { deal } : {}),
          ...(Object.keys(contact).length ? { contact } : {}),
        };
      } else {
        delete config['fieldMapping'];
      }

      const current = await firstValueFrom(this.integrations.get(connection.connectionId));
      await firstValueFrom(
        this.integrations.update(connection.connectionId, {
          kind: current.kind,
          name: current.name ?? connection.name,
          configJson: JSON.stringify(config),
          // A blank credential tells the API "leave the stored one alone" — see
          // IntegrationAppService.UpdateAsync.
          credential: null,
        }),
      );

      this.closeMapping();
    } catch (e: unknown) {
      this.mappingError.set(
        e instanceof Error ? e.message : 'The configuration could not be saved.',
      );
    } finally {
      this.mappingSaving.set(false);
    }
  }

  private parseConfig(configJson?: string | null): Record<string, unknown> {
    try {
      const parsed = JSON.parse(configJson ?? '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private trimmed(fields: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value.trim()) result[key] = value.trim();
    }
    return result;
  }

  // ---- Add endpoint dialog -----------------------------------------
  protected readonly allEvents: { value: WebhookEvent; label: string }[] = [
    { value: WebhookEvent.InboundMessage, label: 'Inbound message' },
    { value: WebhookEvent.MessageStatusChanged, label: 'Message status changed' },
    { value: WebhookEvent.CampaignCompleted, label: 'Campaign completed' },
    { value: WebhookEvent.FlowSubmitted, label: 'Flow submitted' },
    { value: WebhookEvent.EnquiryCreated, label: 'Enquiry created' },
    { value: WebhookEvent.QuotationStatusChanged, label: 'Quotation status changed' },
    { value: WebhookEvent.ContactOptedOut, label: 'Contact opted out' },
    { value: WebhookEvent.AutomationStep, label: 'Automation step' },
    { value: WebhookEvent.ReminderSent, label: 'Reminder sent' },
  ];
  protected readonly dialogOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly url = signal('');
  protected readonly description = signal('');
  protected readonly events = signal<Set<WebhookEvent>>(new Set());

  protected openDialog(): void {
    this.url.set('');
    this.description.set('');
    this.events.set(new Set([WebhookEvent.InboundMessage]));
    this.error.set(null);
    this.dialogOpen.set(true);
  }

  protected toggleEvent(event: WebhookEvent, checked: boolean): void {
    this.events.update((set) => {
      const next = new Set(set);
      if (checked) next.add(event);
      else next.delete(event);
      return next;
    });
  }

  /** The secret from the last rotation, shown once for the endpoint it belongs to. */
  protected readonly revealedSecret = signal<{ id: string; secret: string } | null>(null);
  protected readonly webhookBusy = signal<string | null>(null);

  protected async rotateSecret(w: WebhookSubscription): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: 'Rotate the signing secret?',
      message: `The current secret for ${w.description || w.url} stops working immediately. Requests are signed with the new one from now on.`,
      details: [
        'Update the secret in the receiving system straight away, or its signature checks will fail.',
      ],
      confirmText: 'Rotate secret',
      tone: 'danger',
    });
    if (!ok) return;
    await this.runWebhook('rotate', async () => {
      const secret = await this.ops.rotateWebhookSecret(w.id);
      this.revealedSecret.set({ id: w.id, secret });
      this.toasts.success(
        'New signing secret created. Copy it now; it is not shown again.',
        'Webhook',
      );
    });
  }

  protected async copySecret(secret: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(secret);
      this.toasts.success('Signing secret copied.', 'Webhook');
    } catch {
      this.toasts.warning('Copy failed. Select the secret and copy it by hand.', 'Webhook');
    }
  }

  protected async sendTest(w: WebhookSubscription): Promise<void> {
    await this.runWebhook('test', async () => {
      await this.ops.sendWebhookTest(w.id);
      this.toasts.success('Test event sent. Its result is under Recent deliveries.', 'Webhook');
    });
  }

  protected async reenable(w: WebhookSubscription): Promise<void> {
    await this.runWebhook('reenable', async () => {
      await this.ops.reenableWebhook(w.id);
      this.toasts.success('Endpoint switched back on.', 'Webhook');
    });
  }

  protected async retryDelivery(deliveryId: string): Promise<void> {
    await this.runWebhook('retry:' + deliveryId, async () => {
      await this.ops.retryWebhookDelivery(deliveryId);
      this.toasts.success('Sent again. The result shows here in a moment.', 'Webhook');
    });
  }

  private async runWebhook(action: string, work: () => Promise<void>): Promise<void> {
    if (this.webhookBusy()) return;
    this.webhookBusy.set(action);
    try {
      await work();
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'That did not work. Try again.'), 'Webhook');
    } finally {
      this.webhookBusy.set(null);
    }
  }

  protected async createEndpoint(): Promise<void> {
    if (!/^https:\/\/.+/.test(this.url().trim())) {
      this.toasts.warning('The endpoint must be an https URL.', 'Webhook');
      return;
    }
    if (this.events().size === 0) {
      this.toasts.warning('Pick at least one event to send.', 'Webhook');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.ops.createWebhook(this.url(), this.description(), [...this.events()]);
      this.close();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'The endpoint could not be added.');
    } finally {
      this.saving.set(false);
    }
  }

  protected readonly selected = computed<WebhookSubscription | null>(
    () => this.webhooks().find((w) => w.id === this.selectedId()) ?? this.webhooks()[0] ?? null,
  );

  protected readonly disabledCount = computed(
    () => this.webhooks().filter((w) => !w.enabled).length,
  );

  protected readonly subtitle = computed(() => {
    const total = this.webhooks().length;
    const off = this.disabledCount();
    const label = `${total} endpoint${total === 1 ? '' : 's'}`;
    return off === 0 ? `${label} · all healthy` : `${label} · ${off} disabled`;
  });

  /** The selected endpoint's recent deliveries, read from the server. */
  protected readonly relevantDeliveries = this.deliveries;
  private readonly followSelection = effect(() =>
    this.ops.deliveryEndpoint.set(this.selected()?.id ?? null),
  );

  /** Grid rows: plain values to sort, filter and export by. */
  protected readonly deliveryRows = computed(() =>
    this.relevantDeliveries().map((d) => ({
      id: d.id,
      event: this.eventLabel(d.event),
      state: d.state,
      tone: this.deliveryTone(d.state),
      attempts: d.attempts,
      status: d.statusCode ?? '—',
      when: this.when(d.createdAt),
    })),
  );

  protected select(id: string): void {
    this.selectedId.set(id);
  }

  protected deliveryTone(state: string): ChipTone {
    return DELIVERY_TONE[state] ?? 'neutral';
  }

  protected when(iso?: string): string {
    if (!iso) return 'never';
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected eventLabel(event: string): string {
    return event.replace(/([a-z])([A-Z])/g, '$1 $2');
  }
}
