import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import {
  BankGuaranteeKind,
  BillingReportDto,
  BillingReportService,
} from '../../proxy/project-billing/bank-guarantee.service';
import { ArBanner, ArCard, ArStatTile } from '../../ui';
import { environment } from '../../../environments/environment';
import { BG_KIND_TEXT, expiryTone } from './guarantees.logic';

function rupees(paise: number): string {
  return '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

/** Project billing reports: billing status by order, retention due, and bank guarantees ending. */
@Component({
  selector: 'ar-billing-reports-page',
  imports: [ArTopbar, ArBanner, ArCard, ArStatTile, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './billing-reports-page.html',
  styleUrl: './milestones-due-page.scss',
})
export class ArBillingReportsPage {
  private readonly api = inject(BillingReportService);

  protected readonly mock = environment.useMockData;
  protected readonly within = signal(60);
  protected readonly report = signal<BillingReportDto | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly rupees = rupees;
  protected readonly expiryTone = expiryTone;

  constructor() {
    void this.load();
  }

  protected kindText(k: BankGuaranteeKind): string {
    return BG_KIND_TEXT[k];
  }

  protected setWithin(value: string): void {
    this.within.set(Number(value));
    void this.load();
  }

  private async load(): Promise<void> {
    if (this.mock) return;
    try {
      this.report.set(await firstValueFrom(this.api.get(this.within())));
    } catch (e) {
      this.error.set(readApiError(e, 'The billing reports could not be loaded.'));
    }
  }
}
