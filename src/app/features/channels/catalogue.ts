import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, of } from 'rxjs';

import {
  CatalogueProductAvailability,
  CatalogueProductDto,
  CatalogueService,
  CatalogueSyncState,
} from '../../proxy/commerce';
import { ChannelService } from '../../core/services/channel.service';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { ChipTone } from '../../ui/chip';

interface ProductForm {
  retailerId: string;
  name: string;
  description: string;
  priceRupees: number;
  imageUrl: string;
  inStock: boolean;
}

const STATE_TONE: Record<CatalogueSyncState, ChipTone> = {
  [CatalogueSyncState.Draft]: 'neutral',
  [CatalogueSyncState.Synced]: 'good',
  [CatalogueSyncState.Failed]: 'bad',
  [CatalogueSyncState.PendingDelete]: 'warn',
};

const STATE_LABEL: Record<CatalogueSyncState, string> = {
  [CatalogueSyncState.Draft]: 'Not synced',
  [CatalogueSyncState.Synced]: 'Synced',
  [CatalogueSyncState.Failed]: 'Sync failed',
  [CatalogueSyncState.PendingDelete]: 'Pending removal',
};

/**
 * WhatsApp commerce catalogue (M09-6). Products are edited here and pushed to the
 * channel's Meta catalogue on demand; Meta's product id comes back on the row so a
 * later edit updates rather than duplicates.
 */
@Component({
  selector: 'ar-catalogue',
  imports: [ArTopbar, ArButton, ArChip, ArDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './catalogue.html',
  styleUrl: './catalogue.scss',
})
export class ArCatalogue {
  private readonly api = inject(CatalogueService);
  private readonly channels = inject(ChannelService);

  protected readonly channelId = computed(() => this.channels.active()?.id);
  private readonly tick = signal(0);

  private readonly resource = rxResource({
    params: () => ({ channelId: this.channelId(), tick: this.tick() }),
    stream: ({ params }) =>
      params.channelId
        ? this.api.getList(params.channelId)
        : of({ items: [] as CatalogueProductDto[], totalCount: 0 }),
    defaultValue: { items: [] as CatalogueProductDto[], totalCount: 0 },
  });

  protected readonly products = computed(() => this.resource.value().items ?? []);
  protected readonly loading = computed(() => this.resource.isLoading());
  protected readonly pendingCount = computed(
    () => this.products().filter((p) => p.syncState !== CatalogueSyncState.Synced).length,
  );

  protected readonly syncing = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly note = signal<string | null>(null);

  // ---- editor dialog ---------------------------------------------------
  protected readonly dialogOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly form = signal<ProductForm>(this.blank());

  private blank(): ProductForm {
    return {
      retailerId: '',
      name: '',
      description: '',
      priceRupees: 0,
      imageUrl: '',
      inStock: true,
    };
  }

  protected tone(s: CatalogueSyncState): ChipTone {
    return STATE_TONE[s];
  }
  protected stateLabel(s: CatalogueSyncState): string {
    return STATE_LABEL[s];
  }
  protected rupees(paise: number): string {
    return `₹${(paise / 100).toLocaleString('en-IN')}`;
  }

  protected openAdd(): void {
    this.editingId.set(null);
    this.form.set(this.blank());
    this.error.set(null);
    this.dialogOpen.set(true);
  }

  protected openEdit(p: CatalogueProductDto): void {
    this.editingId.set(p.id);
    this.form.set({
      retailerId: p.retailerId,
      name: p.name,
      description: p.description ?? '',
      priceRupees: p.priceInPaise / 100,
      imageUrl: p.imageUrl ?? '',
      inStock: p.availability === CatalogueProductAvailability.InStock,
    });
    this.error.set(null);
    this.dialogOpen.set(true);
  }

  protected patch<K extends keyof ProductForm>(key: K, value: ProductForm[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  protected async save(): Promise<void> {
    const channelId = this.channelId();
    const f = this.form();
    if (!channelId) {
      this.error.set('Connect a channel first.');
      return;
    }
    if (!f.retailerId.trim() || !f.name.trim()) {
      this.error.set('A SKU and a name are required.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const body = {
      channelId,
      retailerId: f.retailerId.trim(),
      name: f.name.trim(),
      description: f.description.trim() || null,
      priceInPaise: Math.round(f.priceRupees * 100),
      currency: 'INR',
      imageUrl: f.imageUrl.trim() || null,
      availability: f.inStock
        ? CatalogueProductAvailability.InStock
        : CatalogueProductAvailability.OutOfStock,
    };
    try {
      const id = this.editingId();
      if (id) await firstValueFrom(this.api.update(id, body));
      else await firstValueFrom(this.api.create(body));
      this.dialogOpen.set(false);
      this.tick.update((n) => n + 1);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'The product could not be saved.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(p: CatalogueProductDto): Promise<void> {
    if (!window.confirm(`Remove "${p.name}" from the catalogue?`)) return;
    try {
      await firstValueFrom(this.api.delete(p.id));
      this.tick.update((n) => n + 1);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'The product could not be removed.');
    }
  }

  protected async sync(): Promise<void> {
    const channelId = this.channelId();
    if (!channelId) return;
    this.syncing.set(true);
    this.error.set(null);
    this.note.set(null);
    try {
      const r = await firstValueFrom(this.api.syncChannel(channelId));
      this.note.set(
        `Pushed ${r.pushed}, removed ${r.deleted}${r.failed ? `, ${r.failed} failed` : ''}.`,
      );
      this.tick.update((n) => n + 1);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'The sync could not be completed.');
    } finally {
      this.syncing.set(false);
    }
  }
}
