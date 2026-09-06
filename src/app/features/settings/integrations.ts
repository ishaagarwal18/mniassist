import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { OpsService } from '../../core/services/ops.service';
import { WebhookSubscription } from '../../core/models/ops.model';
import { WebhookEvent } from '../../proxy/integrations/webhook-event.enum';
import { ArTopbar } from '../../layout/topbar';
import { ArBanner, ArButton, ArChip, ArDialog } from '../../ui';
import { ChipTone } from '../../ui/chip';

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

  protected readonly webhooks = this.ops.webhooks;
  protected readonly deliveries = this.ops.deliveries;
  protected readonly selectedId = signal<string | null>('wh-1');

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
