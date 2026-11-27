import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import {
  BillingPlanService,
  BillingTrigger,
  DueMilestoneDto,
} from '../../proxy/project-billing/billing-plan.service';
import { ArButton, ArChip, ArIcon, ChipTone } from '../../ui';
import { TRIGGER_TEXT } from './billing.logic';

export type MilestoneFilterStatus = 'all' | 'ready' | 'draft' | 'late';

/**
 * Every billing milestone ready to invoice, across all project orders: accounts' daily financial list.
 * Ready two days or more highlights as late action required.
 */
@Component({
  selector: 'ar-milestones-due-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ArTopbar,
    ArButton,
    ArChip,
    ArIcon,
    RouterLink,
    DatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './milestones-due-page.html',
  styleUrl: './milestones-due-page.scss',
})
export class ArMilestonesDuePage {
  private readonly api = inject(BillingPlanService);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly rows = signal<DueMilestoneDto[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  // Search & Filter state
  protected readonly searchQuery = signal('');
  protected readonly selectedStatusFilter = signal<MilestoneFilterStatus>('all');
  protected readonly selectedCustomer = signal<string | null>(null);
  protected readonly selectedTrigger = signal<BillingTrigger | null>(null);

  protected readonly total = computed(() => this.rows().reduce((n, d) => n + d.billableInPaise, 0));
  protected readonly readyCount = computed(() => this.rows().filter((d) => !d.draftInvoiceId).length);
  protected readonly draftCount = computed(() => this.rows().filter((d) => !!d.draftInvoiceId).length);
  protected readonly lateCount = computed(() => this.rows().filter((d) => d.daysReady >= 2).length);

  protected readonly customers = computed(() =>
    Array.from(new Set(this.rows().map((d) => d.customerName).filter((c): c is string => !!c))).sort(),
  );

  protected readonly availableTriggers = computed(() =>
    Array.from(new Set(this.rows().map((d) => d.trigger))),
  );

  protected readonly isFiltered = computed(
    () =>
      !!this.searchQuery().trim() ||
      this.selectedStatusFilter() !== 'all' ||
      this.selectedCustomer() !== null ||
      this.selectedTrigger() !== null,
  );

  protected readonly filteredRows = computed(() => {
    let list = this.rows();

    // 1. Status Filter
    const st = this.selectedStatusFilter();
    if (st === 'ready') {
      list = list.filter((d) => !d.draftInvoiceId);
    } else if (st === 'draft') {
      list = list.filter((d) => !!d.draftInvoiceId);
    } else if (st === 'late') {
      list = list.filter((d) => d.daysReady >= 2);
    }

    // 2. Customer Filter
    const cust = this.selectedCustomer();
    if (cust) {
      list = list.filter((d) => d.customerName === cust);
    }

    // 3. Trigger Filter
    const trig = this.selectedTrigger();
    if (trig !== null) {
      list = list.filter((d) => d.trigger === trig);
    }

    // 4. Search Query
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(
        (d) =>
          (d.customerName && d.customerName.toLowerCase().includes(q)) ||
          d.orderNumber.toLowerCase().includes(q) ||
          d.milestone.toLowerCase().includes(q) ||
          this.triggerText(d.trigger).toLowerCase().includes(q),
      );
    }

    return list;
  });

  constructor() {
    void this.load();
  }

  protected rupees(paise: number): string {
    return '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  protected triggerText(t: BillingTrigger): string {
    return TRIGGER_TEXT[t] || 'Milestone condition';
  }

  protected triggerTone(t: BillingTrigger): ChipTone {
    switch (t) {
      case BillingTrigger.OrderConfirmed:
      case BillingTrigger.FatSigned:
      case BillingTrigger.SatSigned:
      case BillingTrigger.CommissioningSigned:
        return 'teal';
      case BillingTrigger.AdvanceReceived:
        return 'good';
      case BillingTrigger.Dispatch:
      case BillingTrigger.DispatchProRata:
        return 'amber';
      case BillingTrigger.Date:
      case BillingTrigger.Manual:
      default:
        return 'neutral';
    }
  }

  protected setStatusFilter(filter: MilestoneFilterStatus): void {
    this.selectedStatusFilter.set(filter);
  }

  protected onSearchChange(text: string): void {
    this.searchQuery.set(text);
  }

  protected clearSearch(): void {
    this.searchQuery.set('');
  }

  protected clearFilters(): void {
    this.searchQuery.set('');
    this.selectedStatusFilter.set('all');
    this.selectedCustomer.set(null);
    this.selectedTrigger.set(null);
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.rows.set(await firstValueFrom(this.api.getDue()));
    } catch (e) {
      this.error.set(readApiError(e, 'The milestones could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected async prepare(d: DueMilestoneDto): Promise<void> {
    this.busy.set(true);
    try {
      const draft = await firstValueFrom(this.api.createInvoiceDraft(d.milestoneId));
      this.toasts.success(`Draft ${draft.invoiceNumber} prepared: review and issue it.`);
      await this.router.navigate(['/sales/invoices', draft.invoiceId]);
    } catch (e) {
      this.toasts.error(readApiError(e, 'The invoice could not be prepared.'));
    } finally {
      this.busy.set(false);
    }
  }
}
