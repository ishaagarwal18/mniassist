import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PermissionService } from '@abp/ng.core';
import {
  ExcelExportService,
  FilterService,
  PageService,
  PdfExportService,
  ResizeService,
  SortService,
  ToolbarService,
  TreeGridComponent,
  TreeGridModule,
} from '@syncfusion/ej2-angular-treegrid';
import type { ClickEventArgs } from '@syncfusion/ej2-navigations';

import { NavDrawer } from '../../layout/nav-drawer';
import {
  AccountRow,
  AccountStore,
  CustomerAccount,
  MAX_ACCOUNT_DEPTH,
  moveProblem,
} from '../../core/services/account.store';
import { DecisionRole } from '../../proxy/contacts';
import type { ContactDto } from '../../proxy/contacts/models';
import { ContactService as ContactApi } from '../../proxy/contacts/contact.service';
import { CustomerAccountService } from '../../proxy/contacts/customer-account.service';
import { ContactService } from '../../core/services/contact.service';
import { ArContactDialog } from './contact-dialog';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import { ArAvatar, ArButton, ArDialog, ArIcon } from '../../ui';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { grantedPolicy } from '../../core/auth/permission';
import { registerSyncfusionLicense } from '../../core/ui/syncfusion-license';
import { ensureSyncfusionTheme } from '../../core/ui/syncfusion-theme';
import { filterAssignableContacts } from './account-contacts.logic';
import {
  buildAccountTreeRows,
  computeAccountStats,
  computePresetCounts,
  filterAccountTree,
  sanitizeWebsiteUrl,
  type AccountFilterPreset,
  type AccountStats,
  type AccountTreeRecord,
  type PresetCounts,
} from './accounts-tree.logic';

// Register Syncfusion licence before any component constructs
registerSyncfusionLicense();

interface Draft {
  name: string;
  industry: string;
  city: string;
  state: string;
  website: string;
  notes: string;
  /** The account this one sits under; blank for a top-level account. */
  parentId: string;
}

const BLANK: Draft = {
  name: '',
  industry: '',
  city: '',
  state: '',
  website: '',
  notes: '',
  parentId: '',
};

/**
 * Company / plant grouping (M03-11), displayed in a Syncfusion TreeGrid:
 * a group owns companies, a company owns plants, up to five levels. Several contacts on
 * one deal roll up to their account, and a parent's rollup can include every subsidiary
 * beneath it — "how is the whole group doing" without adding the plants up by hand.
 */
