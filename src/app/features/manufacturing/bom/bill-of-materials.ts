import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ArTopbar } from '../../../layout/topbar';
import {
  BillOfMaterialDto,
  BillOfMaterialItemDto,
  BillOfMaterialService,
  BomStatus,
  BomType,
  CreateBillOfMaterialDto,
  RoutingStage,
} from '../../../proxy/manufacturing';
import { ArButton } from '../../../ui/button';
import { ArChip, ChipTone } from '../../../ui/chip';
import { ArDialog } from '../../../ui/dialog';
import { ArStatTile } from '../../../ui/stat-tile';
import { ArGrid } from '../../../ui/grid';
import { GridModule } from '@syncfusion/ej2-angular-grids';

const MOCK_BOMS: BillOfMaterialDto[] = [
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
        routingStage: RoutingStage.HeatTreatment,
        isSubAssembly: false,
      },
      {
        id: 'bomi-3',
        billOfMaterialId: 'bom-1',
        itemSequence: 30,
        componentPartNumber: 'SOL-COIL-24V',
        componentDescription: 'Proportional Solenoid Coil 24V DC IP67',
        quantityPerUnit: 2,
        unitOfMeasure: 'NOS',
        scrapPercentage: 0.5,
        unitCostInPaise: 6_200_00,
        routingStage: RoutingStage.Assembly,
        isSubAssembly: true,
      },
      {
        id: 'bomi-4',
        billOfMaterialId: 'bom-1',
        itemSequence: 40,
        componentPartNumber: 'SK-FKM-90',
        componentDescription: 'Viton FKM O-Ring & Backup Ring Seal Kit',
        quantityPerUnit: 1,
        unitOfMeasure: 'SET',
        scrapPercentage: 1.0,
        unitCostInPaise: 4_600_00,
        routingStage: RoutingStage.Assembly,
        isSubAssembly: false,
      },
    ],
  },
  {
    id: 'bom-2',
    bomNumber: 'BOM-2026-0002',
    revisionCode: 'Rev A',
    finishedGoodPartNumber: 'CYL-HD-250',
    finishedGoodDescription: 'Heavy-Duty Tie-Rod Hydraulic Cylinder 250mm Stroke',
    finishedGoodUom: 'NOS',
    baseQuantity: 1,
    bomType: BomType.Manufacturing,
    status: BomStatus.Active,
    totalEstimatedCostInPaise: 68_000_00,
    remarks: 'Standard catalogue item for press machines.',
    creationTime: new Date(Date.now() - 45 * 86_400_000).toISOString(),
    items: [
      {
        id: 'bomi-5',
        billOfMaterialId: 'bom-2',
        itemSequence: 10,
        componentPartNumber: 'TB-ST52-BRL',
        componentDescription: 'Seamless Honed Steel Cylinder Barrel ST52 ID 100mm',
        quantityPerUnit: 0.65,
        unitOfMeasure: 'MTR',
        scrapPercentage: 2.0,
        unitCostInPaise: 24_000_00,
        routingStage: RoutingStage.Machining,
        isSubAssembly: false,
      },
      {
        id: 'bomi-6',
        billOfMaterialId: 'bom-2',
        itemSequence: 20,
        componentPartNumber: 'ROD-CK45-CR',
        componentDescription: 'Hard Chrome Plated Piston Rod CK45 Dia 50mm',
        quantityPerUnit: 0.7,
        unitOfMeasure: 'MTR',
        scrapPercentage: 1.5,
        unitCostInPaise: 22_000_00,
        routingStage: RoutingStage.Machining,
        isSubAssembly: false,
      },
      {
        id: 'bomi-7',
        billOfMaterialId: 'bom-2',
        itemSequence: 30,
        componentPartNumber: 'PST-CI-100',
        componentDescription: 'Cast Iron Piston Head 100mm with Wear Rings',
        quantityPerUnit: 1,
        unitOfMeasure: 'NOS',
        scrapPercentage: 1.0,
        unitCostInPaise: 12_500_00,
        routingStage: RoutingStage.Assembly,
        isSubAssembly: false,
      },
    ],
  },
  {
    id: 'bom-3',
    bomNumber: 'BOM-2026-0003',
    revisionCode: 'Rev A',
    finishedGoodPartNumber: 'PMP-VAR-PST',
    finishedGoodDescription: 'Variable Displacement Axial Piston Pump 71cc',
    finishedGoodUom: 'NOS',
    baseQuantity: 1,
    bomType: BomType.Engineering,
    status: BomStatus.Draft,
    totalEstimatedCostInPaise: 145_000_00,
    remarks: 'Prototype R&D build for OEM customer testing.',
    creationTime: new Date(Date.now() - 10 * 86_400_000).toISOString(),
    items: [],
  },
];

