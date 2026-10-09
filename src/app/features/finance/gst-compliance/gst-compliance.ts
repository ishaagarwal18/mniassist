import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { ArTopbar } from '../../../layout/topbar';
import {
  EInvoiceStatus,
  EWayBillStatus,
  GenerateEWayBillInput,
  GstAuditRegisterDto,
  GstComplianceService,
  Gstr1Section,
  Gstr1SummaryDto,
  Gstr3bSummaryDto,
} from '../../../proxy/finance';
import { ArButton, ArChip, ArDialog, ChipTone } from '../../../ui';

const MOCK_GST_RECORDS: GstAuditRegisterDto[] = [
  {
    id: 'gst-1',
    documentNumber: 'INV-2026-0082',
    documentDateUtc: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    returnPeriod: '042026',
    section: Gstr1Section.B2B_4A,
    counterpartyGstin: '27AABCT2345A1Z2',
    counterpartyLegalName: 'Tata Motors Powertrain Ltd',
    placeOfSupplyStateCode: '27',
    isReverseChargeApplicable: false,
    taxableAmountInPaise: 35_00_000_00,
    gstRatePercent: 18,
    igstAmountInPaise: 0,
    cgstAmountInPaise: 3_15_000_00,
    sgstAmountInPaise: 3_15_000_00,
    cessAmountInPaise: 0,
    totalInvoiceValueInPaise: 41_30_000_00,
    eInvoiceStatus: EInvoiceStatus.Generated,
    irnHash: '8b4d1b823e59bcf7e1d5204859a0fbc5928d3ef71829e0839218d6e7f8a920b1',
    eInvoiceAckNo: '1120260400821',
    eInvoiceAckDateUtc: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    signedQrCode: 'https://einvoice1.gst.gov.in/verify?irn=8b4d1b823e59bcf7e1d5204859a0fbc5928d3ef71829e0839218d6e7f8a920b1',
    eWayBillStatus: EWayBillStatus.Active,
    ewayBillNumber: '271049283719',
    ewayBillValidUntilUtc: new Date(Date.now() + 2 * 86_400_000).toISOString(),
    transporterGstin: '27AAACG1234A1Z5',
    vehicleNumber: 'MH-14-BT-4590',
    distanceInKm: 140,
  },
  {
    id: 'gst-2',
    documentNumber: 'INV-2026-0083',
    documentDateUtc: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    returnPeriod: '042026',
    section: Gstr1Section.B2B_4A,
    counterpartyGstin: '22AAACJ5432B1Z8',
    counterpartyLegalName: 'Jindal Steel & Power Ltd',
    placeOfSupplyStateCode: '22',
    isReverseChargeApplicable: false,
    taxableAmountInPaise: 58_00_000_00,
    gstRatePercent: 18,
    igstAmountInPaise: 10_44_000_00,
    cgstAmountInPaise: 0,
    sgstAmountInPaise: 0,
    cessAmountInPaise: 0,
    totalInvoiceValueInPaise: 68_44_000_00,
    eInvoiceStatus: EInvoiceStatus.Generated,
    irnHash: '7a3c9e12089fba71823d018276f5a3b90284e7f8190283b749201948271a9c3d',
    eInvoiceAckNo: '1120260400832',
    eInvoiceAckDateUtc: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    eWayBillStatus: EWayBillStatus.Active,
    ewayBillNumber: '221049284820',
    ewayBillValidUntilUtc: new Date(Date.now() + 4 * 86_400_000).toISOString(),
    transporterGstin: '22AAACT9988C1Z1',
    vehicleNumber: 'CG-04-ME-1122',
    distanceInKm: 850,
  },
  {
    id: 'gst-3',
    documentNumber: 'INV-2026-0084',
    documentDateUtc: new Date(Date.now() - 1 * 86_400_000).toISOString(),
    returnPeriod: '042026',
    section: Gstr1Section.B2B_4A,
    counterpartyGstin: '27AAACB9876C1Z4',
    counterpartyLegalName: 'Bharat Forge Industrial',
    placeOfSupplyStateCode: '27',
    isReverseChargeApplicable: false,
    taxableAmountInPaise: 22_50_000_00,
    gstRatePercent: 18,
    igstAmountInPaise: 0,
    cgstAmountInPaise: 2_02_500_00,
    sgstAmountInPaise: 2_02_500_00,
    cessAmountInPaise: 0,
    totalInvoiceValueInPaise: 26_55_000_00,
    eInvoiceStatus: EInvoiceStatus.PendingGeneration,
    eWayBillStatus: EWayBillStatus.PendingGeneration,
  },
  {
    id: 'gst-4',
    documentNumber: 'CDN-2026-0004',
    documentDateUtc: new Date().toISOString(),
    returnPeriod: '042026',
    section: Gstr1Section.CDNR_9B,
    counterpartyGstin: '27AABCT2345A1Z2',
    counterpartyLegalName: 'Tata Motors Powertrain Ltd',
    placeOfSupplyStateCode: '27',
    isReverseChargeApplicable: false,
    taxableAmountInPaise: -2_00_000_00,
    gstRatePercent: 18,
    igstAmountInPaise: 0,
    cgstAmountInPaise: -18_000_00,
    sgstAmountInPaise: -18_000_00,
    cessAmountInPaise: 0,
    totalInvoiceValueInPaise: -2_36_000_00,
    eInvoiceStatus: EInvoiceStatus.NotApplicable,
    eWayBillStatus: EWayBillStatus.NotApplicable,
  },
];

