import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ToastService } from '../../core/ui/toast.service';
import { CockpitOriginService } from '../../layout/cockpit-origin.service';
import { ArTopbar } from '../../layout/topbar';
import { ShipmentDto, ShippingService } from '../../proxy/shipping/shipping.service';
import { AR_DIALOG_INLINE } from '../../ui';
import { REORDER_PAGE_STYLES } from './reorder-pages';
import { ArReorderDispatch } from './reorder-shipping';

/**
 * Dispatching a won re-order, as a page (/reorders/dispatch/<quotation id>?ref=<quotation number>): the transporter and docket, or
 * a Shiprocket courier from its rates when Shiprocket is connected (the same dispatch form, shown on the page). Saved, the customer
 * is told on WhatsApp when the workspace says so, and it returns to Re-orders.
 */
@Component({
  selector: 'ar-reorder-dispatch-page',
  imports: [ArTopbar, ArReorderDispatch],
  providers: [{ provide: AR_DIALOG_INLINE, useValue: true }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      help="Record how a won re-order was sent: the courier or transporter and the docket to track it."
      title="Dispatch an order" [subtitle]="reference" />
    <div class="rp ar-scroll">
      @if (ready()) {
        <ar-reorder-dispatch
          [quotationId]="quotationId"
          [reference]="reference"
          [shiprocket]="shiprocket()"
          (closed)="done($event)"
        />
      } @else {
        <p class="ro__hint">Loading…</p>
      }
    </div>
  `,
  styles: REORDER_PAGE_STYLES,
})
export class ArReorderDispatchPage {
  private readonly shippingApi = inject(ShippingService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  private readonly origin = inject(CockpitOriginService);
  private readonly route = inject(ActivatedRoute).snapshot;

  protected readonly quotationId = this.route.paramMap.get('quotationId') ?? '';
  protected readonly reference = this.route.queryParamMap.get('ref') || 'the order';
  protected readonly shiprocket = signal(false);
  protected readonly ready = signal(false);

  constructor() {
    firstValueFrom(this.shippingApi.getSettings())
      .then((s) => this.shiprocket.set(!!s.shiprocketConnected))
      .catch(() => {
        // Without the shipping settings the transporter can still be entered by hand.
      })
      .finally(() => this.ready.set(true));
  }

  protected done(s: ShipmentDto | null): void {
    if (s)
      this.toasts.success(
        `${s.quotationReference ?? 'The order'} dispatched with ${s.carrier}.` +
          (s.customerNotified ? ' The customer has been told on WhatsApp.' : ''),
      );
    void this.router.navigateByUrl(this.origin.returnUrl('/reorders'));
  }
}
