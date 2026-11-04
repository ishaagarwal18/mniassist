import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PurchasingService } from '../../proxy/inventory/purchasing.service';
import { Vendor360Service } from '../../proxy/purchasing';

/**
 * Shared by the purchasing "new" pages (purchase order, inward GRN, vendor bill, debit note): the page layout, the supplier
 * field and where the supplier list comes from. Each page opens on its own URL (`…/new`), from Vendor 360 with
 * `?supplier=<id>&name=` so the supplier is filled in, and returns to where it was opened from once saved.
 */

export interface SupplierOption {
  id: string;
  name: string;
  gstin?: string | null;
}

const MOCK_SUPPLIERS: SupplierOption[] = [
  { id: 'sup-1', name: 'Bharat Precision Gears Pvt Ltd', gstin: '27AABCB1234F1Z5' },
  { id: 'sup-3', name: 'Sundram Fasteners Automotive', gstin: '33AABCS9821L1ZM' },
];

@Injectable({ providedIn: 'root' })
export class SupplierOptionsService {
  private readonly purchasing = inject(PurchasingService);
  private readonly vendor360 = inject(Vendor360Service);

  /** Active, not blacklisted suppliers, by name: Purchasing's list, else Vendor 360's (a role may hold either). Errors quietly. */
  load(): Observable<SupplierOption[]> {
    if (environment.useMockData) return of(MOCK_SUPPLIERS);
    const quiet = { skipHandleError: true };
    return this.purchasing.getSuppliers(true, quiet).pipe(
      // Blacklisted suppliers are not offered for new records.
      map((list) => list.filter((s) => !s.isBlacklisted)),
      catchError(() =>
        this.vendor360
          .getSuppliers(quiet)
          .pipe(map((list) => list.filter((s) => s.isActive).map((s) => ({ ...s, id: s.id! })))),
      ),
      map((list) => [...list].sort((a, b) => a.name.localeCompare(b.name))),
    );
  }
}

