import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ArTopbar } from '../../../layout/topbar';
import {
  BillOfMaterialDto,
  BillOfMaterialService,
  BomStatus,
  BomType,
  CreateBillOfMaterialDto,
  RoutingStage,
} from '../../../proxy/manufacturing';
import { ArButton } from '../../../ui/button';
import { ArBanner } from '../../../ui/banner';
import { readApiError } from '../../../core/util/api-error';
import { ArChip, ChipTone } from '../../../ui/chip';
import { ArStatTile } from '../../../ui/stat-tile';
import { ArGrid } from '../../../ui/grid';
import { GridModule } from '@syncfusion/ej2-angular-grids';

@Component({
  standalone: true,
  selector: 'ar-bill-of-materials',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ArTopbar,
    ArBanner,
    ArButton,
    ArChip,
    ArStatTile,
    ArGrid,
    GridModule,
    RouterLink,
  ],
  template: `
    <ar-topbar
      title="Bill of Materials (BOM)"
      subtitle="Multi-level product structures, component routing, scrap allowances & costing"
    >
      <a ar-button variant="primary" routerLink="/manufacturing/bom/new">+ Create New BOM</a>
    </ar-topbar>

    <div class="page-content">
      @if (loadError(); as e) {
        <ar-banner tone="bad">{{ e }}</ar-banner>
      }
      <!-- Executive KPI Strip -->
      <section class="kpi-grid" aria-label="BOM Executive Overview">
        <ar-stat-tile
          label="Total BOM Structures"
          [value]="allBoms().length"
          note="Configured assemblies and parts"
        />
        <ar-stat-tile
          label="Active Production BOMs"
          [value]="activeCount()"
          tone="good"
          note="Released for shop floor manufacturing"
        />
        <ar-stat-tile
          label="Draft / Engineering"
          [value]="draftCount()"
          tone="amber"
          note="Prototype qualification phase"
        />
        <ar-stat-tile
          label="Avg Unit Cost"
          [value]="'₹' + (avgUnitCost() / 100 | number: '1.2-2')"
          tone="teal"
          note="Weighted component scrap factored"
        />
      </section>

      <!-- Filter Bar Card -->
      <section class="filter-card">
        <div class="search-box">
          <input
            type="search"
            class="ar-field__input"
            placeholder="Search BOM #, Part #, Finished Good Description..."
            [ngModel]="filterQuery()"
            (ngModelChange)="filterQuery.set($event)"
          />
        </div>
        <div class="filter-chips">
          <button
            type="button"
            class="chip-filter"
            [class.active]="selectedStatus() === null"
            (click)="selectedStatus.set(null)"
          >
            All BOMs ({{ allBoms().length }})
          </button>
          <button
            type="button"
            class="chip-filter"
            [class.active]="selectedStatus() === BomStatus.Active"
            (click)="selectedStatus.set(BomStatus.Active)"
          >
            Active
          </button>
          <button
            type="button"
            class="chip-filter"
            [class.active]="selectedStatus() === BomStatus.Draft"
            (click)="selectedStatus.set(BomStatus.Draft)"
          >
            Draft
          </button>
          <button
            type="button"
            class="chip-filter"
            [class.active]="selectedStatus() === BomStatus.Obsolete"
            (click)="selectedStatus.set(BomStatus.Obsolete)"
          >
            Obsolete
          </button>
        </div>
      </section>

      <!-- BOM Table adhering to modern-web-guidance responsive-table -->
      <section class="table-card">
        <ejs-grid
          arGrid="bill-of-materials"
          [dataSource]="filteredBoms()"
          aria-label="Bill of Materials Catalog"
        >
          <e-columns>
            <e-column field="bomNumber" headerText="BOM Number" width="160">
              <ng-template #template let-b>
                <div class="cell-main">
                  <a class="code-link" [routerLink]="['/manufacturing/bom', b.id]">{{
                    b.bomNumber
                  }}</a>
                  <span class="sub-text">{{ b.creationTime | date: 'mediumDate' }}</span>
                </div>
              </ng-template>
            </e-column>
            <e-column
              field="finishedGoodPartNumber"
              headerText="Finished Good & Description"
              width="260"
            >
              <ng-template #template let-b>
                <div class="cell-main">
                  <strong class="font-medium">{{ b.finishedGoodPartNumber }}</strong>
                  <span class="sub-text">{{ b.finishedGoodDescription }}</span>
                </div>
              </ng-template>
            </e-column>
            <e-column field="revisionCode" headerText="Revision" width="110">
              <ng-template #template let-b>
                <span class="badge-rev">{{ b.revisionCode }}</span>
              </ng-template>
            </e-column>
            <e-column field="bomType" headerText="Type" width="140">
              <ng-template #template let-b>
                <ar-chip [tone]="b.bomType === BomType.Manufacturing ? 'teal' : 'neutral'">
                  {{ b.bomType === BomType.Manufacturing ? 'Manufacturing' : 'Engineering' }}
                </ar-chip>
              </ng-template>
            </e-column>
            <e-column headerText="Components" textAlign="Right" width="130">
              <ng-template #template let-b>
                <span class="font-mono">{{ b.items.length }} parts</span>
              </ng-template>
            </e-column>
            <e-column
              field="totalEstimatedCostInPaise"
              headerText="Est. Cost / Unit"
              textAlign="Right"
              width="160"
            >
              <ng-template #template let-b>
                <div class="font-mono">
                  <strong>₹{{ b.totalEstimatedCostInPaise / 100 | number: '1.2-2' }}</strong>
                  <span class="sub-text block">/ {{ b.finishedGoodUom }}</span>
                </div>
              </ng-template>
            </e-column>
            <e-column field="status" headerText="Status" width="130">
              <ng-template #template let-b>
                <ar-chip [tone]="bomTone(b.status)" [dot]="b.status === BomStatus.Active">
                  {{ bomLabel(b.status) }}
                </ar-chip>
              </ng-template>
            </e-column>
            <e-column headerText="Actions" width="220">
              <ng-template #template let-b>
                <div class="action-buttons">
                  <button
                    ar-button
                    variant="primary"
                    *ngIf="b.status === BomStatus.Active"
                    (click)="createWorkOrderFromBom(b)"
                  >
                    Create WO
                  </button>
                  <button
                    ar-button
                    variant="ghost"
                    *ngIf="b.status === BomStatus.Draft"
                    (click)="activateBom(b)"
                  >
                    Activate
                  </button>
                  <a ar-button variant="ghost" [routerLink]="['/manufacturing/bom', b.id]">View</a>
                </div>
              </ng-template>
            </e-column>
          </e-columns>
        </ejs-grid>
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
        padding: 24px 32px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        max-width: 1440px;
        margin: 0 auto;
        width: 100%;
        box-sizing: border-box;
      }

      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
      }

      .filter-card {
        background: var(--ar-white);
        border: 1px solid var(--ar-line-200);
        border-radius: var(--ar-radius-card, 10px);
        padding: 16px 20px;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        box-shadow: var(--ar-shadow-card, 0 1px 3px rgba(0, 0, 0, 0.05));
      }

      .search-box {
        flex: 1;
        min-width: 260px;
      }

      .filter-chips {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .chip-filter {
        padding: 6px 14px;
        font-size: 0.8rem;
        border-radius: 999px;
        border: 1px solid var(--ar-line-200);
        background: var(--ar-bg-50);
        color: var(--ar-ink-700);
        cursor: pointer;
        font-weight: 500;
        transition: all 0.15s ease;
      }

      .chip-filter:hover {
        background: #ffffff;
        border-color: var(--ar-blue-500);
      }

      .chip-filter.active {
        background: var(--ar-ink-900);
        color: #ffffff;
        border-color: var(--ar-ink-900);
      }

      .table-card {
        background: var(--ar-white);
        border: 1px solid var(--ar-line-200);
        border-radius: var(--ar-radius-card, 10px);
        box-shadow: var(--ar-shadow-card, 0 1px 3px rgba(0, 0, 0, 0.05));
        overflow: hidden;
      }

      .ar-table-responsive {
        overflow-x: auto;
      }

      .ar-table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
        font-size: 0.875rem;

        thead th {
          position: sticky;
          top: 0;
          background: var(--ar-bg-50);
          color: var(--ar-ink-700);
          font-weight: 600;
          padding: 12px 16px;
          border-bottom: 1px solid var(--ar-line-200);
          white-space: nowrap;
          z-index: 1;
        }

        tbody td {
          padding: 12px 16px;
          border-bottom: 1px solid var(--ar-line-200);
          color: var(--ar-ink-900);
          vertical-align: middle;
        }

        tbody tr:last-child td {
          border-bottom: none;
        }

        tbody tr:hover {
          background: var(--ar-bg-50);
        }

        tbody tr.selected {
          background: #eff8ff;
        }
      }

      .cell-main {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .code-link {
        font-family: var(--ar-font-mono, monospace);
        font-weight: 600;
        color: var(--ar-blue-600);
        cursor: pointer;
        text-decoration: none;
      }

      .code-link:hover {
        text-decoration: underline;
      }

      .sub-text {
        font-size: 0.75rem;
        color: var(--ar-ink-500);
      }

      .badge-rev {
        font-size: 0.75rem;
        background: var(--ar-bg-100);
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 600;
        color: var(--ar-ink-700);
      }

      .badge-sub {
        font-size: 0.7rem;
        background: #e0e7ff;
        color: #3730a3;
        padding: 1px 6px;
        border-radius: 4px;
        margin-left: 6px;
      }

      .badge-stage {
        font-size: 0.75rem;
        background: var(--ar-bg-100);
        padding: 2px 8px;
        border-radius: 4px;
        font-weight: 500;
        color: var(--ar-ink-700);
      }

      .action-buttons {
        display: flex;
        gap: 6px;
        justify-content: flex-end;
      }

      .dialog-body {
        padding: 8px 0;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .meta-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--ar-line-200);
      }

      .assembly-name {
        margin: 4px 0 2px;
        font: 600 1.15rem var(--ar-font-sans);
        color: var(--ar-ink-900);
      }

      .cost-summary-box {
        display: flex;
        justify-content: space-between;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        padding: 14px 20px;
        border-radius: 8px;
      }

      .box-label {
        font-size: 0.75rem;
        color: #166534;
        text-transform: uppercase;
        font-weight: 600;
        letter-spacing: 0.03em;
      }

      .cost-val,
      .parts-val {
        margin: 4px 0 0;
        color: #14532d;
        font-weight: 700;
      }

      .section-heading {
        margin: 0;
        font: 600 1rem var(--ar-font-sans);
        color: var(--ar-ink-900);
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }

      .full-width {
        grid-column: span 2;
      }

      .uom-field-group {
        display: flex;
        gap: 8px;
      }

      .uom-input {
        max-width: 90px;
      }

      .table-input {
        padding: 4px 8px;
        font-size: 0.8rem;
        height: 30px;
      }

      .input-sm {
        padding: 2px 6px;
      }

      .input-xs {
        max-width: 70px;
      }

      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 8px;
      }

      .empty-state {
        text-align: center;
        padding: 40px;
        color: var(--ar-ink-400);
      }

      .font-mono {
        font-family: var(--ar-font-mono, monospace);
      }

      .font-medium {
        font-weight: 500;
      }

      .text-muted {
        color: var(--ar-ink-400);
      }

      .text-right {
        text-align: right !important;
      }

      .block {
        display: block;
      }

      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
      }
    `,
  ],
})
export class BillOfMaterialsComponent {
  private readonly router = inject(Router);
  private readonly bomService = inject(BillOfMaterialService);