@Component({
  selector: 'app-gst-compliance',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, DecimalPipe, ArTopbar, ArButton, ArChip, ArDialog],
  template: `
    <ar-topbar title="GST Compliance & Statutory Auditor (GSTR-1, GSTR-3B, E-Way Bill)">
      <div actions class="topbar-actions">
        <select class="period-select" [(ngModel)]="selectedPeriod" (change)="onPeriodChange()">
          <option value="042026">April 2026 (Active Return)</option>
          <option value="032026">March 2026 (Filed)</option>
          <option value="022026">February 2026 (Filed)</option>
        </select>
      </div>
    </ar-topbar>

    <div class="page-content">
      <!-- KPI Row -->
      <section class="kpi-grid">
        <div class="kpi-card">
          <span class="label">Outward Taxable Value</span>
          <strong class="value">₹{{ (gstr3b().outwardTaxableInPaise / 100) | number:'1.2-2' }}</strong>
          <span class="sub">GSTR-1 Outward B2B / B2C Supplies</span>
        </div>
        <div class="kpi-card amber">
          <span class="label">Total Tax Output Liability</span>
          <strong class="value">₹{{ (gstr3b().outwardTaxPayableInPaise / 100) | number:'1.2-2' }}</strong>
          <span class="sub">IGST + CGST + SGST Payable</span>
        </div>
        <div class="kpi-card teal">
          <span class="label">Eligible ITC (GSTR-2B)</span>
          <strong class="value">₹{{ (gstr3b().eligibleItcInPaise / 100) | number:'1.2-2' }}</strong>
          <span class="sub">3-Way matched vendor invoices</span>
        </div>
        <div class="kpi-card">
          <span class="label">Net GST Payable in Cash</span>
          <strong class="value text-profit">₹{{ (gstr3b().netGstPayableInCashInPaise / 100) | number:'1.2-2' }}</strong>
          <span class="sub">Net cash liability after ITC offset</span>
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
            [class.active]="activeTab() === 'gstr3b'"
            (click)="activeTab.set('gstr3b')"
          >
            GSTR-3B Tax & ITC Reconciliation
          </button>
        </div>
      </section>

      <!-- TAB 1: OUTWARD REGISTER & E-WAY / E-INVOICE -->
      <section *ngIf="activeTab() === 'register'" class="tab-content-container">
        <div class="table-card">
          <table class="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Counterparty & GSTIN</th>
                <th>Section</th>
                <th class="text-right">Taxable (₹)</th>
                <th class="text-right">Tax (₹)</th>
                <th class="text-right">Total (₹)</th>
                <th>E-Invoice (IRN)</th>
                <th>E-Way Bill</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let doc of records()">
                <td>
                  <span class="fw-bold font-mono">{{ doc.documentNumber }}</span>
                </td>
                <td>{{ doc.documentDateUtc | date:'mediumDate' }}</td>
                <td>
                  <div class="client-block">
                    <span class="client-name">{{ doc.counterpartyLegalName }}</span>
                    <span class="client-gstin font-mono">{{ doc.counterpartyGstin }} (POS: {{ doc.placeOfSupplyStateCode }})</span>
                  </div>
                </td>
                <td>
                  <span class="section-tag">{{ getSectionLabel(doc.section) }}</span>
                </td>
                <td class="text-right font-mono">
                  ₹{{ (doc.taxableAmountInPaise / 100) | number:'1.2-2' }}
                </td>
                <td class="text-right font-mono text-tax">
                  ₹{{ ((doc.igstAmountInPaise + doc.cgstAmountInPaise + doc.sgstAmountInPaise) / 100) | number:'1.2-2' }}
                </td>
                <td class="text-right font-mono fw-bold">
                  ₹{{ (doc.totalInvoiceValueInPaise / 100) | number:'1.2-2' }}
                </td>
                <td>
                  <div class="einvoice-cell">
                    <ar-chip [tone]="getEInvoiceTone(doc.eInvoiceStatus)">
                      {{ getEInvoiceLabel(doc.eInvoiceStatus) }}
                    </ar-chip>
                    <span class="irn-snippet" *ngIf="doc.irnHash" [title]="doc.irnHash">
                      IRN: {{ doc.irnHash.substring(0, 10) }}...
                    </span>
                  </div>
                </td>
                <td>
                  <div class="eway-cell">
                    <ar-chip [tone]="getEWayTone(doc.eWayBillStatus)">
                      {{ getEWayLabel(doc.eWayBillStatus) }}
                    </ar-chip>
                    <span class="ewb-num font-mono" *ngIf="doc.ewayBillNumber">
                      #{{ doc.ewayBillNumber }}
                    </span>
                  </div>
                </td>
                <td>
                  <div class="actions-cell">
                    <button
                      *ngIf="doc.eInvoiceStatus === EInvoiceStatus.PendingGeneration"
                      ar-button="ghost"
                      class="btn-xs"
                      (click)="generateEInvoice(doc)"
                    >
                      Generate IRN
                    </button>
                    <button
                      *ngIf="doc.eWayBillStatus === EWayBillStatus.PendingGeneration"
                      ar-button="ghost"
                      class="btn-xs"
                      (click)="openEWayBillModal(doc)"
                    >
                      Generate E-Way
                    </button>
                    <span *ngIf="doc.eInvoiceStatus === EInvoiceStatus.Generated && doc.eWayBillStatus === EWayBillStatus.Active" class="text-success-check">
                      &#10003; Compliant
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- TAB 2: GSTR-1 RETURN TABLES -->
      <section *ngIf="activeTab() === 'gstr1'" class="tab-content-container">
        <div class="gstr1-grid">
          <div class="summary-card">
            <h4>Table 4: B2B Taxable Invoices</h4>
            <div class="card-metric">
              <span class="num">{{ gstr1().b2bInvoiceCount }} Invoices</span>
              <strong class="amt">₹{{ (gstr1().totalTaxableValueInPaise / 100) | number:'1.2-2' }}</strong>
            </div>
            <p class="desc">Outward supplies to registered business entities with GSTIN validation.</p>
          </div>

          <div class="summary-card">
            <h4>Table 9B: Credit & Debit Notes</h4>
            <div class="card-metric">
              <span class="num">{{ gstr1().cdnrCount }} Notes</span>
              <strong class="amt">₹{{ 200000 | number:'1.2-2' }}</strong>
            </div>
            <p class="desc">Registered credit notes issued for rate differentials or material returns.</p>
          </div>

          <div class="summary-card">
            <h4>Tax Liability Breakdown</h4>
            <div class="tax-breakdown-row">
              <span>Integrated Tax (IGST):</span>
              <strong>₹{{ (gstr1().totalIgstInPaise / 100) | number:'1.2-2' }}</strong>
            </div>
            <div class="tax-breakdown-row">
              <span>Central Tax (CGST):</span>
              <strong>₹{{ (gstr1().totalCgstInPaise / 100) | number:'1.2-2' }}</strong>
            </div>
            <div class="tax-breakdown-row">
              <span>State Tax (SGST):</span>
              <strong>₹{{ (gstr1().totalSgstInPaise / 100) | number:'1.2-2' }}</strong>
            </div>
            <div class="tax-breakdown-total">
              <span>Total Tax Value:</span>
              <strong class="text-tax">₹{{ (gstr1().totalTaxValueInPaise / 100) | number:'1.2-2' }}</strong>
            </div>
          </div>
        </div>
      </section>

      <!-- TAB 3: GSTR-3B RECONCILIATION -->
      <section *ngIf="activeTab() === 'gstr3b'" class="tab-content-container">
        <div class="table-card">
          <table class="statement-table">
            <thead>
              <tr>
                <th>Statutory Heading (GSTR-3B Table)</th>
                <th class="text-right">Total Taxable Value (₹)</th>
                <th class="text-right">Integrated Tax IGST (₹)</th>
                <th class="text-right">Central Tax CGST (₹)</th>
                <th class="text-right">State Tax SGST (₹)</th>
                <th class="text-right">Total Tax Payable (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="fw-bold">3.1(a) Outward Taxable Supplies (Other than zero rated)</td>
                <td class="text-right font-mono">₹{{ (gstr3b().outwardTaxableInPaise / 100) | number:'1.2-2' }}</td>
                <td class="text-right font-mono">₹{{ (gstr1().totalIgstInPaise / 100) | number:'1.2-2' }}</td>
                <td class="text-right font-mono">₹{{ (gstr1().totalCgstInPaise / 100) | number:'1.2-2' }}</td>
                <td class="text-right font-mono">₹{{ (gstr1().totalSgstInPaise / 100) | number:'1.2-2' }}</td>
                <td class="text-right font-mono fw-bold text-tax">₹{{ (gstr3b().outwardTaxPayableInPaise / 100) | number:'1.2-2' }}</td>
              </tr>
              <tr class="itc-row">
                <td class="fw-bold">4. Eligible Input Tax Credit (ITC) Available from GSTR-2B</td>
                <td class="text-right font-mono">-</td>
                <td class="text-right font-mono">₹{{ ((gstr3b().eligibleItcInPaise * 0.5) / 100) | number:'1.2-2' }}</td>
                <td class="text-right font-mono">₹{{ ((gstr3b().eligibleItcInPaise * 0.25) / 100) | number:'1.2-2' }}</td>
                <td class="text-right font-mono">₹{{ ((gstr3b().eligibleItcInPaise * 0.25) / 100) | number:'1.2-2' }}</td>
                <td class="text-right font-mono fw-bold text-success">₹{{ (gstr3b().eligibleItcInPaise / 100) | number:'1.2-2' }}</td>
              </tr>
              <tr class="cash-payable-row">
                <td class="fw-bold">5. Net Tax Payable in Cash (Electronic Cash Ledger Deposit)</td>
                <td class="text-right font-mono">-</td>
                <td class="text-right font-mono">-</td>
                <td class="text-right font-mono">-</td>
                <td class="text-right font-mono">-</td>
                <td class="text-right font-mono fw-bold text-profit">₹{{ (gstr3b().netGstPayableInCashInPaise / 100) | number:'1.2-2' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- Generate E-Way Bill Modal -->
    <ar-dialog
      *ngIf="isEwbOpen()"
      title="Generate Automated GST E-Way Bill"
      (dismiss)="isEwbOpen.set(false)"
    >
      <div class="modal-body-container" *ngIf="targetRecord() as doc">
        <p class="mb-3">
          Generating E-Way Bill for Invoice <strong>{{ doc.documentNumber }}</strong> (Consignee: {{ doc.counterpartyLegalName }}).
        </p>

        <div class="form-grid">
          <div class="form-group">
            <label>Vehicle Number (Part B)</label>
            <input type="text" class="form-control" [(ngModel)]="ewbForm.vehicleNumber" placeholder="e.g. MH-12-QE-4590" />
          </div>
          <div class="form-group">
            <label>Transporter GSTIN</label>
            <input type="text" class="form-control" [(ngModel)]="ewbForm.transporterGstin" placeholder="27AAACT1234A1Z0" />
          </div>
          <div class="form-group">
            <label>Transit Distance (KM)</label>
            <input type="number" class="form-control" [(ngModel)]="ewbForm.distanceInKm" />
          </div>
        </div>

        <div class="dialog-actions mt-4">
          <button ar-button="primary" (click)="confirmGenerateEWayBill()">Generate & Sign E-Way Bill</button>
          <button ar-button="ghost" (click)="isEwbOpen.set(false)">Cancel</button>
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

        &.teal { border-left: 4px solid #0d9488; }
        &.amber { border-left: 4px solid #f59e0b; }

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

      .data-table, .statement-table {
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

      .einvoice-cell, .eway-cell {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;

        .irn-snippet, .ewb-num {
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

      .fw-bold { font-weight: 700; }
      .font-mono { font-family: monospace; }
      .text-tax { color: #f59e0b; font-weight: 600; }
      .text-success { color: #16a34a; }
      .text-profit { color: #059669; }
      .text-right { text-align: right; }
      .mb-3 { margin-bottom: 0.75rem; }
      .mt-4 { margin-top: 1rem; }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GstComplianceComponent {
  private readonly gstService = inject(GstComplianceService);

  readonly selectedPeriod = '042026';
  readonly activeTab = signal<'register' | 'gstr1' | 'gstr3b'>('register');

  readonly records = signal<GstAuditRegisterDto[]>(MOCK_GST_RECORDS);
  readonly targetRecord = signal<GstAuditRegisterDto | null>(null);
  readonly isEwbOpen = signal<boolean>(false);

  ewbForm: GenerateEWayBillInput = {
    vehicleNumber: 'MH-14-BT-4590',
    transporterGstin: '27AAACG1234A1Z5',
    distanceInKm: 150,
  };

  readonly gstr1 = computed<Gstr1SummaryDto>(() => {
    const list = this.records();
    const b2b = list.filter(r => r.section === Gstr1Section.B2B_4A).length;
    const cdnr = list.filter(r => r.section === Gstr1Section.CDNR_9B).length;
    const taxable = list.reduce((acc, r) => acc + r.taxableAmountInPaise, 0);
    const igst = list.reduce((acc, r) => acc + r.igstAmountInPaise, 0);
    const cgst = list.reduce((acc, r) => acc + r.cgstAmountInPaise, 0);
    const sgst = list.reduce((acc, r) => acc + r.sgstAmountInPaise, 0);

    return {
      returnPeriod: this.selectedPeriod,
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

  readonly gstr3b = computed<Gstr3bSummaryDto>(() => {
    const taxable = this.gstr1().totalTaxableValueInPaise;
    const outwardTax = this.gstr1().totalTaxValueInPaise;
    const eligibleItc = Math.round(outwardTax * 0.65);
    const netCash = Math.max(0, outwardTax - eligibleItc);

    return {
      returnPeriod: this.selectedPeriod,
      outwardTaxableInPaise: taxable,
      outwardTaxPayableInPaise: outwardTax,
      eligibleItcInPaise: eligibleItc,
      netGstPayableInCashInPaise: netCash,
      electronicCreditLedgerBalanceInPaise: 0,
    };
  });

  readonly EInvoiceStatus = EInvoiceStatus;
  readonly EWayBillStatus = EWayBillStatus;
  readonly Gstr1Section = Gstr1Section;

  constructor() {
    this.loadGstRecords();
  }

  loadGstRecords(): void {
    if (environment.useMockData) return;

    this.gstService.getList({ returnPeriod: this.selectedPeriod, maxResultCount: 100 }).subscribe({
      next: res => {
        if (res.items && res.items.length > 0) {
          this.records.set(res.items);
        }
      },
    });
  }

  onPeriodChange(): void {
    this.loadGstRecords();
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

  generateEInvoice(doc: GstAuditRegisterDto): void {
    if (!environment.useMockData && doc.id) {
      this.gstService.generateEInvoice(doc.id).subscribe({
        next: updated => this.updateRecordInState(updated),
      });
      return;
    }

    const updated: GstAuditRegisterDto = {
      ...doc,
      eInvoiceStatus: EInvoiceStatus.Generated,
      irnHash: '8b4d1b823e59bcf7e1d5204859a0fbc5928d3ef71829e0839218d6e7f8a920b1',
      eInvoiceAckNo: `11202604008${Math.floor(Math.random() * 90 + 10)}`,
      eInvoiceAckDateUtc: new Date().toISOString(),
      signedQrCode: 'https://einvoice1.gst.gov.in/verify',
    };
    this.updateRecordInState(updated);
  }

  openEWayBillModal(doc: GstAuditRegisterDto): void {
    this.targetRecord.set(doc);
    this.ewbForm = {
      vehicleNumber: 'MH-14-BT-4590',
      transporterGstin: '27AAACG1234A1Z5',
      distanceInKm: 150,
    };
    this.isEwbOpen.set(true);
  }

  confirmGenerateEWayBill(): void {
    const doc = this.targetRecord();
    if (!doc) return;

    if (!environment.useMockData && doc.id) {
      this.gstService.generateEWayBill(doc.id, this.ewbForm).subscribe({
        next: updated => {
          this.updateRecordInState(updated);
          this.isEwbOpen.set(false);
        },
      });
      return;
    }

    const updated: GstAuditRegisterDto = {
      ...doc,
      eWayBillStatus: EWayBillStatus.Active,
      ewayBillNumber: `27104928${Math.floor(Math.random() * 9000 + 1000)}`,
      ewayBillValidUntilUtc: new Date(Date.now() + 2 * 86_400_000).toISOString(),
      vehicleNumber: this.ewbForm.vehicleNumber,
      transporterGstin: this.ewbForm.transporterGstin,
      distanceInKm: this.ewbForm.distanceInKm,
    };
    this.updateRecordInState(updated);
    this.isEwbOpen.set(false);
  }

  private updateRecordInState(updated: GstAuditRegisterDto): void {
    this.records.update(list => list.map(r => (r.id === updated.id ? updated : r)));
  }
}
