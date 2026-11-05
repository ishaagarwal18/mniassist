import { inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { readCustomerScope } from '../../core/util/customer-scope';
import { CockpitOriginService } from '../../layout/cockpit-origin.service';
import { PURCHASE_FORM_STYLES } from '../purchasing/purchase-form';
import { listQuery } from './sales-records.logic';

/**
 * What a sales order's, challan's or invoice's own page (/sales/orders/<id> and the rest) has in common: it loads the record (the
 * demo rows in mock mode), runs an action and shows the record the API returns, and Back returns to the Customer 360 it was opened
 * from, else to the list with the customer it was showing.
 */
export abstract class SalesRecordPage<T extends { id?: string }> {
  protected readonly router = inject(Router);
  protected readonly route = inject(ActivatedRoute);
  protected readonly toasts = inject(ToastService);
  private readonly origin = inject(CockpitOriginService);
  private readonly scope = readCustomerScope(this.route);

  protected readonly id = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly record = signal<T | null>(null);
  protected readonly loading = signal(true);
  protected readonly problem = signal<string | null>(null);
  protected readonly busy = signal(false);

  /** The list the record lives on, e.g. /sales/orders. */
  protected abstract readonly list: string;
  /** e.g. 'This sales order'. */
  protected abstract readonly noun: string;
  protected abstract fetch(id: string): Observable<T>;
  protected abstract readonly mockRecords: readonly T[];

  /** Call from the subclass constructor, once its fields exist. */
  protected async load(): Promise<void> {
    try {
      const record = environment.useMockData
        ? (this.mockRecords.find((r) => r.id === this.id) ?? null)
        : await firstValueFrom(this.fetch(this.id));
      if (!record) throw new Error('not found');
      this.record.set(record);
      this.loaded(record);
    } catch (e: unknown) {
      this.problem.set(readApiError(e, `${this.noun} could not be loaded.`));
    } finally {
      this.loading.set(false);
    }
  }

  /** After the record first loads: e.g. opening a form asked for in the query. */
  protected loaded(_record: T): void {}

  /**
   * Calls the API (or applies `mock` in mock mode); on success shows the returned record and `done(record)` as a toast. A failure
   * is a toast too, and the record stays as it was.
   */
  protected async run(
    call: () => Observable<T>,
    mock: (current: T) => T,
    done: (saved: T) => string,
    failed: string,
  ): Promise<T | null> {
    const current = this.record();
    if (!current) return null;
    this.busy.set(true);
    try {
      const saved = environment.useMockData ? mock(current) : await firstValueFrom(call());
      this.record.set(saved);
      this.toasts.success(done(saved));
      return saved;
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, failed));
      return null;
    } finally {
      this.busy.set(false);
    }
  }

  /** Opens another record's page (a challan or invoice raised from this one). */
  protected async open(
    call: () => Observable<{ id?: string }>,
    path: string,
    failed: string,
  ): Promise<void> {
    if (environment.useMockData) {
      void this.router.navigate([path]);
      return;
    }
    this.busy.set(true);
    try {
      const created = await firstValueFrom(call());
      void this.router.navigate(created.id ? [path, created.id] : [path]);
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, failed));
    } finally {
      this.busy.set(false);
    }
  }

  protected customer360(contactId: string): void {
    void this.router.navigate(['/contacts', contactId, '360']);
  }

  protected back(): void {
    const list = this.router
      .createUrlTree([this.list], { queryParams: listQuery(this.scope) })
      .toString();
    void this.router.navigateByUrl(this.origin.returnUrl(list));
  }
}

/** The record pages: the "new" pages' layout (cards, sticky action bar) plus the read-only blocks. */
export const SALES_RECORD_STYLES = [
  PURCHASE_FORM_STYLES,
  `
    .sr-muted {
      color: var(--ar-ink-500);
      font: 400 12.5px var(--ar-font-sans);
    }
    .sr-label {
      font: 600 10.5px var(--ar-font-sans);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ar-ink-500);
    }
    .sr-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      flex-wrap: wrap;
    }
    .sr-head h2 {
      margin: 2px 0;
      font: 600 18px var(--ar-font-sans);
    }
    .sr-money {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 10px;
    }
    .sr-money > div {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 0.7rem 0.9rem;
      border-radius: var(--ar-radius-inset);
      border: 1px solid var(--ar-line-100);
      border-left: 4px solid var(--ar-line-200);
    }
    .sr-money span {
      font: 600 10.5px var(--ar-font-sans);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ar-ink-500);
    }
    .sr-money strong {
      font: 700 18px var(--ar-font-sans);
      font-variant-numeric: tabular-nums;
    }
    .sr-money .sr-due {
      border-left-color: var(--ar-amber-500);
    }
    .sr-money .sr-paid {
      border-left-color: var(--ar-good-600, #067647);
    }
    .sr-facts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 12px;
    }
    .sr-box {
      padding: 0.8rem 1rem;
      border-radius: var(--ar-radius-inset);
      background: var(--ar-bg-50);
      border: 1px solid var(--ar-line-100);
    }
    .sr-box h3 {
      margin: 0 0 8px;
      font: 600 10.5px var(--ar-font-sans);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ar-ink-500);
    }
    .sr-box dl {
      margin: 0;
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 4px 16px;
      font: 400 13px var(--ar-font-sans);
    }
    .sr-box dt {
      color: var(--ar-ink-500);
    }
    .sr-box dd {
      margin: 0;
      white-space: pre-line;
    }
    .sr-table {
      overflow-x: auto;
    }
    .sr-table table {
      width: 100%;
      border-collapse: collapse;
      font: 400 13px var(--ar-font-sans);
    }
    .sr-table th {
      padding: 0.55rem 0.8rem;
      text-align: left;
      background: var(--ar-bg-50);
      border-bottom: 1px solid var(--ar-line-200);
      font: 600 11px var(--ar-font-sans);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ar-ink-500);
    }
    .sr-table td {
      padding: 0.6rem 0.8rem;
      border-bottom: 1px solid var(--ar-line-100);
      vertical-align: top;
    }
    .sr-table .sr-sub {
      display: block;
      color: var(--ar-ink-500);
      font-size: 12px;
    }
    .num {
      text-align: right;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .sr-good {
      color: var(--ar-good-700, #067647);
    }
    .sr-bad {
      color: var(--ar-bad-600, #b42318);
    }
    .sr-form {
      border-color: var(--ar-blue-200);
    }
    .sr-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    @media (max-width: 760px) {
      .pf__grid {
        grid-template-columns: minmax(0, 1fr);
      }
      .pf__span2 {
        grid-column: auto;
      }
      .pf__bar {
        flex-wrap: wrap;
      }
    }
  `,
];
