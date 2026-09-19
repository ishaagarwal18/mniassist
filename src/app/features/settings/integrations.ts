import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { OpsService } from '../../core/services/ops.service';
import { WebhookSubscription } from '../../core/models/ops.model';
import { WebhookEvent } from '../../proxy/integrations/webhook-event.enum';
import {
  CrmSyncConnectionStatusDto,
  CrmSyncService,
  IntegrationService,
} from '../../proxy/integrations';
import { environment } from '../../../environments/environment';
import { ArTopbar } from '../../layout/topbar';
import { ArBanner, ArButton, ArChip, ArDialog } from '../../ui';
import { ChipTone } from '../../ui/chip';

/** A canonical deal/contact field CrmFieldMapping (API) knows how to remap. */
interface MappableField {
  key: string;
  label: string;
  /** Undefined when the kind's connector never reads this canonical key. */
  defaultByKind: Partial<Record<2 | 6, string>>;
}

const DEAL_FIELDS: MappableField[] = [
  { key: 'name', label: 'Deal name', defaultByKind: { 2: 'Deal_Name', 6: 'dealname' } },
  { key: 'stage', label: 'Stage', defaultByKind: { 2: 'Stage', 6: 'dealstage' } },
  { key: 'amount', label: 'Amount', defaultByKind: { 2: 'Amount', 6: 'amount' } },
  { key: 'closingDate', label: 'Closing date', defaultByKind: { 2: 'Closing_Date', 6: 'closedate' } },
  { key: 'description', label: 'Description', defaultByKind: { 2: 'Description', 6: 'description' } },
  { key: 'contactLookup', label: 'Contact link', defaultByKind: { 2: 'Contact_Name' } },
  { key: 'currency', label: 'Currency field', defaultByKind: { 2: 'Currency', 6: 'deal_currency_code' } },
];

const CONTACT_FIELDS: MappableField[] = [
  { key: 'firstName', label: 'First name', defaultByKind: { 2: 'First_Name', 6: 'firstname' } },
  { key: 'lastName', label: 'Last name', defaultByKind: { 2: 'Last_Name', 6: 'lastname' } },
  { key: 'phone', label: 'Phone', defaultByKind: { 2: 'Phone', 6: 'phone' } },
  { key: 'email', label: 'Email', defaultByKind: { 2: 'Email', 6: 'email' } },
  { key: 'company', label: 'Company', defaultByKind: { 2: 'Account_Name', 6: 'company' } },
  { key: 'city', label: 'City', defaultByKind: { 2: 'Mailing_City', 6: 'city' } },
  { key: 'state', label: 'State', defaultByKind: { 2: 'Mailing_State', 6: 'state' } },
  { key: 'description', label: 'Description', defaultByKind: { 2: 'Description' } },
];

