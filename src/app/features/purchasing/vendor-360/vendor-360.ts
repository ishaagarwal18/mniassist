import { PermissionService } from '@abp/ng.core';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { canOpenUrl } from '../../../core/auth/nav-access.guard';
import { checkPolicy } from '../../../core/auth/permission';
import { CurrentUserService } from '../../../core/services/current-user.service';
import { PlanService } from '../../../core/services/plan.service';
import { inr } from '../../../core/util/format';
import { ArTopbar } from '../../../layout/topbar';
import { CockpitOriginService } from '../../../layout/cockpit-origin.service';
import {
  Gstr2bMatchStatus,
  MsmeClassification,
  QcInspectionStatus,
  ThreeWayMatchStatus,
  VendorBillStatus,
  VendorDebitNoteStatus,
  Vendor360Dto,
  Vendor360Service,
  GrnStatus,
} from '../../../proxy/purchasing';
import { ArButton, ArChip, ArIcon, ChipTone, IconName } from '../../../ui';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { ArGrid } from '../../../ui/grid';
import { PURCHASING_PERMISSIONS } from '../purchasing-permissions';
import { ArSupplierFinder } from './supplier-finder';
import { ArVendor360Links } from './vendor-360-links';
import { vendorParams } from './vendor-360-links.logic';

type VendorTab = 'bills' | 'grn' | 'po' | 'debit';
const TABS: readonly VendorTab[] = ['bills', 'grn', 'po', 'debit'];

