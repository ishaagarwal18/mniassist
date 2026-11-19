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
  VendorDebitNoteDto,
  VendorDebitNoteService,
  VendorDebitNoteStatus,
} from '../../../proxy/purchasing';
import { ArButton, ArChip, ArIcon, ChipTone } from '../../../ui';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { ArGrid } from '../../../ui/grid';
import { PURCHASE_FORM_STYLES } from '../purchase-form';
import { PURCHASING_PERMISSIONS } from '../purchasing-permissions';

export function debitStatusChip(s: VendorDebitNoteStatus): { label: string; tone: ChipTone } {
  switch (s) {
    case VendorDebitNoteStatus.Issued:
      return { label: 'Issued, awaiting settlement', tone: 'amber' };
    case VendorDebitNoteStatus.Settled:
      return { label: 'Settled', tone: 'good' };
    case VendorDebitNoteStatus.Cancelled:
      return { label: 'Cancelled', tone: 'neutral' };
    default:
      return { label: 'Draft', tone: 'neutral' };
  }
}

/**
 * One vendor debit note on its own page (/purchasing/debit-notes/<id>): reason, bill and GRN links, items and GST, and the next
 * step the API allows: issue a draft to the supplier, settle an issued one, or cancel. Each asks first and shows done only once
 * the API agrees.
 */
