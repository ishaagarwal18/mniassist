import { PermissionService } from '@abp/ng.core';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';

import { checkPolicy } from '../../../core/auth/permission';
import { ConfirmService } from '../../../core/ui/confirm.service';
import { ToastService } from '../../../core/ui/toast.service';
import { readApiError } from '../../../core/util/api-error';
import { inr } from '../../../core/util/format';
import { readSupplierScope, supplierScopeParams } from '../../../core/util/supplier-scope';
import { CockpitOriginService } from '../../../layout/cockpit-origin.service';
import { ArTopbar } from '../../../layout/topbar';
import {
  Gstr2bMatchStatus,
  VendorBillDto,
  VendorBillService,
  VendorBillStatus,
  VendorPaymentMode,
} from '../../../proxy/purchasing';
import { ArButton, ArChip, ArIcon } from '../../../ui';
import { PURCHASE_FORM_STYLES, isoDay } from '../purchase-form';
import { PURCHASING_PERMISSIONS } from '../purchasing-permissions';
import {
  PAYMENT_MODES,
  PaymentForm,
  billStatusChip,
  canApproveBill,
  canCancelBill,
  canPayBill,
  itcChip,
  matchChip,
  paymentModeLabel,
  toPaymentDto,
  validatePayment,
} from './bill-detail.logic';

/**
 * One vendor bill on its own page (/purchasing/bills/<id>): invoice, links to PO and GRN, TDS, lines, payments, and the actions
 * the role allows: approve, record a payment (`?pay=1` opens the form), mark GSTR-2B reconciled, cancel. Approve, pay and cancel
 * ask first; each shows done only once the API agrees.
 */
