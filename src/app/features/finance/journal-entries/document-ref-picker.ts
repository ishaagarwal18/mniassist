import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { Observable, firstValueFrom, map } from 'rxjs';

import { PurchasingService } from '../../../proxy/inventory/purchasing.service';
import { GoodsReceiptNoteService } from '../../../proxy/purchasing/goods-receipt-note.service';
import { VendorBillService } from '../../../proxy/purchasing/vendor-bill.service';
import { VendorDebitNoteService } from '../../../proxy/purchasing/vendor-debit-note.service';
import { DeliveryChallanService } from '../../../proxy/sales/delivery-challan.service';
import { SalesInvoiceService } from '../../../proxy/sales/sales-invoice.service';
import { SalesOrderService } from '../../../proxy/sales/sales-order.service';

/** The document a journal entry points back to. `type` is empty when there is none. */
export interface DocumentRef {
  type: string;
  id: string;
  number: string;
}

export interface DocumentHit {
  id: string;
  number: string;
  party: string;
}

/** The kinds of document an entry can reference; `type` is what is stored with the entry. */
export const DOCUMENT_KINDS = [
  { type: 'SalesInvoice', label: 'Sales invoice' },
  { type: 'SalesOrder', label: 'Sales order' },
  { type: 'DeliveryChallan', label: 'Delivery challan' },
  { type: 'PurchaseOrder', label: 'Purchase order' },
  { type: 'GoodsReceiptNote', label: 'Goods receipt' },
  { type: 'VendorBill', label: 'Vendor bill' },
  { type: 'VendorDebitNote', label: 'Vendor debit note' },
  { type: 'Other', label: 'Other (type the number)' },
] as const;

/** Keeps the hits whose number or party contains the search, at most `max`. */
export function filterHits(hits: readonly DocumentHit[], search: string, max = 20): DocumentHit[] {
  const q = search.trim().toLowerCase();
  return hits
    .filter((h) => !q || h.number.toLowerCase().includes(q) || h.party.toLowerCase().includes(q))
    .slice(0, max);
}

/**
 * Picks the document a journal entry is for: a sales invoice, bill, order and so on, searched by number or party.
 * "Other" keeps a typed reference such as a bank transfer number, with no link.
 */
