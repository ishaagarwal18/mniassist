import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../core/ui/toast.service';
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
import {
  ArButton,
  ArCard,
  ArChip,
  ArDialog,
  ArGrid,
  ArIcon,
  ArMeter,
  ArStatTile,
  ArTabs,
  ChipTone,
} from '../../../ui';
import { GridModule, RecordClickEventArgs } from '@syncfusion/ej2-angular-grids';

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

const STATUS_FILTERS: { value: WorkOrderStatus | null; label: string }[] = [
  { value: null, label: 'All' },
  { value: WorkOrderStatus.Draft, label: 'Draft' },
  { value: WorkOrderStatus.Scheduled, label: 'Scheduled' },
  { value: WorkOrderStatus.InProgress, label: 'In production' },
  { value: WorkOrderStatus.QualityHold, label: 'Quality hold' },
  { value: WorkOrderStatus.Completed, label: 'Completed' },
];

const DETAIL_TABS = ['Routing', 'Materials'] as const;

/** Produced as a share of planned, 0–100. */
export function progressPercent(
  wo: Pick<WorkOrderDto, 'plannedQuantity' | 'producedQuantity'>,
): number {
  return wo.plannedQuantity > 0
    ? Math.min(100, Math.round((100 * wo.producedQuantity) / wo.plannedQuantity))
    : 0;
}

const todayLocal = () => new Date().toLocaleDateString('en-CA');
const plusDaysLocal = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toLocaleDateString('en-CA');

/**
 * Work orders: production batches on the shop floor. The list shows every order with its progress; choosing one opens it below,
 * with its routing (each step to complete and pass QC) and the materials issued to it. Opened from a bill of materials
 * (?bomId=…&partNumber=…&description=…) it starts a new order for that BOM.
 */
