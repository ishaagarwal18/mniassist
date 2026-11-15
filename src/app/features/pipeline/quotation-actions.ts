import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { SpaLineCheckDto, SpaService } from '../../proxy/oem/oem-pricing.service';
import { SalesOrderService } from '../../proxy/sales/sales-order.service';
import { ArButton, ArChip } from '../../ui';

/**
 * Actions on an issued quotation: turn it into a sales order (with the customer's PO), and check its lines against
 * the OEM special-price (SPA) deals so a line priced below an SPA that doesn't cover it is caught before ordering.
 */
@Component({
  selector: 'ar-quotation-actions',
  imports: [ArButton, ArChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../shared/work-page.scss',
  styles: `
    :host {
      display: block;
      height: auto;
      margin-top: 16px;
    }
  `,
  template: `
    <section class="wp__card">
      <h2 class="wp__title">Next steps</h2>

      <div class="wp__grid">
        <label class="wp__field">
          <span>Customer PO number</span>
          <input
            class="ar-field__input"
            maxlength="64"
            [value]="po()"
            (input)="po.set($any($event.target).value)"
          />
        </label>
        <label class="wp__field">
          <span>PO date</span>
          <input
            class="ar-field__input"
            type="date"
            [value]="poDate()"
            (input)="poDate.set($any($event.target).value)"
          />
        </label>
        <label class="wp__field">
          <span>Payment terms (days)</span>
          <input
            class="ar-field__input"
            type="number"
            min="0"
            [value]="terms()"
            (input)="terms.set($any($event.target).value)"
          />
        </label>
      </div>
      <div class="wp__actions">
        <button
          ar-button
          type="button"
          variant="primary"
          [disabled]="busy() !== null"
          (click)="createOrder()"
        >
          {{ busy() === 'order' ? 'Creating…' : 'Create sales order' }}
        </button>
        <button
          ar-button
          type="button"
          variant="ghost"
          [disabled]="busy() !== null"
          (click)="checkSpa()"
        >
          {{ busy() === 'spa' ? 'Checking…' : 'Check against SPA deals' }}
        </button>
      </div>

      @if (spa(); as lines) {
        <ul class="wp__list" style="margin-top: 12px" aria-label="SPA check">
          @for (l of lines; track l.quotationLineId + l.spaLineId) {
            <li class="wp__item">
              <span class="wp__grow">
                <span class="wp__name" translate="no">{{ l.partNumber ?? 'Line' }}</span>
                <span class="wp__sub"
                  >{{ l.message }}{{ l.spaReference ? ' · SPA ' + l.spaReference : '' }}</span
                >
              </span>
              <ar-chip [tone]="l.blocks ? 'bad' : 'good'" [dot]="true">{{
                l.blocks ? 'Blocks the order' : 'Covered'
              }}</ar-chip>
            </li>
          } @empty {
            <li class="wp__empty">No line on this quotation matches an SPA deal.</li>
          }
        </ul>
      }
    </section>
  `,
})
export class ArQuotationActions {
  private readonly orders = inject(SalesOrderService);
  private readonly oem = inject(SpaService);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);

  readonly quotationId = input.required<string>();
  readonly validUntilUtc = input<string | null | undefined>(null);

  protected readonly po = signal('');
  protected readonly poDate = signal('');
  protected readonly terms = signal('30');
  protected readonly busy = signal<string | null>(null);
  protected readonly spa = signal<SpaLineCheckDto[] | null>(null);

  protected async createOrder(): Promise<void> {
    this.busy.set('order');
    try {
      const days = Number(this.terms());
      const order = await firstValueFrom(
        this.orders.createFromQuotation(
          {
            quotationId: this.quotationId(),
            customerPoNumber: this.po().trim() || undefined,
            customerPoDate: this.poDate() ? new Date(this.poDate()).toISOString() : undefined,
            paymentTermsDays: Number.isFinite(days) && days >= 0 ? days : undefined,
          },
          { skipHandleError: true },
        ),
      );
      this.toasts.success('Sales order created.', 'Quotation');
      if (order.id) void this.router.navigate(['/sales/orders', order.id]);
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The sales order could not be created.'), 'Quotation');
    } finally {
      this.busy.set(null);
    }
  }

  protected async checkSpa(): Promise<void> {
    this.busy.set('spa');
    try {
      this.spa.set(
        await firstValueFrom(
          this.oem.checkQuotation(this.quotationId(), this.validUntilUtc() ?? null, {
            skipHandleError: true,
          }),
        ),
      );
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The SPA check could not run.'), 'Quotation');
    } finally {
      this.busy.set(null);
    }
  }
}
