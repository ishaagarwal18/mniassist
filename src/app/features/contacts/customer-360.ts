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
import { ArButton, ArChip, ArIcon, ArSearchBox, ChipTone } from '../../ui';
import { ArCustomerActions } from './customer-actions';
import { ToastService } from '../../core/ui/toast.service';
import {
  calculateAvailableCredit,
  calculateCreditUtilization,
  calculateOverdueRatio,
  getAmcStatusTone,
  getChallanStatusLabel,
  getChallanStatusTone,
  getCreditStatusTone,
  getInvoiceStatusLabel,
  getInvoiceStatusTone,
  getOrderStatusLabel,
  getOrderStatusTone,
  getTicketPriorityTone,
  isInvoiceOverdue,
} from './customer-360.logic';

const MOCK_CUSTOMER_360: Customer360Dto = {
  id: 'c1',
  customerName: 'Suresh Patil',
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
  timeline: [
    {
      id: 'tl-1',
      channel: 'WhatsApp',
      summary: 'Order dispatch schedule & delivery challan DC-2026-0019 sent to Suresh Patil via WhatsApp.',
      occurredAtUtc: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      direction: 'Outbound',
    },
    {
      id: 'tl-2',
      channel: 'Phone',
      summary: 'Maintenance query: Hydraulic press calibration support confirmed with plant engineer.',
      occurredAtUtc: new Date(Date.now() - 5 * 86_400_000).toISOString(),
      direction: 'Inbound',
    },
    {
      id: 'tl-3',
      channel: 'Email',
      summary: 'Commercial invoice INV-2026-0081 & GST e-way bill shared with accounts department.',
      occurredAtUtc: new Date(Date.now() - 6 * 86_400_000).toISOString(),
      direction: 'Outbound',
    },
    {
      id: 'tl-4',
      channel: 'WhatsApp',
      summary: 'Purchase order PO-KF-9982 received and confirmed for ₹4,95,600.',
      occurredAtUtc: new Date(Date.now() - 10 * 86_400_000).toISOString(),
      direction: 'Inbound',
    },
  ],
};

export type Customer360Tab = 'overview' | 'orders' | 'challans' | 'invoices' | 'assets' | 'tickets';

@Component({
  selector: 'ar-customer-360',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ArTopbar,
    ArButton,
    ArChip,
    ArSearchBox,
    ArIcon,
    ArCustomerActions,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customer-360.html',
  styleUrl: './customer-360.scss',
})
export class ArCustomer360 {
  private readonly c360Service = inject(Customer360Service);
  private readonly contacts = inject(ContactService);
  private readonly accounts = inject(CustomerAccountService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = signal<Customer360Dto | null>(environment.useMockData ? MOCK_CUSTOMER_360 : null);
  readonly activeTab = signal<Customer360Tab>('overview');
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  // Table search filters
  readonly orderSearchQuery = signal('');
  readonly challanSearchQuery = signal('');
  readonly invoiceSearchQuery = signal('');
  readonly assetSearchQuery = signal('');

  // Picker signals
  protected readonly pickerQuery = signal('');
  protected readonly pickerResults = signal<ContactDto[]>([]);
  protected readonly pickerAccounts = signal<CustomerAccountDto[]>([]);
  protected readonly pickerBusy = signal(false);
  private pickerSeq = 0;

  // Filtered lists computed
  readonly filteredOrders = computed(() => {
    const list = this.data()?.recentOrders ?? [];
    const q = this.orderSearchQuery().trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (o) =>
        o.orderNumber?.toLowerCase().includes(q) ||
        o.customerPoNumber?.toLowerCase().includes(q),
    );
  });