@Component({
  selector: 'ar-debit-note-detail-page',
  imports: [ArTopbar, ArButton, ArChip, ArIcon, DatePipe, RouterLink, ArGrid, GridModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      help="One debit note: the reason, the bill and GRN it is against, the items and GST, with Issue and Settle."
      [title]="note() ? 'Debit note ' + note()!.debitNoteNumber : 'Debit note'"
      [subtitle]="note()?.supplierName ?? ''"
    />

    <div class="pf ar-scroll ar-scroll--bare">
      @if (loading()) {
        <p class="dd-muted">Loading the debit note…</p>
      } @else if (problem(); as p) {
        <section class="pf__card pf__denied" role="alert">
          <ar-icon name="alert" [size]="20" />
          <div>
            <strong>{{ p }}</strong>
          </div>
          <button ar-button variant="ghost" type="button" (click)="back()">Go back</button>
        </section>
      } @else if (note(); as n) {
        <div class="pf__form">
          <section class="pf__card">
            <div class="dd-head">
              <div>
                <span class="dd-label">Supplier</span>
                <h2 translate="no">{{ n.supplierName }}</h2>
                <span class="dd-muted">Issued {{ n.issueDateUtc | date: 'mediumDate' }}</span>
              </div>
              <ar-chip [tone]="status().tone">{{ status().label }}</ar-chip>
            </div>

            <div class="dd-reason">
              <span class="dd-label">Reason</span>
              <p>{{ n.reason }}</p>
              @if (n.remarks) {
                <p class="dd-muted">{{ n.remarks }}</p>
              }
            </div>

            <div class="dd-facts">
              <div class="dd-box">
                <h3>Against</h3>
                <dl>
                  <dt>Vendor bill</dt>
                  <dd>
                    @if (n.vendorBillId) {
                      <a [routerLink]="['/purchasing/bills', n.vendorBillId]">{{
                        n.vendorBillNumber || 'Open'
                      }}</a>
                    } @else {
                      {{ n.vendorBillNumber || 'None' }}
                    }
                  </dd>
                  <dt>Goods receipt</dt>
                  <dd>
                    @if (n.goodsReceiptNoteId) {
                      <a [routerLink]="['/purchasing/grn', n.goodsReceiptNoteId]">{{
                        n.goodsReceiptNoteNumber || 'Open'
                      }}</a>
                    } @else {
                      {{ n.goodsReceiptNoteNumber || 'None' }}
                    }
                  </dd>
                  <dt>Supply</dt>
                  <dd>{{ n.isInterState ? 'Other state (IGST)' : 'Same state (CGST + SGST)' }}</dd>
                </dl>
              </div>
              <div class="dd-box">
                <h3>Amount</h3>
                <dl>
                  <dt>Taxable value</dt>
                  <dd>{{ inr(n.taxableAmountInPaise) }}</dd>
                  @if (n.isInterState) {
                    <dt>IGST</dt>
                    <dd>{{ inr(n.igstInPaise) }}</dd>
                  } @else {
                    <dt>CGST + SGST</dt>
                    <dd>{{ inr(n.cgstInPaise) }} + {{ inr(n.sgstInPaise) }}</dd>
                  }
                  <dt class="dd-total">Debit total</dt>
                  <dd class="dd-total">{{ inr(n.grandTotalInPaise) }}</dd>
                </dl>
              </div>
            </div>
          </section>

          <section class="pf__card" aria-labelledby="dd-items">
            <header class="pf__head">
              <div>
                <h2 id="dd-items">Items debited</h2>
                <p>{{ n.lines.length }} item(s).</p>
              </div>
            </header>
            <ejs-grid
              arGrid="vendor-debit-note-lines"
              [dataSource]="n.lines"
              aria-label="Items debited"
            >
              <e-columns>
                <e-column field="partNumber" headerText="Part no." width="150">
                  <ng-template #template let-l>
                    <strong class="ar-mono">{{ l.partNumber }}</strong>
                  </ng-template>
                </e-column>
                <e-column field="description" headerText="Description" width="240"></e-column>
                <e-column field="quantity" headerText="Qty" width="90" [textAlign]="'Right'"></e-column>
                <e-column field="unitPriceInPaise" headerText="Rate" width="120" [textAlign]="'Right'">
                  <ng-template #template let-l>
                    {{ inr(l.unitPriceInPaise) }}
                  </ng-template>
                </e-column>
                <e-column field="taxableAmountInPaise" headerText="Taxable" width="120" [textAlign]="'Right'">
                  <ng-template #template let-l>
                    {{ inr(l.taxableAmountInPaise) }}
                  </ng-template>
                </e-column>
                <e-column field="taxRateBasisPoints" headerText="GST" width="100" [textAlign]="'Right'">
                  <ng-template #template let-l>
                    {{ l.taxRateBasisPoints / 100 }}%
                  </ng-template>
                </e-column>
                <e-column field="lineTotalInPaise" headerText="Total" width="130" [textAlign]="'Right'">
                  <ng-template #template let-l>
                    <strong>{{ inr(l.lineTotalInPaise) }}</strong>
                  </ng-template>
                </e-column>
              </e-columns>
            </ejs-grid>
          </section>

          <footer class="pf__bar">
            <span class="pf__summary"></span>
            <button ar-button variant="ghost" type="button" (click)="back()">Back</button>
            @if (
              can().cancel &&
              n.status !== VendorDebitNoteStatus.Settled &&
              n.status !== VendorDebitNoteStatus.Cancelled
            ) {
              <button
                ar-button
                variant="danger"
                type="button"
                [disabled]="busy()"
                (click)="cancelNote(n)"
              >
                Cancel debit note
              </button>
            }
            @if (can().issue && n.status === VendorDebitNoteStatus.Draft) {
              <button
                ar-button
                variant="primary"
                type="button"
                icon="send"
                [disabled]="busy()"
                (click)="issue(n)"
              >
                Issue to supplier
              </button>
            }
            @if (n.status === VendorDebitNoteStatus.Issued) {
              <button
                ar-button
                variant="primary"
                type="button"
                icon="check"
                [disabled]="busy()"
                (click)="settle(n)"
              >
                Mark settled
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
      .dd-muted {
        color: var(--ar-ink-500);
        font: 400 12.5px var(--ar-font-sans);
      }
      .dd-label {
        font: 600 10.5px var(--ar-font-sans);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--ar-ink-500);
      }
      .dd-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
        flex-wrap: wrap;
      }
      .dd-head h2 {
        margin: 2px 0;
        font: 600 18px var(--ar-font-sans);
      }
      .dd-reason p {
        margin: 4px 0 0;
        font: 500 14px var(--ar-font-sans);
      }
      .dd-facts {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 12px;
      }
      .dd-box {
        padding: 0.8rem 1rem;
        border-radius: var(--ar-radius-inset);
        background: var(--ar-bg-50);
        border: 1px solid var(--ar-line-100);
      }
      .dd-box h3 {
        margin: 0 0 8px;
        font: 600 10.5px var(--ar-font-sans);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--ar-ink-500);
      }
      .dd-box dl {
        margin: 0;
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 4px 16px;
        font: 400 13px var(--ar-font-sans);
      }
      .dd-box dt {
        color: var(--ar-ink-500);
      }
      .dd-box dd {
        margin: 0;
      }
      .dd-total {
        font-weight: 700;
        color: var(--ar-ink-900) !important;
      }
      .dd-table {
        overflow-x: auto;
      }
      .dd-table table {
        width: 100%;
        border-collapse: collapse;
        font: 400 13px var(--ar-font-sans);
      }
      .dd-table th {
        padding: 0.55rem 0.8rem;
        text-align: left;
        background: var(--ar-bg-50);
        border-bottom: 1px solid var(--ar-line-200);
        font: 600 11px var(--ar-font-sans);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--ar-ink-500);
      }
      .dd-table td {
        padding: 0.6rem 0.8rem;
        border-bottom: 1px solid var(--ar-line-100);
      }
      .num {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
    `,
  ],
})
export class ArDebitNoteDetailPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toasts = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly origin = inject(CockpitOriginService);
  private readonly api = inject(VendorDebitNoteService);
  private readonly permissions = inject(PermissionService);

  protected readonly inr = inr;
  protected readonly VendorDebitNoteStatus = VendorDebitNoteStatus;
  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';
  private readonly scope = readSupplierScope(this.route);

  protected readonly note = signal<VendorDebitNoteDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly problem = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly status = computed(() =>
    debitStatusChip(this.note()?.status ?? VendorDebitNoteStatus.Draft),
  );
  protected readonly can = computed(() => ({
    issue: checkPolicy(PURCHASING_PERMISSIONS.issueDebitNote, this.permissions),
    cancel: checkPolicy(PURCHASING_PERMISSIONS.cancelDebitNote, this.permissions),
  }));

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      this.note.set(await firstValueFrom(this.api.get(this.id, { skipHandleError: true })));
    } catch (e: unknown) {
      this.problem.set(readApiError(e, 'This debit note could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected async issue(n: VendorDebitNoteDto): Promise<void> {
    if (!(await this.confirm.confirm(issueConfirm(n)))) return;
    await this.run(() => this.api.issue(n.id!, { skipHandleError: true }), 'issued');
  }

  protected async settle(n: VendorDebitNoteDto): Promise<void> {
    if (!(await this.confirm.confirm(settleConfirm(n)))) return;
    await this.run(() => this.api.settle(n.id!, { skipHandleError: true }), 'settled');
  }

  protected async cancelNote(n: VendorDebitNoteDto): Promise<void> {
    const ok = await this.confirm.confirm({
      title: `Cancel ${n.debitNoteNumber}?`,
      message: `The debit of ${inr(n.grandTotalInPaise)} on ${n.supplierName} is withdrawn. This can't be undone.`,
      confirmText: 'Cancel debit note',
      cancelText: 'Keep it',
      tone: 'danger',
    });
    if (ok) await this.run(() => this.api.cancel(n.id!, { skipHandleError: true }), 'cancelled');
  }

  private async run(call: () => Observable<VendorDebitNoteDto>, what: string): Promise<void> {
    this.busy.set(true);
    try {
      const saved = await firstValueFrom(call());
      this.note.set(saved);
      this.toasts.success(`${saved.debitNoteNumber} ${what}.`);
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'That could not be done.'), 'Not saved');
    } finally {
      this.busy.set(false);
    }
  }

  protected back(): void {
    const list = this.router
      .createUrlTree(['/purchasing/debit-notes'], {
        queryParams: this.scope ? supplierScopeParams(this.scope) : {},
      })
      .toString();
    void this.router.navigateByUrl(this.origin.returnUrl(list));
  }
}

/** What issuing a draft does, for the user to check first (shared with the list). */
export function issueConfirm(n: VendorDebitNoteDto) {
  return {
    title: `Issue ${n.debitNoteNumber} to ${n.supplierName}?`,
    message: `Issued, it is final: ${inr(n.grandTotalInPaise)} is claimed from the supplier and can only be settled or cancelled.`,
    details: [
      `Reason: ${n.reason}`,
      ...(n.vendorBillNumber ? [`Against bill ${n.vendorBillNumber}`] : []),
      `${n.lines.length} item(s)`,
    ],
    confirmText: 'Issue',
    tone: 'primary' as const,
  };
}

/** What settling does, for the user to check first (shared with the list). */
export function settleConfirm(n: VendorDebitNoteDto) {
  return {
    title: `Mark ${n.debitNoteNumber} settled?`,
    message: `Confirm ${n.supplierName} has adjusted or refunded ${inr(n.grandTotalInPaise)}. This closes the debit note.`,
    details: [`Reason: ${n.reason}`],
    confirmText: 'Mark settled',
    tone: 'primary' as const,
  };
}