@Component({
  selector: 'ar-accounts',
  imports: [
    ArTopbar,
    ArButton,
    ArDialog,
    ArIcon,
    ArAvatar,
    ArContactDialog,
    RouterLink,
    TreeGridModule,
  ],
  providers: [
    PageService,
    SortService,
    FilterService,
    ToolbarService,
    ExcelExportService,
    PdfExportService,
    ResizeService,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './accounts.html',
  styleUrl: './accounts.scss',
})
export class ArAccounts implements OnDestroy {
  @ViewChild('treegrid') treegrid?: TreeGridComponent;

  private readonly router = inject(Router);
  private readonly dialogs = inject(ConfirmService);
  private readonly permissions = inject(PermissionService);
  private readonly store = inject(AccountStore);
  private readonly navDrawer = inject(NavDrawer, { optional: true });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  private resizeObserver?: ResizeObserver;

  constructor() {
    ensureSyncfusionTheme('grid');
    afterNextRender(() => {
      if (typeof ResizeObserver !== 'undefined') {
        const card = this.host.querySelector('.acc-table-card');
        if (card) {
          let timer: any;
          this.resizeObserver = new ResizeObserver(() => {
            clearTimeout(timer);
            timer = setTimeout(() => this.recalcGridWidth(), 50);
          });
          this.resizeObserver.observe(card);
        }
      }
    });

    if (this.navDrawer) {
      effect(() => {
        this.navDrawer?.collapsed();
        [50, 150, 300].forEach((delay) => {
          setTimeout(() => this.recalcGridWidth(), delay);
        });
      });
    }
  }

  private recalcGridWidth(): void {
    window.dispatchEvent(new Event('resize'));
    if (this.treegrid) {
      (this.treegrid as any).grid?.refreshHeader();
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  protected readonly canCreate = grantedPolicy('AutoReach.Contacts.Create', this.permissions);
  protected readonly canUpdate = grantedPolicy('AutoReach.Contacts.Update', this.permissions);
  protected readonly canDelete = grantedPolicy('AutoReach.Contacts.Delete', this.permissions);
  protected readonly canView360 = grantedPolicy('AutoReach.Customer360', this.permissions);
  /** Buyers' re-order roles and the company's credit terms. */
  protected readonly canBuyers = grantedPolicy(
    'AutoReach.ReorderPortal.Settings',
    this.permissions,
  );

  // ---- An account's people, from its contact count ------------------------------------
  private readonly contactApi = inject(ContactApi);
  private readonly contactStore = inject(ContactService);
  private readonly customerAccountApi = inject(CustomerAccountService);
  private readonly toast = inject(ToastService);

  protected readonly peopleFor = signal<CustomerAccount | null>(null);
  protected readonly people = signal<ContactDto[]>([]);
  protected readonly peopleTotal = signal(0);
  protected readonly peopleLoading = signal(false);
  protected readonly peopleError = signal<string | null>(null);
  protected readonly peopleSubs = signal(false);
  protected readonly hasSubsidiaryPeople = signal(false);

  // Contact assignment and creation state
  protected readonly contactModalMode = signal<'list' | 'assign'>('list');
  protected readonly assignSearchTerm = signal('');
  protected readonly assignSearching = signal(false);
  protected readonly allAssignableCandidates = signal<ContactDto[]>([]);
  protected readonly contactDialogOpen = signal(false);

  // ---- TreeGrid settings, presets & state ---------------------------------------------
  protected readonly activePreset = signal<AccountFilterPreset>('all');
  protected readonly searchQuery = signal('');
  protected readonly pageSettings = { pageSize: 20, pageSizes: [10, 20, 50, 100] };
  protected readonly toolbarOptions: string[] = [];
  protected readonly filterSettings = { type: 'Menu' as const };

  /** Full unfiltered hierarchical dataset */
  protected readonly allTreeData = computed<AccountTreeRecord[]>(() =>
    buildAccountTreeRows(this.store.all(), this.store.rows()),
  );

  /** Executive KPI metrics for top stats bar */
  protected readonly stats = computed<AccountStats>(() => computeAccountStats(this.store.all()));

  /** Counts for quick filter preset pills */
  protected readonly presetCounts = computed<PresetCounts>(() =>
    computePresetCounts(this.allTreeData()),
  );

  /** Active data bound to Syncfusion TreeGrid */
  protected readonly treeData = computed<AccountTreeRecord[]>(() =>
    filterAccountTree(this.allTreeData(), this.activePreset()),
  );

  protected setPreset(preset: AccountFilterPreset): void {
    this.activePreset.set(preset);
  }

  protected onSearch(query: string): void {
    this.searchQuery.set(query);
    this.treegrid?.search(query.trim());
  }

  protected clearSearch(): void {
    this.searchQuery.set('');
    this.treegrid?.search('');
  }

  protected expandAll(): void {
    this.treegrid?.expandAll();
  }

  protected collapseAll(): void {
    this.treegrid?.collapseAll();
  }

  protected exportExcel(): void {
    void this.treegrid?.excelExport({ fileName: 'accounts.xlsx' });
  }

  protected exportCsv(): void {
    void this.treegrid?.csvExport({ fileName: 'accounts.csv' });
  }

  protected onToolbarClick(args: ClickEventArgs): void {
    const id = (args.item?.id ?? '').toLowerCase();
    if (id.includes('excelexport')) {
      void this.treegrid?.excelExport({ fileName: 'accounts.xlsx' });
    } else if (id.includes('csvexport')) {
      void this.treegrid?.csvExport({ fileName: 'accounts.csv' });
    }
  }

  protected sanitizeUrl(url?: string): string {
    return sanitizeWebsiteUrl(url);
  }

  protected parentAccountName(parentId: string): string {
    if (!parentId) return 'None (Top-level)';
    const match = this.store.all().find((a) => a.id === parentId);
    return match?.name || parentId;
  }

  protected openPeople(account: CustomerAccount, hasSubsidiaryPeople: boolean): void {
    this.peopleFor.set(account);
    this.hasSubsidiaryPeople.set(hasSubsidiaryPeople);
    this.contactModalMode.set('list');
    // Nobody here but people below: start with them showing.
    this.peopleSubs.set(hasSubsidiaryPeople && account.contactCount === 0);
    void this.loadPeople();
  }

  protected closePeople(): void {
    this.peopleFor.set(null);
    this.contactModalMode.set('list');
  }

  protected togglePeopleSubs(on: boolean): void {
    this.peopleSubs.set(on);
    void this.loadPeople();
  }

  protected async loadPeople(): Promise<void> {
    const account = this.peopleFor();
    if (!account) return;
    this.peopleLoading.set(true);
    this.peopleError.set(null);
    try {
      const page = await firstValueFrom(
        this.contactApi.getList({
          accountId: account.id,
          includeSubsidiaries: this.peopleSubs(),
          maxResultCount: 100,
          skipCount: 0,
          sorting: 'displayName',
        }),
      );
      this.people.set(page.items ?? []);
      this.peopleTotal.set(page.totalCount ?? 0);
    } catch (e: unknown) {
      this.peopleError.set(readApiError(e, 'The contacts could not be loaded.'));
    } finally {
      this.peopleLoading.set(false);
    }
  }

  protected openAssignContact(): void {
    this.contactModalMode.set('assign');
    this.assignSearchTerm.set('');
    void this.refreshAssignableCandidates('');
  }

  protected cancelAssign(): void {
    this.contactModalMode.set('list');
  }

  protected async onAssignSearch(query: string): Promise<void> {
    this.assignSearchTerm.set(query);
    await this.refreshAssignableCandidates(query);
  }

  private async refreshAssignableCandidates(query: string): Promise<void> {
    const account = this.peopleFor();
    if (!account) return;
    this.assignSearching.set(true);
    try {
      const page = await firstValueFrom(
        this.contactApi.getList({
          filter: query.trim() || undefined,
          maxResultCount: 50,
          skipCount: 0,
        }),
      );
      const matches = filterAssignableContacts(page.items ?? [], account.id, query);
      this.allAssignableCandidates.set(matches);
    } catch (e: unknown) {
      this.toast.error(readApiError(e, 'Could not search contacts.'));
    } finally {
      this.assignSearching.set(false);
    }
  }

  protected async assignContact(contact: ContactDto): Promise<void> {
    const account = this.peopleFor();
    if (!account || !contact.id) return;
    try {
      await firstValueFrom(this.customerAccountApi.setContactAccount([contact.id], account.id));
      this.store.reload();
      this.toast.success(`Assigned ${contact.displayName || contact.waId} to ${account.name}.`);
      await this.loadPeople();
      this.contactModalMode.set('list');
    } catch (e) {
      this.toast.error(readApiError(e, 'Could not assign contact to account.'));
    }
  }

  protected openCreateContact(): void {
    // Utilises the existing contact add-new functionality
    this.contactDialogOpen.set(true);
  }

  protected async onContactCreated(): Promise<void> {
    const account = this.peopleFor();
    if (account) {
      this.store.reload();
      await this.loadPeople();
    }
  }

  protected async unlinkContact(contact: ContactDto): Promise<void> {
    const account = this.peopleFor();
    if (!account || !contact.id) return;
    try {
      await firstValueFrom(this.customerAccountApi.setContactAccount([contact.id], ''));
      this.store.reload();
      this.toast.info(`Unlinked ${contact.displayName || contact.waId} from ${account.name}.`);
      await this.loadPeople();
    } catch (e) {
      this.toast.error(readApiError(e, 'Could not unlink contact.'));
    }
  }

  /** Contacts, filtered to this account. */
  protected openAllOnContacts(account: CustomerAccount): void {
    this.contactStore.filterByAccount(account.id);
    this.peopleFor.set(null);
  }

  /** "Purchase manager · Purchase": designation and decision role, whichever are known. */
  protected personLine(p: ContactDto): string {
    const role =
      p.role === undefined || p.role === DecisionRole.Unknown
        ? ''
        : (DecisionRole[p.role] ?? '').replace(/([a-z])([A-Z])/g, '$1 $2');
    return [p.designation, role].filter((s) => !!s).join(' · ') || '—';
  }

  protected readonly rows = this.store.rows;
  protected readonly searching = computed(() => this.store.filter().trim().length > 0);
  protected readonly maxDepth = MAX_ACCOUNT_DEPTH;
  protected readonly loading = this.store.loading;

  protected readonly editorOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly draft = signal<Draft>({ ...BLANK });
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  /**
   * Accounts the one being edited may sit under: anything that would not create a loop or push the tree past
   * its depth limit. The server checks again — this only keeps the picker from offering a refusal.
   */
  protected readonly parentOptions = computed(() => {
    const id = this.editingId();
    return this.store
      .all()
      .filter((a) => a.id !== id && moveProblem(id, a.id, this.store.all()) === null);
  });

  protected search(term: string): void {
    this.treegrid?.search(term);
  }

  protected patch<K extends keyof Draft>(key: K, value: Draft[K]): void {
    this.draft.update((d) => ({ ...d, [key]: value }));
  }

  protected openNew(parentId = ''): void {
    void this.router.navigate(['/contacts/accounts/new'], {
      queryParams: parentId ? { parentId } : {},
    });
  }

  protected openEdit(a: CustomerAccount): void {
    void this.router.navigate(['/contacts/accounts', a.id, 'edit']);
  }

  protected async save(): Promise<void> {
    const d = this.draft();
    if (!d.name.trim()) {
      this.error.set('A name is required.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.store.save(this.editingId(), {
        name: d.name.trim(),
        industry: d.industry.trim() || null,
        city: d.city.trim() || null,
        state: d.state.trim() || null,
        website: d.website.trim() || null,
        notes: d.notes.trim() || null,
        parentAccountId: d.parentId || null,
      });
      this.editorOpen.set(false);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Could not save the account.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(a: CustomerAccount): Promise<void> {
    const subs =
      a.childCount > 0
        ? ` Its ${a.childCount} subsidiar${a.childCount === 1 ? 'y moves' : 'ies move'} up a level.`
        : '';
    if (
      !(await this.dialogs.delete(
        'this account',
        a.name,
        `Its ${a.contactCount} contact(s) will be ungrouped.${subs}`,
      ))
    )
      return;
    await this.store.remove(a.id);
  }

  protected isTopLevel(row: AccountRow): boolean {
    return row.depth === 1;
  }
}