@Component({
  selector: 'app-work-orders',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    ArTopbar,
    ArButton,
    ArCard,
    ArChip,
    ArDialog,
    ArIcon,
    ArMeter,
    ArStatTile,
    ArTabs,
    ArGrid,
    GridModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Work orders"
      subtitle="Production batches: routing, materials, QC and finished goods"
    >
      <button
        ar-button
        type="button"
        variant="ghost"
        icon="refresh"
        [disabled]="isLoading()"
        (click)="loadWorkOrders()"
      >
        Refresh
      </button>
      <a ar-button variant="primary" icon="plus" routerLink="/manufacturing/work-orders/new">
        New work order
      </a>
    </ar-topbar>

    <div class="wo ar-scroll" [attr.aria-busy]="isLoading()">
      @if (loadError(); as e) {
        <div class="wo__alert" role="alert">
          <ar-icon name="alert" [size]="16" />
          <span>{{ e }}</span>
          <button type="button" class="wo__link" (click)="loadWorkOrders()">Try again</button>
        </div>
      }

      <section class="wo__tiles" aria-label="Summary">
        <ar-stat-tile
          label="Work orders"
          [value]="stats().totalCount"
          [note]="stats().draft + ' in draft'"
        />
        <ar-stat-tile
          label="On the floor"
          [value]="stats().inProgress"
          tone="amber"
          [note]="stats().scheduled + ' more scheduled'"
        />
        <ar-stat-tile
          label="Completed"
          [value]="stats().completed"
          tone="good"
          [note]="stats().totalProduced + ' units made'"
        />
        <ar-stat-tile
          label="Scrap rate"
          [value]="stats().scrapRate + '%'"
          [tone]="+stats().scrapRate > 3 ? 'bad' : 'neutral'"
          [note]="stats().totalScrapped + ' units scrapped'"
        />
      </section>

      <ar-card>
        <div class="wo__toolbar">
          <input
            type="search"
            class="ar-field__input wo__search"
            aria-label="Search work orders"
            placeholder="Search order, part, batch or customer"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
          />
          <div class="wo__filters" role="radiogroup" aria-label="Status">
            @for (f of statusFilters; track f.label) {
              <button
                type="button"
                role="radio"
                class="wo__filter"
                [class.wo__filter--on]="statusFilter() === f.value"
                [attr.aria-checked]="statusFilter() === f.value"
                (click)="statusFilter.set(f.value)"
              >
                {{ f.label }} <span>{{ countFor(f.value) }}</span>
              </button>
            }
          </div>
        </div>

        @if (workOrders().length === 0 && !isLoading() && !loadError()) {
          <div class="wo__empty">
            <span class="wo__empty-icon"><ar-icon name="machine" [size]="24" /></span>
            <h2>No work orders yet</h2>
            <p>Create one for a production batch, or start it from a bill of materials.</p>
            <a ar-button variant="primary" icon="plus" routerLink="/manufacturing/work-orders/new">
              New work order
            </a>
          </div>
        } @else {
          <ejs-grid
            arGrid="work-orders"
            [dataSource]="filteredWorkOrders()"
            [allowSelection]="true"
            [selectionSettings]="{ mode: 'Row', type: 'Single' }"
            (recordClick)="onWoClick($event)"
            aria-label="Work orders"
          >
            <e-columns>
              <e-column field="workOrderNumber" headerText="Work order" width="160">
                <ng-template #template let-wo>
                  <div class="wo__ref">
                    <span class="ar-mono">{{ wo.workOrderNumber }}</span>
                    @if (wo.salesOrderNumber) {
                      <small>For {{ wo.salesOrderNumber }}</small>
                    }
                  </div>
                </ng-template>
              </e-column>
              <e-column field="partNumber" headerText="Part" width="260">
                <ng-template #template let-wo>
                  <div class="wo__part">
                    <span class="ar-mono">{{ wo.partNumber }}</span>
                    <small>{{ wo.description }}</small>
                  </div>
                </ng-template>
              </e-column>
              <e-column field="batchNumber" headerText="Batch" width="140">
                <ng-template #template let-wo>
                  <span class="ar-mono">{{ wo.batchNumber }}</span>
                </ng-template>
              </e-column>
              <e-column field="customerName" headerText="Customer" width="180">
                <ng-template #template let-wo>{{ wo.customerName || '—' }}</ng-template>
              </e-column>
              <e-column headerText="Progress" width="190">
                <ng-template #template let-wo>
                  <div class="wo__progress">
                    <ar-meter
                      [value]="progress(wo)"
                      [tone]="wo.status === WorkOrderStatus.Completed ? 'good' : 'teal'"
                      [thickness]="6"
                      [label]="wo.producedQuantity + ' of ' + wo.plannedQuantity + ' made'"
                    />
                    <span>{{ wo.producedQuantity }} / {{ wo.plannedQuantity }}</span>
                  </div>
                </ng-template>
              </e-column>
              <e-column field="currentStage" headerText="Stage" width="160">
                <ng-template #template let-wo>{{ getStageLabel(wo.currentStage) }}</ng-template>
              </e-column>
              <e-column field="status" headerText="Status" width="150">
                <ng-template #template let-wo>
                  <ar-chip
                    [tone]="getStatusTone(wo.status)"
                    [dot]="wo.status === WorkOrderStatus.InProgress"
                  >
                    {{ getStatusLabel(wo.status) }}
                  </ar-chip>
                </ng-template>
              </e-column>
              <e-column field="plannedEndDateUtc" headerText="Due" width="120">
                <ng-template #template let-wo>
                  <span [class.wo__late]="isLate(wo)">{{ formatDate(wo.plannedEndDateUtc) }}</span>
                </ng-template>
              </e-column>
            </e-columns>
          </ejs-grid>
          @if (!selectedWo() && filteredWorkOrders().length) {
            <p class="wo__hint">Choose a work order to see its routing and materials.</p>
          }
        }
      </ar-card>

      @if (selectedWo(); as wo) {
        <ar-card class="wo__detail">
          <header class="wo__head">
            <div class="wo__head-main">
              <div class="wo__title">
                <h2 class="ar-mono">{{ wo.workOrderNumber }}</h2>
                <ar-chip
                  [tone]="getStatusTone(wo.status)"
                  [dot]="wo.status === WorkOrderStatus.InProgress"
                >
                  {{ getStatusLabel(wo.status) }}
                </ar-chip>
              </div>
              <p>
                <span class="ar-mono">{{ wo.partNumber }}</span> · {{ wo.description }} · Batch
                <span class="ar-mono">{{ wo.batchNumber }}</span>
              </p>
              @if (wo.customerName || wo.bomNumber) {
                <p class="wo__muted">
                  @if (wo.customerName) {
                    Customer {{ wo.customerName }}
                  }
                  @if (wo.customerName && wo.bomNumber) {
                    ·
                  }
                  @if (wo.bomNumber) {
                    BOM <span class="ar-mono">{{ wo.bomNumber }}</span>
                  }
                </p>
              }
            </div>
            <div class="wo__head-actions">
              @if (wo.status === WorkOrderStatus.Draft || wo.status === WorkOrderStatus.Scheduled) {
                <button
                  ar-button
                  type="button"
                  variant="primary"
                  [disabled]="busy()"
                  (click)="releaseToShopFloor()"
                >
                  Release to the floor
                </button>
              }
              @if (wo.status === WorkOrderStatus.InProgress) {
                <button
                  ar-button
                  type="button"
                  variant="primary"
                  [disabled]="busy()"
                  (click)="openCompleteWo()"
                >
                  Complete and receive goods
                </button>
              }
              <button
                type="button"
                class="wo__close"
                aria-label="Close work order"
                title="Close"
                (click)="selectedWo.set(null)"
              >
                <ar-icon name="close" [size]="16" />
              </button>
            </div>
          </header>

          <dl class="wo__facts">
            <div>
              <dt>Planned</dt>
              <dd>{{ wo.plannedQuantity }}</dd>
            </div>
            <div>
              <dt>Made</dt>
              <dd class="wo__good">{{ wo.producedQuantity }}</dd>
            </div>
            <div>
              <dt>Scrapped</dt>
              <dd [class.wo__bad]="wo.scrappedQuantity > 0">{{ wo.scrappedQuantity }}</dd>
            </div>
            <div>
              <dt>Stage</dt>
              <dd>{{ getStageLabel(wo.currentStage) }}</dd>
            </div>
            <div>
              <dt>Planned dates</dt>
              <dd>
                {{ formatDate(wo.plannedStartDateUtc) }} – {{ formatDate(wo.plannedEndDateUtc) }}
              </dd>
            </div>
            <div>
              <dt>Supervisor</dt>
              <dd>{{ wo.assignedSupervisor || 'Not assigned' }}</dd>
            </div>
          </dl>
          <div class="wo__bar">
            <ar-meter
              [value]="progress(wo)"
              [tone]="wo.status === WorkOrderStatus.Completed ? 'good' : 'teal'"
              [thickness]="8"
              [label]="progress(wo) + '% made'"
            />
            <span
              >{{ progress(wo) }}% made · {{ stepsDone(wo) }} of {{ wo.routingSteps.length }} steps
              done</span
            >
          </div>

          <ar-tabs
            [tabs]="detailTabs"
            [active]="activeTab()"
            (activeChange)="activeTab.set($any($event))"
          />

          @if (activeTab() === 'Routing') {
            @if (wo.routingSteps.length) {
              <ol class="wo__steps">
                @for (step of sortedSteps(wo); track step.id; let last = $last) {
                  <li
                    class="wo__step"
                    [class.wo__step--done]="step.isCompleted"
                    [class.wo__step--current]="!step.isCompleted && step.stage === wo.currentStage"
                  >
                    <span class="wo__dot" aria-hidden="true">
                      @if (step.isCompleted) {
                        <ar-icon name="check" [size]="12" />
                      } @else {
                        {{ step.stepSequence }}
                      }
                    </span>
                    @if (!last) {
                      <span class="wo__line" aria-hidden="true"></span>
                    }
                    <div class="wo__step-body">
                      <div class="wo__step-top">
                        <strong>{{ getStageLabel(step.stage) }}</strong>
                        <span class="wo__muted">{{ step.workCenterName }}</span>
                      </div>
                      <div class="wo__step-meta">
                        <span>{{ step.actualHours || 0 }} of {{ step.estimatedHours }} h</span>
                        @if (step.isCompleted) {
                          <ar-chip [tone]="step.qcPassed ? 'good' : 'warn'">
                            {{ step.qcPassed ? 'QC passed' : 'QC not passed' }}
                          </ar-chip>
                          @if (step.inspectedBy) {
                            <span class="wo__muted">Checked by {{ step.inspectedBy }}</span>
                          }
                          @if (step.completedAtUtc) {
                            <span class="wo__muted">{{ formatDate(step.completedAtUtc) }}</span>
                          }
                        } @else {
                          <span class="wo__muted">Not done yet</span>
                        }
                      </div>
                    </div>
                    @if (!step.isCompleted && wo.status === WorkOrderStatus.InProgress) {
                      <button
                        ar-button
                        type="button"
                        variant="ghost"
                        (click)="openCompleteStep(step)"
                      >
                        Complete step
                      </button>
                    }
                  </li>
                }
              </ol>
              @if (wo.status === WorkOrderStatus.Draft || wo.status === WorkOrderStatus.Scheduled) {
                <p class="wo__hint">Release the order to the floor to start completing steps.</p>
              }
            } @else {
              <p class="wo__muted wo__pad">This order has no routing steps.</p>
            }
          } @else {
            <div class="wo__mat-head">
              <span class="wo__muted">Components issued from stores to this batch.</span>
              @if (
                wo.status === WorkOrderStatus.InProgress || wo.status === WorkOrderStatus.Scheduled
              ) {
                <button
                  ar-button
                  type="button"
                  variant="ghost"
                  icon="plus"
                  (click)="openIssueMaterial()"
                >
                  Issue material
                </button>
              }
            </div>
            @if (wo.materialIssues.length) {
              <ejs-grid
                arGrid="work-order-material-issues"
                [dataSource]="wo.materialIssues"
                aria-label="Materials issued"
              >
                <e-columns>
                  <e-column field="componentPartNumber" headerText="Part" width="150">
                    <ng-template #template let-m>
                      <span class="ar-mono">{{ m.componentPartNumber }}</span>
                    </ng-template>
                  </e-column>
                  <e-column field="componentDescription" headerText="Description" width="240" />
                  <e-column headerText="Needed" width="110" textAlign="Right">
                    <ng-template #template let-m
                      >{{ m.requiredQuantity }} {{ m.unitOfMeasure }}</ng-template
                    >
                  </e-column>
                  <e-column headerText="Issued" width="110" textAlign="Right">
                    <ng-template #template let-m>
                      <span [class.wo__good]="m.issuedQuantity >= m.requiredQuantity">
                        {{ m.issuedQuantity }} {{ m.unitOfMeasure }}
                      </span>
                    </ng-template>
                  </e-column>
                  <e-column field="wastedQuantity" headerText="Scrap" width="90" textAlign="Right">
                    <ng-template #template let-m>
                      <span [class.wo__bad]="m.wastedQuantity > 0">{{ m.wastedQuantity }}</span>
                    </ng-template>
                  </e-column>
                  <e-column field="issuedFromWarehouse" headerText="From" width="150">
                    <ng-template #template let-m>{{ m.issuedFromWarehouse || '—' }}</ng-template>
                  </e-column>
                </e-columns>
              </ejs-grid>
            } @else {
              <p class="wo__muted wo__pad">No material has been issued to this order yet.</p>
            }
          }

          @if (wo.remarks) {
            <p class="wo__remarks"><strong>Notes</strong> {{ wo.remarks }}</p>
          }
        </ar-card>
      }
    </div>

    <!-- Issue material -->
    @if (isIssueMaterialOpen()) {
      <ar-dialog
        title="Issue material"
        width="min(640px, calc(100vw - 32px))"
        (dismiss)="isIssueMaterialOpen.set(false)"
      >
        <div class="wo__form">
          <label class="ar-field">
            <span class="ar-field__label">Component part <span class="ar-field__req">*</span></span>
            <input
              class="ar-field__input ar-mono"
              [(ngModel)]="newMaterial.componentPartNumber"
              placeholder="e.g. VB-BODY-400"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Description <span class="ar-field__req">*</span></span>
            <input
              class="ar-field__input"
              [(ngModel)]="newMaterial.componentDescription"
              placeholder="e.g. Ductile iron casting"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Quantity needed</span>
            <input
              type="number"
              min="0"
              class="ar-field__input"
              [(ngModel)]="newMaterial.requiredQuantity"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Quantity issued</span>
            <input
              type="number"
              min="0"
              class="ar-field__input"
              [(ngModel)]="newMaterial.issuedQuantity"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Scrap</span>
            <input
              type="number"
              min="0"
              class="ar-field__input"
              [(ngModel)]="newMaterial.wastedQuantity"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Unit</span>
            <input
              class="ar-field__input"
              [(ngModel)]="newMaterial.unitOfMeasure"
              placeholder="NOS"
            />
          </label>
          <label class="ar-field wo__wide">
            <span class="ar-field__label"
              >Issued from <span class="ar-field__opt">optional</span></span
            >
            <input
              class="ar-field__input"
              [(ngModel)]="newMaterial.issuedFromWarehouse"
              placeholder="Store or warehouse"
            />
          </label>
          @if (formError(); as e) {
            <p class="wo__form-error wo__wide" role="alert">{{ e }}</p>
          }
        </div>
        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="isIssueMaterialOpen.set(false)">
            Cancel
          </button>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy()"
            (click)="issueMaterial()"
          >
            Issue material
          </button>
        </div>
      </ar-dialog>
    }

    <!-- Complete a step -->
    @if (isCompleteStepOpen()) {
      <ar-dialog
        title="Complete step"
        width="min(560px, calc(100vw - 32px))"
        (dismiss)="isCompleteStepOpen.set(false)"
      >
        @if (targetStep(); as step) {
          <div class="wo__form">
            <p class="wo__muted wo__wide">
              Step {{ step.stepSequence }}, {{ getStageLabel(step.stage) }}, at
              {{ step.workCenterName }}.
            </p>
            <label class="ar-field">
              <span class="ar-field__label">Hours taken</span>
              <input
                type="number"
                min="0"
                step="0.5"
                class="ar-field__input"
                [(ngModel)]="stepCompletion.actualHours"
              />
            </label>
            <label class="ar-field">
              <span class="ar-field__label"
                >Checked by <span class="ar-field__opt">optional</span></span
              >
              <input
                class="ar-field__input"
                [(ngModel)]="stepCompletion.inspectedBy"
                placeholder="QC inspector"
              />
            </label>
            <label class="wo__check wo__wide">
              <input type="checkbox" [(ngModel)]="stepCompletion.qcPassed" />
              <span>Passed QC: within tolerance and to drawing</span>
            </label>
          </div>
        }
        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="isCompleteStepOpen.set(false)">
            Cancel
          </button>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy()"
            (click)="completeStep()"
          >
            Complete step
          </button>
        </div>
      </ar-dialog>
    }

    <!-- Complete the order -->
    @if (isCompleteWoOpen()) {
      <ar-dialog
        title="Complete and receive goods"
        width="min(600px, calc(100vw - 32px))"
        (dismiss)="isCompleteWoOpen.set(false)"
      >
        @if (selectedWo(); as wo) {
          <div class="wo__form">
            <p class="wo__muted wo__wide">
              Batch {{ wo.batchNumber }} of {{ wo.partNumber }}: {{ wo.plannedQuantity }} planned.
              The good quantity goes into stock.
            </p>
            <label class="ar-field">
              <span class="ar-field__label">Good quantity made</span>
              <input
                type="number"
                min="0"
                class="ar-field__input"
                [(ngModel)]="woCompletion.producedQuantity"
              />
            </label>
            <label class="ar-field">
              <span class="ar-field__label">Scrapped or rejected</span>
              <input
                type="number"
                min="0"
                class="ar-field__input"
                [(ngModel)]="woCompletion.scrappedQuantity"
              />
            </label>
            <label class="ar-field wo__wide">
              <span class="ar-field__label"
                >Store in <span class="ar-field__opt">optional</span></span
              >
              <input
                class="ar-field__input"
                [(ngModel)]="woCompletion.destinationLocation"
                placeholder="Warehouse and rack"
              />
            </label>
            <label class="ar-field wo__wide">
              <span class="ar-field__label">Notes <span class="ar-field__opt">optional</span></span>
              <textarea
                class="ar-field__input"
                rows="2"
                [(ngModel)]="woCompletion.remarks"
              ></textarea>
            </label>
          </div>
        }
        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="isCompleteWoOpen.set(false)">
            Cancel
          </button>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy()"
            (click)="completeWorkOrder()"
          >
            Complete and update stock
          </button>
        </div>
      </ar-dialog>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }
    .wo {
      flex: 1;
      min-height: 0;
      padding: 18px 24px 32px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .wo ar-card {
      display: block;
      min-width: 0;
    }
    .wo__alert {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: var(--ar-red-100);
      border: 1px solid var(--ar-red-200);
      border-radius: var(--ar-radius-control);
      color: var(--ar-bad-600);
      font: 500 13px var(--ar-font-sans);
    }
    .wo__alert .wo__link {
      margin-left: auto;
      color: var(--ar-bad-600);
    }
    .wo__link {
      padding: 0;
      background: none;
      border: 0;
      cursor: pointer;
      font: 600 12.5px var(--ar-font-sans);
      color: var(--ar-blue-600);
      text-decoration: underline;
    }
    .wo__tiles {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    }

    .wo__toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 14px;
      align-items: center;
      margin-bottom: 12px;
    }
    .wo__search {
      flex: 1 1 260px;
      min-width: 0;
    }
    .wo__filters {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .wo__filter {
      padding: 5px 12px;
      border: 1px solid var(--ar-line-300);
      border-radius: 999px;
      background: var(--ar-white);
      cursor: pointer;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .wo__filter span {
      margin-left: 4px;
      color: var(--ar-ink-400);
      font-variant-numeric: tabular-nums;
    }
    .wo__filter--on {
      background: var(--ar-blue-100);
      border-color: var(--ar-blue-200);
      color: var(--ar-blue-700);
      font-weight: 600;
    }
    .wo__filter--on span {
      color: var(--ar-blue-700);
    }

    .wo__ref,
    .wo__part {
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
    }
    .wo__ref small,
    .wo__part small {
      font: 400 11.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .wo__progress {
      display: grid;
      grid-template-columns: minmax(60px, 1fr) auto;
      gap: 8px;
      align-items: center;
      font: 500 12px var(--ar-font-sans);
      font-variant-numeric: tabular-nums;
      color: var(--ar-ink-700);
    }
    .wo__late {
      color: var(--ar-bad-600);
      font-weight: 600;
    }
    .wo__hint {
      margin: 12px 0 0;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .wo__muted {
      margin: 0;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .wo__pad {
      padding: 16px 0 4px;
    }
    .wo__good {
      color: var(--ar-good-700);
    }
    .wo__bad {
      color: var(--ar-bad-600);
    }

    .wo__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 36px 16px;
      text-align: center;
    }
    .wo__empty-icon {
      width: 48px;
      height: 48px;
      display: grid;
      place-items: center;
      border-radius: 12px;
      background: var(--ar-blue-100);
      color: var(--ar-blue-700);
    }
    .wo__empty h2 {
      margin: 4px 0 0;
      font: 600 15px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .wo__empty p {
      margin: 0 0 6px;
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }

    /* Detail */
    .wo__head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
    }
    .wo__head-main {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .wo__head-main p {
      margin: 0;
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .wo__title {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .wo__title h2 {
      margin: 0;
      font-size: 17px;
      font-weight: 600;
      color: var(--ar-ink-900);
    }
    .wo__head-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .wo__close {
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      border: 0;
      border-radius: var(--ar-radius-control);
      background: none;
      cursor: pointer;
      color: var(--ar-ink-500);
    }
    .wo__close:hover {
      background: var(--ar-bg-100);
      color: var(--ar-ink-900);
    }
    .wo__facts {
      margin: 16px 0 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px;
    }
    .wo__facts > div {
      padding: 10px 12px;
      border: 1px solid var(--ar-line-100);
      border-radius: var(--ar-radius-control);
      background: var(--ar-bg-50);
    }
    .wo__facts dt {
      font: 400 11.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .wo__facts dd {
      margin: 3px 0 0;
      font: 600 14px var(--ar-font-sans);
      color: var(--ar-ink-900);
      font-variant-numeric: tabular-nums;
    }
    .wo__facts dd.wo__good {
      color: var(--ar-good-700);
    }
    .wo__facts dd.wo__bad {
      color: var(--ar-bad-600);
    }
    .wo__bar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
      align-items: center;
      margin: 14px 0 16px;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-600);
    }

    .wo__steps {
      list-style: none;
      margin: 14px 0 0;
      padding: 0;
    }
    .wo__step {
      position: relative;
      display: grid;
      grid-template-columns: 28px minmax(0, 1fr) auto;
      gap: 12px;
      align-items: start;
      padding-bottom: 18px;
    }
    .wo__dot {
      position: relative;
      z-index: 1;
      width: 28px;
      height: 28px;
      display: grid;
      place-items: center;
      border-radius: 999px;
      border: 2px solid var(--ar-line-300);
      background: var(--ar-white);
      font: 700 10.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .wo__step--done .wo__dot {
      border-color: var(--ar-good-600);
      background: var(--ar-good-600);
      color: var(--ar-white);
    }
    .wo__step--current .wo__dot {
      border-color: var(--ar-amber-500);
      color: var(--ar-amber-700);
      background: var(--ar-amber-50);
    }
    .wo__line {
      position: absolute;
      top: 28px;
      bottom: 0;
      left: 13px;
      width: 2px;
      background: var(--ar-line-200);
    }
    .wo__step--done .wo__line {
      background: var(--ar-good-600);
    }
    .wo__step-body {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-top: 4px;
      min-width: 0;
    }
    .wo__step-top {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 10px;
      align-items: baseline;
      font: 400 13px var(--ar-font-sans);
    }
    .wo__step-top strong {
      font-weight: 600;
      color: var(--ar-ink-900);
    }
    .wo__step-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 12px;
      align-items: center;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-700);
      font-variant-numeric: tabular-nums;
    }
    .wo__mat-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin: 12px 0 10px;
    }
    .wo__remarks {
      margin: 16px 0 0;
      padding-top: 12px;
      border-top: 1px solid var(--ar-line-100);
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .wo__remarks strong {
      margin-right: 6px;
      color: var(--ar-ink-900);
    }

    /* Dialog forms */
    .wo__form {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px 14px;
    }
    .wo__form .ar-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .wo__wide {
      grid-column: 1 / -1;
    }
    .wo__check {
      display: flex;
      gap: 8px;
      align-items: center;
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-800);
      cursor: pointer;
    }
    .wo__note {
      margin: 0;
      padding: 8px 12px;
      border-radius: var(--ar-radius-control);
      background: var(--ar-blue-100);
      color: var(--ar-blue-700);
      font: 400 12.5px var(--ar-font-sans);
    }
    .wo__form-error {
      margin: 0;
      padding: 8px 12px;
      border-radius: var(--ar-radius-control);
      background: var(--ar-red-100);
      color: var(--ar-bad-600);
      font: 500 12.5px var(--ar-font-sans);
    }

    @media (max-width: 640px) {
      .wo {
        padding: 14px 16px 24px;
      }
      .wo__form {
        grid-template-columns: minmax(0, 1fr);
      }
      .wo__step {
        grid-template-columns: 28px minmax(0, 1fr);
      }
      .wo__step > button {
        grid-column: 2;
        justify-self: start;
      }
    }
  `,
})
export class WorkOrdersComponent {
  private readonly workOrderService = inject(WorkOrderService);
  private readonly toasts = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly WorkOrderStatus = WorkOrderStatus;
  readonly RoutingStage = RoutingStage;
  readonly statusFilters = STATUS_FILTERS;
  readonly detailTabs = DETAIL_TABS;

  readonly workOrders = signal<WorkOrderDto[]>([]);
  readonly selectedWo = signal<WorkOrderDto | null>(null);
  readonly isLoading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly busy = signal(false);
  readonly formError = signal<string | null>(null);
  readonly activeTab = signal<(typeof DETAIL_TABS)[number]>('Routing');

  readonly searchQuery = signal('');
  readonly statusFilter = signal<WorkOrderStatus | null>(null);

  readonly isIssueMaterialOpen = signal(false);
  readonly isCompleteStepOpen = signal(false);
  readonly isCompleteWoOpen = signal(false);
  readonly targetStep = signal<WorkOrderRoutingStepDto | null>(null);

  newMaterial: IssueMaterialToWorkOrderDto = this.blankMaterial();
  stepCompletion: CompleteRoutingStepDto = {
    stepId: '',
    actualHours: 0,
    inspectedBy: '',
    qcPassed: true,
  };
  woCompletion: CompleteWorkOrderDto = {
    producedQuantity: 0,
    scrappedQuantity: 0,
    destinationLocation: '',
    remarks: '',
  };

  readonly filteredWorkOrders = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const sf = this.statusFilter();
    return this.workOrders().filter((wo) => {
      if (sf !== null && wo.status !== sf) return false;
      if (!q) return true;
      return [wo.workOrderNumber, wo.partNumber, wo.description, wo.batchNumber, wo.customerName]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
  });

  readonly stats = computed(() => {
    const list = this.workOrders();
    const count = (s: WorkOrderStatus) => list.filter((w) => w.status === s).length;
    const totalProduced = list.reduce((acc, w) => acc + (w.producedQuantity || 0), 0);
    const totalScrapped = list.reduce((acc, w) => acc + (w.scrappedQuantity || 0), 0);
    return {
      totalCount: list.length,
      draft: count(WorkOrderStatus.Draft),
      scheduled: count(WorkOrderStatus.Scheduled),
      inProgress: count(WorkOrderStatus.InProgress),
      completed: count(WorkOrderStatus.Completed),
      totalProduced,
      totalScrapped,
      scrapRate:
        totalProduced + totalScrapped > 0
          ? ((totalScrapped / (totalProduced + totalScrapped)) * 100).toFixed(1)
          : '0.0',
    };
  });

  constructor() {
    this.loadWorkOrders();
    this.openFromBom();
  }

  loadWorkOrders(): void {
    if (environment.useMockData) {
      this.workOrders.set(MOCK_WORK_ORDERS);
      return;
    }
    this.isLoading.set(true);
    this.loadError.set(null);
    this.workOrderService.getList({ maxResultCount: 100 }).subscribe({
      next: (res) => {
        const items = res.items ?? [];
        this.workOrders.set(items);
        const open = this.selectedWo();
        this.selectedWo.set(open ? (items.find((w) => w.id === open.id) ?? null) : null);
        this.isLoading.set(false);
      },
      error: () => {
        this.loadError.set('The work orders could not be loaded.');
        this.isLoading.set(false);
      },
    });
  }

  /** From a bill of materials: ?bomId=…&partNumber=…&description=… opens a new order for it. */
  private openFromBom(): void {
    const q = this.route.snapshot.queryParamMap;
    const bomId = q.get('bomId');
    if (!bomId) return;
    void this.router.navigate(['/manufacturing/work-orders/new'], {
      queryParams: {
        bomId,
        partNumber: q.get('partNumber'),
        description: q.get('description'),
        plannedQuantity: q.get('plannedQuantity'),
      },
      replaceUrl: true,
    });
  }

  onWoClick(args: RecordClickEventArgs): void {
    const row = args.rowData as WorkOrderDto | undefined;
    if (row) this.selectWorkOrder(row);
  }

  selectWorkOrder(wo: WorkOrderDto): void {
    this.selectedWo.set(wo);
    this.activeTab.set('Routing');
  }

  countFor(status: WorkOrderStatus | null): number {
    return status === null
      ? this.workOrders().length
      : this.workOrders().filter((w) => w.status === status).length;
  }

  progress(wo: WorkOrderDto): number {
    return progressPercent(wo);
  }

  stepsDone(wo: WorkOrderDto): number {
    return wo.routingSteps.filter((s) => s.isCompleted).length;
  }

  sortedSteps(wo: WorkOrderDto): WorkOrderRoutingStepDto[] {
    return [...wo.routingSteps].sort((a, b) => a.stepSequence - b.stepSequence);
  }

  isLate(wo: WorkOrderDto): boolean {
    return (
      wo.status !== WorkOrderStatus.Completed &&
      wo.status !== WorkOrderStatus.Cancelled &&
      !!wo.plannedEndDateUtc &&
      new Date(wo.plannedEndDateUtc).getTime() < Date.now() - 86_400_000
    );
  }

  formatDate(iso: string | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime())
      ? '—'
      : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  getStatusTone(status: WorkOrderStatus): ChipTone {
    switch (status) {
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
    return (
      STATUS_FILTERS.find((f) => f.value === status)?.label ??
      (status === WorkOrderStatus.Cancelled ? 'Cancelled' : 'Unknown')
    );
  }

  getStageLabel(stage: RoutingStage): string {
    switch (stage) {
      case RoutingStage.MaterialKitting:
        return 'Material kitting';
      case RoutingStage.Machining:
        return 'Machining';
      case RoutingStage.Fabrication:
        return 'Fabrication';
      case RoutingStage.HeatTreatment:
        return 'Heat treatment';
      case RoutingStage.Assembly:
        return 'Assembly';
      case RoutingStage.FinalTesting:
        return 'Final testing';
      case RoutingStage.FinishedGoodsReceipt:
        return 'Finished goods';
      default:
        return 'Stage';
    }
  }

  private blankMaterial(): IssueMaterialToWorkOrderDto {
    return {
      componentPartNumber: '',
      componentDescription: '',
      requiredQuantity: 1,
      issuedQuantity: 1,
      wastedQuantity: 0,
      unitOfMeasure: 'NOS',
      issuedFromWarehouse: '',
    };
  }

  private fail(err: unknown, fallback: string): void {
    this.busy.set(false);
    const message =
      (err as { error?: { error?: { message?: string } } })?.error?.error?.message ?? fallback;
    this.toasts.error(message);
  }

  openCreate(): void {
    this.router.navigate(['/manufacturing/work-orders/new']);
  }

  releaseToShopFloor(): void {
    const sel = this.selectedWo();
    if (!sel?.id) return;
    if (environment.useMockData) {
      this.updateWoInState({
        ...sel,
        status: WorkOrderStatus.InProgress,
        actualStartDateUtc: new Date().toISOString(),
      });
      return;
    }
    this.busy.set(true);
    this.workOrderService.release(sel.id).subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.updateWoInState(updated);
        this.toasts.success(`${updated.workOrderNumber} released to the floor.`);
      },
      error: (err) => this.fail(err, 'The work order could not be released.'),
    });
  }

  openIssueMaterial(): void {
    if (!this.selectedWo()) return;
    this.newMaterial = this.blankMaterial();
    this.formError.set(null);
    this.isIssueMaterialOpen.set(true);
  }

  issueMaterial(): void {
    const sel = this.selectedWo();
    const m = this.newMaterial;
    if (!sel?.id) return;
    if (!m.componentPartNumber.trim() || !m.componentDescription.trim()) {
      this.formError.set('Fill in the component part and its description.');
      return;
    }
    const input: IssueMaterialToWorkOrderDto = {
      ...m,
      componentPartNumber: m.componentPartNumber.trim(),
      componentDescription: m.componentDescription.trim(),
      requiredQuantity: Number(m.requiredQuantity) || 0,
      issuedQuantity: Number(m.issuedQuantity) || 0,
      wastedQuantity: Number(m.wastedQuantity) || 0,
      unitOfMeasure: m.unitOfMeasure?.trim() || 'NOS',
      issuedFromWarehouse: m.issuedFromWarehouse?.trim() || undefined,
    };

    if (environment.useMockData) {
      const issue: WorkOrderMaterialIssueDto = {
        id: `womi-${Date.now()}`,
        workOrderId: sel.id,
        ...input,
        issueDateUtc: new Date().toISOString(),
      } as WorkOrderMaterialIssueDto;
      this.updateWoInState({ ...sel, materialIssues: [...sel.materialIssues, issue] });
      this.isIssueMaterialOpen.set(false);
      return;
    }
    this.busy.set(true);
    this.workOrderService.issueMaterial(sel.id, input).subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.updateWoInState(updated);
        this.isIssueMaterialOpen.set(false);
        this.toasts.success('Material issued.');
      },
      error: (err) => this.fail(err, 'The material could not be issued.'),
    });
  }

  openCompleteStep(step: WorkOrderRoutingStepDto): void {
    this.targetStep.set(step);
    this.stepCompletion = {
      stepId: step.id ?? '',
      actualHours: step.estimatedHours || 0,
      inspectedBy: '',
      qcPassed: true,
    };
    this.isCompleteStepOpen.set(true);
  }

  completeStep(): void {
    const sel = this.selectedWo();
    const step = this.targetStep();
    if (!sel?.id || !step) return;
    const input: CompleteRoutingStepDto = {
      ...this.stepCompletion,
      actualHours: Number(this.stepCompletion.actualHours) || 0,
      inspectedBy: this.stepCompletion.inspectedBy?.trim() || undefined,
    };

    if (environment.useMockData) {
      const steps = sel.routingSteps.map((s) =>
        s.id === step.id
          ? {
              ...s,
              isCompleted: true,
              completedAtUtc: new Date().toISOString(),
              actualHours: input.actualHours,
              inspectedBy: input.inspectedBy,
              qcPassed: input.qcPassed,
            }
          : s,
      );
      const next = [...steps]
        .sort((a, b) => a.stepSequence - b.stepSequence)
        .find((s) => !s.isCompleted);
      this.updateWoInState({
        ...sel,
        routingSteps: steps,
        currentStage: next ? next.stage : RoutingStage.FinishedGoodsReceipt,
      });
      this.isCompleteStepOpen.set(false);
      return;
    }
    this.busy.set(true);
    this.workOrderService.completeStep(sel.id, input).subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.updateWoInState(updated);
        this.isCompleteStepOpen.set(false);
        this.toasts.success('Step completed.');
      },
      error: (err) => this.fail(err, 'The step could not be completed.'),
    });
  }

  openCompleteWo(): void {
    const sel = this.selectedWo();
    if (!sel) return;
    this.woCompletion = {
      producedQuantity: sel.plannedQuantity,
      scrappedQuantity: 0,
      destinationLocation: '',
      remarks: '',
    };
    this.isCompleteWoOpen.set(true);
  }

  completeWorkOrder(): void {
    const sel = this.selectedWo();
    if (!sel?.id) return;
    const input: CompleteWorkOrderDto = {
      producedQuantity: Number(this.woCompletion.producedQuantity) || 0,
      scrappedQuantity: Number(this.woCompletion.scrappedQuantity) || 0,
      destinationLocation: this.woCompletion.destinationLocation?.trim() || undefined,
      remarks: this.woCompletion.remarks?.trim() || undefined,
    };

    if (environment.useMockData) {
      this.updateWoInState({
        ...sel,
        producedQuantity: input.producedQuantity,
        scrappedQuantity: input.scrappedQuantity,
        status: WorkOrderStatus.Completed,
        currentStage: RoutingStage.FinishedGoodsReceipt,
        actualCompletionDateUtc: new Date().toISOString(),
      });
      this.isCompleteWoOpen.set(false);
      return;
    }
    this.busy.set(true);
    this.workOrderService.completeWorkOrder(sel.id, input).subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.updateWoInState(updated);
        this.isCompleteWoOpen.set(false);
        this.toasts.success(`${updated.workOrderNumber} completed; stock updated.`);
      },
      error: (err) => this.fail(err, 'The work order could not be completed.'),
    });
  }

  private updateWoInState(updated: WorkOrderDto): void {
    this.workOrders.update((list) => list.map((w) => (w.id === updated.id ? updated : w)));
    this.selectedWo.set(updated);
  }
}
