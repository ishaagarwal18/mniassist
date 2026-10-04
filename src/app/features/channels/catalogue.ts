import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, of } from 'rxjs';

import {
  CatalogueProductAvailability,
  CatalogueProductDto,
  CatalogueService,
  CatalogueSyncState,
} from '../../proxy/commerce';
import { ChannelService } from '../../core/services/channel.service';
import { ProductDto, ProductService } from '../../proxy/library';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { ChipTone } from '../../ui/chip';
import { ConfirmService } from '../../core/ui/confirm.service';

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
  private readonly dialogs = inject(ConfirmService);
  private readonly api = inject(CatalogueService);
  private readonly channels = inject(ChannelService);
  private readonly productApi = inject(ProductService);

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

  /** Channels already checked this visit for listings that predate the product catalogue. */
  private readonly linkChecked = new Set<string>();

  constructor() {
    effect(() => {
      const id = this.channelId();
      if (!id || this.linkChecked.has(id)) return;
      this.linkChecked.add(id);
      untracked(() => void this.linkExisting(id));
    });
  }

  /** Listings typed in before the product catalogue existed are linked to the products whose SKUs they carry. */
  private async linkExisting(channelId: string): Promise<void> {
    try {
      const r = await firstValueFrom(this.api.linkExisting(channelId));
      if (r.linked > 0) {
        this.note.set(
          `${r.linked} listing${r.linked === 1 ? '' : 's'} matched a product by SKU and now follow${r.linked === 1 ? 's' : ''} it: name, description and price come from the product.`,
        );
        this.tick.update((n) => n + 1);
      }
    } catch {
      // Not being able to check is not worth an error on the page; the listings just stay as they are.
    }
  }

  protected readonly syncing = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly note = signal<string | null>(null);

  // ---- editor dialog ---------------------------------------------------
  protected readonly dialogOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly form = signal<ProductForm>(this.blank());
  /** The listing being edited comes from a product, so its name, description and price are the product's. */
  protected readonly linked = signal(false);

  // ---- add from the product catalogue ----------------------------------
  protected readonly fromProductsOpen = signal(false);
  protected readonly productFilter = signal('');
  protected readonly productChoices = signal<ProductDto[]>([]);
  protected readonly picked = signal<ReadonlySet<string>>(new Set());
  protected readonly adding = signal(false);
  protected readonly addNote = signal<string | null>(null);
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  /** Products already on this channel, so they are not offered again. */
  private readonly listedProductIds = computed(
    () =>
      new Set(
        this.products()
          .map((p) => p.productId)
          .filter((id): id is string => !!id),
      ),
  );
  protected readonly available = computed(() =>
    this.productChoices().filter((p) => !!p.id && !this.listedProductIds().has(p.id)),
  );

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

  protected async openFromProducts(): Promise<void> {
    this.picked.set(new Set());
    this.productFilter.set('');
    this.addNote.set(null);
    this.error.set(null);
    this.fromProductsOpen.set(true);
    await this.searchProducts();
  }

  protected onProductFilter(value: string): void {
    this.productFilter.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.searchProducts(), 250);
  }

  private async searchProducts(): Promise<void> {
    try {
      const page = await firstValueFrom(
        this.productApi.getList({
          filter: this.productFilter().trim() || null,
          activeOnly: true,
          skipCount: 0,
          maxResultCount: 50,
        }),
      );
      this.productChoices.set(page.items ?? []);
    } catch {
      this.productChoices.set([]);
    }
  }

  protected toggle(id: string, on: boolean): void {
    this.picked.update((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  protected async addPicked(): Promise<void> {
    const channelId = this.channelId();
    if (!channelId || this.picked().size === 0) return;
    this.adding.set(true);
    this.error.set(null);
    try {
      const r = await firstValueFrom(this.api.addFromProducts(channelId, [...this.picked()]));
      this.addNote.set(
        `Added ${r.added}.${r.skipped.length ? ' Not added: ' + r.skipped.join(' ') : ''}`,
      );
      this.picked.set(new Set());
      this.tick.update((n) => n + 1);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'The products could not be added.');
    } finally {
      this.adding.set(false);
    }
  }

  protected openAdd(): void {
    this.linked.set(false);
    this.editingId.set(null);
    this.form.set(this.blank());
    this.error.set(null);
    this.dialogOpen.set(true);
  }

  protected openEdit(p: CatalogueProductDto): void {
    this.linked.set(!!p.productId);
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
    if (
      !(await this.dialogs.confirm({
        title: 'Remove from the catalogue?',
        message: `“${p.name}” is removed from the WhatsApp catalogue.`,
        confirmText: 'Remove',
        tone: 'danger',
      }))
    )
      return;
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
