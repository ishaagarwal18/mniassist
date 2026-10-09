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
import { ArButton, ArChip, ArDialog, ChipTone } from '../../../ui';

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
    remarks: 'High priority order for Pune transmission test rigs. Hydraulic calibration required at 350 bar.',
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
    remarks: 'Pre-machining forged rod blanks staged at Bay 1. Strict ultrasonic crack check needed.',
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
  imports: [CommonModule, FormsModule, ArTopbar, ArButton, ArChip, ArDialog],
  template: `
    <ar-topbar title="Work Orders (Shop Floor ERP)">
      <div actions class="topbar-actions">
        <button ar-button="primary" (click)="openCreate()">+ Create Work Order</button>
      </div>
    </ar-topbar>

    <div class="page-content">
      <!-- KPI Row -->
      <section class="kpi-grid">
        <div class="kpi-card">
          <span class="label">Total Work Orders</span>
          <strong class="value">{{ stats().totalCount }}</strong>
          <span class="sub">Manufacturing batches</span>
        </div>
        <div class="kpi-card amber">
          <span class="label">In Production</span>
          <strong class="value">{{ stats().inProgress }}</strong>
          <span class="sub">Active on shop floor</span>
        </div>
        <div class="kpi-card teal">
          <span class="label">Completed Orders</span>
          <strong class="value">{{ stats().completed }}</strong>
          <span class="sub">{{ stats().totalProduced }} Units inwarded</span>
        </div>
        <div class="kpi-card">
          <span class="label">Shop Scrap Rate</span>
          <strong class="value">{{ stats().scrapRate }}%</strong>
          <span class="sub">Material loss tolerance</span>
        </div>
      </section>

      <!-- Filter bar -->
      <section class="filter-bar">
        <div class="search-box">
          <input
            type="search"
            class="input-search"
            placeholder="Search Work Order #, Part #, Batch #, or Customer..."
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
          />
        </div>
        <div class="filter-chips">
          <button
            class="chip-filter"
            [class.active]="statusFilter() === 'ALL'"
            (click)="statusFilter.set('ALL')"
          >
            All ({{ workOrders().length }})
          </button>
          <button
            class="chip-filter"
            [class.active]="statusFilter() === WorkOrderStatus.InProgress.toString()"
            (click)="statusFilter.set(WorkOrderStatus.InProgress.toString())"
          >
            In Progress
          </button>
          <button
            class="chip-filter"
            [class.active]="statusFilter() === WorkOrderStatus.Scheduled.toString()"
            (click)="statusFilter.set(WorkOrderStatus.Scheduled.toString())"
          >
            Scheduled
          </button>
          <button
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
        <!-- Work Orders Table -->
        <section class="table-card" [class.condensed]="selectedWo() !== null">
          <table class="data-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Part & Batch</th>
                <th>Planned / Produced</th>
                <th>Stage</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                *ngFor="let wo of filteredWorkOrders()"
                [class.selected-row]="selectedWo()?.id === wo.id"
                (click)="selectWorkOrder(wo)"
                class="clickable-row"
              >
                <td>
                  <div class="wo-ref">
                    <span class="fw-bold">{{ wo.workOrderNumber }}</span>
                    <span class="text-sub" *ngIf="wo.salesOrderNumber">{{ wo.salesOrderNumber }}</span>
                  </div>
                </td>
                <td>
                  <div class="part-info">
                    <span class="part-code">{{ wo.partNumber }}</span>
                    <span class="part-name">{{ wo.description }}</span>
                    <span class="batch-badge">Batch: {{ wo.batchNumber }}</span>
                  </div>
                </td>
                <td>
                  <div class="qty-progress">
                    <span class="qty-numbers">{{ wo.producedQuantity }} / {{ wo.plannedQuantity }}</span>
                    <div class="progress-bar-bg">
                      <div
                        class="progress-bar-fill"
                        [style.width.%]="(wo.plannedQuantity > 0 ? (wo.producedQuantity / wo.plannedQuantity) * 100 : 0)"
                      ></div>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="stage-tag">{{ getStageLabel(wo.currentStage) }}</span>
                </td>
                <td>
                  <ar-chip [tone]="getStatusTone(wo.status)">
                    {{ getStatusLabel(wo.status) }}
                  </ar-chip>
                </td>
                <td>
                  <button
                    ar-button="ghost"
                    (click)="selectWorkOrder(wo); $event.stopPropagation()"
                  >
                    View
                  </button>
                </td>
              </tr>
              <tr *ngIf="filteredWorkOrders().length === 0">
                <td colspan="6" class="empty-cell">No work orders match your search criteria.</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- Right Cockpit: Work Order Details & Routing / Material Management -->
        <section class="detail-cockpit" *ngIf="selectedWo() as wo">
          <div class="cockpit-header">
            <div>
              <div class="cockpit-title-row">
                <h3>{{ wo.workOrderNumber }}</h3>
                <ar-chip [tone]="getStatusTone(wo.status)">{{ getStatusLabel(wo.status) }}</ar-chip>
              </div>
              <p class="cockpit-sub">
                Part: <strong>{{ wo.partNumber }}</strong> &bull; Batch: <strong>{{ wo.batchNumber }}</strong> &bull; {{ wo.description }}
              </p>
              <p class="cockpit-client" *ngIf="wo.customerName">
                Customer: <span>{{ wo.customerName }}</span>
              </p>
            </div>
            <div class="cockpit-actions">
              <button
                *ngIf="wo.status === WorkOrderStatus.Draft || wo.status === WorkOrderStatus.Scheduled"
                ar-button="primary"
                (click)="releaseToShopFloor()"
              >
                Release to Floor
              </button>
              <button
                *ngIf="wo.status === WorkOrderStatus.InProgress"
                ar-button="primary"
                (click)="openCompleteWo()"
              >
                Inward Finished Goods
              </button>
            </div>
          </div>

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
              class="cockpit-tab-btn"
              [class.active]="activeTab() === 'routing'"
              (click)="activeTab.set('routing')"
            >
              Shop Floor Routing Steps ({{ wo.routingSteps.length }})
            </button>
            <button
              class="cockpit-tab-btn"
              [class.active]="activeTab() === 'materials'"
              (click)="activeTab.set('materials')"
            >
              Material Issues & BOM ({{ wo.materialIssues.length }})
            </button>
          </div>

          <!-- Tab 1: Routing Steps -->
          <div class="cockpit-tab-content" *ngIf="activeTab() === 'routing'">
            <div class="table-responsive">
              <table class="sub-table">
                <thead>
                  <tr>
                    <th>Seq</th>
                    <th>Stage</th>
                    <th>Work Center</th>
                    <th>Est / Act Hrs</th>
                    <th>QC Inspection</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let step of wo.routingSteps">
                    <td>#{{ step.stepSequence }}</td>
                    <td>
                      <span class="routing-stage-pill">{{ getStageLabel(step.stage) }}</span>
                    </td>
                    <td>
                      <div class="wc-name">{{ step.workCenterName }}</div>
                      <div class="wc-inspector" *ngIf="step.inspectedBy">By: {{ step.inspectedBy }}</div>
                    </td>
                    <td>
                      <span>{{ step.actualHours || 0 }} / {{ step.estimatedHours }}h</span>
                    </td>
                    <td>
                      <ar-chip [tone]="step.qcPassed ? 'good' : (step.isCompleted ? 'warn' : 'neutral')">
                        {{ step.qcPassed ? 'QC Passed' : (step.isCompleted ? 'Inspection Done' : 'Pending') }}
                      </ar-chip>
                    </td>
                    <td>
                      <button
                        *ngIf="!step.isCompleted && wo.status === WorkOrderStatus.InProgress"
                        ar-button="ghost"
                        class="btn-xs"
                        (click)="openCompleteStep(step)"
                      >
                        Complete Step
                      </button>
                      <span *ngIf="step.isCompleted" class="text-muted-check">&#10003; Done</span>
                    </td>
                  </tr>
                  <tr *ngIf="!wo.routingSteps || wo.routingSteps.length === 0">
                    <td colspan="6" class="text-center text-muted">No routing steps defined for this work order.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Tab 2: Material Issues -->
          <div class="cockpit-tab-content" *ngIf="activeTab() === 'materials'">
            <div class="materials-header">
              <span class="section-hint">Required BOM components allocated to this batch.</span>
              <button
                *ngIf="wo.status === WorkOrderStatus.InProgress || wo.status === WorkOrderStatus.Scheduled"
                ar-button="ghost"
                (click)="openIssueMaterial()"
              >
                + Issue Material
              </button>
            </div>

            <div class="table-responsive">
              <table class="sub-table">
                <thead>
                  <tr>
                    <th>Part #</th>
                    <th>Description</th>
                    <th>Req Qty</th>
                    <th>Issued Qty</th>
                    <th>Scrap</th>
                    <th>Warehouse</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let m of wo.materialIssues">
                    <td class="fw-bold">{{ m.componentPartNumber }}</td>
                    <td>{{ m.componentDescription }}</td>
                    <td>{{ m.requiredQuantity }} {{ m.unitOfMeasure }}</td>
                    <td [class.text-success]="m.issuedQuantity >= m.requiredQuantity">
                      {{ m.issuedQuantity }} {{ m.unitOfMeasure }}
                    </td>
                    <td class="text-danger">{{ m.wastedQuantity }}</td>
                    <td>
                      <span class="wh-tag">{{ m.issuedFromWarehouse || 'Main Store' }}</span>
                    </td>
                  </tr>
                  <tr *ngIf="!wo.materialIssues || wo.materialIssues.length === 0">
                    <td colspan="6" class="text-center text-muted">No material issues recorded yet. Click '+ Issue Material' to allocate parts.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- Create Work Order Dialog -->
    <ar-dialog
      *ngIf="isCreateOpen()"
      title="Create Production Work Order"
      (dismiss)="isCreateOpen.set(false)"
    >
      <div class="modal-body-container">
        <div class="form-grid">
          <div class="form-group">
            <label>Work Order Number</label>
            <input type="text" class="form-control" [(ngModel)]="newWo.workOrderNumber" />
          </div>
          <div class="form-group">
            <label>Batch Number</label>
            <input type="text" class="form-control" [(ngModel)]="newWo.batchNumber" placeholder="BAT-2026-..." />
          </div>
          <div class="form-group">
            <label>Finished Good Part #</label>
            <input type="text" class="form-control" [(ngModel)]="newWo.partNumber" placeholder="HV-400-P" />
          </div>
          <div class="form-group">
            <label>Part Description</label>
            <input type="text" class="form-control" [(ngModel)]="newWo.description" placeholder="Proportional Directional Hydraulic..." />
          </div>
          <div class="form-group">
            <label>Planned Production Quantity</label>
            <input type="number" class="form-control" [(ngModel)]="newWo.plannedQuantity" />
          </div>
          <div class="form-group">
            <label>Assigned Supervisor</label>
            <input type="text" class="form-control" [(ngModel)]="newWo.assignedSupervisor" placeholder="Shop Lead Name" />
          </div>
          <div class="form-group">
            <label>Planned Start Date</label>
            <input type="date" class="form-control" [(ngModel)]="newWo.plannedStartDateUtc" />
          </div>
          <div class="form-group">
            <label>Planned End Date</label>
            <input type="date" class="form-control" [(ngModel)]="newWo.plannedEndDateUtc" />
          </div>
        </div>

        <div class="form-group full-width mt-3">
          <label>Production Notes & Instructions</label>
          <textarea class="form-control" rows="2" [(ngModel)]="newWo.remarks" placeholder="Special heat treatment or tolerances..."></textarea>
        </div>

        <div class="dialog-actions mt-4">
          <button ar-button="primary" (click)="createWorkOrder()">Generate Work Order</button>
          <button ar-button="ghost" (click)="isCreateOpen.set(false)">Cancel</button>
        </div>
      </div>
    </ar-dialog>

    <!-- Issue Material Dialog -->
    <ar-dialog
      *ngIf="isIssueMaterialOpen()"
      title="Issue Material to Work Order"
      (dismiss)="isIssueMaterialOpen.set(false)"
    >
      <div class="modal-body-container">
        <div class="form-grid">
          <div class="form-group">
            <label>Component Part #</label>
            <input type="text" class="form-control" [(ngModel)]="newMaterial.componentPartNumber" placeholder="VB-BODY-400" />
          </div>
          <div class="form-group">
            <label>Component Description</label>
            <input type="text" class="form-control" [(ngModel)]="newMaterial.componentDescription" placeholder="Ductile Iron Casting..." />
          </div>
          <div class="form-group">
            <label>Required Qty</label>
            <input type="number" class="form-control" [(ngModel)]="newMaterial.requiredQuantity" />
          </div>
          <div class="form-group">
            <label>Issued Qty</label>
            <input type="number" class="form-control" [(ngModel)]="newMaterial.issuedQuantity" />
          </div>
          <div class="form-group">
            <label>Wasted / Scrap Qty</label>
            <input type="number" class="form-control" [(ngModel)]="newMaterial.wastedQuantity" />
          </div>
          <div class="form-group">
            <label>Issuing Warehouse</label>
            <input type="text" class="form-control" [(ngModel)]="newMaterial.issuedFromWarehouse" placeholder="WH-MAIN-RAW" />
          </div>
        </div>

        <div class="dialog-actions mt-4">
          <button ar-button="primary" (click)="issueMaterial()">Issue to Shop Floor</button>
          <button ar-button="ghost" (click)="isIssueMaterialOpen.set(false)">Cancel</button>
        </div>
      </div>
    </ar-dialog>

    <!-- Complete Step & QC Inspection Dialog -->
    <ar-dialog
      *ngIf="isCompleteStepOpen()"
      title="Complete Routing Step & QC Inspection"
      (dismiss)="isCompleteStepOpen.set(false)"
    >
      <div class="modal-body-container" *ngIf="targetStep() as step">
        <p class="mb-3">
          Completing step <strong>#{{ step.stepSequence }} - {{ getStageLabel(step.stage) }}</strong> at <em>{{ step.workCenterName }}</em>.
        </p>

        <div class="form-grid">
          <div class="form-group">
            <label>Actual Machine / Labor Hours</label>
            <input type="number" class="form-control" [(ngModel)]="stepCompletion.actualHours" />
          </div>
          <div class="form-group">
            <label>Quality Inspector Name</label>
            <input type="text" class="form-control" [(ngModel)]="stepCompletion.inspectedBy" />
          </div>
        </div>

        <div class="form-check mt-3">
          <label class="checkbox-label">
            <input type="checkbox" [(ngModel)]="stepCompletion.qcPassed" />
            <span>Step passed QC tolerance and met drawing specifications</span>
          </label>
        </div>

        <div class="dialog-actions mt-4">
          <button ar-button="primary" (click)="completeStep()">Confirm Step Completion</button>
          <button ar-button="ghost" (click)="isCompleteStepOpen.set(false)">Cancel</button>
        </div>
      </div>
    </ar-dialog>

    <!-- Complete Work Order & Inward Finished Goods Dialog -->
    <ar-dialog
      *ngIf="isCompleteWoOpen()"
      title="Complete Work Order & Inward FG"
      (dismiss)="isCompleteWoOpen.set(false)"
    >
      <div class="modal-body-container" *ngIf="selectedWo() as wo">
        <p class="mb-3">
          Batch <strong>{{ wo.batchNumber }}</strong> for part <strong>{{ wo.partNumber }}</strong>. Planned: {{ wo.plannedQuantity }} units.
        </p>

        <div class="form-grid">
          <div class="form-group">
            <label>Final Produced Good Quantity</label>
            <input type="number" class="form-control" [(ngModel)]="woCompletion.producedQuantity" />
          </div>
          <div class="form-group">
            <label>Total Scrapped / Rejected Quantity</label>
            <input type="number" class="form-control" [(ngModel)]="woCompletion.scrappedQuantity" />
          </div>
          <div class="form-group full-width">
            <label>Finished Goods Storage Warehouse & Rack</label>
            <input type="text" class="form-control" [(ngModel)]="woCompletion.destinationLocation" placeholder="WH-FG-MAIN-BAY4" />
          </div>
          <div class="form-group full-width">
            <label>Completion Remarks</label>
            <textarea class="form-control" rows="2" [(ngModel)]="woCompletion.remarks"></textarea>
          </div>
        </div>

        <div class="dialog-actions mt-4">
          <button ar-button="primary" (click)="completeWorkOrder()">Complete Order & Update Inventory</button>
          <button ar-button="ghost" (click)="isCompleteWoOpen.set(false)">Cancel</button>
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

        &.amber { border-left: 4px solid #f59e0b; }
        &.teal { border-left: 4px solid #0d9488; }

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

      .work-order-layout {
        display: grid;
        grid-template-columns: 1fr 1.1fr;
        gap: 1.5rem;
        align-items: start;

        @media (max-width: 1200px) {
          grid-template-columns: 1fr;
        }
      }

      .table-card {
        background: var(--ar-surface, #ffffff);
        border: 1px solid var(--ar-border, #e2e8f0);
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      }

      .data-table {
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
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--ar-border, #f1f5f9);
          vertical-align: middle;
        }

        .clickable-row {
          cursor: pointer;
          transition: background 0.15s ease;

          &:hover {
            background: #f8fafc;
          }

          &.selected-row {
            background: #f0fdf4;
            border-left: 3px solid #10b981;
          }
        }
      }

      .wo-ref {
        display: flex;
        flex-direction: column;

        .text-sub {
          font-size: 0.75rem;
          color: #64748b;
        }
      }

      .part-info {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;

        .part-code {
          font-weight: 600;
          color: #1e293b;
        }

        .part-name {
          font-size: 0.78rem;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 180px;
        }

        .batch-badge {
          font-size: 0.72rem;
          color: #0369a1;
          background: #e0f2fe;
          padding: 1px 5px;
          border-radius: 3px;
          width: fit-content;
        }
      }

      .qty-progress {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;

        .qty-numbers {
          font-size: 0.8rem;
          font-weight: 600;
        }

        .progress-bar-bg {
          width: 80px;
          height: 6px;
          background: #e2e8f0;
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: #10b981;
          border-radius: 3px;
        }
      }

      .stage-tag {
        font-size: 0.75rem;
        background: #f1f5f9;
        color: #334155;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 500;
      }

      .empty-cell {
        text-align: center;
        padding: 2.5rem 1rem;
        color: #94a3b8;
      }

      .detail-cockpit {
        background: var(--ar-surface, #ffffff);
        border: 1px solid var(--ar-border, #e2e8f0);
        border-radius: 8px;
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      }

      .cockpit-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 1px solid #f1f5f9;
        padding-bottom: 1rem;

        .cockpit-title-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;

          h3 {
            margin: 0;
            font-size: 1.25rem;
            color: #0f172a;
          }
        }

        .cockpit-sub {
          margin: 0.35rem 0 0 0;
          font-size: 0.85rem;
          color: #475569;
        }

        .cockpit-client {
          margin: 0.25rem 0 0 0;
          font-size: 0.8rem;
          color: #64748b;

          span {
            font-weight: 600;
            color: #0f172a;
          }
        }

        .cockpit-actions {
          display: flex;
          gap: 0.5rem;
        }
      }

      .cockpit-metrics {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
        gap: 0.75rem;
        background: #f8fafc;
        padding: 0.85rem;
        border-radius: 6px;

        .metric-item {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;

          .lbl {
            font-size: 0.7rem;
            text-transform: uppercase;
            color: #64748b;
            font-weight: 600;
          }

          .val {
            font-size: 1.1rem;
            font-weight: 700;

            &.val-success { color: #16a34a; }
            &.val-danger { color: #dc2626; }
            &.val-stage { color: #0284c7; font-size: 0.95rem; }
          }

          .val-text {
            font-size: 0.85rem;
            color: #1e293b;
            font-weight: 500;
          }
        }
      }

      .cockpit-tabs {
        display: flex;
        gap: 0.5rem;
        border-bottom: 1px solid #e2e8f0;

        .cockpit-tab-btn {
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
          font-weight: 600;
          border: none;
          background: transparent;
          cursor: pointer;
          color: #64748b;
          border-bottom: 2px solid transparent;

          &.active {
            color: #0f172a;
            border-bottom-color: #0284c7;
          }
        }
      }

      .sub-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8rem;

        th {
          background: #f8fafc;
          padding: 0.5rem 0.75rem;
          text-align: left;
          color: #475569;
          font-weight: 600;
          border-bottom: 1px solid #e2e8f0;
        }

        td {
          padding: 0.6rem 0.75rem;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }
      }

      .routing-stage-pill {
        background: #f1f5f9;
        color: #1e293b;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 500;
      }

      .wc-name {
        font-weight: 600;
      }

      .wc-inspector {
        font-size: 0.7rem;
        color: #64748b;
      }

      .materials-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;

        .section-hint {
          font-size: 0.8rem;
          color: #64748b;
        }
      }

      .wh-tag {
        font-size: 0.72rem;
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        padding: 1px 4px;
        border-radius: 3px;
      }

      .text-muted-check {
        color: #16a34a;
        font-weight: 600;
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

        &.full-width {
          grid-column: 1 / -1;
        }

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

      .checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.85rem;
        cursor: pointer;
      }

      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
      }

      .fw-bold { font-weight: 600; }
      .text-success { color: #16a34a; }
      .text-danger { color: #dc2626; }
      .text-muted { color: #94a3b8; }
      .text-center { text-align: center; }
      .mt-3 { margin-top: 0.75rem; }
      .mt-4 { margin-top: 1rem; }
      .mb-3 { margin-bottom: 0.75rem; }
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

    return this.workOrders().filter(wo => {
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
    const inProgress = list.filter(w => w.status === WorkOrderStatus.InProgress || w.status === WorkOrderStatus.Scheduled).length;
    const completed = list.filter(w => w.status === WorkOrderStatus.Completed).length;
    const totalPlanned = list.reduce((acc, w) => acc + (w.plannedQuantity || 0), 0);
    const totalProduced = list.reduce((acc, w) => acc + (w.producedQuantity || 0), 0);
    const totalScrapped = list.reduce((acc, w) => acc + (w.scrappedQuantity || 0), 0);

    const scrapRate = totalProduced + totalScrapped > 0
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
    this.workOrderService
      .getList({ maxResultCount: 100 })
      .subscribe({
        next: res => {
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
        next: created => {
          this.workOrders.update(list => [created, ...list]);
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

    this.workOrders.update(list => [created, ...list]);
    this.selectedWo.set(created);
    this.isCreateOpen.set(false);
  }

  releaseToShopFloor(): void {
    const sel = this.selectedWo();
    if (!sel) return;

    if (!environment.useMockData && sel.id) {
      this.workOrderService.release(sel.id).subscribe({
        next: updated => {
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
        next: updated => {
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
        next: updated => {
          this.updateWoInState(updated);
          this.isCompleteStepOpen.set(false);
        },
      });
      return;
    }

    const updatedSteps = (sel.routingSteps || []).map(s => {
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

    const nextIncomplete = updatedSteps.find(s => !s.isCompleted);
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
        next: updated => {
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
    this.workOrders.update(list => list.map(w => (w.id === updated.id ? updated : w)));
    this.selectedWo.set(updated);
  }
}
