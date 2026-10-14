import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { ArTopbar } from '../../../layout/topbar';
import {
  AmcContractDto,
  AmcContractService,
  AmcContractType,
  AmcStatus,
  AmcVisitScheduleDto,
  CompleteAmcVisitDto,
  CreateAmcContractDto,
  RenewAmcContractDto,
} from '../../../proxy/field-service';
import { ArButton, ArChip, ArDialog, ChipTone } from '../../../ui';

const MOCK_AMC_CONTRACTS: AmcContractDto[] = [
  {
    id: 'amc-1',
    contractNumber: 'AMC-2026-0041',
    customerId: 'cust-1',
    customerName: 'Tata Motors Powertrain Ltd',
    customerSiteAddress: 'Block C, Powertrain Shop, Chakan Industrial Area, Pune 410501',
    equipmentSerialNumber: 'PR-400T-2024-09',
    equipmentModel: 'Hydraulic Stamping Press 400 Ton',
    contractType: AmcContractType.Comprehensive,
    status: AmcStatus.Active,
    startDateUtc: new Date(Date.now() - 180 * 86_400_000).toISOString(),
    endDateUtc: new Date(Date.now() + 185 * 86_400_000).toISOString(),
    slaResponseHours: 4,
    contractValueInPaise: 450_000_00,
    scheduledVisitsPerYear: 4,
    visitsCompleted: 2,
    sparesIncluded: true,
    remarks:
      'Critical line equipment. 24x7 helpline with 4-hr on-site SLA for unplanned breakdown.',
    creationTime: new Date(Date.now() - 180 * 86_400_000).toISOString(),
    schedules: [
      {
        id: 'vs-1',
        amcContractId: 'amc-1',
        visitNumber: 1,
        scheduledDateUtc: new Date(Date.now() - 150 * 86_400_000).toISOString(),
        completedDateUtc: new Date(Date.now() - 149 * 86_400_000).toISOString(),
        assignedEngineer: 'Sunil Deshmukh (Senior Service Eng)',
        isCompleted: true,
        visitNotes:
          'Q1 PM completed. Hydraulic fluid contamination check normal (NAS 6). Proportional valves recalibrated.',
      },
      {
        id: 'vs-2',
        amcContractId: 'amc-1',
        visitNumber: 2,
        scheduledDateUtc: new Date(Date.now() - 60 * 86_400_000).toISOString(),
        completedDateUtc: new Date(Date.now() - 58 * 86_400_000).toISOString(),
        assignedEngineer: 'Sunil Deshmukh (Senior Service Eng)',
        isCompleted: true,
        visitNotes:
          'Q2 PM completed. Main cylinder seal gland tightened. Pressure transducers zero-drift verified.',
      },
      {
        id: 'vs-3',
        amcContractId: 'amc-1',
        visitNumber: 3,
        scheduledDateUtc: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        assignedEngineer: 'Sunil Deshmukh (Senior Service Eng)',
        isCompleted: false,
        visitNotes: 'Scheduled Q3 comprehensive overhaul and accumulator nitrogen recharging.',
      },
      {
        id: 'vs-4',
        amcContractId: 'amc-1',
        visitNumber: 4,
        scheduledDateUtc: new Date(Date.now() + 120 * 86_400_000).toISOString(),
        isCompleted: false,
      },
    ],
  },
  {
    id: 'amc-2',
    contractNumber: 'AMC-2026-0042',
    customerId: 'cust-2',
    customerName: 'Jindal Steel & Power Ltd',
    customerSiteAddress: 'Rolling Mill Division, Raigarh Plant, Chhattisgarh 496001',
    equipmentSerialNumber: 'GAN-25T-2023-11',
    equipmentModel: 'Automated Heavy Billet Handling Gantry 25 Ton',
    contractType: AmcContractType.NonComprehensive,
    status: AmcStatus.Active,
    startDateUtc: new Date(Date.now() - 100 * 86_400_000).toISOString(),
    endDateUtc: new Date(Date.now() + 265 * 86_400_000).toISOString(),
    slaResponseHours: 8,
    contractValueInPaise: 280_000_00,
    scheduledVisitsPerYear: 6,
    visitsCompleted: 2,
    sparesIncluded: false,
    remarks: 'Labor & PM visits covered. Spares billed separately on customer PO.',
    creationTime: new Date(Date.now() - 100 * 86_400_000).toISOString(),
    schedules: [
      {
        id: 'vs-5',
        amcContractId: 'amc-2',
        visitNumber: 1,
        scheduledDateUtc: new Date(Date.now() - 80 * 86_400_000).toISOString(),
        completedDateUtc: new Date(Date.now() - 79 * 86_400_000).toISOString(),
        assignedEngineer: 'Prakash Rao (Field Lead)',
        isCompleted: true,
        visitNotes:
          'Bi-monthly inspection. Hoist wire rope inspected for wire breaks. Lubricated planetary reducer.',
      },
      {
        id: 'vs-6',
        amcContractId: 'amc-2',
        visitNumber: 2,
        scheduledDateUtc: new Date(Date.now() - 20 * 86_400_000).toISOString(),
        completedDateUtc: new Date(Date.now() - 19 * 86_400_000).toISOString(),
        assignedEngineer: 'Prakash Rao (Field Lead)',
        isCompleted: true,
        visitNotes:
          'Drive motor inverter firmware updated. Brake pads replaced via billable spare requisition.',
      },
      {
        id: 'vs-7',
        amcContractId: 'amc-2',
        visitNumber: 3,
        scheduledDateUtc: new Date(Date.now() + 40 * 86_400_000).toISOString(),
        isCompleted: false,
      },
    ],
  },
  {
    id: 'amc-3',
    contractNumber: 'AMC-2026-0038',
    customerId: 'cust-3',
    customerName: 'L&T Heavy Engineering Ltd',
    customerSiteAddress: 'Hazira Manufacturing Complex, Surat, Gujarat 394510',
    equipmentSerialNumber: 'SKV-300-2021-02',
    equipmentModel: 'CNC Cylinder Skiving & Roller Burnishing Machine',
    contractType: AmcContractType.Comprehensive,
    status: AmcStatus.ExpiringSoon,
    startDateUtc: new Date(Date.now() - 345 * 86_400_000).toISOString(),
    endDateUtc: new Date(Date.now() + 20 * 86_400_000).toISOString(),
    slaResponseHours: 4,
    contractValueInPaise: 600_000_00,
    scheduledVisitsPerYear: 4,
    visitsCompleted: 4,
    sparesIncluded: true,
    remarks: 'Contract expires in 20 days. Renewal proposal sent to Head of Maintenance.',
    creationTime: new Date(Date.now() - 345 * 86_400_000).toISOString(),
    schedules: [
      {
        id: 'vs-8',
        amcContractId: 'amc-3',
        visitNumber: 4,
        scheduledDateUtc: new Date(Date.now() - 10 * 86_400_000).toISOString(),
        completedDateUtc: new Date(Date.now() - 9 * 86_400_000).toISOString(),
        assignedEngineer: 'Aman Deep (Specialist)',
        isCompleted: true,
        visitNotes:
          'Final scheduled inspection under current AMC. Spindle runout 0.003mm (within tolerance).',
      },
    ],
  },
];