const SEED_CRM: CrmSyncConnectionStatusDto[] = [
  {
    connectionId: 'crm-zoho',
    kind: 2,
    name: 'Zoho CRM — Sales',
    state: 1,
    supportsDealSync: true,
    supportsContactSync: true,
    linkedEnquiries: 34,
    linkedQuotations: 12,
    linkedContacts: 29,
    lastOutboundAtUtc: new Date(Date.now() - 26 * 60_000).toISOString(),
    lastInboundAtUtc: new Date(Date.now() - 3 * 3_600_000).toISOString(),
    inboundWebhookPath: '/api/webhooks/crm/crm-zoho?secret=••••••',
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
  imports: [ArTopbar, ArBanner, ArButton, ArChip, ArDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './integrations.html',
  styleUrl: './integrations.scss',
})
export class ArIntegrations {
  private readonly ops = inject(OpsService);
  private readonly crmSync = inject(CrmSyncService);
  private readonly integrations = inject(IntegrationService);

  protected readonly webhooks = this.ops.webhooks;
  protected readonly deliveries = this.ops.deliveries;
  protected readonly selectedId = signal<string | null>('wh-1');

  // ---- CRM two-way sync (M10-9) -----------------------------------
  protected readonly crm = signal<CrmSyncConnectionStatusDto[]>([]);
  protected readonly crmError = signal<string | null>(null);
  protected readonly resyncing = signal<string | null>(null);

  // ---- Field mapping / currency dialog ------------------------------
  // configJson already carries "fieldMapping"/"currency" on the real API (see
  // CrmFieldMapping.cs) — this just gives a tenant a form instead of hand-editing
  // JSON. Mock mode has no backing connection row, so edits there live only in
  // this in-memory map for the length of the session.
  private readonly mockConfig = new Map<string, Record<string, unknown>>();
  protected readonly mappingConnection = signal<CrmSyncConnectionStatusDto | null>(null);
  protected readonly mappingLoading = signal(false);
  protected readonly mappingSaving = signal(false);
  protected readonly mappingError = signal<string | null>(null);
  protected readonly mappingCurrency = signal('');
  protected readonly mappingDeal = signal<Record<string, string>>({});
  protected readonly mappingContact = signal<Record<string, string>>({});

  protected readonly dealFields = computed(() => this.fieldsFor(DEAL_FIELDS));
  protected readonly contactFields = computed(() => this.fieldsFor(CONTACT_FIELDS));

  private fieldsFor(fields: MappableField[]): MappableField[] {
    const kind = this.mappingConnection()?.kind as 2 | 6 | undefined;
    return kind === undefined ? [] : fields.filter((f) => f.defaultByKind[kind] !== undefined);
  }

  protected defaultFor(field: MappableField, kind: number): string | undefined {
    return field.defaultByKind[kind as 2 | 6];
  }

  protected dealValue(key: string): string {
    return this.mappingDeal()[key] ?? '';
  }

  protected contactValue(key: string): string {
    return this.mappingContact()[key] ?? '';
  }

  constructor() {
    void this.loadCrm();
  }

  private async loadCrm(): Promise<void> {
    if (environment.useMockData) {
      this.crm.set(SEED_CRM);
      return;
    }
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
    return { 2: 'Zoho CRM', 6: 'HubSpot' }[kind] ?? `Kind ${kind}`;
  }

  protected async openMapping(connection: CrmSyncConnectionStatusDto): Promise<void> {
    this.mappingConnection.set(connection);
    this.mappingError.set(null);
    this.mappingCurrency.set('');
    this.mappingDeal.set({});
    this.mappingContact.set({});
    this.mappingLoading.set(true);

    try {
      const config = environment.useMockData
        ? (this.mockConfig.get(connection.connectionId) ?? {})
        : this.parseConfig((await firstValueFrom(this.integrations.get(connection.connectionId))).configJson);

      this.mappingCurrency.set(typeof config['currency'] === 'string' ? (config['currency'] as string) : '');
      const mapping = (config['fieldMapping'] as Record<string, Record<string, string>> | undefined) ?? {};
      this.mappingDeal.set({ ...(mapping['deal'] ?? {}) });
      this.mappingContact.set({ ...(mapping['contact'] ?? {}) });
    } catch (e: unknown) {
      this.mappingError.set(e instanceof Error ? e.message : 'Could not load the current configuration.');
    } finally {
      this.mappingLoading.set(false);
    }
  }

  protected closeMapping(): void {
    this.mappingConnection.set(null);
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
      const config = environment.useMockData
        ? { ...(this.mockConfig.get(connection.connectionId) ?? {}) }
        : this.parseConfig((await firstValueFrom(this.integrations.get(connection.connectionId))).configJson);

      const currency = this.mappingCurrency().trim();
      if (currency) {
        config['currency'] = currency;
      } else {
        delete config['currency'];
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

      if (environment.useMockData) {
        this.mockConfig.set(connection.connectionId, config);
      } else {
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
      }

      this.closeMapping();
    } catch (e: unknown) {
      this.mappingError.set(e instanceof Error ? e.message : 'The configuration could not be saved.');
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

  protected async createEndpoint(): Promise<void> {
    if (!/^https:\/\/.+/.test(this.url().trim())) {
      window.alert('The endpoint must be an https URL.');
      return;
    }
    if (this.events().size === 0) {
      window.alert('Pick at least one event to send.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.ops.createWebhook(this.url(), this.description(), [...this.events()]);
      this.dialogOpen.set(false);
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

  protected readonly relevantDeliveries = computed(() => {
    const id = this.selected()?.id;
    // The seeded deliveries are per-endpoint in the real API; in mock mode the
    // abandoned ones belong to the failing endpoint and the delivered ones do not.
    return id === 'wh-1'
      ? this.deliveries().filter((d) => d.state === 'abandoned')
      : this.deliveries().filter((d) => d.state !== 'abandoned');
  });

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
