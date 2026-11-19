import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastService } from '../../../core/ui/toast.service';
import { ArTopbar } from '../../../layout/topbar';
import {
  BillOfMaterialDto,
  BillOfMaterialService,
  CreateWorkOrderDto,
  WorkOrderService,
} from '../../../proxy/manufacturing';
import { ArButton, ArCard, ArIcon } from '../../../ui';

const todayLocal = () => new Date().toLocaleDateString('en-CA');
const plusDaysLocal = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toLocaleDateString('en-CA');

@Component({
  selector: 'ar-new-work-order-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ArTopbar, ArCard, ArButton, ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      help="Plan a production batch: the product, quantity, start and finish dates and supervisor."
      title="New Work Order"
      subtitle="Production batches: routing stages, material kitting, QC inspections and shop floor dispatch"
    >
      <div actions class="topbar-actions">
        <a ar-button variant="ghost" routerLink="/manufacturing/work-orders">
          Back to Work Orders
        </a>
      </div>
    </ar-topbar>

    <div class="page-container ar-scroll">
      <form (submit)="$event.preventDefault(); submit()" class="wo-form-shell">
        <!-- Section 1: BOM Source Link (if any) -->
        @if (selectedBom(); as bom) {
          <div class="bom-banner">
            <span class="bom-banner__icon">
              <ar-icon name="machine" [size]="20" />
            </span>
            <div class="bom-banner__content">
              <strong
                >Linked to Bill of Materials:
                {{ bom.bomNumber || bom.finishedGoodPartNumber }}</strong
              >
              <p>
                Components and routing steps will be automatically exploded from this master BOM
                upon release.
              </p>
            </div>
            <button type="button" class="btn-clear-bom" (click)="clearSelectedBom()">
              Change / Unlink
            </button>
          </div>
        }

        <!-- Section 2: Assembly & Batch Details -->
        <ar-card heading="Production Batch & Assembly Details">
          <div class="form-grid">
            <div class="form-group full-width" *ngIf="boms().length > 0 && !selectedBom()">
              <label class="form-label">Link to Existing BOM (Optional)</label>
              <select class="ar-field__input" (change)="onBomSelected($any($event.target).value)">
                <option value="">-- Manual Part Entry or Select a Master BOM --</option>
                <option *ngFor="let b of boms()" [value]="b.id">
                  {{ b.bomNumber }} — {{ b.finishedGoodPartNumber }} ({{
                    b.finishedGoodDescription
                  }})
                </option>
              </select>
              <span class="field-hint"
                >Selecting a BOM auto-fills the finished good part number and description.</span
              >
            </div>

            <div class="form-group">
              <label class="form-label">Part Number <span class="required">*</span></label>
              <input
                type="text"
                class="ar-field__input font-mono"
                required
                placeholder="e.g. HV-400-P or PLC-PNL-400A"
                [(ngModel)]="newWo.partNumber"
                name="partNumber"
              />
            </div>

            <div class="form-group">
              <label class="form-label"
                >Batch / Lot Number
                <span class="ar-field__opt">blank: next in sequence</span></label
              >
              <input
                type="text"
                class="ar-field__input font-mono"
                placeholder="Assigned on save, e.g. BAT-2026-0042"
                [(ngModel)]="newWo.batchNumber"
                name="batchNumber"
              />
            </div>

            <div class="form-group full-width">
              <label class="form-label">Assembly Description <span class="required">*</span></label>
              <input
                type="text"
                class="ar-field__input"
                required
                placeholder="e.g. Proportional Directional Hydraulic Valve 350 Bar"
                [(ngModel)]="newWo.description"
                name="description"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Quantity to Produce <span class="required">*</span></label>
              <input
                type="number"
                min="1"
                class="ar-field__input"
                required
                [(ngModel)]="newWo.plannedQuantity"
                name="plannedQuantity"
              />
              <span class="field-hint">Planned target units to manufacture.</span>
            </div>

            <div class="form-group">
              <label class="form-label">Work Order Number</label>
              <input
                type="text"
                class="ar-field__input font-mono"
                placeholder="Assigned automatically (e.g. WO-2026-0082)"
                [(ngModel)]="newWo.workOrderNumber"
                name="workOrderNumber"
              />
              <span class="field-hint">Leave blank to auto-generate from factory sequence.</span>
            </div>
          </div>
        </ar-card>

        <!-- Section 3: Scheduling & Supervision -->
        <ar-card heading="Shop Floor Scheduling & Supervision">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Assigned Production Supervisor</label>
              <input
                type="text"
                class="ar-field__input"
                placeholder="e.g. Rameshwar Patil (Production Lead)"
                [(ngModel)]="newWo.assignedSupervisor"
                name="assignedSupervisor"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Linked Sales Order (Optional)</label>
              <input
                type="text"
                class="ar-field__input font-mono"
                placeholder="e.g. SO-2026-0012"
                [(ngModel)]="salesOrderReference"
                name="salesOrderReference"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Planned Start Date</label>
              <input
                type="date"
                class="ar-field__input"
                [(ngModel)]="newWo.plannedStartDateUtc"
                name="plannedStartDateUtc"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Planned Target Finish Date</label>
              <input
                type="date"
                class="ar-field__input"
                [min]="newWo.plannedStartDateUtc"
                [(ngModel)]="newWo.plannedEndDateUtc"
                name="plannedEndDateUtc"
              />
            </div>

            <div class="form-group full-width">
              <label class="form-label">Work Order Notes & Shop Floor Instructions</label>
              <textarea
                class="ar-field__input"
                rows="3"
                placeholder="Special manufacturing directives: hydraulic calibration tolerances at 350 bar, heat treatment specifications, inspection gates, etc."
                [(ngModel)]="newWo.remarks"
                name="remarks"
              ></textarea>
            </div>
          </div>
        </ar-card>

        @if (formError(); as e) {
          <div class="form-error-alert" role="alert">
            <ar-icon name="alert" [size]="16" />
            <span>{{ e }}</span>
          </div>
        }

        <!-- Bottom Form Actions -->
        <div class="form-actions">
          <button ar-button variant="primary" type="submit" [disabled]="isBusy()">
            {{ isBusy() ? 'Creating Work Order…' : 'Create Work Order' }}
          </button>
          <a ar-button variant="ghost" routerLink="/manufacturing/work-orders"> Cancel </a>
        </div>
      </form>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        padding-bottom: 3rem;
      }

      .page-container {
        padding: 1.5rem 2rem;
        max-width: 960px;
        margin: 0 auto;
      }

      .wo-form-shell {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .topbar-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .bom-banner {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 8px;
        padding: 1rem 1.25rem;
        display: flex;
        align-items: center;
        gap: 1rem;

        &__icon {
          color: #16a34a;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        &__content {
          flex: 1;

          strong {
            display: block;
            font-size: 0.95rem;
            color: #166534;
          }

          p {
            margin: 0.2rem 0 0 0;
            font-size: 0.8rem;
            color: #15803d;
          }
        }

        .btn-clear-bom {
          background: none;
          border: 1px solid #86efac;
          color: #166534;
          padding: 0.35rem 0.75rem;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;

          &:hover {
            background: #dcfce7;
          }
        }
      }

      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.25rem;
        padding: 0.5rem 0;

        @media (max-width: 768px) {
          grid-template-columns: 1fr;
        }
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;

        &.full-width {
          grid-column: 1 / -1;
        }
      }

      .form-label {
        font-size: 0.85rem;
        font-weight: 600;
        color: #334155;

        .required {
          color: #ef4444;
        }
      }

      .field-hint {
        font-size: 0.75rem;
        color: #64748b;
      }

      .ar-field__input {
        padding: 0.55rem 0.85rem;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        font-size: 0.9rem;
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

      .font-mono {
        font-family: monospace;
      }

      .form-error-alert {
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #b91c1c;
        padding: 0.85rem 1rem;
        border-radius: 6px;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.85rem;
      }

      .form-actions {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding-top: 1rem;
      }
    `,
  ],
})
export class ArNewWorkOrderPage implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly woService = inject(WorkOrderService);
  private readonly bomService = inject(BillOfMaterialService);
  private readonly toasts = inject(ToastService);

  readonly isBusy = signal<boolean>(false);
  readonly formError = signal<string | null>(null);
  readonly boms = signal<BillOfMaterialDto[]>([]);
  readonly selectedBom = signal<BillOfMaterialDto | null>(null);

  salesOrderReference = '';

  newWo: CreateWorkOrderDto = {
    workOrderNumber: '',
    partNumber: '',
    description: '',
    batchNumber: '',
    plannedQuantity: 10,
    plannedStartDateUtc: todayLocal(),
    plannedEndDateUtc: plusDaysLocal(10),
    assignedSupervisor: '',
    remarks: '',
  };

  ngOnInit(): void {
    this.loadBoms();
    this.checkQueryParams();
  }

  private loadBoms(): void {
    this.bomService.getList({ maxResultCount: 100 }).subscribe({
      next: (res) => {
        const items = res.items ?? [];
        this.boms.set(items);
        const qBomId = this.route.snapshot.queryParamMap.get('bomId');
        if (qBomId) {
          const matched = items.find((b) => b.id === qBomId);
          if (matched) this.selectedBom.set(matched);
        }
      },
      error: () => {},
    });
  }

  private checkQueryParams(): void {
    const q = this.route.snapshot.queryParamMap;
    const bomId = q.get('bomId');
    const partNumber = q.get('partNumber');
    const description = q.get('description');
    const qty = q.get('plannedQuantity');

    if (bomId) {
      this.newWo.billOfMaterialId = bomId;
    }
    if (partNumber) {
      this.newWo.partNumber = partNumber;
    }
    if (description) {
      this.newWo.description = description;
    }
    if (qty && Number(qty) > 0) {
      this.newWo.plannedQuantity = Number(qty);
    }
  }

  onBomSelected(bomId: string): void {
    if (!bomId) {
      this.clearSelectedBom();
      return;
    }
    const match = this.boms().find((b) => b.id === bomId);
    if (match) {
      this.selectedBom.set(match);
      this.newWo.billOfMaterialId = match.id;
      this.newWo.partNumber = match.finishedGoodPartNumber;
      this.newWo.description = match.finishedGoodDescription;
    }
  }

  clearSelectedBom(): void {
    this.selectedBom.set(null);
    this.newWo.billOfMaterialId = undefined;
  }

  submit(): void {
    const w = this.newWo;
    const missing = [
      !w.partNumber?.trim() && 'the part number',
      !w.description?.trim() && 'the description',
      !(Number(w.plannedQuantity) > 0) && 'the quantity',
    ].filter(Boolean);

    if (missing.length) {
      this.formError.set(`Please fill in ${missing.join(', ')}.`);
      return;
    }

    if (w.plannedEndDateUtc < w.plannedStartDateUtc) {
      this.formError.set('The planned target finish date cannot be before the start date.');
      return;
    }

    this.formError.set(null);
    this.isBusy.set(true);

    const input: CreateWorkOrderDto = {
      workOrderNumber: w.workOrderNumber?.trim() || undefined,
      billOfMaterialId: w.billOfMaterialId || undefined,
      salesOrderId: this.salesOrderReference?.trim() || undefined,
      partNumber: w.partNumber.trim(),
      description: w.description.trim(),
      batchNumber: w.batchNumber?.trim() || undefined,
      plannedQuantity: Number(w.plannedQuantity),
      plannedStartDateUtc: new Date(`${w.plannedStartDateUtc}T00:00:00`).toISOString(),
      plannedEndDateUtc: new Date(`${w.plannedEndDateUtc}T00:00:00`).toISOString(),
      assignedSupervisor: w.assignedSupervisor?.trim() || undefined,
      remarks: w.remarks?.trim() || undefined,
    };

    this.woService.create(input).subscribe({
      next: (created) => {
        this.isBusy.set(false);
        this.toasts.success(`Work order ${created.workOrderNumber} created successfully.`);
        this.router.navigate(['/manufacturing/work-orders']);
      },
      error: (err) => {
        this.isBusy.set(false);
        this.formError.set(
          err?.error?.error?.message ??
            'The work order could not be created on the production server.',
        );
      },
    });
  }
}
