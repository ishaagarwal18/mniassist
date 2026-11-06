import { PermissionService } from '@abp/ng.core';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { CreateUpdatePriceListDto, PriceListDto, PriceListService } from '../../proxy/library';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { ArDateInput } from '../../ui/date-input';
import { ConfirmService } from '../../core/ui/confirm.service';

interface ItemRow {
  sku: string;
  description: string;
  price: string;
  uom: string;
  moq: string;
  /** The SKU names a product in the catalogue. */
  linked?: boolean;
}

/**
 * Region- and tier-scoped price lists for distributor broadcasts (M09-5). The
 * resolver picks the most specific active list per distributor contact.
 */
@Component({
  selector: 'ar-price-lists',
  imports: [NgTemplateOutlet, ArTopbar, ArButton, ArChip, ArDialog, ArDateInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isPage) {
      <ar-topbar title="Price lists">
        <button ar-button type="button" variant="ghost" (click)="close()">
          Back to price lists
        </button>
      </ar-topbar>
      <div class="ar-form-page">
        @if (loadError(); as e) {
          <p class="pl__err">{{ e }}</p>
        }
        @if (editorOpen()) {
          <ng-container *ngTemplateOutlet="editor" />
        }
      </div>
    } @else {
      <ar-topbar
        title="Price lists"
        subtitle="Region & distributor-tier pricing"
        help="Prices scoped by region and distributor tier. When a broadcast goes out, MNI Assist resolves the single most specific active list for each distributor automatically."
      >
        @if (canCreate()) {
          <button ar-button variant="primary" icon="plus" (click)="goNew()">New price list</button>
        }
      </ar-topbar>

      <div class="pl ar-scroll">
        @if (loading()) {
          <p class="pl__empty">Loading…</p>
        } @else if (lists().length === 0) {
          <p class="pl__empty">
            No price lists yet. Add one scoped to a region and a distributor tier.
          </p>
        }

        @for (l of lists(); track l.id) {
          <article class="pr" [class.pr--off]="!l.isActive">
            <div class="pr__main">
              <h2 class="pr__name">{{ l.name }}</h2>
              <p class="pr__scope">
                {{ l.region || 'Any region' }} · {{ l.distributorTier || 'Any tier' }} ·
                {{ (l.items || []).length }} SKU{{ (l.items || []).length === 1 ? '' : 's' }} · from
                {{ l.effectiveFrom }}
              </p>
            </div>
            @if (!l.isActive) {
              <ar-chip tone="warn">Inactive</ar-chip>
            }
            <div class="pr__act">
              @if (canUpdate()) {
                <button ar-button variant="ghost" (click)="goEdit(l)">Edit</button>
              }
              @if (canDelete()) {
                <button ar-button variant="ghost" (click)="remove(l)">Delete</button>
              }
            </div>
          </article>
        }
      </div>
    }

    <ng-template #editor>
      <ar-dialog
        [title]="editingId() ? 'Edit price list' : 'New price list'"
        width="min(760px, calc(100vw - 32px))"
        (dismiss)="close()"
      >
        <label class="ar-field">
          <span class="ar-field__label">Name</span>
          <input
            required
            maxlength="128"
            class="ar-field__input"
            [value]="name()"
            (input)="name.set($any($event.target).value)"
          />
        </label>
        <div class="ar-field-row">
          <label class="ar-field">
            <span class="ar-field__label"
              >Region <span class="ar-field__opt">blank = any</span></span
            >
            <input
              class="ar-field__input"
              [value]="region()"
              (input)="region.set($any($event.target).value)"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label"
              >Distributor tier <span class="ar-field__opt">blank = any</span></span
            >
            <input
              class="ar-field__input"
              [value]="tier()"
              (input)="tier.set($any($event.target).value)"
            />
          </label>
        </div>
        <label class="ar-field pl__narrow">
          <span class="ar-field__label">Effective from</span>
          <input
            required
            class="ar-field__input"
            type="date"
            [value]="effectiveFrom()"
            (input)="effectiveFrom.set($any($event.target).value)"
          />
        </label>

        <p class="ar-field__label">Items</p>
        @for (row of rows(); track $index) {
          <div class="pl__row">
            <input
              class="ar-field__input"
              placeholder="SKU"
              [value]="row.sku"
              (input)="setRow($index, 'sku', $any($event.target).value)"
            />
            <input
              class="ar-field__input"
              placeholder="Description"
              [value]="row.description"
              (input)="setRow($index, 'description', $any($event.target).value)"
            />
            <input
              class="ar-field__input"
              placeholder="Price ₹"
              [value]="row.price"
              (input)="setRow($index, 'price', $any($event.target).value)"
            />
            <button type="button" class="pl__x" (click)="removeRow($index)">×</button>
            @if (row.linked) {
              <span
                class="pl__link"
                title="This SKU is a product in your catalogue. Renaming the product renames it here."
                >in catalogue</span
              >
            }
          </div>
        }
        <button type="button" class="pl__addrow" (click)="addRow()">+ Add item</button>

        <label class="ar-field__opt-row">
          <input
            type="checkbox"
            [checked]="active()"
            (change)="active.set($any($event.target).checked)"
          />
          <span>Active</span>
        </label>

        @if (error(); as msg) {
          <p class="pl__err">{{ msg }}</p>
        }

        <div dialogActions>
          <button ar-button variant="ghost" (click)="close()">Cancel</button>
          <button ar-button variant="primary" [disabled]="busy()" (click)="save()">
            {{ busy() ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </ar-dialog>
    </ng-template>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }
    .pl {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 18px 24px 32px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 760px;
    }
    .pl__empty {
      margin: 8px 0;
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
    .pl__err {
      margin: 0;
      padding: 8px 10px;
      border-radius: var(--ar-radius-control);
      background: var(--ar-red-100);
      color: var(--ar-red-600);
      font: 500 12px var(--ar-font-sans);
    }
    .pl__narrow {
      max-width: 180px;
    }
    .pl__row {
      display: grid;
      grid-template-columns: 1fr 1.4fr 0.8fr 24px;
      gap: 6px;
      margin-bottom: 6px;
    }
    .pl__link {
      grid-column: 1 / -1;
      margin-top: -2px;
      font: 400 11px var(--ar-font-sans);
      color: var(--ar-teal-600);
    }
    .pl__x {
      background: none;
      border: 0;
      cursor: pointer;
      color: var(--ar-ink-400);
      font-size: 15px;
    }
    .pl__addrow {
      background: none;
      border: 0;
      padding: 0;
      cursor: pointer;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-teal-600);
    }
    .pr {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 13px 16px;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
    }
    .pr--off {
      opacity: 0.7;
    }
    .pr__main {
      flex: 1;
      min-width: 0;
    }
    .pr__name {
      margin: 0;
      font: 600 13px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .pr__scope {
      margin: 2px 0 0;
      font: 400 11.5px var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
    .pr__act {
      display: flex;
      gap: 6px;
    }
  `,
})
export class ArPriceLists {
  private readonly permissions = inject(PermissionService);
  private readonly dialogs = inject(ConfirmService);
  private readonly api = inject(PriceListService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** Which form this route shows as a page ('new', 'edit'), or the list. */
  protected readonly mode = (this.route.snapshot.data['mode'] as string | undefined) ?? 'list';
  protected readonly isPage = this.mode !== 'list';
  protected readonly loadError = signal<string | null>(null);

  protected readonly canCreate = grantedPolicy('AutoReach.Library.Create', this.permissions);
  protected readonly canUpdate = grantedPolicy('AutoReach.Library.Update', this.permissions);
  protected readonly canDelete = grantedPolicy('AutoReach.Library.Delete', this.permissions);

  private readonly tick = signal(0);
  private readonly resource = rxResource({
    params: () => (this.isPage ? undefined : { tick: this.tick() }),
    stream: () => this.api.getList({ skipCount: 0, maxResultCount: 100 }),
    defaultValue: { items: [] as PriceListDto[], totalCount: 0 },
  });
  protected readonly lists = computed(() => this.resource.value().items ?? []);
  protected readonly loading = computed(() => this.resource.isLoading());

  protected readonly editorOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly name = signal('');
  protected readonly region = signal('');
  protected readonly tier = signal('');
  protected readonly effectiveFrom = signal(new Date().toLocaleDateString('en-CA'));
  protected readonly active = signal(true);
  protected readonly rows = signal<ItemRow[]>([]);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    if (this.mode === 'new') this.openNew();
    else if (this.mode === 'edit') void this.loadForEdit(this.route.snapshot.paramMap.get('id'));
  }

  private async loadForEdit(id: string | null): Promise<void> {
    if (!id) return;
    try {
      this.openEdit(await firstValueFrom(this.api.get(id, { skipHandleError: true })));
    } catch {
      this.loadError.set('This price list could not be found. It may have been deleted.');
    }
  }

  protected goNew(): void {
    void this.router.navigate(['/documents/price-lists/new']);
  }
  protected goEdit(l: PriceListDto): void {
    if (l.id) void this.router.navigate(['/documents/price-lists', l.id, 'edit']);
  }
  /** Back to the list (Cancel, and after a save). */
  protected close(): void {
    this.editorOpen.set(false);
    if (this.isPage) void this.router.navigate(['/documents/price-lists']);
  }

  protected setRow(i: number, key: keyof ItemRow, value: string): void {
    this.rows.update((list) => list.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  }
  protected addRow(): void {
    this.rows.update((list) => [
      ...list,
      { sku: '', description: '', price: '', uom: 'each', moq: '1' },
    ]);
  }
  protected removeRow(i: number): void {
    this.rows.update((list) => list.filter((_, idx) => idx !== i));
  }

  protected openNew(): void {
    this.editingId.set(null);
    this.name.set('');
    this.region.set('');
    this.tier.set('');
    this.effectiveFrom.set(new Date().toLocaleDateString('en-CA'));
    this.active.set(true);
    this.rows.set([{ sku: '', description: '', price: '', uom: 'each', moq: '1' }]);
    this.error.set(null);
    this.editorOpen.set(true);
  }

  protected openEdit(l: PriceListDto): void {
    this.editingId.set(l.id ?? null);
    this.name.set(l.name ?? '');
    this.region.set(l.region ?? '');
    this.tier.set(l.distributorTier ?? '');
    this.effectiveFrom.set((l.effectiveFrom ?? new Date().toISOString()).slice(0, 10));
    this.active.set(l.isActive ?? true);
    this.rows.set(
      (l.items ?? []).map((i) => ({
        sku: i.sku ?? '',
        description: i.description ?? '',
        price: String((i.unitPriceInPaise ?? 0) / 100),
        uom: i.uom ?? 'each',
        moq: String(i.minimumOrderQuantity ?? 1),
        linked: !!i.productId,
      })),
    );
    this.error.set(null);
    this.editorOpen.set(true);
  }

  private toDto(): CreateUpdatePriceListDto {
    return {
      name: this.name().trim(),
      region: this.region().trim() || null,
      distributorTier: this.tier().trim() || null,
      currency: 'INR',
      effectiveFrom: this.effectiveFrom(),
      isActive: this.active(),
      items: this.rows()
        .filter((r) => r.sku.trim())
        .map((r) => ({
          sku: r.sku.trim(),
          description: r.description.trim() || null,
          unitPriceInPaise: Math.round((Number(r.price) || 0) * 100),
          uom: r.uom || 'each',
          minimumOrderQuantity: Number(r.moq) || 1,
        })),
    };
  }

  protected async save(): Promise<void> {
    if (!this.name().trim()) {
      this.error.set('A name is required.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      const id = this.editingId();
      if (id) await firstValueFrom(this.api.update(id, this.toDto()));
      else await firstValueFrom(this.api.create(this.toDto()));
      this.tick.update((n) => n + 1);
      this.close();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Could not save the price list.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(l: PriceListDto): Promise<void> {
    if (!l.id || !(await this.dialogs.delete('this price list', l.name))) return;
    await firstValueFrom(this.api.delete(l.id));
    this.tick.update((n) => n + 1);
  }
}
