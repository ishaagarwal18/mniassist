import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { RouterLink } from '@angular/router';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { ConfirmService } from '../../../core/ui/confirm.service';
import { ToastService } from '../../../core/ui/toast.service';
import { readApiError } from '../../../core/util/api-error';
import { ArTopbar } from '../../../layout/topbar';
import {
  EInvoiceStatus,
  EWayBillStatus,
  GstAuditRegisterDto,
  GstComplianceService,
  GstPortalMode,
  GstPortalSettingsDto,
  GstPortalSettingsService,
  Gstr1Section,
  Gstr1SummaryDto,
  Gstr3bSummaryDto,
} from '../../../proxy/finance';
import { ArButton, ArChip, ChipTone } from '../../../ui';
import { ArGrid } from '../../../ui/grid';
import { askCancelReason, portalModeLabel, unofficialNumberChip } from './gst-portal.logic';
import { ArGstr2bPanel } from './gstr2b-panel';
import { ArCreditOpeningPanel } from './credit-opening-panel';
import { gstr3bTableRows, setOffRows } from './gstr3b.logic';

/** GST return periods (MMYYYY) for the last `count` months by the Indian calendar, newest first. */
export function recentReturnPeriods(
  count: number,
  now = Date.now(),
): { value: string; label: string }[] {
  const ist = new Date(now + 5.5 * 3_600_000);
  const out: { value: string; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth() - i, 1));
    const value = String(d.getUTCMonth() + 1).padStart(2, '0') + d.getUTCFullYear();
    const label = d.toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
    out.push({ value, label: i === 0 ? `${label} (current)` : label });
  }
  return out;
}

