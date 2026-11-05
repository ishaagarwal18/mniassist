import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { ArTopbar } from '../../../layout/topbar';
import {
  CompleteRoutingStepDto,
  CompleteWorkOrderDto,
  CreateWorkOrderDto,
  IssueMaterialToWorkOrderDto,
  RoutingStage,
  WorkOrderDto,
  WorkOrderMaterialIssueDto,
  WorkOrderRoutingStepDto,
  WorkOrderService,
  WorkOrderStatus,
} from '../../../proxy/manufacturing';
import { ArButton } from '../../../ui/button';
import { ArChip, ChipTone } from '../../../ui/chip';
import { ArDialog } from '../../../ui/dialog';
import { ArStatTile } from '../../../ui/stat-tile';
import { ArGrid } from '../../../ui/grid';
import { ArDateInput } from '../../../ui';
import { GridModule, RecordClickEventArgs, RowSelectEventArgs } from '@syncfusion/ej2-angular-grids';

const MOCK_WORK_ORDERS: WorkOrderDto[] = [
  {
    id: 'wo-1',
    workOrderNumber: 'WO-2026-0081',
    billOfMaterialId: 'bom-1',
    bomNumber: 'BOM-2026-0001',
    salesOrderId: 'so-1',
    salesOrderNumber: 'SO-2026-0012',
    customerName: 'Tata Motors Powertrain Ltd',
    partNumber: 'HV-400-P',
    description: 'Proportional Directional Hydraulic Valve 350 Bar',
    batchNumber: 'BAT-2026-041',
    plannedQuantity: 50,
    producedQuantity: 30,
    scrappedQuantity: 2,
    status: WorkOrderStatus.InProgress,
    currentStage: RoutingStage.FinalTesting,
    plannedStartDateUtc: new Date(Date.now() - 5 * 86_400_000).toISOString(),
    plannedEndDateUtc: new Date(Date.now() + 4 * 86_400_000).toISOString(),
    actualStartDateUtc: new Date(Date.now() - 5 * 86_400_000).toISOString(),
    assignedSupervisor: 'Rameshwar Patil (Production Lead)',
    remarks:
      'High priority order for Pune transmission test rigs. Hydraulic calibration required at 350 bar.',
    creationTime: new Date(Date.now() - 7 * 86_400_000).toISOString(),
    materialIssues: [
      {
        id: 'womi-1',
        workOrderId: 'wo-1',
        componentPartNumber: 'VB-BODY-400',
        componentDescription: 'Ductile Iron Valve Body Casting GGG40',
        requiredQuantity: 50,
        issuedQuantity: 50,
        wastedQuantity: 2,
        unitOfMeasure: 'NOS',
        issuedFromWarehouse: 'WH-MAIN-RAW',
        issueDateUtc: new Date(Date.now() - 5 * 86_400_000).toISOString(),
      },
      {
        id: 'womi-2',
        workOrderId: 'wo-1',
        componentPartNumber: 'SPL-EN36-04',
        componentDescription: 'Ground & Lapped Spool EN36 Case Hardened',
        requiredQuantity: 50,
        issuedQuantity: 50,
        wastedQuantity: 1,
        unitOfMeasure: 'NOS',
        issuedFromWarehouse: 'WH-PRECISION-STORE',
        issueDateUtc: new Date(Date.now() - 4 * 86_400_000).toISOString(),
      },
      {
        id: 'womi-3',
        workOrderId: 'wo-1',
        componentPartNumber: 'SOL-COIL-24V',
        componentDescription: 'Proportional Solenoid Coil 24V DC IP67',
        requiredQuantity: 100,
        issuedQuantity: 80,
        wastedQuantity: 0,
        unitOfMeasure: 'NOS',
        issuedFromWarehouse: 'WH-ELEC-BAY',
        issueDateUtc: new Date(Date.now() - 3 * 86_400_000).toISOString(),
      },
      {
        id: 'womi-4',
        workOrderId: 'wo-1',
        componentPartNumber: 'SK-FKM-90',
        componentDescription: 'Viton FKM O-Ring & Backup Ring Seal Kit',
        requiredQuantity: 50,
        issuedQuantity: 50,
        wastedQuantity: 1,
        unitOfMeasure: 'SET',
        issuedFromWarehouse: 'WH-SEAL-RACK',
        issueDateUtc: new Date(Date.now() - 3 * 86_400_000).toISOString(),
      },
    ],
    routingSteps: [
      {
        id: 'wors-1',
        workOrderId: 'wo-1',
        stepSequence: 10,
        stage: RoutingStage.Machining,
        workCenterName: 'CNC 5-Axis Milling Cell #2',
        estimatedHours: 24,
        actualHours: 22.5,
        isCompleted: true,
        completedAtUtc: new Date(Date.now() - 4 * 86_400_000).toISOString(),
        inspectedBy: 'QA-Eng. Rajesh Kulkarni',
        qcPassed: true,
      },
      {
        id: 'wors-2',
        workOrderId: 'wo-1',
        stepSequence: 20,
        stage: RoutingStage.Assembly,
        workCenterName: 'Precision Hydraulic Assembly Bench A4',
        estimatedHours: 18,
        actualHours: 19.0,
        isCompleted: true,
        completedAtUtc: new Date(Date.now() - 2 * 86_400_000).toISOString(),
        inspectedBy: 'QA-Eng. Rajesh Kulkarni',
        qcPassed: true,
      },
      {
        id: 'wors-3',
        workOrderId: 'wo-1',
        stepSequence: 30,
        stage: RoutingStage.FinalTesting,
        workCenterName: 'Automated Hydraulic Test Rig 400 Bar',
        estimatedHours: 16,
        actualHours: 10.0,
        isCompleted: false,
        qcPassed: false,
      },
      {
        id: 'wors-4',
        workOrderId: 'wo-1',
        stepSequence: 40,
        stage: RoutingStage.FinishedGoodsReceipt,
        workCenterName: 'VCI Packing & Laser Marking Bay',
        estimatedHours: 6,
        actualHours: 0,
        isCompleted: false,
        qcPassed: false,
      },
    ],
  },
  {
    id: 'wo-2',
    workOrderNumber: 'WO-2026-0082',
    billOfMaterialId: 'bom-2',
    bomNumber: 'BOM-2026-0002',
    salesOrderId: 'so-2',
    salesOrderNumber: 'SO-2026-0015',
    customerName: 'Jindal Steel & Power Ltd',
    partNumber: 'CYL-HD-250',
    description: 'Heavy-Duty Tie-Rod Hydraulic Cylinder 250mm Stroke',
    batchNumber: 'BAT-2026-042',
    plannedQuantity: 20,
    producedQuantity: 0,
    scrappedQuantity: 0,
    status: WorkOrderStatus.Scheduled,
    currentStage: RoutingStage.MaterialKitting,
    plannedStartDateUtc: new Date(Date.now() + 1 * 86_400_000).toISOString(),
    plannedEndDateUtc: new Date(Date.now() + 12 * 86_400_000).toISOString(),
    assignedSupervisor: 'Sukhvinder Singh',
    remarks:
      'Pre-machining forged rod blanks staged at Bay 1. Strict ultrasonic crack check needed.',
    creationTime: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    materialIssues: [],
    routingSteps: [
      {
        id: 'wors-5',
        workOrderId: 'wo-2',
        stepSequence: 10,
        stage: RoutingStage.Machining,
        workCenterName: 'Heavy CNC Lathe Bay #1',
        estimatedHours: 40,
        actualHours: 0,
        isCompleted: false,
        qcPassed: false,
      },
      {
        id: 'wors-6',
        workOrderId: 'wo-2',
        stepSequence: 20,
        stage: RoutingStage.Fabrication,
        workCenterName: 'Submerged Arc Welding Cell',
        estimatedHours: 25,
        actualHours: 0,
        isCompleted: false,
        qcPassed: false,
      },
      {
        id: 'wors-7',
        workOrderId: 'wo-2',
        stepSequence: 30,
        stage: RoutingStage.FinalTesting,
        workCenterName: 'Hydrostatic Pressure Test Pit (500 Bar)',
        estimatedHours: 15,
        actualHours: 0,
        isCompleted: false,
        qcPassed: false,
      },
    ],
  },
  {
    id: 'wo-3',
    workOrderNumber: 'WO-2026-0080',
    billOfMaterialId: 'bom-3',
    bomNumber: 'BOM-2026-0003',
    customerName: 'Bharat Forge Industrial',
    partNumber: 'SDP-440',
    description: 'Servo Drive Automation Control Panel 440V 45kW',
    batchNumber: 'BAT-2026-039',
    plannedQuantity: 10,
    producedQuantity: 10,
    scrappedQuantity: 0,
    status: WorkOrderStatus.Completed,
    currentStage: RoutingStage.FinishedGoodsReceipt,
    plannedStartDateUtc: new Date(Date.now() - 20 * 86_400_000).toISOString(),
    plannedEndDateUtc: new Date(Date.now() - 5 * 86_400_000).toISOString(),
    actualStartDateUtc: new Date(Date.now() - 20 * 86_400_000).toISOString(),
    actualCompletionDateUtc: new Date(Date.now() - 5 * 86_400_000).toISOString(),
    assignedSupervisor: 'Anoop Sharma',
    remarks: 'Dispatched to customer central warehouse after 72-hour burn-in trial.',
    creationTime: new Date(Date.now() - 25 * 86_400_000).toISOString(),
    materialIssues: [],
    routingSteps: [
      {
        id: 'wors-8',
        workOrderId: 'wo-3',
        stepSequence: 10,
        stage: RoutingStage.Assembly,
        workCenterName: 'Electrical Panel Assembly Line 1',
        estimatedHours: 50,
        actualHours: 48,
        isCompleted: true,
        completedAtUtc: new Date(Date.now() - 10 * 86_400_000).toISOString(),
        inspectedBy: 'QA-Eng. Rajesh Kulkarni',
        qcPassed: true,
      },
      {
        id: 'wors-9',
        workOrderId: 'wo-3',
        stepSequence: 20,
        stage: RoutingStage.FinalTesting,
        workCenterName: 'FAT & Dielectric Testing Laboratory',
        estimatedHours: 20,
        actualHours: 21,
        isCompleted: true,
        completedAtUtc: new Date(Date.now() - 5 * 86_400_000).toISOString(),
        inspectedBy: 'Chief QC Anand Verma',
        qcPassed: true,
      },
    ],
  },
];

