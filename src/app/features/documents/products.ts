import { PermissionService } from '@abp/ng.core';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { inr } from '../../core/util/format';
import { readApiError } from '../../core/util/api-error';
import { RATING_KEYS, ratingsOf } from '../pipeline/boq-import/boq-import.logic';
import { ToastService } from '../../core/ui/toast.service';
import { ArTopbar } from '../../layout/topbar';
import {
  CreateUpdateProductDto,
  ImportProductsResultDto,
  ProductDto,
  ProductService,
  ProductUnitDto,
} from '../../proxy/library';
import { ArButton, ArChip, ArDialog, ArSearchBox } from '../../ui';
import { ArSelect } from '../../ui/select';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { ArGrid } from '../../ui/grid';
import { parseProductRows } from './product-import';
import { ConfirmService } from '../../core/ui/confirm.service';

/**
 * The product catalogue: part numbers, what each is called and what it lists for. Quotation lines are
 * written from here, and a price list can override the price for a customer.
 */
@Component({
  selector: 'ar-products',
  imports: [
    NgTemplateOutlet,
    ArTopbar,
    ArButton,
    ArChip,
    ArDialog,
    ArSearchBox,
    ArSelect,
    ArGrid,
    GridModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './products.html',
  styleUrl: './products.scss',
})
export class ArProducts {
  private readonly permissions = inject(PermissionService);
  private readonly dialogs = inject(ConfirmService);
  private readonly toasts = inject(ToastService);
  private readonly api = inject(ProductService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** Which form this route shows as a page ('new', 'edit', 'import', 'units'), or the list. */
  protected readonly mode = (this.route.snapshot.data['mode'] as string | undefined) ?? 'list';
  protected readonly isPage = this.mode !== 'list';
  /** The product an edit page could not load. */
  protected readonly loadError = signal<string | null>(null);

  protected readonly canCreate = grantedPolicy('AutoReach.Library.Create', this.permissions);
  protected readonly canUpdate = grantedPolicy('AutoReach.Library.Update', this.permissions);
  protected readonly canDelete = grantedPolicy('AutoReach.Library.Delete', this.permissions);

  protected readonly filter = signal('');
  protected readonly category = signal('');
  protected readonly activeOnly = signal(false);
  private readonly tick = signal(0);

  private readonly resource = rxResource({
    params: () =>
      this.isPage
        ? undefined
        : {
            filter: this.filter(),
            category: this.category(),
            activeOnly: this.activeOnly(),
            tick: this.tick(),
          },
    stream: ({ params }) =>
      this.api.getList({
        filter: params.filter || null,
        category: params.category || null,
        activeOnly: params.activeOnly || null,
        skipCount: 0,
        maxResultCount: 200,
      }),
    defaultValue: { items: [] as ProductDto[], totalCount: 0 },
  });
  private readonly categoryResource = rxResource({
    params: () => ({ tick: this.tick() }),
    stream: () => this.api.getCategories(),
    defaultValue: [] as string[],
  });

  protected readonly products = computed(() => this.resource.value().items ?? []);
  protected readonly total = computed(() => this.resource.value().totalCount ?? 0);
  protected readonly loading = computed(() => this.resource.isLoading());
  protected readonly categories = computed(() => this.categoryResource.value());

  protected readonly editorOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly partNumber = signal('');
  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly unit = signal('no');
  /** The sales price in rupees, as typed. */
  protected readonly price = signal('');
  /** The purchase price in rupees, as typed; blank when not recorded. */
  protected readonly purchasePrice = signal('');
  protected readonly categoryText = signal('');
  protected readonly hsn = signal('');
  /** Percent as typed; blank means the quotation's own rate. */
  protected readonly gst = signal('');
  protected readonly active = signal(true);
  protected readonly make = signal('');
  protected readonly series = signal('');
  /** Ratings for BOQ matching, as rows of the form. */
  protected readonly ratings = signal<{ key: string; value: string }[]>([]);
  protected readonly ratingKeys = RATING_KEYS;
  protected readonly filling = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  // ---- Units of measure ---------------------------------------------------------------------
  protected readonly units = signal<ProductUnitDto[]>([]);
  protected readonly unitsLoading = signal(false);
  protected readonly addingUnit = signal(false);
  protected readonly newUnit = signal('');
  protected readonly unitError = signal<string | null>(null);
  /** The choices for the Unit list: the workspace's units, and the product's own when it is not one of them. */
  protected readonly unitOptions = computed(() => {
    const names = this.units().map((u) => u.name);
    const current = this.unit().trim();
    return current && !names.some((n) => n.toLowerCase() === current.toLowerCase())
      ? [current, ...names]
      : names;
  });
  /** Sales price less purchase price, and as a share of the sales price; null without both. */
  protected readonly margin = computed(() => {
    const sell = Number(this.price().replace(/,/g, ''));
    const buy = Number(this.purchasePrice().replace(/,/g, ''));
    if (!this.purchasePrice().trim() || !(sell > 0) || !Number.isFinite(buy)) return null;
    const paise = Math.round((sell - buy) * 100);
    return { paise, percent: Math.round(((sell - buy) / sell) * 1000) / 10 };
  });

  protected readonly importOpen = signal(false);
  protected readonly pasted = signal('');
  protected readonly importResult = signal<ImportProductsResultDto | null>(null);

  constructor() {
    if (this.mode === 'new') this.openNew();
    else if (this.mode === 'import') this.openImport();
    else if (this.mode === 'edit') void this.loadForEdit(this.route.snapshot.paramMap.get('id'));
    if (this.mode === 'new' || this.mode === 'edit' || this.mode === 'units') void this.loadUnits();
  }

  private async loadForEdit(id: string | null): Promise<void> {
    if (!id) return;
    try {
      this.openEdit(await firstValueFrom(this.api.get(id, { skipHandleError: true })));
    } catch {
      this.loadError.set('This product could not be found. It may have been deleted.');
    }
  }

  // The list opens each form as its own page.
  protected goNew(): void {
    void this.router.navigate(['/documents/products/new']);
  }
  protected goImport(): void {
    void this.router.navigate(['/documents/products/import']);
  }
  protected goUnits(): void {
    void this.router.navigate(['/documents/products/units']);
  }
  protected goEdit(p: ProductDto): void {
    if (p.id) void this.router.navigate(['/documents/products', p.id, 'edit']);
  }
  /** Back to the list (the page's Cancel and Close, and after a save). */
  protected close(): void {
    this.editorOpen.set(false);
    this.importOpen.set(false);
    if (this.isPage) void this.router.navigate(['/documents/products']);
  }

  private async loadUnits(): Promise<void> {
    this.unitsLoading.set(true);
    try {
      this.units.set(await firstValueFrom(this.api.getUnits({ skipHandleError: true })));
    } catch {
      this.unitError.set('The unit list could not be loaded.');
    } finally {
      this.unitsLoading.set(false);
    }
  }

  /** The Unit list's last choice opens a box to add a unit. */
  protected onUnitChange(value: string): void {
    if (value === '__add__') {
      this.newUnit.set('');
      this.unitError.set(null);
      this.addingUnit.set(true);
      return;
    }
    this.unit.set(value);
  }

  /** Adds a unit to the workspace's list; from the product form it is chosen for the product too. */
  protected async addUnit(choose = true): Promise<void> {
    const name = this.newUnit().trim();
    if (!name) {
      this.unitError.set('Type the unit, e.g. Box or Kg.');
      return;
    }
    if (name.length > 16) {
      this.unitError.set('A unit has at most 16 characters.');
      return;
    }
    this.unitError.set(null);
    try {
      const added = await firstValueFrom(this.api.addUnit(name, { skipHandleError: true }));
      this.units.update((list) =>
        list.some((u) => u.name.toLowerCase() === added.name.toLowerCase())
          ? list
          : [...list, added].sort((a, b) => a.name.localeCompare(b.name)),
      );
      if (choose) this.unit.set(added.name);
      this.newUnit.set('');
      this.addingUnit.set(false);
    } catch (e: unknown) {
      this.unitError.set(readApiError(e, 'The unit could not be added.'));
    }
  }

  protected cancelAddUnit(): void {
    this.addingUnit.set(false);
    this.unitError.set(null);
  }

  protected usage(u: ProductUnitDto): string {
    return u.productCount
      ? u.productCount + ' product' + (u.productCount === 1 ? '' : 's')
      : 'Not used';
  }

  protected async removeUnit(u: ProductUnitDto): Promise<void> {
    if (u.productCount > 0) return;
    if (
      !(await this.dialogs.delete(
        'this unit',
        u.name,
        'Products already using it are not changed.',
      ))
    )
      return;
    this.unitError.set(null);
    try {
      await firstValueFrom(this.api.deleteUnit(u.name, { skipHandleError: true }));
      this.units.update((list) => list.filter((x) => x.name !== u.name));
    } catch (e: unknown) {
      this.unitError.set(readApiError(e, 'The unit could not be removed.'));
    }
  }

  protected money(paise: number): string {
    return inr(paise);
  }

  protected openNew(): void {
    this.editingId.set(null);
    this.partNumber.set('');
    this.name.set('');
    this.description.set('');
    this.unit.set('Nos');
    this.price.set('');
    this.purchasePrice.set('');
    this.categoryText.set('');
    this.hsn.set('');
    this.gst.set('');
    this.active.set(true);
    this.make.set('');
    this.series.set('');
    this.ratings.set([]);
    this.error.set(null);
    this.editorOpen.set(true);
  }

  protected gstLabel(p: ProductDto): string {
    return p.taxRateBasisPoints == null ? '—' : `${p.taxRateBasisPoints / 100}%`;
  }

  protected openEdit(p: ProductDto): void {
    this.editingId.set(p.id ?? null);
    this.partNumber.set(p.partNumber ?? '');
    this.name.set(p.name ?? '');
    this.description.set(p.description ?? '');
    this.unit.set(p.unit ?? 'no');
    this.price.set(String((p.listPriceInPaise ?? 0) / 100));
    this.purchasePrice.set(
      p.purchasePriceInPaise == null ? '' : String(p.purchasePriceInPaise / 100),
    );
    this.categoryText.set(p.category ?? '');
    this.hsn.set(p.hsnCode ?? '');
    this.gst.set(p.taxRateBasisPoints == null ? '' : String(p.taxRateBasisPoints / 100));
    this.active.set(p.isActive ?? true);
    this.make.set(p.make ?? '');
    this.series.set(p.series ?? '');
    this.ratings.set(Object.entries(p.attributes ?? {}).map(([key, value]) => ({ key, value })));
    this.error.set(null);
    this.editorOpen.set(true);
  }

  protected addRating(): void {
    const used = new Set(this.ratings().map((r) => r.key));
    const next = RATING_KEYS.find((k) => !used.has(k.key))?.key ?? '';
    this.ratings.update((rows) => [...rows, { key: next, value: '' }]);
  }

  protected setRating(index: number, change: Partial<{ key: string; value: string }>): void {
    this.ratings.update((rows) => rows.map((r, i) => (i === index ? { ...r, ...change } : r)));
  }

  protected removeRating(index: number): void {
    this.ratings.update((rows) => rows.filter((_, i) => i !== index));
  }

  protected ratingUnit(key: string): string {
    return RATING_KEYS.find((k) => k.key === key)?.unit ?? '';
  }

  /** Reads the ratings each product's name states into products that have none yet. */
  protected async fillRatings(): Promise<void> {
    this.filling.set(true);
    try {
      const n = await firstValueFrom(this.api.fillAttributes(false));
      this.toasts.success(
        n
          ? `Ratings stored for ${n} product${n === 1 ? '' : 's'}. Check them on each product.`
          : 'No product names stated ratings that were not stored already.',
      );
      this.resource.reload();
    } catch (e) {
      this.toasts.error(readApiError(e, 'The ratings could not be filled.'));
    } finally {
      this.filling.set(false);
    }
  }

  private toDto(): CreateUpdateProductDto {
    return {
      partNumber: this.partNumber().trim(),
      name: this.name().trim(),
      description: this.description().trim() || null,
      unit: this.unit().trim() || 'no',
      listPriceInPaise: Math.round((Number(this.price().replace(/,/g, '')) || 0) * 100),
      purchasePriceInPaise:
        this.purchasePrice().trim() === ''
          ? null
          : Math.round((Number(this.purchasePrice().replace(/,/g, '')) || 0) * 100),
      hsnCode: this.hsn().trim() || null,
      category: this.categoryText().trim() || null,
      taxRateBasisPoints:
        this.gst().trim() === '' ? null : Math.round((Number(this.gst()) || 0) * 100),
      isActive: this.active(),
      make: this.make().trim() || null,
      series: this.series().trim() || null,
      attributes: ratingsOf(this.ratings()),
    };
  }

  protected async save(): Promise<void> {
    const dto = this.toDto();
    if (!dto.partNumber || !dto.name) {
      this.error.set('A part number and a name are both needed.');
      return;
    }
    if (
      this.purchasePrice().trim() &&
      !Number.isFinite(Number(this.purchasePrice().replace(/,/g, '')))
    ) {
      this.error.set('The purchase price must be a number.');
      return;
    }
    if (
      dto.taxRateBasisPoints != null &&
      (dto.taxRateBasisPoints < 0 || dto.taxRateBasisPoints > 3000)
    ) {
      this.error.set('GST must be between 0% and 30%.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      const id = this.editingId();
      if (id) await firstValueFrom(this.api.update(id, dto));
      else await firstValueFrom(this.api.create(dto));
      this.tick.update((n) => n + 1);
      this.close();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Could not save the product.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(p: ProductDto): Promise<void> {
    if (
      !p.id ||
      !(await this.dialogs.delete(
        'this product',
        p.partNumber,
        'Quotations already written keep their lines.',
      ))
    )
      return;
    await firstValueFrom(this.api.delete(p.id));
    this.tick.update((n) => n + 1);
  }

  protected openImport(): void {
    this.pasted.set('');
    this.importResult.set(null);
    this.error.set(null);
    this.importOpen.set(true);
  }

  protected async runImport(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const result = await firstValueFrom(this.api.import(parseProductRows(this.pasted())));
      this.importResult.set(result);
      this.tick.update((n) => n + 1);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'The import failed.');
    } finally {
      this.busy.set(false);
    }
  }
}
