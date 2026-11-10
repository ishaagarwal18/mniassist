import { PermissionService } from '@abp/ng.core';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { canOpenUrl } from '../../../core/auth/nav-access.guard';
import { CurrentUserService } from '../../../core/services/current-user.service';
import { PlanService } from '../../../core/services/plan.service';
import { inr } from '../../../core/util/format';
import {
  PurchasingService,
  SupplierListDto,
  SupplierListItemDto,
  SupplierListSort,
  SupplierListStatus,
} from '../../../proxy/inventory/purchasing.service';
import { ArSearchBox } from '../../../ui/search-box';
import { ArGrid } from '../../../ui/grid';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import {
  SupplierQuery,
  SUPPLIER_PAGE_SIZE,
  localSupplierPage,
  pageCount,
  pageLabel,
  readSupplierQuery,
  supplierQueryParams,
} from './supplier-directory.logic';

/**
 * Purchasing › Suppliers for workspaces with thousands of suppliers: searched by any word of the name, GSTIN, phone, email or
 * contact person, filtered by status and by what is owed, sorted, and 50 to a page, all on the server. The search and page
 * stay in the address, so coming back from editing a supplier lands on the same rows.
 */
@Component({
  selector: 'ar-supplier-directory',
  imports: [RouterLink, ArSearchBox, ArGrid, GridModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sd__bar">
      <ar-search-box
        class="sd__search"
        placeholder="Search suppliers: name, GSTIN, phone, email, contact"
        [query]="query().filter"
        (queryChange)="onSearch($event)"
      />
      <label class="sd__sort" for="sd-sort">
        <span class="sd__label">Sort</span>
        <select
          id="sd-sort"
          class="ar-field__input"
          [value]="query().sort"
          (change)="patch({ sort: +$any($event.target).value })"
        >
          <option [value]="Sort.Name">Name, A to Z</option>
          @if (result()?.showsDues !== false) {
            <option [value]="Sort.OutstandingHighest">Most owed first</option>
          }
          <option [value]="Sort.Newest">Newest first</option>
        </select>
      </label>
    </div>

    <div class="sd__filters">
      <div class="sd__seg" role="group" aria-label="Status">
        @for (f of statuses(); track f.status) {
          <button
            type="button"
            class="sd__chip"
            [class.sd__chip--on]="query().status === f.status"
            [attr.aria-pressed]="query().status === f.status"
            (click)="patch({ status: f.status })"
          >
            {{ f.label }} <span class="sd__n">{{ f.count }}</span>
          </button>
        }
      </div>
      @if (result()?.showsDues !== false) {
        <label class="sd__dues" for="sd-dues">
          <input
            id="sd-dues"
            type="checkbox"
            [checked]="query().withDuesOnly"
            (change)="patch({ withDuesOnly: $any($event.target).checked })"
          />
          Only suppliers we owe money
        </label>
      }
    </div>

    @if (error(); as e) {
      <p class="sd__err" role="alert">
        {{ e }} <button type="button" class="act" (click)="load()">Try again</button>
      </p>
    }

    @if (result(); as r) {
      @if (r.items.length === 0) {
        <p class="sd__hint" role="status">
          @if (r.allCount === 0 && !query().filter.trim()) {
            No suppliers yet. Add one with New supplier.
          } @else if (query().filter.trim()) {
            No supplier matches "{{ query().filter.trim() }}"{{
              query().status || query().withDuesOnly ? ' with these filters' : ''
            }}. Try fewer or different words.
          } @else {
            No supplier with these filters.
          }
        </p>
      } @else {
        <ejs-grid arGrid="suppliers" [dataSource]="r.items" aria-label="Suppliers">
          <e-columns>
            <e-column field="name" headerText="Supplier" width="220">
              <ng-template #template let-s>
                <b translate="no">{{ s.name }}</b>
                @if (s.isBlacklisted) {
                  <span class="sub sd__black" [title]="s.blacklistReason || ''">Blacklisted</span>
                } @else if (!s.isActive) {
                  <span class="sub">Not in use</span>
                }
              </ng-template>
            </e-column>
            <e-column field="gstin" headerText="GSTIN" width="160">
              <ng-template #template let-s>
                <span class="ar-mono">{{ s.gstin || '—' }}</span>
              </ng-template>
            </e-column>
            <e-column field="contactName" headerText="Contact" width="200">
              <ng-template #template let-s>
                @if (s.contactName) {
                  <div>{{ s.contactName }}</div>
                }
                @if (s.phone) {
                  <div>{{ s.phone }}</div>
                }
                @if (s.email) {
                  <div class="sub">{{ s.email }}</div>
                }
                @if (!s.contactName && !s.phone && !s.email) {
                  —
                }
              </ng-template>
            </e-column>
            <e-column field="leadDays" headerText="Lead time" textAlign="Right" width="120">
              <ng-template #template let-s>
                {{ s.leadDays != null ? s.leadDays + ' days' : '—' }}
              </ng-template>
            </e-column>
            @if (r.showsDues) {
              <e-column headerText="We owe" textAlign="Right" width="140">
                <ng-template #template let-s>
                  {{ owed(s) }}
                </ng-template>
              </e-column>
            }
            <e-column headerText="Actions" width="180">
              <ng-template #template let-s>
                <div class="acts">
                  @if (canOpen360()) {
                    <a class="act" [routerLink]="['/purchasing/vendor-360', s.id]">Vendor 360</a>
                  }
                  @if (canManage()) {
                    <button type="button" class="act" (click)="edit.emit(s.id)">Edit</button>
                  }
                </div>
              </ng-template>
            </e-column>
          </e-columns>
        </ejs-grid>
        <nav class="sd__pager" aria-label="Supplier pages">
          <span class="sd__count" role="status">{{ label() }}</span>
          <button
            type="button"
            class="act"
            [disabled]="query().page === 0 || loading()"
            (click)="patch({ page: query().page - 1 }, false)"
          >
            ‹ Previous
          </button>
          <span class="sd__pages">Page {{ query().page + 1 }} of {{ pages() }}</span>
          <button
            type="button"
            class="act"
            [disabled]="query().page + 1 >= pages() || loading()"
            (click)="patch({ page: query().page + 1 }, false)"
          >
            Next ›
          </button>
        </nav>
      }
    } @else if (!error()) {
      <p class="sd__hint" role="status">Loading suppliers…</p>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 0;
    }
    .sd__bar,
    .sd__filters {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px 16px;
    }
    .sd__search {
      flex: 1 1 320px;
      max-width: 520px;
    }
    .sd__sort {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .sd__label {
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .sd__seg {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .sd__chip {
      border: 1px solid var(--ar-line-200, #e5e7eb);
      background: var(--ar-white);
      border-radius: 999px;
      padding: 4px 10px;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-ink-600);
      cursor: pointer;
    }
    .sd__chip--on {
      border-color: var(--ar-teal-700, #0f766e);
      color: var(--ar-ink-900);
      background: var(--ar-bg-100);
    }
    .sd__n {
      margin-left: 2px;
      font-variant-numeric: tabular-nums;
      color: var(--ar-ink-500);
    }
    .sd__dues {
      display: flex;
      align-items: center;
      gap: 6px;
      font: 500 12.5px var(--ar-font-sans);
    }
    .sd__hint {
      margin: 0;
      font: 400 13px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .sd__err {
      margin: 0;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-bad-600, #b42318);
    }
    .sd__black {
      color: var(--ar-bad-600, #b42318);
    }
    .sd__pager {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .sd__count {
      margin-right: auto;
    }
    .tbl {
      overflow-x: auto;
      border: 1px solid var(--ar-line-200, #e5e7eb);
      border-radius: 10px;
      background: var(--ar-surface, #fff);
    }
    .tbl[aria-busy='true'] {
      opacity: 0.6;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font: 400 13px var(--ar-font-sans);
    }
    th,
    td {
      text-align: left;
      vertical-align: top;
      padding: 8px 12px;
      border-top: 1px solid var(--ar-line-200, #e5e7eb);
    }
    thead th {
      border-top: 0;
      font: 600 11.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .num {
      text-align: right;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .sub {
      display: block;
      color: var(--ar-ink-500);
      font-size: 12px;
    }
    .off {
      opacity: 0.6;
    }
    .acts {
      white-space: nowrap;
      text-align: right;
    }
    .act {
      border: 0;
      background: none;
      color: var(--ar-teal-700, #0f766e);
      font: 500 12.5px var(--ar-font-sans);
      cursor: pointer;
      padding: 2px 6px;
      text-decoration: none;
    }
    .act:disabled {
      color: var(--ar-ink-400);
      cursor: default;
    }
    .sr {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
  `,
})
export class ArSupplierDirectory implements OnInit {
  private readonly api = inject(PurchasingService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly permissions = inject(PermissionService);
  private readonly plans = inject(PlanService);
  private readonly account = inject(CurrentUserService);

  readonly canManage = input(false);
  /** Sample suppliers, filtered and paged in the browser instead of the server (mock data). */
  readonly local = input<SupplierListItemDto[] | null>(null);
  readonly edit = output<string>();

  protected readonly Sort = SupplierListSort;
  protected readonly query = signal<SupplierQuery>(
    readSupplierQuery(this.route.snapshot.queryParams as Record<string, string>),
  );
  protected readonly result = signal<SupplierListDto | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly canOpen360 = computed(() => {
    this.account.isHost();
    return canOpenUrl('/purchasing/vendor-360', this.permissions, this.plans, this.account);
  });
  protected readonly pages = computed(() => pageCount(this.result()?.totalCount ?? 0));
  protected readonly label = computed(() => {
    const r = this.result();
    return r ? pageLabel(this.query().page, r.items.length, r.totalCount) : '';
  });
  protected readonly statuses = computed(() => {
    const r = this.result();
    const n = (v: number | undefined) => (v ?? 0).toLocaleString('en-IN');
    return [
      { status: SupplierListStatus.All, label: 'All', count: n(r?.allCount) },
      { status: SupplierListStatus.Active, label: 'Active', count: n(r?.activeCount) },
      { status: SupplierListStatus.NotInUse, label: 'Not in use', count: n(r?.notInUseCount) },
      { status: SupplierListStatus.Blacklisted, label: 'Blacklisted', count: n(r?.blacklistedCount) },
    ];
  });

  private timer?: ReturnType<typeof setTimeout>;
  private seq = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  ngOnInit(): void {
    // Not in the constructor: `local` is only set once the inputs are.
    void this.load();
  }

  protected owed(s: SupplierListItemDto): string {
    return s.outstandingPayableInPaise ? inr(s.outstandingPayableInPaise) : '—';
  }

  /** Typing waits a moment before asking the server, and starts again from the first page. */
  protected onSearch(filter: string): void {
    if (filter === this.query().filter) return;
    this.query.update((q) => ({ ...q, filter, page: 0 }));
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.applied(), 300);
  }

  /** A filter or sort change starts from the first page; paging keeps the rest. */
  protected patch(change: Partial<SupplierQuery>, resetPage = true): void {
    this.query.update((q) => ({ ...q, ...change, ...(resetPage ? { page: 0 } : {}) }));
    this.applied();
  }

  private applied(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: supplierQueryParams(this.query()),
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    void this.load();
  }

  async load(): Promise<void> {
    const seq = ++this.seq;
    const q = this.query();
    this.loading.set(true);
    this.error.set(null);
    try {
      const local = this.local();
      const page =
        local || environment.useMockData
          ? localSupplierPage(local ?? [], q)
          : await firstValueFrom(
              this.api.getSupplierList(
                {
                  filter: q.filter.trim() || undefined,
                  status: q.status,
                  withDuesOnly: q.withDuesOnly,
                  sort: q.sort,
                  skipCount: q.page * SUPPLIER_PAGE_SIZE,
                  maxResultCount: SUPPLIER_PAGE_SIZE,
                },
                { skipHandleError: true },
              ),
            );
      if (seq !== this.seq) return;
      // A page past the end (suppliers removed, or an old link) falls back to the last one.
      if (!page.items.length && page.totalCount && q.page > 0) {
        this.patch({ page: pageCount(page.totalCount) - 1 }, false);
        return;
      }
      this.result.set(page);
    } catch {
      if (seq === this.seq) this.error.set('Suppliers could not be loaded.');
    } finally {
      if (seq === this.seq) this.loading.set(false);
    }
  }
}
