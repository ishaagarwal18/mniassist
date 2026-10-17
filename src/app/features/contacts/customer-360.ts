import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ArTopbar } from '../../layout/topbar';
import { Customer360Dto } from '../../proxy/sales/customer-360.models';
import { Customer360Service } from '../../proxy/sales/customer-360.service';
import { ContactService } from '../../proxy/contacts/contact.service';
import type { ContactDto, CustomerAccountDto } from '../../proxy/contacts/models';
import { CustomerAccountService } from '../../proxy/contacts/customer-account.service';
import {
  DeliveryChallanStatus,
  SalesInvoiceStatus,
  SalesOrderStatus,
} from '../../proxy/sales/sales-enums';
import { ArButton, ArChip, ArSearchBox, ChipTone } from '../../ui';

const MOCK_CUSTOMER_360: Customer360Dto = {
  id: 'c1',
  customerName: 'Suresh Patil (Kalyani Forge Ltd)',
  email: 'spatil@kalyaniforge.co.in',
  phone: '+91 98220 18290',
  accountId: 'acc1',
  accountName: 'Kalyani Group Pune (Chakan Plant)',
  industry: 'Automotive & Heavy Forging',
  city: 'Pune',
  state: 'Maharashtra',
  gstin: '27AABCK1928F1Z8',
  credit: {
    creditLimitInPaise: 1_000_000_00,
    paymentTermsDays: 30,
    totalOwedInPaise: 495_600_00,
    totalOnOrderInPaise: 495_600_00,
    totalOverdueInPaise: 0,
    onHold: false,
  },
  lifetimeRevenueInPaise: 2_450_000_00,
  totalOrdersCount: 6,
  activeOrdersCount: 1,
  totalChallansCount: 1,
  totalInvoicesCount: 5,
  openTicketsCount: 1,
  installedAssetsCount: 3,
  recentOrders: [
    {
      id: 'so-1',
      orderNumber: 'SO-2026-0041',
      customerId: 'c1',
      customerName: 'Kalyani Forge Ltd',
      customerPoNumber: 'PO-KF-9982',
      status: SalesOrderStatus.Confirmed,
      orderDateUtc: new Date(Date.now() - 4 * 86_400_000).toISOString(),
      grandTotalInPaise: 495_600_00,
      subtotalInPaise: 420_000_00,
      taxInPaise: 75_600_00,
      discountInPaise: 0,
      creationTime: new Date(Date.now() - 4 * 86_400_000).toISOString(),
      lines: [],
    },
    {
      id: 'so-prev',
      orderNumber: 'SO-2026-0022',
      customerId: 'c1',
      customerName: 'Kalyani Forge Ltd',
      customerPoNumber: 'PO-KF-9610',
      status: SalesOrderStatus.Completed,
      orderDateUtc: new Date(Date.now() - 45 * 86_400_000).toISOString(),
      grandTotalInPaise: 380_000_00,
      subtotalInPaise: 322_000_00,
      taxInPaise: 58_000_00,
      discountInPaise: 0,
      creationTime: new Date(Date.now() - 45 * 86_400_000).toISOString(),
      lines: [],
    },
  ],
  recentChallans: [
    {
      id: 'dc-1',
      challanNumber: 'DC-2026-0019',
      type: 0,
      status: DeliveryChallanStatus.Dispatched,
      customerId: 'c1',
      customerName: 'Kalyani Forge Ltd',
      salesOrderNumber: 'SO-2026-0041',
      challanDateUtc: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      dispatchedAtUtc: new Date(Date.now() - 1 * 86_400_000).toISOString(),
      transporterName: 'VRL Logistics Ltd',
      vehicleNumber: 'MH 14 HG 4521',
      lrNumber: 'VRL-PUN-982104',
      creationTime: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      lines: [],
    },
  ],
  recentInvoices: [
    {
      id: 'inv-1',
      invoiceNumber: 'INV-2026-0081',
      kind: 0,
      status: SalesInvoiceStatus.Issued,
      customerId: 'c1',
      customerName: 'Kalyani Forge Ltd',
      salesOrderNumber: 'SO-2026-0041',
      issueDateUtc: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      dueDateUtc: new Date(Date.now() + 28 * 86_400_000).toISOString(),
      subtotalInPaise: 420_000_00,
      discountInPaise: 0,
      cgstInPaise: 37_800_00,
      sgstInPaise: 37_800_00,
      igstInPaise: 0,
      totalTaxInPaise: 75_600_00,
      grandTotalInPaise: 495_600_00,
      paidAmountInPaise: 0,
      balanceDueInPaise: 495_600_00,
      isInterState: false,
      creationTime: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      lines: [],
      payments: [],
    },
  ],
  openTickets: [
    {
      id: 't-1',
      ticketNumber: 'TKT-2026-089',
      subject: 'Proportional hydraulic valve calibration assistance',
      status: 'Open',
      priority: 'High',
      creationTime: new Date(Date.now() - 1 * 86_400_000).toISOString(),
    },
  ],
  installedAssets: [
    {
      id: 'ast-1',
      serialNumber: 'KF-HYD-4401',
      modelName: '350T Closed Die Hydraulic Forging Press',
      commissionedDate: '2023-04-15',
      status: 'Operational',
      amcStatus: 'Active',
    },
    {
      id: 'ast-2',
      serialNumber: 'KF-CNC-1092',
      modelName: 'Vertical Machining Center VMC-850',
      commissionedDate: '2024-02-10',
      status: 'Operational',
      amcStatus: 'Active',
    },
    {
      id: 'ast-3',
      serialNumber: 'KF-CHL-002',
      modelName: 'Industrial Glycol Water Chiller 50 TR',
      commissionedDate: '2022-11-20',
      status: 'Operational',
      amcStatus: 'Expired',
    },
  ],
  timeline: [],
};

