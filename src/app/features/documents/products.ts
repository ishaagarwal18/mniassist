import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { inr } from '../../core/util/format';
import { ArTopbar } from '../../layout/topbar';
import {
  CreateUpdateProductDto,
  ImportProductsResultDto,
  ProductDto,
  ProductService,
} from '../../proxy/library';
import { ArButton, ArChip, ArDialog, ArSearchBox } from '../../ui';
import { ArSelect } from '../../ui/select';
import { parseProductRows } from './product-import';

/**
 * The product catalogue: part numbers, what each is called and what it lists for. Quotation lines are
 * written from here, and a price list can override the price for a customer.
 */
@Component({
  selector: 'ar-products',
  imports: [ArTopbar, ArButton, ArChip, ArDialog, ArSearchBox, ArSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './products.html',
  styleUrl: './products.scss',
})
export class ArProducts {
  private readonly api = inject(ProductService);

  protected readonly filter = signal('');
  protected readonly category = signal('');
  protected readonly activeOnly = signal(false);
  private readonly tick = signal(0);

  private readonly resource = rxResource({
    params: () => ({
      filter: this.filter(),
      category: this.category(),
      activeOnly: this.activeOnly(),
      tick: this.tick(),
    }),
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
  protected readonly price = signal('');
  protected readonly categoryText = signal('');
  protected readonly hsn = signal('');
  /** Percent as typed; blank means the quotation's own rate. */
  protected readonly gst = signal('');
  protected readonly active = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly importOpen = signal(false);
  protected readonly pasted = signal('');
  protected readonly importResult = signal<ImportProductsResultDto | null>(null);

  protected money(paise: number): string {
    return inr(paise);
  }

  protected openNew(): void {
    this.editingId.set(null);
    this.partNumber.set('');
    this.name.set('');
    this.description.set('');
    this.unit.set('no');
    this.price.set('');
    this.categoryText.set('');
    this.hsn.set('');
    this.gst.set('');
    this.active.set(true);
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
    this.categoryText.set(p.category ?? '');
    this.hsn.set(p.hsnCode ?? '');
    this.gst.set(p.taxRateBasisPoints == null ? '' : String(p.taxRateBasisPoints / 100));
    this.active.set(p.isActive ?? true);
    this.error.set(null);
    this.editorOpen.set(true);
  }

  private toDto(): CreateUpdateProductDto {
    return {
      partNumber: this.partNumber().trim(),
      name: this.name().trim(),
      description: this.description().trim() || null,
      unit: this.unit().trim() || 'no',
      listPriceInPaise: Math.round((Number(this.price().replace(/,/g, '')) || 0) * 100),
      hsnCode: this.hsn().trim() || null,
      category: this.categoryText().trim() || null,
      taxRateBasisPoints:
        this.gst().trim() === '' ? null : Math.round((Number(this.gst()) || 0) * 100),
      isActive: this.active(),
    };
  }

  protected async save(): Promise<void> {
    const dto = this.toDto();
    if (!dto.partNumber || !dto.name) {
      this.error.set('A part number and a name are both needed.');
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
      this.editorOpen.set(false);
      this.tick.update((n) => n + 1);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Could not save the product.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(p: ProductDto): Promise<void> {
    if (!p.id || !confirm(`Delete ${p.partNumber}? Quotations already written keep their lines.`))
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
