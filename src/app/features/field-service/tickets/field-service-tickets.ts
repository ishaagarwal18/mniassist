import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GridModule, RecordClickEventArgs, RowSelectEventArgs } from '@syncfusion/ej2-angular-grids';
import { environment } from '../../../../environments/environment';
import { ArTopbar } from '../../../layout/topbar';
import {
  CreateFieldServiceTicketDto,
  FieldServiceTicketDto,
  FieldServiceTicketService,
  ResolveFieldServiceTicketDto,
  ServiceTicketPriority,
  ServiceTicketSpareConsumedDto,
  ServiceTicketStatus,
  ServiceTicketType,
} from '../../../proxy/field-service';
import { ArButton, ArChip, ArDialog, ChipTone } from '../../../ui';
import { ArGrid } from '../../../ui/grid';
import { initialSearch } from '../../../core/util/customer-scope';

const MOCK_SERVICE_TICKETS: FieldServiceTicketDto[] = [
  {
    id: 'fst-1',
    ticketNumber: 'FST-2026-0101',
    customerId: 'cust-1',
    customerName: 'Tata Motors Powertrain Ltd',
    customerSiteAddress: 'Block C, Powertrain Shop, Chakan, Pune 410501',
    customerContactPhone: '+91 98230 45671',
    amcContractId: 'amc-1',
    equipmentSerialNumber: 'PR-400T-2024-09',
    equipmentModel: 'Hydraulic Stamping Press 400 Ton',
    ticketType: ServiceTicketType.Breakdown,
    priority: ServiceTicketPriority.CriticalEmergency,
    status: ServiceTicketStatus.InProgress,
    issueDescription:
      'Main ram pressure dropping during 350 bar stamping cycle. Line 1 assembly halted.',
    assignedFieldEngineer: 'Sunil Deshmukh (Sr Service Specialist)',
    scheduledVisitDateUtc: new Date(Date.now() - 4 * 3600_000).toISOString(),
    visitStartTimeUtc: new Date(Date.now() - 3 * 3600_000).toISOString(),
    totalSparesCostInPaise: 10_800_00,
    creationTime: new Date(Date.now() - 6 * 3600_000).toISOString(),
    sparesConsumed: [
      {
        id: 'sp-1',
        serviceTicketId: 'fst-1',
        partNumber: 'SK-FKM-90',
        description: 'Viton FKM High-Pressure Cylinder Seal Kit',
        quantity: 1,
        unitPriceInPaise: 4_600_00,
        isBillableToCustomer: false, // Covered under Comprehensive AMC
        lineTotalInPaise: 4_600_00,
      },
      {
        id: 'sp-2',
        serviceTicketId: 'fst-1',
        partNumber: 'SOL-COIL-24V',
        description: 'Proportional Directional Solenoid Coil 24V DC',
        quantity: 1,
        unitPriceInPaise: 6_200_00,
        isBillableToCustomer: false, // Covered under Comprehensive AMC
        lineTotalInPaise: 6_200_00,
      },
    ],
  },
  {
    id: 'fst-2',
    ticketNumber: 'FST-2026-0102',
    customerId: 'cust-2',
    customerName: 'Jindal Steel & Power Ltd',
    customerSiteAddress: 'Rolling Mill Division, Raigarh Plant, Chhattisgarh',
    customerContactPhone: '+91 94370 12890',
    amcContractId: 'amc-2',
    equipmentSerialNumber: 'GAN-25T-2023-11',
    equipmentModel: 'Automated Heavy Billet Handling Gantry 25T',
    ticketType: ServiceTicketType.Breakdown,
    priority: ServiceTicketPriority.High,
    status: ServiceTicketStatus.InTransit,
    issueDescription:
      'Hoist motor drive tripping with Overcurrent Fault F-002 under heavy 20-ton load.',
    assignedFieldEngineer: 'Prakash Rao (Field Lead)',
    scheduledVisitDateUtc: new Date(Date.now() + 2 * 3600_000).toISOString(),
    totalSparesCostInPaise: 0,
    creationTime: new Date(Date.now() - 3 * 3600_000).toISOString(),
    sparesConsumed: [],
  },
  {
    id: 'fst-3',
    ticketNumber: 'FST-2026-0098',
    customerId: 'cust-3',
    customerName: 'Bharat Forge Industrial',
    customerSiteAddress: 'Mundhwa Forge Division, Pune 411036',
    customerContactPhone: '+91 98811 54320',
    equipmentSerialNumber: 'CHL-IND-2022-04',
    equipmentModel: 'High-Frequency Induction Furnace Chiller 120kW',
    ticketType: ServiceTicketType.PreventiveMaintenance,
    priority: ServiceTicketPriority.Medium,
    status: ServiceTicketStatus.Resolved,
    issueDescription: 'Quarterly PM check & condenser coil descaling before summer peak load.',
    rootCauseAnalysis: 'Scale deposit in copper heat exchanger tubes due to high water hardness.',
    resolutionSummary:
      'Chemical acid flush and neutralizer wash performed. Flow rate restored to 240 LPM. Refrigerant R410A topped up.',
    assignedFieldEngineer: 'Aman Deep (Specialist)',
    scheduledVisitDateUtc: new Date(Date.now() - 24 * 3600_000).toISOString(),
    customerSignoffName: 'Mahesh Joshi (Plant Maintenance Manager)',
    customerSatisfactionRating: 5,
    totalSparesCostInPaise: 18_500_00,
    creationTime: new Date(Date.now() - 36 * 3600_000).toISOString(),
    sparesConsumed: [
      {
        id: 'sp-3',
        serviceTicketId: 'fst-3',
        partNumber: 'CHEM-DS-20L',
        description: 'Eco-Safe Descaling Solution 20L Canister',
        quantity: 2,
        unitPriceInPaise: 5_500_00,
        isBillableToCustomer: true,
        lineTotalInPaise: 11_000_00,
      },
      {
        id: 'sp-4',
        serviceTicketId: 'fst-3',
        partNumber: 'GAS-R410A-CAN',
        description: 'Refrigerant Gas R410A 5kg Cylinder',
        quantity: 1,
        unitPriceInPaise: 7_500_00,
        isBillableToCustomer: true,
        lineTotalInPaise: 7_500_00,
      },
    ],
  },
  {
    id: 'fst-4',
    ticketNumber: 'FST-2026-0095',
    customerId: 'cust-4',
    customerName: 'Mahindra Automotive Ltd',
    customerSiteAddress: 'Nashik Assembly Plant, Maharashtra 422007',
    customerContactPhone: '+91 97654 32109',
    equipmentSerialNumber: 'SDP-440-2025-01',
    equipmentModel: 'Servo Drive Automation Control Panel 440V',
    ticketType: ServiceTicketType.InstallationCommissioning,
    priority: ServiceTicketPriority.High,
    status: ServiceTicketStatus.Assigned,
    issueDescription:
      'Site erection completed. Site engineer needed for wiring sign-off and PLC dry run.',
    assignedFieldEngineer: 'Kavita Iyer (Automation Systems Eng)',
    scheduledVisitDateUtc: new Date(Date.now() + 24 * 3600_000).toISOString(),
    totalSparesCostInPaise: 0,
    creationTime: new Date(Date.now() - 12 * 3600_000).toISOString(),
    sparesConsumed: [],
  },
];