@Component({
  selector: 'app-amc-contracts',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, DecimalPipe, ArTopbar, ArButton, ArChip, ArDialog],
  template: `
    <ar-topbar title="Installed Base AMC Contracts (Field ERP)">
      <div actions class="topbar-actions">
        <button ar-button="primary" (click)="openCreate()">+ Create AMC Contract</button>
      </div>
    </ar-topbar>

    <div class="page-content">
      <!-- KPI Row -->
      <section class="kpi-grid">
        <div class="kpi-card">
          <span class="label">Active Contracts</span>
          <strong class="value">{{ stats().activeCount }}</strong>
          <span class="sub">Installed Base Equipment</span>
        </div>
        <div class="kpi-card teal">
          <span class="label">Annual Contract Value (ACV)</span>
          <strong class="value">₹{{ stats().totalAcvPaise / 100 | number: '1.2-2' }}</strong>
          <span class="sub">Recurring service revenue</span>
        </div>
        <div class="kpi-card amber">
          <span class="label">Expiring in 30 Days</span>
          <strong class="value">{{ stats().expiringSoonCount }}</strong>
          <span class="sub">Requires renewal quotation</span>
        </div>
        <div class="kpi-card">
          <span class="label">PM Visit Completion</span>
          <strong class="value">{{ stats().completionRate }}%</strong>
          <span class="sub"
            >{{ stats().completedVisits }} of {{ stats().totalVisits }} visits done</span
          >
        </div>
      </section>

      <!-- Filter bar -->
      <section class="filter-bar">
        <div class="search-box">
          <input
            type="search"
            class="input-search"
            placeholder="Search Contract #, Customer, Serial #, or Machine Model..."
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
            All ({{ contracts().length }})
          </button>
          <button
            class="chip-filter"
            [class.active]="statusFilter() === AmcStatus.Active.toString()"
            (click)="statusFilter.set(AmcStatus.Active.toString())"
          >
            Active
          </button>
          <button
            class="chip-filter"
            [class.active]="statusFilter() === AmcStatus.ExpiringSoon.toString()"
            (click)="statusFilter.set(AmcStatus.ExpiringSoon.toString())"
          >
            Expiring Soon
          </button>
          <button
            class="chip-filter"
            [class.active]="statusFilter() === AmcStatus.Expired.toString()"
            (click)="statusFilter.set(AmcStatus.Expired.toString())"
          >
            Expired
          </button>
        </div>
      </section>

      <!-- Main Layout: Table on Left, Cockpit on Right -->
      <div class="amc-layout">
        <!-- Table -->
        <section class="table-card">
          <table class="data-table">
            <thead>
              <tr>
                <th>Contract #</th>
                <th>Customer & Site</th>
                <th>Equipment Serial & Model</th>
                <th>Type</th>
                <th>SLA / Visits</th>
                <th>Value (₹)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr
                *ngFor="let c of filteredContracts()"
                [class.selected-row]="selectedContract()?.id === c.id"
                (click)="selectContract(c)"
                class="clickable-row"
              >
                <td>
                  <span class="fw-bold text-primary-dark">{{ c.contractNumber }}</span>
                </td>
                <td>
                  <div class="client-info">
                    <span class="client-name">{{ c.customerName }}</span>
                    <span class="client-addr" *ngIf="c.customerSiteAddress">{{
                      c.customerSiteAddress
                    }}</span>
                  </div>
                </td>
                <td>
                  <div class="equip-info">
                    <span class="serial-badge">{{ c.equipmentSerialNumber }}</span>
                    <span class="model-name">{{ c.equipmentModel }}</span>
                  </div>
                </td>
                <td>
                  <span class="type-pill">{{ getContractTypeLabel(c.contractType) }}</span>
                </td>
                <td>
                  <div class="visit-metric">
                    <span>SLA: {{ c.slaResponseHours }}h</span>
                    <span class="text-sub"
                      >{{ c.visitsCompleted }} / {{ c.scheduledVisitsPerYear }} Visits</span
                    >
                  </div>
                </td>
                <td class="fw-bold">₹{{ c.contractValueInPaise / 100 | number: '1.2-2' }}</td>
                <td>
                  <ar-chip [tone]="getStatusTone(c.status)">{{ getStatusLabel(c.status) }}</ar-chip>
                </td>
              </tr>
              <tr *ngIf="filteredContracts().length === 0">
                <td colspan="7" class="empty-cell">No AMC contracts match your query.</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- Right Cockpit: Contract Detail & Schedules -->
        <section class="detail-cockpit" *ngIf="selectedContract() as contract">
          <div class="cockpit-header">
            <div>
              <div class="cockpit-title-row">
                <h3>{{ contract.contractNumber }}</h3>
                <ar-chip [tone]="getStatusTone(contract.status)">{{
                  getStatusLabel(contract.status)
                }}</ar-chip>
              </div>
              <p class="cockpit-sub">
                Customer: <strong>{{ contract.customerName }}</strong>
              </p>
              <p class="cockpit-site" *ngIf="contract.customerSiteAddress">
                Site: {{ contract.customerSiteAddress }}
              </p>
            </div>
            <div class="cockpit-actions">
              <button
                *ngIf="
                  contract.status === AmcStatus.Active || contract.status === AmcStatus.ExpiringSoon
                "
                ar-button="primary"
                (click)="openRenewModal(contract)"
              >
                Renew Contract
              </button>
            </div>
          </div>

          <!-- Machine Specifications & SLA Info -->
          <div class="contract-overview-cards">
            <div class="ov-item">
              <span class="lbl">Equipment Serial</span>
              <strong class="val val-serial">{{ contract.equipmentSerialNumber }}</strong>
              <span class="sub-desc">{{ contract.equipmentModel }}</span>
            </div>
            <div class="ov-item">
              <span class="lbl">SLA Response Time</span>
              <strong class="val text-primary-dark">{{ contract.slaResponseHours }} Hours</strong>
              <span class="sub-desc">{{
                contract.sparesIncluded ? 'Spares Included (Comp)' : 'Spares Excluded'
              }}</span>
            </div>
            <div class="ov-item">
              <span class="lbl">Contract Period</span>
              <span class="val-date"
                >{{ contract.startDateUtc | date: 'mediumDate' }} -
                {{ contract.endDateUtc | date: 'mediumDate' }}</span
              >
              <span class="sub-desc">Annual Recurring Service</span>
            </div>
            <div class="ov-item">
              <span class="lbl">Contract Value</span>
              <strong class="val text-success"
                >₹{{ contract.contractValueInPaise / 100 | number: '1.2-2' }}</strong
              >
              <span class="sub-desc">Inclusive of scheduled visits</span>
            </div>
          </div>

          <!-- Preventive Maintenance (PM) Visits Schedule -->
          <div class="schedules-section">
            <div class="schedules-header">
              <h4>Preventive Maintenance (PM) Visits Calendar</h4>
              <span class="badge-count">{{ contract.schedules.length }} Scheduled</span>
            </div>

            <div class="table-responsive">
              <table class="sub-table">
                <thead>
                  <tr>
                    <th>Visit</th>
                    <th>Scheduled Date</th>
                    <th>Completed Date</th>
                    <th>Assigned Engineer</th>
                    <th>Status & Notes</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let s of contract.schedules">
                    <td class="fw-bold">Visit #{{ s.visitNumber }}</td>
                    <td>{{ s.scheduledDateUtc | date: 'mediumDate' }}</td>
                    <td>
                      <span *ngIf="s.completedDateUtc">{{
                        s.completedDateUtc | date: 'mediumDate'
                      }}</span>
                      <span *ngIf="!s.completedDateUtc" class="text-muted">-</span>
                    </td>
                    <td>
                      <div class="eng-name">{{ s.assignedEngineer || 'Unassigned' }}</div>
                    </td>
                    <td>
                      <div class="status-notes">
                        <ar-chip [tone]="s.isCompleted ? 'good' : 'warn'">
                          {{ s.isCompleted ? 'Completed' : 'Pending' }}
                        </ar-chip>
                        <div class="note-text" *ngIf="s.visitNotes">{{ s.visitNotes }}</div>
                      </div>
                    </td>
                    <td>
                      <button
                        *ngIf="!s.isCompleted"
                        ar-button="ghost"
                        class="btn-xs"
                        (click)="openCompleteVisitModal(s)"
                      >
                        Record Visit
                      </button>
                      <span *ngIf="s.isCompleted" class="text-done">&#10003; Done</span>
                    </td>
                  </tr>
                  <tr *ngIf="!contract.schedules || contract.schedules.length === 0">
                    <td colspan="6" class="text-center text-muted">
                      No scheduled visits configured.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- Create Contract Dialog -->
    <ar-dialog
      *ngIf="isCreateOpen()"
      title="Create Equipment AMC Contract"
      (dismiss)="isCreateOpen.set(false)"
    >
      <div class="modal-body-container">
        <div class="form-grid">
          <div class="form-group">
            <label>Contract Number</label>
            <input type="text" class="form-control" [(ngModel)]="newContract.contractNumber" />
          </div>
          <div class="form-group">
            <label>Customer Name</label>
            <input
              type="text"
              class="form-control"
              [(ngModel)]="newContract.customerName"
              placeholder="Client Name"
            />
          </div>
          <div class="form-group full-width">
            <label>Customer Site Address / Plant Location</label>
            <input
              type="text"
              class="form-control"
              [(ngModel)]="newContract.customerSiteAddress"
              placeholder="Plant, Shop, City"
            />
          </div>
          <div class="form-group">
            <label>Equipment Serial Number</label>
            <input
              type="text"
              class="form-control"
              [(ngModel)]="newContract.equipmentSerialNumber"
              placeholder="e.g. PR-400T-2024-09"
            />
          </div>
          <div class="form-group">
            <label>Equipment Model / Machine Name</label>
            <input
              type="text"
              class="form-control"
              [(ngModel)]="newContract.equipmentModel"
              placeholder="e.g. Hydraulic Stamping Press 400T"
            />
          </div>
          <div class="form-group">
            <label>Contract Type</label>
            <select class="form-control" [(ngModel)]="newContract.contractType">
              <option [ngValue]="AmcContractType.Comprehensive">Comprehensive (With Spares)</option>
              <option [ngValue]="AmcContractType.NonComprehensive">
                Non-Comprehensive (Labor Only)
              </option>
              <option [ngValue]="AmcContractType.PreventiveOnly">
                Preventive Maintenance Only
              </option>
              <option [ngValue]="AmcContractType.OnDemand">On Demand SLA</option>
            </select>
          </div>
          <div class="form-group">
            <label>SLA Response Time (Hours)</label>
            <input type="number" class="form-control" [(ngModel)]="newContract.slaResponseHours" />
          </div>
          <div class="form-group">
            <label>Annual Contract Value (INR)</label>
            <input
              type="number"
              class="form-control"
              [ngModel]="newContract.contractValueInPaise / 100"
              (ngModelChange)="newContract.contractValueInPaise = $event * 100"
            />
          </div>
          <div class="form-group">
            <label>Scheduled PM Visits Per Year</label>
            <input
              type="number"
              class="form-control"
              [(ngModel)]="newContract.scheduledVisitsPerYear"
            />
          </div>
          <div class="form-group">
            <label>Start Date</label>
            <input type="date" class="form-control" [(ngModel)]="newContract.startDateUtc" />
          </div>
          <div class="form-group">
            <label>End Date</label>
            <input type="date" class="form-control" [(ngModel)]="newContract.endDateUtc" />
          </div>
        </div>

        <div class="form-check mt-3">
          <label class="checkbox-label">
            <input type="checkbox" [(ngModel)]="newContract.sparesIncluded" />
            <span>Replacement spare parts included in contract pricing</span>
          </label>
        </div>

        <div class="form-group full-width mt-3">
          <label>Remarks & SLA Terms</label>
          <textarea class="form-control" rows="2" [(ngModel)]="newContract.remarks"></textarea>
        </div>

        <div class="dialog-actions mt-4">
          <button ar-button="primary" (click)="createContract()">Create AMC Contract</button>
          <button ar-button="ghost" (click)="isCreateOpen.set(false)">Cancel</button>
        </div>
      </div>
    </ar-dialog>

    <!-- Complete PM Visit Dialog -->
    <ar-dialog
      *ngIf="isCompleteVisitOpen()"
      title="Record Completed PM Visit"
      (dismiss)="isCompleteVisitOpen.set(false)"
    >
      <div class="modal-body-container" *ngIf="targetSchedule() as sched">
        <p class="mb-3">
          Recording completion for <strong>Visit #{{ sched.visitNumber }}</strong> (Scheduled for
          {{ sched.scheduledDateUtc | date: 'mediumDate' }}).
        </p>

        <div class="form-grid">
          <div class="form-group full-width">
            <label>Service Engineer Who Performed Visit</label>
            <input
              type="text"
              class="form-control"
              [(ngModel)]="visitCompletion.assignedEngineer"
              placeholder="Engineer Name"
            />
          </div>
          <div class="form-group full-width">
            <label>Inspection Notes & Maintenance Carried Out</label>
            <textarea
              class="form-control"
              rows="3"
              [(ngModel)]="visitCompletion.visitNotes"
              placeholder="Checked oil filters, tightened mounting bolts, verified sensor calibrations..."
            ></textarea>
          </div>
        </div>

        <div class="dialog-actions mt-4">
          <button ar-button="primary" (click)="completeVisit()">Confirm & Close Visit</button>
          <button ar-button="ghost" (click)="isCompleteVisitOpen.set(false)">Cancel</button>
        </div>
      </div>
    </ar-dialog>

    <!-- Renew Contract Dialog -->
    <ar-dialog
      *ngIf="isRenewOpen()"
      title="Renew Equipment AMC Contract"
      (dismiss)="isRenewOpen.set(false)"
    >
      <div class="modal-body-container" *ngIf="selectedContract() as contract">
        <p class="mb-3">
          Renewing contract <strong>{{ contract.contractNumber }}</strong> for
          {{ contract.customerName }} ({{ contract.equipmentSerialNumber }}).
        </p>

        <div class="form-grid">
          <div class="form-group">
            <label>New Start Date</label>
            <input type="date" class="form-control" [(ngModel)]="renewForm.newStartDateUtc" />
          </div>
          <div class="form-group">
            <label>New End Date</label>
            <input type="date" class="form-control" [(ngModel)]="renewForm.newEndDateUtc" />
          </div>
          <div class="form-group">
            <label>New Contract Value (INR)</label>
            <input
              type="number"
              class="form-control"
              [ngModel]="renewForm.newContractValueInPaise / 100"
              (ngModelChange)="renewForm.newContractValueInPaise = $event * 100"
            />
          </div>
          <div class="form-group">
            <label>Contract Type</label>
            <select class="form-control" [(ngModel)]="renewForm.newContractType">
              <option [ngValue]="AmcContractType.Comprehensive">Comprehensive</option>
              <option [ngValue]="AmcContractType.NonComprehensive">Non-Comprehensive</option>
              <option [ngValue]="AmcContractType.PreventiveOnly">Preventive Only</option>
            </select>
          </div>
        </div>

        <div class="dialog-actions mt-4">
          <button ar-button="primary" (click)="renewContract()">Renew Contract</button>
          <button ar-button="ghost" (click)="isRenewOpen.set(false)">Cancel</button>
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

      .amc-layout {
        display: grid;
        grid-template-columns: 1.1fr 1fr;
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

      .client-info {
        display: flex;
        flex-direction: column;

        .client-name {
          font-weight: 600;
          color: #0f172a;
        }

        .client-addr {
          font-size: 0.75rem;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 180px;
        }
      }

      .equip-info {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;

        .serial-badge {
          font-size: 0.75rem;
          font-weight: 600;
          background: #e0f2fe;
          color: #0369a1;
          padding: 1px 5px;
          border-radius: 3px;
          width: fit-content;
        }

        .model-name {
          font-size: 0.78rem;
          color: #475569;
        }
      }

      .type-pill {
        font-size: 0.75rem;
        background: #f1f5f9;
        color: #334155;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 500;
      }

      .visit-metric {
        display: flex;
        flex-direction: column;
        font-size: 0.8rem;

        .text-sub {
          font-size: 0.72rem;
          color: #64748b;
        }
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

        .cockpit-site {
          margin: 0.2rem 0 0 0;
          font-size: 0.78rem;
          color: #64748b;
        }

        .cockpit-actions {
          display: flex;
          gap: 0.5rem;
        }
      }

      .contract-overview-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 0.75rem;
        background: #f8fafc;
        padding: 0.85rem;
        border-radius: 6px;

        .ov-item {
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
            font-size: 1.05rem;
            font-weight: 700;

            &.val-serial {
              color: #0284c7;
            }
          }

          .val-date {
            font-size: 0.8rem;
            font-weight: 600;
            color: #1e293b;
          }

          .sub-desc {
            font-size: 0.72rem;
            color: #64748b;
          }
        }
      }

      .schedules-section {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;

        .schedules-header {
          display: flex;
          justify-content: space-between;
          align-items: center;

          h4 {
            margin: 0;
            font-size: 0.95rem;
            color: #1e293b;
          }

          .badge-count {
            font-size: 0.75rem;
            background: #e2e8f0;
            padding: 2px 6px;
            border-radius: 10px;
            color: #475569;
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

      .status-notes {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;

        .note-text {
          font-size: 0.72rem;
          color: #64748b;
          max-width: 200px;
        }
      }

      .text-done {
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

      .fw-bold {
        font-weight: 600;
      }
      .text-primary-dark {
        color: #0369a1;
      }
      .text-success {
        color: #16a34a;
      }
      .text-muted {
        color: #94a3b8;
      }
      .text-center {
        text-align: center;
      }
      .mt-3 {
        margin-top: 0.75rem;
      }
      .mt-4 {
        margin-top: 1rem;
      }
      .mb-3 {
        margin-bottom: 0.75rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmcContractsComponent {
  private readonly amcService = inject(AmcContractService);

  readonly contracts = signal<AmcContractDto[]>(MOCK_AMC_CONTRACTS);
  readonly selectedContract = signal<AmcContractDto | null>(MOCK_AMC_CONTRACTS[0]);
  readonly isLoading = signal<boolean>(false);

  // Filters
  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<string>('ALL');

  // Dialogs
  readonly isCreateOpen = signal<boolean>(false);
  readonly isCompleteVisitOpen = signal<boolean>(false);
  readonly isRenewOpen = signal<boolean>(false);

  readonly targetSchedule = signal<AmcVisitScheduleDto | null>(null);

  newContract: CreateAmcContractDto = {
    contractNumber: '',
    customerId: 'cust-1',
    customerName: '',
    customerSiteAddress: '',
    equipmentSerialNumber: '',
    equipmentModel: '',
    contractType: AmcContractType.Comprehensive,
    startDateUtc: new Date().toISOString().substring(0, 10),
    endDateUtc: new Date(Date.now() + 365 * 86_400_000).toISOString().substring(0, 10),
    slaResponseHours: 4,
    contractValueInPaise: 300_000_00,
    scheduledVisitsPerYear: 4,
    sparesIncluded: true,
    remarks: '',
  };

  visitCompletion: CompleteAmcVisitDto = {
    scheduleId: '',
    assignedEngineer: '',
    visitNotes: '',
  };

  renewForm: RenewAmcContractDto = {
    newStartDateUtc: new Date().toISOString().substring(0, 10),
    newEndDateUtc: new Date(Date.now() + 365 * 86_400_000).toISOString().substring(0, 10),
    newContractValueInPaise: 400_000_00,
    newContractType: AmcContractType.Comprehensive,
  };

  readonly filteredContracts = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const sf = this.statusFilter();

    return this.contracts().filter((c) => {
      if (sf !== 'ALL' && c.status.toString() !== sf) return false;
      if (!q) return true;

      return (
        c.contractNumber.toLowerCase().includes(q) ||
        c.customerName.toLowerCase().includes(q) ||
        c.equipmentSerialNumber.toLowerCase().includes(q) ||
        c.equipmentModel.toLowerCase().includes(q)
      );
    });
  });

  readonly stats = computed(() => {
    const list = this.contracts();
    const activeCount = list.filter((c) => c.status === AmcStatus.Active).length;
    const expiringSoonCount = list.filter((c) => c.status === AmcStatus.ExpiringSoon).length;
    const totalAcvPaise = list.reduce((acc, c) => acc + (c.contractValueInPaise || 0), 0);
    const totalVisits = list.reduce((acc, c) => acc + (c.scheduledVisitsPerYear || 0), 0);
    const completedVisits = list.reduce((acc, c) => acc + (c.visitsCompleted || 0), 0);
    const completionRate =
      totalVisits > 0 ? ((completedVisits / totalVisits) * 100).toFixed(0) : '0';

    return {
      activeCount,
      expiringSoonCount,
      totalAcvPaise,
      totalVisits,
      completedVisits,
      completionRate,
    };
  });

  readonly AmcStatus = AmcStatus;
  readonly AmcContractType = AmcContractType;

  constructor() {
    this.loadContracts();
  }

  loadContracts(): void {
    if (environment.useMockData) return;

    this.isLoading.set(true);
    this.amcService.getList({ maxResultCount: 100 }).subscribe({
      next: (res) => {
        this.contracts.set(res.items || []);
        if (res.items && res.items.length > 0) {
          this.selectedContract.set(res.items[0]);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  selectContract(c: AmcContractDto): void {
    this.selectedContract.set(c);
  }

  getStatusTone(status: AmcStatus): ChipTone {
    switch (status) {
      case AmcStatus.Active:
        return 'good';
      case AmcStatus.ExpiringSoon:
        return 'amber';
      case AmcStatus.Expired:
        return 'bad';
      case AmcStatus.Terminated:
        return 'neutral';
      default:
        return 'neutral';
    }
  }

  getStatusLabel(status: AmcStatus): string {
    switch (status) {
      case AmcStatus.Active:
        return 'Active';
      case AmcStatus.ExpiringSoon:
        return 'Expiring Soon';
      case AmcStatus.Expired:
        return 'Expired';
      case AmcStatus.Terminated:
        return 'Terminated';
      default:
        return 'Unknown';
    }
  }

  getContractTypeLabel(type: AmcContractType): string {
    switch (type) {
      case AmcContractType.Comprehensive:
        return 'Comprehensive';
      case AmcContractType.NonComprehensive:
        return 'Non-Comprehensive';
      case AmcContractType.PreventiveOnly:
        return 'Preventive Only';
      case AmcContractType.OnDemand:
        return 'On Demand';
      default:
        return 'Standard';
    }
  }

  openCreate(): void {
    const nextSeq = this.contracts().length + 1;
    this.newContract = {
      contractNumber: `AMC-2026-${String(nextSeq + 45).padStart(4, '0')}`,
      customerId: 'cust-1',
      customerName: '',
      customerSiteAddress: '',
      equipmentSerialNumber: '',
      equipmentModel: '',
      contractType: AmcContractType.Comprehensive,
      startDateUtc: new Date().toISOString().substring(0, 10),
      endDateUtc: new Date(Date.now() + 365 * 86_400_000).toISOString().substring(0, 10),
      slaResponseHours: 4,
      contractValueInPaise: 350_000_00,
      scheduledVisitsPerYear: 4,
      sparesIncluded: true,
      remarks: '',
    };
    this.isCreateOpen.set(true);
  }

  createContract(): void {
    if (!this.newContract.customerName || !this.newContract.equipmentSerialNumber) return;

    if (!environment.useMockData) {
      this.amcService.create(this.newContract).subscribe({
        next: (created) => {
          this.contracts.update((list) => [created, ...list]);
          this.selectedContract.set(created);
          this.isCreateOpen.set(false);
        },
      });
      return;
    }

    const created: AmcContractDto = {
      id: `amc-${Date.now()}`,
      contractNumber: this.newContract.contractNumber || 'AMC-2026-0099',
      customerId: this.newContract.customerId,
      customerName: this.newContract.customerName,
      customerSiteAddress: this.newContract.customerSiteAddress,
      equipmentSerialNumber: this.newContract.equipmentSerialNumber,
      equipmentModel: this.newContract.equipmentModel,
      contractType: this.newContract.contractType,
      status: AmcStatus.Active,
      startDateUtc: this.newContract.startDateUtc,
      endDateUtc: this.newContract.endDateUtc,
      slaResponseHours: Number(this.newContract.slaResponseHours),
      contractValueInPaise: Number(this.newContract.contractValueInPaise),
      scheduledVisitsPerYear: Number(this.newContract.scheduledVisitsPerYear),
      visitsCompleted: 0,
      sparesIncluded: this.newContract.sparesIncluded,
      remarks: this.newContract.remarks,
      creationTime: new Date().toISOString(),
      schedules: [
        {
          id: `vs-${Date.now()}-1`,
          amcContractId: `amc-${Date.now()}`,
          visitNumber: 1,
          scheduledDateUtc: new Date(Date.now() + 90 * 86_400_000).toISOString(),
          isCompleted: false,
        },
        {
          id: `vs-${Date.now()}-2`,
          amcContractId: `amc-${Date.now()}`,
          visitNumber: 2,
          scheduledDateUtc: new Date(Date.now() + 180 * 86_400_000).toISOString(),
          isCompleted: false,
        },
        {
          id: `vs-${Date.now()}-3`,
          amcContractId: `amc-${Date.now()}`,
          visitNumber: 3,
          scheduledDateUtc: new Date(Date.now() + 270 * 86_400_000).toISOString(),
          isCompleted: false,
        },
        {
          id: `vs-${Date.now()}-4`,
          amcContractId: `amc-${Date.now()}`,
          visitNumber: 4,
          scheduledDateUtc: new Date(Date.now() + 360 * 86_400_000).toISOString(),
          isCompleted: false,
        },
      ],
    };

    this.contracts.update((list) => [created, ...list]);
    this.selectedContract.set(created);
    this.isCreateOpen.set(false);
  }

  openCompleteVisitModal(s: AmcVisitScheduleDto): void {
    this.targetSchedule.set(s);
    this.visitCompletion = {
      scheduleId: s.id || '',
      assignedEngineer: s.assignedEngineer || 'Sunil Deshmukh',
      visitNotes: 'Routine quarterly PM inspection carried out successfully.',
    };
    this.isCompleteVisitOpen.set(true);
  }

  completeVisit(): void {
    const sel = this.selectedContract();
    const sched = this.targetSchedule();
    if (!sel || !sched) return;

    if (!environment.useMockData && sel.id) {
      this.amcService.completeVisit(sel.id, this.visitCompletion).subscribe({
        next: (updated) => {
          this.updateContractInState(updated);
          this.isCompleteVisitOpen.set(false);
        },
      });
      return;
    }

    const updatedSchedules = (sel.schedules || []).map((s) => {
      if (s.id === sched.id) {
        return {
          ...s,
          isCompleted: true,
          completedDateUtc: new Date().toISOString(),
          assignedEngineer: this.visitCompletion.assignedEngineer,
          visitNotes: this.visitCompletion.visitNotes,
        };
      }
      return s;
    });

    const updated: AmcContractDto = {
      ...sel,
      schedules: updatedSchedules,
      visitsCompleted: (sel.visitsCompleted || 0) + 1,
    };

    this.updateContractInState(updated);
    this.isCompleteVisitOpen.set(false);
  }

  openRenewModal(c: AmcContractDto): void {
    this.renewForm = {
      newStartDateUtc: new Date().toISOString().substring(0, 10),
      newEndDateUtc: new Date(Date.now() + 365 * 86_400_000).toISOString().substring(0, 10),
      newContractValueInPaise: (c.contractValueInPaise || 400_000_00) * 1.1, // 10% annual escalation
      newContractType: c.contractType,
    };
    this.isRenewOpen.set(true);
  }

  renewContract(): void {
    const sel = this.selectedContract();
    if (!sel) return;

    if (!environment.useMockData && sel.id) {
      this.amcService.renew(sel.id, this.renewForm).subscribe({
        next: (updated) => {
          this.updateContractInState(updated);
          this.isRenewOpen.set(false);
        },
      });
      return;
    }

    const updated: AmcContractDto = {
      ...sel,
      status: AmcStatus.Active,
      startDateUtc: this.renewForm.newStartDateUtc,
      endDateUtc: this.renewForm.newEndDateUtc,
      contractValueInPaise: Number(this.renewForm.newContractValueInPaise),
      contractType: this.renewForm.newContractType ?? sel.contractType,
      visitsCompleted: 0,
      remarks: `${sel.remarks || ''} [Renewed for another year]`.trim(),
    };

    this.updateContractInState(updated);
    this.isRenewOpen.set(false);
  }

  private updateContractInState(updated: AmcContractDto): void {
    this.contracts.update((list) => list.map((c) => (c.id === updated.id ? updated : c)));
    this.selectedContract.set(updated);
  }
}