type Tab = 'orders' | 'challans' | 'invoices' | 'tickets' | 'assets';

@Component({
  selector: 'ar-customer-360',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ArTopbar, ArButton, ArChip, ArSearchBox],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Customer 360 cockpit"
      [subtitle]="subtitle()"
      help="Customer 360 unifies all CRM, Sales Order, GST Invoicing, Service Ticket and Machinery equipment data in a single enterprise cockpit."
    >
      <div actions class="actions-row">
        <a ar-button variant="ghost" routerLink="/sales/orders" [queryParams]="newOrderParams()"
          >+ New Order</a
        >
        <a ar-button variant="ghost" routerLink="/contacts">All Contacts</a>
      </div>
    </ar-topbar>

    <div class="dossier-shell">
      @if (data(); as c) {
        <!-- Customer Banner -->
        <div class="customer-banner">
          <div class="banner-main">
            <div class="avatar-box">
              {{ c.customerName.charAt(0) }}
            </div>
            <div class="cust-info">
              <h2 class="cust-name">{{ c.customerName }}</h2>
              <div class="cust-meta">
                @if (c.accountName) {
                  <span class="meta-pill">🏢 {{ c.accountName }}</span>
                }
                @if (c.industry) {
                  <span class="meta-pill">🏭 {{ c.industry }}</span>
                }
                @if (c.city) {
                  <span class="meta-pill">📍 {{ c.city }}, {{ c.state }}</span>
                }
                @if (c.gstin) {
                  <span class="meta-pill font-mono">GST: {{ c.gstin }}</span>
                }
              </div>
            </div>
          </div>
          <div class="banner-contact">
            @if (c.isAccountView) {
              @if (c.hasSubsidiaries) {
                <label class="contact-line subs-toggle">
                  <input
                    type="checkbox"
                    [checked]="c.includesSubsidiaries"
                    (change)="setSubsidiaries($any($event.target).checked)"
                  />
                  Include subsidiaries (its companies and plants)
                </label>
              }
              @if (c.contactId) {
                <div class="contact-line text-muted">
                  Newest contact:
                  <a [routerLink]="['/contacts', c.contactId, '360']">{{ c.contactName }}</a>
                </div>
              } @else {
                <div class="contact-line text-muted">No contacts on this account yet</div>
              }
            } @else if (c.accountId) {
              <div class="contact-line">
                <a [routerLink]="['/contacts/accounts', c.accountId, '360']">Whole account view</a>
              </div>
            }
            @if (!c.isAccountView || c.contactId) {
              <div class="contact-line">📞 {{ c.phone || 'No phone' }}</div>
              <div class="contact-line">✉️ {{ c.email || 'No email' }}</div>
            }
          </div>
        </div>

        <!-- Commercial Credit & KPI Ribbon -->
        <div class="credit-kpi-grid">
          <!-- Credit Limit Card -->
          <div class="kpi-card" [class.on-hold]="c.credit.onHold">
            <div class="card-head">
              <span class="card-lbl">Commercial credit</span>
              @if (c.credit.onHold) {
                <ar-chip tone="bad">ON HOLD</ar-chip>
              } @else {
                <ar-chip tone="good">NORMAL</ar-chip>
              }
            </div>
            <div class="kpi-val font-mono">
              @if (c.credit.creditLimitInPaise != null) {
                ₹{{ c.credit.creditLimitInPaise / 100 | number: '1.0-0' }}
              } @else {
                No limit set
              }
            </div>
            <div class="card-foot text-xs text-muted">
              @if (c.credit.paymentTermsDays != null) {
                Terms:
                {{
                  c.credit.paymentTermsDays === 0 ? 'Advance' : c.credit.paymentTermsDays + ' days'
                }}
              } @else {
                Terms: not set
              }
              @if (c.credit.onHold && c.credit.holdReason) {
                · {{ c.credit.holdReason }}
              }
            </div>
          </div>

          <!-- Total Owed Outstanding -->
          <div class="kpi-card">
            <div class="card-head">
              <span class="card-lbl">Outstanding owed</span>
            </div>
            <div class="kpi-val font-mono" [class.text-danger]="c.credit.totalOwedInPaise > 0">
              ₹{{ c.credit.totalOwedInPaise / 100 | number: '1.2-2' }}
            </div>
            <div class="card-foot text-xs" [class.text-danger]="c.credit.totalOverdueInPaise > 0">
              Overdue: ₹{{ c.credit.totalOverdueInPaise / 100 | number: '1.2-2' }}
            </div>
          </div>

          <!-- Total on Order -->
          <div class="kpi-card">
            <div class="card-head">
              <span class="card-lbl">Active on order</span>
            </div>
            <div class="kpi-val font-mono text-primary">
              ₹{{ c.credit.totalOnOrderInPaise / 100 | number: '1.2-2' }}
            </div>
            <div class="card-foot text-xs text-muted">
              {{ c.activeOrdersCount }} active sales order{{ c.activeOrdersCount === 1 ? '' : 's' }}
            </div>
          </div>

          <!-- Lifetime Value -->
          <div class="kpi-card">
            <div class="card-head">
              <span class="card-lbl">Lifetime revenue</span>
            </div>
            <div class="kpi-val font-mono text-success">
              ₹{{ c.lifetimeRevenueInPaise / 100 | number: '1.0-0' }}
            </div>
            <div class="card-foot text-xs text-muted">
              {{ c.totalInvoicesCount }} total invoices billed
            </div>
          </div>
        </div>

        <!-- Dossier Navigation Tabs -->
        <div class="dossier-nav">
          <button
            class="nav-tab"
            [class.active]="activeTab() === 'orders'"
            (click)="activeTab.set('orders')"
          >
            Sales Orders ({{ c.totalOrdersCount }})
          </button>
          <button
            class="nav-tab"
            [class.active]="activeTab() === 'challans'"
            (click)="activeTab.set('challans')"
          >
            Delivery Challans ({{ c.totalChallansCount }})
          </button>
          <button
            class="nav-tab"
            [class.active]="activeTab() === 'invoices'"
            (click)="activeTab.set('invoices')"
          >
            Invoices & Payments ({{ c.totalInvoicesCount }})
          </button>
          <button
            class="nav-tab"
            [class.active]="activeTab() === 'tickets'"
            (click)="activeTab.set('tickets')"
          >
            Open Tickets ({{ c.openTicketsCount }})
          </button>
          <button
            class="nav-tab"
            [class.active]="activeTab() === 'assets'"
            (click)="activeTab.set('assets')"
          >
            Installed Machinery ({{ c.installedAssetsCount }})
          </button>
        </div>

        @if (moreThanShown(c)) {
          <p class="state-note text-xs">Showing the latest 10 of each.</p>
        }

        <!-- Tab 1: Orders -->
        @if (activeTab() === 'orders') {
          <div class="table-card">
            <table class="ar-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer PO</th>
                  <th>Order Date</th>
                  <th class="num-col">Grand Total</th>
                  <th>Status</th>
                  <th class="actions-col">Action</th>
                </tr>
              </thead>
              <tbody>
                @for (o of c.recentOrders; track o.id) {
                  <tr>
                    <td class="font-mono font-bold text-primary">{{ o.orderNumber }}</td>
                    <td>
                      <span class="po-badge font-mono">{{ o.customerPoNumber || '—' }}</span>
                    </td>
                    <td>{{ o.orderDateUtc | date: 'dd MMM yyyy' }}</td>
                    <td class="num-col font-bold">
                      ₹{{ o.grandTotalInPaise / 100 | number: '1.2-2' }}
                    </td>
                    <td>
                      <ar-chip [tone]="getOrderStatusTone(o.status)">{{
                        getOrderStatusLabel(o.status)
                      }}</ar-chip>
                    </td>
                    <td class="actions-col">
                      <a
                        ar-button
                        variant="ghost"
                        routerLink="/sales/orders"
                        [queryParams]="{ open: o.id }"
                        >Open</a
                      >
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="empty-state">
                      No sales orders found for this customer.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- Tab 2: Challans -->
        @if (activeTab() === 'challans') {
          <div class="table-card">
            <table class="ar-table">
              <thead>
                <tr>
                  <th>Challan #</th>
                  <th>Order Ref</th>
                  <th>Transporter</th>
                  <th>Vehicle Number</th>
                  <th>LR Number</th>
                  <th>Status</th>
                  <th class="actions-col">Action</th>
                </tr>
              </thead>
              <tbody>
                @for (dc of c.recentChallans; track dc.id) {
                  <tr>
                    <td class="font-mono font-bold text-primary">{{ dc.challanNumber }}</td>
                    <td class="font-mono text-xs">{{ dc.salesOrderNumber || 'Direct' }}</td>
                    <td>{{ dc.transporterName || '—' }}</td>
                    <td class="font-mono text-xs">{{ dc.vehicleNumber || '—' }}</td>
                    <td class="font-mono text-xs">{{ dc.lrNumber || '—' }}</td>
                    <td>
                      <ar-chip [tone]="getChallanStatusTone(dc.status)">{{
                        getChallanStatusLabel(dc.status)
                      }}</ar-chip>
                    </td>
                    <td class="actions-col">
                      <a
                        ar-button
                        variant="ghost"
                        routerLink="/sales/challans"
                        [queryParams]="{ open: dc.id }"
                        >View</a
                      >
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="empty-state">No delivery challans recorded.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- Tab 3: Invoices -->
        @if (activeTab() === 'invoices') {
          <div class="table-card">
            <table class="ar-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th class="num-col">Invoice Total</th>
                  <th class="num-col">Balance Due</th>
                  <th>Status</th>
                  <th class="actions-col">Action</th>
                </tr>
              </thead>
              <tbody>
                @for (inv of c.recentInvoices; track inv.id) {
                  <tr>
                    <td class="font-mono font-bold text-primary">{{ inv.invoiceNumber }}</td>
                    <td>{{ inv.issueDateUtc | date: 'dd MMM yyyy' }}</td>
                    <td>{{ inv.dueDateUtc | date: 'dd MMM yyyy' }}</td>
                    <td class="num-col font-bold">
                      ₹{{ inv.grandTotalInPaise / 100 | number: '1.2-2' }}
                    </td>
                    <td class="num-col font-bold" [class.text-danger]="inv.balanceDueInPaise > 0">
                      ₹{{ inv.balanceDueInPaise / 100 | number: '1.2-2' }}
                    </td>
                    <td>
                      <ar-chip [tone]="getInvoiceStatusTone(inv.status)">{{
                        getInvoiceStatusLabel(inv.status)
                      }}</ar-chip>
                    </td>
                    <td class="actions-col">
                      <a
                        ar-button
                        variant="ghost"
                        routerLink="/sales/invoices"
                        [queryParams]="{ open: inv.id }"
                        >View</a
                      >
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="empty-state">No commercial invoices found.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- Tab 4: Tickets -->
        @if (activeTab() === 'tickets') {
          <div class="table-card">
            <table class="ar-table">
              <thead>
                <tr>
                  <th>Ticket #</th>
                  <th>Subject</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th class="actions-col">Action</th>
                </tr>
              </thead>
              <tbody>
                @for (t of c.openTickets; track t.id) {
                  <tr>
                    <td class="font-mono font-bold">{{ t.ticketNumber }}</td>
                    <td class="font-semibold">{{ t.subject }}</td>
                    <td>
                      <ar-chip [tone]="ticketPriorityTone(t.priority)">{{ t.priority }}</ar-chip>
                    </td>
                    <td>
                      <ar-chip [tone]="t.status === 'Pending' ? 'warn' : 'teal'">{{
                        t.status
                      }}</ar-chip>
                    </td>
                    <td>{{ t.creationTime | date: 'dd MMM yyyy' }}</td>
                    <td class="actions-col">
                      <a
                        ar-button
                        variant="ghost"
                        routerLink="/helpdesk"
                        [queryParams]="{ open: t.id }"
                        >Desk</a
                      >
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="empty-state">
                      No open service tickets for this customer.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- Tab 5: Assets -->
        @if (activeTab() === 'assets') {
          <div class="table-card">
            <table class="ar-table">
              <thead>
                <tr>
                  <th>Serial #</th>
                  <th>Machine / Equipment Model</th>
                  <th>Commissioned</th>
                  <th>Operational Status</th>
                  <th>AMC Contract</th>
                  <th class="actions-col">Action</th>
                </tr>
              </thead>
              <tbody>
                @for (ast of c.installedAssets; track ast.id) {
                  <tr>
                    <td class="font-mono font-bold text-primary">{{ ast.serialNumber }}</td>
                    <td class="font-semibold">{{ ast.modelName }}</td>
                    <td>{{ (ast.commissionedDate | date: 'dd MMM yyyy') || '—' }}</td>
                    <td>
                      <ar-chip tone="good">{{ ast.status }}</ar-chip>
                    </td>
                    <td>
                      <ar-chip [tone]="amcTone(ast.amcStatus)">{{ ast.amcStatus }}</ar-chip>
                    </td>
                    <td class="actions-col">
                      <a
                        ar-button
                        variant="ghost"
                        routerLink="/installed-base"
                        [queryParams]="{ open: ast.id }"
                        >Details</a
                      >
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="empty-state">
                      No machines registered in installed base.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      } @else if (loading()) {
        <p class="state-note">Loading Customer 360…</p>
      } @else {
        @if (error(); as e) {
          <p class="state-note state-note--bad" role="alert">{{ e }}</p>
        }
        <section class="picker">
          <h2 class="picker__title">Open a customer</h2>
          <p class="picker__hint">
            Search by name, company or WhatsApp number. You can also open Customer 360 from any row
            on Contacts or Accounts.
          </p>
          <ar-search-box
            placeholder="Search contacts and accounts"
            [query]="pickerQuery()"
            (queryChange)="searchContacts($event)"
          />
          @if (pickerBusy()) {
            <p class="picker__hint">Searching…</p>
          } @else if (
            pickerQuery().trim() && pickerResults().length === 0 && pickerAccounts().length === 0
          ) {
            <p class="picker__hint">Nothing matches “{{ pickerQuery() }}”.</p>
          }
          @if (pickerAccounts().length) {
            <h3 class="picker__group">Accounts</h3>
            <ul class="picker__list">
              @for (a of pickerAccounts(); track a.id) {
                <li>
                  <a class="picker__item" [routerLink]="['/contacts/accounts', a.id, '360']">
                    <span class="picker__name">{{ a.name }}</span>
                    @if (a.city) {
                      <span class="picker__meta">{{ a.city }}</span>
                    }
                    <span class="picker__meta"
                      >{{ a.contactCount }} contact{{ a.contactCount === 1 ? '' : 's' }}</span
                    >
                  </a>
                </li>
              }
            </ul>
            @if (pickerResults().length) {
              <h3 class="picker__group">Contacts</h3>
            }
          }
          <ul class="picker__list">
            @for (p of pickerResults(); track p.id) {
              <li>
                <a class="picker__item" [routerLink]="['/contacts', p.id, '360']">
                  <span class="picker__name">{{ p.displayName || p.waId }}</span>
                  @if (p.companyName) {
                    <span class="picker__meta">{{ p.companyName }}</span>
                  }
                  <span class="picker__meta">{{ p.waId }}</span>
                </a>
              </li>
            }
          </ul>
        </section>
      }
    </div>
  `,
  styles: [
    `
      /* Text helpers the template uses; nothing global defines them. */
      .text-muted {
        color: var(--ar-ink-500);
      }
      .text-xs {
        font-size: 0.75rem;
      }
      .font-mono {
        font-family: var(--ar-font-mono, ui-monospace, monospace);
      }
      .font-bold {
        font-weight: 600;
      }
      .font-semibold {
        font-weight: 500;
      }
      .state-note {
        margin: 0;
        color: var(--ar-ink-500);
      }
      .state-note--bad {
        color: var(--ar-bad-600, #b91c1c);
      }
      .picker {
        background: var(--ar-surface, #ffffff);
        border: 1px solid var(--ar-line, #e2e8f0);
        border-radius: 8px;
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        max-width: 640px;
      }
      .picker__title {
        margin: 0;
        font-size: 1.05rem;
        color: var(--ar-ink-900);
      }
      .picker__hint {
        margin: 0;
        color: var(--ar-ink-500);
        font-size: 0.85rem;
      }
      .picker__group {
        margin: 0.5rem 0 0;
        font-size: 0.72rem;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--ar-ink-500);
      }
      .subs-toggle {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        cursor: pointer;
      }
      .picker__list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
      }
      .picker__item {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem 0.75rem;
        align-items: baseline;
        padding: 0.6rem 0.5rem;
        border-top: 1px solid var(--ar-line, #e2e8f0);
        text-decoration: none;
        color: inherit;
      }
      .picker__item:hover,
      .picker__item:focus-visible {
        background: var(--ar-ink-50, #f8fafc);
      }
      .picker__name {
        color: var(--ar-blue-600);
        font-weight: 500;
      }
      .picker__meta {
        color: var(--ar-ink-500);
        font-size: 0.8rem;
      }
      .dossier-shell {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      .actions-row {
        display: flex;
        gap: 0.5rem;
      }
      .customer-banner {
        background: var(--ar-surface, #ffffff);
        border: 1px solid var(--ar-line, #e2e8f0);
        border-radius: 8px;
        padding: 1.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 1rem;
      }
      .banner-main {
        display: flex;
        gap: 1rem;
        align-items: center;
      }
      .avatar-box {
        width: 56px;
        height: 56px;
        border-radius: 8px;
        background: var(--ar-primary, #0284c7);
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        font-weight: 700;
      }
      .cust-name {
        margin: 0 0 0.375rem 0;
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--ar-ink-heavy, #0f172a);
      }
      .cust-meta {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .meta-pill {
        font-size: 0.75rem;
        background: var(--ar-surface-sunken, #f1f5f9);
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        color: var(--ar-ink-muted, #64748b);
      }
      .banner-contact {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-size: 0.8125rem;
        color: var(--ar-ink-heavy, #0f172a);
      }
      .credit-kpi-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1rem;
      }
      @media (max-width: 900px) {
        .credit-kpi-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
      .kpi-card {
        background: var(--ar-surface, #ffffff);
        border: 1px solid var(--ar-line, #e2e8f0);
        border-radius: 8px;
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
      }
      .kpi-card.on-hold {
        border-color: #ef4444;
        background: #fef2f2;
      }
      .card-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .card-lbl {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        color: var(--ar-ink-muted, #64748b);
      }
      .kpi-val {
        font-size: 1.375rem;
        font-weight: 700;
        color: var(--ar-ink-heavy, #0f172a);
      }
      .text-success {
        color: #059669;
      }
      .text-danger {
        color: #dc2626;
      }
      .text-primary {
        color: var(--ar-primary, #0284c7);
      }
      .dossier-nav {
        display: flex;
        gap: 0.5rem;
        border-bottom: 2px solid var(--ar-line, #e2e8f0);
        padding-bottom: 0.25rem;
        flex-wrap: wrap;
      }
      .nav-tab {
        background: transparent;
        border: none;
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--ar-ink-muted, #64748b);
        cursor: pointer;
        border-bottom: 2px solid transparent;
        margin-bottom: -0.375rem;
        transition: all 0.15s ease;
      }
      .nav-tab.active {
        color: var(--ar-primary, #0284c7);
        border-bottom-color: var(--ar-primary, #0284c7);
      }
      .table-card {
        background: var(--ar-surface, #ffffff);
        border: 1px solid var(--ar-line, #e2e8f0);
        border-radius: 8px;
        overflow-x: auto;
      }
      .ar-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.875rem;
        text-align: left;
      }
      .ar-table th {
        background: var(--ar-surface-sunken, #f8fafc);
        color: var(--ar-ink-muted, #64748b);
        font-weight: 600;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--ar-line, #e2e8f0);
      }
      .ar-table td {
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--ar-line-weak, #f1f5f9);
        color: var(--ar-ink-heavy, #0f172a);
      }
      .po-badge {
        background: var(--ar-surface-sunken, #e2e8f0);
        padding: 0.125rem 0.375rem;
        border-radius: 4px;
        font-size: 0.75rem;
      }
      .num-col {
        text-align: right;
      }
      .actions-col {
        text-align: right;
        width: 100px;
      }
      .empty-state {
        text-align: center;
        padding: 3rem 1rem;
        color: var(--ar-ink-muted, #64748b);
      }
    `,
  ],
})
export class ArCustomer360 {
  private readonly c360Service = inject(Customer360Service);
  private readonly contacts = inject(ContactService);
  private readonly route = inject(ActivatedRoute);

  data = signal<Customer360Dto | null>(environment.useMockData ? MOCK_CUSTOMER_360 : null);
  activeTab = signal<Tab>('orders');
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  /** With no customer in the URL, the page is a contact picker. */
  protected readonly pickerQuery = signal('');
  protected readonly pickerResults = signal<ContactDto[]>([]);
  protected readonly pickerAccounts = signal<CustomerAccountDto[]>([]);
  private readonly accounts = inject(CustomerAccountService);
  private readonly router = inject(Router);
  protected readonly pickerBusy = signal(false);
  private pickerSeq = 0;
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const contactId = params.get('id');
      const accountId = params.get('accountId');
      // ?subsidiaries=1 takes in every account beneath this one.
      const subsidiaries = this.route.snapshot.queryParamMap.get('subsidiaries') === '1';
      if (contactId) this.load(this.c360Service.get(contactId, { skipHandleError: true }));
      else if (accountId)
        this.load(
          this.c360Service.getByAccount(accountId, subsidiaries, { skipHandleError: true }),
        );
      else if (!environment.useMockData) {
        this.data.set(null);
        this.searchContacts('');
      }
    });
  }

  private load(request: Observable<Customer360Dto>): void {
    if (environment.useMockData) return;
    this.data.set(null);
    this.error.set(null);
    this.loading.set(true);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.data.set(res ?? null);
        if (!res) this.error.set('This customer could not be found.');
      },
      error: (err: { error?: { error?: { message?: string } } }) => {
        this.loading.set(false);
        this.error.set(err?.error?.error?.message ?? 'Customer 360 could not be loaded.');
        this.searchContacts('');
      },
    });
  }

  /** Opens the order form with this customer already picked. */
  protected readonly newOrderParams = computed(() => {
    const c = this.data();
    const contactId = c?.contactId ?? (c && !c.isAccountView ? c.id : null);
    if (!c || !contactId) return { new: 1 };
    return { new: 1, customer: contactId, customerName: c.contactName ?? c.customerName };
  });

  protected readonly subtitle = computed(() => {
    const c = this.data();
    if (!c) return 'Pick a customer';
    if (c.isAccountView) return `${c.customerName} · whole account`;
    return c.accountName ? `${c.customerName} · ${c.accountName}` : c.customerName;
  });

  /** True when any tab has more records than the latest ten it lists. */
  protected moreThanShown(c: Customer360Dto): boolean {
    return (
      c.totalOrdersCount > c.recentOrders.length ||
      c.totalChallansCount > c.recentChallans.length ||
      c.totalInvoicesCount > c.recentInvoices.length ||
      c.openTicketsCount > c.openTickets.length ||
      c.installedAssetsCount > c.installedAssets.length
    );
  }

  protected ticketPriorityTone(priority: string): ChipTone {
    switch (priority) {
      case 'Urgent':
        return 'bad';
      case 'High':
        return 'warn';
      case 'Low':
        return 'neutral';
      default:
        return 'amber';
    }
  }

  protected amcTone(status: string | undefined): ChipTone {
    if (status === 'Active') return 'good';
    if (status === 'Expired') return 'bad';
    return 'neutral';
  }

  /** Re-reads the account view with or without its subsidiaries, and keeps it in the URL. */
  protected setSubsidiaries(on: boolean): void {
    const accountId = this.route.snapshot.paramMap.get('accountId');
    if (!accountId) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { subsidiaries: on ? 1 : null },
      replaceUrl: true,
    });
    this.load(this.c360Service.getByAccount(accountId, on, { skipHandleError: true }));
  }

  protected searchContacts(term: string): void {
    this.pickerQuery.set(term);
    const seq = ++this.pickerSeq;
    this.pickerBusy.set(true);
    // Accounts only once something is typed: the empty picker lists recent contacts.
    if (term.trim()) {
      this.accounts
        .getList(
          { filter: term.trim(), maxResultCount: 8, skipCount: 0 },
          { skipHandleError: true },
        )
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            if (seq === this.pickerSeq) this.pickerAccounts.set(res.items ?? []);
          },
          error: () => {
            if (seq === this.pickerSeq) this.pickerAccounts.set([]);
          },
        });
    } else {
      this.pickerAccounts.set([]);
    }
    this.contacts
      .getList(
        { filter: term.trim() || undefined, maxResultCount: 20, skipCount: 0 },
        { skipHandleError: true },
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (seq !== this.pickerSeq) return;
          this.pickerBusy.set(false);
          this.pickerResults.set(res.items ?? []);
        },
        error: () => {
          if (seq !== this.pickerSeq) return;
          this.pickerBusy.set(false);
          this.pickerResults.set([]);
        },
      });
  }

  getOrderStatusLabel(status: SalesOrderStatus): string {
    switch (status) {
      case SalesOrderStatus.Draft:
        return 'Draft';
      case SalesOrderStatus.Confirmed:
        return 'Confirmed';
      case SalesOrderStatus.InProduction:
        return 'In Production';
      case SalesOrderStatus.PartiallyDispatched:
        return 'Partially Dispatched';
      case SalesOrderStatus.Dispatched:
        return 'Dispatched';
      case SalesOrderStatus.Completed:
        return 'Completed';
      case SalesOrderStatus.Cancelled:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  }

  getOrderStatusTone(status: SalesOrderStatus): ChipTone {
    switch (status) {
      case SalesOrderStatus.Draft:
        return 'neutral';
      case SalesOrderStatus.Confirmed:
        return 'teal';
      case SalesOrderStatus.InProduction:
        return 'amber';
      case SalesOrderStatus.PartiallyDispatched:
        return 'warn';
      case SalesOrderStatus.Dispatched:
        return 'good';
      case SalesOrderStatus.Completed:
        return 'good';
      case SalesOrderStatus.Cancelled:
        return 'bad';
      default:
        return 'neutral';
    }
  }

  getChallanStatusLabel(status: DeliveryChallanStatus): string {
    switch (status) {
      case DeliveryChallanStatus.Draft:
        return 'Draft';
      case DeliveryChallanStatus.Dispatched:
        return 'In Transit';
      case DeliveryChallanStatus.Delivered:
        return 'Delivered';
      case DeliveryChallanStatus.Invoiced:
        return 'Invoiced';
      default:
        return 'Unknown';
    }
  }

  getChallanStatusTone(status: DeliveryChallanStatus): ChipTone {
    switch (status) {
      case DeliveryChallanStatus.Draft:
        return 'neutral';
      case DeliveryChallanStatus.Dispatched:
        return 'amber';
      case DeliveryChallanStatus.Delivered:
        return 'good';
      case DeliveryChallanStatus.Invoiced:
        return 'teal';
      default:
        return 'neutral';
    }
  }

  getInvoiceStatusLabel(status: SalesInvoiceStatus): string {
    switch (status) {
      case SalesInvoiceStatus.Draft:
        return 'Draft';
      case SalesInvoiceStatus.Issued:
        return 'Issued';
      case SalesInvoiceStatus.PartiallyPaid:
        return 'Partially Paid';
      case SalesInvoiceStatus.Paid:
        return 'Paid';
      default:
        return 'Unknown';
    }
  }

  getInvoiceStatusTone(status: SalesInvoiceStatus): ChipTone {
    switch (status) {
      case SalesInvoiceStatus.Draft:
        return 'neutral';
      case SalesInvoiceStatus.Issued:
        return 'teal';
      case SalesInvoiceStatus.PartiallyPaid:
        return 'amber';
      case SalesInvoiceStatus.Paid:
        return 'good';
      default:
        return 'neutral';
    }
  }
}
