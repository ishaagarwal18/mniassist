import { ArEmailContactDialog } from './email-contact-dialog';
import { ArContactConsent } from './contact-consent';
import { ArCustomerInsights } from './customer-insights';
import { ArAccountProjects } from '../projects/account-projects';
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
import { Observable } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { grantedPolicy } from '../../core/auth/permission';
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
import { ArButton, ArChip, ArIcon, ArSearchBox, ArTabs, ChipTone } from '../../ui';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { ArGrid } from '../../ui/grid';
import { ArCustomerActions } from './customer-actions';
import { ArAtRiskCard } from '../pipeline/obsolescence/at-risk-card';
import { ArCustomer360Links } from './customer-360-links';
import { CockpitOriginService } from '../../layout/cockpit-origin.service';
import { scopeParams } from '../../core/util/customer-scope';
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

const PICKER_PAGE_SIZE = 10;
type PickerTab = 'Accounts' | 'Contacts';

export type Customer360Tab =
  'overview' | 'orders' | 'challans' | 'invoices' | 'assets' | 'tickets' | 'projects';

@Component({
  selector: 'ar-customer-360',
  standalone: true,
  imports: [
    ArEmailContactDialog,
    ArAtRiskCard,
    ArContactConsent,
    ArCustomerInsights,
    CommonModule,
    FormsModule,
    RouterLink,
    ArTopbar,
    ArButton,
    ArChip,
    ArSearchBox,
    ArTabs,
    ArIcon,
    ArCustomerActions,
    ArCustomer360Links,
    ArGrid,
    GridModule,
    ArAccountProjects,
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
  private readonly cockpitOrigin = inject(CockpitOriginService);
  private readonly permissions = inject(PermissionService);
  /** The in-app send needs the Channels permission (EmailChannel); others keep the mailto link. */
  protected readonly canEmail = grantedPolicy('AutoReach.Channels', this.permissions);
  protected readonly emailing = signal(false);

  readonly data = signal<Customer360Dto | null>(null);
  readonly activeTab = signal<Customer360Tab>('overview');

  /**
   * One person's view, not a whole account's. Orders, challans, invoices, payments, credit, machines and service belong to the
   * account (GST, billing and terms live there), so a person's page shows their conversations, timeline and enquiries, and
   * leads to the account for the rest.
   */
  protected readonly isPersonView = computed(() => {
    const c = this.data();
    return !!c && !c.isAccountView;
  });

  protected readonly canCreateOrder = grantedPolicy(
    'AutoReach.SalesOrders.Create',
    this.permissions,
  );
  protected readonly canCreateChallan = grantedPolicy(
    'AutoReach.DeliveryChallans.Create',
    this.permissions,
  );
  protected readonly canCreateInvoice = grantedPolicy(
    'AutoReach.SalesInvoices.Create',
    this.permissions,
  );
  protected readonly canCreateMachine = grantedPolicy(
    'AutoReach.InstalledBase.Create',
    this.permissions,
  );

  /**
   * Opens a New order / challan / invoice / machine page for this account: its newest contact as the customer (the buyer, which
   * the form lets you change; the account follows from them). With no contact on the account yet, the form starts empty.
   */
  protected readonly newRecordParams = computed(() => {
    const c = this.data();
    return c?.contactId
      ? { customer: c.contactId, customerName: c.contactName ?? c.customerName }
      : {};
  });

  /** The Commercial Credit chip's tooltip, for the state it shows. */
  protected readonly creditChipTitle = computed(() => {
    const c = this.data();
    if (!c) return '';
    if (c.credit.onHold)
      return (
        'Credit is on hold' +
        (c.credit.holdReason ? `: ${c.credit.holdReason}` : '') +
        '. New orders need approval.'
      );
    if (this.creditUtilizationPct() >= 90)
      return '90% or more of the credit limit is in use. New orders may take it over the limit.';
    return c.credit.creditLimitInPaise
      ? 'Credit is in good standing: under 90% of the limit is in use and it is not on hold.'
      : 'No credit limit is set and it is not on hold.';
  });

  /** Where this person's company's sales live: its account's Customer 360, when they belong to one. */
  protected readonly accountSalesRoute = computed(() => {
    const c = this.data();
    return c?.accountId ? ['/contacts/accounts', c.accountId, '360'] : null;
  });
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  // Table search filters
  readonly orderSearchQuery = signal('');
  readonly challanSearchQuery = signal('');
  readonly invoiceSearchQuery = signal('');
  readonly assetSearchQuery = signal('');

  // Picker signals: one list (accounts or contacts) at a time, searched and paged on the server
  protected readonly pickerTabs = ['Accounts', 'Contacts'] as const;
  protected readonly pickerTab = signal<PickerTab>('Accounts');
  protected readonly pickerQuery = signal('');
  protected readonly pickerPage = signal(0);
  protected readonly pickerTotal = signal(0);
  protected readonly pickerResults = signal<ContactDto[]>([]);
  protected readonly pickerAccounts = signal<CustomerAccountDto[]>([]);
  protected readonly pickerBusy = signal(false);
  private pickerSeq = 0;
  private pickerDebounce?: ReturnType<typeof setTimeout>;

  protected readonly pickerPageLabel = computed(() => {
    const shown =
      this.pickerTab() === 'Accounts' ? this.pickerAccounts().length : this.pickerResults().length;
    const total = this.pickerTotal();
    if (!total || !shown) return `0 of ${total}`;
    const from = this.pickerPage() * PICKER_PAGE_SIZE + 1;
    return `${from}–${from + shown - 1} of ${total}`;
  });

  protected readonly pickerHasNext = computed(
    () => (this.pickerPage() + 1) * PICKER_PAGE_SIZE < this.pickerTotal(),
  );

  // Filtered lists computed
  readonly filteredOrders = computed(() => {
    const list = this.data()?.recentOrders ?? [];
    const q = this.orderSearchQuery().trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (o) =>
        o.orderNumber?.toLowerCase().includes(q) || o.customerPoNumber?.toLowerCase().includes(q),
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
        ast.serialNumber?.toLowerCase().includes(q) || ast.modelName?.toLowerCase().includes(q),
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
    return calculateOverdueRatio(c.credit.totalOwedInPaise, c.credit.totalOverdueInPaise);
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

  /** Opens a sales list on just this contact, or this whole account. */
  protected readonly scopeParams = computed(() => {
    const c = this.data();
    if (!c) return {};
    return c.isAccountView
      ? scopeParams({
          customerId: null,
          accountId: c.accountId ?? null,
          name: c.accountName ?? c.customerName,
        })
      : scopeParams({
          customerId: c.contactId ?? c.id ?? null,
          accountId: null,
          name: c.customerName,
        });
  });

  readonly subtitle = computed(() => {
    const c = this.data();
    if (!c) return 'Directory & Customer Search';
    if (c.isAccountView) return `${c.customerName} · Corporate Account Dossier`;
    return c.accountName ? `${c.customerName} · ${c.accountName}` : c.customerName;
  });

  constructor() {
    // Screens opened from here show "Customer 360 · <name>" in their breadcrumb, leading back.
    effect(() => {
      const c = this.data();
      this.cockpitOrigin.setCockpitName(
        c ? (c.isAccountView ? c.accountName || c.customerName : c.customerName) : null,
      );
    });
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
      } else {
        this.data.set(null);
        this.loadPicker();
      }
    });
  }

  private load(request: Observable<Customer360Dto>): void {
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
        this.loadPicker();
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

  /**
   * The customer's WhatsApp conversation in the inbox, found by their number: the header's Open in inbox and the links panel
   * open it directly. (The header used to open wa.me, which sends from whatever phone is signed in, outside the platform: no
   * inbox record, no consent check, not the business number. Messages go out with Message customer instead.)
   */
  protected readonly conversationId = signal<string | null>(null);

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

  protected setPickerTab(tab: string): void {
    this.pickerTab.set(tab === 'Contacts' ? 'Contacts' : 'Accounts');
    this.pickerQuery.set('');
    this.pickerPage.set(0);
    this.loadPicker();
  }

  /** Typing restarts at page one; the request waits for a pause in typing. */
  protected searchPicker(term: string): void {
    this.pickerQuery.set(term);
    this.pickerPage.set(0);
    clearTimeout(this.pickerDebounce);
    this.pickerDebounce = setTimeout(() => this.loadPicker(), 250);
  }

  protected goPickerPage(page: number): void {
    this.pickerPage.set(Math.max(0, page));
    this.loadPicker();
  }

  private loadPicker(): void {
    const seq = ++this.pickerSeq;
    const input = {
      filter: this.pickerQuery().trim() || undefined,
      maxResultCount: PICKER_PAGE_SIZE,
      skipCount: this.pickerPage() * PICKER_PAGE_SIZE,
    };
    this.pickerBusy.set(true);
    const done = (total: number) => {
      this.pickerBusy.set(false);
      this.pickerTotal.set(total);
    };

    if (this.pickerTab() === 'Accounts') {
      this.accounts
        .getList(input, { skipHandleError: true })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            if (seq !== this.pickerSeq) return;
            this.pickerAccounts.set(res.items ?? []);
            done(res.totalCount ?? 0);
          },
          error: () => {
            if (seq !== this.pickerSeq) return;
            this.pickerAccounts.set([]);
            done(0);
          },
        });
    } else {
      this.contacts
        .getList(input, { skipHandleError: true })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            if (seq !== this.pickerSeq) return;
            this.pickerResults.set(res.items ?? []);
            done(res.totalCount ?? 0);
          },
          error: () => {
            if (seq !== this.pickerSeq) return;
            this.pickerResults.set([]);
            done(0);
          },
        });
    }
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
