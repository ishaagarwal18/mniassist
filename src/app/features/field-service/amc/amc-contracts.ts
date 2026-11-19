import { PermissionService } from '@abp/ng.core';
import { grantedPolicy } from '../../../core/auth/permission';
import { ConfirmService } from '../../../core/ui/confirm.service';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  GridModule,
  RecordClickEventArgs,
  RowSelectEventArgs,
} from '@syncfusion/ej2-angular-grids';
import { ArTopbar } from '../../../layout/topbar';
import {
  AmcContractDto,
  AmcContractService,
  AmcContractType,
  AmcStatus,
} from '../../../proxy/field-service';
import { ArBanner, ArButton, ArChip, ChipTone } from '../../../ui';
import { readApiError } from '../../../core/util/api-error';
import { ArGrid } from '../../../ui/grid';
import { initialSearch } from '../../../core/util/customer-scope';

@Component({
  selector: 'app-amc-contracts',
  standalone: true,
  imports: [
    ArBanner,
    CommonModule,
    FormsModule,
    DatePipe,
    DecimalPipe,
    ArTopbar,
    ArButton,
    ArChip,
    ArGrid,
    GridModule,
    RouterLink,
  ],
  template: `
    <ar-topbar
      help="Every annual maintenance contract with its planned visits, response time and renewal date."
      title="Installed Base AMC Contracts"
      subtitle="Annual maintenance agreements, SLA compliance tracking & scheduled PM visits"
    >
      <div class="topbar-actions">
        <a *ngIf="canCreate()" ar-button="primary" routerLink="/field-service/amc/new"
          >+ Create AMC Contract</a
        >
      </div>
    </ar-topbar>

    <div class="page-content">
      @if (loadError(); as e) {
        <ar-banner tone="bad">{{ e }}</ar-banner>
      }
      <!-- KPI Stats Summary Row -->
      <section class="kpi-grid">
        <div class="kpi-card">
          <span class="label">Active Contracts</span>
          <strong class="value">{{ stats().activeCount }}</strong>
          <span class="sub">Installed base equipment covered</span>
        </div>
        <div class="kpi-card teal">
          <span class="label">Annual Contract Value (ACV)</span>
          <strong class="value">₹{{ stats().totalAcvPaise / 100 | number: '1.2-2' }}</strong>
          <span class="sub">Recurring maintenance revenue</span>
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

      <!-- Filter bar: Search & Status Chips -->
      <section class="filter-bar">
        <div class="search-box">
          <input
            type="search"
            class="input-search"
            placeholder="Search contract #, customer, serial #, or machine model..."
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
            All ({{ contracts().length }})
          </button>
          <button
            type="button"
            class="chip-filter"
            [class.active]="statusFilter() === AmcStatus.Active.toString()"
            (click)="statusFilter.set(AmcStatus.Active.toString())"
          >
            Active
          </button>
          <button
            type="button"
            class="chip-filter"
            [class.active]="statusFilter() === AmcStatus.ExpiringSoon.toString()"
            (click)="statusFilter.set(AmcStatus.ExpiringSoon.toString())"
          >
            Expiring Soon
          </button>
          <button
            type="button"
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
        <!-- Table Column -->
        <section class="table-card">
          <ejs-grid
            arGrid="amc-contracts"
            [dataSource]="filteredContracts()"
            [allowSelection]="true"
            [selectionSettings]="{ mode: 'Row', type: 'Single' }"
            (rowSelected)="onContractSelected($event)"
            (recordClick)="onContractClick($event)"
            aria-label="AMC contracts"
          >
            <e-columns>
              <e-column field="contractNumber" headerText="Contract #" width="135">
                <ng-template #template let-c>
                  <span class="fw-bold text-primary-dark font-mono">{{ c.contractNumber }}</span>
                </ng-template>
              </e-column>
              <e-column field="customerName" headerText="Customer & Site" width="180">
                <ng-template #template let-c>
                  <div class="client-info">
                    <span class="client-name">{{ c.customerName }}</span>
                    <span
                      class="client-addr"
                      *ngIf="c.customerSiteAddress"
                      [title]="c.customerSiteAddress"
                    >
                      {{ c.customerSiteAddress }}
                    </span>
                  </div>
                </ng-template>
              </e-column>
              <e-column field="equipmentSerialNumber" headerText="Equipment" width="165">
                <ng-template #template let-c>
                  <div class="equip-info">
                    <span class="serial-badge">{{ c.equipmentSerialNumber }}</span>
                    <span class="model-name" [title]="c.equipmentModel">{{
                      c.equipmentModel
                    }}</span>
                  </div>
                </ng-template>
              </e-column>
              <e-column field="contractType" headerText="Type" width="115">
                <ng-template #template let-c>
                  <span class="type-pill">{{ getContractTypeLabel(c.contractType) }}</span>
                </ng-template>
              </e-column>
              <e-column field="visitsCompleted" headerText="Visits / SLA" width="115">
                <ng-template #template let-c>
                  <div class="visit-metric">
                    <span class="fw-semibold"
                      >{{ c.visitsCompleted }}/{{ c.scheduledVisitsPerYear }} PMs</span
                    >
                    <span class="text-sub">SLA {{ c.slaResponseHours }}h</span>
                  </div>
                </ng-template>
              </e-column>
              <e-column
                field="contractValueInPaise"
                headerText="ACV (₹)"
                textAlign="Right"
                width="115"
              >
                <ng-template #template let-c>
                  <span class="fw-bold text-success"
                    >₹{{ c.contractValueInPaise / 100 | number: '1.2-2' }}</span
                  >
                </ng-template>
              </e-column>
              <e-column field="status" headerText="Status" width="115">
                <ng-template #template let-c>
                  <ar-chip [tone]="getStatusTone(c.status)">{{ getStatusLabel(c.status) }}</ar-chip>
                </ng-template>
              </e-column>
            </e-columns>
          </ejs-grid>
        </section>

        <!-- Right Cockpit: Contract Detail & Schedules -->
        <section class="detail-cockpit" *ngIf="selectedContract() as contract">
          <!-- Cockpit Header -->
          <div class="cockpit-header">
            <div class="cockpit-main-info">
              <div class="cockpit-title-row">
                <h3>{{ contract.contractNumber }}</h3>
                <ar-chip [tone]="getStatusTone(contract.status)">{{
                  getStatusLabel(contract.status)
                }}</ar-chip>
                <span class="type-pill">{{ getContractTypeLabel(contract.contractType) }}</span>
              </div>
              <p class="cockpit-sub">
                Customer: <strong>{{ contract.customerName }}</strong>
              </p>
              <p
                class="cockpit-site"
                *ngIf="contract.customerSiteAddress"
                [title]="contract.customerSiteAddress"
              >
                <span class="site-icon">📍</span> {{ contract.customerSiteAddress }}
              </p>
            </div>
            <div class="cockpit-actions">
              <a
                *ngIf="
                  canRenew() &&
                  (contract.status === AmcStatus.Active ||
                    contract.status === AmcStatus.ExpiringSoon)
                "
                ar-button="primary"
                [routerLink]="['/field-service/amc/renew', contract.id]"
              >
                Renew Contract
              </a>
              @if (
                canTerminate() &&
                (contract.status === AmcStatus.Active || contract.status === AmcStatus.ExpiringSoon)
              ) {
                <button
                  ar-button="ghost"
                  type="button"
                  [disabled]="terminating()"
                  (click)="terminate(contract)"
                >
                  Terminate
                </button>
              }
            </div>
          </div>

          <!-- Machine Specifications & SLA Info Grid -->
          <div class="contract-overview-cards">
            <div class="ov-item">
              <span class="lbl">Equipment Serial & Model</span>
              <strong class="val val-serial">{{ contract.equipmentSerialNumber }}</strong>
              <span class="sub-desc" [title]="contract.equipmentModel">{{
                contract.equipmentModel
              }}</span>
            </div>
            <div class="ov-item">
              <span class="lbl">SLA & Coverage</span>
              <strong class="val text-primary-dark"
                >{{ contract.slaResponseHours }}h On-Site SLA</strong
              >
              <span class="sub-desc">{{
                contract.sparesIncluded
                  ? 'Spares Included (Comprehensive)'
                  : 'Spares Billed Separately'
              }}</span>
            </div>
            <div class="ov-item">
              <span class="lbl">Contract Period</span>
              <span class="val-date">
                {{ contract.startDateUtc | date: 'dd MMM yyyy' }} –
                {{ contract.endDateUtc | date: 'dd MMM yyyy' }}
              </span>
              <span class="sub-desc">Annual Service Agreement</span>
            </div>
            <div class="ov-item">
              <span class="lbl">Annual Value (ACV)</span>
              <strong class="val text-success">
                ₹{{ contract.contractValueInPaise / 100 | number: '1.2-2' }}
              </strong>
              <span class="sub-desc"
                >{{ contract.scheduledVisitsPerYear }} Scheduled PM Visits / Yr</span
              >
            </div>
          </div>

          <!-- Remarks / Scope Notes -->
          <div class="contract-notes" *ngIf="contract.remarks">
            <span class="notes-lbl">Service Scope & Terms</span>
            <p class="notes-text">{{ contract.remarks }}</p>
          </div>

          <!-- Preventive Maintenance (PM) Visits Schedule Table -->
          <div class="schedules-section">
            <div class="schedules-header">
              <div class="schedules-title-group">
                <h4>Preventive Maintenance (PM) Visits Calendar</h4>
                <span class="badge-count"
                  >{{ contract.visitsCompleted }} of {{ contract.schedules.length }} Completed</span
                >
              </div>
            </div>

            <!-- Responsive Visit Schedule Table -->
            <div class="schedules-table-container">
              <table class="schedule-table">
                <thead>
                  <tr>
                    <th>Visit</th>
                    <th>Scheduled Date</th>
                    <th>Completed Date</th>
                    <th>Assigned Engineer</th>
                    <th>Status & Findings</th>
                    <th class="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let s of contract.schedules" [class.row-completed]="s.isCompleted">
                    <td>
                      <div class="visit-num">
                        <span class="visit-dot" [class.dot-done]="s.isCompleted"></span>
                        <strong>Visit #{{ s.visitNumber }}</strong>
                      </div>
                    </td>
                    <td>
                      <span class="date-txt">{{ s.scheduledDateUtc | date: 'dd MMM yyyy' }}</span>
                    </td>
                    <td>
                      <span *ngIf="s.completedDateUtc" class="date-txt date-completed">
                        {{ s.completedDateUtc | date: 'dd MMM yyyy' }}
                      </span>
                      <span *ngIf="!s.completedDateUtc" class="text-muted">–</span>
                    </td>
                    <td>
                      <span class="eng-badge" *ngIf="s.assignedEngineer">{{
                        s.assignedEngineer
                      }}</span>
                      <span class="text-muted" *ngIf="!s.assignedEngineer">Unassigned</span>
                    </td>
                    <td>
                      <div class="status-cell">
                        <ar-chip [tone]="s.isCompleted ? 'good' : 'amber'">
                          {{ s.isCompleted ? 'Completed' : 'Pending' }}
                        </ar-chip>
                        <p class="visit-note" *ngIf="s.visitNotes" [title]="s.visitNotes">
                          {{ s.visitNotes }}
                        </p>
                      </div>
                    </td>
                    <td class="text-right">
                      <a
                        *ngIf="!s.isCompleted && canUpdate()"
                        ar-button="ghost"
                        class="btn-record-visit"
                        [routerLink]="['/field-service/amc/record-visit', contract.id, s.id]"
                      >
                        Record Visit
                      </a>
                      <span *ngIf="s.isCompleted" class="done-check"> ✓ Done </span>
                    </td>
                  </tr>
                  <tr *ngIf="!contract.schedules || contract.schedules.length === 0">
                    <td colspan="6" class="empty-schedule">
                      No PM visits scheduled for this contract yet.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-width: 0;
        max-width: 100%;
        width: 100%;
        overflow-x: hidden;
        box-sizing: border-box;
      }

      .page-content {
        flex: 1;
        min-width: 0;
        max-width: 100%;
        width: 100%;
        overflow-x: hidden;
        padding: 1.25rem 1.5rem 2.5rem;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .topbar-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      /* ── KPI Stats Grid ── */
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 1rem;
        width: 100%;
        box-sizing: border-box;
        min-width: 0;
      }

      @media (max-width: 1024px) {
        .kpi-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 560px) {
        .kpi-grid {
          grid-template-columns: minmax(0, 1fr);
        }
      }

      .kpi-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 1rem 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        min-width: 0;

        &.amber {
          border-left: 4px solid #f59e0b;
        }
        &.teal {
          border-left: 4px solid #0d9488;
        }

        .label {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #64748b;
          font-weight: 600;
        }

        .value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sub {
          font-size: 0.72rem;
          color: #94a3b8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }

      /* ── Filter bar ── */
      .filter-bar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.75rem;
        width: 100%;
        box-sizing: border-box;
        min-width: 0;
      }

      .search-box {
        flex: 1 1 260px;
        min-width: 0;

        .input-search {
          width: 100%;
          box-sizing: border-box;
          padding: 0.45rem 0.85rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.875rem;
          background: #fff;
          color: #1e293b;
          transition: border-color 0.15s;

          &:focus {
            outline: none;
            border-color: #0284c7;
          }
        }
      }

      .filter-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        min-width: 0;

        .chip-filter {
          padding: 0.32rem 0.85rem;
          font-size: 0.78rem;
          border-radius: 20px;
          border: 1px solid #cbd5e1;
          background: #fff;
          color: #475569;
          cursor: pointer;
          font-weight: 500;
          white-space: nowrap;
          transition: all 0.15s ease;

          &:hover {
            border-color: #94a3b8;
            background: #f8fafc;
          }

          &.active {
            background: #1e293b;
            color: #fff;
            border-color: #1e293b;
          }
        }
      }

      /* ── Main AMC Layout (Master-Detail) ── */
      .amc-layout {
        display: grid;
        grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
        gap: 1.25rem;
        align-items: start;
        width: 100%;
        box-sizing: border-box;
        min-width: 0;
      }

      @media (max-width: 1200px) {
        .amc-layout {
          grid-template-columns: minmax(0, 1fr);
        }
      }

      /* ── Table Card ── */
      .table-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        min-width: 0;
        max-width: 100%;
        width: 100%;
        box-sizing: border-box;
      }

      /* Grid cell styling */
      .client-info {
        display: flex;
        flex-direction: column;
        min-width: 0;
        gap: 0.1rem;

        .client-name {
          font-weight: 600;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .client-addr {
          font-size: 0.72rem;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }

      .equip-info {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        min-width: 0;

        .serial-badge {
          font-size: 0.72rem;
          font-weight: 700;
          background: #e0f2fe;
          color: #0369a1;
          padding: 1px 6px;
          border-radius: 4px;
          width: fit-content;
          font-family: var(--ar-font-mono, monospace);
        }

        .model-name {
          font-size: 0.75rem;
          color: #475569;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }

      .type-pill {
        font-size: 0.72rem;
        background: #f1f5f9;
        color: #334155;
        padding: 2px 7px;
        border-radius: 4px;
        font-weight: 600;
        white-space: nowrap;
      }

      .visit-metric {
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
        font-size: 0.78rem;

        .text-sub {
          font-size: 0.7rem;
          color: #64748b;
        }
      }

      /* ── Cockpit Detail Column ── */
      .detail-cockpit {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 1.15rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        min-width: 0;
        max-width: 100%;
        width: 100%;
        box-sizing: border-box;
        overflow: hidden;
      }

      .cockpit-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 0.75rem;
        flex-wrap: wrap;
        border-bottom: 1px solid #f1f5f9;
        padding-bottom: 1rem;
        min-width: 0;

        .cockpit-main-info {
          min-width: 0;
          flex: 1 1 240px;
        }

        .cockpit-title-row {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
          min-width: 0;

          h3 {
            margin: 0;
            font-size: 1.15rem;
            font-weight: 700;
            color: #0f172a;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }

        .cockpit-sub {
          margin: 0.35rem 0 0;
          font-size: 0.82rem;
          color: #475569;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cockpit-site {
          margin: 0.2rem 0 0;
          font-size: 0.76rem;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;

          .site-icon {
            font-size: 0.8rem;
          }
        }

        .cockpit-actions {
          display: flex;
          gap: 0.5rem;
          flex-shrink: 0;
        }
      }

      /* ── Overview cards ── */
      .contract-overview-cards {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.75rem;
        background: #f8fafc;
        padding: 0.85rem;
        border-radius: 6px;
        border: 1px solid #e2e8f0;
        min-width: 0;

        @media (max-width: 640px) {
          grid-template-columns: minmax(0, 1fr);
        }

        .ov-item {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          min-width: 0;

          .lbl {
            font-size: 0.68rem;
            text-transform: uppercase;
            color: #64748b;
            font-weight: 700;
            letter-spacing: 0.03em;
          }

          .val {
            font-size: 0.95rem;
            font-weight: 700;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;

            &.val-serial {
              color: #0284c7;
              font-family: var(--ar-font-mono, monospace);
            }
          }

          .val-date {
            font-size: 0.8rem;
            font-weight: 600;
            color: #1e293b;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .sub-desc {
            font-size: 0.72rem;
            color: #64748b;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }
      }

      /* ── Notes / terms block ── */
      .contract-notes {
        background: #fffbeb;
        border: 1px solid #fef3c7;
        border-radius: 6px;
        padding: 0.65rem 0.85rem;
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        min-width: 0;

        .notes-lbl {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #92400e;
          letter-spacing: 0.03em;
        }

        .notes-text {
          margin: 0;
          font-size: 0.78rem;
          color: #78350f;
          line-height: 1.4;
        }
      }

      /* ── PM Visit Schedule Section ── */
      .schedules-section {
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
        min-width: 0;
        overflow: hidden;

        .schedules-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;

          .schedules-title-group {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            flex-wrap: wrap;

            h4 {
              margin: 0;
              font-size: 0.92rem;
              font-weight: 700;
              color: #1e293b;
            }

            .badge-count {
              font-size: 0.72rem;
              background: #e2e8f0;
              padding: 2px 8px;
              border-radius: 10px;
              color: #475569;
              font-weight: 600;
            }
          }
        }
      }

      .schedules-table-container {
        width: 100%;
        overflow-x: auto;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        background: #fff;
        box-sizing: border-box;
      }

      .schedule-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.78rem;
        text-align: left;
        min-width: 520px;

        thead {
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;

          th {
            padding: 0.55rem 0.75rem;
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            color: #64748b;
            font-weight: 600;
            white-space: nowrap;

            &.text-right {
              text-align: right;
            }
          }
        }

        tbody {
          tr {
            border-bottom: 1px solid #f1f5f9;
            transition: background 0.12s;

            &:last-child {
              border-bottom: none;
            }

            &:hover {
              background: #f8fafc;
            }

            &.row-completed {
              background: #fafdfb;
            }
          }

          td {
            padding: 0.6rem 0.75rem;
            vertical-align: middle;

            &.text-right {
              text-align: right;
            }
          }
        }

        .visit-num {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          white-space: nowrap;

          .visit-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #cbd5e1;
            flex-shrink: 0;

            &.dot-done {
              background: #10b981;
            }
          }
        }

        .date-txt {
          color: #334155;
          white-space: nowrap;

          &.date-completed {
            color: #15803d;
            font-weight: 500;
          }
        }

        .eng-badge {
          background: #f1f5f9;
          color: #334155;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.72rem;
          font-weight: 500;
          white-space: nowrap;
        }

        .status-cell {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          min-width: 140px;

          .visit-note {
            margin: 0;
            font-size: 0.7rem;
            color: #64748b;
            line-height: 1.3;
            max-width: 220px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }

        .btn-record-visit {
          font-size: 0.74rem;
          padding: 3px 8px !important;
          white-space: nowrap;
        }

        .done-check {
          color: #16a34a;
          font-weight: 700;
          font-size: 0.78rem;
          white-space: nowrap;
        }

        .empty-schedule {
          text-align: center;
          padding: 1.5rem;
          color: #94a3b8;
        }
      }

      /* Helper classes */
      .fw-bold {
        font-weight: 700;
      }
      .fw-semibold {
        font-weight: 600;
      }
      .font-mono {
        font-family: var(--ar-font-mono, monospace);
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
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmcContractsComponent {
  private readonly permissionGate = inject(PermissionService);
  protected readonly canCreate = grantedPolicy(
    'AutoReach.AmcContracts.Create',
    this.permissionGate,
  );
  protected readonly canRenew = grantedPolicy('AutoReach.AmcContracts.Renew', this.permissionGate);
  protected readonly canUpdate = grantedPolicy(
    'AutoReach.AmcContracts.Update',
    this.permissionGate,
  );
  private readonly amcService = inject(AmcContractService);
  private readonly confirmDialogs = inject(ConfirmService);
  readonly canTerminate = grantedPolicy('AutoReach.AmcContracts.Cancel', inject(PermissionService));
  readonly terminating = signal(false);

  /** Ends a contract early: no more visits are planned under it, and it stays on record. */
  async terminate(c: AmcContractDto): Promise<void> {
    if (
      !(await this.confirmDialogs.confirm({
        title: `Terminate ${c.contractNumber}?`,
        message: 'No more visits are planned under it. The contract stays on record as terminated.',
        confirmText: 'Terminate',
        cancelText: 'Keep it',
        tone: 'danger',
      }))
    )
      return;
    this.terminating.set(true);
    this.amcService.terminate(c.id!).subscribe({
      next: (saved) => {
        this.terminating.set(false);
        this.contracts.update((list) => list.map((x) => (x.id === saved.id ? saved : x)));
        this.selectedContract.set(saved);
      },
      error: () => this.terminating.set(false),
    });
  }

  readonly contracts = signal<AmcContractDto[]>([]);
  readonly selectedContract = signal<AmcContractDto | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly isLoading = signal<boolean>(false);

  // Filters
  /** Starts from `?q=` (Customer 360 links here for one customer). */
  readonly searchQuery = signal<string>(initialSearch());
  readonly statusFilter = signal<string>('ALL');

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
    this.isLoading.set(true);
    this.amcService.getList({ maxResultCount: 100 }).subscribe({
      next: (res) => {
        this.contracts.set(res.items || []);
        if (res.items && res.items.length > 0) {
          this.selectedContract.set(res.items[0]);
        }
        this.isLoading.set(false);
      },
      error: (e: unknown) => {
        this.loadError.set(readApiError(e, 'The AMC contracts could not be loaded.'));
        this.isLoading.set(false);
      },
    });
  }

  selectContract(c: AmcContractDto): void {
    this.selectedContract.set(c);
  }

  onContractSelected(args: RowSelectEventArgs): void {
    const row = (Array.isArray(args.data) ? args.data[0] : args.data) as AmcContractDto | undefined;
    if (row) this.selectContract(row);
  }

  onContractClick(args: RecordClickEventArgs): void {
    const row = args.rowData as AmcContractDto | undefined;
    if (row) this.selectContract(row);
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
}