@Component({
  selector: 'app-gst-compliance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    DecimalPipe,
    RouterLink,
    ArTopbar,
    ArButton,
    ArChip,
    ArGrid,
    GridModule,
    ArGstr2bPanel,
    ArCreditOpeningPanel,
  ],
  template: `
    <ar-topbar title="GST Compliance & Statutory Auditor (GSTR-1, GSTR-3B, E-Way Bill)">
      <div actions class="topbar-actions">
        <a ar-button="ghost" routerLink="/finance/gst-compliance/connection"
          >GST portal: {{ portalLabel() }}</a
        >
        <select
          class="period-select"
          aria-label="Return period"
          [ngModel]="selectedPeriod()"
          (ngModelChange)="onPeriodChange($event)"
        >
          @for (p of periods; track p.value) {
            <option [value]="p.value">{{ p.label }}</option>
          }
        </select>
      </div>
    </ar-topbar>

    <div class="page-content">
      @if (summaryError()) {
        <p role="alert">The GSTR-3B summary could not be loaded.</p>
      }
      <!-- KPI Row -->
      <section class="kpi-grid" *ngIf="gstr3b() as summary">
        <div class="kpi-card">
          <span class="label">Outward Taxable Value</span>
          <strong class="value"
            >₹{{ summary.outwardTaxableInPaise / 100 | number: '1.2-2' }}</strong
          >
          <span class="sub">GSTR-1 Outward B2B / B2C Supplies</span>
        </div>
        <div class="kpi-card amber">
          <span class="label">Total Tax Output Liability</span>
          <strong class="value"
            >₹{{ summary.outwardTaxPayableInPaise / 100 | number: '1.2-2' }}</strong
          >
          <span class="sub">IGST + CGST + SGST Payable</span>
        </div>
        <div class="kpi-card teal">
          <span class="label">Net input tax credit (4C)</span>
          <strong class="value">₹{{ summary.eligibleItcInPaise / 100 | number: '1.2-2' }}</strong>
          <span class="sub">{{
            summary.hasGstr2b
              ? 'From GSTR-2B matched with your bills'
              : 'From bills marked matched by hand'
          }}</span>
        </div>
        <div class="kpi-card">
          <span class="label">Payable in cash</span>
          <strong class="value text-profit"
            >₹{{ summary.netGstPayableInCashInPaise / 100 | number: '1.2-2' }}</strong
          >
          <span class="sub">After setting credit off (Rule 88A), reverse charge included</span>
        </div>
      </section>

      <!-- Tabs Bar -->
      <section class="gst-tabs-card">
        <div class="tabs-group">
          <button
            class="tab-btn"
            [class.active]="activeTab() === 'register'"
            (click)="activeTab.set('register')"
          >
            Outward Invoices & E-Way / E-Invoice Hub
          </button>
          <button
            class="tab-btn"
            [class.active]="activeTab() === 'gstr1'"
            (click)="activeTab.set('gstr1')"
          >
            GSTR-1 Return Tables Summary
          </button>
          <button
            class="tab-btn"
            [class.active]="activeTab() === 'gstr2b'"
            (click)="activeTab.set('gstr2b')"
          >
            GSTR-2B Input Credit
          </button>
          <button
            class="tab-btn"
            [class.active]="activeTab() === 'gstr3b'"
            (click)="activeTab.set('gstr3b')"
          >
            GSTR-3B Tax & ITC Reconciliation
          </button>
        </div>
      </section>

      <!-- TAB 1: OUTWARD REGISTER & E-WAY / E-INVOICE -->
      <section *ngIf="activeTab() === 'register'" class="tab-content-container">
        @if (portal(); as p) {
          @if (p.mode === GstPortalMode.Off) {
            <p class="register-note">
              E-invoices and e-way bills are switched off.
              <a routerLink="/finance/gst-compliance/connection">Turn them on</a>.
            </p>
          } @else if (p.mode !== GstPortalMode.Live) {
            <p class="register-note">
              {{ portalLabel() }} mode: IRNs and e-way bill numbers generated here are rehearsals.
              They are not registered with the government and stay off your invoices.
              <a routerLink="/finance/gst-compliance/connection">Connect Masters India</a> to go
              live.
            </p>
          }
        }
        <div class="table-card">
          @if (loadError(); as e) {
            <p class="register-note register-note--bad" role="alert">{{ e }}</p>
          } @else if (!loading() && records().length === 0) {
            <p class="register-note">
              No issued sales invoices in this period. An invoice appears here once it is issued on
              Sales → Invoices; then its e-invoice and e-way bill can be generated.
            </p>
          }
          <ejs-grid
            arGrid="gst-register"
            [dataSource]="records()"
            aria-label="GST Outward Register"
          >
            <e-columns>
              <e-column field="documentNumber" headerText="Invoice #" width="150">
                <ng-template #template let-doc>
                  <span class="fw-bold font-mono">{{ doc.documentNumber }}</span>
                </ng-template>
              </e-column>
              <e-column field="documentDateUtc" headerText="Date" width="130">
                <ng-template #template let-doc>
                  {{ doc.documentDateUtc | date: 'mediumDate' }}
                </ng-template>
              </e-column>
              <e-column field="counterpartyLegalName" headerText="Counterparty & GSTIN" width="260">
                <ng-template #template let-doc>
                  <div class="client-block">
                    <span class="client-name">{{ doc.counterpartyLegalName }}</span>
                    <span class="client-gstin font-mono"
                      >{{ doc.counterpartyGstin }} (POS: {{ doc.placeOfSupplyStateCode }})</span
                    >
                  </div>
                </ng-template>
              </e-column>
              <e-column field="section" headerText="Section" width="130">
                <ng-template #template let-doc>
                  <span class="section-tag">{{ getSectionLabel(doc.section) }}</span>
                </ng-template>
              </e-column>
              <e-column
                field="taxableAmountInPaise"
                headerText="Taxable (₹)"
                textAlign="Right"
                width="140"
              >
                <ng-template #template let-doc>
                  <span class="font-mono"
                    >₹{{ doc.taxableAmountInPaise / 100 | number: '1.2-2' }}</span
                  >
                </ng-template>
              </e-column>
              <e-column headerText="Tax (₹)" textAlign="Right" width="140">
                <ng-template #template let-doc>
                  <span class="font-mono text-tax">
                    ₹{{
                      (doc.igstAmountInPaise + doc.cgstAmountInPaise + doc.sgstAmountInPaise) / 100
                        | number: '1.2-2'
                    }}
                  </span>
                </ng-template>
              </e-column>
              <e-column
                field="totalInvoiceValueInPaise"
                headerText="Total (₹)"
                textAlign="Right"
                width="140"
              >
                <ng-template #template let-doc>
                  <span class="font-mono fw-bold">
                    ₹{{ doc.totalInvoiceValueInPaise / 100 | number: '1.2-2' }}
                  </span>
                </ng-template>
              </e-column>
              <e-column field="eInvoiceStatus" headerText="E-Invoice (IRN)" width="180">
                <ng-template #template let-doc>
                  <div class="einvoice-cell">
                    <ar-chip [tone]="getEInvoiceTone(doc.eInvoiceStatus)">
                      {{ getEInvoiceLabel(doc.eInvoiceStatus) }}
                    </ar-chip>
                    @if (doc.irnHash && doc.eInvoiceStatus === EInvoiceStatus.Generated) {
                      @if (chip(doc.eInvoiceMode); as c) {
                        <ar-chip [tone]="c.tone" [title]="c.title">{{ c.label }}</ar-chip>
                      }
                    }
                    <span
                      class="irn-snippet"
                      *ngIf="doc.irnHash"
                      [title]="doc.irnHash"
                      translate="no"
                    >
                      IRN: {{ doc.irnHash.substring(0, 10) }}...
                    </span>
                    @if (doc.eInvoiceStatus === EInvoiceStatus.Failed && doc.eInvoiceLastError) {
                      <span class="irn-snippet" [title]="doc.eInvoiceLastError" translate="no">
                        {{ doc.eInvoiceLastError }}
                      </span>
                    }
                  </div>
                </ng-template>
              </e-column>
              <e-column field="eWayBillStatus" headerText="E-Way Bill" width="180">
                <ng-template #template let-doc>
                  <div class="eway-cell">
                    <ar-chip [tone]="getEWayTone(doc.eWayBillStatus)">
                      {{ getEWayLabel(doc.eWayBillStatus) }}
                    </ar-chip>
                    @if (doc.eWayBillNumber && doc.eWayBillStatus === EWayBillStatus.Active) {
                      @if (chip(doc.eWayBillMode); as c) {
                        <ar-chip [tone]="c.tone" [title]="c.title">{{ c.label }}</ar-chip>
                      }
                    }
                    <span class="ewb-num font-mono" *ngIf="doc.eWayBillNumber" translate="no">
                      #{{ doc.eWayBillNumber }}
                    </span>
                  </div>
                </ng-template>
              </e-column>
              <e-column headerText="Actions" width="170">
                <ng-template #template let-doc>
                  <div class="actions-cell">
                    <button
                      *ngIf="doc.canGenerateEInvoice"
                      ar-button="ghost"
                      class="btn-xs"
                      [disabled]="generatingIrns().has(doc.id)"
                      (click)="generateEInvoice(doc)"
                    >
                      {{
                        doc.eInvoiceStatus === EInvoiceStatus.Failed ? 'Retry IRN' : 'Generate IRN'
                      }}
                    </button>
                    <a
                      *ngIf="doc.eWayBillStatus !== EWayBillStatus.NotApplicable"
                      ar-button="ghost"
                      class="btn-xs"
                      [routerLink]="['/finance/gst-compliance/eway', doc.id]"
                    >
                      {{ doc.canGenerateEWayBill ? 'Generate E-Way' : 'E-way bill' }}
                    </a>
                    <button
                      *ngIf="
                        doc.eInvoiceStatus === EInvoiceStatus.Generated &&
                        doc.eWayBillStatus !== EWayBillStatus.Active
                      "
                      ar-button="ghost"
                      class="btn-xs"
                      [disabled]="generatingIrns().has(doc.id)"
                      (click)="cancelEInvoice(doc)"
                    >
                      Cancel IRN
                    </button>
                    <span *ngIf="isCompliant(doc)" class="text-success-check">
                      &#10003; Compliant
                    </span>
                  </div>
                </ng-template>
              </e-column>
            </e-columns>
          </ejs-grid>
        </div>
      </section>

      <!-- TAB 2: GSTR-1 RETURN TABLES -->
      <section *ngIf="activeTab() === 'gstr1'" class="tab-content-container">
        <div class="gstr1-grid">
          <div class="summary-card">
            <h4>Table 4: B2B Taxable Invoices</h4>
            <div class="card-metric">
              <span class="num">{{ gstr1().b2bInvoiceCount }} Invoices</span>
              <strong class="amt"
                >₹{{ gstr1().totalTaxableValueInPaise / 100 | number: '1.2-2' }}</strong
              >
            </div>
            <p class="desc">
              Outward supplies to registered business entities with GSTIN validation.
            </p>
          </div>

          <div class="summary-card">
            <h4>Table 9B: Credit & Debit Notes</h4>
            <div class="card-metric">
              <span class="num">{{ gstr1().cdnrCount }} Notes</span>
              <strong class="amt">₹{{ 200000 | number: '1.2-2' }}</strong>
            </div>
            <p class="desc">
              Registered credit notes issued for rate differentials or material returns.
            </p>
          </div>

          <div class="summary-card">
            <h4>Tax Liability Breakdown</h4>
            <div class="tax-breakdown-row">
              <span>Integrated Tax (IGST):</span>
              <strong>₹{{ gstr1().totalIgstInPaise / 100 | number: '1.2-2' }}</strong>
            </div>
            <div class="tax-breakdown-row">
              <span>Central Tax (CGST):</span>
              <strong>₹{{ gstr1().totalCgstInPaise / 100 | number: '1.2-2' }}</strong>
            </div>
            <div class="tax-breakdown-row">
              <span>State Tax (SGST):</span>
              <strong>₹{{ gstr1().totalSgstInPaise / 100 | number: '1.2-2' }}</strong>
            </div>
            <div class="tax-breakdown-total">
              <span>Total Tax Value:</span>
              <strong class="text-tax"
                >₹{{ gstr1().totalTaxValueInPaise / 100 | number: '1.2-2' }}</strong
              >
            </div>
          </div>
        </div>
      </section>

      <!-- TAB: GSTR-2B INPUT CREDIT -->
      @if (activeTab() === 'gstr2b') {
        <section class="tab-content-container">
          <ar-gstr2b-panel
            [period]="selectedPeriod()"
            [periodLabel]="periodLabel()"
            (changed)="reloadSummary()"
          />
        </section>
      }

      <!-- TAB 3: GSTR-3B RECONCILIATION -->
      <section *ngIf="activeTab() === 'gstr3b'" class="tab-content-container">
        <ejs-grid
          arGrid="gstr3b-reconciliation"
          [dataSource]="gstr3bRows()"
          aria-label="GSTR-3B Statutory Reconciliation"
          [arGridSearch]="false"
          [arGridTools]="false"
        >
          <e-columns>
            <e-column field="heading" headerText="Statutory Heading (GSTR-3B Table)" minWidth="280">
              <ng-template #template let-r>
                <strong class="font-medium">{{ r.heading }}</strong>
              </ng-template>
            </e-column>
            <e-column
              field="taxable"
              headerText="Total Taxable Value (₹)"
              width="180"
              [textAlign]="'Right'"
            >
              <ng-template #template let-r>
                <span class="font-mono">{{
                  r.taxable != null ? '₹' + (r.taxable | number: '1.2-2') : '-'
                }}</span>
              </ng-template>
            </e-column>
            <e-column
              field="igst"
              headerText="Integrated Tax IGST (₹)"
              width="180"
              [textAlign]="'Right'"
            >
              <ng-template #template let-r>
                <span class="font-mono">{{
                  r.igst != null ? '₹' + (r.igst | number: '1.2-2') : '-'
                }}</span>
              </ng-template>
            </e-column>
            <e-column
              field="cgst"
              headerText="Central Tax CGST (₹)"
              width="180"
              [textAlign]="'Right'"
            >
              <ng-template #template let-r>
                <span class="font-mono">{{
                  r.cgst != null ? '₹' + (r.cgst | number: '1.2-2') : '-'
                }}</span>
              </ng-template>
            </e-column>
            <e-column
              field="sgst"
              headerText="State Tax SGST (₹)"
              width="180"
              [textAlign]="'Right'"
            >
              <ng-template #template let-r>
                <span class="font-mono">{{
                  r.sgst != null ? '₹' + (r.sgst | number: '1.2-2') : '-'
                }}</span>
              </ng-template>
            </e-column>
            <e-column field="cess" headerText="Cess (₹)" width="140" [textAlign]="'Right'">
              <ng-template #template let-r>
                <span class="font-mono">{{
                  r.cess != null ? '₹' + (r.cess | number: '1.2-2') : '-'
                }}</span>
              </ng-template>
            </e-column>
            <e-column field="totalTax" headerText="Total Tax (₹)" width="190" [textAlign]="'Right'">
              <ng-template #template let-r>
                <strong
                  class="font-mono"
                  [class.text-tax]="r.type === 'outward'"
                  [class.text-success]="r.type === 'itc'"
                  [class.text-bad]="r.type === 'reversal'"
                  [class.text-profit]="r.type === 'cash'"
                >
                  ₹{{ r.totalTax | number: '1.2-2' }}
                </strong>
              </ng-template>
            </e-column>
          </e-columns>
        </ejs-grid>
        @if (gstr3b(); as b) {
          <h4 class="setoff-title">Set-off (Section 49, Rule 88A)</h4>
          <table class="setoff-table">
            <thead>
              <tr>
                <th></th>
                <th>IGST (₹)</th>
                <th>CGST (₹)</th>
                <th>SGST (₹)</th>
                <th>Cess (₹)</th>
                <th>Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              @for (r of setOff(); track r.heading) {
                <tr>
                  <th scope="row">{{ r.heading }}</th>
                  <td>{{ r.igst | number: '1.2-2' }}</td>
                  <td>{{ r.cgst | number: '1.2-2' }}</td>
                  <td>{{ r.sgst | number: '1.2-2' }}</td>
                  <td>{{ r.cess | number: '1.2-2' }}</td>
                  <td>
                    <strong>{{ r.total | number: '1.2-2' }}</strong>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <ar-credit-opening-panel
            [period]="selectedPeriod()"
            [label]="periodLabel()"
            (changed)="reloadSummary()"
          />
          @if (b.notes.length) {
            <ul class="gstr3b-notes">
              @for (n of b.notes; track n) {
                <li>{{ n }}</li>
              }
            </ul>
          }
          @if (!b.hasGstr2b) {
            <button ar-button="ghost" type="button" (click)="activeTab.set('gstr2b')">
              Import this month's GSTR-2B
            </button>
          }
        }
      </section>
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

        .period-select {
          padding: 0.45rem 0.85rem;
          border: 1px solid var(--ar-border, #cbd5e1);
          border-radius: 6px;
          font-size: 0.85rem;
          background: var(--ar-surface, #ffffff);
          font-weight: 600;
        }
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

      .gst-tabs-card {
        background: var(--ar-surface, #ffffff);
        border: 1px solid var(--ar-border, #e2e8f0);
        border-radius: 8px;
        padding: 0.5rem;
      }

      .tabs-group {
        display: flex;
        gap: 0.5rem;

        .tab-btn {
          padding: 0.6rem 1.25rem;
          font-size: 0.9rem;
          font-weight: 600;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s ease;

          &.active {
            background: var(--ar-primary, #1e293b);
            color: #ffffff;
          }
        }
      }

      .table-card {
        background: var(--ar-surface, #ffffff);
        border: 1px solid var(--ar-border, #e2e8f0);
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      }

      .data-table,
      .statement-table {
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
          padding: 0.65rem 1rem;
          border-bottom: 1px solid var(--ar-border, #f1f5f9);
          vertical-align: middle;
        }
      }

      .itc-row td {
        background: #f0fdf4;
      }

      .cash-payable-row td {
        background: #ecfdf5;
        border-top: 2px solid #10b981;
        font-size: 0.95rem;
      }

      .client-block {
        display: flex;
        flex-direction: column;

        .client-name {
          font-weight: 600;
          color: #0f172a;
        }

        .client-gstin {
          font-size: 0.75rem;
          color: #64748b;
        }
      }

      .section-tag {
        font-size: 0.75rem;
        background: #f1f5f9;
        color: #334155;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 600;
      }

      .einvoice-cell,
      .register-note {
        margin: 0 0 12px;
        padding: 10px 14px;
        border-radius: var(--ar-radius-control);
        background: var(--ar-bg-50);
        border: 1px solid var(--ar-line-200);
        font: 400 13px var(--ar-font-sans);
        color: var(--ar-ink-600);
      }
      .register-note--bad {
        background: var(--ar-red-100);
        border-color: var(--ar-red-200);
        color: var(--ar-bad-600);
      }
      .eway-cell {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;

        .irn-snippet,
        .ewb-num {
          font-size: 0.72rem;
          color: #64748b;
        }
      }

      .actions-cell {
        display: flex;
        gap: 0.4rem;
      }

      .text-success-check {
        font-size: 0.8rem;
        color: #16a34a;
        font-weight: 600;
      }

      .gstr1-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1.5rem;

        .summary-card {
          background: var(--ar-surface, #ffffff);
          border: 1px solid var(--ar-border, #e2e8f0);
          border-radius: 8px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;

          h4 {
            margin: 0;
            font-size: 1.05rem;
            color: #0f172a;
          }

          .card-metric {
            display: flex;
            justify-content: space-between;
            align-items: baseline;

            .num {
              font-size: 0.85rem;
              color: #64748b;
            }

            .amt {
              font-size: 1.4rem;
              font-family: monospace;
              color: #0284c7;
            }
          }

          .desc {
            margin: 0;
            font-size: 0.8rem;
            color: #64748b;
          }

          .tax-breakdown-row {
            display: flex;
            justify-content: space-between;
            font-size: 0.85rem;
            color: #475569;
          }

          .tax-breakdown-total {
            display: flex;
            justify-content: space-between;
            font-size: 0.95rem;
            padding-top: 0.5rem;
            border-top: 1px solid #e2e8f0;
            font-weight: 700;
          }
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
        font-weight: 700;
      }
      .font-mono {
        font-family: monospace;
      }
      .text-tax {
        color: #f59e0b;
        font-weight: 600;
      }
      .text-bad {
        color: var(--ar-bad-600);
      }
      .text-success {
        color: #16a34a;
      }
      .text-profit {
        color: #059669;
      }
      .text-right {
        text-align: right;
      }
      .mb-3 {
        margin-bottom: 0.75rem;
      }
      .mt-4 {
        margin-top: 1rem;
      }
      .setoff-title {
        margin: 1.25rem 0 0.5rem;
        font-size: 0.95rem;
      }
      .setoff-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85rem;
      }
      .setoff-table th,
      .setoff-table td {
        padding: 6px 8px;
        border-bottom: 1px solid var(--ar-line-100);
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
      .setoff-table th[scope='row'],
      .setoff-table thead th:first-child {
        text-align: left;
      }
      .gstr3b-notes {
        margin: 1rem 0;
        padding-left: 1.1rem;
        font-size: 0.82rem;
        color: var(--ar-ink-500);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GstComplianceComponent {
  private readonly gstService = inject(GstComplianceService);
  private readonly toasts = inject(ToastService);

  /** The last twelve GST return periods (MMYYYY), this month first. */
  readonly periods = recentReturnPeriods(12);
  readonly selectedPeriod = signal(this.periods[0].value);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly activeTab = signal<'register' | 'gstr1' | 'gstr2b' | 'gstr3b'>('register');

  readonly records = signal<GstAuditRegisterDto[]>([]);

  readonly gstr1 = computed<Gstr1SummaryDto>(() => {
    const list = this.records();
    const b2b = list.filter((r) => r.section === Gstr1Section.B2B_4A).length;
    const cdnr = list.filter((r) => r.section === Gstr1Section.CDNR_9B).length;
    const taxable = list.reduce((acc, r) => acc + r.taxableAmountInPaise, 0);
    const igst = list.reduce((acc, r) => acc + r.igstAmountInPaise, 0);
    const cgst = list.reduce((acc, r) => acc + r.cgstAmountInPaise, 0);
    const sgst = list.reduce((acc, r) => acc + r.sgstAmountInPaise, 0);

    return {
      returnPeriod: this.selectedPeriod(),
      totalInvoiceCount: list.length,
      b2bInvoiceCount: b2b,
      b2cInvoiceCount: 0,
      cdnrCount: cdnr,
      totalTaxableValueInPaise: taxable,
      totalIgstInPaise: igst,
      totalCgstInPaise: cgst,
      totalSgstInPaise: sgst,
      totalTaxValueInPaise: igst + cgst + sgst,
      totalInvoiceValueInPaise: list.reduce((acc, r) => acc + r.totalInvoiceValueInPaise, 0),
    };
  });

  readonly gstr3b = signal<Gstr3bSummaryDto | null>(null);
  readonly summaryError = signal(false);

  /** GSTR-3B's rows as the form prints them: 3.1 and Table 4, in rupees. */
  readonly gstr3bRows = computed(() => {
    const b = this.gstr3b();
    return b ? gstr3bTableRows(b) : [];
  });

  readonly setOff = computed(() => {
    const b = this.gstr3b();
    return b ? setOffRows(b) : [];
  });

  /** The selected period's name, e.g. "November 2026". */
  readonly periodLabel = computed(
    () =>
      this.periods
        .find((p) => p.value === this.selectedPeriod())
        ?.label.replace(' (current)', '') ?? '',
  );

  /** Reads GSTR-3B again, after GSTR-2B changed. */
  async reloadSummary(): Promise<void> {
    const period = this.selectedPeriod();
    try {
      const summary = await firstValueFrom(this.gstService.getGstr3bSummary(period));
      if (period === this.selectedPeriod()) {
        this.gstr3b.set(summary);
        this.summaryError.set(false);
      }
    } catch {
      if (period === this.selectedPeriod()) this.summaryError.set(true);
    }
  }

  readonly GstPortalMode = GstPortalMode;
  readonly generatingIrns = signal(new Set<string>());
  protected readonly chip = unofficialNumberChip;

  private readonly portalService = inject(GstPortalSettingsService);
  private readonly confirm = inject(ConfirmService);

  /** The workspace's portal connection: where numbers come from. Null until loaded. */
  readonly portal = signal<GstPortalSettingsDto | null>(null);
  readonly portalLabel = computed(() => {
    const p = this.portal();
    if (!p) return '…';
    if ((p.mode === GstPortalMode.Sandbox || p.mode === GstPortalMode.Live) && !p.isConnected) {
      return 'not connected';
    }
    return portalModeLabel(p.mode);
  });
  readonly EInvoiceStatus = EInvoiceStatus;
  readonly EWayBillStatus = EWayBillStatus;
  readonly Gstr1Section = Gstr1Section;

  constructor() {
    void this.loadGstRecords();
    this.portalService.get({ skipHandleError: true }).subscribe({
      next: (p) => this.portal.set(p),
      error: () => this.portal.set(null),
    });
  }

  /** Every document the invoice needs is real (Live), and it needs at least one. */
  isCompliant(doc: GstAuditRegisterDto): boolean {
    const needsIrn = doc.eInvoiceStatus !== EInvoiceStatus.NotApplicable;
    const needsEwb = doc.eWayBillStatus !== EWayBillStatus.NotApplicable;
    const irnOk =
      !needsIrn ||
      (doc.eInvoiceStatus === EInvoiceStatus.Generated && doc.eInvoiceMode === GstPortalMode.Live);
    const ewbOk =
      !needsEwb ||
      (doc.eWayBillStatus === EWayBillStatus.Active && doc.eWayBillMode === GstPortalMode.Live);
    return (needsIrn || needsEwb) && irnOk && ewbOk;
  }

  /**
   * The period's register. Issued invoices that are not in it yet (issued before invoices were recorded on issue) are brought
   * in first, so every issued invoice can have its e-invoice and e-way bill generated.
   */
  async loadGstRecords(): Promise<void> {
    const period = this.selectedPeriod();
    this.loading.set(true);
    this.gstr3b.set(null);
    this.summaryError.set(false);
    this.loadError.set(null);
    try {
      try {
        await firstValueFrom(
          this.gstService.recordIssuedInvoices(period, { skipHandleError: true }),
        );
      } catch {
        // The list below still shows what is recorded.
      }
      const res = await firstValueFrom(
        this.gstService.getList({ returnPeriod: period, maxResultCount: 500 }),
      );
      if (period === this.selectedPeriod()) this.records.set(res.items ?? []);
      try {
        const summary = await firstValueFrom(this.gstService.getGstr3bSummary(period));
        if (period === this.selectedPeriod()) this.gstr3b.set(summary);
      } catch {
        if (period === this.selectedPeriod()) this.summaryError.set(true);
      }
    } catch {
      if (period === this.selectedPeriod()) {
        this.records.set([]);
        this.loadError.set('The GST register could not be loaded.');
      }
    } finally {
      if (period === this.selectedPeriod()) this.loading.set(false);
    }
  }

  onPeriodChange(period: string): void {
    this.selectedPeriod.set(period);
    void this.loadGstRecords();
  }

  getSectionLabel(sec: Gstr1Section): string {
    switch (sec) {
      case Gstr1Section.B2B_4A:
        return 'B2B (4A)';
      case Gstr1Section.B2CL_5:
        return 'B2C Large (5)';
      case Gstr1Section.B2CS_7:
        return 'B2C Small (7)';
      case Gstr1Section.CDNR_9B:
        return 'CDNR (9B)';
      case Gstr1Section.EXP_6:
        return 'Export (6)';
      case Gstr1Section.NIL_8:
        return 'Nil/Exempt (8)';
      case Gstr1Section.HSN_12:
        return 'HSN Summary (12)';
      default:
        return 'GST';
    }
  }

  getEInvoiceTone(status: EInvoiceStatus): ChipTone {
    switch (status) {
      case EInvoiceStatus.Generated:
        return 'good';
      case EInvoiceStatus.PendingGeneration:
        return 'amber';
      case EInvoiceStatus.Cancelled:
      case EInvoiceStatus.Failed:
        return 'bad';
      default:
        return 'neutral';
    }
  }

  getEInvoiceLabel(status: EInvoiceStatus): string {
    switch (status) {
      case EInvoiceStatus.Generated:
        return 'IRN Generated';
      case EInvoiceStatus.PendingGeneration:
        return 'IRN Pending';
      case EInvoiceStatus.Cancelled:
        return 'Cancelled';
      case EInvoiceStatus.Failed:
        return 'Failed';
      default:
        return 'N/A';
    }
  }

  getEWayTone(status: EWayBillStatus): ChipTone {
    switch (status) {
      case EWayBillStatus.Active:
        return 'good';
      case EWayBillStatus.PendingGeneration:
        return 'amber';
      case EWayBillStatus.Cancelled:
      case EWayBillStatus.Expired:
        return 'bad';
      default:
        return 'neutral';
    }
  }

  getEWayLabel(status: EWayBillStatus): string {
    switch (status) {
      case EWayBillStatus.Active:
        return 'E-Way Active';
      case EWayBillStatus.PendingGeneration:
        return 'E-Way Pending';
      case EWayBillStatus.Cancelled:
        return 'Cancelled';
      case EWayBillStatus.Expired:
        return 'Expired';
      default:
        return 'N/A';
    }
  }

  async generateEInvoice(doc: GstAuditRegisterDto): Promise<void> {
    const id = doc.id;
    if (!id || this.generatingIrns().has(id)) return;

    this.setBusy(id, true);
    try {
      // Say what is missing before anything goes to the portal.
      const ready = await firstValueFrom(
        this.gstService.getReadiness(id, { skipHandleError: true }),
      ).catch(() => null);
      if (ready?.eInvoiceProblems.length) {
        await this.confirm.confirm({
          title: `${doc.documentNumber} is not ready for an e-invoice`,
          message: 'Fix these, then generate the IRN.',
          details: ready.eInvoiceProblems,
          confirmText: 'OK',
          cancelText: 'Close',
        });
        return;
      }

      const updated = await firstValueFrom(
        this.gstService.generateEInvoice(id, { skipHandleError: true }),
      );
      this.updateRecordInState(updated);
      this.toasts.success(
        updated.eInvoiceMode === GstPortalMode.Live
          ? `IRN registered for ${doc.documentNumber}.`
          : `${portalModeLabel(updated.eInvoiceMode)} IRN generated for ${doc.documentNumber}. It is not registered with the government.`,
      );
    } catch (err) {
      this.toasts.error(readApiError(err, 'The IRN could not be generated.'));
      // The portal's reason is kept on the row; show it.
      await this.refreshRow(id);
    } finally {
      this.setBusy(id, false);
    }
  }

  async cancelEInvoice(doc: GstAuditRegisterDto): Promise<void> {
    const id = doc.id;
    if (!id || !doc.irnHash || this.generatingIrns().has(id)) return;

    const input = await askCancelReason(
      this.confirm,
      'e-invoice',
      `The IRN of ${doc.documentNumber}`,
      doc.eInvoiceMode === GstPortalMode.Live,
    );
    if (!input) return;

    this.setBusy(id, true);
    try {
      const updated = await firstValueFrom(
        this.gstService.cancelEInvoice(id, input, { skipHandleError: true }),
      );
      this.updateRecordInState(updated);
      this.toasts.success(`The e-invoice of ${doc.documentNumber} was cancelled.`);
    } catch (err) {
      this.toasts.error(readApiError(err, 'The e-invoice could not be cancelled.'));
    } finally {
      this.setBusy(id, false);
    }
  }

  private setBusy(id: string, busy: boolean): void {
    this.generatingIrns.update((pending) => {
      const next = new Set(pending);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  private async refreshRow(id: string): Promise<void> {
    try {
      this.updateRecordInState(
        await firstValueFrom(this.gstService.get(id, { skipHandleError: true })),
      );
    } catch {
      // The list keeps what it had.
    }
  }

  private updateRecordInState(updated: GstAuditRegisterDto): void {
    this.records.update((list) => list.map((r) => (r.id === updated.id ? updated : r)));
  }
}