@Component({
  selector: 'app-field-service-tickets',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    DecimalPipe,
    ArTopbar,
    ArButton,
    ArChip,
    ArDialog,
    ArGrid,
    GridModule,
    RouterLink,
  ],
  template: `
    <ar-topbar title="Field Service & Breakdown Tickets (Field ERP)">
      <div actions class="topbar-actions">
        <a ar-button="primary" routerLink="/field-service/tickets/new">+ Raise Service Ticket</a>
      </div>
    </ar-topbar>

    <div class="page-content">
      <!-- KPI Row -->
      <section class="kpi-grid">
        <div class="kpi-card">
          <span class="label">Total Open Tickets</span>
          <strong class="value">{{ stats().openCount }}</strong>
          <span class="sub">Active service requests</span>
        </div>
        <div class="kpi-card bad">
          <span class="label">Critical Emergencies</span>
          <strong class="value">{{ stats().criticalCount }}</strong>
          <span class="sub">Production halt / High SLA penalty</span>
        </div>
        <div class="kpi-card teal">
          <span class="label">Resolved & Closed</span>
          <strong class="value">{{ stats().resolvedCount }}</strong>
          <span class="sub">Customer signoff secured</span>
        </div>
        <div class="kpi-card">
          <span class="label">Total Spares Consumed</span>
          <strong class="value">₹{{ stats().totalSparesCostPaise / 100 | number: '1.2-2' }}</strong>
          <span class="sub">Warranty & billable parts</span>
        </div>
      </section>

      <!-- Filter bar -->
      <section class="filter-bar">
        <div class="search-box">
          <input
            type="search"
            class="input-search"
            placeholder="Search Ticket #, Customer, Serial #, Engineer..."
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
            All ({{ tickets().length }})
          </button>
          <button
            class="chip-filter"
            [class.active]="statusFilter() === ServiceTicketStatus.InProgress.toString()"
            (click)="statusFilter.set(ServiceTicketStatus.InProgress.toString())"
          >
            In Progress
          </button>
          <button
            class="chip-filter"
            [class.active]="statusFilter() === ServiceTicketStatus.Assigned.toString()"
            (click)="statusFilter.set(ServiceTicketStatus.Assigned.toString())"
          >
            Assigned / Transit
          </button>
          <button
            class="chip-filter"
            [class.active]="statusFilter() === ServiceTicketStatus.Resolved.toString()"
            (click)="statusFilter.set(ServiceTicketStatus.Resolved.toString())"
          >
            Resolved
          </button>
        </div>
      </section>

      <!-- Main Layout: Tickets Table & Ticket Cockpit -->
      <div class="tickets-layout">
        <!-- Tickets Table -->
        <section class="table-card">
          <ejs-grid
            arGrid="field-service-tickets"
            [dataSource]="filteredTickets()"
            [allowSelection]="true"
            [selectionSettings]="{ mode: 'Row', type: 'Single' }"
            (rowSelected)="onTicketSelected($event)"
            (recordClick)="onTicketClick($event)"
            aria-label="Service tickets"
          >
            <e-columns>
              <e-column field="ticketNumber" headerText="Ticket #" width="160">
                <ng-template #template let-t>
                  <div class="ticket-ref">
                    <span class="fw-bold">{{ t.ticketNumber }}</span>
                    <span class="ticket-time">{{ t.creationTime | date: 'short' }}</span>
                  </div>
                </ng-template>
              </e-column>
              <e-column field="customerName" headerText="Customer & Site" width="220">
                <ng-template #template let-t>
                  <div class="client-info">
                    <span class="client-name">{{ t.customerName }}</span>
                    <span class="client-phone" *ngIf="t.customerContactPhone"
                      >&#9742; {{ t.customerContactPhone }}</span
                    >
                  </div>
                </ng-template>
              </e-column>
              <e-column field="ticketType" headerText="Type & Priority" width="160">
                <ng-template #template let-t>
                  <div class="type-priority">
                    <span class="type-tag">{{ getTicketTypeLabel(t.ticketType) }}</span>
                    <ar-chip [tone]="getPriorityTone(t.priority)">
                      {{ getPriorityLabel(t.priority) }}
                    </ar-chip>
                  </div>
                </ng-template>
              </e-column>
              <e-column field="equipmentSerialNumber" headerText="Machine & Serial" width="200">
                <ng-template #template let-t>
                  <div class="machine-info">
                    <span class="serial-badge">{{ t.equipmentSerialNumber }}</span>
                    <span class="model-name">{{ t.equipmentModel }}</span>
                  </div>
                </ng-template>
              </e-column>
              <e-column field="assignedFieldEngineer" headerText="Assigned Engineer" width="180">
                <ng-template #template let-t>
                  <span class="eng-text">{{ t.assignedFieldEngineer || 'Unassigned' }}</span>
                </ng-template>
              </e-column>
              <e-column field="status" headerText="Status" width="130">
                <ng-template #template let-t>
                  <ar-chip [tone]="getStatusTone(t.status)">
                    {{ getStatusLabel(t.status) }}
                  </ar-chip>
                </ng-template>
              </e-column>
            </e-columns>
          </ejs-grid>
        </section>

        <!-- Right Cockpit: Detail, Spares, Resolution -->
        <section class="detail-cockpit" *ngIf="selectedTicket() as ticket">
          <div class="cockpit-header">
            <div>
              <div class="cockpit-title-row">
                <h3>{{ ticket.ticketNumber }}</h3>
                <ar-chip [tone]="getPriorityTone(ticket.priority)">{{
                  getPriorityLabel(ticket.priority)
                }}</ar-chip>
                <ar-chip [tone]="getStatusTone(ticket.status)">{{
                  getStatusLabel(ticket.status)
                }}</ar-chip>
              </div>
              <p class="cockpit-sub">
                Customer: <strong>{{ ticket.customerName }}</strong> &bull;
                {{ ticket.equipmentModel }} ({{ ticket.equipmentSerialNumber }})
              </p>
              <p class="cockpit-addr" *ngIf="ticket.customerSiteAddress">
                Plant Location: {{ ticket.customerSiteAddress }}
              </p>
            </div>
            <div class="cockpit-actions">
              <a
                *ngIf="
                  ticket.status === ServiceTicketStatus.Open ||
                  ticket.status === ServiceTicketStatus.Assigned
                "
                ar-button="ghost"
                [routerLink]="['/field-service/tickets', ticket.id, 'assign']"
              >
                Assign Engineer
              </a>
              <button
                *ngIf="
                  ticket.status === ServiceTicketStatus.InProgress ||
                  ticket.status === ServiceTicketStatus.Assigned ||
                  ticket.status === ServiceTicketStatus.InTransit
                "
                ar-button="primary"
                (click)="openResolveModal(ticket)"
              >
                Resolve Ticket
              </button>
            </div>
          </div>

          <!-- Problem & Diagnosis Section -->
          <div class="problem-box">
            <span class="box-lbl">Reported Problem / Breakdown Symptom</span>
            <p class="box-desc">{{ ticket.issueDescription }}</p>
            <div class="rca-box" *ngIf="ticket.rootCauseAnalysis">
              <strong>Root Cause:</strong> {{ ticket.rootCauseAnalysis }}
            </div>
            <div class="sol-box" *ngIf="ticket.resolutionSummary">
              <strong>Resolution:</strong> {{ ticket.resolutionSummary }}
            </div>
          </div>

          <!-- Spares Consumed Section -->
          <div class="spares-section">
            <div class="spares-header">
              <h4>Consumed Spare Parts</h4>
              <div class="spares-header-actions">
                <span class="spares-total">
                  Total: ₹{{ ticket.totalSparesCostInPaise / 100 | number: '1.2-2' }}
                </span>
                <a
                  *ngIf="
                    ticket.status !== ServiceTicketStatus.Resolved &&
                    ticket.status !== ServiceTicketStatus.Closed
                  "
                  ar-button="ghost"
                  [routerLink]="['/field-service/tickets', ticket.id, 'spares']"
                >
                  + Add Spare Part
                </a>
              </div>
            </div>

            <ejs-grid
              arGrid="ticket-spares-consumed"
              [dataSource]="ticket.sparesConsumed"
              aria-label="Spare Parts Consumed"
            >
              <e-columns>
                <e-column field="partNumber" headerText="Part #" width="150">
                  <ng-template #template let-sp>
                    <span class="fw-bold">{{ sp.partNumber }}</span>
                  </ng-template>
                </e-column>
                <e-column field="description" headerText="Description" width="220"></e-column>
                <e-column field="quantity" headerText="Qty" width="90" [textAlign]="'Right'"></e-column>
                <e-column headerText="Unit Price (₹)" width="130" [textAlign]="'Right'">
                  <ng-template #template let-sp>
                    ₹{{ sp.unitPriceInPaise / 100 | number: '1.2-2' }}
                  </ng-template>
                </e-column>
                <e-column headerText="Billing" width="160">
                  <ng-template #template let-sp>
                    <span class="billable-pill" [class.warranty]="!sp.isBillableToCustomer">
                      {{ sp.isBillableToCustomer ? 'Billable to Client' : 'AMC / Warranty' }}
                    </span>
                  </ng-template>
                </e-column>
                <e-column headerText="Total (₹)" width="130" [textAlign]="'Right'">
                  <ng-template #template let-sp>
                    <span class="fw-bold">₹{{ sp.lineTotalInPaise / 100 | number: '1.2-2' }}</span>
                  </ng-template>
                </e-column>
              </e-columns>
            </ejs-grid>
          </div>

          <!-- Customer Signoff & CSAT (if resolved) -->
          <div class="signoff-box" *ngIf="ticket.customerSignoffName">
            <div class="signoff-item">
              <span class="lbl">Customer Representative Signoff</span>
              <strong>{{ ticket.customerSignoffName }}</strong>
            </div>
            <div class="signoff-item" *ngIf="ticket.customerSatisfactionRating">
              <span class="lbl">CSAT Rating</span>
              <span class="stars"
                >&#9733;&#9733;&#9733;&#9733;&#9733; ({{
                  ticket.customerSatisfactionRating
                }}/5)</span
              >
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- Resolve Ticket Dialog -->
    <ar-dialog
      *ngIf="isResolveOpen()"
      title="Resolve Ticket & Customer Signoff"
      (dismiss)="isResolveOpen.set(false)"
    >
      <div class="modal-body-container" *ngIf="selectedTicket() as ticket">
        <p class="mb-3">
          Closing ticket <strong>{{ ticket.ticketNumber }}</strong> after resolving breakdown.
        </p>

        <div class="form-group full-width">
          <label>Root Cause Analysis (RCA)</label>
          <textarea
            class="form-control"
            rows="2"
            [(ngModel)]="resolveForm.rootCauseAnalysis"
            placeholder="Detailed technical cause of machine fault..."
          ></textarea>
        </div>

        <div class="form-group full-width mt-3">
          <label>Resolution Summary & Actions Taken</label>
          <textarea
            class="form-control"
            rows="2"
            [(ngModel)]="resolveForm.resolutionSummary"
            placeholder="Replaced valve spool, flushed circuit, restored 350 bar test pressure..."
          ></textarea>
        </div>

        <div class="form-grid mt-3">
          <div class="form-group">
            <label>Customer Representative Name</label>
            <input
              type="text"
              class="form-control"
              [(ngModel)]="resolveForm.customerSignoffName"
              placeholder="Client Signatory"
            />
          </div>
          <div class="form-group">
            <label>Customer Satisfaction Rating (1 to 5 Stars)</label>
            <select class="form-control" [(ngModel)]="resolveForm.customerSatisfactionRating">
              <option [ngValue]="5">5 - Excellent (Fast resolution)</option>
              <option [ngValue]="4">4 - Good</option>
              <option [ngValue]="3">3 - Satisfactory</option>
              <option [ngValue]="2">2 - Poor</option>
              <option [ngValue]="1">1 - Unsatisfactory</option>
            </select>
          </div>
        </div>

        <div class="dialog-actions mt-4">
          <button ar-button="primary" (click)="resolveTicket()">Resolve & Close Ticket</button>
          <button ar-button="ghost" (click)="isResolveOpen.set(false)">Cancel</button>
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

        &.bad {
          border-left: 4px solid #ef4444;
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

      .tickets-layout {
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

      .ticket-ref {
        display: flex;
        flex-direction: column;

        .ticket-time {
          font-size: 0.72rem;
          color: #64748b;
        }
      }

      .client-info {
        display: flex;
        flex-direction: column;

        .client-name {
          font-weight: 600;
          color: #0f172a;
        }

        .client-phone {
          font-size: 0.75rem;
          color: #0369a1;
        }
      }

      .type-priority {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;

        .type-tag {
          font-size: 0.72rem;
          color: #475569;
          font-weight: 500;
        }
      }

      .machine-info {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;

        .serial-badge {
          font-size: 0.72rem;
          background: #e0f2fe;
          color: #0369a1;
          padding: 1px 5px;
          border-radius: 3px;
          width: fit-content;
        }

        .model-name {
          font-size: 0.75rem;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 140px;
        }
      }

      .eng-text {
        font-size: 0.8rem;
        color: #334155;
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
          gap: 0.6rem;

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

        .cockpit-addr {
          margin: 0.2rem 0 0 0;
          font-size: 0.78rem;
          color: #64748b;
        }

        .cockpit-actions {
          display: flex;
          gap: 0.5rem;
        }
      }

      .problem-box {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        .box-lbl {
          font-size: 0.75rem;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 600;
        }

        .box-desc {
          margin: 0;
          font-size: 0.875rem;
          color: #1e293b;
          line-height: 1.4;
        }

        .rca-box,
        .sol-box {
          font-size: 0.8rem;
          color: #334155;
          padding-top: 0.4rem;
          border-top: 1px dashed #cbd5e1;
        }
      }

      .spares-section {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;

        .spares-header {
          display: flex;
          justify-content: space-between;
          align-items: center;

          h4 {
            margin: 0;
            font-size: 0.95rem;
            color: #1e293b;
          }

          .spares-header-actions {
            display: flex;
            align-items: center;
            gap: 0.75rem;

            .spares-total {
              font-size: 0.85rem;
              font-weight: 700;
              color: #16a34a;
            }
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

      .billable-pill {
        font-size: 0.72rem;
        padding: 2px 6px;
        border-radius: 3px;
        background: #fee2e2;
        color: #b91c1c;
        font-weight: 500;

        &.warranty {
          background: #dcfce7;
          color: #15803d;
        }
      }

      .signoff-box {
        display: flex;
        justify-content: space-between;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        padding: 0.75rem 1rem;
        border-radius: 6px;

        .signoff-item {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;

          .lbl {
            font-size: 0.72rem;
            text-transform: uppercase;
            color: #166534;
            font-weight: 600;
          }

          .stars {
            color: #f59e0b;
            font-weight: 700;
          }
        }
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
export class FieldServiceTicketsComponent {
  private readonly ticketService = inject(FieldServiceTicketService);

  readonly tickets = signal<FieldServiceTicketDto[]>(MOCK_SERVICE_TICKETS);
  readonly selectedTicket = signal<FieldServiceTicketDto | null>(MOCK_SERVICE_TICKETS[0]);
  readonly isLoading = signal<boolean>(false);

  // Filters
  /** Starts from `?q=` (Customer 360 links here for one customer). */
  readonly searchQuery = signal<string>(initialSearch());
  readonly statusFilter = signal<string>('ALL');

  // Dialogs
  readonly isCreateOpen = signal<boolean>(false);
  readonly isResolveOpen = signal<boolean>(false);

  newTicket: CreateFieldServiceTicketDto = {
    ticketNumber: '',
    customerId: 'cust-1',
    customerName: '',
    customerSiteAddress: '',
    customerContactPhone: '',
    equipmentSerialNumber: '',
    equipmentModel: '',
    ticketType: ServiceTicketType.Breakdown,
    priority: ServiceTicketPriority.High,
    issueDescription: '',
  };

  resolveForm: ResolveFieldServiceTicketDto = {
    rootCauseAnalysis: '',
    resolutionSummary: '',
    customerSignoffName: '',
    customerSatisfactionRating: 5,
  };

  readonly filteredTickets = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const sf = this.statusFilter();

    return this.tickets().filter((t) => {
      if (sf !== 'ALL' && t.status.toString() !== sf) return false;
      if (!q) return true;

      return (
        t.ticketNumber.toLowerCase().includes(q) ||
        t.customerName.toLowerCase().includes(q) ||
        t.equipmentSerialNumber.toLowerCase().includes(q) ||
        (t.assignedFieldEngineer && t.assignedFieldEngineer.toLowerCase().includes(q))
      );
    });
  });

  readonly stats = computed(() => {
    const list = this.tickets();
    const openCount = list.filter(
      (t) => t.status !== ServiceTicketStatus.Resolved && t.status !== ServiceTicketStatus.Closed,
    ).length;
    const criticalCount = list.filter(
      (t) =>
        t.priority === ServiceTicketPriority.CriticalEmergency &&
        t.status !== ServiceTicketStatus.Closed,
    ).length;
    const resolvedCount = list.filter(
      (t) => t.status === ServiceTicketStatus.Resolved || t.status === ServiceTicketStatus.Closed,
    ).length;
    const totalSparesCostPaise = list.reduce((acc, t) => acc + (t.totalSparesCostInPaise || 0), 0);

    return {
      openCount,
      criticalCount,
      resolvedCount,
      totalSparesCostPaise,
    };
  });

  readonly ServiceTicketStatus = ServiceTicketStatus;
  readonly ServiceTicketPriority = ServiceTicketPriority;
  readonly ServiceTicketType = ServiceTicketType;

  constructor() {
    this.loadTickets();
  }

  loadTickets(): void {
    if (environment.useMockData) return;

    this.isLoading.set(true);
    this.ticketService.getList({ maxResultCount: 100 }).subscribe({
      next: (res) => {
        this.tickets.set(res.items || []);
        if (res.items && res.items.length > 0) {
          this.selectedTicket.set(res.items[0]);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  selectTicket(t: FieldServiceTicketDto): void {
    this.selectedTicket.set(t);
  }

  onTicketSelected(args: RowSelectEventArgs): void {
    const row = (Array.isArray(args.data) ? args.data[0] : args.data) as
      | FieldServiceTicketDto
      | undefined;
    if (row) this.selectTicket(row);
  }

  onTicketClick(args: RecordClickEventArgs): void {
    const row = args.rowData as FieldServiceTicketDto | undefined;
    if (row) this.selectTicket(row);
  }

  getStatusTone(status: ServiceTicketStatus): ChipTone {
    switch (status) {
      case ServiceTicketStatus.Open:
        return 'neutral';
      case ServiceTicketStatus.Assigned:
      case ServiceTicketStatus.InTransit:
        return 'teal';
      case ServiceTicketStatus.InProgress:
        return 'amber';
      case ServiceTicketStatus.AwaitingSpares:
        return 'warn';
      case ServiceTicketStatus.Resolved:
      case ServiceTicketStatus.Closed:
        return 'good';
      default:
        return 'neutral';
    }
  }

  getStatusLabel(status: ServiceTicketStatus): string {
    switch (status) {
      case ServiceTicketStatus.Open:
        return 'Open';
      case ServiceTicketStatus.Assigned:
        return 'Assigned';
      case ServiceTicketStatus.InTransit:
        return 'In Transit';
      case ServiceTicketStatus.InProgress:
        return 'In Progress';
      case ServiceTicketStatus.AwaitingSpares:
        return 'Awaiting Spares';
      case ServiceTicketStatus.Resolved:
        return 'Resolved';
      case ServiceTicketStatus.Closed:
        return 'Closed';
      default:
        return 'Unknown';
    }
  }

  getPriorityTone(priority: ServiceTicketPriority): ChipTone {
    switch (priority) {
      case ServiceTicketPriority.CriticalEmergency:
        return 'bad';
      case ServiceTicketPriority.High:
        return 'warn';
      case ServiceTicketPriority.Medium:
        return 'amber';
      case ServiceTicketPriority.Low:
        return 'neutral';
      default:
        return 'neutral';
    }
  }

  getPriorityLabel(priority: ServiceTicketPriority): string {
    switch (priority) {
      case ServiceTicketPriority.CriticalEmergency:
        return 'Critical';
      case ServiceTicketPriority.High:
        return 'High';
      case ServiceTicketPriority.Medium:
        return 'Medium';
      case ServiceTicketPriority.Low:
        return 'Low';
      default:
        return 'Normal';
    }
  }

  getTicketTypeLabel(type: ServiceTicketType): string {
    switch (type) {
      case ServiceTicketType.Breakdown:
        return 'Breakdown';
      case ServiceTicketType.PreventiveMaintenance:
        return 'Preventive Maint.';
      case ServiceTicketType.InstallationCommissioning:
        return 'Install & Comm.';
      case ServiceTicketType.Calibration:
        return 'Calibration';
      default:
        return 'Service';
    }
  }

  openCreate(): void {
    const nextSeq = this.tickets().length + 1;
    this.newTicket = {
      ticketNumber: `FST-2026-${String(nextSeq + 105).padStart(4, '0')}`,
      customerId: 'cust-1',
      customerName: '',
      customerSiteAddress: '',
      customerContactPhone: '',
      equipmentSerialNumber: '',
      equipmentModel: '',
      ticketType: ServiceTicketType.Breakdown,
      priority: ServiceTicketPriority.High,
      issueDescription: '',
    };
    this.isCreateOpen.set(true);
  }

  createTicket(): void {
    if (!this.newTicket.customerName || !this.newTicket.issueDescription) return;

    if (!environment.useMockData) {
      this.ticketService.create(this.newTicket).subscribe({
        next: (created) => {
          this.tickets.update((list) => [created, ...list]);
          this.selectedTicket.set(created);
          this.isCreateOpen.set(false);
        },
      });
      return;
    }

    const created: FieldServiceTicketDto = {
      id: `fst-${Date.now()}`,
      ticketNumber: this.newTicket.ticketNumber || 'FST-2026-0199',
      customerId: this.newTicket.customerId,
      customerName: this.newTicket.customerName,
      customerSiteAddress: this.newTicket.customerSiteAddress,
      customerContactPhone: this.newTicket.customerContactPhone,
      equipmentSerialNumber: this.newTicket.equipmentSerialNumber,
      equipmentModel: this.newTicket.equipmentModel,
      ticketType: this.newTicket.ticketType,
      priority: this.newTicket.priority,
      status: ServiceTicketStatus.Open,
      issueDescription: this.newTicket.issueDescription,
      totalSparesCostInPaise: 0,
      creationTime: new Date().toISOString(),
      sparesConsumed: [],
    };

    this.tickets.update((list) => [created, ...list]);
    this.selectedTicket.set(created);
    this.isCreateOpen.set(false);
  }

  openResolveModal(ticket: FieldServiceTicketDto): void {
    this.resolveForm = {
      rootCauseAnalysis:
        ticket.rootCauseAnalysis || 'Machine wear and seal deterioration under operating pressure.',
      resolutionSummary:
        ticket.resolutionSummary ||
        'Replaced defective components, performed system flush and verified 350 bar test run.',
      customerSignoffName: ticket.customerSignoffName || 'Customer Plant In-Charge',
      customerSatisfactionRating: 5,
    };
    this.isResolveOpen.set(true);
  }

  resolveTicket(): void {
    const sel = this.selectedTicket();
    if (!sel) return;

    if (!environment.useMockData && sel.id) {
      this.ticketService.resolve(sel.id, this.resolveForm).subscribe({
        next: (updated) => {
          this.updateTicketInState(updated);
          this.isResolveOpen.set(false);
        },
      });
      return;
    }

    const updated: FieldServiceTicketDto = {
      ...sel,
      status: ServiceTicketStatus.Resolved,
      rootCauseAnalysis: this.resolveForm.rootCauseAnalysis,
      resolutionSummary: this.resolveForm.resolutionSummary,
      customerSignoffName: this.resolveForm.customerSignoffName,
      customerSatisfactionRating: Number(this.resolveForm.customerSatisfactionRating),
    };

    this.updateTicketInState(updated);
    this.isResolveOpen.set(false);
  }

  private updateTicketInState(updated: FieldServiceTicketDto): void {
    this.tickets.update((list) => list.map((t) => (t.id === updated.id ? updated : t)));
    this.selectedTicket.set(updated);
  }
}