  readonly BomType = BomType;
  readonly BomStatus = BomStatus;
  readonly RoutingStage = RoutingStage;

  readonly allBoms = signal<BillOfMaterialDto[]>([]);
  readonly loadError = signal<string | null>(null);
  readonly filterQuery = signal<string>('');
  readonly selectedStatus = signal<BomStatus | null>(null);

  readonly selectedBom = signal<BillOfMaterialDto | null>(null);
  readonly showCreateModal = signal<boolean>(false);

  // New BOM form
  newBom: {
    finishedGoodPartNumber: string;
    finishedGoodDescription: string;
    revisionCode: string;
    finishedGoodUom: string;
    baseQuantity: number;
    bomType: BomType;
    items: Array<{
      componentPartNumber: string;
      componentDescription: string;
      quantityPerUnit: number;
      unitOfMeasure: string;
      scrapPercentage: number;
      routingStage: RoutingStage;
      unitCostRupees: number;
    }>;
  } = {
    finishedGoodPartNumber: '',
    finishedGoodDescription: '',
    revisionCode: 'Rev A',
    finishedGoodUom: 'NOS',
    baseQuantity: 1,
    bomType: BomType.Manufacturing,
    items: [
      {
        componentPartNumber: '',
        componentDescription: '',
        quantityPerUnit: 1,
        unitOfMeasure: 'NOS',
        scrapPercentage: 2,
        routingStage: RoutingStage.Machining,
        unitCostRupees: 1000,
      },
    ],
  };

