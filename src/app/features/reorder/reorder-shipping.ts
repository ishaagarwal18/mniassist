import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ShipmentDto,
  ShippingRateDto,
  ShippingService,
} from '../../proxy/shipping/shipping.service';
import { ArButton, ArDialog } from '../../ui';
import { ArDateInput } from '../../ui/date-input';
import { parseRupees, rupees } from './reorder-logic';
import { isPincode, isTrackingUrl, parseKg } from './shipping-logic';

function problem(e: unknown, fallback: string): string {
  return (e as { error?: { error?: { message?: string } } })?.error?.error?.message ?? fallback;
}

/**
 * Dispatching a won order: the transporter and docket (any transporter, by hand), or a Shiprocket courier chosen from its rates. The
 * customer is told on WhatsApp when the workspace says so.
 */
@Component({
  selector: 'ar-reorder-dispatch',
  imports: [ArDialog, ArButton, ArDateInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog [title]="'Dispatch ' + reference()" (dismiss)="closed.emit(null)">
      <div class="sh__grid">
        <label class="ar-field" for="sh-carrier">
          <span class="ar-field__label">Transporter or courier</span>
          <input
            required
            maxlength="128"
            id="sh-carrier"
            class="ar-field__input"
            placeholder="VRL Logistics"
            [value]="carrier()"
            (input)="carrier.set($any($event.target).value)"
          />
        </label>
        <label class="ar-field" for="sh-docket">
          <span class="ar-field__label">Docket, LR or AWB number</span>
          <input
            required
            maxlength="64"
            id="sh-docket"
            class="ar-field__input ar-mono"
            [value]="docket()"
            (input)="docket.set($any($event.target).value)"
          />
        </label>
        <label class="ar-field" for="sh-url">
          <span class="ar-field__label"
            >Tracking link <span class="ar-field__opt">(optional)</span></span
          >
          <input
            id="sh-url"
            class="ar-field__input"
            placeholder="https://"
            [value]="url()"
            (input)="url.set($any($event.target).value)"
          />
        </label>
        <label class="ar-field" for="sh-eta">
          <span class="ar-field__label"
            >Expected <span class="ar-field__opt">(optional)</span></span
          >
          <input
            id="sh-eta"
            class="ar-field__input"
            type="date"
            [value]="expected()"
            (input)="expected.set($any($event.target).value)"
          />
        </label>
        <label class="ar-field" for="sh-pkgs">
          <span class="ar-field__label"
            >Packages <span class="ar-field__opt">(optional)</span></span
          >
          <input
            id="sh-pkgs"
            class="ar-field__input"
            inputmode="numeric"
            [value]="packages()"
            (input)="packages.set($any($event.target).value)"
          />
        </label>
        <label class="ar-field" for="sh-freight">
          <span class="ar-field__label"
            >Freight, ₹ <span class="ar-field__opt">(optional)</span></span
          >
          <input
            id="sh-freight"
            class="ar-field__input"
            inputmode="decimal"
            [value]="freight()"
            (input)="freight.set($any($event.target).value)"
          />
        </label>
      </div>

      @if (shiprocket()) {
        <fieldset class="sh__rates">
          <legend>Shiprocket rates</legend>
          <div class="sh__grid">
            <label class="ar-field" for="sh-pin">
              <span class="ar-field__label">Delivery PIN code</span>
              <input
                id="sh-pin"
                class="ar-field__input"
                inputmode="numeric"
                maxlength="6"
                [value]="pincode()"
                (input)="pincode.set($any($event.target).value)"
              />
            </label>
            <label class="ar-field" for="sh-kg">
              <span class="ar-field__label">Weight, kg</span>
              <input
                id="sh-kg"
                class="ar-field__input"
                inputmode="decimal"
                [value]="weight()"
                (input)="weight.set($any($event.target).value)"
              />
            </label>
            <div class="sh__go">
              <button
                ar-button
                type="button"
                variant="ghost"
                [disabled]="busy()"
                (click)="getRates()"
              >
                Get rates
              </button>
            </div>
          </div>
          @for (r of rates(); track r.courier) {
            <label class="sh__rate" [for]="'sh-r-' + $index">
              <input
                type="radio"
                name="sh-rate"
                [id]="'sh-r-' + $index"
                [checked]="picked() === r.courier"
                (change)="pick(r)"
              />
              <span
                ><b>{{ r.courier }}</b>
                {{ r.deliveryDays ? '· ' + r.deliveryDays + ' days' : '' }}</span
              >
              <span class="sh__num">{{ money(r.rateInPaise) }}</span>
            </label>
          }
          @if (picked()) {
            <p class="sh__hint">
              Book {{ picked() }} in Shiprocket, then enter its AWB above: the shipment then tracks
              itself.
            </p>
          }
        </fieldset>
      }

      @if (error(); as e) {
        <p class="sh__err" role="alert">{{ e }}</p>
      }
      <div dialogActions>
        <button ar-button type="button" variant="ghost" (click)="closed.emit(null)">Cancel</button>
        <button ar-button type="button" variant="primary" [disabled]="busy()" (click)="save()">
          {{ busy() ? 'Saving…' : 'Dispatch' }}
        </button>
      </div>
    </ar-dialog>
  `,
  styles: `
    .sh__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 10px;
      align-items: end;
    }
    .sh__rates {
      border: 1px solid var(--ar-line-200, #e5e7eb);
      border-radius: 8px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 0;
    }
    .sh__rates legend {
      font: 600 12.5px var(--ar-font-sans);
      padding: 0 4px;
    }
    .sh__rate {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      gap: 8px;
      align-items: center;
      font: 400 13px var(--ar-font-sans);
    }
    .sh__num {
      font-variant-numeric: tabular-nums;
    }
    .sh__hint {
      margin: 0;
      font: 400 12.5px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .sh__err {
      margin: 0;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-bad-600, #b42318);
    }
  `,
})
export class ArReorderDispatch {
  private readonly api = inject(ShippingService);

  readonly quotationId = input.required<string>();
  readonly reference = input('the order');
  /** Shiprocket is connected, so rates can be asked for. */
  readonly shiprocket = input(false);
  readonly closed = output<ShipmentDto | null>();

  protected readonly carrier = signal('');
  protected readonly docket = signal('');
  protected readonly url = signal('');
  protected readonly expected = signal('');
  protected readonly packages = signal('');
  protected readonly freight = signal('');
  protected readonly pincode = signal('');
  protected readonly weight = signal('');
  protected readonly rates = signal<ShippingRateDto[]>([]);
  protected readonly picked = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected money(paise: number): string {
    return rupees(paise);
  }

  protected async getRates(): Promise<void> {
    const kg = parseKg(this.weight());
    if (!isPincode(this.pincode()) || kg === null) {
      this.error.set('Enter a six-digit PIN code and the weight in kg.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      this.rates.set(
        environment.useMockData
          ? [
              { courier: 'Xpressbees', rateInPaise: 172_50, deliveryDays: 5 },
              { courier: 'Delhivery Surface', rateInPaise: 186_00, deliveryDays: 4 },
            ]
          : await firstValueFrom(this.api.getRates(this.pincode().trim(), kg)),
      );
      if (this.rates().length === 0)
        this.error.set('No courier serves that PIN code for this weight.');
    } catch (e: unknown) {
      this.error.set(problem(e, 'Shiprocket rates could not be read.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected pick(r: ShippingRateDto): void {
    this.picked.set(r.courier);
    this.carrier.set(r.courier);
    this.freight.set(String(r.rateInPaise / 100));
  }

  protected async save(): Promise<void> {
    const freight = parseRupees(this.freight());
    const packages = this.packages().trim();
    if (!this.carrier().trim() || !this.docket().trim()) {
      this.error.set('Enter the transporter and the docket number.');
      return;
    }
    if (!isTrackingUrl(this.url())) {
      this.error.set('The tracking link has to start with https://');
      return;
    }
    if (freight === undefined || (packages && !/^\d{1,4}$/.test(packages))) {
      this.error.set(
        'Enter the freight in rupees and the packages as a whole number, or leave them blank.',
      );
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      const input = {
        quotationId: this.quotationId(),
        provider: (this.picked() ? 'Shiprocket' : 'Manual') as 'Shiprocket' | 'Manual',
        carrier: this.carrier().trim(),
        trackingNumber: this.docket().trim(),
        trackingUrl: this.url().trim() || null,
        expectedOn: this.expected() || null,
        packages: packages ? Number(packages) : null,
        weightKg: parseKg(this.weight()),
        freightInPaise: freight,
      };
      this.closed.emit(
        environment.useMockData
          ? ({
              ...input,
              id: 'sh1',
              status: 'Dispatched',
              dispatchedAtUtc: new Date().toISOString(),
              customerNotified: true,
              events: [],
            } as unknown as ShipmentDto)
          : await firstValueFrom(this.api.dispatch(input)),
      );
    } catch (e: unknown) {
      this.error.set(problem(e, 'The dispatch could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }
}