@Component({
  selector: 'ar-bill-detail-page',
  imports: [ArTopbar, ArButton, ArChip, ArIcon, DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      [title]="bill() ? 'Vendor bill ' + bill()!.billNumber : 'Vendor bill'"
      [subtitle]="bill() ? bill()!.supplierName + ' · invoice ' + bill()!.vendorInvoiceNumber : ''"
    />

    <div class="pf ar-scroll ar-scroll--bare">
      @if (loading()) {
        <p class="bd-muted">Loading the bill…</p>
      } @else if (problem(); as p) {
        <section class="pf__card pf__denied" role="alert">
          <ar-icon name="alert" [size]="20" />
          <div>
            <strong>{{ p }}</strong>
          </div>
          <button ar-button variant="ghost" type="button" (click)="back()">Go back</button>
        </section>
      } @else if (bill(); as b) {
        <div class="pf__form">
          <section class="pf__card">
            <div class="bd-head">
              <div>
                <span class="bd-label">Supplier</span>
                <h2 translate="no">{{ b.supplierName }}</h2>
                <span class="bd-muted"
                  >GSTIN <span class="ar-mono">{{ b.supplierGstin || 'not given' }}</span></span
                >
              </div>
              <div class="bd-chips">
                <ar-chip [tone]="chips().status.tone">{{ chips().status.label }}</ar-chip>
                <ar-chip [tone]="chips().match.tone">{{ chips().match.label }}</ar-chip>
                <ar-chip [tone]="chips().itc.tone">{{ chips().itc.label }}</ar-chip>
              </div>
            </div>

            <div class="bd-money">
              <div>
                <span>Invoice total</span><strong>{{ inr(b.grandTotalInPaise) }}</strong>
              </div>
              <div>
                <span>TDS withheld</span><strong>{{ inr(b.tdsDeductedInPaise) }}</strong>
              </div>
              <div>
                <span>Paid</span><strong>{{ inr(b.paidAmountInPaise) }}</strong>
              </div>
              <div [class.bd-due]="b.balanceDueInPaise > 0">
                <span>Balance due</span><strong>{{ inr(b.balanceDueInPaise) }}</strong>
              </div>
            </div>

            <div class="bd-facts">
              <div class="bd-box">
                <h3>Invoice & links</h3>
                <dl>
                  <dt>Invoice date</dt>
                  <dd>{{ b.vendorInvoiceDateUtc | date: 'mediumDate' }}</dd>
                  <dt>Due date</dt>
                  <dd>{{ b.dueDateUtc | date: 'mediumDate' }}</dd>
                  <dt>Purchase order</dt>
                  <dd>{{ b.purchaseOrderReference || 'None' }}</dd>
                  <dt>Goods receipt</dt>
                  <dd>
                    @if (b.goodsReceiptNoteId) {
                      <a [routerLink]="['/purchasing/grn', b.goodsReceiptNoteId]">{{
                        b.goodsReceiptNoteNumber || 'Open'
                      }}</a>
                    } @else {
                      {{ b.goodsReceiptNoteNumber || 'None' }}
                    }
                  </dd>
                </dl>
              </div>
              <div class="bd-box">
                <h3>Tax</h3>
                <dl>
                  <dt>Taxable value</dt>
                  <dd>{{ inr(b.subtotalInPaise) }}</dd>
                  @if (b.igstInPaise > 0) {
                    <dt>IGST</dt>
                    <dd>{{ inr(b.igstInPaise) }}</dd>
                  } @else {
                    <dt>CGST + SGST</dt>
                    <dd>{{ inr(b.cgstInPaise) }} + {{ inr(b.sgstInPaise) }}</dd>
                  }
                  <dt>TDS</dt>
                  <dd>
                    {{
                      b.tdsSection
                        ? b.tdsSection + ' · ' + b.tdsRateBasisPoints / 100 + '%'
                        : 'None'
                    }}
                  </dd>
                  <dt>Reverse charge</dt>
                  <dd>{{ b.isReverseCharge ? 'Yes' : 'No' }}</dd>
                </dl>
              </div>
            </div>
          </section>

          <section class="pf__card" aria-labelledby="bd-lines">
            <header class="pf__head">
              <div>
                <h2 id="bd-lines">Billed items</h2>
                <p>{{ b.lines.length }} item(s), HSN and GST per line.</p>
              </div>
            </header>
            <div class="bd-table">
              <table>
                <thead>
                  <tr>
                    <th>Part no.</th>
                    <th>Description</th>
                    <th>HSN</th>
                    <th class="num">Qty</th>
                    <th class="num">Rate</th>
                    <th class="num">Taxable</th>
                    <th class="num">GST</th>
                    <th class="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  @for (l of b.lines; track l.id) {
                    <tr>
                      <td class="ar-mono">
                        <strong>{{ l.partNumber }}</strong>
                      </td>
                      <td>{{ l.description }}</td>
                      <td class="ar-mono">{{ l.hsnCode || '—' }}</td>
                      <td class="num">{{ l.billedQuantity }}</td>
                      <td class="num">{{ inr(l.unitPriceInPaise) }}</td>
                      <td class="num">{{ inr(l.taxableAmountInPaise) }}</td>
                      <td class="num">{{ l.taxRateBasisPoints / 100 }}%</td>
                      <td class="num">
                        <strong>{{ inr(l.lineTotalInPaise) }}</strong>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>

          @if (b.payments.length) {
            <section class="pf__card" aria-labelledby="bd-pay">
              <header class="pf__head">
                <div>
                  <h2 id="bd-pay">Payments</h2>
                  <p>{{ b.payments.length }} payment(s) recorded.</p>
                </div>
              </header>
              <div class="bd-table">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Mode</th>
                      <th>Reference</th>
                      <th>TDS certificate</th>
                      <th class="num">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (p of b.payments; track p.id) {
                      <tr>
                        <td>{{ p.paymentDateUtc | date: 'mediumDate' }}</td>
                        <td>{{ modeLabel(p.paymentMode) }}</td>
                        <td class="ar-mono">{{ p.referenceNumber || '—' }}</td>
                        <td>{{ p.tdsCertificateNumber || '—' }}</td>
                        <td class="num bd-good">
                          <strong>{{ inr(p.amountInPaise) }}</strong>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          }

          @if (paying()) {
            <section class="pf__card bd-payform" aria-labelledby="bd-new-pay">
              <header class="pf__head">
                <span class="pf__step"><ar-icon name="billing" [size]="13" /></span>
                <div>
                  <h2 id="bd-new-pay">Record a payment</h2>
                  <p>Balance due {{ inr(b.balanceDueInPaise) }} after TDS.</p>
                </div>
              </header>
              <div class="pf__grid">
                <div class="ar-field">
                  <label class="ar-field__label" for="bd-amt"
                    >Amount ₹ <span class="pf__req">*</span></label
                  >
                  <input
                    id="bd-amt"
                    class="ar-field__input pf__num"
                    inputmode="decimal"
                    [attr.aria-invalid]="!!payErr('amount')"
                    [value]="pay().amount"
                    (input)="patchPay({ amount: $any($event.target).value })"
                  />
                  @if (payErr('amount'); as e) {
                    <span class="pf__err">{{ e }}</span>
                  }
                </div>
                <div class="ar-field">
                  <label class="ar-field__label" for="bd-mode">Mode</label>
                  <select
                    id="bd-mode"
                    class="ar-field__input"
                    (change)="patchPay({ mode: +$any($event.target).value })"
                  >
                    @for (m of modes; track m.value) {
                      <option [value]="m.value" [selected]="m.value === pay().mode">
                        {{ m.label }}
                      </option>
                    }
                  </select>
                </div>
                <div class="ar-field">
                  <label class="ar-field__label" for="bd-ref"
                    >UTR / reference
                    @if (pay().mode !== cash) {
                      <span class="pf__req">*</span>
                    }
                  </label>
                  <input
                    id="bd-ref"
                    class="ar-field__input ar-mono"
                    [attr.aria-invalid]="!!payErr('reference')"
                    [value]="pay().reference"
                    (input)="patchPay({ reference: $any($event.target).value })"
                  />
                  @if (payErr('reference'); as e) {
                    <span class="pf__err">{{ e }}</span>
                  }
                </div>
                <div class="ar-field">
                  <label class="ar-field__label" for="bd-date">Payment date</label>
                  <input
                    id="bd-date"
                    type="date"
                    class="ar-field__input"
                    [value]="pay().date"
                    (input)="patchPay({ date: $any($event.target).value })"
                  />
                </div>
                <div class="ar-field pf__span2">
                  <label class="ar-field__label" for="bd-tds"
                    >TDS certificate / challan <span class="ar-field__opt">optional</span></label
                  >
                  <input
                    id="bd-tds"
                    class="ar-field__input"
                    [value]="pay().tdsCertificate"
                    (input)="patchPay({ tdsCertificate: $any($event.target).value })"
                  />
                </div>
                <div class="ar-field pf__span2">
                  <label class="ar-field__label" for="bd-prem"
                    >Remarks <span class="ar-field__opt">optional</span></label
                  >
                  <input
                    id="bd-prem"
                    class="ar-field__input"
                    [value]="pay().remarks"
                    (input)="patchPay({ remarks: $any($event.target).value })"
                  />
                </div>
              </div>
              <div class="bd-actions">
                <button ar-button variant="ghost" type="button" (click)="paying.set(false)">
                  Cancel
                </button>
                <button
                  ar-button
                  variant="primary"
                  type="button"
                  icon="check"
                  [disabled]="busy()"
                  (click)="recordPayment(b)"
                >
                  Record payment
                </button>
              </div>
            </section>
          }

          <footer class="pf__bar">
            <span class="pf__summary"></span>
            <button ar-button variant="ghost" type="button" (click)="back()">Back</button>
            @if (can().cancel && canCancel(b)) {
              <button
                ar-button
                variant="danger"
                type="button"
                [disabled]="busy()"
                (click)="cancelBill(b)"
              >
                Cancel bill
              </button>
            }
            @if (
              b.gstr2bMatchStatus !== Gstr2bMatchStatus.MatchedIn2B &&
              b.status !== VendorBillStatus.Cancelled
            ) {
              <button
                ar-button
                variant="ghost"
                type="button"
                [disabled]="busy()"
                (click)="reconcile(b)"
              >
                Mark GSTR-2B reconciled
              </button>
            }
            @if (can().approve && canApprove(b)) {
              <button
                ar-button
                variant="primary"
                type="button"
                icon="check"
                [disabled]="busy()"
                (click)="approve(b)"
              >
                Approve
              </button>
            }
            @if (can().pay && canPay(b) && !paying()) {
              <button
                ar-button
                variant="primary"
                type="button"
                icon="billing"
                (click)="openPayment(b)"
              >
                Pay {{ inr(b.balanceDueInPaise) }}
              </button>
            }
          </footer>
        </div>
      }
    </div>
  `,
  styles: [
    PURCHASE_FORM_STYLES,
    `
      .bd-muted {
        color: var(--ar-ink-500);
        font: 400 12.5px var(--ar-font-sans);
      }
      .bd-label {
        font: 600 10.5px var(--ar-font-sans);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--ar-ink-500);
      }
      .bd-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
        flex-wrap: wrap;
      }
      .bd-head h2 {
        margin: 2px 0;
        font: 600 18px var(--ar-font-sans);
      }
      .bd-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .bd-money {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 10px;
      }
      .bd-money > div {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 0.7rem 0.9rem;
        border-radius: var(--ar-radius-inset);
        border: 1px solid var(--ar-line-100);
        border-left: 4px solid var(--ar-line-200);
      }
      .bd-money span {
        font: 600 10.5px var(--ar-font-sans);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--ar-ink-500);
      }
      .bd-money strong {
        font: 700 18px var(--ar-font-sans);
        font-variant-numeric: tabular-nums;
      }
      .bd-money .bd-due {
        border-left-color: var(--ar-amber-500);
      }
      .bd-facts {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 12px;
      }
      .bd-box {
        padding: 0.8rem 1rem;
        border-radius: var(--ar-radius-inset);
        background: var(--ar-bg-50);
        border: 1px solid var(--ar-line-100);
      }
      .bd-box h3 {
        margin: 0 0 8px;
        font: 600 10.5px var(--ar-font-sans);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--ar-ink-500);
      }
      .bd-box dl {
        margin: 0;
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 4px 16px;
        font: 400 13px var(--ar-font-sans);
      }
      .bd-box dt {
        color: var(--ar-ink-500);
      }
      .bd-box dd {
        margin: 0;
      }
      .bd-table {
        overflow-x: auto;
      }
      .bd-table table {
        width: 100%;
        border-collapse: collapse;
        font: 400 13px var(--ar-font-sans);
      }
      .bd-table th {
        padding: 0.55rem 0.8rem;
        text-align: left;
        background: var(--ar-bg-50);
        border-bottom: 1px solid var(--ar-line-200);
        font: 600 11px var(--ar-font-sans);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--ar-ink-500);
      }
      .bd-table td {
        padding: 0.6rem 0.8rem;
        border-bottom: 1px solid var(--ar-line-100);
      }
      .num {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
      .bd-good {
        color: var(--ar-good-700);
      }
      .bd-payform {
        border-color: var(--ar-blue-200);
      }
      .bd-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
    `,
  ],
})
export class ArBillDetailPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toasts = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly origin = inject(CockpitOriginService);
  private readonly api = inject(VendorBillService);
  private readonly permissions = inject(PermissionService);

  protected readonly inr = inr;
  protected readonly modes = PAYMENT_MODES;
  protected readonly cash = VendorPaymentMode.Cash;
  protected readonly Gstr2bMatchStatus = Gstr2bMatchStatus;
  protected readonly VendorBillStatus = VendorBillStatus;
  protected readonly modeLabel = paymentModeLabel;
  protected readonly canApprove = canApproveBill;
  protected readonly canPay = canPayBill;
  protected readonly canCancel = canCancelBill;

  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';
  private readonly scope = readSupplierScope(this.route);

  protected readonly bill = signal<VendorBillDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly problem = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected readonly paying = signal(false);
  protected readonly pay = signal<PaymentForm>({
    amount: '',
    mode: VendorPaymentMode.NeftRtgs,
    reference: '',
    date: isoDay(),
    tdsCertificate: '',
    remarks: '',
  });
  private readonly paySubmitted = signal(false);
  protected readonly payErrors = computed(() =>
    this.paySubmitted() && this.bill()
      ? validatePayment(this.pay(), this.bill()!.balanceDueInPaise)
      : {},
  );

  protected readonly chips = computed(() => {
    const b = this.bill()!;
    return {
      status: billStatusChip(b.status),
      match: matchChip(b.threeWayMatchStatus),
      itc: itcChip(b.gstr2bMatchStatus),
    };
  });
  protected readonly can = computed(() => {
    const has = (p: string) => checkPolicy(p, this.permissions);
    return {
      approve: has(PURCHASING_PERMISSIONS.approveBill),
      pay: has(PURCHASING_PERMISSIONS.payBill),
      cancel: has(PURCHASING_PERMISSIONS.cancelBill),
    };
  });

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const b = await firstValueFrom(this.api.get(this.id, { skipHandleError: true }));
      this.bill.set(b);
      if (this.route.snapshot.queryParamMap.get('pay') && canPayBill(b)) this.openPayment(b);
    } catch (e: unknown) {
      this.problem.set(readApiError(e, 'This bill could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected payErr(key: string): string | null {
    return this.payErrors()[key] ?? null;
  }

  protected patchPay(p: Partial<PaymentForm>): void {
    this.pay.update((f) => ({ ...f, ...p }));
  }

  protected openPayment(b: VendorBillDto): void {
    this.paySubmitted.set(false);
    this.pay.set({
      amount: String(b.balanceDueInPaise / 100),
      mode: VendorPaymentMode.NeftRtgs,
      reference: '',
      date: isoDay(),
      tdsCertificate: '',
      remarks: '',
    });
    this.paying.set(true);
    setTimeout(() => document.getElementById('bd-amt')?.focus());
  }

  protected async approve(b: VendorBillDto): Promise<void> {
    const ok = await this.confirm.confirm({
      title: `Approve ${b.billNumber}?`,
      message: `Approved, it can be paid. ${inr(b.netPayableInPaise)} becomes payable to ${b.supplierName}.`,
      details: [
        `Invoice ${b.vendorInvoiceNumber} · due ${new Date(b.dueDateUtc).toLocaleDateString('en-IN')}`,
        matchChip(b.threeWayMatchStatus).label,
      ],
      confirmText: 'Approve',
      tone: 'primary',
    });
    if (ok) await this.run(() => this.api.approve(b.id!, { skipHandleError: true }), 'approved');
  }

  protected async recordPayment(b: VendorBillDto): Promise<void> {
    this.paySubmitted.set(true);
    if (Object.keys(validatePayment(this.pay(), b.balanceDueInPaise)).length) return;
    const dto = toPaymentDto(this.pay());
    const ok = await this.confirm.confirm({
      title: `Record ${inr(dto.amountInPaise)} paid to ${b.supplierName}?`,
      message: `Against ${b.billNumber}. Balance after this: ${inr(b.balanceDueInPaise - dto.amountInPaise)}.`,
      details: [
        `${paymentModeLabel(dto.paymentMode)}${dto.referenceNumber ? ' · ' + dto.referenceNumber : ''}`,
        `Paid on ${new Date(this.pay().date).toLocaleDateString('en-IN')}`,
      ],
      confirmText: 'Record payment',
      tone: 'primary',
    });
    if (!ok) return;
    const done = await this.run(
      () => this.api.recordPayment(b.id!, dto, { skipHandleError: true }),
      `paid ${inr(dto.amountInPaise)}`,
    );
    if (done) this.paying.set(false);
  }

  protected async cancelBill(b: VendorBillDto): Promise<void> {
    const ok = await this.confirm.confirm({
      title: `Cancel ${b.billNumber}?`,
      message: `The bill for ${inr(b.grandTotalInPaise)} from ${b.supplierName} is cancelled and can no longer be paid. This can't be undone.`,
      confirmText: 'Cancel bill',
      cancelText: 'Keep bill',
      tone: 'danger',
    });
    if (ok) await this.run(() => this.api.cancel(b.id!, { skipHandleError: true }), 'cancelled');
  }

  protected async reconcile(b: VendorBillDto): Promise<void> {
    await this.run(
      () =>
        this.api.reconcileGstr2b(b.id!, Gstr2bMatchStatus.MatchedIn2B, { skipHandleError: true }),
      'marked as in GSTR-2B',
    );
  }

  /** Calls the API; on success shows the saved bill and a toast. */
  private async run(call: () => Observable<VendorBillDto>, what: string): Promise<boolean> {
    this.busy.set(true);
    try {
      const saved = await firstValueFrom(call());
      this.bill.set(saved);
      this.toasts.success(`${saved.billNumber} ${what}.`);
      return true;
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'That could not be done.'), 'Not saved');
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  protected back(): void {
    const list = this.router
      .createUrlTree(['/purchasing/bills'], {
        queryParams: this.scope ? supplierScopeParams(this.scope) : {},
      })
      .toString();
    void this.router.navigateByUrl(this.origin.returnUrl(list));
  }
}