  readonly filteredBoms = computed(() => {
    let list = this.allBoms();
    const q = this.filterQuery().toLowerCase().trim();
    const s = this.selectedStatus();

    if (s !== null) {
      list = list.filter((x) => x.status === s);
    }

    if (q) {
      list = list.filter(
        (x) =>
          x.bomNumber.toLowerCase().includes(q) ||
          x.finishedGoodPartNumber.toLowerCase().includes(q) ||
          x.finishedGoodDescription.toLowerCase().includes(q),
      );
    }

    return list;
  });

  readonly activeCount = computed(
    () => this.allBoms().filter((x) => x.status === BomStatus.Active).length,
  );

  readonly draftCount = computed(
    () => this.allBoms().filter((x) => x.status === BomStatus.Draft).length,
  );

  readonly avgUnitCost = computed(() => {
    const list = this.allBoms();
    if (list.length === 0) return 0;
    return list.reduce((acc, b) => acc + b.totalEstimatedCostInPaise, 0) / list.length;
  });

  constructor() {
    this.loadData();
  }

  loadData() {
    this.bomService.getList({ maxResultCount: 500 }).subscribe({
      next: (res) => this.allBoms.set(res?.items ?? []),
      error: (e: unknown) =>
        this.loadError.set(readApiError(e, 'The bills of materials could not be loaded.')),
    });
  }

