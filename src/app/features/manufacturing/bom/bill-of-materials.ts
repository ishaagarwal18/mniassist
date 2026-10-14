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
import { ArButton, ArChip, ArDialog, ChipTone } from '../../../ui';

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
  imports: [CommonModule, FormsModule, ArTopbar, ArButton, ArChip, ArDialog],
  template: `
    <ar-topbar
      title="Bill of Materials (BOM)"
      subtitle="Multi-level product structures, component routing, scrap allowances & costing"
    >
      <button ar-button="primary" (click)="openCreateModal()">+ Create New BOM</button>
    </ar-topbar>

    <div class="page-content">
      <!-- KPI Row -->
      <section class="kpi-grid">
        <div class="kpi-card">
          <span class="label">Total BOM Structures</span>
          <strong class="value">{{ allBoms().length }}</strong>
          <span class="sub">Assemblies & Kits configured</span>
        </div>
        <div class="kpi-card teal">
          <span class="label">Active Production BOMs</span>
          <strong class="value">{{ activeCount() }}</strong>
          <span class="sub">Ready for shop floor work orders</span>
        </div>
        <div class="kpi-card amber">
          <span class="label">Draft / Engineering</span>
          <strong class="value">{{ draftCount() }}</strong>
          <span class="sub">Pending prototype qualification</span>
        </div>
        <div class="kpi-card">
          <span class="label">Avg Production Unit Cost</span>
          <strong class="value">₹{{ avgUnitCost() / 100 | number: '1.2-2' }}</strong>
          <span class="sub">Including scrap allowance</span>
        </div>
      </section>

      <!-- Filter bar -->
      <section class="filter-bar">
        <div class="search-box">
          <input
            type="search"
            class="input-search"
            placeholder="Search BOM #, Part #, Finished Good Description..."
            [ngModel]="filterQuery()"
            (ngModelChange)="filterQuery.set($event)"
          />
        </div>
        <div class="filter-chips">
          <button
            class="chip-filter"
            [class.active]="selectedStatus() === null"
            (click)="selectedStatus.set(null)"
          >
            All BOMs ({{ allBoms().length }})
          </button>
          <button
            class="chip-filter"
            [class.active]="selectedStatus() === BomStatus.Active"
            (click)="selectedStatus.set(BomStatus.Active)"
          >
            Active
          </button>
          <button
            class="chip-filter"
            [class.active]="selectedStatus() === BomStatus.Draft"
            (click)="selectedStatus.set(BomStatus.Draft)"
          >
            Draft
          </button>
          <button
            class="chip-filter"
            [class.active]="selectedStatus() === BomStatus.Obsolete"
            (click)="selectedStatus.set(BomStatus.Obsolete)"
          >
            Obsolete
          </button>
        </div>
      </section>

      <!-- BOM Table -->
      <section class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>BOM Number</th>
              <th>Finished Good & Description</th>
              <th>Revision</th>
              <th>Type</th>
              <th>Components</th>
              <th class="text-right">Est. Cost / Unit</th>
              <th>Status</th>
              <th class="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let b of filteredBoms()" [class.selected]="selectedBom()?.id === b.id">
              <td>
                <div class="cell-main">
                  <a class="code-link" (click)="viewBom(b)">{{ b.bomNumber }}</a>
                  <span class="sub-text">{{ b.creationTime | date: 'mediumDate' }}</span>
                </div>
              </td>
              <td>
                <div class="cell-main">
                  <strong>{{ b.finishedGoodPartNumber }}</strong>
                  <span class="sub-text">{{ b.finishedGoodDescription }}</span>
                </div>
              </td>
              <td>
                <span class="badge-rev">{{ b.revisionCode }}</span>
              </td>
              <td>
                <ar-chip [tone]="b.bomType === BomType.Manufacturing ? 'teal' : 'neutral'">
                  {{ b.bomType === BomType.Manufacturing ? 'Manufacturing' : 'Engineering' }}
                </ar-chip>
              </td>
              <td>
                <span class="font-mono">{{ b.items.length }} items</span>
              </td>
              <td class="text-right font-mono">
                <strong>₹{{ b.totalEstimatedCostInPaise / 100 | number: '1.2-2' }}</strong>
                <span class="sub-text block">/ {{ b.finishedGoodUom }}</span>
              </td>
              <td>
                <ar-chip [tone]="bomTone(b.status)">
                  {{ bomLabel(b.status) }}
                </ar-chip>
              </td>
              <td class="actions-col">
                <div class="action-buttons">
                  <button
                    ar-button="primary"
                    *ngIf="b.status === BomStatus.Active"
                    (click)="createWorkOrderFromBom(b)"
                  >
                    Create WO
                  </button>
                  <button
                    ar-button="ghost"
                    *ngIf="b.status === BomStatus.Draft"
                    (click)="activateBom(b)"
                  >
                    Activate
                  </button>
                  <button ar-button="quiet" (click)="viewBom(b)">View</button>
                </div>
              </td>
            </tr>
            <tr *ngIf="filteredBoms().length === 0">
              <td colspan="8" class="empty-state">
                <p>No Bill of Materials structures match your filter criteria.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>

    <!-- BOM Tree & Details Dialog -->
    <ar-dialog
      *ngIf="selectedBom()"
      [title]="
        'BOM Structure: ' + selectedBom()!.bomNumber + ' (' + selectedBom()!.revisionCode + ')'
      "
      (dismiss)="selectedBom.set(null)"
    >
      <div class="dialog-body" *ngIf="selectedBom() as b">
        <div class="meta-row">
          <div>
            <span class="meta-label">Assembly Part</span>
            <h4>{{ b.finishedGoodPartNumber }} — {{ b.finishedGoodDescription }}</h4>
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
            <span class="box-label">Total Unit Cost</span>
            <h3>₹{{ b.totalEstimatedCostInPaise / 100 | number: '1.2-2' }}</h3>
          </div>
          <div>
            <span class="box-label">Components</span>
            <h4>{{ b.items.length }} parts</h4>
          </div>
        </div>

        <h5 class="mt-4 mb-2">Multi-Level Component Explosion</h5>
        <div class="lines-table-wrapper">
          <table class="dialog-table">
            <thead>
              <tr>
                <th>Seq</th>
                <th>Part Number</th>
                <th>Description</th>
                <th class="text-right">Qty/Unit</th>
                <th>UOM</th>
                <th class="text-right">Scrap %</th>
                <th>Routing Stage</th>
                <th class="text-right">Unit Rate</th>
                <th class="text-right">Line Cost</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of b.items">
                <td class="font-mono text-muted">{{ item.itemSequence }}</td>
                <td class="font-mono">
                  <strong>{{ item.componentPartNumber }}</strong>
                  <span class="badge-sub" *ngIf="item.isSubAssembly">Sub-Assy</span>
                </td>
                <td>{{ item.componentDescription }}</td>
                <td class="text-right font-mono">{{ item.quantityPerUnit }}</td>
                <td>{{ item.unitOfMeasure }}</td>
                <td class="text-right font-mono text-muted">{{ item.scrapPercentage }}%</td>
                <td>
                  <span class="badge-stage">{{ stageLabel(item.routingStage) }}</span>
                </td>
                <td class="text-right font-mono">
                  ₹{{ item.unitCostInPaise / 100 | number: '1.2-2' }}
                </td>
                <td class="text-right font-mono">
                  <strong
                    >₹{{
                      (item.quantityPerUnit *
                        (1 + item.scrapPercentage / 100) *
                        item.unitCostInPaise) /
                        100 | number: '1.2-2'
                    }}</strong
                  >
                </td>
              </tr>
              <tr *ngIf="b.items.length === 0">
                <td colspan="9" class="empty-state">
                  No components defined in this Bill of Materials.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="dialog-actions mt-4">
          <button
            ar-button="primary"
            *ngIf="b.status === BomStatus.Active"
            (click)="createWorkOrderFromBom(b)"
          >
            Generate Production Work Order
          </button>
          <button ar-button="ghost" *ngIf="b.status === BomStatus.Draft" (click)="activateBom(b)">
            Release to Production
          </button>
          <button ar-button="quiet" (click)="selectedBom.set(null)">Close</button>
        </div>
      </div>
    </ar-dialog>

    <!-- Create BOM Modal -->
    <ar-dialog
      *ngIf="showCreateModal()"
      title="Create Bill of Materials (BOM)"
      (dismiss)="showCreateModal.set(false)"
    >
      <div class="dialog-body">
        <div class="form-grid mb-3">
          <div class="form-group">
            <label>Finished Good Part # *</label>
            <input
              type="text"
              class="form-control"
              [(ngModel)]="newBom.finishedGoodPartNumber"
              placeholder="e.g. HV-400-P"
            />
          </div>
          <div class="form-group">
            <label>Revision Code *</label>
            <input
              type="text"
              class="form-control"
              [(ngModel)]="newBom.revisionCode"
              placeholder="Rev A"
            />
          </div>
          <div class="form-group full-width">
            <label>Product Description *</label>
            <input
              type="text"
              class="form-control"
              [(ngModel)]="newBom.finishedGoodDescription"
              placeholder="e.g. Proportional Directional Hydraulic Valve 350 Bar"
            />
          </div>
          <div class="form-group">
            <label>BOM Type</label>
            <select class="form-control" [(ngModel)]="newBom.bomType">
              <option [ngValue]="BomType.Manufacturing">Manufacturing BOM (Production)</option>
              <option [ngValue]="BomType.Engineering">Engineering BOM (Prototype)</option>
              <option [ngValue]="BomType.Kit">Sales / Spare Kit</option>
            </select>
          </div>
          <div class="form-group">
            <label>Base Quantity & UOM</label>
            <div class="uom-group">
              <input type="number" class="form-control" [(ngModel)]="newBom.baseQuantity" />
              <input
                type="text"
                class="form-control uom-input"
                [(ngModel)]="newBom.finishedGoodUom"
                placeholder="NOS"
              />
            </div>
          </div>
        </div>

        <h5 class="mb-2">Bill of Materials Components</h5>
        <table class="dialog-table mb-3">
          <thead>
            <tr>
              <th>Part No</th>
              <th>Description</th>
              <th>Qty</th>
              <th>UOM</th>
              <th>Scrap %</th>
              <th>Routing Stage</th>
              <th>Cost (₹)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of newBom.items; let i = index">
              <td>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="item.componentPartNumber"
                  placeholder="Part #"
                />
              </td>
              <td>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="item.componentDescription"
                  placeholder="Description"
                />
              </td>
              <td>
                <input
                  type="number"
                  class="form-control text-right"
                  [(ngModel)]="item.quantityPerUnit"
                />
              </td>
              <td>
                <input
                  type="text"
                  class="form-control input-xs"
                  [(ngModel)]="item.unitOfMeasure"
                  placeholder="NOS"
                />
              </td>
              <td>
                <input
                  type="number"
                  class="form-control text-right input-xs"
                  [(ngModel)]="item.scrapPercentage"
                />
              </td>
              <td>
                <select class="form-control input-sm" [(ngModel)]="item.routingStage">
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
                  class="form-control text-right"
                  [(ngModel)]="item.unitCostRupees"
                />
              </td>
              <td>
                <button ar-button="ghost" (click)="removeItem(i)">x</button>
              </td>
            </tr>
          </tbody>
        </table>
        <button ar-button="ghost" class="mb-3" (click)="addItem()">+ Add Component</button>

        <div class="dialog-actions">
          <button ar-button="primary" (click)="saveNewBom()">Save & Compute Costing</button>
          <button ar-button="ghost" (click)="showCreateModal.set(false)">Cancel</button>
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

        &.amber {
          border-left: 4px solid #f59e0b;
        }
        &.teal {
          border-left: 4px solid #0d9488;
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

      .filter-bar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }

      .search-box {
        flex: 1;
        min-width: 280px;

        .input-search {
          width: 100%;
          padding: 0.5rem 0.85rem;
          border: 1px solid var(--ar-border, #cbd5e1);
          border-radius: 6px;
          font-size: 0.875rem;
          background: var(--ar-surface, #ffffff);
        }
      }

      .filter-chips {
        display: flex;
        gap: 0.5rem;

        .chip-filter {
          padding: 0.35rem 0.85rem;
          font-size: 0.8rem;
          border-radius: 20px;
          border: 1px solid var(--ar-border, #cbd5e1);
          background: var(--ar-surface, #ffffff);
          cursor: pointer;
          font-weight: 500;
          transition: all 0.15s ease;

          &.active {
            background: var(--ar-primary, #1e293b);
            color: #ffffff;
            border-color: var(--ar-primary, #1e293b);
          }
        }
      }

      .table-card {
        background: var(--ar-surface, #ffffff);
        border: 1px solid var(--ar-border, #e2e8f0);
        border-radius: 8px;
        overflow-x: auto;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
      }

      .data-table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
        font-size: 0.85rem;

        th {
          padding: 0.75rem 1rem;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          font-weight: 600;
          color: #475569;
          text-transform: uppercase;
          font-size: 0.72rem;
          letter-spacing: 0.05em;
        }

        td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }

        tbody tr:hover {
          background: #f8fafc;
        }

        tbody tr.selected {
          background: #f1f5f9;
        }
      }

      .cell-main {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;

        .code-link {
          font-family: ui-monospace, monospace;
          font-weight: 600;
          color: #2563eb;
          cursor: pointer;
          text-decoration: underline;
        }

        .sub-text {
          font-size: 0.74rem;
          color: #64748b;
        }
      }

      .badge-rev {
        font-size: 0.75rem;
        background: #f1f5f9;
        padding: 0.15rem 0.4rem;
        border-radius: 4px;
        font-weight: 600;
      }

      .badge-sub {
        font-size: 0.7rem;
        background: #e0e7ff;
        color: #3730a3;
        padding: 0.1rem 0.35rem;
        border-radius: 4px;
        margin-left: 0.35rem;
      }

      .badge-stage {
        font-size: 0.75rem;
        background: #e2e8f0;
        padding: 0.1rem 0.4rem;
        border-radius: 4px;
        font-weight: 500;
      }

      .actions-col {
        text-align: right;
      }

      .action-buttons {
        display: flex;
        gap: 0.35rem;
        justify-content: flex-end;
      }

      .dialog-body {
        padding: 1rem 0;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .meta-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid #e2e8f0;
      }

      .meta-status {
        display: flex;
        gap: 0.5rem;
      }

      .cost-summary-box {
        display: flex;
        justify-content: space-between;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        padding: 0.85rem 1.25rem;
        border-radius: 6px;

        .box-label {
          font-size: 0.75rem;
          color: #166534;
          text-transform: uppercase;
        }

        h3,
        h4 {
          margin: 0.2rem 0 0 0;
          color: #14532d;
        }
      }

      .lines-table-wrapper {
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        overflow-x: auto;
      }

      .dialog-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8rem;

        th {
          background: #f8fafc;
          padding: 0.5rem 0.75rem;
          border-bottom: 1px solid #e2e8f0;
          text-align: left;
        }

        td {
          padding: 0.5rem 0.75rem;
          border-bottom: 1px solid #f1f5f9;
        }
      }

      .text-right {
        text-align: right;
      }
      .text-muted {
        color: #64748b;
      }
      .font-mono {
        font-family: ui-monospace, monospace;
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;

        .full-width {
          grid-column: span 2;
        }
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;

        label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #475569;
        }

        .form-control {
          padding: 0.45rem 0.65rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.82rem;
        }
      }

      .uom-group {
        display: flex;
        gap: 0.5rem;

        .uom-input {
          max-width: 80px;
        }
      }

      .input-sm {
        padding: 0.25rem 0.4rem;
        font-size: 0.78rem;
      }

      .input-xs {
        max-width: 65px;
      }

      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
      }

      .empty-state {
        text-align: center;
        padding: 2.5rem;
        color: #94a3b8;
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