@Component({
  selector: 'app-work-orders',
  standalone: true,
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
    ArDateInput,
  ],
  template: `
    <ar-topbar
      title="Work Orders (Shop Floor ERP)"
      subtitle="Shop floor routing, material allocation, QC clearance and inventory inwards"
    >
      <div actions class="topbar-actions">
        <button ar-button variant="primary" (click)="openCreate()">+ Create Work Order</button>
      </div>
    </ar-topbar>

    <div class="page-content">
      <!-- Executive KPI Strip -->
      <section class="kpi-grid" aria-label="Work Orders Overview">
        <ar-stat-tile
          label="Total Work Orders"
          [value]="stats().totalCount"
          note="Active manufacturing batches"
        />
        <ar-stat-tile
          label="In Production"
          [value]="stats().inProgress"
          tone="amber"
          note="Operating on shop floor"
        />
        <ar-stat-tile
          label="Completed Orders"
          [value]="stats().completed"
          tone="good"
          [note]="stats().totalProduced + ' units inwarded'"
        />
        <ar-stat-tile
          label="Shop Scrap Rate"
          [value]="stats().scrapRate + '%'"
          [tone]="+stats().scrapRate > 3 ? 'bad' : 'neutral'"
          note="Material rejection tolerance"
        />
      </section>

      <!-- Filter Bar -->
      <section class="filter-card">
        <div class="search-box">
          <input
            type="search"
            class="ar-field__input"
            placeholder="Search Work Order #, Part #, Batch #, or Customer..."
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
          />
        </div>
        <div class="filter-chips">
          <button
            type="button"
            class="chip-filter"
            [class.active]="statusFilter() === 'ALL'"
            (click)="statusFilter.set('ALL')"
          >
            All ({{ workOrders().length }})
          </button>
          <button
            type="button"
            class="chip-filter"
            [class.active]="statusFilter() === WorkOrderStatus.InProgress.toString()"
            (click)="statusFilter.set(WorkOrderStatus.InProgress.toString())"
          >
            In Production
          </button>
          <button
            type="button"
            class="chip-filter"
            [class.active]="statusFilter() === WorkOrderStatus.Scheduled.toString()"
            (click)="statusFilter.set(WorkOrderStatus.Scheduled.toString())"
          >
            Scheduled
          </button>
          <button
            type="button"
            class="chip-filter"
            [class.active]="statusFilter() === WorkOrderStatus.Completed.toString()"
            (click)="statusFilter.set(WorkOrderStatus.Completed.toString())"
          >
            Completed
          </button>
        </div>
      </section>

      <!-- Main Layout: Table on Left, Detail Cockpit on Right -->
      <div class="work-order-layout">
        <!-- Work Orders Table adhering to modern-web-guidance responsive-table -->
        <section class="table-card" [class.condensed]="selectedWo() !== null">
          <ejs-grid
            arGrid="work-orders"
            [dataSource]="filteredWorkOrders()"
            [allowSelection]="true"
            [selectionSettings]="{ mode: 'Row', type: 'Single' }"
            (rowSelected)="onWoSelected($event)"
            (recordClick)="onWoClick($event)"
            aria-label="Work Orders Master Table"
          >
            <e-columns>
              <e-column field="workOrderNumber" headerText="Order #" width="150">
                <ng-template #template let-wo>
                  <div class="wo-ref">
                    <span class="font-mono font-medium">{{ wo.workOrderNumber }}</span>
                    <span class="text-sub" *ngIf="wo.salesOrderNumber">{{
                      wo.salesOrderNumber
                    }}</span>
                  </div>
                </ng-template>
              </e-column>
              <e-column field="partNumber" headerText="Part & Batch" width="220">
                <ng-template #template let-wo>
                  <div class="part-info">
                    <span class="part-code">{{ wo.partNumber }}</span>
                    <span class="part-name">{{ wo.description }}</span>
                    <span class="batch-badge">Batch: {{ wo.batchNumber }}</span>
                  </div>
                </ng-template>
              </e-column>
              <e-column headerText="Planned / Produced" textAlign="Right" width="160">
                <ng-template #template let-wo>
                  <div class="qty-progress">
                    <span class="qty-numbers"
                      >{{ wo.producedQuantity }} / {{ wo.plannedQuantity }}</span
                    >
                    <div class="progress-bar-bg">
                      <div
                        class="progress-bar-fill"
                        [style.width.%]="
                          wo.plannedQuantity > 0
                            ? (wo.producedQuantity / wo.plannedQuantity) * 100
                            : 0
                        "
                      ></div>
                    </div>
                  </div>
                </ng-template>
              </e-column>
              <e-column field="currentStage" headerText="Stage" width="140">
                <ng-template #template let-wo>
                  <span class="stage-tag">{{ getStageLabel(wo.currentStage) }}</span>
                </ng-template>
              </e-column>
              <e-column field="status" headerText="Status" width="130">
                <ng-template #template let-wo>
                  <ar-chip
                    [tone]="getStatusTone(wo.status)"
                    [dot]="wo.status === WorkOrderStatus.InProgress"
                  >
                    {{ getStatusLabel(wo.status) }}
                  </ar-chip>
                </ng-template>
              </e-column>
              <e-column headerText="Actions" width="100" freeze="Right">
                <ng-template #template let-wo>
                  <button
                    ar-button
                    variant="ghost"
                    (click)="selectWorkOrder(wo); $event.stopPropagation()"
                  >
                    View
                  </button>
                </ng-template>
              </e-column>
            </e-columns>
          </ejs-grid>
        </section>

        <!-- Right Cockpit: Work Order Details & Routing / Material Management -->
        <section class="detail-cockpit" *ngIf="selectedWo() as wo">
          <header class="cockpit-header">
            <div>
              <div class="cockpit-title-row">
                <h3>{{ wo.workOrderNumber }}</h3>
                <ar-chip
                  [tone]="getStatusTone(wo.status)"
                  [dot]="wo.status === WorkOrderStatus.InProgress"
                >
                  {{ getStatusLabel(wo.status) }}
                </ar-chip>
              </div>
              <p class="cockpit-sub">
                Part: <strong>{{ wo.partNumber }}</strong> &bull; Batch:
                <strong>{{ wo.batchNumber }}</strong> &bull; {{ wo.description }}
              </p>
              <p class="cockpit-client" *ngIf="wo.customerName">
                Customer: <span>{{ wo.customerName }}</span>
              </p>
            </div>
            <div class="cockpit-actions">
              <button
                *ngIf="
                  wo.status === WorkOrderStatus.Draft || wo.status === WorkOrderStatus.Scheduled
                "
                ar-button
                variant="primary"
                (click)="releaseToShopFloor()"
              >
                Release to Floor
              </button>
              <button
                *ngIf="wo.status === WorkOrderStatus.InProgress"
                ar-button
                variant="primary"
                (click)="openCompleteWo()"
              >
                Inward Finished Goods
              </button>
            </div>
          </header>

          <!-- Quantity & Stage Metrics -->
          <div class="cockpit-metrics">
            <div class="metric-item">
              <span class="lbl">Planned Qty</span>
              <strong class="val">{{ wo.plannedQuantity }}</strong>
            </div>
            <div class="metric-item">
              <span class="lbl">Produced Qty</span>
              <strong class="val val-success">{{ wo.producedQuantity }}</strong>
            </div>
            <div class="metric-item">
              <span class="lbl">Scrapped Qty</span>
              <strong class="val val-danger">{{ wo.scrappedQuantity }}</strong>
            </div>
            <div class="metric-item">
              <span class="lbl">Current Stage</span>
              <strong class="val val-stage">{{ getStageLabel(wo.currentStage) }}</strong>
            </div>
            <div class="metric-item">
              <span class="lbl">Supervisor</span>
              <span class="val-text">{{ wo.assignedSupervisor || 'Unassigned' }}</span>
            </div>
          </div>

          <!-- Tabs: Shop Floor Routing Steps vs Material Issues -->
          <div class="cockpit-tabs">
            <button
              type="button"
              class="cockpit-tab-btn"
              [class.active]="activeTab() === 'routing'"
              (click)="activeTab.set('routing')"
            >
              Shop Floor Routing Steps ({{ wo.routingSteps.length }})
            </button>
            <button
              type="button"
              class="cockpit-tab-btn"
              [class.active]="activeTab() === 'materials'"
              (click)="activeTab.set('materials')"
            >
              Material Issues & BOM ({{ wo.materialIssues.length }})
            </button>
          </div>

          <!-- Tab 1: Routing Steps adhering to modern-web-guidance responsive-table -->
          <div class="cockpit-tab-content" *ngIf="activeTab() === 'routing'">
            <ejs-grid
              arGrid="work-order-routing-steps"
              [dataSource]="wo.routingSteps"
              aria-label="Shop Floor Routing Steps"
            >
              <e-columns>
                <e-column field="stepSequence" headerText="Seq" width="80">
                  <ng-template #template let-step>
                    <span class="font-mono text-muted">#{{ step.stepSequence }}</span>
                  </ng-template>
                </e-column>
                <e-column headerText="Stage" width="140">
                  <ng-template #template let-step>
                    <span class="routing-stage-pill">{{ getStageLabel(step.stage) }}</span>
                  </ng-template>
                </e-column>
                <e-column headerText="Work Center" width="180">
                  <ng-template #template let-step>
                    <div class="wc-name">{{ step.workCenterName }}</div>
                    <div class="wc-inspector" *ngIf="step.inspectedBy">
                      By: {{ step.inspectedBy }}
                    </div>
                  </ng-template>
                </e-column>
                <e-column headerText="Est / Act Hrs" width="130">
                  <ng-template #template let-step>
                    <span class="font-mono">{{ step.actualHours || 0 }} / {{ step.estimatedHours }}h</span>
                  </ng-template>
                </e-column>
                <e-column headerText="QC Inspection" width="150">
                  <ng-template #template let-step>
                    <ar-chip
                      [tone]="step.qcPassed ? 'good' : step.isCompleted ? 'warn' : 'neutral'"
                    >
                      {{
                        step.qcPassed
                          ? 'QC Passed'
                          : step.isCompleted
                            ? 'Inspection Done'
                            : 'Pending'
                      }}
                    </ar-chip>
                  </ng-template>
                </e-column>
                <e-column headerText="Action" width="140" [textAlign]="'Right'" freeze="Right">
                  <ng-template #template let-step>
                    <button
                      *ngIf="!step.isCompleted && wo.status === WorkOrderStatus.InProgress"
                      ar-button
                      variant="ghost"
                      (click)="openCompleteStep(step)"
                    >
                      Complete Step
                    </button>
                    <span *ngIf="step.isCompleted" class="text-muted-check">&#10003; Done</span>
                  </ng-template>
                </e-column>
              </e-columns>
            </ejs-grid>
          </div>

          <!-- Tab 2: Material Issues adhering to modern-web-guidance responsive-table -->
          <div class="cockpit-tab-content" *ngIf="activeTab() === 'materials'">
            <div class="materials-header">
              <span class="section-hint">Required BOM components allocated to this batch.</span>
              <button
                *ngIf="
                  wo.status === WorkOrderStatus.InProgress ||
                  wo.status === WorkOrderStatus.Scheduled
                "
                ar-button
                variant="ghost"
                (click)="openIssueMaterial()"
              >
                + Issue Material
              </button>
            </div>

            <ejs-grid
              arGrid="work-order-material-issues"
              [dataSource]="wo.materialIssues"
              aria-label="Allocated Material Issues"
            >
              <e-columns>
                <e-column field="componentPartNumber" headerText="Part #" width="160">
                  <ng-template #template let-m>
                    <span class="font-mono font-medium">{{ m.componentPartNumber }}</span>
                  </ng-template>
                </e-column>
                <e-column field="componentDescription" headerText="Description" width="220"></e-column>
                <e-column headerText="Req Qty" width="120" [textAlign]="'Right'">
                  <ng-template #template let-m>
                    <span class="font-mono">{{ m.requiredQuantity }} {{ m.unitOfMeasure }}</span>
                  </ng-template>
                </e-column>
                <e-column headerText="Issued Qty" width="120" [textAlign]="'Right'">
                  <ng-template #template let-m>
                    <span
                      class="font-mono"
                      [class.text-success]="m.issuedQuantity >= m.requiredQuantity"
                    >
                      {{ m.issuedQuantity }} {{ m.unitOfMeasure }}
                    </span>
                  </ng-template>
                </e-column>
                <e-column field="wastedQuantity" headerText="Scrap" width="100" [textAlign]="'Right'">
                  <ng-template #template let-m>
                    <span class="font-mono text-danger">{{ m.wastedQuantity }}</span>
                  </ng-template>
                </e-column>
                <e-column headerText="Warehouse" width="140">
                  <ng-template #template let-m>
                    <span class="wh-tag">{{ m.issuedFromWarehouse || 'Main Store' }}</span>
                  </ng-template>
                </e-column>
              </e-columns>
            </ejs-grid>
          </div>
        </section>
      </div>
    </div>

    <!-- Create Work Order Dialog -->
    <ar-dialog
      *ngIf="isCreateOpen()"
      title="Create Production Work Order"
      width="min(760px, calc(100vw - 32px))"
      (dismiss)="isCreateOpen.set(false)"
    >
      <div class="dialog-form-body">
        <div class="form-grid">
          <label class="ar-field">
            <span class="ar-field__label">Work Order Number</span>
            <input type="text" class="ar-field__input" [(ngModel)]="newWo.workOrderNumber" />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Batch Number</span>
            <input
              type="text"
              class="ar-field__input"
              [(ngModel)]="newWo.batchNumber"
              placeholder="BAT-2026-..."
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Finished Good Part #</span>
            <input
              type="text"
              class="ar-field__input"
              [(ngModel)]="newWo.partNumber"
              placeholder="HV-400-P"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Part Description</span>
            <input
              type="text"
              class="ar-field__input"
              [(ngModel)]="newWo.description"
              placeholder="Proportional Directional Hydraulic..."
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Planned Production Quantity</span>
            <input type="number" class="ar-field__input" [(ngModel)]="newWo.plannedQuantity" />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Assigned Supervisor</span>
            <input
              type="text"
              class="ar-field__input"
              [(ngModel)]="newWo.assignedSupervisor"
              placeholder="Shop Lead Name"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Planned Start Date</span>
            <input type="date" class="ar-field__input" [(ngModel)]="newWo.plannedStartDateUtc" />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Planned End Date</span>
            <input type="date" class="ar-field__input" [(ngModel)]="newWo.plannedEndDateUtc" />
          </label>
        </div>

        <label class="ar-field full-width">
          <span class="ar-field__label">Production Notes & Instructions</span>
          <textarea
            class="ar-field__input"
            rows="2"
            [(ngModel)]="newWo.remarks"
            placeholder="Special heat treatment or tolerances..."
          ></textarea>
        </label>

        <div class="dialog-actions">
          <button ar-button variant="primary" (click)="createWorkOrder()">
            Generate Work Order
          </button>
          <button ar-button variant="ghost" (click)="isCreateOpen.set(false)">Cancel</button>
        </div>
      </div>
    </ar-dialog>

    <!-- Issue Material Dialog -->
    <ar-dialog
      *ngIf="isIssueMaterialOpen()"
      title="Issue Material to Work Order"
      width="min(680px, calc(100vw - 32px))"
      (dismiss)="isIssueMaterialOpen.set(false)"
    >
      <div class="dialog-form-body">
        <div class="form-grid">
          <label class="ar-field">
            <span class="ar-field__label">Component Part #</span>
            <input
              type="text"
              class="ar-field__input"
              [(ngModel)]="newMaterial.componentPartNumber"
              placeholder="VB-BODY-400"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Component Description</span>
            <input
              type="text"
              class="ar-field__input"
              [(ngModel)]="newMaterial.componentDescription"
              placeholder="Ductile Iron Casting..."
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Required Qty</span>
            <input
              type="number"
              class="ar-field__input"
              [(ngModel)]="newMaterial.requiredQuantity"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Issued Qty</span>
            <input type="number" class="ar-field__input" [(ngModel)]="newMaterial.issuedQuantity" />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Wasted / Scrap Qty</span>
            <input type="number" class="ar-field__input" [(ngModel)]="newMaterial.wastedQuantity" />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Issuing Warehouse</span>
            <input
              type="text"
              class="ar-field__input"
              [(ngModel)]="newMaterial.issuedFromWarehouse"
              placeholder="WH-MAIN-RAW"
            />
          </label>
        </div>

        <div class="dialog-actions">
          <button ar-button variant="primary" (click)="issueMaterial()">Issue to Shop Floor</button>
          <button ar-button variant="ghost" (click)="isIssueMaterialOpen.set(false)">Cancel</button>
        </div>
      </div>
    </ar-dialog>

    <!-- Complete Step & QC Inspection Dialog -->
    <ar-dialog
      *ngIf="isCompleteStepOpen()"
      title="Complete Routing Step & QC Inspection"
      width="min(600px, calc(100vw - 32px))"
      (dismiss)="isCompleteStepOpen.set(false)"
    >
      <div class="dialog-form-body" *ngIf="targetStep() as step">
        <p class="dialog-intro">
          Completing step
          <strong>#{{ step.stepSequence }} - {{ getStageLabel(step.stage) }}</strong> at
          <em>{{ step.workCenterName }}</em
          >.
        </p>

        <div class="form-grid">
          <label class="ar-field">
            <span class="ar-field__label">Actual Machine / Labor Hours</span>
            <input type="number" class="ar-field__input" [(ngModel)]="stepCompletion.actualHours" />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Quality Inspector Name</span>
            <input type="text" class="ar-field__input" [(ngModel)]="stepCompletion.inspectedBy" />
          </label>
        </div>

        <div class="form-check-row">
          <label class="checkbox-label">
            <input type="checkbox" [(ngModel)]="stepCompletion.qcPassed" />
            <span>Step passed QC tolerance and met drawing specifications</span>
          </label>
        </div>

        <div class="dialog-actions">
          <button ar-button variant="primary" (click)="completeStep()">
            Confirm Step Completion
          </button>
          <button ar-button variant="ghost" (click)="isCompleteStepOpen.set(false)">Cancel</button>
        </div>
      </div>
    </ar-dialog>

    <!-- Complete Work Order & Inward Finished Goods Dialog -->
    <ar-dialog
      *ngIf="isCompleteWoOpen()"
      title="Complete Work Order & Inward FG"
      width="min(640px, calc(100vw - 32px))"
      (dismiss)="isCompleteWoOpen.set(false)"
    >
      <div class="dialog-form-body" *ngIf="selectedWo() as wo">
        <p class="dialog-intro">
          Batch <strong>{{ wo.batchNumber }}</strong> for part <strong>{{ wo.partNumber }}</strong
          >. Planned: {{ wo.plannedQuantity }} units.
        </p>

        <div class="form-grid">
          <label class="ar-field">
            <span class="ar-field__label">Final Produced Good Quantity</span>
            <input
              type="number"
              class="ar-field__input"
              [(ngModel)]="woCompletion.producedQuantity"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Total Scrapped / Rejected Quantity</span>
            <input
              type="number"
              class="ar-field__input"
              [(ngModel)]="woCompletion.scrappedQuantity"
            />
          </label>
          <label class="ar-field full-width">
            <span class="ar-field__label">Finished Goods Storage Warehouse & Rack</span>
            <input
              type="text"
              class="ar-field__input"
              [(ngModel)]="woCompletion.destinationLocation"
              placeholder="WH-FG-MAIN-BAY4"
            />
          </label>
          <label class="ar-field full-width">
            <span class="ar-field__label">Completion Remarks</span>
            <textarea
              class="ar-field__input"
              rows="2"
              [(ngModel)]="woCompletion.remarks"
            ></textarea>
          </label>
        </div>

        <div class="dialog-actions">
          <button ar-button variant="primary" (click)="completeWorkOrder()">
            Complete Order & Update Inventory
          </button>
          <button ar-button variant="ghost" (click)="isCompleteWoOpen.set(false)">Cancel</button>
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

      .topbar-actions {
        display: flex;
        gap: 12px;
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

      .work-order-layout {
        display: grid;
        grid-template-columns: 1fr 1.15fr;
        gap: 20px;
        align-items: start;
      }

      @media (max-width: 1100px) {
        .work-order-layout {
          grid-template-columns: 1fr;
        }
      }

      .table-card {
        background: var(--ar-white);
        border: 1px solid var(--ar-line-200);
        border-radius: var(--ar-radius-card, 10px);
        overflow: hidden;
        box-shadow: var(--ar-shadow-card, 0 1px 3px rgba(0, 0, 0, 0.05));
      }

      .ar-table-responsive {
        overflow-x: auto;
      }

      .ar-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85rem;

        thead th {
          position: sticky;
          top: 0;
          background: var(--ar-bg-50);
          color: var(--ar-ink-700);
          font-weight: 600;
          padding: 10px 14px;
          border-bottom: 1px solid var(--ar-line-200);
          white-space: nowrap;
          z-index: 1;
        }

        tbody td {
          padding: 10px 14px;
          border-bottom: 1px solid var(--ar-line-200);
          color: var(--ar-ink-900);
          vertical-align: middle;
        }

        .clickable-row {
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .clickable-row:hover {
          background: var(--ar-bg-50);
        }

        .clickable-row.selected-row {
          background: #eff8ff;
          border-left: 3px solid var(--ar-blue-500);
        }
      }

      .wo-ref {
        display: flex;
        flex-direction: column;
      }

      .text-sub {
        font-size: 0.75rem;
        color: var(--ar-ink-500);
      }

      .part-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .part-code {
        font-weight: 600;
        color: var(--ar-ink-900);
      }

      .part-name {
        font-size: 0.78rem;
        color: var(--ar-ink-500);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 180px;
      }

      .batch-badge {
        font-size: 0.72rem;
        color: #0369a1;
        background: #e0f2fe;
        padding: 1px 6px;
        border-radius: 3px;
        width: fit-content;
      }

      .qty-progress {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 4px;
      }

      .qty-numbers {
        font-size: 0.8rem;
        font-weight: 600;
        font-family: var(--ar-font-mono, monospace);
      }

      .progress-bar-bg {
        width: 80px;
        height: 6px;
        background: var(--ar-line-200);
        border-radius: 3px;
        overflow: hidden;
      }

      .progress-bar-fill {
        height: 100%;
        background: #10b981;
        border-radius: 3px;
      }

      .stage-tag {
        font-size: 0.75rem;
        background: var(--ar-bg-100);
        color: var(--ar-ink-700);
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 500;
      }

      .empty-cell {
        text-align: center;
        padding: 40px;
        color: var(--ar-ink-400);
      }

      /* Detail Cockpit */
      .detail-cockpit {
        background: var(--ar-white);
        border: 1px solid var(--ar-line-200);
        border-radius: var(--ar-radius-card, 10px);
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        box-shadow: var(--ar-shadow-card, 0 1px 3px rgba(0, 0, 0, 0.05));
      }

      .cockpit-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 1px solid var(--ar-line-200);
        padding-bottom: 16px;
        gap: 16px;
        flex-wrap: wrap;
      }

      .cockpit-title-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .cockpit-title-row h3 {
        margin: 0;
        font: 600 1.25rem var(--ar-font-sans);
        color: var(--ar-ink-900);
      }

      .cockpit-sub {
        margin: 4px 0 0;
        font-size: 0.85rem;
        color: var(--ar-ink-700);
      }

      .cockpit-client {
        margin: 4px 0 0;
        font-size: 0.8rem;
        color: var(--ar-ink-500);
      }

      .cockpit-client span {
        font-weight: 600;
        color: var(--ar-ink-900);
      }

      .cockpit-actions {
        display: flex;
        gap: 8px;
      }

      .cockpit-metrics {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
        gap: 12px;
        background: var(--ar-bg-50);
        padding: 14px;
        border: 1px solid var(--ar-line-200);
        border-radius: 8px;
      }

      .metric-item {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .metric-item .lbl {
        font-size: 0.7rem;
        text-transform: uppercase;
        color: var(--ar-ink-500);
        font-weight: 600;
        letter-spacing: 0.03em;
      }

      .metric-item .val {
        font-size: 1.15rem;
        font-weight: 700;
        color: var(--ar-ink-900);
      }

      .val-success {
        color: #16a34a !important;
      }

      .val-danger {
        color: #dc2626 !important;
      }

      .val-stage {
        color: #0284c7 !important;
        font-size: 0.95rem !important;
      }

      .val-text {
        font-size: 0.85rem;
        color: var(--ar-ink-900);
        font-weight: 500;
      }

      .cockpit-tabs {
        display: flex;
        gap: 8px;
        border-bottom: 1px solid var(--ar-line-200);
      }

      .cockpit-tab-btn {
        padding: 8px 16px;
        font-size: 0.85rem;
        font-weight: 600;
        border: none;
        background: transparent;
        cursor: pointer;
        color: var(--ar-ink-500);
        border-bottom: 2px solid transparent;
        transition: all 0.15s ease;
      }

      .cockpit-tab-btn.active {
        color: var(--ar-ink-900);
        border-bottom-color: var(--ar-blue-500);
      }

      .routing-stage-pill {
        background: var(--ar-bg-100);
        color: var(--ar-ink-900);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 500;
      }

      .wc-name {
        font-weight: 600;
        font-size: 0.82rem;
      }

      .wc-inspector {
        font-size: 0.72rem;
        color: var(--ar-ink-500);
      }

      .materials-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .section-hint {
        font-size: 0.82rem;
        color: var(--ar-ink-500);
      }

      .wh-tag {
        font-size: 0.72rem;
        background: var(--ar-bg-50);
        border: 1px solid var(--ar-line-200);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: var(--ar-font-mono, monospace);
      }

      .text-muted-check {
        color: #16a34a;
        font-weight: 600;
        font-size: 0.85rem;
      }

      /* Dialogs */
      .dialog-form-body {
        padding: 8px 0;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .dialog-intro {
        margin: 0;
        font-size: 0.875rem;
        color: var(--ar-ink-700);
      }

      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .full-width {
        grid-column: 1 / -1;
      }

      .form-check-row {
        padding: 4px 0;
      }

      .checkbox-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.875rem;
        cursor: pointer;
        color: var(--ar-ink-700);
      }

      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 8px;
      }

      .font-mono {
        font-family: var(--ar-font-mono, monospace);
      }

      .font-medium {
        font-weight: 500;
      }

      .text-success {
        color: #16a34a;
      }

      .text-danger {
        color: #dc2626;
      }

      .text-muted {
        color: var(--ar-ink-400);
      }

      .text-right {
        text-align: right !important;
      }

      .text-center {
        text-align: center;
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkOrdersComponent {
  private readonly workOrderService = inject(WorkOrderService);

  readonly workOrders = signal<WorkOrderDto[]>(MOCK_WORK_ORDERS);
  readonly selectedWo = signal<WorkOrderDto | null>(MOCK_WORK_ORDERS[0]);
  readonly isLoading = signal<boolean>(false);
  readonly activeTab = signal<'routing' | 'materials'>('routing');

  // Filters
  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<string>('ALL');

  // Dialogs
  readonly isCreateOpen = signal<boolean>(false);
  readonly isIssueMaterialOpen = signal<boolean>(false);
  readonly isCompleteStepOpen = signal<boolean>(false);
  readonly isCompleteWoOpen = signal<boolean>(false);

  readonly targetStep = signal<WorkOrderRoutingStepDto | null>(null);

  newWo: CreateWorkOrderDto = {
    workOrderNumber: '',
    billOfMaterialId: '',
    salesOrderId: '',
    partNumber: '',
    description: '',
    batchNumber: '',
    plannedQuantity: 10,
    plannedStartDateUtc: new Date().toISOString().substring(0, 10),
    plannedEndDateUtc: new Date(Date.now() + 10 * 86_400_000).toISOString().substring(0, 10),
    assignedSupervisor: '',
    remarks: '',
  };

  newMaterial: IssueMaterialToWorkOrderDto = {
    componentPartNumber: '',
    componentDescription: '',
    requiredQuantity: 10,
    issuedQuantity: 10,
    wastedQuantity: 0,
    unitOfMeasure: 'NOS',
    issuedFromWarehouse: 'WH-MAIN-RAW',
  };

  stepCompletion: CompleteRoutingStepDto = {
    stepId: '',
    actualHours: 8,
    inspectedBy: 'Chief Inspector Verma',
    qcPassed: true,
  };

  woCompletion: CompleteWorkOrderDto = {
    producedQuantity: 0,
    scrappedQuantity: 0,
    destinationLocation: 'WH-FG-MAIN',
    remarks: 'Batch passed final shop floor inspection.',
  };

  readonly filteredWorkOrders = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const sf = this.statusFilter();

    return this.workOrders().filter((wo) => {
      if (sf !== 'ALL' && wo.status.toString() !== sf) return false;
      if (!q) return true;

      return (
        wo.workOrderNumber.toLowerCase().includes(q) ||
        wo.partNumber.toLowerCase().includes(q) ||
        wo.description.toLowerCase().includes(q) ||
        wo.batchNumber.toLowerCase().includes(q) ||
        (wo.customerName && wo.customerName.toLowerCase().includes(q))
      );
    });
  });

  readonly stats = computed(() => {
    const list = this.workOrders();
    const inProgress = list.filter(
      (w) => w.status === WorkOrderStatus.InProgress || w.status === WorkOrderStatus.Scheduled,
    ).length;
    const completed = list.filter((w) => w.status === WorkOrderStatus.Completed).length;
    const totalPlanned = list.reduce((acc, w) => acc + (w.plannedQuantity || 0), 0);
    const totalProduced = list.reduce((acc, w) => acc + (w.producedQuantity || 0), 0);
    const totalScrapped = list.reduce((acc, w) => acc + (w.scrappedQuantity || 0), 0);

    const scrapRate =
      totalProduced + totalScrapped > 0
        ? ((totalScrapped / (totalProduced + totalScrapped)) * 100).toFixed(1)
        : '0.0';

    return {
      totalCount: list.length,
      inProgress,
      completed,
      totalPlanned,
      totalProduced,
      scrapRate,
    };
  });

  readonly WorkOrderStatus = WorkOrderStatus;
  readonly RoutingStage = RoutingStage;

  constructor() {
    this.loadWorkOrders();
  }

  loadWorkOrders(): void {
    if (environment.useMockData) return;

    this.isLoading.set(true);
    this.workOrderService.getList({ maxResultCount: 100 }).subscribe({
      next: (res) => {
        this.workOrders.set(res.items || []);
        if (res.items && res.items.length > 0) {
          this.selectedWo.set(res.items[0]);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  selectWorkOrder(wo: WorkOrderDto): void {
    this.selectedWo.set(wo);
  }

  onWoSelected(args: RowSelectEventArgs): void {
    const row = (Array.isArray(args.data) ? args.data[0] : args.data) as WorkOrderDto | undefined;
    if (row) this.selectWorkOrder(row);
  }

  onWoClick(args: RecordClickEventArgs): void {
    const row = args.rowData as WorkOrderDto | undefined;
    if (row) this.selectWorkOrder(row);
  }

  getStatusTone(status: WorkOrderStatus): ChipTone {
    switch (status) {
      case WorkOrderStatus.Draft:
        return 'neutral';
      case WorkOrderStatus.Scheduled:
        return 'teal';
      case WorkOrderStatus.InProgress:
        return 'amber';
      case WorkOrderStatus.Completed:
        return 'good';
      case WorkOrderStatus.QualityHold:
        return 'warn';
      case WorkOrderStatus.Cancelled:
        return 'bad';
      default:
        return 'neutral';
    }
  }

  getStatusLabel(status: WorkOrderStatus): string {
    switch (status) {
      case WorkOrderStatus.Draft:
        return 'Draft';
      case WorkOrderStatus.Scheduled:
        return 'Scheduled';
      case WorkOrderStatus.InProgress:
        return 'In Production';
      case WorkOrderStatus.Completed:
        return 'Completed';
      case WorkOrderStatus.QualityHold:
        return 'Quality Hold';
      case WorkOrderStatus.Cancelled:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  }

  getStageLabel(stage: RoutingStage): string {
    switch (stage) {
      case RoutingStage.MaterialKitting:
        return 'Material Kitting';
      case RoutingStage.Machining:
        return 'Machining';
      case RoutingStage.Fabrication:
        return 'Fabrication';
      case RoutingStage.HeatTreatment:
        return 'Heat Treatment';
      case RoutingStage.Assembly:
        return 'Assembly';
      case RoutingStage.FinalTesting:
        return 'Final Testing';
      case RoutingStage.FinishedGoodsReceipt:
        return 'Finished Goods Inward';
      default:
        return 'Stage';
    }
  }

  openCreate(): void {
    const nextSeq = this.workOrders().length + 1;
    this.newWo = {
      workOrderNumber: `WO-2026-${String(nextSeq + 80).padStart(4, '0')}`,
      billOfMaterialId: '',
      salesOrderId: '',
      partNumber: '',
      description: '',
      batchNumber: `BAT-2026-${String(nextSeq + 40).padStart(3, '0')}`,
      plannedQuantity: 25,
      plannedStartDateUtc: new Date().toISOString().substring(0, 10),
      plannedEndDateUtc: new Date(Date.now() + 10 * 86_400_000).toISOString().substring(0, 10),
      assignedSupervisor: '',
      remarks: '',
    };
    this.isCreateOpen.set(true);
  }

  createWorkOrder(): void {
    if (!this.newWo.partNumber || !this.newWo.batchNumber) return;

    if (!environment.useMockData) {
      this.workOrderService.create(this.newWo).subscribe({
        next: (created) => {
          this.workOrders.update((list) => [created, ...list]);
          this.selectedWo.set(created);
          this.isCreateOpen.set(false);
        },
      });
      return;
    }

    const created: WorkOrderDto = {
      id: `wo-${Date.now()}`,
      workOrderNumber: this.newWo.workOrderNumber || `WO-2026-0099`,
      partNumber: this.newWo.partNumber,
      description: this.newWo.description || this.newWo.partNumber,
      batchNumber: this.newWo.batchNumber,
      plannedQuantity: Number(this.newWo.plannedQuantity),
      producedQuantity: 0,
      scrappedQuantity: 0,
      status: WorkOrderStatus.Draft,
      currentStage: RoutingStage.Machining,
      plannedStartDateUtc: this.newWo.plannedStartDateUtc,
      plannedEndDateUtc: this.newWo.plannedEndDateUtc,
      assignedSupervisor: this.newWo.assignedSupervisor || 'Unassigned',
      remarks: this.newWo.remarks,
      creationTime: new Date().toISOString(),
      materialIssues: [],
      routingSteps: [
        {
          id: `wors-${Date.now()}-1`,
          workOrderId: `wo-${Date.now()}`,
          stepSequence: 10,
          stage: RoutingStage.Machining,
          workCenterName: 'Primary Machining Center',
          estimatedHours: 20,
          actualHours: 0,
          isCompleted: false,
          qcPassed: false,
        },
        {
          id: `wors-${Date.now()}-2`,
          workOrderId: `wo-${Date.now()}`,
          stepSequence: 20,
          stage: RoutingStage.Assembly,
          workCenterName: 'Main Line Assembly Cell',
          estimatedHours: 15,
          actualHours: 0,
          isCompleted: false,
          qcPassed: false,
        },
        {
          id: `wors-${Date.now()}-3`,
          workOrderId: `wo-${Date.now()}`,
          stepSequence: 30,
          stage: RoutingStage.FinalTesting,
          workCenterName: 'Quality Inspection & Load Rig',
          estimatedHours: 10,
          actualHours: 0,
          isCompleted: false,
          qcPassed: false,
        },
      ],
    };

    this.workOrders.update((list) => [created, ...list]);
    this.selectedWo.set(created);
    this.isCreateOpen.set(false);
  }

  releaseToShopFloor(): void {
    const sel = this.selectedWo();
    if (!sel) return;

    if (!environment.useMockData && sel.id) {
      this.workOrderService.release(sel.id).subscribe({
        next: (updated) => {
          this.updateWoInState(updated);
        },
      });
      return;
    }

    const updated: WorkOrderDto = {
      ...sel,
      status: WorkOrderStatus.InProgress,
      actualStartDateUtc: new Date().toISOString(),
    };
    this.updateWoInState(updated);
  }

  openIssueMaterial(): void {
    const sel = this.selectedWo();
    if (!sel) return;
    this.newMaterial = {
      componentPartNumber: '',
      componentDescription: '',
      requiredQuantity: 10,
      issuedQuantity: 10,
      wastedQuantity: 0,
      unitOfMeasure: 'NOS',
      issuedFromWarehouse: 'WH-MAIN-RAW',
    };
    this.isIssueMaterialOpen.set(true);
  }

  issueMaterial(): void {
    const sel = this.selectedWo();
    if (!sel || !this.newMaterial.componentPartNumber) return;

    if (!environment.useMockData && sel.id) {
      this.workOrderService.issueMaterial(sel.id, this.newMaterial).subscribe({
        next: (updated) => {
          this.updateWoInState(updated);
          this.isIssueMaterialOpen.set(false);
        },
      });
      return;
    }

    const newIssue: WorkOrderMaterialIssueDto = {
      id: `womi-${Date.now()}`,
      workOrderId: sel.id || '',
      componentPartNumber: this.newMaterial.componentPartNumber,
      componentDescription: this.newMaterial.componentDescription,
      requiredQuantity: Number(this.newMaterial.requiredQuantity),
      issuedQuantity: Number(this.newMaterial.issuedQuantity),
      wastedQuantity: Number(this.newMaterial.wastedQuantity),
      unitOfMeasure: this.newMaterial.unitOfMeasure,
      issuedFromWarehouse: this.newMaterial.issuedFromWarehouse,
      issueDateUtc: new Date().toISOString(),
    };

    const updated: WorkOrderDto = {
      ...sel,
      materialIssues: [...(sel.materialIssues || []), newIssue],
    };
    this.updateWoInState(updated);
    this.isIssueMaterialOpen.set(false);
  }

  openCompleteStep(step: WorkOrderRoutingStepDto): void {
    this.targetStep.set(step);
    this.stepCompletion = {
      stepId: step.id || '',
      actualHours: step.estimatedHours || 8,
      inspectedBy: 'Chief Inspector Verma',
      qcPassed: true,
    };
    this.isCompleteStepOpen.set(true);
  }

  completeStep(): void {
    const sel = this.selectedWo();
    const step = this.targetStep();
    if (!sel || !step) return;

    if (!environment.useMockData && sel.id) {
      this.workOrderService.completeStep(sel.id, this.stepCompletion).subscribe({
        next: (updated) => {
          this.updateWoInState(updated);
          this.isCompleteStepOpen.set(false);
        },
      });
      return;
    }

    const updatedSteps = (sel.routingSteps || []).map((s) => {
      if (s.id === step.id) {
        return {
          ...s,
          isCompleted: true,
          completedAtUtc: new Date().toISOString(),
          actualHours: Number(this.stepCompletion.actualHours),
          inspectedBy: this.stepCompletion.inspectedBy,
          qcPassed: this.stepCompletion.qcPassed,
        };
      }
      return s;
    });

    const nextIncomplete = updatedSteps.find((s) => !s.isCompleted);
    const nextStage = nextIncomplete ? nextIncomplete.stage : RoutingStage.FinishedGoodsReceipt;

    const updated: WorkOrderDto = {
      ...sel,
      routingSteps: updatedSteps,
      currentStage: nextStage,
    };

    this.updateWoInState(updated);
    this.isCompleteStepOpen.set(false);
  }

  openCompleteWo(): void {
    const sel = this.selectedWo();
    if (!sel) return;
    this.woCompletion = {
      producedQuantity: sel.plannedQuantity,
      scrappedQuantity: 0,
      destinationLocation: 'WH-FG-MAIN',
      remarks: 'Production completed with full inspection clearance.',
    };
    this.isCompleteWoOpen.set(true);
  }

  completeWorkOrder(): void {
    const sel = this.selectedWo();
    if (!sel) return;

    if (!environment.useMockData && sel.id) {
      this.workOrderService.completeWorkOrder(sel.id, this.woCompletion).subscribe({
        next: (updated) => {
          this.updateWoInState(updated);
          this.isCompleteWoOpen.set(false);
        },
      });
      return;
    }

    const updated: WorkOrderDto = {
      ...sel,
      producedQuantity: Number(this.woCompletion.producedQuantity),
      scrappedQuantity: Number(this.woCompletion.scrappedQuantity),
      status: WorkOrderStatus.Completed,
      currentStage: RoutingStage.FinishedGoodsReceipt,
      actualCompletionDateUtc: new Date().toISOString(),
      remarks: `${sel.remarks || ''} [Inwarded to ${this.woCompletion.destinationLocation}]`.trim(),
    };

    this.updateWoInState(updated);
    this.isCompleteWoOpen.set(false);
  }

  private updateWoInState(updated: WorkOrderDto): void {
    this.workOrders.update((list) => list.map((w) => (w.id === updated.id ? updated : w)));
    this.selectedWo.set(updated);
  }
}
