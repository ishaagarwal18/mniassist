import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { OpsService } from '../../core/services/ops.service';
import { WebhookSubscription } from '../../core/models/ops.model';
import { ArTopbar } from '../../layout/topbar';
import { ArBanner, ArButton, ArChip } from '../../ui';
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
  imports: [ArTopbar, ArBanner, ArButton, ArChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './integrations.html',
  styleUrl: './integrations.scss',
})
export class ArIntegrations {
  private readonly ops = inject(OpsService);

  protected readonly webhooks = this.ops.webhooks;
  protected readonly deliveries = this.ops.deliveries;
  protected readonly selectedId = signal<string | null>('wh-1');

  protected readonly selected = computed<WebhookSubscription | null>(
    () => this.webhooks().find(w => w.id === this.selectedId()) ?? this.webhooks()[0] ?? null,
  );

  protected readonly disabledCount = computed(() => this.webhooks().filter(w => !w.enabled).length);

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
      ? this.deliveries().filter(d => d.state === 'abandoned')
      : this.deliveries().filter(d => d.state !== 'abandoned');
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
