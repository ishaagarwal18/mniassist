import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { ArTopbar } from '../../../layout/topbar';
import {
  CreateJournalEntryDto,
  CreateJournalEntryLineDto,
  JournalEntryDto,
  JournalEntryLineDto,
  JournalEntryService,
  JournalVoucherStatus,
  JournalVoucherType,
} from '../../../proxy/finance';
import { ArButton, ArChip, ArDialog, ChipTone } from '../../../ui';

const MOCK_JOURNAL_ENTRIES: JournalEntryDto[] = [
  {
    id: 'jv-1',
    entryNumber: 'JV-2026-0041',
    entryDateUtc: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    voucherType: JournalVoucherType.SalesVoucher,
    status: JournalVoucherStatus.Posted,
    referenceDocumentType: 'SalesInvoice',
    referenceDocumentId: 'inv-1',
    referenceDocumentNumber: 'INV-2026-0082',
    narration:
      'Commercial sales dispatch to Tata Motors Powertrain Ltd for 50x Proportional Valves HV-400-P under GST Rule 55.',
    totalDebitInPaise: 41_30_000_00,
    totalCreditInPaise: 41_30_000_00,
    postedAtUtc: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    postedBy: 'Chief Accountant Rajesh Iyer',
    lines: [
      {
        id: 'jvl-1',
        journalEntryId: 'jv-1',
        accountId: 'coa-1200',
        accountCode: '1200',
        accountName: 'Accounts Receivable (Sundry Debtors)',
        debitAmountInPaise: 41_30_000_00,
        creditAmountInPaise: 0,
        lineNarration: 'Receivable from Tata Motors for Invoice INV-2026-0082',
        costCenter: 'CC-SALES-OEM',
      },
      {
        id: 'jvl-2',
        journalEntryId: 'jv-1',
        accountId: 'coa-4010',
        accountCode: '4010',
        accountName: 'Sales Revenue - Manufactured Systems',
        debitAmountInPaise: 0,
        creditAmountInPaise: 35_00_000_00,
        lineNarration: 'Taxable value of 50 units Proportional Directional Valves',
        costCenter: 'CC-MFG-VALVES',
      },
      {
        id: 'jvl-3',
        journalEntryId: 'jv-1',
        accountId: 'coa-2020',
        accountCode: '2020',
        accountName: 'Output GST Payable - CGST',
        debitAmountInPaise: 0,
        creditAmountInPaise: 3_15_000_00,
        lineNarration: '9% Central GST output liability',
      },
      {
        id: 'jvl-4',
        journalEntryId: 'jv-1',
        accountId: 'coa-2021',
        accountCode: '2021',
        accountName: 'Output GST Payable - SGST',
        debitAmountInPaise: 0,
        creditAmountInPaise: 3_15_000_00,
        lineNarration: '9% State GST output liability',
      },
    ],
  },
  {
    id: 'jv-2',
    entryNumber: 'JV-2026-0042',
    entryDateUtc: new Date(Date.now() - 5 * 86_400_000).toISOString(),
    voucherType: JournalVoucherType.PurchaseVoucher,
    status: JournalVoucherStatus.Posted,
    referenceDocumentType: 'GoodsReceiptNote',
    referenceDocumentId: 'grn-1',
    referenceDocumentNumber: 'GRN-2026-0019',
    narration:
      'Procurement of ductile iron castings from Jindal Steel & Power with 3-way matching and GSTR-2B ITC claim.',
    totalDebitInPaise: 28_32_000_00,
    totalCreditInPaise: 28_32_000_00,
    postedAtUtc: new Date(Date.now() - 5 * 86_400_000).toISOString(),
    postedBy: 'Chief Accountant Rajesh Iyer',
    lines: [
      {
        id: 'jvl-5',
        journalEntryId: 'jv-2',
        accountId: 'coa-1300',
        accountCode: '1300',
        accountName: 'Raw Material Inventory',
        debitAmountInPaise: 24_00_000_00,
        creditAmountInPaise: 0,
        lineNarration: 'Accepted QC castings received into WH-MAIN-RAW',
        costCenter: 'CC-PURCHASING',
      },
      {
        id: 'jvl-6',
        journalEntryId: 'jv-2',
        accountId: 'coa-1500',
        accountCode: '1500',
        accountName: 'Input Tax Credit (ITC) - CGST',
        debitAmountInPaise: 2_16_000_00,
        creditAmountInPaise: 0,
        lineNarration: '9% CGST Input Tax Credit',
      },
      {
        id: 'jvl-7',
        journalEntryId: 'jv-2',
        accountId: 'coa-1510',
        accountCode: '1510',
        accountName: 'Input Tax Credit (ITC) - SGST',
        debitAmountInPaise: 2_16_000_00,
        creditAmountInPaise: 0,
        lineNarration: '9% SGST Input Tax Credit',
      },
      {
        id: 'jvl-8',
        journalEntryId: 'jv-2',
        accountId: 'coa-2010',
        accountCode: '2010',
        accountName: 'Accounts Payable (Sundry Creditors)',
        debitAmountInPaise: 0,
        creditAmountInPaise: 28_32_000_00,
        lineNarration: 'Credit balance payable to Jindal Steel within 45 days (MSME Sec 15)',
        costCenter: 'CC-SUPPLIERS',
      },
    ],
  },
  {
    id: 'jv-3',
    entryNumber: 'JV-2026-0043',
    entryDateUtc: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    voucherType: JournalVoucherType.ReceiptVoucher,
    status: JournalVoucherStatus.Posted,
    referenceDocumentType: 'BankCollection',
    referenceDocumentNumber: 'RTGS-HDFC-9912',
    narration: 'Customer RTGS remittance from Tata Motors against invoice settlement.',
    totalDebitInPaise: 41_30_000_00,
    totalCreditInPaise: 41_30_000_00,
    postedAtUtc: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    postedBy: 'Chief Accountant Rajesh Iyer',
    lines: [
      {
        id: 'jvl-9',
        journalEntryId: 'jv-3',
        accountId: 'coa-1010',
        accountCode: '1010',
        accountName: 'HDFC Bank Current Account',
        debitAmountInPaise: 41_30_000_00,
        creditAmountInPaise: 0,
        lineNarration: 'RTGS inward credit received into HDFC bank',
      },
      {
        id: 'jvl-10',
        journalEntryId: 'jv-3',
        accountId: 'coa-1200',
        accountCode: '1200',
        accountName: 'Accounts Receivable (Sundry Debtors)',
        debitAmountInPaise: 0,
        creditAmountInPaise: 41_30_000_00,
        lineNarration: 'Clearance of customer outstanding balance',
      },
    ],
  },
  {
    id: 'jv-4',
    entryNumber: 'JV-2026-0044',
    entryDateUtc: new Date().toISOString(),
    voucherType: JournalVoucherType.GeneralJournal,
    status: JournalVoucherStatus.Draft,
    narration:
      'Provision for monthly factory 3-phase high-tension power bill and industrial argon welding gas consumption.',
    totalDebitInPaise: 17_11_000_00,
    totalCreditInPaise: 17_11_000_00,
    lines: [
      {
        id: 'jvl-11',
        journalEntryId: 'jv-4',
        accountId: 'coa-6010',
        accountCode: '6010',
        accountName: 'Factory Power, Fuel & Industrial Gases',
        debitAmountInPaise: 14_50_000_00,
        creditAmountInPaise: 0,
        lineNarration: 'HT electrical power billing for machining shop',
        costCenter: 'CC-FACTORY-POWER',
      },
      {
        id: 'jvl-12',
        journalEntryId: 'jv-4',
        accountId: 'coa-1500',
        accountCode: '1500',
        accountName: 'Input Tax Credit (ITC) - CGST',
        debitAmountInPaise: 1_30_500_00,
        creditAmountInPaise: 0,
        lineNarration: '9% CGST ITC on utility supply',
      },
      {
        id: 'jvl-13',
        journalEntryId: 'jv-4',
        accountId: 'coa-1510',
        accountCode: '1510',
        accountName: 'Input Tax Credit (ITC) - SGST',
        debitAmountInPaise: 1_30_500_00,
        creditAmountInPaise: 0,
        lineNarration: '9% SGST ITC on utility supply',
      },
      {
        id: 'jvl-14',
        journalEntryId: 'jv-4',
        accountId: 'coa-2010',
        accountCode: '2010',
        accountName: 'Accounts Payable (Sundry Creditors)',
        debitAmountInPaise: 0,
        creditAmountInPaise: 17_11_000_00,
        lineNarration: 'Liability provision for State Electricity Board',
      },
    ],
  },
];

