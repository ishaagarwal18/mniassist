import { CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../core/ui/toast.service';
import { ArTopbar } from '../../../layout/topbar';
import {
  BillOfMaterialDto,
  BillOfMaterialService,
  BomStatus,
  BomType,
  RoutingStage,
} from '../../../proxy/manufacturing';
import { ArButton, ArCard, ArChip, ChipTone } from '../../../ui';
import { ArGrid } from '../../../ui/grid';
import { GridModule } from '@syncfusion/ej2-angular-grids';

const MOCK_BOM_DETAILS: BillOfMaterialDto[] = [
  {
    id: 'bom-1',
    bomNumber: 'BOM-2026-0001',
    revisionCode: 'Rev C',
    finishedGoodPartNumber: 'HV-400-P',
    finishedGoodDescription: 'Proportional Directional Hydraulic Valve 350 Bar',
    finishedGoodUom: 'NOS',
    baseQuantity: 1,
    bomType: BomType.Manufacturing,
    status: BomStatus.Active,
    totalEstimatedCostInPaise: 42_500_00,
    remarks: 'Approved for automated assembly line 3. High-precision spool tolerances.',
    creationTime: new Date(Date.now() - 30 * 86_400_000).toISOString(),
    items: [
      {
        id: 'bomi-1',
        billOfMaterialId: 'bom-1',
        itemSequence: 10,
        componentPartNumber: 'VB-BODY-400',
        componentDescription: 'Ductile Iron Valve Body Casting GGG40',
        quantityPerUnit: 1,
        unitOfMeasure: 'NOS',
        scrapPercentage: 2.0,
        unitCostInPaise: 16_000_00,
        routingStage: RoutingStage.Machining,
        isSubAssembly: false,
      },
      {
        id: 'bomi-2',
        billOfMaterialId: 'bom-1',
        itemSequence: 20,
        componentPartNumber: 'SPL-EN36-04',
        componentDescription: 'Ground & Lapped Spool EN36 Case Hardened',
        quantityPerUnit: 1,
        unitOfMeasure: 'NOS',
        scrapPercentage: 3.5,
        unitCostInPaise: 9_500_00,
        routingStage: RoutingStage.Machining,
        isSubAssembly: false,
      },
      {
        id: 'bomi-3',
        billOfMaterialId: 'bom-1',
        itemSequence: 30,
        componentPartNumber: 'SOL-PROP-24V',
        componentDescription: 'Proportional Solenoid Coil 24VDC with Hirschmann Plug',
        quantityPerUnit: 2,
        unitOfMeasure: 'NOS',
        scrapPercentage: 0.5,
        unitCostInPaise: 5_200_00,
        routingStage: RoutingStage.Assembly,
        isSubAssembly: true,
      },
      {
        id: 'bomi-4',
        billOfMaterialId: 'bom-1',
        itemSequence: 40,
        componentPartNumber: 'FKM-SEAL-KIT-04',
        componentDescription: 'Viton FKM Seal & O-Ring Kit 90 Shore A',
        quantityPerUnit: 1,
        unitOfMeasure: 'SET',
        scrapPercentage: 1.0,
        unitCostInPaise: 1_800_00,
        routingStage: RoutingStage.Assembly,
        isSubAssembly: false,
      },
      {
        id: 'bomi-5',
        billOfMaterialId: 'bom-1',
        itemSequence: 50,
        componentPartNumber: 'TEST-CALIB-HV',
        componentDescription: 'Automated Hydraulic Test Bench Calibration & Inspection Report',
        quantityPerUnit: 1,
        unitOfMeasure: 'SRV',
        scrapPercentage: 0.0,
        unitCostInPaise: 4_800_00,
        routingStage: RoutingStage.FinalTesting,
        isSubAssembly: false,
      },
    ],
  },
  {
    id: 'bom-2',
    bomNumber: 'BOM-2026-0002',
    revisionCode: 'Rev A',
    finishedGoodPartNumber: 'PLC-PNL-400A',
    finishedGoodDescription: 'Main Automation PLC & VFD Control Panel 400A',
    finishedGoodUom: 'NOS',
    baseQuantity: 1,
    bomType: BomType.Manufacturing,
    status: BomStatus.Active,
    totalEstimatedCostInPaise: 245_000_00,
    remarks: 'CE certified panel fabrication for packaging line. IP54 Rittal enclosure.',
    creationTime: new Date(Date.now() - 15 * 86_400_000).toISOString(),
    items: [
      {
        id: 'bomi-6',
        billOfMaterialId: 'bom-2',
        itemSequence: 10,
        componentPartNumber: 'RIT-ENC-2000',
        componentDescription: 'Rittal TS8 Modular Enclosure 2000x800x600 IP55',
        quantityPerUnit: 1,
        unitOfMeasure: 'NOS',
        scrapPercentage: 0.0,
        unitCostInPaise: 65_000_00,
        routingStage: RoutingStage.Fabrication,
        isSubAssembly: false,
      },
      {
        id: 'bomi-7',
        billOfMaterialId: 'bom-2',
        itemSequence: 20,
        componentPartNumber: 'SIEM-S7-1515',
        componentDescription: 'Siemens S7-1500 CPU 1515-2 PN + 32 DI / 32 DO / 16 AI',
        quantityPerUnit: 1,
        unitOfMeasure: 'NOS',
        scrapPercentage: 0.0,
        unitCostInPaise: 110_000_00,
        routingStage: RoutingStage.Assembly,
        isSubAssembly: true,
      },
      {
        id: 'bomi-8',
        billOfMaterialId: 'bom-2',
        itemSequence: 30,
        componentPartNumber: 'DANF-VLT-15KW',
        componentDescription: 'Danfoss FC302 AutomationDrive 15 kW with Profinet',
        quantityPerUnit: 2,
        unitOfMeasure: 'NOS',
        scrapPercentage: 0.0,
        unitCostInPaise: 35_000_00,
        routingStage: RoutingStage.Assembly,
        isSubAssembly: true,
      },
    ],
  },
];

@Component({
  selector: 'ar-bom-detail-page',
  imports: [CommonModule, DecimalPipe, ArTopbar, ArButton, ArCard, ArChip, ArGrid, GridModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      [title]="bom() ? ('BOM: ' + bom()!.bomNumber + ' (' + bom()!.revisionCode + ')') : 'Bill of Materials'"
      subtitle="Assembly breakdown, multi-level component explosion, cost roll-up and routing stages"
    >
      <button ar-button variant="ghost" (click)="back()">
        Back to BOM Registry
      </button>
    </ar-topbar>

    <div class="page-container ar-scroll">
      @if (loading()) {
        <p class="loading-state">Loading Bill of Materials specifications…</p>
      } @else if (bom(); as b) {
        <!-- Assembly Metadata Card -->
        <ar-card>
          <div class="meta-row">
            <div>
              <span class="meta-label">Assembly Part Number</span>
              <h3 class="assembly-name">
                {{ b.finishedGoodPartNumber }} — {{ b.finishedGoodDescription }}
              </h3>
              <p class="sub-text">
                Base Quantity: {{ b.baseQuantity }} {{ b.finishedGoodUom }} | Revision:
                {{ b.revisionCode }} | Type: {{ b.bomType }}
              </p>
              @if (b.remarks) {
                <p class="remarks-text"><em>Engineering notes:</em> {{ b.remarks }}</p>
              }
            </div>
            <div class="meta-status">
              <ar-chip [tone]="bomTone(b.status)">{{ bomLabel(b.status) }}</ar-chip>
            </div>
          </div>

          <div class="cost-summary-box">
            <div>
              <span class="box-label">Total Computed Unit Cost</span>
              <h3 class="cost-val">₹{{ b.totalEstimatedCostInPaise / 100 | number: '1.2-2' }}</h3>
            </div>
            <div>
              <span class="box-label">Assembly Scale</span>
              <h4 class="parts-val">{{ b.items.length }} configured parts</h4>
            </div>
            <div>
              <span class="box-label">Created Date</span>
              <h4 class="parts-val">{{ b.creationTime | date: 'mediumDate' }}</h4>
            </div>
          </div>
        </ar-card>

        <!-- Multi-Level Component Explosion Grid -->
        <div class="mt-4">
          <ar-card heading="Multi-Level Component Explosion">
            <ejs-grid
              arGrid="bom-component-explosion-page"
              [dataSource]="b.items"
              aria-label="Component Explosion Table"
            >
              <e-columns>
                <e-column field="itemSequence" headerText="Seq" width="70">
                  <ng-template #template let-item>
                    <span class="font-mono text-muted">{{ item.itemSequence }}</span>
                  </ng-template>
                </e-column>
                <e-column field="componentPartNumber" headerText="Part Number" width="180">
                  <ng-template #template let-item>
                    <span class="font-mono">
                      <strong>{{ item.componentPartNumber }}</strong>
                      <span class="badge-sub" *ngIf="item.isSubAssembly">Sub-Assy</span>
                    </span>
                  </ng-template>
                </e-column>
                <e-column field="componentDescription" headerText="Description" width="240"></e-column>
                <e-column field="quantityPerUnit" headerText="Qty/Unit" width="100" [textAlign]="'Right'">
                  <ng-template #template let-item>
                    <span class="font-mono">{{ item.quantityPerUnit }}</span>
                  </ng-template>
                </e-column>
                <e-column field="unitOfMeasure" headerText="UOM" width="80"></e-column>
                <e-column field="scrapPercentage" headerText="Scrap %" width="100" [textAlign]="'Right'">
                  <ng-template #template let-item>
                    <span class="font-mono text-muted">{{ item.scrapPercentage }}%</span>
                  </ng-template>
                </e-column>
                <e-column headerText="Routing Stage" width="150">
                  <ng-template #template let-item>
                    <span class="badge-stage">{{ stageLabel(item.routingStage) }}</span>
                  </ng-template>
                </e-column>
                <e-column headerText="Unit Rate" width="130" [textAlign]="'Right'">
                  <ng-template #template let-item>
                    <span class="font-mono">
                      ₹{{ item.unitCostInPaise / 100 | number: '1.2-2' }}
                    </span>
                  </ng-template>
                </e-column>
                <e-column headerText="Line Cost" width="140" [textAlign]="'Right'">
                  <ng-template #template let-item>
                    <span class="font-mono font-medium">
                      ₹{{
                        (item.quantityPerUnit *
                          (1 + item.scrapPercentage / 100) *
                          item.unitCostInPaise) /
                          100 | number: '1.2-2'
                      }}
                    </span>
                  </ng-template>
                </e-column>
              </e-columns>
            </ejs-grid>
          </ar-card>
        </div>

        <!-- Footer Actions -->
        <div class="footer-actions">
          <button ar-button variant="ghost" (click)="back()">
            Back to BOM Registry
          </button>
          <button
            ar-button
            variant="primary"
            *ngIf="b.status === BomStatus.Active"
            (click)="generateWorkOrder(b)"
          >
            Generate Work Order
          </button>
          <button
            ar-button
            variant="ghost"
            *ngIf="b.status === BomStatus.Draft"
            (click)="releaseToProduction(b)"
          >
            Release to Production
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 1.5rem 2rem 3rem;
        max-width: 1200px;
      }
      .meta-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1.5rem;
      }
      .meta-label {
        font-size: 0.75rem;
        text-transform: uppercase;
        color: var(--ar-ink-500);
        letter-spacing: 0.05em;
      }
      .assembly-name {
        margin: 0.25rem 0 0.5rem;
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--ar-ink-900);
      }
      .sub-text {
        font-size: 0.8125rem;
        color: var(--ar-ink-600);
        margin: 0;
      }
      .remarks-text {
        font-size: 0.8125rem;
        color: var(--ar-ink-700);
        margin: 0.5rem 0 0;
        background: var(--ar-surface-subtle);
        padding: 0.5rem 0.75rem;
        border-radius: var(--ar-radius-sm);
        border: 1px solid var(--ar-line-200);
      }
      .cost-summary-box {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1.5rem;
        background: var(--ar-surface-subtle);
        border: 1px solid var(--ar-line-200);
        border-radius: var(--ar-radius-md);
        padding: 1rem 1.25rem;
      }
      .box-label {
        display: block;
        font-size: 0.75rem;
        color: var(--ar-ink-500);
        text-transform: uppercase;
        margin-bottom: 0.25rem;
      }
      .cost-val {
        margin: 0;
        font-size: 1.35rem;
        font-weight: 700;
        color: var(--ar-primary-600);
      }
      .parts-val {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--ar-ink-800);
      }
      .badge-sub {
        display: inline-block;
        font-size: 0.625rem;
        background: var(--ar-amber-100);
        color: var(--ar-amber-800);
        padding: 0.125rem 0.375rem;
        border-radius: var(--ar-radius-xs);
        margin-left: 0.375rem;
        text-transform: uppercase;
      }
      .badge-stage {
        display: inline-block;
        font-size: 0.75rem;
        background: var(--ar-surface-subtle);
        border: 1px solid var(--ar-line-200);
        color: var(--ar-ink-800);
        padding: 0.125rem 0.5rem;
        border-radius: var(--ar-radius-xs);
      }
      .font-mono {
        font-family: var(--ar-font-mono);
      }
      .text-muted {
        color: var(--ar-ink-400);
      }
      .footer-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 1.5rem;
        padding-top: 1rem;
        border-top: 1px solid var(--ar-line-200);
      }
      .loading-state {
        padding: 2rem;
        color: var(--ar-ink-500);
      }
    `,
  ],
})
export class ArBomDetailPage implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly bomService = inject(BillOfMaterialService);
  private readonly toasts = inject(ToastService);

  protected readonly BomStatus = BomStatus;
  protected readonly bom = signal<BillOfMaterialDto | null>(null);
  protected readonly loading = signal(true);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    if (!environment.useMockData && id) {
      this.bomService.get(id).subscribe({
        next: (res) => {
          this.bom.set(res);
          this.loading.set(false);
        },
        error: () => {
          this.bom.set(MOCK_BOM_DETAILS[0]);
          this.loading.set(false);
        },
      });
    } else {
      const found = MOCK_BOM_DETAILS.find((b) => b.id === id) || MOCK_BOM_DETAILS[0];
      this.bom.set(found);
      this.loading.set(false);
    }
  }

  back(): void {
    void this.router.navigateByUrl('/manufacturing/bom');
  }

  stageLabel(stage: RoutingStage): string {
    switch (stage) {
      case RoutingStage.MaterialKitting:
        return 'Material Kitting';
      case RoutingStage.Fabrication:
        return 'Fabrication';
      case RoutingStage.Machining:
        return 'Machining';
      case RoutingStage.HeatTreatment:
        return 'Heat Treatment';
      case RoutingStage.Assembly:
        return 'Assembly';
      case RoutingStage.FinalTesting:
        return 'Final Testing';
      case RoutingStage.FinishedGoodsReceipt:
        return 'Finished Goods Receipt';
      default:
        return 'Assembly';
    }
  }

  bomTone(status: BomStatus): ChipTone {
    switch (status) {
      case BomStatus.Active:
        return 'good';
      case BomStatus.Draft:
        return 'amber';
      case BomStatus.Obsolete:
        return 'neutral';
      default:
        return 'neutral';
    }
  }

  bomLabel(status: BomStatus): string {
    switch (status) {
      case BomStatus.Active:
        return 'Active';
      case BomStatus.Draft:
        return 'Draft';
      case BomStatus.Obsolete:
        return 'Obsolete';
      default:
        return 'Draft';
    }
  }

  generateWorkOrder(bom: BillOfMaterialDto): void {
    this.toasts.success(`Work order generated from BOM ${bom.bomNumber}.`);
    void this.router.navigateByUrl('/manufacturing/work-orders');
  }

  releaseToProduction(bom: BillOfMaterialDto): void {
    bom.status = BomStatus.Active;
    this.bom.set({ ...bom });
    this.toasts.success(`BOM ${bom.bomNumber} released to production.`);
  }
}
