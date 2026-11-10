import { CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { readApiError } from '../../../core/util/api-error';
import { ToastService } from '../../../core/ui/toast.service';
import { ArTopbar } from '../../../layout/topbar';
import {
  ChartOfAccountService,
  CreateJournalEntryDto,
  CreateJournalEntryLineDto,
  JournalEntryDto,
  JournalEntryService,
  JournalVoucherType,
} from '../../../proxy/finance';
import { ArButton, ArCard } from '../../../ui';

interface VoucherLineVM {
  accountId: string;
  accountCode: string;
  accountName: string;
  debitRupees: number;
  creditRupees: number;
  lineNarration: string;
  costCenter: string;
}

const BLANK_LINE: VoucherLineVM = {
  accountId: '',
  accountCode: '',
  accountName: '',
  debitRupees: 0,
  creditRupees: 0,
  lineNarration: '',
  costCenter: '',
};

/**
 * Create or Edit a Double-Entry Journal Voucher.
 * Route: /finance/journal-entries/new or /finance/journal-entries/:id/edit
 */
@Component({
  selector: 'ar-new-journal-voucher-page',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, ArTopbar, ArButton, ArCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      [title]="isEditing() ? 'Edit Journal Voucher' : 'New Journal Voucher'"
      subtitle="Double-entry General Ledger posting with real-time balance validation"
    >
      <button ar-button type="button" variant="ghost" (click)="cancel()">
        Back to Journal Vouchers
      </button>
    </ar-topbar>

    <div class="page-container ar-scroll">
      <form class="jv-form" (submit)="$event.preventDefault(); submit()">
        <!-- Voucher Header Information -->
        <ar-card heading="Voucher Details">
          <div class="form-grid">
            <label class="ar-field">
              <span class="ar-field__label">Voucher Number</span>
              <input
                type="text"
                class="ar-field__input ar-mono"
                placeholder="Blank: numbered automatically on save"
                [(ngModel)]="entryNumber"
                name="entryNumber"
              />
            </label>

            <label class="ar-field">
              <span class="ar-field__label">Voucher Date <span class="required">*</span></span>
              <input
                type="date"
                class="ar-field__input"
                required
                [(ngModel)]="entryDateUtc"
                name="entryDateUtc"
              />
            </label>

            <label class="ar-field">
              <span class="ar-field__label">Voucher Type <span class="required">*</span></span>
              <select class="ar-field__input" [(ngModel)]="voucherType" name="voucherType">
                <option [ngValue]="JournalVoucherType.GeneralJournal">General Journal (JV)</option>
                <option [ngValue]="JournalVoucherType.SalesVoucher">Sales Voucher</option>
                <option [ngValue]="JournalVoucherType.PurchaseVoucher">Purchase Voucher</option>
                <option [ngValue]="JournalVoucherType.PaymentVoucher">Payment Voucher</option>
                <option [ngValue]="JournalVoucherType.ReceiptVoucher">Receipt Voucher</option>
                <option [ngValue]="JournalVoucherType.ContraVoucher">Contra Voucher</option>
              </select>
            </label>

            <label class="ar-field">
              <span class="ar-field__label"
                >Reference Document # <span class="ar-field__opt">(optional)</span></span
              >
              <input
                type="text"
                class="ar-field__input"
                placeholder="e.g. INV-2026-0091, PO-4482, RTGS-..."
                [(ngModel)]="referenceDocumentNumber"
                name="referenceDocumentNumber"
              />
            </label>

            <label class="ar-field full-width">
              <span class="ar-field__label"
                >Narration & Audit Note <span class="required">*</span></span
              >
              <textarea
                class="ar-field__input"
                rows="2"
                required
                placeholder="Detailed business explanation and statutory transaction reference..."
                [(ngModel)]="narration"
                name="narration"
              ></textarea>
            </label>
          </div>
        </ar-card>

        <!-- Double Entry Lines Card -->
        <ar-card heading="General Ledger Posting Lines (Debits = Credits)">
          <div class="lines-table-container">
            <table class="lines-table">
              <thead>
                <tr>
                  <th style="width: 32%;">General Ledger Account</th>
                  <th style="width: 26%;">Line Narration</th>
                  <th style="width: 14%;">Cost Center</th>
                  <th style="width: 13%; text-align: right;">Debit (₹)</th>
                  <th style="width: 13%; text-align: right;">Credit (₹)</th>
                  <th style="width: 2%;"></th>
                </tr>
              </thead>
              <tbody>
                @for (line of lines(); track $index; let i = $index) {
                  <tr>
                    <td>
                      <select
                        class="ar-field__input select-account"
                        [ngModel]="line.accountId"
                        (ngModelChange)="onAccountChange(i, $event)"
                        [name]="'account_' + i"
                      >
                        <option value="" disabled>Select General Ledger Account...</option>
                        @for (acc of accountOptions(); track acc.id) {
                          <option [value]="acc.id">{{ acc.code }} - {{ acc.name }}</option>
                        }
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        class="ar-field__input"
                        placeholder="Description..."
                        [ngModel]="line.lineNarration"
                        (ngModelChange)="updateLineNarration(i, $event)"
                        [name]="'narration_' + i"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        class="ar-field__input"
                        placeholder="e.g. CC-SALES"
                        [ngModel]="line.costCenter"
                        (ngModelChange)="updateLineCostCenter(i, $event)"
                        [name]="'costCenter_' + i"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        class="ar-field__input text-right ar-mono"
                        [ngModel]="line.debitRupees"
                        (ngModelChange)="updateDebit(i, $event)"
                        [name]="'debit_' + i"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        class="ar-field__input text-right ar-mono"
                        [ngModel]="line.creditRupees"
                        (ngModelChange)="updateCredit(i, $event)"
                        [name]="'credit_' + i"
                      />
                    </td>
                    <td class="text-center">
                      @if (lines().length > 2) {
                        <button
                          type="button"
                          class="btn-remove"
                          title="Remove line"
                          (click)="removeLine(i)"
                        >
                          ✕
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
              <tfoot>
                <tr class="totals-row">
                  <td colspan="3" class="totals-label">
                    <button
                      ar-button
                      type="button"
                      variant="ghost"
                      class="btn-add-line"
                      (click)="addLine()"
                    >
                      + Add Ledger Line
                    </button>
                  </td>
                  <td class="text-right font-bold ar-mono text-debit">
                    ₹{{ totalDebit() | number: '1.2-2' }}
                  </td>
                  <td class="text-right font-bold ar-mono text-credit">
                    ₹{{ totalCredit() | number: '1.2-2' }}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Real-time Balance Validator Bar -->
          <div
            class="balance-bar"
            [class.balance-bar--valid]="isBalanced()"
            [class.balance-bar--invalid]="!isBalanced()"
          >
            @if (isBalanced()) {
              <span class="status-indicator success">
                &#10003; <strong>Balanced:</strong> Total Debits (₹{{
                  totalDebit() | number: '1.2-2'
                }}) equal Total Credits.
              </span>
            } @else {
              <span class="status-indicator danger">
                &#9888;
                <strong>Out of balance by ₹{{ balanceDifference() | number: '1.2-2' }}:</strong>
                Debits (₹{{ totalDebit() | number: '1.2-2' }}) ≠ Credits (₹{{
                  totalCredit() | number: '1.2-2'
                }}).
              </span>
            }
          </div>
        </ar-card>

        @if (error(); as err) {
          <p class="error-msg" role="alert">{{ err }}</p>
        }

        <div class="form-actions">
          <button ar-button type="button" variant="ghost" (click)="cancel()">Cancel</button>
          <button ar-button type="submit" variant="primary" [disabled]="busy()">
            {{ busy() ? 'Saving…' : isEditing() ? 'Update Voucher' : 'Save Journal Voucher' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: `
    .page-container {
      padding: 1.5rem 2rem 3rem;
      max-width: 1080px;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .jv-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem 1.25rem;
      padding: 0.5rem 0;
    }
    .ar-field {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;

      &.full-width {
        grid-column: 1 / -1;
      }
    }
    .ar-field__label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #334155;

      .required {
        color: #ef4444;
      }
    }
    .ar-field__opt {
      font-size: 0.75rem;
      font-weight: normal;
      color: #64748b;
    }
    .ar-field__input {
      padding: 0.5rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.875rem;
      background: #ffffff;
      color: #0f172a;
      transition:
        border-color 0.15s ease,
        box-shadow 0.15s ease;

      &:focus {
        outline: none;
        border-color: #0284c7;
        box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
      }
    }
    .ar-mono {
      font-family: monospace;
    }
    .lines-table-container {
      overflow-x: auto;
      margin: 0.25rem 0 1rem;
    }
    .lines-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;

      th {
        background: #f8fafc;
        padding: 0.6rem 0.75rem;
        text-align: left;
        color: #475569;
        font-weight: 600;
        border-bottom: 2px solid #e2e8f0;
        white-space: nowrap;
      }

      td {
        padding: 0.5rem 0.5rem;
        border-bottom: 1px solid #f1f5f9;
        vertical-align: middle;
      }

      .select-account {
        width: 100%;
        min-width: 220px;
      }

      .text-right {
        text-align: right;
      }
      .text-center {
        text-align: center;
      }
      .font-bold {
        font-weight: 700;
      }
      .text-debit {
        color: #0284c7;
      }
      .text-credit {
        color: #16a34a;
      }

      .totals-row td {
        background: #f8fafc;
        border-top: 2px solid #cbd5e1;
        padding: 0.75rem 0.5rem;
      }
    }
    .btn-remove {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 0.85rem;
      cursor: pointer;
      padding: 0.35rem 0.5rem;
      border-radius: 4px;

      &:hover {
        color: #ef4444;
        background: #fee2e2;
      }
    }
    .btn-add-line {
      font-size: 0.825rem;
    }
    .balance-bar {
      padding: 0.75rem 1rem;
      border-radius: 6px;
      font-size: 0.875rem;
      display: flex;
      align-items: center;

      &--valid {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        color: #166534;
      }

      &--invalid {
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #991b1b;
      }
    }
    .error-msg {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
      padding: 0.75rem 1rem;
      border-radius: 6px;
      font-size: 0.85rem;
      margin: 0;
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 1rem;
      padding-top: 0.5rem;
    }
  `,
})
export class ArNewJournalVoucherPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly jvService = inject(JournalEntryService);
  private readonly coaService = inject(ChartOfAccountService);
  private readonly toasts = inject(ToastService);

  readonly JournalVoucherType = JournalVoucherType;

  protected readonly isEditing = signal(false);
  protected readonly editId = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Blank: the server numbers the voucher (JV-yyyy-nnnn) when it is saved. */
  protected entryNumber = '';
  protected entryDateUtc = new Date().toISOString().substring(0, 10);
  protected voucherType = JournalVoucherType.GeneralJournal;
  protected referenceDocumentNumber = '';
  protected narration = '';

  protected readonly accountOptions = signal<{ id: string; code: string; name: string }[]>([]);

  protected readonly lines = signal<VoucherLineVM[]>([{ ...BLANK_LINE }, { ...BLANK_LINE }]);

  protected readonly totalDebit = computed(() =>
    this.lines().reduce((acc, l) => acc + (Number(l.debitRupees) || 0), 0),
  );

  protected readonly totalCredit = computed(() =>
    this.lines().reduce((acc, l) => acc + (Number(l.creditRupees) || 0), 0),
  );

  protected readonly isBalanced = computed(() => {
    const diff = Math.abs(this.totalDebit() - this.totalCredit());
    return diff < 0.005 && this.totalDebit() > 0;
  });

  protected readonly balanceDifference = computed(() =>
    Math.abs(this.totalDebit() - this.totalCredit()),
  );

  constructor() {
    this.loadAccounts();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditing.set(true);
      this.editId.set(id);
      this.loadVoucher(id);
    }
  }

  private loadAccounts(): void {
    this.coaService.getList({ maxResultCount: 1000 }).subscribe({
      next: (res) => {
        const opts = (res.items ?? []).map((a) => ({
          id: a.id ?? '',
          code: a.accountCode,
          name: a.accountName,
        }));
        this.accountOptions.set(opts);
        if (opts.length === 0) {
          this.error.set(
            'This workspace has no ledger accounts yet. Set up the chart of accounts first (Finance → Chart of accounts).',
          );
        }
      },
      error: (e: unknown) =>
        this.error.set(readApiError(e, 'The chart of accounts could not be loaded.')),
    });
  }

  private loadVoucher(id: string): void {
    this.jvService.get(id).subscribe({
      next: (v) => this.populateFromDto(v),
      error: (e: unknown) => this.error.set(readApiError(e, 'Could not load journal voucher.')),
    });
  }

  private populateFromDto(v: JournalEntryDto): void {
    this.entryNumber = v.entryNumber;
    this.entryDateUtc = v.entryDateUtc
      ? v.entryDateUtc.substring(0, 10)
      : new Date().toISOString().substring(0, 10);
    this.voucherType = v.voucherType;
    this.referenceDocumentNumber = v.referenceDocumentNumber ?? '';
    this.narration = v.narration;

    if (v.lines && v.lines.length > 0) {
      this.lines.set(
        v.lines.map((l) => ({
          accountId: l.accountId,
          accountCode: l.accountCode,
          accountName: l.accountName,
          debitRupees: (l.debitAmountInPaise || 0) / 100,
          creditRupees: (l.creditAmountInPaise || 0) / 100,
          lineNarration: l.lineNarration ?? '',
          costCenter: l.costCenter ?? '',
        })),
      );
    }
  }

  onAccountChange(index: number, accountId: string): void {
    const opt = this.accountOptions().find((a) => a.id === accountId);
    if (!opt) return;

    this.lines.update((list) =>
      list.map((l, i) =>
        i === index ? { ...l, accountId: opt.id, accountCode: opt.code, accountName: opt.name } : l,
      ),
    );
  }

  updateLineNarration(index: number, val: string): void {
    this.lines.update((list) =>
      list.map((l, i) => (i === index ? { ...l, lineNarration: val } : l)),
    );
  }

  updateLineCostCenter(index: number, val: string): void {
    this.lines.update((list) => list.map((l, i) => (i === index ? { ...l, costCenter: val } : l)));
  }

  updateDebit(index: number, val: number): void {
    const num = Number(val) || 0;
    this.lines.update((list) =>
      list.map((l, i) =>
        i === index ? { ...l, debitRupees: num, creditRupees: num > 0 ? 0 : l.creditRupees } : l,
      ),
    );
  }

  updateCredit(index: number, val: number): void {
    const num = Number(val) || 0;
    this.lines.update((list) =>
      list.map((l, i) =>
        i === index ? { ...l, creditRupees: num, debitRupees: num > 0 ? 0 : l.debitRupees } : l,
      ),
    );
  }

  addLine(): void {
    this.lines.update((list) => [...list, { ...BLANK_LINE }]);
  }

  removeLine(index: number): void {
    if (this.lines().length <= 2) return;
    this.lines.update((list) => list.filter((_, i) => i !== index));
  }

  cancel(): void {
    void this.router.navigateByUrl('/finance/journal-entries');
  }

  submit(): void {
    if (this.busy()) return;

    if (!this.narration?.trim()) {
      this.error.set('Please enter a narration & audit note explaining this journal voucher.');
      this.toasts.error('Please enter a narration & audit note.');
      return;
    }

    if (this.totalDebit() <= 0) {
      this.error.set('Total voucher debit amount must be greater than ₹0.00.');
      this.toasts.error('Total voucher debit amount must be greater than ₹0.00.');
      return;
    }

    if (!this.isBalanced()) {
      const msg = `Voucher is out of balance by ₹${this.balanceDifference().toFixed(2)}. Total debits (₹${this.totalDebit().toFixed(2)}) must equal total credits (₹${this.totalCredit().toFixed(2)}).`;
      this.error.set(msg);
      this.toasts.error(msg);
      return;
    }

    const invalidLine = this.lines().find(
      (l) => !l.accountId || (l.debitRupees === 0 && l.creditRupees === 0),
    );
    if (invalidLine) {
      this.error.set(
        'Each ledger line must have an account selected and a non-zero debit or credit amount.',
      );
      this.toasts.error('Please complete all ledger lines.');
      return;
    }

    this.busy.set(true);
    this.error.set(null);

    const dtoLines: CreateJournalEntryLineDto[] = this.lines().map((l) => ({
      accountId: l.accountId,
      debitAmountInPaise: Math.round(l.debitRupees * 100),
      creditAmountInPaise: Math.round(l.creditRupees * 100),
      lineNarration: l.lineNarration?.trim() || undefined,
      costCenter: l.costCenter?.trim() || undefined,
    }));

    const input: CreateJournalEntryDto = {
      entryNumber: this.entryNumber.trim() || undefined,
      entryDateUtc: new Date(
        this.entryDateUtc || new Date().toISOString().substring(0, 10),
      ).toISOString(),
      voucherType: this.voucherType,
      narration: this.narration.trim(),
      referenceDocumentNumber: this.referenceDocumentNumber.trim() || undefined,
      lines: dtoLines,
    };

    const id = this.editId();

    // Saved as a draft; it reaches the ledger when someone posts it. The app-wide toast
    // confirms the save, or shows the server's reason for refusing it (kept on the page too).
    (id ? this.jvService.update(id, input) : this.jvService.create(input)).subscribe({
      next: () => {
        this.busy.set(false);
        void this.router.navigateByUrl('/finance/journal-entries');
      },
      error: (e: unknown) => {
        this.busy.set(false);
        this.error.set(readApiError(e, 'The journal voucher could not be saved.'));
      },
    });
  }
}
