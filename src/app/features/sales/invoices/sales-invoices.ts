import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GridModule, RecordClickEventArgs } from '@syncfusion/ej2-angular-grids';
import { PermissionService } from '@abp/ng.core';

import { ConfirmService } from '../../../core/ui/confirm.service';
import { ToastService } from '../../../core/ui/toast.service';
import { CustomerScope, readCustomerScope } from '../../../core/util/customer-scope';
import { errorMessage } from '../../activities/activity-logic';
import { ArTopbar } from '../../../layout/topbar';
import { SalesInvoiceDto } from '../../../proxy/sales/sales-invoice.models';
import { SalesInvoiceService } from '../../../proxy/sales/sales-invoice.service';
import { SalesExportFormat, SalesInvoiceStatus } from '../../../proxy/sales/sales-enums';
import { ArButton, ArChip, ArIcon } from '../../../ui';
import { ArGrid } from '../../../ui/grid';
import { grantedPolicy } from '../../../core/auth/permission';
import {
  canCancelInvoice,
  canIssueInvoice,
  canPayInvoice,
  invoiceStatusLabel,
  invoiceStatusTone,
  isInvoiceOverdue,
  listQuery,
  newRecordQuery,
} from '../sales-records.logic';
import { ArSalesExport } from '../sales-export';

@Component({
  selector: 'ar-sales-invoices',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ArTopbar,
    ArButton,
    ArChip,
    ArIcon,
    ArSalesExport,
    ArGrid,
    GridModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sales-invoices.html',
  styleUrl: './sales-invoices.scss',
})
export class ArSalesInvoices {
  private readonly invoiceService = inject(SalesInvoiceService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);
  private readonly permissions = inject(PermissionService);

  /** Opened from Customer 360 for one customer or account: only their invoices. */
  protected readonly scope = signal<CustomerScope | null>(readCustomerScope());

  readonly SalesInvoiceStatus = SalesInvoiceStatus;

  protected readonly canCreate = grantedPolicy('AutoReach.SalesInvoices.Create', this.permissions);

  invoices = signal<SalesInvoiceDto[]>([]);
  loading = signal<boolean>(false);
  loadError = signal<string | null>(null);
  searchQuery = signal<string>('');
  selectedStatus = signal<SalesInvoiceStatus | null>(null);

  totalBilled = computed(() => this.invoices().reduce((acc, i) => acc + i.grandTotalInPaise, 0));
  totalCollected = computed(() => this.invoices().reduce((acc, i) => acc + i.paidAmountInPaise, 0));
  totalOutstanding = computed(() =>
    this.invoices().reduce((acc, i) => acc + i.balanceDueInPaise, 0),
  );

  readonly draftCount = computed(
    () => this.invoices().filter((i) => i.status === SalesInvoiceStatus.Draft).length,
  );
  readonly issuedCount = computed(
    () => this.invoices().filter((i) => i.status === SalesInvoiceStatus.Issued).length,
  );
  readonly partiallyPaidCount = computed(
    () => this.invoices().filter((i) => i.status === SalesInvoiceStatus.PartiallyPaid).length,
  );
  readonly paidCount = computed(
    () => this.invoices().filter((i) => i.status === SalesInvoiceStatus.Paid).length,
  );
  readonly overdueCount = computed(
    () => this.invoices().filter((i) => this.isOverdue(i)).length,
  );