@Component({
  standalone: true,
  selector: 'ar-bill-of-materials',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ArTopbar,
    ArButton,
    ArChip,
    ArDialog,
    ArStatTile,
    ArGrid,
    GridModule,
  ],
  template: `
    <ar-topbar
      title="Bill of Materials (BOM)"
      subtitle="Multi-level product structures, component routing, scrap allowances & costing"
    >
      <button ar-button variant="primary" (click)="openCreateModal()">+ Create New BOM</button>
    </ar-topbar>

    <div class="page-content">
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
        <ejs-grid arGrid="bill-of-materials" [dataSource]="filteredBoms()" aria-label="Bill of Materials Catalog">
          <e-columns>
            <e-column field="bomNumber" headerText="BOM Number" width="160">
              <ng-template #template let-b>
                <div class="cell-main">
                  <a class="code-link" (click)="viewBom(b)">{{ b.bomNumber }}</a>
                  <span class="sub-text">{{ b.creationTime | date: 'mediumDate' }}</span>
                </div>
              </ng-template>
            </e-column>
            <e-column field="finishedGoodPartNumber" headerText="Finished Good & Description" width="260">
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
            <e-column field="totalEstimatedCostInPaise" headerText="Est. Cost / Unit" textAlign="Right" width="160">
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
            <e-column headerText="Actions" width="220" freeze="Right">
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
                  <button ar-button variant="ghost" (click)="viewBom(b)">View</button>
                </div>
              </ng-template>
            </e-column>
          </e-columns>
        </ejs-grid>
      </section>
    </div>

    <!-- BOM Tree & Details Dialog -->
    <ar-dialog
      *ngIf="selectedBom()"
      [title]="
        'BOM Structure: ' + selectedBom()!.bomNumber + ' (' + selectedBom()!.revisionCode + ')'
      "
      width="min(860px, calc(100vw - 32px))"
      (dismiss)="selectedBom.set(null)"
    >
      <div class="dialog-body" *ngIf="selectedBom() as b">
        <div class="meta-row">
          <div>
            <span class="meta-label">Assembly Part</span>
            <h4 class="assembly-name">
              {{ b.finishedGoodPartNumber }} — {{ b.finishedGoodDescription }}
            </h4>
            <p class="sub-text">
              Base Quantity: {{ b.baseQuantity }} {{ b.finishedGoodUom }} | Revision:
              {{ b.revisionCode }}
            </p>
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
        </div>

        <h4 class="section-heading">Multi-Level Component Explosion</h4>
        <ejs-grid
          arGrid="bom-component-explosion"
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
            <e-column field="componentDescription" headerText="Description" width="220"></e-column>
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
            <e-column headerText="Routing Stage" width="140">
              <ng-template #template let-item>
                <span class="badge-stage">{{ stageLabel(item.routingStage) }}</span>
              </ng-template>
            </e-column>
            <e-column headerText="Unit Rate" width="120" [textAlign]="'Right'">
              <ng-template #template let-item>
                <span class="font-mono">
                  ₹{{ item.unitCostInPaise / 100 | number: '1.2-2' }}
                </span>
              </ng-template>
            </e-column>
            <e-column headerText="Line Cost" width="130" [textAlign]="'Right'">
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

        <div class="dialog-actions">
          <button
            ar-button
            variant="primary"
            *ngIf="b.status === BomStatus.Active"
            (click)="createWorkOrderFromBom(b)"
          >
            Generate Work Order
          </button>
          <button
            ar-button
            variant="ghost"
            *ngIf="b.status === BomStatus.Draft"
            (click)="activateBom(b)"
          >
            Release to Production
          </button>
          <button ar-button variant="ghost" (click)="selectedBom.set(null)">Close</button>
        </div>
      </div>
    </ar-dialog>

    <!-- Create BOM Modal -->
    <ar-dialog
      *ngIf="showCreateModal()"
      title="Create Bill of Materials (BOM)"
      width="min(860px, calc(100vw - 32px))"
      (dismiss)="showCreateModal.set(false)"
    >
      <div class="dialog-body">
        <div class="form-grid">
          <label class="ar-field">
            <span class="ar-field__label">Finished Good Part # *</span>
            <input
              type="text"
              class="ar-field__input"
              [(ngModel)]="newBom.finishedGoodPartNumber"
              placeholder="e.g. HV-400-P"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Revision Code *</span>
            <input
              type="text"
              class="ar-field__input"
              [(ngModel)]="newBom.revisionCode"
              placeholder="Rev A"
            />
          </label>
          <label class="ar-field full-width">
            <span class="ar-field__label">Product Description *</span>
            <input
              type="text"
              class="ar-field__input"
              [(ngModel)]="newBom.finishedGoodDescription"
              placeholder="e.g. Proportional Directional Hydraulic Valve 350 Bar"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">BOM Type</span>
            <select class="ar-field__input" [(ngModel)]="newBom.bomType">
              <option [ngValue]="BomType.Manufacturing">Manufacturing BOM (Production)</option>
              <option [ngValue]="BomType.Engineering">Engineering BOM (Prototype)</option>
              <option [ngValue]="BomType.Kit">Sales / Spare Kit</option>
            </select>
          </label>
          <div class="uom-field-group">
            <label class="ar-field">
              <span class="ar-field__label">Base Quantity</span>
              <input type="number" class="ar-field__input" [(ngModel)]="newBom.baseQuantity" />
            </label>
            <label class="ar-field">
              <span class="ar-field__label">UOM</span>
              <input
                type="text"
                class="ar-field__input uom-input"
                [(ngModel)]="newBom.finishedGoodUom"
                placeholder="NOS"
              />
            </label>
          </div>
        </div>

        <h4 class="section-heading">Bill of Materials Components</h4>
        <div
          class="ar-table-responsive"
          tabindex="0"
          role="region"
          aria-label="Component Input Table"
        >
          <table class="ar-table">
            <caption class="sr-only">
              Component Input Table
            </caption>
            <thead>
              <tr>
                <th scope="col">Part No</th>
                <th scope="col">Description</th>
                <th scope="col" class="text-right">Qty</th>
                <th scope="col">UOM</th>
                <th scope="col" class="text-right">Scrap %</th>
                <th scope="col">Routing Stage</th>
                <th scope="col" class="text-right">Cost (₹)</th>
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of newBom.items; let i = index">
                <td>
                  <input
                    type="text"
                    class="ar-field__input table-input"
                    [(ngModel)]="item.componentPartNumber"
                    placeholder="Part #"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    class="ar-field__input table-input"
                    [(ngModel)]="item.componentDescription"
                    placeholder="Description"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    class="ar-field__input table-input text-right"
                    [(ngModel)]="item.quantityPerUnit"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    class="ar-field__input table-input input-xs"
                    [(ngModel)]="item.unitOfMeasure"
                    placeholder="NOS"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    class="ar-field__input table-input text-right input-xs"
                    [(ngModel)]="item.scrapPercentage"
                  />
                </td>
                <td>
                  <select
                    class="ar-field__input table-input input-sm"
                    [(ngModel)]="item.routingStage"
                  >
                    <option [ngValue]="RoutingStage.MaterialKitting">Kitting</option>
                    <option [ngValue]="RoutingStage.Machining">Machining</option>
                    <option [ngValue]="RoutingStage.Fabrication">Fabrication</option>
                    <option [ngValue]="RoutingStage.HeatTreatment">Heat Treat</option>
                    <option [ngValue]="RoutingStage.Assembly">Assembly</option>
                    <option [ngValue]="RoutingStage.FinalTesting">Testing</option>
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    class="ar-field__input table-input text-right"
                    [(ngModel)]="item.unitCostRupees"
                  />
                </td>
                <td>
                  <button ar-button variant="ghost" (click)="removeItem(i)" title="Remove item">
                    ✕
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <button ar-button variant="ghost" (click)="addItem()">+ Add Component</button>

        <div class="dialog-actions">
          <button ar-button variant="primary" (click)="saveNewBom()">Save & Compute Costing</button>
          <button ar-button variant="ghost" (click)="showCreateModal.set(false)">Cancel</button>
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

  readonly allBoms = signal<BillOfMaterialDto[]>(MOCK_BOMS);
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
    if (!environment.useMockData) {
      this.bomService.getList({ maxResultCount: 50 }).subscribe({
        next: (res) => {
          if (res && res.items && res.items.length > 0) {
            this.allBoms.set(res.items);
          }
        },
        error: (err) => console.warn('Could not load live BOMs, using mock data:', err),
      });
    }
  }

  viewBom(b: BillOfMaterialDto) {
    this.selectedBom.set(b);
  }

  activateBom(b: BillOfMaterialDto) {
    const updated: BillOfMaterialDto = { ...b, status: BomStatus.Active };
    if (!environment.useMockData && b.id) {
      this.bomService.activate(b.id).subscribe({
        next: (saved) => this.updateInState(saved),
        error: (err) => console.error(err),
      });
    }
    this.updateInState(updated);
    if (this.selectedBom()?.id === b.id) {
      this.selectedBom.set(updated);
    }
  }

  createWorkOrderFromBom(b: BillOfMaterialDto) {
    this.router.navigate(['/manufacturing/work-orders'], {
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
    this.newBom.items.push({
      componentPartNumber: '',
      componentDescription: '',
      quantityPerUnit: 1,
      unitOfMeasure: 'NOS',
      scrapPercentage: 1,
      routingStage: RoutingStage.Assembly,
      unitCostRupees: 500,
    });
  }

  removeItem(i: number) {
    if (this.newBom.items.length > 1) {
      this.newBom.items.splice(i, 1);
    }
  }

  saveNewBom() {
    if (!this.newBom.finishedGoodPartNumber || !this.newBom.finishedGoodDescription) {
      alert('Part number and description are required.');
      return;
    }

    let estimatedTotalPaise = 0;
    const mappedItems: BillOfMaterialItemDto[] = this.newBom.items.map((item, idx) => {
      const lineCost = Math.round(
        item.quantityPerUnit * (1 + item.scrapPercentage / 100) * (item.unitCostRupees * 100),
      );
      estimatedTotalPaise += lineCost;

      return {
        id: `bomi-${Date.now()}-${idx}`,
        billOfMaterialId: `bom-${Date.now()}`,
        itemSequence: (idx + 1) * 10,
        componentPartNumber: item.componentPartNumber || `COMP-${idx + 1}`,
        componentDescription: item.componentDescription || 'Raw material',
        quantityPerUnit: item.quantityPerUnit,
        unitOfMeasure: item.unitOfMeasure,
        scrapPercentage: item.scrapPercentage,
        unitCostInPaise: Math.round(item.unitCostRupees * 100),
        routingStage: item.routingStage,
        isSubAssembly: false,
      };
    });

    const created: BillOfMaterialDto = {
      id: `bom-${Date.now()}`,
      bomNumber: `BOM-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      revisionCode: this.newBom.revisionCode,
      finishedGoodPartNumber: this.newBom.finishedGoodPartNumber,
      finishedGoodDescription: this.newBom.finishedGoodDescription,
      finishedGoodUom: this.newBom.finishedGoodUom,
      baseQuantity: this.newBom.baseQuantity,
      bomType: this.newBom.bomType,
      status: BomStatus.Active,
      totalEstimatedCostInPaise: estimatedTotalPaise,
      creationTime: new Date().toISOString(),
      items: mappedItems,
    };

    if (!environment.useMockData) {
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
      this.bomService.create(dto).subscribe({
        next: (saved) => this.allBoms.update((list) => [saved, ...list]),
        error: (err) => console.error(err),
      });
    }

    this.allBoms.update((list) => [created, ...list]);
    this.showCreateModal.set(false);
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
