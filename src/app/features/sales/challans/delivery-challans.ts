import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastService } from '../../../core/ui/toast.service';
import { errorMessage } from '../../activities/activity-logic';
import { environment } from '../../../../environments/environment';
import { ArTopbar } from '../../../layout/topbar';
import {
  DeliveryChallanDto,
  DispatchDeliveryChallanDto,
} from '../../../proxy/sales/delivery-challan.models';
import { DeliveryChallanService } from '../../../proxy/sales/delivery-challan.service';
import { DeliveryChallanStatus, DeliveryChallanType } from '../../../proxy/sales/sales-enums';
import { SalesInvoiceService } from '../../../proxy/sales/sales-invoice.service';
import { ArButton, ArChip, ArDialog, ChipTone } from '../../../ui';
import { PermissionService } from '@abp/ng.core';
import { grantedPolicy } from '../../../core/auth/permission';
import { ArNewDeliveryChallan } from './new-delivery-challan';

const MOCK_CHALLANS: DeliveryChallanDto[] = [
  {
    id: 'dc-1',
    challanNumber: 'DC-2026-0019',
    type: DeliveryChallanType.SupplyAgainstOrder,
    status: DeliveryChallanStatus.Dispatched,
    salesOrderId: 'so-1',
    salesOrderNumber: 'SO-2026-0041',
    customerId: 'c1',
    customerName: 'Kalyani Forge Ltd',
    customerAccountId: 'acc1',
    customerAccountName: 'Kalyani Group Pune',
    challanDateUtc: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    dispatchedAtUtc: new Date(Date.now() - 1 * 86_400_000).toISOString(),
    shippingAddress: 'Plant II, Chakan MIDC, Pune 410501',
    transporterName: 'VRL Logistics Ltd',
    vehicleNumber: 'MH 14 HG 4521',
    lrNumber: 'VRL-PUN-982104',
    ewayBillNumber: '281982736412',
    remarks: 'Material dispatched in 2 wooden crates with shock watch indicators.',
    creationTime: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    lines: [
      {
        id: 'dcl-1',
        deliveryChallanId: 'dc-1',
        lineNumber: 1,
        partNumber: 'HV-400-P',
        description: 'Proportional Directional Hydraulic Valve 350 Bar',
        hsnCode: '84812000',
        quantity: 4,
        unitOfMeasure: 'NOS',
      },
      {
        id: 'dcl-2',
        deliveryChallanId: 'dc-1',
        lineNumber: 2,
        partNumber: 'FK-HD-04',
        description: 'High-pressure Filter Kit 10 Micron',
        hsnCode: '84212900',
        quantity: 8,
        unitOfMeasure: 'SET',
      },
    ],
  },
  {
    id: 'dc-2',
    challanNumber: 'DC-2026-0018',
    type: DeliveryChallanType.JobWork,
    status: DeliveryChallanStatus.Delivered,
    customerId: 'c2',
    customerName: 'Thermax Babcock Boiler Works',
    challanDateUtc: new Date(Date.now() - 7 * 86_400_000).toISOString(),
    dispatchedAtUtc: new Date(Date.now() - 7 * 86_400_000).toISOString(),
    deliveredAtUtc: new Date(Date.now() - 5 * 86_400_000).toISOString(),
    transporterName: 'Express Fleet Transport',
    vehicleNumber: 'MH 12 QX 9081',
    lrNumber: 'EFT-77123',
    ewayBillNumber: '281982664910',
    remarks: 'Sent for heat treatment and CNC grinding job work.',
    creationTime: new Date(Date.now() - 7 * 86_400_000).toISOString(),
    lines: [
      {
        id: 'dcl-3',
        deliveryChallanId: 'dc-2',
        lineNumber: 1,
        partNumber: 'ROTOR-SHAFT-75',
        description: 'EN24T Forged Turbine Shaft for Heat Treatment',
        hsnCode: '84831099',
        quantity: 2,
        unitOfMeasure: 'NOS',
      },
    ],
  },
  {
    id: 'dc-3',
    challanNumber: 'DC-2026-0020',
    type: DeliveryChallanType.SupplyAgainstOrder,
    status: DeliveryChallanStatus.Draft,
    customerId: 'c3',
    customerName: 'Deccan Pumps & Compressors',
    challanDateUtc: new Date().toISOString(),
    remarks: 'Ready for loading at Warehouse bay 3.',
    creationTime: new Date().toISOString(),
    lines: [
      {
        id: 'dcl-4',
        deliveryChallanId: 'dc-3',
        lineNumber: 1,
        partNumber: 'CS-SEAL-90',
        description: 'Mechanical Seal Cartridge SiC/SiC/Viton',
        hsnCode: '84841000',
        quantity: 5,
        unitOfMeasure: 'NOS',
      },
    ],
  },
];

