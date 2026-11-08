import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import { SpaStatus } from '../../proxy/oem/oem-pricing.service';
import { SpaReportDto, SpaReportService } from '../../proxy/oem/spa-report.service';
import { ArBanner, ArButton, ArCard, ArStatTile } from '../../ui';
import { environment } from '../../../environments/environment';
import { SPA_STATUS_TEXT, rupees } from './oem.logic';

/** OEM pricing reports: claim ageing by OEM, margin recovered, special prices ending soon, and usage against the approved quantity. */
@Component({
  selector: 'ar-oem-reports-page',
  imports: [ArTopbar, ArBanner, ArButton, ArCard, ArStatTile, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './oem-reports-page.html',
  styleUrl: './oem-pages.scss',
})
export class ArOemReportsPage {
  private readonly api = inject(SpaReportService);

  protected readonly mock = environment.useMockData;
  protected readonly months = signal(12);
  protected readonly monthChoices = [3, 6, 12, 24];
  protected readonly report = signal<SpaReportDto | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly rupees = rupees;

  protected readonly outstanding = computed(() =>
    (this.report()?.ageing ?? []).reduce((n, r) => n + r.totalInPaise, 0),
  );
  protected readonly over90 = computed(() =>
    (this.report()?.ageing ?? []).reduce((n, r) => n + r.over90InPaise, 0),
  );
  protected readonly recovered = computed(() =>
    (this.report()?.recovered ?? []).reduce((n, r) => n + r.settledInPaise, 0),
  );

  constructor() {
    void this.load();
  }

  protected statusText(s: SpaStatus): string {
    return SPA_STATUS_TEXT[s];
  }

  protected rate(r: number | null | undefined): string {
    return r === null || r === undefined ? '—' : `${Math.round(r * 100)}%`;
  }

  protected setMonths(value: string): void {
    this.months.set(Number(value));
    void this.load();
  }

  protected async load(): Promise<void> {
    if (this.mock) return;
    const to = new Date();
    const from = new Date(to);
    from.setMonth(from.getMonth() - this.months());
    try {
      this.report.set(
        await firstValueFrom(
          this.api.get({
            fromUtc: from.toISOString(),
            toUtc: to.toISOString(),
            expiringWithinDays: 30,
          }),
        ),
      );
    } catch (e) {
      this.error.set(readApiError(e, 'The OEM pricing reports could not be loaded.'));
    }
  }
}
