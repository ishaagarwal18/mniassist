import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import {
  CompetitorBrandDto,
  CompetitorBrandService,
  ProjectSettingsDto,
} from '../../proxy/projects/competitor-brand.service';
import { ArBanner, ArButton, ArCard, ArChip } from '../../ui';

/** "a; b , c" → ["a", "b", "c"]. */
function list(text: string): string[] {
  return text
    .split(/[;,\n]/)
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

/**
 * The workspace's competitor brands (named in specifications, given as the winner of a lost enquiry) and the project settings: the
 * makes we sell, and the product categories a specification is read by.
 */
@Component({
  selector: 'ar-competitors-page',
  imports: [ArTopbar, ArButton, ArBanner, ArCard, ArChip, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './competitors-page.html',
  styleUrl: './competitors-page.scss',
})
export class ArCompetitorsPage {
  private readonly api = inject(CompetitorBrandService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);

  protected readonly brands = signal<CompetitorBrandDto[]>([]);
  protected readonly settings = signal<ProjectSettingsDto | null>(null);
  protected readonly ourBrandsText = signal('');
  protected readonly categoriesText = signal('');
  protected readonly newName = signal('');
  protected readonly newMakes = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly loading = signal(true);

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [brands, settings] = await Promise.all([
        firstValueFrom(this.api.getList()),
        firstValueFrom(this.api.getSettings()),
      ]);
      this.brands.set(brands);
      this.settings.set(settings);
      this.ourBrandsText.set(settings.ourBrands.join(', '));
      this.categoriesText.set(settings.categories.join(', '));
    } catch (e) {
      this.error.set(readApiError(e, 'The brands could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected async addCommon(): Promise<void> {
    this.busy.set(true);
    try {
      const added = await firstValueFrom(this.api.addCommon());
      this.toasts.success(
        added
          ? `${added} brands added. Remove any you don't meet.`
          : 'They are all in the list already.',
      );
      this.brands.set(await firstValueFrom(this.api.getList()));
    } catch (e) {
      this.toasts.error(readApiError(e, 'The brands could not be added.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async add(): Promise<void> {
    const name = this.newName().trim();
    if (!name || this.busy()) return;
    this.busy.set(true);
    try {
      const created = await firstValueFrom(
        this.api.create({ name, makes: list(this.newMakes()), isActive: true }),
      );
      this.brands.update((brands) =>
        [...brands, created].sort((left, right) => left.name.localeCompare(right.name)),
      );
      this.newName.set('');
      this.newMakes.set('');
      this.toasts.success('Brand added.');
    } catch (e) {
      this.toasts.error(readApiError(e, 'The brand could not be added.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async toggle(b: CompetitorBrandDto): Promise<void> {
    await this.updateBrand(b, b.makes, !b.isActive);
  }

  protected async setMakes(b: CompetitorBrandDto, text: string): Promise<void> {
    await this.updateBrand(b, list(text), b.isActive);
  }

  private async updateBrand(
    b: CompetitorBrandDto,
    makes: string[],
    isActive: boolean,
  ): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const updated = await firstValueFrom(
        this.api.update(b.id, {
          name: b.name,
          makes,
          notes: b.notes,
          isActive,
        }),
      );
      this.brands.update((brands) => brands.map((brand) => (brand.id === b.id ? updated : brand)));
      this.toasts.success('Brand updated.');
    } catch (e) {
      this.toasts.error(readApiError(e, 'The brand could not be updated.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(b: CompetitorBrandDto): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: `Remove ${b.name}?`,
      message:
        'Specifications and lost enquiries that name it keep their record. Switching it off instead hides it from pickers.',
      confirmText: 'Remove',
    });
    if (!ok || this.busy()) return;
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.delete(b.id));
      this.brands.update((brands) => brands.filter((brand) => brand.id !== b.id));
      this.toasts.success('Brand removed.');
    } catch (e) {
      this.toasts.error(readApiError(e, 'The brand could not be removed.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected useCatalogue(): void {
    this.ourBrandsText.set((this.settings()?.catalogueMakes ?? []).join(', '));
  }

  protected async saveSettings(): Promise<void> {
    this.busy.set(true);
    try {
      const saved = await firstValueFrom(
        this.api.updateSettings({
          ourBrands: list(this.ourBrandsText()),
          categories: list(this.categoriesText()),
        }),
      );
      this.settings.set(saved);
      this.toasts.success('Project settings saved.');
    } catch (e) {
      this.toasts.error(readApiError(e, 'The settings could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }
}