@Component({
  selector: 'app-journal-entries',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, DecimalPipe, ArTopbar, ArButton, ArChip, ArDialog],
  template: `
    <ar-topbar title="Journal Vouchers (Double-Entry General Ledger)">
      <div actions class="topbar-actions">
        <button ar-button="primary" (click)="openCreate()">+ New Journal Voucher</button>
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
      <div class="journal-layout">
        <!-- Vouchers Table -->
        <section class="table-card">
          <table class="data-table">
            <thead>
              <tr>
                <th>Voucher #</th>
                <th>Date</th>
                <th>Type</th>
                <th>Narration</th>
                <th class="text-right">Total Amount (₹)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr
                *ngFor="let j of filteredEntries()"
                [class.selected-row]="selectedEntry()?.id === j.id"
                (click)="selectEntry(j)"
                class="clickable-row"
              >
                <td>
                  <span class="voucher-code">{{ j.entryNumber }}</span>
                </td>
                <td>{{ j.entryDateUtc | date: 'mediumDate' }}</td>
                <td>
                  <span class="type-pill">{{ getVoucherTypeLabel(j.voucherType) }}</span>
                </td>
                <td>
                  <span class="narration-snippet">{{ j.narration }}</span>
                </td>
                <td class="text-right fw-bold">
                  ₹{{ j.totalDebitInPaise / 100 | number: '1.2-2' }}
                </td>
                <td>
                  <ar-chip [tone]="getStatusTone(j.status)">{{ getStatusLabel(j.status) }}</ar-chip>
                </td>
              </tr>
              <tr *ngIf="filteredEntries().length === 0">
                <td colspan="6" class="empty-cell">No journal vouchers match your search.</td>
              </tr>
            </tbody>
          </table>
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
                  &bull; Ref: <strong>{{ entry.referenceDocumentNumber }}</strong></span
                >
              </p>
              <p class="posted-info" *ngIf="entry.postedBy">
                Posted by {{ entry.postedBy }} on {{ entry.postedAtUtc | date: 'medium' }}
              </p>
            </div>
            <div class="cockpit-actions">
              <button
                *ngIf="entry.status === JournalVoucherStatus.Draft"
                ar-button="primary"
                (click)="postEntry(entry)"
              >
                Post to General Ledger
              </button>
              <button
                *ngIf="entry.status === JournalVoucherStatus.Posted"
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

            <div class="table-responsive">
              <table class="sub-table">
                <thead>
                  <tr>
                    <th>Account Code</th>
                    <th>Account Name</th>
                    <th>Line Narration</th>
                    <th class="text-right">Debit (₹)</th>
                    <th class="text-right">Credit (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let l of entry.lines">
                    <td class="fw-bold">{{ l.accountCode }}</td>
                    <td>{{ l.accountName }}</td>
                    <td class="text-muted">{{ l.lineNarration || '-' }}</td>
                    <td class="text-right font-mono" [class.text-debit]="l.debitAmountInPaise > 0">
                      {{
                        l.debitAmountInPaise > 0
                          ? '₹' + (l.debitAmountInPaise / 100 | number: '1.2-2')
                          : '-'
                      }}
                    </td>
                    <td
                      class="text-right font-mono"
                      [class.text-credit]="l.creditAmountInPaise > 0"
                    >
                      {{
                        l.creditAmountInPaise > 0
                          ? '₹' + (l.creditAmountInPaise / 100 | number: '1.2-2')
                          : '-'
                      }}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="totals-row">
                    <td colspan="3" class="fw-bold">Total Vouched Amount</td>
                    <td class="text-right fw-bold text-debit font-mono">
                      ₹{{ entry.totalDebitInPaise / 100 | number: '1.2-2' }}
                    </td>
                    <td class="text-right fw-bold text-credit font-mono">
                      ₹{{ entry.totalCreditInPaise / 100 | number: '1.2-2' }}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- Create Journal Entry Dialog -->
    <ar-dialog
      *ngIf="isCreateOpen()"
      title="Create Double-Entry Journal Voucher"
      (dismiss)="isCreateOpen.set(false)"
    >
      <div class="modal-body-container">
        <div class="form-grid">
          <div class="form-group">
            <label>Voucher Number</label>
            <input type="text" class="form-control" [(ngModel)]="newEntry.entryNumber" />
          </div>
          <div class="form-group">
            <label>Voucher Date</label>
            <input type="date" class="form-control" [(ngModel)]="newEntry.entryDateUtc" />
          </div>
          <div class="form-group">
            <label>Voucher Type</label>
            <select class="form-control" [(ngModel)]="newEntry.voucherType">
              <option [ngValue]="JournalVoucherType.GeneralJournal">General Journal (JV)</option>
              <option [ngValue]="JournalVoucherType.SalesVoucher">Sales Voucher</option>
              <option [ngValue]="JournalVoucherType.PurchaseVoucher">Purchase Voucher</option>
              <option [ngValue]="JournalVoucherType.PaymentVoucher">Payment Voucher</option>
              <option [ngValue]="JournalVoucherType.ReceiptVoucher">Receipt Voucher</option>
              <option [ngValue]="JournalVoucherType.ContraVoucher">Contra Voucher</option>
            </select>
          </div>
          <div class="form-group">
            <label>Reference Document #</label>
            <input
              type="text"
              class="form-control"
              [(ngModel)]="newEntry.referenceDocumentNumber"
              placeholder="INV-..., GRN-..., PO-..."
            />
          </div>
        </div>

        <div class="form-group full-width mt-3">
          <label>Narration & Explanation</label>
          <textarea
            class="form-control"
            rows="2"
            [(ngModel)]="newEntry.narration"
            placeholder="Explain business transaction..."
          ></textarea>
        </div>

        <h5 class="mt-4 mb-2">Double-Entry Ledger Lines</h5>
        <table class="dialog-lines-table mb-3">
          <thead>
            <tr>
              <th>Account Code</th>
              <th>Debit (INR)</th>
              <th>Credit (INR)</th>
              <th>Narration</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let line of draftLines(); let i = index">
              <td>
                <input
                  type="text"
                  class="form-control input-sm"
                  [(ngModel)]="line.accountCode"
                  placeholder="Code (e.g. 1010)"
                />
              </td>
              <td>
                <input
                  type="number"
                  class="form-control text-right input-sm"
                  [(ngModel)]="line.debitRupees"
                  (input)="recalculateDraftTotals()"
                />
              </td>
              <td>
                <input
                  type="number"
                  class="form-control text-right input-sm"
                  [(ngModel)]="line.creditRupees"
                  (input)="recalculateDraftTotals()"
                />
              </td>
              <td>
                <input
                  type="text"
                  class="form-control input-sm"
                  [(ngModel)]="line.lineNarration"
                  placeholder="Notes"
                />
              </td>
              <td>
                <button ar-button="ghost" class="btn-xs" (click)="removeDraftLine(i)">x</button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="lines-actions-row">
          <button ar-button="ghost" (click)="addDraftLine()">+ Add Ledger Line</button>
          <div class="draft-totals">
            <span
              >Debit: <strong>₹{{ draftTotalDebit() | number: '1.2-2' }}</strong></span
            >
            <span
              >Credit: <strong>₹{{ draftTotalCredit() | number: '1.2-2' }}</strong></span
            >
            <span [class.text-success]="isDraftBalanced()" [class.text-danger]="!isDraftBalanced()">
              Diff: <strong>₹{{ draftTotalDebit() - draftTotalCredit() | number: '1.2-2' }}</strong>
            </span>
          </div>
        </div>

        <div class="dialog-actions mt-4">
          <button ar-button="primary" [disabled]="!isDraftBalanced()" (click)="createEntry()">
            Create & Record Voucher
          </button>
          <button ar-button="ghost" (click)="isCreateOpen.set(false)">Cancel</button>
        </div>
      </div>
    </ar-dialog>
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
            background: #f8fafc;
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
        background: #f1f5f9;
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
        border-bottom: 1px solid #f1f5f9;
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
        background: #f8fafc;
        border: 1px solid #e2e8f0;
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
          background: #f8fafc;
          padding: 0.5rem 0.75rem;
          text-align: left;
          color: #475569;
          font-weight: 600;
          border-bottom: 1px solid #e2e8f0;
        }

        td {
          padding: 0.6rem 0.75rem;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }

        .totals-row td {
          border-top: 2px solid #cbd5e1;
          font-size: 0.85rem;
          background: #f8fafc;
        }
      }

      .dialog-lines-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8rem;

        th {
          background: #f8fafc;
          padding: 0.4rem 0.5rem;
          text-align: left;
          color: #475569;
          border-bottom: 1px solid #e2e8f0;
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
        background: #f8fafc;
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
          border: 1px solid #cbd5e1;
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
  private readonly journalService = inject(JournalEntryService);

  readonly journalEntries = signal<JournalEntryDto[]>(MOCK_JOURNAL_ENTRIES);
  readonly selectedEntry = signal<JournalEntryDto | null>(MOCK_JOURNAL_ENTRIES[0]);
  readonly isLoading = signal<boolean>(false);

  // Filters
  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<string>('ALL');

  // Dialog
  readonly isCreateOpen = signal<boolean>(false);

  newEntry: CreateJournalEntryDto = {
    entryNumber: '',
    entryDateUtc: new Date().toISOString().substring(0, 10),
    voucherType: JournalVoucherType.GeneralJournal,
    narration: '',
    lines: [],
  };

  readonly draftLines = signal<
    { accountCode: string; debitRupees: number; creditRupees: number; lineNarration: string }[]
  >([
    {
      accountCode: '1010',
      debitRupees: 50000,
      creditRupees: 0,
      lineNarration: 'Disbursement from Bank',
    },
    {
      accountCode: '6040',
      debitRupees: 0,
      creditRupees: 50000,
      lineNarration: 'Office expense provision',
    },
  ]);

  readonly draftTotalDebit = computed(() =>
    this.draftLines().reduce((acc, l) => acc + (Number(l.debitRupees) || 0), 0),
  );
  readonly draftTotalCredit = computed(() =>
    this.draftLines().reduce((acc, l) => acc + (Number(l.creditRupees) || 0), 0),
  );
  readonly isDraftBalanced = computed(
    () =>
      Math.abs(this.draftTotalDebit() - this.draftTotalCredit()) === 0 &&
      this.draftTotalDebit() > 0,
  );

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
    if (environment.useMockData) return;

    this.isLoading.set(true);
    this.journalService.getList({ maxResultCount: 100 }).subscribe({
      next: (res) => {
        if (res.items && res.items.length > 0) {
          this.journalEntries.set(res.items);
          this.selectedEntry.set(res.items[0]);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  selectEntry(j: JournalEntryDto): void {
    this.selectedEntry.set(j);
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

  openCreate(): void {
    const nextSeq = this.journalEntries().length + 1;
    this.newEntry = {
      entryNumber: `JV-2026-${String(nextSeq + 45).padStart(4, '0')}`,
      entryDateUtc: new Date().toISOString().substring(0, 10),
      voucherType: JournalVoucherType.GeneralJournal,
      narration: '',
      lines: [],
    };
    this.draftLines.set([
      { accountCode: '1010', debitRupees: 50000, creditRupees: 0, lineNarration: 'Bank payment' },
      {
        accountCode: '6020',
        debitRupees: 0,
        creditRupees: 50000,
        lineNarration: 'Tooling expense',
      },
    ]);
    this.isCreateOpen.set(true);
  }

  addDraftLine(): void {
    this.draftLines.update((lines) => [
      ...lines,
      { accountCode: '', debitRupees: 0, creditRupees: 0, lineNarration: '' },
    ]);
  }

  removeDraftLine(index: number): void {
    this.draftLines.update((lines) => lines.filter((_, i) => i !== index));
  }

  recalculateDraftTotals(): void {
    // triggers signal update
    this.draftLines.update((l) => [...l]);
  }

  createEntry(): void {
    if (!this.isDraftBalanced() || !this.newEntry.narration) return;

    const totalDebitPaise = this.draftTotalDebit() * 100;
    const totalCreditPaise = this.draftTotalCredit() * 100;

    const created: JournalEntryDto = {
      id: `jv-${Date.now()}`,
      entryNumber: this.newEntry.entryNumber || `JV-2026-0099`,
      entryDateUtc: this.newEntry.entryDateUtc,
      voucherType: this.newEntry.voucherType,
      status: JournalVoucherStatus.Posted,
      narration: this.newEntry.narration,
      totalDebitInPaise: totalDebitPaise,
      totalCreditInPaise: totalCreditPaise,
      postedAtUtc: new Date().toISOString(),
      postedBy: 'Chief Accountant Rajesh Iyer',
      lines: this.draftLines().map((dl, idx) => ({
        id: `jvl-${Date.now()}-${idx}`,
        journalEntryId: `jv-${Date.now()}`,
        accountId: `coa-${dl.accountCode}`,
        accountCode: dl.accountCode,
        accountName: `Account ${dl.accountCode}`,
        debitAmountInPaise: dl.debitRupees * 100,
        creditAmountInPaise: dl.creditRupees * 100,
        lineNarration: dl.lineNarration,
      })),
    };

    this.journalEntries.update((list) => [created, ...list]);
    this.selectedEntry.set(created);
    this.isCreateOpen.set(false);
  }

  postEntry(entry: JournalEntryDto): void {
    if (!environment.useMockData && entry.id) {
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
    if (!environment.useMockData && entry.id) {
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