@Component({
  standalone: true,
  selector: 'ar-vendor-360',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    ArTopbar,
    ArButton,
    ArChip,
    ArIcon,
    ArVendor360Links,
    ArSupplierFinder,
    ArGrid,
    GridModule,
  ],
  template: `
    <ar-topbar
      title="Vendor 360"
      subtitle="One supplier: orders, receipts, bills, quality and MSME payment dues"
    >
      <div class="v3-top">
        <ar-supplier-finder
          [currentName]="vendor()?.name ?? null"
          (picked)="onVendorChange($event)"
        />
        @if (can().editSupplier) {
          <a
            ar-button
            variant="primary"
            icon="plus"
            routerLink="/purchasing/suppliers/new"
            [queryParams]="{ then: 'vendor-360' }"
            >New vendor</a
          >
        }
      </div>
    </ar-topbar>

    @if (vendor(); as v) {
      <div class="v3 ar-scroll ar-scroll--bare">
        @if (loadError(); as e) {
          <p class="v3-alert" role="alert">{{ e }}</p>
        }

        <!-- Who the supplier is -->
        <section class="v3-card v3-profile" aria-label="Supplier profile">
          <div class="v3-profile__id">
            <div class="v3-avatar" aria-hidden="true">{{ initials(v.name) }}</div>
            <div class="v3-profile__text">
              <div class="v3-profile__name">
                <h2 translate="no">{{ v.name }}</h2>
                @if (v.isBlacklisted) {
                  <ar-chip tone="bad">Blacklisted</ar-chip>
                }
                <ar-chip [tone]="msmeTone(v.msmeCategory)">{{ msmeLabel(v.msmeCategory) }}</ar-chip>
              </div>
              <dl class="v3-ids">
                <div>
                  <dt>GSTIN</dt>
                  <dd class="ar-mono">{{ v.gstin || 'Unregistered' }}</dd>
                </div>
                <div>
                  <dt>PAN</dt>
                  <dd class="ar-mono">{{ v.pan || '—' }}</dd>
                </div>
                @if (v.udyamRegistrationNumber) {
                  <div>
                    <dt>Udyam</dt>
                    <dd class="ar-mono">{{ v.udyamRegistrationNumber }}</dd>
                  </div>
                }
              </dl>
              <div class="v3-contact">
                @if (v.contactName) {
                  <span
                    ><ar-icon name="user" [size]="13" />{{ v.contactName
                    }}{{ v.contactDesignation ? ', ' + v.contactDesignation : '' }}</span
                  >
                }
                @if (v.phone) {
                  <a [href]="'tel:' + v.phone"><ar-icon name="phone" [size]="13" />{{ v.phone }}</a>
                }
                @if (v.email) {
                  <a [href]="'mailto:' + v.email"
                    ><ar-icon name="mail" [size]="13" />{{ v.email }}</a
                  >
                }
                @if (addressLine(v); as a) {
                  <span><ar-icon name="globe" [size]="13" />{{ a }}</span>
                }
                @if (!v.phone && !v.email && !addressLine(v)) {
                  <span class="v3-muted">No contact details recorded.</span>
                }
              </div>
            </div>
          </div>

          <div class="v3-terms">
            <span class="v3-terms__label">Payment & delivery</span>
            <div class="v3-terms__row">
              <span>Bank</span>
              @if (v.bankName || v.bankAccountNumber) {
                <strong
                  >{{ v.bankName || 'Account' }}
                  <span class="ar-mono">{{ maskAccount(v.bankAccountNumber) }}</span></strong
                >
              } @else {
                <strong class="v3-muted">Not recorded</strong>
              }
            </div>
            @if (v.bankIfscCode) {
              <div class="v3-terms__row">
                <span>IFSC</span><strong class="ar-mono">{{ v.bankIfscCode }}</strong>
              </div>
            }
            <div class="v3-terms__row">
              <span>Lead time</span>
              <strong>{{ v.leadDays != null ? v.leadDays + ' days' : 'Not set' }}</strong>
            </div>
            @if (can().editSupplier) {
              <a
                ar-button
                variant="quiet"
                icon="edit"
                class="v3-terms__edit"
                [routerLink]="['/purchasing/suppliers', v.id, 'edit']"
                >Edit supplier</a
              >
            }
          </div>
        </section>

        @if (v.isBlacklisted) {
          <section class="v3-black" role="alert">
            <ar-icon name="shield" [size]="20" />
            <div>
              <strong>This supplier is blacklisted.</strong>
              <span>{{
                v.blacklistReason || 'No new purchase orders can be raised for them.'
              }}</span>
            </div>
          </section>
        }

        <!-- MSME / 45-day payment warning -->
        @if (v.msmeOverdueInPaise > 0) {
          <section class="v3-warn" role="alert">
            <ar-icon name="alert" [size]="20" />
            <div class="v3-warn__text">
              @if (v.msmeCategory === MsmeClassification.NotRegistered) {
                <strong>{{ inr(v.msmeOverdueInPaise) }} unpaid for more than 45 days</strong>
                <span
                  >If this supplier is an MSME, Section 15 of the MSMED Act applies. Record their
                  Udyam number to track it.</span
                >
              } @else {
                <strong>{{ inr(v.msmeOverdueInPaise) }} past the MSME 45-day limit</strong>
                <span
                  >Section 16 of the MSMED Act adds compound interest at three times the RBI rate on
                  late payments to MSMEs.</span
                >
              }
            </div>
            @if (can().bills) {
              <a ar-button variant="danger" routerLink="/purchasing/bills" [queryParams]="scope()"
                >Review overdue bills</a
              >
            }
          </section>
        }

        <!-- Money and quality at a glance -->
        <section class="v3-kpis" aria-label="Key figures">
          <div class="v3-kpi">
            <span class="v3-kpi__label">Purchased</span>
            <strong class="v3-kpi__value">{{ inr(v.totalPurchasesInPaise) }}</strong>
            <span class="v3-kpi__sub">{{ v.totalPurchaseOrdersCount }} purchase order(s)</span>
          </div>
          <div class="v3-kpi">
            <span class="v3-kpi__label">Paid</span>
            <strong class="v3-kpi__value">{{ inr(v.totalPaidInPaise) }}</strong>
            <span class="v3-kpi__sub">{{ paidShare(v) }} of billed</span>
          </div>
          <div class="v3-kpi" [class.v3-kpi--amber]="v.outstandingPayableInPaise > 0">
            <span class="v3-kpi__label">Outstanding</span>
            <strong class="v3-kpi__value">{{ inr(v.outstandingPayableInPaise) }}</strong>
            <span class="v3-kpi__sub">
              {{
                v.msmeOverdueInPaise > 0
                  ? inr(v.msmeOverdueInPaise) + ' over 45 days'
                  : 'After TDS; nothing over 45 days'
              }}
            </span>
          </div>
          <div
            class="v3-kpi"
            [class.v3-kpi--good]="hasQuality(v) && v.qualityAcceptancePercent >= 95"
            [class.v3-kpi--amber]="hasQuality(v) && v.qualityAcceptancePercent < 95"
          >
            <span class="v3-kpi__label">Quality accepted</span>
            <strong class="v3-kpi__value">{{
              hasQuality(v) ? (v.qualityAcceptancePercent | number: '1.0-1') + '%' : '—'
            }}</strong>
            <span class="v3-kpi__sub">{{
              hasQuality(v)
                ? 'Across ' + v.totalGoodsReceiptNotesCount + ' goods receipt(s)'
                : 'No goods received yet'
            }}</span>
          </div>
        </section>

        <!-- Every related screen, opened on this supplier -->
        <ar-vendor-360-links [vendor]="v" />

        <!-- Create for this supplier: each opens its own page, filled in for them -->
        @if (createActions().length) {
          <section class="v3-card v3-create" aria-label="Create for this supplier">
            <span class="v3-create__label"
              >Create for <strong translate="no">{{ v.name }}</strong></span
            >
            <div class="v3-create__actions">
              @for (a of createActions(); track a.route) {
                <a
                  ar-button
                  [variant]="a.primary ? 'primary' : 'ghost'"
                  [icon]="a.icon"
                  [routerLink]="a.route"
                  [queryParams]="scope()"
                  >{{ a.label }}</a
                >
              }
            </div>
          </section>
        }

        <!-- Recent records -->
        <section class="v3-card v3-records" aria-label="Recent records">
          <div class="v3-tabs" role="tablist" aria-label="Recent records">
            @for (t of tabs; track t) {
              <button
                type="button"
                role="tab"
                class="v3-tab"
                [id]="'v3-tab-' + t"
                [attr.aria-selected]="activeTab() === t"
                [attr.aria-controls]="'v3-panel'"
                [attr.tabindex]="activeTab() === t ? 0 : -1"
                (click)="selectTab(t)"
                (keydown)="tabKey($event, t)"
              >
                {{ tabLabel(t) }}
                <span class="v3-tab__count">{{ tabCount(v, t) }}</span>
              </button>
            }
          </div>

          <div
            class="v3-panel"
            id="v3-panel"
            role="tabpanel"
            [attr.aria-labelledby]="'v3-tab-' + activeTab()"
          >
            @switch (activeTab()) {
              @case ('bills') {
                <ejs-grid
                  arGrid="vendor-360-bills"
                  [dataSource]="v.recentVendorBills"
                  aria-label="Recent Vendor Bills"
                >
                  <e-columns>
                    <e-column field="billNumber" headerText="Bill" width="140">
                      <ng-template #template let-b>
                        <strong class="ar-mono">{{ b.billNumber }}</strong>
                      </ng-template>
                    </e-column>
                    <e-column field="vendorInvoiceNumber" headerText="Supplier invoice" width="180">
                      <ng-template #template let-b>
                        <div class="v3-cell">
                          <span>{{ b.vendorInvoiceNumber }}</span>
                          <span class="v3-muted block">{{
                            b.vendorInvoiceDateUtc | date: 'mediumDate'
                          }}</span>
                        </div>
                      </ng-template>
                    </e-column>
                    <e-column headerText="3-way match" width="140">
                      <ng-template #template let-b>
                        <ar-chip [tone]="matchTone(b.threeWayMatchStatus)">
                          {{ matchLabel(b.threeWayMatchStatus) }}
                        </ar-chip>
                      </ng-template>
                    </e-column>
                    <e-column headerText="GSTR-2B" width="140">
                      <ng-template #template let-b>
                        <ar-chip [tone]="itcTone(b.gstr2bMatchStatus)">
                          {{ itcLabel(b.gstr2bMatchStatus) }}
                        </ar-chip>
                      </ng-template>
                    </e-column>
                    <e-column
                      field="grandTotalInPaise"
                      headerText="Total"
                      width="130"
                      [textAlign]="'Right'"
                    >
                      <ng-template #template let-b>
                        <span class="ar-mono">{{ inr(b.grandTotalInPaise) }}</span>
                      </ng-template>
                    </e-column>
                    <e-column
                      field="balanceDueInPaise"
                      headerText="Balance due"
                      width="140"
                      [textAlign]="'Right'"
                    >
                      <ng-template #template let-b>
                        <div class="ar-mono">
                          <span
                            [class.v3-bad]="b.balanceDueInPaise > 0"
                            [class.v3-good]="b.balanceDueInPaise === 0"
                          >
                            {{ inr(b.balanceDueInPaise) }}
                          </span>
                          @if (b.dueDateUtc && b.balanceDueInPaise > 0) {
                            <span class="v3-muted v3-block"
                              >due {{ b.dueDateUtc | date: 'd MMM' }}</span
                            >
                          }
                        </div>
                      </ng-template>
                    </e-column>
                    <e-column headerText="Status" width="130">
                      <ng-template #template let-b>
                        <ar-chip [tone]="billTone(b.status)">{{ billLabel(b.status) }}</ar-chip>
                      </ng-template>
                    </e-column>
                    <e-column headerText="Actions" width="90" [visible]="can().bills">
                      <ng-template #template let-b>
                        <a
                          ar-button
                          variant="quiet"
                          [routerLink]="['/purchasing/bills', b.id]"
                          [queryParams]="scope()"
                          >Open</a
                        >
                      </ng-template>
                    </e-column>
                  </e-columns>
                </ejs-grid>
                <ng-container
                  *ngTemplateOutlet="
                    stats;
                    context: {
                      shown: v.recentVendorBills.length,
                      total: v.totalVendorBillsCount,
                      route: can().bills ? '/purchasing/bills' : null,
                      what: 'bills',
                    }
                  "
                />
              }
              @case ('grn') {
                <ejs-grid
                  arGrid="vendor-360-grn"
                  [dataSource]="v.recentGoodsReceiptNotes"
                  aria-label="Recent Goods Receipts"
                >
                  <e-columns>
                    <e-column field="grnNumber" headerText="GRN" width="140">
                      <ng-template #template let-g>
                        <strong class="ar-mono">{{ g.grnNumber }}</strong>
                      </ng-template>
                    </e-column>
                    <e-column field="gateEntryNumber" headerText="Gate entry" width="160">
                      <ng-template #template let-g>
                        <div class="v3-cell">
                          <span>{{ g.gateEntryNumber || '—' }}</span>
                          <span class="v3-muted block">{{
                            g.gateInTimeUtc || g.creationTime | date: 'mediumDate'
                          }}</span>
                        </div>
                      </ng-template>
                    </e-column>
                    <e-column
                      field="purchaseOrderReference"
                      headerText="Purchase order"
                      width="150"
                    >
                      <ng-template #template let-g>
                        {{ g.purchaseOrderReference || 'Direct' }}
                      </ng-template>
                    </e-column>
                    <e-column field="challanNumber" headerText="Challan" width="130">
                      <ng-template #template let-g>
                        <span class="ar-mono">{{ g.challanNumber }}</span>
                      </ng-template>
                    </e-column>
                    <e-column field="vehicleNumber" headerText="Vehicle" width="130">
                      <ng-template #template let-g>
                        <span class="ar-mono">{{ g.vehicleNumber || '—' }}</span>
                      </ng-template>
                    </e-column>
                    <e-column headerText="QC" width="120">
                      <ng-template #template let-g>
                        <ar-chip [tone]="qcTone(g.qcStatus)">{{ qcLabel(g.qcStatus) }}</ar-chip>
                      </ng-template>
                    </e-column>
                    <e-column headerText="Status" width="130">
                      <ng-template #template let-g>
                        <ar-chip [tone]="grnTone(g.status)">{{ grnLabel(g.status) }}</ar-chip>
                      </ng-template>
                    </e-column>
                    <e-column headerText="Actions" width="90" [visible]="can().grn">
                      <ng-template #template let-g>
                        <a
                          ar-button
                          variant="quiet"
                          [routerLink]="['/purchasing/grn', g.id]"
                          [queryParams]="scope()"
                          >Open</a
                        >
                      </ng-template>
                    </e-column>
                  </e-columns>
                </ejs-grid>
                <ng-container
                  *ngTemplateOutlet="
                    stats;
                    context: {
                      shown: v.recentGoodsReceiptNotes.length,
                      total: v.totalGoodsReceiptNotesCount,
                      route: can().grn ? '/purchasing/grn' : null,
                      what: 'goods receipts',
                    }
                  "
                />
              }
              @case ('po') {
                <ejs-grid
                  arGrid="vendor-360-po"
                  [dataSource]="v.recentPurchaseOrders"
                  aria-label="Recent Purchase Orders"
                >
                  <e-columns>
                    <e-column field="reference" headerText="Purchase order" width="160">
                      <ng-template #template let-p>
                        <strong class="ar-mono">{{ p.reference }}</strong>
                      </ng-template>
                    </e-column>
                    <e-column field="creationTime" headerText="Ordered" width="130">
                      <ng-template #template let-p>
                        {{ p.creationTime | date: 'mediumDate' }}
                      </ng-template>
                    </e-column>
                    <e-column field="expectedOn" headerText="Expected" width="130">
                      <ng-template #template let-p>
                        {{ p.expectedOn ? (p.expectedOn | date: 'mediumDate') : '—' }}
                      </ng-template>
                    </e-column>
                    <e-column
                      field="lineCount"
                      headerText="Items"
                      width="90"
                      [textAlign]="'Right'"
                    ></e-column>
                    <e-column
                      field="subtotalInPaise"
                      headerText="Value"
                      width="140"
                      [textAlign]="'Right'"
                    >
                      <ng-template #template let-p>
                        <strong class="ar-mono">{{ inr(p.subtotalInPaise) }}</strong>
                      </ng-template>
                    </e-column>
                    <e-column headerText="Status" width="130">
                      <ng-template #template let-p>
                        <ar-chip [tone]="poTone(p.state)">{{ poLabel(p.state) }}</ar-chip>
                      </ng-template>
                    </e-column>
                  </e-columns>
                </ejs-grid>
                <ng-container
                  *ngTemplateOutlet="
                    stats;
                    context: {
                      shown: v.recentPurchaseOrders.length,
                      total: v.totalPurchaseOrdersCount,
                      route: can().orders ? '/purchasing' : null,
                      what: 'purchase orders',
                    }
                  "
                />
              }
              @case ('debit') {
                <ejs-grid
                  arGrid="vendor-360-debit"
                  [dataSource]="v.recentDebitNotes"
                  aria-label="Recent Debit Notes"
                >
                  <e-columns>
                    <e-column field="debitNoteNumber" headerText="Debit note" width="150">
                      <ng-template #template let-dn>
                        <strong class="ar-mono">{{ dn.debitNoteNumber }}</strong>
                      </ng-template>
                    </e-column>
                    <e-column field="issueDateUtc" headerText="Issued" width="130">
                      <ng-template #template let-dn>
                        {{ dn.issueDateUtc | date: 'mediumDate' }}
                      </ng-template>
                    </e-column>
                    <e-column field="reason" headerText="Reason" width="220">
                      <ng-template #template let-dn>
                        <span class="v3-reason">{{ dn.reason }}</span>
                      </ng-template>
                    </e-column>
                    <e-column
                      field="grandTotalInPaise"
                      headerText="Amount"
                      width="130"
                      [textAlign]="'Right'"
                    >
                      <ng-template #template let-dn>
                        <strong class="ar-mono">{{ inr(dn.grandTotalInPaise) }}</strong>
                      </ng-template>
                    </e-column>
                    <e-column headerText="Status" width="130">
                      <ng-template #template let-dn>
                        <ar-chip [tone]="debitTone(dn.status)">{{ debitLabel(dn.status) }}</ar-chip>
                      </ng-template>
                    </e-column>
                    <e-column headerText="Actions" width="90" [visible]="can().debitNotes">
                      <ng-template #template let-dn>
                        <a
                          ar-button
                          variant="quiet"
                          [routerLink]="['/purchasing/debit-notes', dn.id]"
                          [queryParams]="scope()"
                          >Open</a
                        >
                      </ng-template>
                    </e-column>
                  </e-columns>
                </ejs-grid>
                <ng-container
                  *ngTemplateOutlet="
                    stats;
                    context: {
                      shown: v.recentDebitNotes.length,
                      total: v.totalDebitNotesCount,
                      route: can().debitNotes ? '/purchasing/debit-notes' : null,
                      what: 'debit notes',
                    }
                  "
                />
              }
            }
          </div>
        </section>
      </div>
    } @else {
      <div class="v3 ar-scroll ar-scroll--bare">
        @if (loadError(); as e) {
          <p class="v3-alert" role="alert">{{ e }}</p>
        } @else if (loaded() && !hasSuppliers()) {
          <section class="v3-card v3-blank">
            <ar-icon name="contacts" [size]="28" />
            <strong>No suppliers yet</strong>
            @if (can().editSupplier) {
              <span>Add your first supplier to see everything about them here.</span>
              <a
                ar-button
                variant="primary"
                icon="plus"
                routerLink="/purchasing/suppliers/new"
                [queryParams]="{ then: 'vendor-360' }"
                >Add a supplier</a
              >
            } @else {
              <span>Suppliers added on the Purchasing page show here.</span>
            }
          </section>
        } @else {
          <section class="v3-card v3-skeleton" aria-busy="true" aria-label="Loading supplier">
            <span class="v3-skeleton__bar v3-skeleton__bar--title"></span>
            <span class="v3-skeleton__bar"></span>
            <span class="v3-skeleton__bar v3-skeleton__bar--short"></span>
          </section>
        }
      </div>
    }

    <ng-template #stats let-shown="shown" let-total="total" let-route="route" let-what="what">
      <div class="v3-stats">
        <span>Latest {{ shown }} of {{ total }}</span>
        @if (route) {
          <a [routerLink]="route" [queryParams]="scope()"
            >All {{ what }} from this supplier <span aria-hidden="true">→</span></a
          >
        }
      </div>
    </ng-template>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }
    .v3 {
      flex: 1;
      min-height: 0;
      padding: 1.25rem 1.5rem 3rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    /* In the fixed-height scroll area, cards keep their own height instead of being squeezed. */
    .v3 > * {
      flex-shrink: 0;
    }
    .v3-top {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .v3-card {
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      box-shadow: var(--ar-shadow-card);
    }
    .v3-alert {
      margin: 0;
      padding: 0.7rem 1rem;
      border: 1px solid var(--ar-red-200);
      border-radius: var(--ar-radius-card);
      background: var(--ar-red-100);
      color: var(--ar-bad-600);
      font: 500 13px var(--ar-font-sans);
    }
    .v3-muted {
      color: var(--ar-ink-500);
      font-weight: 400;
    }
    .v3-block {
      display: block;
      font-size: 11.5px;
    }

    /* Profile */
    .v3-profile {
      padding: 1.1rem 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: stretch;
      flex-wrap: wrap;
      gap: 1.25rem;
    }
    .v3-profile__id {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
      min-width: 0;
      flex: 1 1 420px;
    }
    .v3-avatar {
      flex: none;
      width: 52px;
      height: 52px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      background: var(--ar-blue-100);
      color: var(--ar-blue-700);
      font: 700 18px var(--ar-font-sans);
    }
    .v3-profile__text {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 0;
    }
    .v3-profile__name {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .v3-profile__name h2 {
      margin: 0;
      font: 600 19px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .v3-ids {
      margin: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .v3-ids > div {
      display: flex;
      gap: 6px;
      align-items: baseline;
      padding: 3px 8px;
      border-radius: var(--ar-radius-chip);
      background: var(--ar-bg-50);
      border: 1px solid var(--ar-line-100);
    }
    .v3-ids dt {
      font: 600 10.5px var(--ar-font-sans);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ar-ink-500);
    }
    .v3-ids dd {
      margin: 0;
      font-size: 12.5px;
      color: var(--ar-ink-900);
    }
    .v3-contact {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 16px;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-600);
    }
    .v3-contact > * {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .v3-contact a {
      color: var(--ar-blue-600);
      text-decoration: none;
    }
    .v3-contact a:hover {
      text-decoration: underline;
    }
    .v3-terms {
      flex: 0 1 280px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 0.8rem 1rem;
      border-radius: var(--ar-radius-inset);
      background: var(--ar-bg-50);
      border: 1px solid var(--ar-line-100);
    }
    .v3-terms__label {
      font: 600 10.5px var(--ar-font-sans);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ar-ink-500);
    }
    .v3-terms__row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-600);
    }
    .v3-terms__row strong {
      color: var(--ar-ink-900);
      font-weight: 600;
      text-align: right;
    }
    .v3-terms__edit {
      align-self: flex-start;
      margin-top: 2px;
    }

    /* Create row */
    .v3-create {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px 16px;
      padding: 0.75rem 1.1rem;
    }
    .v3-create__label {
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-600);
    }
    .v3-create__label strong {
      color: var(--ar-ink-900);
      font-weight: 600;
    }
    .v3-create__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .v3-black {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0.85rem 1.1rem;
      border-radius: var(--ar-radius-card);
      border: 1px solid var(--ar-red-200);
      background: var(--ar-red-100);
      color: var(--ar-bad-600);
      font: 400 12.5px var(--ar-font-sans);
    }
    .v3-black div {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    /* Warning */
    .v3-warn {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0.85rem 1.1rem;
      border-radius: var(--ar-radius-card);
      border: 1px solid var(--ar-amber-200);
      background: var(--ar-amber-50);
      color: var(--ar-amber-800);
    }
    .v3-warn__text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      font: 400 12.5px var(--ar-font-sans);
    }
    .v3-warn__text strong {
      font-size: 13.5px;
    }

    /* KPIs */
    .v3-kpis {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
    }
    .v3-kpi {
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding: 0.9rem 1.1rem;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-left: 4px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      box-shadow: var(--ar-shadow-card);
    }
    .v3-kpi--amber {
      border-left-color: var(--ar-amber-500);
    }
    .v3-kpi--good {
      border-left-color: var(--ar-good-600);
    }
    .v3-kpi__label {
      font: 600 11px var(--ar-font-sans);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ar-ink-500);
    }
    .v3-kpi__value {
      font: 700 22px var(--ar-font-sans);
      color: var(--ar-ink-900);
      font-variant-numeric: tabular-nums;
    }
    .v3-kpi__sub {
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }

    /* Records */
    .v3-records {
      overflow: hidden;
    }
    .v3-tabs {
      display: flex;
      gap: 2px;
      padding: 0 0.75rem;
      border-bottom: 1px solid var(--ar-line-200);
      overflow-x: auto;
    }
    .v3-tab {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 0.8rem 0.75rem 0.7rem;
      border: 0;
      border-bottom: 2px solid transparent;
      background: none;
      font: 600 13px var(--ar-font-sans);
      color: var(--ar-ink-500);
      cursor: pointer;
      white-space: nowrap;
    }
    .v3-tab:hover {
      color: var(--ar-ink-900);
    }
    .v3-tab[aria-selected='true'] {
      color: var(--ar-blue-700);
      border-bottom-color: var(--ar-blue-600);
    }
    .v3-tab:focus-visible {
      outline: none;
      box-shadow: var(--ar-focus-ring);
    }
    .v3-tab__count {
      min-width: 20px;
      padding: 1px 6px;
      border-radius: 999px;
      background: var(--ar-bg-100);
      font: 600 11px var(--ar-font-sans);
      color: var(--ar-ink-700);
      text-align: center;
    }
    .v3-tab[aria-selected='true'] .v3-tab__count {
      background: var(--ar-blue-100);
      color: var(--ar-blue-700);
    }
    .v3-panel {
      overflow-x: auto;
    }
    .v3-table {
      width: 100%;
      border-collapse: collapse;
      font: 400 13px var(--ar-font-sans);
    }
    .v3-table th {
      padding: 0.6rem 1rem;
      text-align: left;
      background: var(--ar-bg-50);
      border-bottom: 1px solid var(--ar-line-200);
      font: 600 11px var(--ar-font-sans);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ar-ink-500);
      white-space: nowrap;
    }
    .v3-table td {
      padding: 0.65rem 1rem;
      border-bottom: 1px solid var(--ar-line-100);
      vertical-align: middle;
      color: var(--ar-ink-800);
    }
    .v3-table tbody tr:hover td {
      background: var(--ar-hover);
    }
    .v3-table .num {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .v3-table .act {
      text-align: right;
      width: 1%;
    }
    .v3-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .v3-cell .v3-muted {
      font-size: 11.5px;
    }
    .v3-reason {
      max-width: 360px;
    }
    .v3-good {
      color: var(--ar-good-700);
    }
    .v3-bad {
      color: var(--ar-bad-600);
      font-weight: 600;
    }
    .v3-empty {
      text-align: center;
      padding: 2rem 1rem !important;
      color: var(--ar-ink-500);
    }
    .v3-empty__cta {
      margin-left: 6px;
      padding: 0;
      border: 0;
      background: none;
      color: var(--ar-blue-600);
      font: 600 13px var(--ar-font-sans);
      cursor: pointer;
      text-decoration: none;
    }
    .v3-empty__cta:hover {
      text-decoration: underline;
    }
    .v3-stats {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 0.6rem 1rem;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .v3-stats a {
      color: var(--ar-blue-600);
      font-weight: 600;
      text-decoration: none;
    }
    .v3-stats a:hover {
      text-decoration: underline;
    }

    /* Empty and loading */
    .v3-blank {
      padding: 2.5rem 1.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      text-align: center;
      color: var(--ar-ink-500);
      font: 400 13px var(--ar-font-sans);
    }
    .v3-blank strong {
      color: var(--ar-ink-900);
      font-size: 15px;
    }
    .v3-skeleton {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .v3-skeleton__bar {
      height: 12px;
      width: 60%;
      border-radius: 6px;
      background: linear-gradient(90deg, var(--ar-bg-100), var(--ar-bg-50), var(--ar-bg-100));
      background-size: 200% 100%;
      animation: v3-shimmer 1.2s linear infinite;
    }
    .v3-skeleton__bar--title {
      height: 20px;
      width: 35%;
    }
    .v3-skeleton__bar--short {
      width: 40%;
    }
    @keyframes v3-shimmer {
      from {
        background-position: 200% 0;
      }
      to {
        background-position: -200% 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .v3-skeleton__bar {
        animation: none;
      }
    }
    .ar-visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
    @media (max-width: 720px) {
      .v3 {
        padding: 1rem;
      }
      .v3-warn {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `,
})
export class Vendor360Component {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly vendor360Service = inject(Vendor360Service);
  private readonly cockpitOrigin = inject(CockpitOriginService);
  private readonly permissions = inject(PermissionService);
  private readonly plans = inject(PlanService);
  private readonly account = inject(CurrentUserService);
  private readonly destroyRef = inject(DestroyRef);