/** The supplier field: shown locked when the page was opened for one supplier, with a way to change it. */
@Component({
  selector: 'ar-pf-supplier',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="ar-field__label" for="pf-supplier">Supplier <span class="pf-req">*</span></label>
    @if (locked()) {
      <div class="pf-locked">
        <strong translate="no">{{ name() }}</strong>
        <button type="button" class="pf-link" (click)="locked.set(false)">Change</button>
      </div>
    } @else {
      <select
        id="pf-supplier"
        class="ar-field__input"
        [attr.aria-invalid]="!!error()"
        (change)="picked.emit($any($event.target).value)"
      >
        <option value="" [selected]="!value()">
          {{ loading() ? 'Loading suppliers…' : 'Choose a supplier' }}
        </option>
        @for (s of suppliers(); track s.id) {
          <option [value]="s.id" [selected]="s.id === value()" translate="no">
            {{ s.name }}{{ s.gstin ? ' · ' + s.gstin : '' }}
          </option>
        }
      </select>
    }
    @if (error(); as e) {
      <span class="pf-err">{{ e }}</span>
    }
    @if (failed()) {
      <span class="ar-field__hint">Suppliers could not be loaded.</span>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .pf-req,
    .pf-err {
      color: var(--ar-bad-600);
    }
    .pf-err {
      font: 500 11.5px var(--ar-font-sans);
    }
    .pf-locked {
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 0 11px;
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-control);
      background: var(--ar-bg-50);
      font: 500 13px var(--ar-font-sans);
    }
    .pf-link {
      background: none;
      border: 0;
      padding: 0;
      color: var(--ar-blue-600);
      font: 600 12.5px var(--ar-font-sans);
      cursor: pointer;
    }
  `,
})
export class ArPfSupplier {
  readonly suppliers = input<SupplierOption[]>([]);
  readonly value = input('');
  readonly name = input('');
  readonly loading = input(false);
  readonly failed = input(false);
  readonly error = input<string | null>(null);
  readonly locked = model(false);
  readonly picked = output<string>();
}

/** `yyyy-MM-dd` for a date input, `days` from today. */
export function isoDay(days = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const GST_RATES: readonly { bps: number; label: string }[] = [
  { bps: 1800, label: '18%' },
  { bps: 1200, label: '12%' },
  { bps: 2800, label: '28%' },
  { bps: 500, label: '5%' },
  { bps: 0, label: '0%' },
];

/**
 * The page layout the "new" pages share: the topbar stays put and the form scrolls under it in the app's thin scroll area (no
 * second, full-height scrollbar), numbered section cards, line grids, a totals box and a sticky Save bar.
 */
export const PURCHASE_FORM_STYLES = `
  :host {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }
  .pf {
    flex: 1;
    min-height: 0;
    padding: 1.25rem 1.5rem 0;
  }
  .pf__form {
    max-width: 1180px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .pf__card {
    background: var(--ar-white);
    border: 1px solid var(--ar-line-200);
    border-radius: var(--ar-radius-card);
    box-shadow: var(--ar-shadow-card);
    padding: 1.1rem 1.25rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .pf__head {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }
  .pf__head h2 {
    margin: 0;
    font: 600 14px var(--ar-font-sans);
    color: var(--ar-ink-900);
  }
  .pf__head p {
    margin: 2px 0 0;
    font: 400 12.5px var(--ar-font-sans);
    color: var(--ar-ink-500);
  }
  .pf__step {
    flex: none;
    width: 24px;
    height: 24px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: var(--ar-blue-100);
    color: var(--ar-blue-700);
    font: 700 12px var(--ar-font-sans);
  }
  .pf__grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px 14px;
    align-items: start;
  }
  .pf__span2 {
    grid-column: span 2;
  }
  .pf__span4 {
    grid-column: 1 / -1;
  }
  .pf__req,
  .pf__err {
    color: var(--ar-bad-600);
  }
  .pf__err {
    font: 500 11.5px var(--ar-font-sans);
  }
  .pf__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .pf__chip {
    padding: 3px 10px;
    border: 1px solid var(--ar-line-300);
    border-radius: 999px;
    background: var(--ar-white);
    font: 500 12px var(--ar-font-sans);
    color: var(--ar-ink-700);
    cursor: pointer;
  }
  .pf__chip:hover {
    border-color: var(--ar-blue-500);
    color: var(--ar-blue-700);
  }
  .pf__lines {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .pf__line {
    display: grid;
    gap: 8px;
    align-items: start;
  }
  .pf__line > span {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }
  .pf__line--head {
    font: 600 11px var(--ar-font-sans);
    color: var(--ar-ink-500);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .pf__line input[readonly] {
    background: var(--ar-bg-50);
    color: var(--ar-ink-700);
  }
  .pf__num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .pf__cell-value {
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    font: 600 13px var(--ar-font-sans);
    font-variant-numeric: tabular-nums;
    color: var(--ar-ink-900);
  }
  .pf__sub {
    font: 400 11px var(--ar-font-sans);
    color: var(--ar-ink-500);
  }
  .pf__warn {
    font: 600 11px var(--ar-font-sans);
    color: var(--ar-amber-700);
  }
  .pf__x {
    height: 36px;
    background: none;
    border: 0;
    color: var(--ar-ink-500);
    cursor: pointer;
    border-radius: var(--ar-radius-control);
  }
  .pf__x:hover:not(:disabled) {
    color: var(--ar-bad-600);
    background: var(--ar-red-100);
  }
  .pf__x:disabled {
    opacity: 0.3;
    cursor: default;
  }
  .pf__add {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: none;
    border: 1px dashed var(--ar-line-300);
    border-radius: var(--ar-radius-control);
    padding: 7px 12px;
    font: 600 12.5px var(--ar-font-sans);
    color: var(--ar-blue-600);
    cursor: pointer;
  }
  .pf__add:hover {
    background: var(--ar-blue-100);
  }
  .pf__totals {
    align-self: flex-end;
    min-width: 280px;
    margin: 0;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 6px 24px;
    padding: 0.8rem 1rem;
    border-radius: var(--ar-radius-inset);
    background: var(--ar-bg-50);
    border: 1px solid var(--ar-line-100);
    font: 400 12.5px var(--ar-font-sans);
    color: var(--ar-ink-600);
  }
  .pf__totals dd {
    margin: 0;
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: var(--ar-ink-900);
  }
  .pf__totals .pf__grand {
    padding-top: 6px;
    border-top: 1px solid var(--ar-line-200);
    font: 700 14px var(--ar-font-sans);
    color: var(--ar-ink-900);
  }
  .pf__alert {
    margin: 0;
    padding: 0.7rem 1rem;
    border: 1px solid var(--ar-red-200);
    border-radius: var(--ar-radius-card);
    background: var(--ar-red-100);
    color: var(--ar-bad-600);
    font: 500 13px var(--ar-font-sans);
  }
  .pf__bar {
    position: sticky;
    bottom: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 1.25rem;
    padding: 0.75rem 1.25rem;
    background: var(--ar-white);
    border: 1px solid var(--ar-line-200);
    border-radius: var(--ar-radius-card);
    box-shadow: var(--ar-shadow-pop);
  }
  .pf__summary {
    flex: 1;
    font: 500 12.5px var(--ar-font-sans);
    color: var(--ar-ink-600);
  }
  .pf__denied {
    max-width: 720px;
    flex-direction: row;
    align-items: center;
    color: var(--ar-ink-700);
  }
  .pf__denied > div {
    flex: 1;
  }
  .pf__denied p {
    margin: 2px 0 0;
    font: 400 12.5px var(--ar-font-sans);
    color: var(--ar-ink-500);
  }
  .pf__pick {
    list-style: none;
    margin: 0;
    padding: 4px;
    border: 1px solid var(--ar-line-200);
    border-radius: var(--ar-radius-control);
    background: var(--ar-white);
    box-shadow: var(--ar-shadow-pop);
    max-height: 240px;
    overflow-y: auto;
  }
  .pf__pick button {
    width: 100%;
    display: flex;
    gap: 8px;
    padding: 7px 9px;
    border: 0;
    border-radius: 6px;
    background: none;
    text-align: left;
    font: 400 13px var(--ar-font-sans);
    cursor: pointer;
  }
  .pf__pick button:hover {
    background: var(--ar-blue-100);
  }
  @media (max-width: 960px) {
    .pf__grid {
      grid-template-columns: 1fr 1fr;
    }
    .pf__line {
      grid-template-columns: 1fr 1fr !important;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--ar-line-100);
    }
    .pf__line--head {
      display: none !important;
    }
  }
  @media (max-width: 560px) {
    .pf {
      padding-inline: 1rem;
    }
    .pf__grid {
      grid-template-columns: 1fr;
    }
    .pf__span2 {
      grid-column: auto;
    }
  }
`;
