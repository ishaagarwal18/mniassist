import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GridModule, RecordClickEventArgs } from '@syncfusion/ej2-angular-grids';
import { ToastService } from '../../../core/ui/toast.service';
import { CustomerScope, readCustomerScope } from '../../../core/util/customer-scope';
import { errorMessage } from '../../activities/activity-logic';
import { environment } from '../../../../environments/environment';
import { ArTopbar } from '../../../layout/topbar';
import { SalesInvoiceDto } from '../../../proxy/sales/sales-invoice.models';
import { SalesInvoiceService } from '../../../proxy/sales/sales-invoice.service';
import { SalesExportFormat, SalesInvoiceStatus } from '../../../proxy/sales/sales-enums';
import { ArButton, ArChip } from '../../../ui';
import { ArGrid } from '../../../ui/grid';
import { PermissionService } from '@abp/ng.core';
import { grantedPolicy } from '../../../core/auth/permission';
import {
  canIssueInvoice,
  canPayInvoice,
  invoiceStatusLabel,
  invoiceStatusTone,
  isInvoiceOverdue,
  listQuery,
  newRecordQuery,
} from '../sales-records.logic';
import { MOCK_INVOICES } from './sales-invoices.mock';
import { ArSalesExport } from '../sales-export';

@Component({
  selector: 'ar-sales-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule, ArTopbar, ArButton, ArChip, ArSalesExport, ArGrid, GridModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Commercial sales invoices"
      subtitle="Statutory GST commercial tax invoices, credit notes and debit notes with itemized tax breakdowns and payment receipts."
      help="Issue GST invoices against orders or delivery challans. Compute statutory CGST+SGST or IGST automatically, track outstanding customer balances, and record payments received."
    >
      @if (canCreate()) {
        <ar-sales-export
          [fetch]="exportAll"
          [fileName]="exportName()"
          label="Export "
          hint="Every invoice the filters show"
        />
        <button ar-button type="button" variant="primary" icon="plus" (click)="newInvoice()">
          New sales invoice
        </button>
      }
    </ar-topbar>

    <div class="invoices-shell">
      @if (scope(); as sc) {
        <p class="scope-bar" role="status">
          Showing only {{ sc.name || 'this customer' }}'s invoices.
          <button type="button" class="scope-bar__all" (click)="clearScope()">
            Show all invoices
          </button>
        </p>
      }
      @if (loadError(); as e) {
        <p class="load-error" role="alert">
          {{ e }}
          <button ar-button variant="ghost" (click)="loadInvoices()">Try again</button>
        </p>
      }
      <!-- Summary metrics cards -->
      <div class="metrics-row">
        <div class="metric-card">
          <span class="m-lbl">Total billed</span>
          <span class="m-val">₹{{ totalBilled() / 100 | number: '1.2-2' }}</span>
        </div>
        <div class="metric-card">
          <span class="m-lbl">Collections received</span>
          <span class="m-val text-success">₹{{ totalCollected() / 100 | number: '1.2-2' }}</span>
        </div>
        <div class="metric-card">
          <span class="m-lbl">Outstanding balance</span>
          <span class="m-val text-danger">₹{{ totalOutstanding() / 100 | number: '1.2-2' }}</span>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-bar">
        <div class="search-input-wrap">
          <input
            type="text"
            class="ar-input"
            placeholder="Search invoice #, customer or GSTIN..."
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
          />
        </div>
        <div class="status-pills">
          <button
            class="pill-btn"
            [class.active]="selectedStatus() === null"
            (click)="selectedStatus.set(null)"
          >
            All ({{ invoices().length }})
          </button>
          <button
            class="pill-btn"
            [class.active]="selectedStatus() === SalesInvoiceStatus.Draft"
            (click)="selectedStatus.set(SalesInvoiceStatus.Draft)"
          >
            Draft
          </button>
          <button
            class="pill-btn"
            [class.active]="selectedStatus() === SalesInvoiceStatus.Issued"
            (click)="selectedStatus.set(SalesInvoiceStatus.Issued)"
          >
            Issued
          </button>
          <button
            class="pill-btn"
            [class.active]="selectedStatus() === SalesInvoiceStatus.PartiallyPaid"
            (click)="selectedStatus.set(SalesInvoiceStatus.PartiallyPaid)"
          >
            Partially Paid
          </button>
          <button
            class="pill-btn"
            [class.active]="selectedStatus() === SalesInvoiceStatus.Paid"
            (click)="selectedStatus.set(SalesInvoiceStatus.Paid)"
          >
            Paid
          </button>
        </div>
      </div>

      <!-- Invoices Table -->
      <div class="table-card">
        <ejs-grid
          arGrid="sales-invoices"
          [dataSource]="filteredInvoices()"
          (recordClick)="onInvoiceClick($event)"
          aria-label="Sales invoices"
        >
          <e-columns>
            <e-column field="invoiceNumber" headerText="Invoice #" width="160">
              <ng-template #template let-inv>
                <span class="font-mono font-bold text-primary">{{ inv.invoiceNumber }}</span>
              </ng-template>
            </e-column>
            <e-column field="customerName" headerText="Customer" width="220">
              <ng-template #template let-inv>
                <div class="font-semibold">{{ inv.customerName }}</div>
                @if (inv.customerGstin) {
                  <div class="font-mono text-xs text-muted">{{ inv.customerGstin }}</div>
                }
              </ng-template>
            </e-column>
            <e-column field="issueDateUtc" headerText="Issue Date" width="130">
              <ng-template #template let-inv>
                {{ inv.issueDateUtc | date: 'dd MMM yyyy' }}
              </ng-template>
            </e-column>
            <e-column field="dueDateUtc" headerText="Due Date" width="130">
              <ng-template #template let-inv>
                <span [class.text-danger]="isOverdue(inv)">
                  {{ inv.dueDateUtc | date: 'dd MMM yyyy' }}
                </span>
              </ng-template>
            </e-column>
            <e-column field="subtotalInPaise" headerText="Subtotal" textAlign="Right" width="130">
              <ng-template #template let-inv>
                <span class="num-col">₹{{ inv.subtotalInPaise / 100 | number: '1.2-2' }}</span>
              </ng-template>
            </e-column>
            <e-column field="totalTaxInPaise" headerText="GST" textAlign="Right" width="120">
              <ng-template #template let-inv>
                <span class="num-col">₹{{ inv.totalTaxInPaise / 100 | number: '1.2-2' }}</span>
              </ng-template>
            </e-column>
            <e-column field="grandTotalInPaise" headerText="Grand Total" textAlign="Right" width="140">
              <ng-template #template let-inv>
                <span class="num-col font-bold">
                  ₹{{ inv.grandTotalInPaise / 100 | number: '1.2-2' }}
                </span>
              </ng-template>
            </e-column>
            <e-column field="balanceDueInPaise" headerText="Balance Due" textAlign="Right" width="140">
              <ng-template #template let-inv>
                <span class="num-col font-bold" [class.text-danger]="inv.balanceDueInPaise > 0">
                  ₹{{ inv.balanceDueInPaise / 100 | number: '1.2-2' }}
                </span>
              </ng-template>
            </e-column>
            <e-column field="status" headerText="Status" width="130">
              <ng-template #template let-inv>
                <ar-chip [tone]="getStatusTone(inv.status)">
                  {{ getStatusLabel(inv.status) }}
                </ar-chip>
              </ng-template>
            </e-column>
            <e-column headerText="Actions" width="200">
              <ng-template #template let-inv>
                <div class="row-actions">
                  <button class="action-btn" (click)="openInvoice(inv)">View</button>
                  @if (canIssue(inv)) {
                    <button class="action-btn primary" (click)="issueInvoice(inv)">Issue</button>
                  }
                  @if (canPay(inv)) {
                    <button class="action-btn success" (click)="openInvoice(inv, true)">
                      Pay
                    </button>
                  }
                </div>
              </ng-template>
            </e-column>
          </e-columns>
        </ejs-grid>
      </div>
    </div>
  `,
  styles: [
    `
      .scope-bar {
        margin: 0;
        padding: 0.6rem 0.9rem;
        border: 1px solid var(--ar-line-200);
        border-radius: 8px;
        background: var(--ar-blue-100, #eff6ff);
        font-size: 0.8125rem;
      }
      .scope-bar__all {
        margin-left: 0.5rem;
        background: none;
        border: 0;
        padding: 0;
        color: var(--ar-primary, #0284c7);
        font-weight: 600;
        cursor: pointer;
      }
      .load-error {
        margin: 0;
        padding: 0.75rem 1rem;
        border: 1px solid var(--ar-bad-200, #fecaca);
        border-radius: 8px;
        background: var(--ar-bad-50, #fef2f2);
        color: var(--ar-bad-700, #b91c1c);
      }
      .load-error button {
        margin-left: 0.5rem;
      }
      .invoices-shell {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }
      .metrics-row {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
      }
      .metric-card {
        background: var(--ar-surface, #ffffff);
        border: 1px solid var(--ar-line, #e2e8f0);
        padding: 1rem 1.25rem;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .m-lbl {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        color: var(--ar-ink-muted, #64748b);
      }
      .m-val {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--ar-ink-heavy, #0f172a);
      }
      .text-success {
        color: #059669;
      }
      .text-danger {
        color: #dc2626;
      }
      .filters-bar {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
      }
      .search-input-wrap {
        flex: 1;
        min-width: 280px;
        max-width: 450px;
      }
      .ar-input {
        width: 100%;
        padding: 0.5rem 0.75rem;
        border-radius: 6px;
        border: 1px solid var(--ar-line-strong, #cbd5e1);
        background: var(--ar-surface, #ffffff);
        color: var(--ar-ink-heavy, #0f172a);
        font-size: 0.875rem;
      }
      .status-pills {
        display: flex;
        gap: 0.375rem;
        flex-wrap: wrap;
      }
      .pill-btn {
        padding: 0.375rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 500;
        background: var(--ar-surface-sunken, #f1f5f9);
        border: 1px solid var(--ar-line, #e2e8f0);
        color: var(--ar-ink-muted, #64748b);
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .pill-btn.active {
        background: var(--ar-primary, #0284c7);
        color: #ffffff;
        border-color: var(--ar-primary, #0284c7);
      }
      .table-card {
        background: var(--ar-surface, #ffffff);
        border: 1px solid var(--ar-line, #e2e8f0);
        border-radius: 8px;
        overflow-x: auto;
      }
      .ar-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.875rem;
        text-align: left;
      }
      .ar-table th {
        background: var(--ar-surface-sunken, #f8fafc);
        color: var(--ar-ink-muted, #64748b);
        font-weight: 600;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--ar-line, #e2e8f0);
      }
      .ar-table td {
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--ar-line-weak, #f1f5f9);
        color: var(--ar-ink-heavy, #0f172a);
      }
      .inv-row {
        cursor: pointer;
        transition: background-color 0.1s ease;
      }
      .inv-row:hover {
        background-color: var(--ar-surface-hover, #f8fafc);
      }
      .num-col {
        text-align: right;
      }
      .actions-col {
        text-align: right;
        width: 140px;
      }
      .row-actions {
        display: flex;
        gap: 0.25rem;
        justify-content: flex-end;
      }
      .action-btn {
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
        border-radius: 4px;
        border: 1px solid var(--ar-line-strong, #cbd5e1);
        background: var(--ar-surface, #ffffff);
        color: var(--ar-ink-heavy, #0f172a);
        cursor: pointer;
      }
      .action-btn.primary {
        background: var(--ar-primary, #0284c7);
        color: #ffffff;
        border-color: var(--ar-primary, #0284c7);
      }
      .action-btn.success {
        background: #059669;
        color: #ffffff;
        border-color: #059669;
      }
      .empty-state {
        text-align: center;
        padding: 3rem 1rem;
        color: var(--ar-ink-muted, #64748b);
      }
    `,
  ],
})
export class ArSalesInvoices {
  private readonly invoiceService = inject(SalesInvoiceService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  /** Opened from Customer 360 for one customer or account: only their invoices. */
  protected readonly scope = signal<CustomerScope | null>(readCustomerScope());

  readonly SalesInvoiceStatus = SalesInvoiceStatus;

  private readonly toasts = inject(ToastService);
  private readonly permissions = inject(PermissionService);

  protected readonly canCreate = grantedPolicy('AutoReach.SalesInvoices.Create', this.permissions);

  /** Demo rows only in mock mode; a real workspace sees its own invoices or none. */
  invoices = signal<SalesInvoiceDto[]>(environment.useMockData ? MOCK_INVOICES : []);
  loadError = signal<string | null>(null);
  searchQuery = signal<string>('');
  selectedStatus = signal<SalesInvoiceStatus | null>(null);

  totalBilled = computed(() => this.invoices().reduce((acc, i) => acc + i.grandTotalInPaise, 0));
  totalCollected = computed(() => this.invoices().reduce((acc, i) => acc + i.paidAmountInPaise, 0));
  totalOutstanding = computed(() =>
    this.invoices().reduce((acc, i) => acc + i.balanceDueInPaise, 0),
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

  onInvoiceClick(e: RecordClickEventArgs): void {
    const target = e.target as HTMLElement | null;
    if (target?.closest('.row-actions, button, a')) return;
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
    if (!environment.useMockData) {
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
          },
          error: (e: unknown) => {
            this.loadError.set(errorMessage(e, 'Invoices could not be loaded.'));
          },
        });
    }
  }

  issueInvoice(inv: SalesInvoiceDto) {
    if (!inv.id) return;
    if (!environment.useMockData) {
      this.invoiceService.issue(inv.id).subscribe({
        next: (updated) => this.updateInvoiceInList(updated),
        error: (e: unknown) =>
          this.toasts.error(errorMessage(e, `${inv.invoiceNumber} could not be issued.`)),
      });
    } else {
      const updated = { ...inv, status: SalesInvoiceStatus.Issued };
      this.updateInvoiceInList(updated);
    }
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
}