  viewBom(b: BillOfMaterialDto) {
    this.selectedBom.set(b);
  }

  activateBom(b: BillOfMaterialDto) {
    const updated: BillOfMaterialDto = { ...b, status: BomStatus.Active };
    if (b.id) {
      // Shown as active once the server agrees; the app-wide toast shows a refusal.
      this.bomService.activate(b.id).subscribe({
        next: (saved) => {
          this.updateInState(saved);
          if (this.selectedBom()?.id === b.id) this.selectedBom.set(saved);
        },
      });
      return;
    }
    this.updateInState(updated);
    if (this.selectedBom()?.id === b.id) {
      this.selectedBom.set(updated);
    }
  }

  createWorkOrderFromBom(b: BillOfMaterialDto) {
    this.router.navigate(['/manufacturing/work-orders/new'], {
      queryParams: {
        bomId: b.id,
        partNumber: b.finishedGoodPartNumber,
        description: b.finishedGoodDescription,
      },
    });
  }

  openCreateModal() {
    this.newBom = {
      finishedGoodPartNumber: '',
      finishedGoodDescription: '',
      revisionCode: 'Rev A',
      finishedGoodUom: 'NOS',
      baseQuantity: 1,
      bomType: BomType.Manufacturing,
      items: [
        {
          componentPartNumber: '',
          componentDescription: '',
          quantityPerUnit: 1,
          unitOfMeasure: 'NOS',
          scrapPercentage: 2,
          routingStage: RoutingStage.Machining,
          unitCostRupees: 1000,
        },
      ],
    };
    this.showCreateModal.set(true);
  }

  addItem() {
    this.newBom.items = [
      ...this.newBom.items,
      {
        componentPartNumber: '',
        componentDescription: '',
        quantityPerUnit: 1,
        unitOfMeasure: 'NOS',
        scrapPercentage: 1,
        routingStage: RoutingStage.Assembly,
        unitCostRupees: 500,
      },
    ];
  }

  removeItem(target: number | any) {
    if (this.newBom.items.length > 1) {
      if (typeof target === 'number') {
        this.newBom.items = this.newBom.items.filter((_, idx) => idx !== target);
      } else {
        this.newBom.items = this.newBom.items.filter((item) => item !== target);
      }
    }
  }

  saveNewBom() {
    if (!this.newBom.finishedGoodPartNumber || !this.newBom.finishedGoodDescription) {
      alert('Part number and description are required.');
      return;
    }

    const dto: CreateBillOfMaterialDto = {
      finishedGoodPartNumber: this.newBom.finishedGoodPartNumber,
      finishedGoodDescription: this.newBom.finishedGoodDescription,
      revisionCode: this.newBom.revisionCode,
      finishedGoodUom: this.newBom.finishedGoodUom,
      baseQuantity: this.newBom.baseQuantity,
      bomType: this.newBom.bomType,
      items: this.newBom.items.map((it, idx) => ({
        itemSequence: (idx + 1) * 10,
        componentPartNumber: it.componentPartNumber,
        componentDescription: it.componentDescription,
        quantityPerUnit: it.quantityPerUnit,
        unitOfMeasure: it.unitOfMeasure,
        scrapPercentage: it.scrapPercentage,
        unitCostInPaise: Math.round(it.unitCostRupees * 100),
        routingStage: it.routingStage,
        isSubAssembly: false,
      })),
    };
    // The form stays open with what was typed if the server refuses it (the toast says why).
    this.bomService.create(dto).subscribe({
      next: (saved) => {
        this.allBoms.update((list) => [saved, ...list]);
        this.showCreateModal.set(false);
      },
    });
    return;
  }

  private updateInState(updated: BillOfMaterialDto) {
    this.allBoms.update((list) => list.map((x) => (x.id === updated.id ? updated : x)));
  }

  stageLabel(stage: RoutingStage): string {
    switch (stage) {
      case RoutingStage.MaterialKitting:
        return 'Kitting';
      case RoutingStage.Machining:
        return 'Machining';
      case RoutingStage.Fabrication:
        return 'Fabrication';
      case RoutingStage.HeatTreatment:
        return 'Heat Treatment';
      case RoutingStage.Assembly:
        return 'Assembly';
      case RoutingStage.FinalTesting:
        return 'Testing';
      case RoutingStage.FinishedGoodsReceipt:
        return 'Receipt';
      default:
        return 'General';
    }
  }

  bomTone(status: BomStatus): ChipTone {
    switch (status) {
      case BomStatus.Active:
        return 'good';
      case BomStatus.Draft:
        return 'amber';
      case BomStatus.Obsolete:
        return 'bad';
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
}