@Component({
  selector: 'ar-document-ref-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="drp">
      <label class="ar-field" for="drp-kind">
        <span class="ar-field__label"
          >Reference document <span class="ar-field__opt">optional</span></span
        >
        <select
          id="drp-kind"
          class="ar-field__input"
          (change)="chooseKind($any($event.target).value)"
        >
          <option value="" [selected]="!value().type">None</option>
          @for (k of kinds; track k.type) {
            <option [value]="k.type" [selected]="k.type === value().type">{{ k.label }}</option>
          }
        </select>
      </label>
      @if (value().type === 'Other') {
        <label class="ar-field" for="drp-number">
          <span class="ar-field__label">Reference number</span>
          <input
            id="drp-number"
            class="ar-field__input"
            maxlength="128"
            placeholder="e.g. RTGS-0091"
            [value]="value().number"
            (input)="emit({ type: 'Other', id: '', number: $any($event.target).value })"
          />
        </label>
      } @else if (value().type) {
        <label class="ar-field" for="drp-search">
          <span class="ar-field__label">Find by number or party</span>
          <input
            id="drp-search"
            class="ar-field__input"
            type="search"
            [value]="search()"
            (input)="search.set($any($event.target).value); refresh()"
          />
        </label>
        <label class="ar-field" for="drp-pick">
          <span class="ar-field__label">Document</span>
          <select
            id="drp-pick"
            class="ar-field__input"
            [disabled]="loading()"
            (change)="pick($any($event.target).value)"
          >
            <option value="" [selected]="!value().id">
              {{ loading() ? 'Searching…' : hits().length ? 'Choose' : 'Nothing found' }}
            </option>
            @if (value().id && !hasSelected()) {
              <option [value]="value().id" selected translate="no">{{ value().number }}</option>
            }
            @for (h of hits(); track h.id) {
              <option [value]="h.id" [selected]="h.id === value().id" translate="no">
                {{ h.number }} · {{ h.party }}
              </option>
            }
          </select>
        </label>
      }
    </div>
  `,
  styles: `
    .drp {
      display: contents;
    }
  `,
})
export class ArDocumentRefPicker {
  readonly value = input<DocumentRef>({ type: '', id: '', number: '' });
  readonly valueChange = output<DocumentRef>();

  private readonly invoices = inject(SalesInvoiceService);
  private readonly orders = inject(SalesOrderService);
  private readonly challans = inject(DeliveryChallanService);
  private readonly purchasing = inject(PurchasingService);
  private readonly grns = inject(GoodsReceiptNoteService);
  private readonly bills = inject(VendorBillService);
  private readonly debitNotes = inject(VendorDebitNoteService);

  protected readonly kinds = DOCUMENT_KINDS;
  protected readonly search = signal('');
  protected readonly hits = signal<DocumentHit[]>([]);
  protected readonly loading = signal(false);
  private seq = 0;

  constructor() {
    effect(() => {
      const t = this.value().type;
      untracked(() => {
        if (t && t !== 'Other') void this.refresh();
      });
    });
  }

  protected hasSelected(): boolean {
    return this.hits().some((h) => h.id === this.value().id);
  }

  protected emit(v: DocumentRef): void {
    this.valueChange.emit(v);
  }

  protected chooseKind(type: string): void {
    this.search.set('');
    this.hits.set([]);
    this.emit({ type, id: '', number: '' });
  }

  protected pick(id: string): void {
    const h = this.hits().find((x) => x.id === id);
    this.emit({ type: this.value().type, id: h?.id ?? '', number: h?.number ?? '' });
  }

  private source(type: string, filter: string): Observable<DocumentHit[]> | null {
    const page = { filter: filter || undefined, maxResultCount: 50, skipCount: 0 };
    const opts = { skipHandleError: true };
    switch (type) {
      case 'SalesInvoice':
        return this.invoices.getList(page, opts).pipe(
          map((r) =>
            (r.items ?? []).map((x) => ({
              id: x.id!,
              number: x.invoiceNumber,
              party: x.customerName,
            })),
          ),
        );
      case 'SalesOrder':
        return this.orders.getList(page, opts).pipe(
          map((r) =>
            (r.items ?? []).map((x) => ({
              id: x.id!,
              number: x.orderNumber,
              party: x.customerName,
            })),
          ),
        );
      case 'DeliveryChallan':
        return this.challans.getList(page, opts).pipe(
          map((r) =>
            (r.items ?? []).map((x) => ({
              id: x.id!,
              number: x.challanNumber,
              party: x.customerName,
            })),
          ),
        );
      case 'GoodsReceiptNote':
        return this.grns.getList(page, opts).pipe(
          map((r) =>
            (r.items ?? []).map((x) => ({
              id: x.id!,
              number: x.grnNumber,
              party: x.supplierName,
            })),
          ),
        );
      case 'VendorBill':
        return this.bills.getList(page, opts).pipe(
          map((r) =>
            (r.items ?? []).map((x) => ({
              id: x.id!,
              number: x.billNumber,
              party: x.supplierName,
            })),
          ),
        );
      case 'VendorDebitNote':
        return this.debitNotes.getList(page, opts).pipe(
          map((r) =>
            (r.items ?? []).map((x) => ({
              id: x.id!,
              number: x.debitNoteNumber,
              party: x.supplierName,
            })),
          ),
        );
      case 'PurchaseOrder':
        // Orders have no server search; the list is filtered here.
        return this.purchasing.getOrders(false, opts).pipe(
          map((r) =>
            filterHits(
              r.map((x) => ({ id: x.id, number: x.reference, party: x.supplierName })),
              filter,
              50,
            ),
          ),
        );
      default:
        return null;
    }
  }

  protected async refresh(): Promise<void> {
    const call = this.source(this.value().type, this.search().trim());
    if (!call) return;
    const seq = ++this.seq;
    this.loading.set(true);
    try {
      const hits = await firstValueFrom(call);
      if (seq === this.seq) this.hits.set(hits);
    } catch {
      if (seq === this.seq) this.hits.set([]);
    } finally {
      if (seq === this.seq) this.loading.set(false);
    }
  }
}

const DOCUMENT_ROUTES: Record<string, string> = {
  SalesInvoice: '/sales/invoices',
  SalesOrder: '/sales/orders',
  DeliveryChallan: '/sales/challans',
  GoodsReceiptNote: '/purchasing/grn',
  VendorBill: '/purchasing/bills',
  VendorDebitNote: '/purchasing/debit-notes',
};

/** The page of a referenced document, or null when it has none (a purchase order, "Other", no link). */
export function documentLink(
  type: string | null | undefined,
  id: string | null | undefined,
): string[] | null {
  const base = type ? DOCUMENT_ROUTES[type] : undefined;
  return base && id ? [base, id] : null;
}