  filteredInvoices = computed(() => {
    let list = this.invoices();
    const st = this.selectedStatus();
    if (st !== null) {
      list = list.filter((i) => i.status === st);
    }
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.invoiceNumber.toLowerCase().includes(q) ||
          i.customerName.toLowerCase().includes(q) ||
          (i.customerGstin && i.customerGstin.toLowerCase().includes(q)),
      );
    }
    return list;
  });

  /** Every invoice the list's customer, status and search match, not only the rows loaded. */
  protected readonly exportAll = (format: SalesExportFormat) =>
    this.invoiceService.export(
      {
        filter: this.searchQuery().trim() || undefined,
        status: this.selectedStatus() ?? undefined,
        customerId: this.scope()?.customerId ?? undefined,
        customerAccountId: this.scope()?.accountId ?? undefined,
      },
      format,
      { skipHandleError: true },
    );
  protected readonly exportName = () =>
    ['Sales invoices', this.scope()?.name, new Date().toISOString().slice(0, 10)]
      .filter(Boolean)
      .join(' ');

  constructor() {
    // ?open=<id> (older links) now opens the invoice's own page.
    const openId = this.route.snapshot.queryParamMap.get('open');
    if (openId) {
      void this.router.navigate(['/sales/invoices', openId], {
        queryParams: listQuery(this.scope()),
        replaceUrl: true,
      });
    } else {
      this.loadInvoices();
    }
  }

  setStatusFilter(status: SalesInvoiceStatus | null): void {
    this.selectedStatus.set(status);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  onSearchChange(text: string): void {
    this.searchQuery.set(text);
  }

  onInvoiceClick(e: RecordClickEventArgs): void {
    const target = e.target as HTMLElement | null;
    if (target?.closest('.si-row-actions, button, a')) return;
    const row = e.rowData as SalesInvoiceDto | undefined;
    if (row) this.openInvoice(row);
  }

  /** The invoice's own page (with the payment form open when `pay`), keeping this list's customer for Back. */
  openInvoice(inv: SalesInvoiceDto, pay = false) {
    if (inv.id)
      void this.router.navigate(['/sales/invoices', inv.id], {
        queryParams: { ...listQuery(this.scope()), pay: pay ? 1 : undefined },
      });
  }

  newInvoice() {
    void this.router.navigate(['/sales/invoices/new'], {
      queryParams: newRecordQuery(this.scope()),
    });
  }

  protected clearScope(): void {
    this.scope.set(null);
    void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    this.loadInvoices();
  }

  loadInvoices() {
    this.loading.set(true);
    this.invoiceService
      .getList({
        maxResultCount: 100,
        customerId: this.scope()?.customerId ?? undefined,
        customerAccountId: this.scope()?.accountId ?? undefined,
      })
      .subscribe({
        next: (res) => {
          this.invoices.set(res?.items ?? []);
          this.loadError.set(null);
          this.loading.set(false);
        },
        error: (e: unknown) => {
          this.loadError.set(errorMessage(e, 'Invoices could not be loaded.'));
          this.loading.set(false);
        },
      });
  }

  async confirmIssue(inv: SalesInvoiceDto): Promise<void> {
    if (!inv.id) return;
    const ok = await this.dialogs.confirm({
      title: `Issue invoice ${inv.invoiceNumber}?`,
      message:
        'Once issued, this invoice is finalized and customer ledger entries will be updated. Tax amounts will be locked.',
      confirmText: 'Issue invoice',
      cancelText: 'Keep draft',
      tone: 'primary',
    });
    if (!ok) return;

    this.issueInvoice(inv);
  }

  issueInvoice(inv: SalesInvoiceDto) {
    if (!inv.id) return;

    this.invoiceService.issue(inv.id).subscribe({
      next: (updated) => {
        this.updateInvoiceInList(updated);
        this.toasts.success(`Invoice ${inv.invoiceNumber} issued successfully.`);
      },
      error: (e: unknown) =>
        this.toasts.error(errorMessage(e, `${inv.invoiceNumber} could not be issued.`)),
    });
  }

  async confirmCancel(inv: SalesInvoiceDto): Promise<void> {
    if (!inv.id) return;
    const ok = await this.dialogs.confirm({
      title: `Cancel invoice ${inv.invoiceNumber}?`,
      message:
        'Once cancelled, no payment can be recorded against this invoice. This action cannot be undone.',
      confirmText: 'Cancel invoice',
      cancelText: 'Keep invoice',
      tone: 'danger',
    });
    if (!ok) return;

    this.invoiceService.cancel(inv.id).subscribe({
      next: (updated) => {
        this.updateInvoiceInList(updated);
        this.toasts.success(`Invoice ${inv.invoiceNumber} has been cancelled.`);
      },
      error: (e: unknown) =>
        this.toasts.error(errorMessage(e, `${inv.invoiceNumber} could not be cancelled.`)),
    });
  }

  private updateInvoiceInList(updated: SalesInvoiceDto) {
    this.invoices.update((list) => list.map((i) => (i.id === updated.id ? updated : i)));
  }

  isOverdue(inv: SalesInvoiceDto): boolean {
    return isInvoiceOverdue(inv);
  }

  readonly getStatusLabel = invoiceStatusLabel;
  readonly getStatusTone = invoiceStatusTone;
  readonly canIssue = canIssueInvoice;
  readonly canPay = canPayInvoice;
  readonly canCancel = canCancelInvoice;
}