  readonly MsmeClassification = MsmeClassification;
  protected readonly tabs = TABS;
  protected readonly inr = inr;

  /** False once the server has said there is no supplier at all. */
  readonly hasSuppliers = signal(true);
  readonly currentVendorId = signal<string>('');
  /** The open tab, kept in the URL (`?tab=`) so the way back from a record lands on it again. */
  readonly activeTab = signal<VendorTab>(readTab(this.route.snapshot.queryParamMap.get('tab')));
  readonly loaded = signal(false);
  readonly loadError = signal<string | null>(null);

  private readonly live = signal<Vendor360Dto | null>(null);
  readonly vendor = computed(() => this.live());

  /** Opens a purchasing list on just this supplier. */
  readonly scope = computed<Params>(() => {
    const v = this.vendor();
    return v ? vendorParams(v) : {};
  });

  /**
   * What this user may open or do from here: screens by their menu permission (as the menu and the route guard decide), actions
   * by the API permission they need. Links and buttons for anything else are not shown.
   */
  protected readonly can = computed(() => {
    this.account.isHost();
    const open = (url: string) => canOpenUrl(url, this.permissions, this.plans, this.account);
    const has = (p: string) => checkPolicy(p, this.permissions);
    const orders = open('/purchasing');
    const grn = open('/purchasing/grn');
    const bills = open('/purchasing/bills');
    const debitNotes = open('/purchasing/debit-notes');
    return {
      orders,
      grn,
      bills,
      debitNotes,
      editSupplier: orders && has(PURCHASING_PERMISSIONS.manageInventory),
      newOrder: open('/purchasing/orders/new') && has(PURCHASING_PERMISSIONS.manageInventory),
      newGrn: open('/purchasing/grn/new') && has(PURCHASING_PERMISSIONS.createGrn),
      newBill: open('/purchasing/bills/new') && has(PURCHASING_PERMISSIONS.createBill),
      newDebitNote:
        open('/purchasing/debit-notes/new') && has(PURCHASING_PERMISSIONS.createDebitNote),
    };
  });

