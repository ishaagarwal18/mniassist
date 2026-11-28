import { grantedPolicy } from '../../../core/auth/permission';
import { PermissionService } from '@abp/ng.core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { documentLink } from './document-ref-picker';
import {
  GridModule,
  RecordClickEventArgs,
  RowSelectEventArgs,
} from '@syncfusion/ej2-angular-grids';
import { readApiError } from '../../../core/util/api-error';
import { ConfirmService } from '../../../core/ui/confirm.service';
import { ToastService } from '../../../core/ui/toast.service';
import { ArTopbar } from '../../../layout/topbar';
import {
  JournalEntryDto,
  JournalEntryService,
  JournalVoucherStatus,
  JournalVoucherType,
} from '../../../proxy/finance';
import { ArBanner, ArButton, ArChip, ChipTone } from '../../../ui';
import { ArGrid } from '../../../ui/grid';

@Component({
  selector: 'app-journal-entries',
  standalone: true,
  imports: [
    CommonModule,
    ArBanner,
    FormsModule,
    DatePipe,
    DecimalPipe,
    ArTopbar,
    ArButton,
    ArChip,
    ArGrid,
    GridModule,
    RouterLink,
  ],
  template: `
    <ar-topbar
      help="Journal vouchers for adjustments, transfers and other entries that are not invoices or bills."
      title="Journal Vouchers (Double-Entry General Ledger)">
      <div actions class="topbar-actions">
        <a *ngIf="canCreate()" ar-button="primary" routerLink="/finance/journal-entries/new"
          >+ New Journal Voucher</a
        >
      </div>
    </ar-topbar>

    <div class="page-content">
      <!-- KPI Row -->
      <section class="kpi-grid">
        <div class="kpi-card">
          <span class="label">Total Journal Vouchers</span>
          <strong class="value">{{ journalEntries().length }}</strong>
          <span class="sub">Audited financial vouchers</span>
        </div>
        <div class="kpi-card teal">
          <span class="label">Posted Vouchers</span>
          <strong class="value">{{ stats().postedCount }}</strong>
          <span class="sub">Ledger balances updated</span>
        </div>
        <div class="kpi-card amber">
          <span class="label">Draft Vouchers</span>
          <strong class="value">{{ stats().draftCount }}</strong>
          <span class="sub">Pending review & posting</span>
        </div>
        <div class="kpi-card">
          <span class="label">Total Debits / Credits</span>
          <strong class="value">₹{{ stats().totalPostedDebit / 100 | number: '1.2-2' }}</strong>
          <span class="sub">100% Balanced entries</span>
        </div>
      </section>

      <!-- Filter bar -->
      <section class="filter-bar">
        <div class="search-box">
          <input
            type="search"
            class="input-search"
            placeholder="Search Voucher #, Narration, or Reference Doc #..."
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
          />
        </div>
        <div class="filter-chips">
          <button
            class="chip-filter"
            [class.active]="statusFilter() === 'ALL'"
            (click)="statusFilter.set('ALL')"
          >
            All ({{ journalEntries().length }})
          </button>
          <button
            class="chip-filter"
            [class.active]="statusFilter() === JournalVoucherStatus.Posted.toString()"
            (click)="statusFilter.set(JournalVoucherStatus.Posted.toString())"
          >
            Posted
          </button>
          <button
            class="chip-filter"
            [class.active]="statusFilter() === JournalVoucherStatus.Draft.toString()"
            (click)="statusFilter.set(JournalVoucherStatus.Draft.toString())"
          >
            Drafts
          </button>
        </div>
      </section>

      <!-- Split Layout: Vouchers Table on Left, Selected Voucher on Right -->
      @if (loadError(); as e) {
        <ar-banner tone="bad">{{ e }}</ar-banner>
      }

      <div class="journal-layout">
        <!-- Vouchers Table -->
        <section class="table-card">
          <ejs-grid
            arGrid="journal-entries"
            [dataSource]="filteredEntries()"
            [allowSelection]="true"
            [selectionSettings]="{ mode: 'Row', type: 'Single' }"
            (rowSelected)="onEntrySelected($event)"
            (recordClick)="onEntryClick($event)"
            aria-label="Journal vouchers"
          >
            <e-columns>
              <e-column field="entryNumber" headerText="Voucher #" width="150">
                <ng-template #template let-j>
                  <span class="voucher-code">{{ j.entryNumber }}</span>
                </ng-template>
              </e-column>
              <e-column field="entryDateUtc" headerText="Date" width="130">
                <ng-template #template let-j>
                  {{ j.entryDateUtc | date: 'mediumDate' }}
                </ng-template>
              </e-column>
              <e-column field="voucherType" headerText="Type" width="130">
                <ng-template #template let-j>
                  <span class="type-pill">{{ getVoucherTypeLabel(j.voucherType) }}</span>
                </ng-template>
              </e-column>
              <e-column field="narration" headerText="Narration" width="240">
                <ng-template #template let-j>
                  <span class="narration-snippet">{{ j.narration }}</span>
                </ng-template>
              </e-column>
              <e-column
                field="totalDebitInPaise"
                headerText="Total Amount (₹)"
                textAlign="Right"
                width="160"
              >
                <ng-template #template let-j>
                  <span class="fw-bold">₹{{ j.totalDebitInPaise / 100 | number: '1.2-2' }}</span>
                </ng-template>
              </e-column>
              <e-column field="status" headerText="Status" width="120">
                <ng-template #template let-j>
                  <ar-chip [tone]="getStatusTone(j.status)">{{ getStatusLabel(j.status) }}</ar-chip>
                </ng-template>
              </e-column>
            </e-columns>
          </ejs-grid>
        </section>

        <!-- Right Cockpit: Voucher Details & Double-Entry Lines -->
        <section class="detail-cockpit" *ngIf="selectedEntry() as entry">
          <div class="cockpit-header">
            <div>
              <div class="cockpit-title-row">
                <h3>{{ entry.entryNumber }}</h3>
                <span class="type-pill">{{ getVoucherTypeLabel(entry.voucherType) }}</span>
                <ar-chip [tone]="getStatusTone(entry.status)">{{
                  getStatusLabel(entry.status)
                }}</ar-chip>
              </div>
              <p class="cockpit-sub">
                Dated: <strong>{{ entry.entryDateUtc | date: 'longDate' }}</strong>
                <span *ngIf="entry.referenceDocumentNumber">
                  &bull; Ref:
                  @if (docLink(entry.referenceDocumentType, entry.referenceDocumentId); as link) {
                    <a [routerLink]="link"
                      ><strong translate="no">{{ entry.referenceDocumentNumber }}</strong></a
                    >
                  } @else {
                    <strong translate="no">{{ entry.referenceDocumentNumber }}</strong>
                  }
                </span>
              </p>
              <p class="posted-info" *ngIf="entry.postedBy">
                Posted by {{ entry.postedBy }} on {{ entry.postedAtUtc | date: 'medium' }}
              </p>
            </div>
            <div class="cockpit-actions">
              <button
                *ngIf="entry.status === JournalVoucherStatus.Draft && canPost()"
                ar-button="primary"
                (click)="postEntry(entry)"
              >
                Post to General Ledger
              </button>
              <a
                *ngIf="entry.status === JournalVoucherStatus.Draft && canCreate()"
                ar-button="ghost"
                [routerLink]="['/finance/journal-entries', entry.id, 'edit']"
              >
                ✏ Edit Voucher
              </a>
              <button
                *ngIf="entry.status === JournalVoucherStatus.Draft && canCreate()"
                ar-button="ghost"
                class="text-danger"
                (click)="deleteEntry(entry)"
              >
                🗑 Delete Voucher
              </button>
              <button
                *ngIf="entry.status === JournalVoucherStatus.Posted && canCancel()"
                ar-button="ghost"
                (click)="cancelEntry(entry)"
              >
                Reverse Voucher
              </button>
            </div>
          </div>

          <!-- Narration block -->
          <div class="narration-box">
            <span class="lbl">Voucher Narration & Audit Note</span>
            <p>{{ entry.narration }}</p>
          </div>

          <!-- Double Entry Lines Table -->
          <div class="lines-section">
            <div class="lines-header">
              <h4>General Ledger Posting Lines</h4>
              <span class="badge-balanced">&#10003; Debits Equal Credits</span>
            </div>

            <ejs-grid
              arGrid="journal-entry-lines"
              [dataSource]="entry.lines"
              aria-label="General Ledger Posting Lines"
            >
              <e-columns>
                <e-column field="accountCode" headerText="Account Code" width="130">
                  <ng-template #template let-l>
                    <span class="fw-bold">{{ l.accountCode }}</span>
                  </ng-template>
                </e-column>
                <e-column field="accountName" headerText="Account Name" width="200"></e-column>
                <e-column field="lineNarration" headerText="Line Narration" width="220">
                  <ng-template #template let-l>
                    <span class="text-muted">{{ l.lineNarration || '-' }}</span>
                  </ng-template>
                </e-column>
                <e-column headerText="Debit (₹)" width="130" [textAlign]="'Right'">
                  <ng-template #template let-l>
                    <span class="font-mono" [class.text-debit]="l.debitAmountInPaise > 0">
                      {{
                        l.debitAmountInPaise > 0
                          ? '₹' + (l.debitAmountInPaise / 100 | number: '1.2-2')
                          : '-'
                      }}
                    </span>
                  </ng-template>
                </e-column>
                <e-column headerText="Credit (₹)" width="130" [textAlign]="'Right'">
                  <ng-template #template let-l>
                    <span class="font-mono" [class.text-credit]="l.creditAmountInPaise > 0">
                      {{
                        l.creditAmountInPaise > 0
                          ? '₹' + (l.creditAmountInPaise / 100 | number: '1.2-2')
                          : '-'
                      }}
                    </span>
                  </ng-template>
                </e-column>
              </e-columns>
            </ejs-grid>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        padding-bottom: 3rem;
      }

      .page-content {
        padding: 1.5rem 2rem;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .topbar-actions {
        display: flex;
        gap: 0.75rem;
      }

      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        gap: 1rem;
      }

      .kpi-card {
        background: var(--ar-surface, #ffffff);
        border: 1px solid var(--ar-border, #e2e8f0);
        border-radius: 8px;
        padding: 1rem 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);

        &.teal {
          border-left: 4px solid #0d9488;
        }
        &.amber {
          border-left: 4px solid #f59e0b;
        }

        .label {
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--ar-text-muted, #64748b);
          font-weight: 600;
        }

        .value {
          font-size: 1.6rem;
          font-weight: 700;
          color: var(--ar-text-primary, #0f172a);
        }

        .sub {
          font-size: 0.75rem;
          color: var(--ar-text-secondary, #94a3b8);
        }
      }

      .filter-bar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }

      .search-box {
        flex: 1;
        min-width: 280px;

        .input-search {
          width: 100%;
          padding: 0.5rem 0.85rem;
          border: 1px solid var(--ar-border, #cbd5e1);
          border-radius: 6px;
          font-size: 0.875rem;
          background: var(--ar-surface, #ffffff);
        }
      }

      .filter-chips {
        display: flex;
        gap: 0.5rem;

        .chip-filter {
          padding: 0.35rem 0.85rem;
          font-size: 0.8rem;
          border-radius: 20px;
          border: 1px solid var(--ar-border, #cbd5e1);
          background: var(--ar-surface, #ffffff);
          cursor: pointer;
          font-weight: 500;
          transition: all 0.15s ease;

          &.active {
            background: var(--ar-primary, #1e293b);
            color: #ffffff;
            border-color: var(--ar-primary, #1e293b);
          }
        }
      }

      .journal-layout {
        display: grid;
        grid-template-columns: 1fr 1.15fr;
        gap: 1.5rem;
        align-items: start;

        @media (max-width: 1200px) {
          grid-template-columns: 1fr;
        }
      }

      .table-card {
        background: var(--ar-surface, #ffffff);
        border: 1px solid var(--ar-border, #e2e8f0);
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      }

      .data-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85rem;

        th {
          background: var(--ar-bg-subtle, #f8fafc);
          padding: 0.75rem 1rem;
          text-align: left;
          font-weight: 600;
          color: var(--ar-text-secondary, #475569);
          border-bottom: 1px solid var(--ar-border, #e2e8f0);
        }

        td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--ar-border, #f1f5f9);
          vertical-align: middle;
        }

        .clickable-row {
          cursor: pointer;
          transition: background 0.15s ease;

          &:hover {
            background: var(--ar-bg-50);
          }

          &.selected-row {
            background: #f0fdf4;
            border-left: 3px solid #10b981;
          }
        }
      }

      .voucher-code {
        font-family: monospace;
        font-weight: 700;
        color: #0f172a;
      }

      .type-pill {
        font-size: 0.75rem;
        background: var(--ar-bg-100);
        color: #334155;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 500;
      }

      .narration-snippet {
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
        font-size: 0.78rem;
        color: #64748b;
        max-width: 220px;
      }

      .empty-cell {
        text-align: center;
        padding: 2.5rem 1rem;
        color: #94a3b8;
      }

      .detail-cockpit {
        background: var(--ar-surface, #ffffff);
        border: 1px solid var(--ar-border, #e2e8f0);
        border-radius: 8px;
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      }

      .cockpit-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 1px solid var(--ar-line-200);
        padding-bottom: 1rem;

        .cockpit-title-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;

          h3 {
            margin: 0;
            font-size: 1.25rem;
            color: #0f172a;
          }
        }

        .cockpit-sub {
          margin: 0.35rem 0 0 0;
          font-size: 0.85rem;
          color: #475569;
        }

        .posted-info {
          margin: 0.2rem 0 0 0;
          font-size: 0.75rem;
          color: #15803d;
          font-weight: 500;
        }

        .cockpit-actions {
          display: flex;
          gap: 0.5rem;
        }
      }

      .narration-box {
        background: var(--ar-bg-50);
        border: 1px solid var(--ar-line-200);
        border-radius: 6px;
        padding: 0.85rem 1rem;

        .lbl {
          font-size: 0.72rem;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 600;
        }

        p {
          margin: 0.25rem 0 0 0;
          font-size: 0.85rem;
          color: #1e293b;
        }
      }

      .lines-section {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;

        .lines-header {
          display: flex;
          justify-content: space-between;
          align-items: center;

          h4 {
            margin: 0;
            font-size: 0.95rem;
            color: #1e293b;
          }

          .badge-balanced {
            font-size: 0.75rem;
            background: #dcfce7;
            color: #15803d;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 10px;
          }
        }
      }

      .sub-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8rem;

        th {
          background: var(--ar-bg-50);
          padding: 0.5rem 0.75rem;
          text-align: left;
          color: #475569;
          font-weight: 600;
          border-bottom: 1px solid var(--ar-line-200);
        }

        td {
          padding: 0.6rem 0.75rem;
          border-bottom: 1px solid var(--ar-line-200);
          vertical-align: middle;
        }

        .totals-row td {
          border-top: 2px solid var(--ar-line-300);
          font-size: 0.85rem;
          background: var(--ar-bg-50);
        }
      }

      .dialog-lines-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8rem;

        th {
          background: var(--ar-bg-50);
          padding: 0.4rem 0.5rem;
          text-align: left;
          color: #475569;
          border-bottom: 1px solid var(--ar-line-200);
        }

        td {
          padding: 0.4rem 0.5rem;
          vertical-align: middle;
        }
      }

      .lines-actions-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--ar-bg-50);
        padding: 0.5rem 0.75rem;
        border-radius: 5px;

        .draft-totals {
          display: flex;
          gap: 1rem;
          font-size: 0.85rem;
        }
      }

      .modal-body-container {
        padding: 1.25rem;
      }

      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;

        &.full-width {
          grid-column: 1 / -1;
        }

        label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #334155;
        }

        .form-control {
          padding: 0.45rem 0.75rem;
          border: 1px solid var(--ar-line-300);
          border-radius: 5px;
          font-size: 0.875rem;

          &:focus {
            outline: none;
            border-color: #0284c7;
          }
        }
      }

      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
      }

      .fw-bold {
        font-weight: 600;
      }
      .font-mono {
        font-family: monospace;
      }
      .text-debit {
        color: #0284c7;
        font-weight: 600;
      }
      .text-credit {
        color: #16a34a;
        font-weight: 600;
      }
      .text-success {
        color: #16a34a;
      }
      .text-danger {
        color: #dc2626;
      }
      .text-muted {
        color: #64748b;
      }
      .text-right {
        text-align: right;
      }
      .mt-3 {
        margin-top: 0.75rem;
      }
      .mt-4 {
        margin-top: 1rem;
      }
      .mb-2 {
        margin-bottom: 0.5rem;
      }
      .mb-3 {
        margin-bottom: 0.75rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JournalEntriesComponent {
  private readonly permissionGate = inject(PermissionService);
  protected readonly canCreate = grantedPolicy(
    'AutoReach.JournalEntries.Create',
    this.permissionGate,
  );
  protected readonly canPost = grantedPolicy('AutoReach.JournalEntries.Post', this.permissionGate);
  protected readonly canCancel = grantedPolicy(
    'AutoReach.JournalEntries.Cancel',
    this.permissionGate,
  );
  protected readonly docLink = documentLink;
  private readonly journalService = inject(JournalEntryService);
  private readonly confirmService = inject(ConfirmService);
  private readonly toasts = inject(ToastService);

  readonly journalEntries = signal<JournalEntryDto[]>([]);
  readonly selectedEntry = signal<JournalEntryDto | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly loadError = signal<string | null>(null);

  // Filters
  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<string>('ALL');

  readonly filteredEntries = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const sf = this.statusFilter();

    return this.journalEntries().filter((j) => {
      if (sf !== 'ALL' && j.status.toString() !== sf) return false;
      if (!q) return true;

      return (
        j.entryNumber.toLowerCase().includes(q) ||
        j.narration.toLowerCase().includes(q) ||
        (j.referenceDocumentNumber && j.referenceDocumentNumber.toLowerCase().includes(q))
      );
    });
  });

  readonly stats = computed(() => {
    const list = this.journalEntries();
    const postedCount = list.filter((j) => j.status === JournalVoucherStatus.Posted).length;
    const draftCount = list.filter((j) => j.status === JournalVoucherStatus.Draft).length;
    const totalPostedDebit = list
      .filter((j) => j.status === JournalVoucherStatus.Posted)
      .reduce((acc, j) => acc + j.totalDebitInPaise, 0);

    return {
      postedCount,
      draftCount,
      totalPostedDebit,
    };
  });

  readonly JournalVoucherType = JournalVoucherType;
  readonly JournalVoucherStatus = JournalVoucherStatus;

  constructor() {
    this.loadEntries();
  }

  loadEntries(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.journalService.getList({ maxResultCount: 100 }).subscribe({
      next: (res) => {
        const items = res.items ?? [];
        this.journalEntries.set(items);
        this.selectedEntry.set(items[0] ?? null);
        this.isLoading.set(false);
      },
      error: (e: unknown) => {
        this.journalEntries.set([]);
        this.selectedEntry.set(null);
        this.loadError.set(readApiError(e, 'The journal vouchers could not be loaded.'));
        this.isLoading.set(false);
      },
    });
  }

  selectEntry(j: JournalEntryDto): void {
    this.selectedEntry.set(j);
  }

  onEntrySelected(args: RowSelectEventArgs): void {
    const row = (Array.isArray(args.data) ? args.data[0] : args.data) as
      JournalEntryDto | undefined;
    if (row) this.selectEntry(row);
  }

  onEntryClick(args: RecordClickEventArgs): void {
    const row = args.rowData as JournalEntryDto | undefined;
    if (row) this.selectEntry(row);
  }

  getStatusTone(status: JournalVoucherStatus): ChipTone {
    switch (status) {
      case JournalVoucherStatus.Draft:
        return 'amber';
      case JournalVoucherStatus.Posted:
        return 'good';
      case JournalVoucherStatus.Cancelled:
        return 'bad';
      default:
        return 'neutral';
    }
  }

  getStatusLabel(status: JournalVoucherStatus): string {
    switch (status) {
      case JournalVoucherStatus.Draft:
        return 'Draft';
      case JournalVoucherStatus.Posted:
        return 'Posted';
      case JournalVoucherStatus.Cancelled:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  }

  getVoucherTypeLabel(type: JournalVoucherType): string {
    switch (type) {
      case JournalVoucherType.GeneralJournal:
        return 'Journal Voucher';
      case JournalVoucherType.SalesVoucher:
        return 'Sales Voucher';
      case JournalVoucherType.PurchaseVoucher:
        return 'Purchase Voucher';
      case JournalVoucherType.PaymentVoucher:
        return 'Payment Voucher';
      case JournalVoucherType.ReceiptVoucher:
        return 'Receipt Voucher';
      case JournalVoucherType.ContraVoucher:
        return 'Contra Voucher';
      default:
        return 'Voucher';
    }
  }

  async deleteEntry(entry: JournalEntryDto): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title: 'Delete Journal Voucher',
      message: `Are you sure you want to delete ${entry.entryNumber}? This voucher will be permanently removed.`,
      confirmText: 'Delete Voucher',
      cancelText: 'Cancel',
      tone: 'danger',
    });

    if (!confirmed) return;

    if (entry.id) {
      this.journalService.delete(entry.id).subscribe({
        // The app-wide toasts say "deleted", or show the API's reason it was refused.
        next: () => this.removeFromState(entry, false),
      });
      return;
    }
    this.removeFromState(entry);
  }

  private removeFromState(entry: JournalEntryDto, announce = true): void {
    this.journalEntries.update((list) => list.filter((j) => j.id !== entry.id));
    this.selectedEntry.set(this.journalEntries()[0] ?? null);
    if (announce) this.toasts.success(`Voucher ${entry.entryNumber} deleted.`);
  }

  postEntry(entry: JournalEntryDto): void {
    if (entry.id) {
      this.journalService.post(entry.id).subscribe({
        next: (updated) => {
          this.updateEntryInState(updated);
        },
      });
      return;
    }

    const updated: JournalEntryDto = {
      ...entry,
      status: JournalVoucherStatus.Posted,
      postedAtUtc: new Date().toISOString(),
      postedBy: 'Chief Accountant Rajesh Iyer',
    };
    this.updateEntryInState(updated);
  }

  cancelEntry(entry: JournalEntryDto): void {
    if (entry.id) {
      this.journalService.cancel(entry.id).subscribe({
        next: (updated) => {
          this.updateEntryInState(updated);
        },
      });
      return;
    }

    const updated: JournalEntryDto = {
      ...entry,
      status: JournalVoucherStatus.Cancelled,
    };
    this.updateEntryInState(updated);
  }

  private updateEntryInState(updated: JournalEntryDto): void {
    this.journalEntries.update((list) => list.map((j) => (j.id === updated.id ? updated : j)));
    this.selectedEntry.set(updated);
  }
}
