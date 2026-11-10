import { CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastService } from '../../../core/ui/toast.service';
import { ArTopbar } from '../../../layout/topbar';
import {
  BillOfMaterialService,
  BomStatus,
  BomType,
  CreateBillOfMaterialDto,
  RoutingStage,
} from '../../../proxy/manufacturing';
import { ArButton, ArCard } from '../../../ui';

@Component({
  selector: 'ar-new-bom-page',
  imports: [CommonModule, FormsModule, DecimalPipe, ArTopbar, ArButton, ArCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Create Bill of Materials (Multi-Level BOM)"
      subtitle="Define assembly header, multi-level component explosion, scrap allowances and routing stages"
    >
      <button ar-button variant="ghost" (click)="cancel()">Back to BOM Registry</button>
    </ar-topbar>

    <div class="page-container ar-scroll">
      <form (submit)="$event.preventDefault(); submit()">
        <ar-card heading="Finished Assembly Header">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">BOM Number <span class="required">*</span></label>
              <input
                type="text"
                class="ar-field__input"
                required
                [(ngModel)]="newBom.bomNumber"
                name="bomNumber"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Revision Code <span class="required">*</span></label>
              <input
                type="text"
                class="ar-field__input"
                required
                [(ngModel)]="newBom.revisionCode"
                placeholder="e.g. Rev A or Rev 1.0"
                name="revisionCode"
              />
            </div>

            <div class="form-group">
              <label class="form-label"
                >Finished Good Part Number <span class="required">*</span></label
              >
              <input
                type="text"
                class="ar-field__input"
                required
                [(ngModel)]="newBom.finishedGoodPartNumber"
                placeholder="e.g. PLC-PNL-400A"
                name="finishedGoodPartNumber"
              />
            </div>

            <div class="form-group">
              <label class="form-label"
                >Finished Good Description <span class="required">*</span></label
              >
              <input
                type="text"
                class="ar-field__input"
                required
                [(ngModel)]="newBom.finishedGoodDescription"
                placeholder="e.g. Main Automation PLC & VFD Control Panel 400A"
                name="finishedGoodDescription"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Unit of Measure (UOM)</label>
              <input
                type="text"
                class="ar-field__input"
                [(ngModel)]="newBom.finishedGoodUom"
                name="finishedGoodUom"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Base Quantity</label>
              <input
                type="number"
                min="1"
                class="ar-field__input"
                [(ngModel)]="newBom.baseQuantity"
                name="baseQuantity"
              />
            </div>

            <div class="form-group">
              <label class="form-label">BOM Classification</label>
              <select class="ar-field__input" [(ngModel)]="newBom.bomType" name="bomType">
                <option [ngValue]="BomType.Manufacturing">Manufacturing BOM</option>
                <option [ngValue]="BomType.Engineering">Engineering / Design BOM</option>
                <option [ngValue]="BomType.Kit">Kit / Assemblies</option>
              </select>
            </div>
          </div>

          <div class="form-group full-width mt-3">
            <label class="form-label">Engineering Notes / Assembly Instructions</label>
            <textarea
              class="ar-field__input"
              rows="2"
              [(ngModel)]="newBom.remarks"
              placeholder="e.g. High-torque wiring harness specifications, IP65 enclosure sealing required."
              name="remarks"
            ></textarea>
          </div>
        </ar-card>

        <div class="mt-4">
          <ar-card heading="Bill of Materials Line Items (Component Explosion)">
            <div class="table-responsive">
              <table class="bom-table">
                <thead>
                  <tr>
                    <th style="width: 50px;">Seq</th>
                    <th style="width: 160px;">Part Number <span class="required">*</span></th>
                    <th>Description <span class="required">*</span></th>
                    <th style="width: 90px;">Qty/Unit</th>
                    <th style="width: 70px;">UOM</th>
                    <th style="width: 80px;">Scrap %</th>
                    <th style="width: 150px;">Routing Stage</th>
                    <th style="width: 120px;">Unit Rate (₹)</th>
                    <th style="width: 110px;">Sub-Assy</th>
                    <th style="width: 60px;"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of newBom.items; track $index) {
                    <tr>
                      <td>
                        <input
                          type="number"
                          class="table-input seq"
                          [(ngModel)]="item.itemSequence"
                          [name]="'seq_' + $index"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          class="table-input font-mono"
                          required
                          placeholder="e.g. 6ES7-511-1AK02"
                          [(ngModel)]="item.componentPartNumber"
                          [name]="'pn_' + $index"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          class="table-input"
                          required
                          placeholder="e.g. Siemens S7-1500 CPU 1511-1 PN"
                          [(ngModel)]="item.componentDescription"
                          [name]="'desc_' + $index"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0.001"
                          step="any"
                          class="table-input text-right"
                          [(ngModel)]="item.quantityPerUnit"
                          [name]="'qty_' + $index"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          class="table-input"
                          [(ngModel)]="item.unitOfMeasure"
                          [name]="'uom_' + $index"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          class="table-input text-right"
                          [(ngModel)]="item.scrapPercentage"
                          [name]="'scrap_' + $index"
                        />
                      </td>
                      <td>
                        <select
                          class="table-input"
                          [(ngModel)]="item.routingStage"
                          [name]="'stage_' + $index"
                        >
                          <option [ngValue]="RoutingStage.MaterialKitting">Material Kitting</option>
                          <option [ngValue]="RoutingStage.Machining">Machining</option>
                          <option [ngValue]="RoutingStage.Fabrication">Fabrication</option>
                          <option [ngValue]="RoutingStage.HeatTreatment">Heat Treatment</option>
                          <option [ngValue]="RoutingStage.Assembly">Assembly</option>
                          <option [ngValue]="RoutingStage.FinalTesting">Final Testing</option>
                          <option [ngValue]="RoutingStage.FinishedGoodsReceipt">
                            Finished Goods
                          </option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          class="table-input text-right font-mono"
                          [ngModel]="item.unitCostInPaise / 100"
                          (ngModelChange)="item.unitCostInPaise = $event * 100"
                          [name]="'rate_' + $index"
                        />
                      </td>
                      <td class="text-center">
                        <input
                          type="checkbox"
                          [(ngModel)]="item.isSubAssembly"
                          [name]="'sub_' + $index"
                        />
                      </td>
                      <td class="text-center">
                        <button
                          type="button"
                          class="del-btn"
                          (click)="removeItem($index)"
                          [disabled]="newBom.items.length <= 1"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="table-actions">
              <button ar-button variant="ghost" type="button" (click)="addItem()">
                + Add Component Line
              </button>
              <div class="total-badge">
                <span>Computed Assembly Cost:</span>
                <strong>₹{{ computedTotalInRupees() | number: '1.2-2' }}</strong>
              </div>
            </div>
          </ar-card>
        </div>

        @if (error()) {
          <p class="error-msg mt-3" role="alert">{{ error() }}</p>
        }

        <div class="page-footer-actions">
          <button ar-button variant="ghost" type="button" (click)="cancel()">Cancel</button>
          <button
            ar-button
            variant="primary"
            type="submit"
            [disabled]="
              busy() || !newBom.bomNumber?.trim() || !newBom.finishedGoodPartNumber.trim()
            "
          >
            {{ busy() ? 'Saving BOM…' : 'Save & Register BOM' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 1.5rem 2rem 3rem;
        max-width: 1200px;
      }
      .form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 1rem;
      }
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .form-group.full-width {
        grid-column: 1 / -1;
      }
      .form-label {
        font-size: 0.8125rem;
        font-weight: 500;
        color: var(--ar-ink-800);
      }
      .table-responsive {
        overflow-x: auto;
      }
      .bom-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8125rem;
      }
      .bom-table th {
        text-align: left;
        padding: 0.625rem 0.5rem;
        border-bottom: 2px solid var(--ar-line-200);
        color: var(--ar-ink-600);
        font-weight: 600;
        text-transform: uppercase;
        font-size: 0.75rem;
        letter-spacing: 0.04em;
      }
      .bom-table td {
        padding: 0.375rem 0.5rem;
        border-bottom: 1px solid var(--ar-line-100);
        vertical-align: middle;
      }
      .table-input {
        width: 100%;
        padding: 0.375rem 0.5rem;
        border: 1px solid var(--ar-line-200);
        border-radius: var(--ar-radius-sm);
        background: var(--ar-white);
        font-size: 0.8125rem;
        color: var(--ar-ink-900);
        box-sizing: border-box;
      }
      .table-input.seq {
        width: 50px;
        text-align: center;
      }
      .text-right {
        text-align: right;
      }
      .text-center {
        text-align: center;
      }
      .del-btn {
        background: transparent;
        border: none;
        color: var(--ar-bad-600);
        cursor: pointer;
        font-size: 0.875rem;
        padding: 0.25rem 0.5rem;
      }
      .del-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }
      .table-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 1rem;
        border-top: 1px solid var(--ar-line-100);
        margin-top: 0.75rem;
      }
      .total-badge {
        font-size: 0.9375rem;
        color: var(--ar-ink-800);
      }
      .total-badge strong {
        color: var(--ar-primary-600);
        font-size: 1.125rem;
        margin-left: 0.5rem;
      }
      .required {
        color: var(--ar-bad-600);
      }
      .error-msg {
        color: var(--ar-bad-600);
        font-size: 0.875rem;
      }
      .page-footer-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 1.5rem;
        padding-top: 1rem;
        border-top: 1px solid var(--ar-line-200);
      }
    `,
  ],
})
export class ArNewBomPage {
  private readonly router = inject(Router);
  private readonly bomService = inject(BillOfMaterialService);
  private readonly toasts = inject(ToastService);

  protected readonly BomType = BomType;
  protected readonly BomStatus = BomStatus;
  protected readonly RoutingStage = RoutingStage;

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected newBom: CreateBillOfMaterialDto = {
    bomNumber: `BOM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    finishedGoodPartNumber: '',
    finishedGoodDescription: '',
    finishedGoodUom: 'NOS',
    baseQuantity: 1,
    bomType: BomType.Manufacturing,
    revisionCode: 'Rev A',
    remarks: '',
    items: [
      {
        itemSequence: 10,
        componentPartNumber: '',
        componentDescription: '',
        quantityPerUnit: 1,
        unitOfMeasure: 'NOS',
        scrapPercentage: 0,
        unitCostInPaise: 0,
        routingStage: RoutingStage.Assembly,
        isSubAssembly: false,
      },
    ],
  };

  computedTotalInRupees(): number {
    return this.newBom.items.reduce((sum, item) => {
      const qty = item.quantityPerUnit || 0;
      const scrap = 1 + (item.scrapPercentage || 0) / 100;
      const rate = (item.unitCostInPaise || 0) / 100;
      return sum + qty * scrap * rate;
    }, 0);
  }

  addItem(): void {
    const nextSeq = (this.newBom.items.length + 1) * 10;
    this.newBom.items.push({
      itemSequence: nextSeq,
      componentPartNumber: '',
      componentDescription: '',
      quantityPerUnit: 1,
      unitOfMeasure: 'NOS',
      scrapPercentage: 0,
      unitCostInPaise: 0,
      routingStage: RoutingStage.Assembly,
      isSubAssembly: false,
    });
  }

  removeItem(index: number): void {
    if (this.newBom.items.length > 1) {
      this.newBom.items.splice(index, 1);
    }
  }

  cancel(): void {
    void this.router.navigateByUrl('/manufacturing/bom');
  }

  submit(): void {
    if (
      !this.newBom.bomNumber?.trim() ||
      !this.newBom.finishedGoodPartNumber.trim() ||
      this.busy()
    ) {
      return;
    }

    this.busy.set(true);
    this.error.set(null);

    this.bomService.create(this.newBom).subscribe({
      next: () => {
        this.busy.set(false);
        this.toasts.success(`BOM ${this.newBom.bomNumber} created.`);
        void this.router.navigateByUrl('/manufacturing/bom');
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.message || 'Failed to save BOM.');
      },
    });
  }
}