  /** The records this user may create for the supplier, in the order the purchase cycle runs. */
  protected readonly createActions = computed(() => {
    const c = this.can();
    const all: { label: string; route: string; icon: IconName; primary?: boolean; ok: boolean }[] =
      [
        {
          label: 'Purchase order',
          route: '/purchasing/orders/new',
          icon: 'document',
          ok: c.newOrder,
        },
        {
          label: 'Inward GRN',
          route: '/purchasing/grn/new',
          icon: 'machine',
          primary: true,
          ok: c.newGrn,
        },
        { label: 'Vendor bill', route: '/purchasing/bills/new', icon: 'billing', ok: c.newBill },
        {
          label: 'Debit note',
          route: '/purchasing/debit-notes/new',
          icon: 'quotation',
          ok: c.newDebitNote,
        },
      ];
    // A blacklisted supplier can't be ordered from (the API refuses); the other records stay possible.
    const blacklisted = !!this.vendor()?.isBlacklisted;
    return all.filter((a) => a.ok && !(blacklisted && a.route === '/purchasing/orders/new'));
  });

  constructor() {
    // Screens opened from here show "Vendor 360 · <supplier>" in their breadcrumb, leading back.
    effect(() => this.cockpitOrigin.setCockpitName(this.vendor()?.name ?? null));

    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.currentVendorId.set(id);
        this.loadVendor(id);
      } else {
        this.openFirstSupplier();
      }
    });
  }

  /** Picking a supplier opens their own cockpit URL, so the way back from other screens returns to them. */
  onVendorChange(id: string) {
    if (id && id !== this.currentVendorId()) {
      void this.router.navigate(['/purchasing/vendor-360', id], {
        queryParams: { tab: this.activeTab() },
      });
    }
  }

  protected selectTab(tab: VendorTab): void {
    if (tab === this.activeTab()) return;
    this.activeTab.set(tab);
    void this.router
      .navigate([], {
        relativeTo: this.route,
        queryParams: { tab },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      })
      .then(() => this.cockpitOrigin.setCockpitName(this.vendor()?.name ?? null));
  }

  /** Arrow keys, Home and End move between the tabs (the ARIA tabs pattern). */
  protected tabKey(event: KeyboardEvent, tab: VendorTab): void {
    const i = TABS.indexOf(tab);
    const next =
      event.key === 'ArrowRight'
        ? TABS[(i + 1) % TABS.length]
        : event.key === 'ArrowLeft'
          ? TABS[(i - 1 + TABS.length) % TABS.length]
          : event.key === 'Home'
            ? TABS[0]
            : event.key === 'End'
              ? TABS[TABS.length - 1]
              : null;
    if (!next) return;
    event.preventDefault();
    this.selectTab(next);
    document.getElementById('v3-tab-' + next)?.focus();
  }

  protected tabLabel(tab: VendorTab): string {
    return { bills: 'Bills', grn: 'Goods receipts', po: 'Purchase orders', debit: 'Debit notes' }[
      tab
    ];
  }

  protected tabCount(v: Vendor360Dto, tab: VendorTab): number {
    switch (tab) {
      case 'bills':
        return v.totalVendorBillsCount ?? v.recentVendorBills.length;
      case 'grn':
        return v.totalGoodsReceiptNotesCount ?? v.recentGoodsReceiptNotes.length;
      case 'po':
        return v.totalPurchaseOrdersCount ?? v.recentPurchaseOrders.length;
      case 'debit':
        return v.totalDebitNotesCount ?? v.recentDebitNotes.length;
    }
  }

  /** The bare /purchasing/vendor-360 opens the first supplier's cockpit (usable ones first, then by name). */
  private openFirstSupplier() {
    const go = (id: string) =>
      void this.router.navigate(['/purchasing/vendor-360', id], {
        replaceUrl: true,
        queryParamsHandling: 'preserve',
      });

    this.vendor360Service
      .getSupplierMatches(null, 1)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ([first]) => {
          this.loaded.set(true);
          this.hasSuppliers.set(!!first);
          if (first?.id) go(first.id);
        },
        error: () => {
          this.loaded.set(true);
          this.loadError.set('Suppliers could not be loaded.');
        },
      });
  }

  private loadVendor(id: string) {
    this.live.set(null);
    this.loadError.set(null);
    this.vendor360Service
      .get(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (dto) => {
          if (this.currentVendorId() === dto.id) this.live.set(dto);
        },
        error: () => this.loadError.set('This supplier could not be loaded.'),
      });
  }

  /** Opens one record on its own screen. */
  recordParams(id?: string): Params {
    const v = this.vendor();
    return v ? vendorParams(v, id ? { open: id } : undefined) : {};
  }

  addressLine(v: Vendor360Dto): string {
    const place = [v.city, v.state].filter(Boolean).join(', ');
    return [v.address, place, v.pincode].filter(Boolean).join(', ');
  }

  /** Inward gate entry for this supplier, on its own page. */
  goToInwardGate() {
    const v = this.vendor();
    if (v) {
      void this.router.navigate(['/purchasing/grn/new'], { queryParams: vendorParams(v) });
    }
  }

  protected initials(name: string): string {
    const words = name.split(/\s+/).filter((w) => /^[A-Za-z0-9]/.test(w));
    return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase() || '?';
  }

  /** The last four digits only: the full number is on the supplier record. */
  protected maskAccount(account?: string | null): string {
    return account ? '•••• ' + account.slice(-4) : '';
  }

  /** Quality reads as a figure only once something has been received. */
  protected hasQuality(v: Vendor360Dto): boolean {
    return (v.totalGoodsReceiptNotesCount ?? v.recentGoodsReceiptNotes.length) > 0;
  }

  protected paidShare(v: Vendor360Dto): string {
    const billed = v.totalPaidInPaise + v.outstandingPayableInPaise;
    return billed > 0 ? `${Math.round((v.totalPaidInPaise / billed) * 100)}%` : '—';
  }

  msmeTone(cat: MsmeClassification): ChipTone {
    switch (cat) {
      case MsmeClassification.Micro:
      case MsmeClassification.Small:
      case MsmeClassification.Medium:
        return 'teal';
      default:
        return 'neutral';
    }
  }

  msmeLabel(cat: MsmeClassification): string {
    switch (cat) {
      case MsmeClassification.Micro:
        return 'MSME · Micro';
      case MsmeClassification.Small:
        return 'MSME · Small';
      case MsmeClassification.Medium:
        return 'MSME · Medium';
      default:
        return 'MSME not recorded';
    }
  }

  matchTone(status: ThreeWayMatchStatus): ChipTone {
    switch (status) {
      case ThreeWayMatchStatus.Matched:
        return 'good';
      case ThreeWayMatchStatus.PriceVariance:
      case ThreeWayMatchStatus.QuantityVariance:
        return 'bad';
      default:
        return 'neutral';
    }
  }

  matchLabel(status: ThreeWayMatchStatus): string {
    switch (status) {
      case ThreeWayMatchStatus.Matched:
        return 'Matched';
      case ThreeWayMatchStatus.PriceVariance:
        return 'Rate differs';
      case ThreeWayMatchStatus.QuantityVariance:
        return 'Qty differs';
      default:
        return 'Pending';
    }
  }

  itcTone(status: Gstr2bMatchStatus): ChipTone {
    switch (status) {
      case Gstr2bMatchStatus.MatchedIn2B:
        return 'good';
      case Gstr2bMatchStatus.MissingIn2B:
        return 'bad';
      default:
        return 'neutral';
    }
  }

  itcLabel(status: Gstr2bMatchStatus): string {
    switch (status) {
      case Gstr2bMatchStatus.MatchedIn2B:
        return 'In 2B';
      case Gstr2bMatchStatus.MissingIn2B:
        return 'Missing in 2B';
      default:
        return 'Not checked';
    }
  }

  billTone(status: VendorBillStatus): ChipTone {
    switch (status) {
      case VendorBillStatus.Paid:
        return 'good';
      case VendorBillStatus.PartiallyPaid:
        return 'amber';
      case VendorBillStatus.Approved:
        return 'teal';
      default:
        return 'neutral';
    }
  }

  billLabel(status: VendorBillStatus): string {
    switch (status) {
      case VendorBillStatus.Paid:
        return 'Paid';
      case VendorBillStatus.PartiallyPaid:
        return 'Part paid';
      case VendorBillStatus.Approved:
        return 'Approved';
      default:
        return 'Pending';
    }
  }

  qcTone(status: QcInspectionStatus): ChipTone {
    switch (status) {
      case QcInspectionStatus.Passed:
        return 'good';
      case QcInspectionStatus.PartiallyPassed:
        return 'warn';
      case QcInspectionStatus.Failed:
        return 'bad';
      default:
        return 'neutral';
    }
  }

  qcLabel(status: QcInspectionStatus): string {
    switch (status) {
      case QcInspectionStatus.Passed:
        return 'Passed';
      case QcInspectionStatus.PartiallyPassed:
        return 'Partly passed';
      case QcInspectionStatus.Failed:
        return 'Failed';
      default:
        return 'Awaiting QC';
    }
  }

  grnTone(status: GrnStatus): ChipTone {
    switch (status) {
      case GrnStatus.Approved:
        return 'good';
      case GrnStatus.Billed:
        return 'teal';
      case GrnStatus.UnderInspection:
        return 'amber';
      case GrnStatus.Rejected:
        return 'bad';
      default:
        return 'neutral';
    }
  }

  grnLabel(status: GrnStatus): string {
    switch (status) {
      case GrnStatus.Approved:
        return 'Approved';
      case GrnStatus.Billed:
        return 'Billed';
      case GrnStatus.UnderInspection:
        return 'Under QC';
      case GrnStatus.Rejected:
        return 'Rejected';
      case GrnStatus.Cancelled:
        return 'Cancelled';
      default:
        return 'Draft';
    }
  }

  protected poTone(state: string): ChipTone {
    switch (state) {
      case 'Received':
      case 'Delivered':
      case 'Closed':
        return 'good';
      case 'PartlyReceived':
        return 'amber';
      case 'Sent':
        return 'teal';
      case 'Cancelled':
        return 'bad';
      default:
        return 'neutral';
    }
  }

  protected poLabel(state: string): string {
    return state === 'PartlyReceived' ? 'Part received' : state;
  }

  protected debitTone(status: VendorDebitNoteStatus): ChipTone {
    switch (status) {
      case VendorDebitNoteStatus.Settled:
        return 'good';
      case VendorDebitNoteStatus.Issued:
        return 'amber';
      default:
        return 'neutral';
    }
  }

  protected debitLabel(status: VendorDebitNoteStatus): string {
    switch (status) {
      case VendorDebitNoteStatus.Settled:
        return 'Settled';
      case VendorDebitNoteStatus.Issued:
        return 'Issued';
      default:
        return VendorDebitNoteStatus[status] ?? 'Draft';
    }
  }
}

function readTab(value: string | null): VendorTab {
  return (TABS as readonly string[]).includes(value ?? '') ? (value as VendorTab) : 'bills';
}