  readonly filteredChallans = computed(() => {
    const list = this.data()?.recentChallans ?? [];
    const q = this.challanSearchQuery().trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (dc) =>
        dc.challanNumber?.toLowerCase().includes(q) ||
        dc.transporterName?.toLowerCase().includes(q) ||
        dc.lrNumber?.toLowerCase().includes(q) ||
        dc.salesOrderNumber?.toLowerCase().includes(q),
    );
  });

  readonly filteredInvoices = computed(() => {
    const list = this.data()?.recentInvoices ?? [];
    const q = this.invoiceSearchQuery().trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (inv) =>
        inv.invoiceNumber?.toLowerCase().includes(q) ||
        inv.salesOrderNumber?.toLowerCase().includes(q),
    );
  });

  readonly filteredAssets = computed(() => {
    const list = this.data()?.installedAssets ?? [];
    const q = this.assetSearchQuery().trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (ast) =>
        ast.serialNumber?.toLowerCase().includes(q) ||
        ast.modelName?.toLowerCase().includes(q),
    );
  });

  // Credit & Exposure Computeds
  readonly creditUtilizationPct = computed(() => {
    const c = this.data();
    if (!c?.credit) return 0;
    return calculateCreditUtilization(
      c.credit.creditLimitInPaise,
      c.credit.totalOwedInPaise,
      c.credit.totalOnOrderInPaise,
    );
  });

  readonly availableCreditInPaise = computed(() => {
    const c = this.data();
    if (!c?.credit) return null;
    return calculateAvailableCredit(
      c.credit.creditLimitInPaise,
      c.credit.totalOwedInPaise,
      c.credit.totalOnOrderInPaise,
    );
  });

  readonly overdueRatioPct = computed(() => {
    const c = this.data();
    if (!c?.credit) return 0;
    return calculateOverdueRatio(
      c.credit.totalOwedInPaise,
      c.credit.totalOverdueInPaise,
    );
  });

  readonly creditTone = computed<ChipTone>(() => {
    const c = this.data();
    if (!c?.credit) return 'neutral';
    return getCreditStatusTone(
      c.credit.onHold,
      this.creditUtilizationPct(),
      c.credit.totalOverdueInPaise,
    );
  });

  readonly subtitle = computed(() => {
    const c = this.data();
    if (!c) return 'Directory & Customer Search';
    if (c.isAccountView) return `${c.customerName} · Corporate Account Dossier`;
    return c.accountName ? `${c.customerName} · ${c.accountName}` : c.customerName;
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const contactId = params.get('id');
      const accountId = params.get('accountId');
      const subsidiaries = this.route.snapshot.queryParamMap.get('subsidiaries') === '1';
      if (contactId) {
        this.load(this.c360Service.get(contactId, { skipHandleError: true }));
      } else if (accountId) {
        this.load(
          this.c360Service.getByAccount(accountId, subsidiaries, { skipHandleError: true }),
        );
      } else if (!environment.useMockData) {
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

  protected refreshCustomer(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const accountId = this.route.snapshot.paramMap.get('accountId');
    const request = id
      ? this.c360Service.get(id)
      : accountId
        ? this.c360Service.getByAccount(accountId, this.data()?.includesSubsidiaries ?? false)
        : null;
    request?.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => this.data.set(data),
      error: () => this.error.set('Customer 360 could not be loaded.'),
    });
  }

  protected clearCustomer(): void {
    void this.router.navigate(['/contacts/360']);
  }

  async copyToClipboard(text: string | undefined, label: string): Promise<void> {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      this.toast.success(`${label} copied to clipboard`, 'Copied');
    } catch {
      this.toast.warning('Unable to copy to clipboard', 'Clipboard');
    }
  }

  cleanPhone(phone?: string): string {
    return phone ? phone.replace(/[^\d+]/g, '') : '';
  }

  whatsAppUrl(phone?: string): string {
    if (!phone) return '';
    const digits = phone.replace(/[^\d]/g, '');
    return `https://wa.me/${digits}`;
  }

  protected moreThanShown(c: Customer360Dto): boolean {
    return (
      c.totalOrdersCount > c.recentOrders.length ||
      c.totalChallansCount > c.recentChallans.length ||
      c.totalInvoicesCount > c.recentInvoices.length ||
      c.openTicketsCount > c.openTickets.length ||
      c.installedAssetsCount > c.installedAssets.length
    );
  }

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

  // Delegated logic helpers
  getOrderStatusLabel(status: SalesOrderStatus): string {
    return getOrderStatusLabel(status);
  }

  getOrderStatusTone(status: SalesOrderStatus): ChipTone {
    return getOrderStatusTone(status);
  }

  getChallanStatusLabel(status: DeliveryChallanStatus): string {
    return getChallanStatusLabel(status);
  }

  getChallanStatusTone(status: DeliveryChallanStatus): ChipTone {
    return getChallanStatusTone(status);
  }

  getInvoiceStatusLabel(status: SalesInvoiceStatus): string {
    return getInvoiceStatusLabel(status);
  }

  getInvoiceStatusTone(status: SalesInvoiceStatus): ChipTone {
    return getInvoiceStatusTone(status);
  }

  getTicketPriorityTone(priority: string): ChipTone {
    return getTicketPriorityTone(priority);
  }

  getAmcStatusTone(status?: string): ChipTone {
    return getAmcStatusTone(status);
  }

  isOverdue(balanceDueInPaise: number, dueDateUtc?: string): boolean {
    return isInvoiceOverdue(balanceDueInPaise, dueDateUtc);
  }
}
