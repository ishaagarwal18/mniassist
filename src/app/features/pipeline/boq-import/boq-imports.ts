import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { firstValueFrom } from 'rxjs';

import { readApiError } from '../../../core/util/api-error';
import { ArTopbar } from '../../../layout/topbar';
import {
  BoqImportListItemDto,
  BoqImportService,
  BoqImportSource,
  BoqImportState,
} from '../../../proxy/pipeline/boq-import.service';
import type { ChipTone } from '../../../ui/chip';
import { ArBanner, ArButton, ArChip } from '../../../ui';
import { ArGrid } from '../../../ui/grid';
import { STATE_LABEL, STATE_TONE } from './boq-import.logic';

/** Every file import, newest first: the ones still reading, the ones waiting for review, and those already drafted. */
@Component({
  selector: 'ar-boq-imports',
  imports: [ArTopbar, ArButton, ArBanner, ArChip, ArGrid, GridModule, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './boq-imports.html',
  styleUrl: './boq-imports.scss',
})
export class ArBoqImports {
  private readonly api = inject(BoqImportService);

  protected readonly Source = BoqImportSource;

  protected readonly rows = signal<BoqImportListItemDto[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    void this.load();
  }

  protected label(s: BoqImportState): string {
    return STATE_LABEL[s];
  }

  protected tone(s: BoqImportState): ChipTone {
    return STATE_TONE[s];
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    try {
      const page = await firstValueFrom(this.api.getList({ maxResultCount: 200 }));
      this.rows.set(page.items ?? []);
      this.total.set(page.totalCount ?? 0);
      this.error.set(null);
    } catch (e) {
      this.error.set(readApiError(e, 'The imports could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }
}