@Component({
  selector: 'ar-delivery-challans',
  standalone: true,
  imports: [CommonModule, FormsModule, ArTopbar, ArButton, ArChip, ArDialog, ArNewDeliveryChallan],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Delivery challans"
      subtitle="Statutory delivery documents under GST Rule 55 for dispatch against sales orders, job work, and goods transit."
      help="In India, goods cannot move without an invoice or a Delivery Challan. Challans track vehicle numbers, Lorry Receipts (LR/AWB), and statutory 12-digit e-Way Bills before invoice generation."
    >
      @if (canCreate()) {
        <button ar-button type="button" variant="primary" icon="plus" (click)="creating.set(true)">
          New challan
        </button>
      }
    </ar-topbar>

    @if (creating()) {
      <ar-new-delivery-challan (closed)="created($event)" />
    }

    <div class="challans-shell">
      @if (loadError(); as e) {
        <p class="load-error" role="alert">
          {{ e }}
          <button ar-button variant="ghost" (click)="loadChallans()">Try again</button>
        </p>
      }
      <!-- Filter Bar -->
      <div class="filters-bar">
        <div class="search-input-wrap">
          <input
            type="text"
            class="ar-input"
            placeholder="Search by challan #, LR #, vehicle # or customer..."
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
            All ({{ challans().length }})
          </button>
          <button
            class="pill-btn"
            [class.active]="selectedStatus() === DeliveryChallanStatus.Draft"
            (click)="selectedStatus.set(DeliveryChallanStatus.Draft)"
          >
            Draft
          </button>
          <button
            class="pill-btn"
            [class.active]="selectedStatus() === DeliveryChallanStatus.Dispatched"
            (click)="selectedStatus.set(DeliveryChallanStatus.Dispatched)"
          >
            Dispatched
          </button>
          <button
            class="pill-btn"
            [class.active]="selectedStatus() === DeliveryChallanStatus.Delivered"
            (click)="selectedStatus.set(DeliveryChallanStatus.Delivered)"
          >
            Delivered
          </button>
          <button
            class="pill-btn"
            [class.active]="selectedStatus() === DeliveryChallanStatus.Invoiced"
            (click)="selectedStatus.set(DeliveryChallanStatus.Invoiced)"
          >
            Invoiced
          </button>
        </div>
      </div>

      <!-- Challans Table -->
      <div class="table-card">
        <table class="ar-table">
          <thead>
            <tr>
              <th>Challan #</th>
              <th>Customer</th>
              <th>Order Ref</th>
              <th>Purpose (GST Rule 55)</th>
              <th>Dispatch Date</th>
              <th>Logistics (LR & Vehicle)</th>
              <th>Status</th>
              <th class="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (dc of filteredChallans(); track dc.id) {
              <tr class="challan-row" (click)="selectedChallan.set(dc)">
                <td class="font-mono font-bold text-primary">{{ dc.challanNumber }}</td>
                <td>
                  <div class="font-semibold">{{ dc.customerName }}</div>
                  @if (dc.customerAccountName) {
                    <div class="text-xs text-muted">{{ dc.customerAccountName }}</div>
                  }
                </td>
                <td class="font-mono text-xs">
                  {{ dc.salesOrderNumber || 'Direct' }}
                </td>
                <td>
                  <span class="type-tag">{{ getChallanTypeLabel(dc.type) }}</span>
                </td>
                <td>
                  {{
                    dc.dispatchedAtUtc
                      ? (dc.dispatchedAtUtc | date: 'dd MMM yyyy')
                      : (dc.challanDateUtc | date: 'dd MMM yyyy')
                  }}
                </td>
                <td>
                  @if (dc.vehicleNumber || dc.lrNumber) {
                    <div class="font-mono text-xs">{{ dc.vehicleNumber || '—' }}</div>
                    <div class="text-muted text-xs">LR: {{ dc.lrNumber || '—' }}</div>
                  } @else {
                    <span class="text-muted text-xs">Pending dispatch</span>
                  }
                </td>
                <td>
                  <ar-chip [tone]="getStatusTone(dc.status)">
                    {{ getStatusLabel(dc.status) }}
                  </ar-chip>
                </td>
                <td class="actions-col" (click)="$event.stopPropagation()">
                  <div class="row-actions">
                    <button class="action-btn" (click)="selectedChallan.set(dc)">View</button>
                    @if (dc.status === DeliveryChallanStatus.Draft) {
                      <button class="action-btn primary" (click)="openDispatchDialog(dc)">
                        Dispatch
                      </button>
                    }
                    @if (dc.status === DeliveryChallanStatus.Dispatched) {
                      <button class="action-btn success" (click)="markDelivered(dc)">
                        Delivered
                      </button>
                    }
                    @if (
                      dc.status === DeliveryChallanStatus.Dispatched ||
                      dc.status === DeliveryChallanStatus.Delivered
                    ) {
                      <button
                        class="action-btn primary"
                        title="Generate GST Invoice"
                        (click)="createInvoiceFromChallan(dc)"
                      >
                        Invoice
                      </button>
                    }
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="8" class="empty-state">No delivery challans found.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- Challan Details Drawer -->
    @if (selectedChallan(); as dc) {
      <ar-dialog
        [title]="'Delivery Challan: ' + dc.challanNumber + ' (' + dc.customerName + ')'"
        (dismiss)="selectedChallan.set(null)"
      >
        <div class="detail-body">
          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-lbl">Status</span>
              <ar-chip [tone]="getStatusTone(dc.status)">{{ getStatusLabel(dc.status) }}</ar-chip>
            </div>
            <div class="meta-item">
              <span class="meta-lbl">Rule 55 Purpose</span>
              <span class="meta-val">{{ getChallanTypeLabel(dc.type) }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-lbl">Transporter</span>
              <span class="meta-val">{{ dc.transporterName || 'Self / Local Vehicle' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-lbl">Vehicle Number</span>
              <span class="meta-val font-mono">{{ dc.vehicleNumber || '—' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-lbl">Lorry Receipt (LR) #</span>
              <span class="meta-val font-mono">{{ dc.lrNumber || '—' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-lbl">e-Way Bill Number</span>
              <span class="meta-val font-mono">{{ dc.ewayBillNumber || '—' }}</span>
            </div>
            <div class="meta-item full">
              <span class="meta-lbl">Delivery / Site Address</span>
              <span class="meta-val">{{ dc.shippingAddress || 'Not specified' }}</span>
            </div>
            @if (dc.remarks) {
              <div class="meta-item full">
                <span class="meta-lbl">Remarks / Instructions</span>
                <span class="meta-val">{{ dc.remarks }}</span>
              </div>
            }
          </div>

          <h4 class="section-title">Consigned Items</h4>
          <table class="ar-table inner-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Part Number & Description</th>
                <th>HSN Code</th>
                <th class="num-col">Quantity</th>
                <th>UOM</th>
              </tr>
            </thead>
            <tbody>
              @for (l of dc.lines; track l.id) {
                <tr>
                  <td>{{ l.lineNumber }}</td>
                  <td>
                    <div class="font-bold">{{ l.partNumber }}</div>
                    <div class="text-muted text-xs">{{ l.description }}</div>
                  </td>
                  <td class="font-mono text-xs">{{ l.hsnCode || '—' }}</td>
                  <td class="num-col font-bold">{{ l.quantity }}</td>
                  <td>{{ l.unitOfMeasure || 'NOS' }}</td>
                </tr>
              }
            </tbody>
          </table>

          <div class="drawer-actions">
            @if (dc.status === DeliveryChallanStatus.Draft) {
              <button ar-button variant="primary" (click)="openDispatchDialog(dc)">
                Dispatch Consignment
              </button>
            }
            @if (dc.status === DeliveryChallanStatus.Dispatched) {
              <button ar-button variant="ghost" (click)="markDelivered(dc)">
                Mark as Delivered
              </button>
            }
            @if (
              dc.status === DeliveryChallanStatus.Dispatched ||
              dc.status === DeliveryChallanStatus.Delivered
            ) {
              <button ar-button variant="primary" (click)="createInvoiceFromChallan(dc)">
                Bill Delivery (Tax Invoice)
              </button>
            }
          </div>
        </div>
      </ar-dialog>
    }

    <!-- Dispatch Dialog -->
    @if (dispatchDialogChallan(); as dc) {
      <ar-dialog
        [title]="'Dispatch Challan: ' + dc.challanNumber"
        (dismiss)="dispatchDialogChallan.set(null)"
      >
        <div class="dispatch-form">
          <div class="form-group">
            <label>Transporter Name *</label>
            <input
              type="text"
              class="ar-input"
              [(ngModel)]="dispatchInput.transporterName"
              placeholder="e.g. VRL Logistics, TCI Express"
            />
          </div>
          <div class="form-row">
            <div class="form-group flex-1">
              <label>Vehicle Number *</label>
              <input
                type="text"
                class="ar-input"
                [(ngModel)]="dispatchInput.vehicleNumber"
                placeholder="e.g. MH 12 AB 1234"
              />
            </div>
            <div class="form-group flex-1">
              <label>LR / Docket Number</label>
              <input
                type="text"
                class="ar-input"
                [(ngModel)]="dispatchInput.lrNumber"
                placeholder="e.g. VRL-99210"
              />
            </div>
          </div>
          <div class="form-group">
            <label>GST e-Way Bill Number (12 digits)</label>
            <input
              type="text"
              class="ar-input font-mono"
              [(ngModel)]="dispatchInput.ewayBillNumber"
              placeholder="e.g. 281982736412"
            />
          </div>

          <div class="dialog-foot">
            <button ar-button variant="ghost" (click)="dispatchDialogChallan.set(null)">
              Cancel
            </button>
            <button ar-button variant="primary" (click)="submitDispatch(dc)">
              Confirm Dispatch
            </button>
          </div>
        </div>
      </ar-dialog>
    }
  `,
  styles: [
    `
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
      .challans-shell {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
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
      .challan-row {
        cursor: pointer;
        transition: background-color 0.1s ease;
      }
      .challan-row:hover {
        background-color: var(--ar-surface-hover, #f8fafc);
      }
      .type-tag {
        font-size: 0.75rem;
        background: var(--ar-surface-sunken, #f1f5f9);
        padding: 0.125rem 0.5rem;
        border-radius: 4px;
        font-weight: 500;
      }
      .num-col {
        text-align: right;
      }
      .actions-col {
        text-align: right;
        width: 160px;
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
      /* Detail drawer */
      .detail-body {
        padding: 1rem 0;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }
      .meta-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
        background: var(--ar-surface-sunken, #f8fafc);
        padding: 1rem;
        border-radius: 6px;
      }
      .meta-item.full {
        grid-column: span 2;
      }
      .meta-lbl {
        display: block;
        font-size: 0.75rem;
        color: var(--ar-ink-muted, #64748b);
        margin-bottom: 0.25rem;
      }
      .meta-val {
        font-size: 0.875rem;
        font-weight: 500;
      }
      .section-title {
        font-size: 0.875rem;
        font-weight: 700;
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--ar-ink-muted, #64748b);
      }
      .inner-table {
        border: 1px solid var(--ar-line, #e2e8f0);
      }
      .drawer-actions {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
        padding-top: 1rem;
        border-top: 1px solid var(--ar-line, #e2e8f0);
      }
      /* Dispatch form */
      .dispatch-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1rem 0;
      }
      .form-row {
        display: flex;
        gap: 1rem;
      }
      .flex-1 {
        flex: 1;
      }
      .form-group label {
        display: block;
        font-size: 0.75rem;
        font-weight: 600;
        margin-bottom: 0.25rem;
        color: var(--ar-ink-muted, #64748b);
      }
      .dialog-foot {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        padding-top: 1rem;
        border-top: 1px solid var(--ar-line, #e2e8f0);
      }
    `,
  ],
})
export class ArDeliveryChallans {
  private readonly challanService = inject(DeliveryChallanService);
  private readonly invoiceService = inject(SalesInvoiceService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly DeliveryChallanStatus = DeliveryChallanStatus;

  private readonly toasts = inject(ToastService);
  private readonly permissions = inject(PermissionService);

  protected readonly canCreate = grantedPolicy(
    'AutoReach.DeliveryChallans.Create',
    this.permissions,
  );
  /** The new-challan form is open. */
  protected readonly creating = signal(false);

  /** Demo rows only in mock mode; a real workspace sees its own challans or none. */
  challans = signal<DeliveryChallanDto[]>(environment.useMockData ? MOCK_CHALLANS : []);
  loadError = signal<string | null>(null);
  searchQuery = signal<string>('');
  selectedStatus = signal<DeliveryChallanStatus | null>(null);
  selectedChallan = signal<DeliveryChallanDto | null>(null);
  dispatchDialogChallan = signal<DeliveryChallanDto | null>(null);

  dispatchInput: DispatchDeliveryChallanDto = {
    transporterName: '',
    vehicleNumber: '',
    lrNumber: '',
    ewayBillNumber: '',
  };

  filteredChallans = computed(() => {
    let list = this.challans();
    const st = this.selectedStatus();
    if (st !== null) {
      list = list.filter((c) => c.status === st);
    }
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.challanNumber.toLowerCase().includes(q) ||
          c.customerName.toLowerCase().includes(q) ||
          (c.lrNumber && c.lrNumber.toLowerCase().includes(q)) ||
          (c.vehicleNumber && c.vehicleNumber.toLowerCase().includes(q)),
      );
    }
    return list;
  });

  constructor() {
    this.loadChallans();
    // ?open=<id> (from Customer 360 and other links) opens that record's panel.
    const openId = this.route.snapshot.queryParamMap.get('open');
    if (openId && !environment.useMockData) {
      this.challanService.get(openId).subscribe({
        next: (record) => {
          if (record) this.selectedChallan.set(record);
        },
      });
    }
  }

  protected created(challan: DeliveryChallanDto | null): void {
    this.creating.set(false);
    if (!challan) return;
    this.challans.update((list) => [challan, ...list]);
    this.selectedChallan.set(challan);
    this.toasts.success(`Challan ${challan.challanNumber} saved as a draft.`);
  }

  loadChallans() {
    if (!environment.useMockData) {
      this.challanService.getList({ maxResultCount: 100 }).subscribe({
        next: (res) => {
          this.challans.set(res?.items ?? []);
          this.loadError.set(null);
        },
        error: (e: unknown) => {
          this.loadError.set(errorMessage(e, 'Delivery challans could not be loaded.'));
        },
      });
    }
  }

  openDispatchDialog(dc: DeliveryChallanDto) {
    this.dispatchInput = {
      transporterName: dc.transporterName || '',
      vehicleNumber: dc.vehicleNumber || '',
      lrNumber: dc.lrNumber || '',
      ewayBillNumber: dc.ewayBillNumber || '',
    };
    this.dispatchDialogChallan.set(dc);
  }

  submitDispatch(dc: DeliveryChallanDto) {
    if (!dc.id) return;
    if (!environment.useMockData) {
      this.challanService.dispatch(dc.id, this.dispatchInput).subscribe({
        next: (updated) => {
          this.updateChallanInList(updated);
          this.dispatchDialogChallan.set(null);
        },
        error: (e: unknown) =>
          this.toasts.error(errorMessage(e, `${dc.challanNumber} could not be dispatched.`)),
      });
    } else {
      this.mockDispatch(dc);
    }
  }

  private mockDispatch(dc: DeliveryChallanDto) {
    const updated: DeliveryChallanDto = {
      ...dc,
      status: DeliveryChallanStatus.Dispatched,
      dispatchedAtUtc: new Date().toISOString(),
      transporterName: this.dispatchInput.transporterName,
      vehicleNumber: this.dispatchInput.vehicleNumber,
      lrNumber: this.dispatchInput.lrNumber,
      ewayBillNumber: this.dispatchInput.ewayBillNumber,
    };
    this.updateChallanInList(updated);
    this.dispatchDialogChallan.set(null);
  }

  markDelivered(dc: DeliveryChallanDto) {
    if (!dc.id) return;
    if (environment.useMockData) {
      this.updateChallanInList({
        ...dc,
        status: DeliveryChallanStatus.Delivered,
        deliveredAtUtc: new Date().toISOString(),
      });
      return;
    }
    this.challanService.markDelivered(dc.id).subscribe({
      next: (updated) => {
        this.updateChallanInList(updated);
      },
      error: (e: unknown) =>
        this.toasts.error(errorMessage(e, `${dc.challanNumber} could not be marked delivered.`)),
    });
  }

  createInvoiceFromChallan(dc: DeliveryChallanDto) {
    if (!dc.id) return;
    if (environment.useMockData) {
      this.router.navigate(['/sales/invoices']);
      return;
    }
    this.invoiceService.createFromChallan(dc.id).subscribe({
      next: (invoice) => {
        this.router.navigate(['/sales/invoices'], { queryParams: { open: invoice.id } });
      },
      error: (e: unknown) =>
        this.toasts.error(
          errorMessage(e, `An invoice could not be raised for ${dc.challanNumber}.`),
        ),
    });
  }

  private updateChallanInList(updated: DeliveryChallanDto) {
    this.challans.update((list) => list.map((c) => (c.id === updated.id ? updated : c)));
    if (this.selectedChallan()?.id === updated.id) {
      this.selectedChallan.set(updated);
    }
  }

  getChallanTypeLabel(type: DeliveryChallanType): string {
    switch (type) {
      case DeliveryChallanType.SupplyAgainstOrder:
        return 'Supply against Order';
      case DeliveryChallanType.JobWork:
        return 'Job Work (Rule 55(1)(b))';
      case DeliveryChallanType.SupplyOnApproval:
        return 'Supply on Approval';
      case DeliveryChallanType.MaterialReturn:
        return 'Material Return';
      default:
        return 'Other Supply';
    }
  }

  getStatusLabel(status: DeliveryChallanStatus): string {
    switch (status) {
      case DeliveryChallanStatus.Draft:
        return 'Draft';
      case DeliveryChallanStatus.Dispatched:
        return 'In Transit';
      case DeliveryChallanStatus.Delivered:
        return 'Delivered';
      case DeliveryChallanStatus.Invoiced:
        return 'Invoiced';
      case DeliveryChallanStatus.Cancelled:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  }

  getStatusTone(status: DeliveryChallanStatus): ChipTone {
    switch (status) {
      case DeliveryChallanStatus.Draft:
        return 'neutral';
      case DeliveryChallanStatus.Dispatched:
        return 'amber';
      case DeliveryChallanStatus.Delivered:
        return 'good';
      case DeliveryChallanStatus.Invoiced:
        return 'teal';
      case DeliveryChallanStatus.Cancelled:
        return 'bad';
      default:
        return 'neutral';
    }
  }
}
