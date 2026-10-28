import { RestService } from '@abp/ng.core';
import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ArTopbar } from '../../layout/topbar';
import { PlatformAdminService } from '../../proxy/administration';
import { ArButton } from '../../ui/button';

export interface AvailablePhoneNumber {
  phoneNumber: string;
  friendlyName?: string | null;
  region?: string | null;
  numberType?: string | null;
  /** Exotel's monthly rental, as Exotel states it. */
  rentalPrice?: string | null;
}

export interface PurchasedPhoneNumber {
  lineNumberId: string;
  phoneNumber: string;
  exotelSid: string;
  rentalPrice?: string | null;
  currency?: string | null;
}

@Injectable({ providedIn: 'root' })
export class PhoneNumberPurchaseService {
  private readonly rest = inject(RestService);
  search(input: {
    tenantId: string | null;
    numberType: string;
    region?: string | null;
    contains?: string | null;
  }) {
    return this.rest.request<unknown, AvailablePhoneNumber[]>(
      { method: 'POST', url: '/api/auto-reach/phone-number-purchase/search', body: input },
      { apiName: 'AutoReach' },
    );
  }
  purchase(input: {
    tenantId: string | null;
    phoneNumber: string;
    confirmPhoneNumber: string;
    name?: string | null;
    route: 'ai' | 'menu' | 'none';
  }) {
    return this.rest.request<unknown, PurchasedPhoneNumber>(
      { method: 'POST', url: '/api/auto-reach/phone-number-purchase/purchase', body: input },
      { apiName: 'AutoReach' },
    );
  }
}

/**
 * Platform administrators rent Exotel numbers for a workspace, on that workspace's own Exotel account. Renting charges the
 * account Exotel's monthly rental, so the number has to be typed again before it is bought.
 */
@Component({
  selector: 'ar-phone-numbers',
  imports: [FormsModule, ArTopbar, ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar title="Phone numbers" help="Find and rent Exotel numbers for a workspace." />
    <main class="numbers">
      <section class="card" aria-labelledby="pn-find">
        <h2 id="pn-find">Find a number</h2>
        <p>
          Numbers are rented on the chosen workspace's own Exotel account, which pays the monthly
          rental. The workspace needs its Exotel line set up first.
        </p>
        <div class="row">
          <label class="ar-field"
            ><span>Workspace</span>
            <select
              class="ar-field__input"
              [ngModel]="tenantId()"
              (ngModelChange)="tenantId.set($event)"
            >
              <option value="">Platform's own workspace</option>
              @for (t of tenants(); track t.id) {
                <option [value]="t.id" translate="no">{{ t.name }}</option>
              }
            </select></label
          >
          <label class="ar-field"
            ><span>Type</span>
            <select
              class="ar-field__input"
              [ngModel]="numberType()"
              (ngModelChange)="numberType.set($event)"
            >
              <option value="Landline">Landline</option>
              <option value="Mobile">Mobile</option>
              <option value="TollFree">Toll-free</option>
            </select></label
          >
          <label class="ar-field"
            ><span>Circle (optional)</span>
            <input
              class="ar-field__input"
              maxlength="4"
              placeholder="KA"
              [ngModel]="region()"
              (ngModelChange)="region.set($event)"
          /></label>
          <label class="ar-field"
            ><span>Contains (optional)</span>
            <input
              class="ar-field__input"
              inputmode="numeric"
              maxlength="10"
              [ngModel]="contains()"
              (ngModelChange)="contains.set($event)"
          /></label>
          <button ar-button type="button" [disabled]="busy()" (click)="search()">
            {{ busy() ? 'Searching…' : 'Search' }}
          </button>
        </div>
        @if (error()) {
          <p role="alert">{{ error() }}</p>
        }
        @if (results(); as list) {
          @if (list.length === 0) {
            <p role="status">Exotel offers no numbers that match.</p>
          } @else {
            <ul class="list">
              @for (n of list; track n.phoneNumber) {
                <li>
                  <code class="ar-mono" translate="no">{{ n.phoneNumber }}</code>
                  <span translate="no">{{ n.region }} · {{ n.numberType }}</span>
                  <span
                    >Rental: <span translate="no">{{ n.rentalPrice ?? '—' }}</span> a month</span
                  >
                  <button ar-button variant="quiet" type="button" (click)="choose(n)">Rent…</button>
                </li>
              }
            </ul>
          }
        }
      </section>

      @if (chosen(); as n) {
        <section class="card" aria-labelledby="pn-rent">
          <h2 id="pn-rent">
            Rent <span translate="no">{{ n.phoneNumber }}</span>
          </h2>
          <p>
            Exotel charges the workspace's account
            <strong translate="no">{{ n.rentalPrice ?? 'its' }}</strong> a month for this number.
            Type the number again to confirm.
          </p>
          <div class="row">
            <label class="ar-field"
              ><span>Type the number again</span>
              <input
                class="ar-field__input"
                inputmode="tel"
                [ngModel]="confirm()"
                (ngModelChange)="confirm.set($event)"
            /></label>
            <label class="ar-field"
              ><span>Name (optional)</span>
              <input
                class="ar-field__input"
                maxlength="64"
                [ngModel]="name()"
                (ngModelChange)="name.set($event)"
            /></label>
            <label class="ar-field"
              ><span>Incoming calls go to</span>
              <select
                class="ar-field__input"
                [ngModel]="route()"
                (ngModelChange)="route.set($event)"
              >
                <option value="menu">The line's menu flow</option>
                <option value="ai">The line's AI call flow</option>
                <option value="none">Nowhere yet</option>
              </select></label
            >
          </div>
          <div class="row">
            <button
              ar-button
              type="button"
              [disabled]="busy() || !confirm().trim()"
              (click)="rent()"
            >
              {{ busy() ? 'Renting…' : 'Rent this number' }}
            </button>
            <button ar-button variant="quiet" type="button" (click)="chosen.set(null)">
              Cancel
            </button>
          </div>
        </section>
      }

      @if (rented(); as r) {
        <p role="status">
          Rented <strong translate="no">{{ r.phoneNumber }}</strong> (<span translate="no"
            >{{ r.rentalPrice ?? '—' }} {{ r.currency ?? '' }}</span
          >
          a month). It is on the workspace's phone line; choose its agent there.
        </p>
      }
    </main>
  `,
  styles: `
    .numbers {
      padding: 16px;
      display: grid;
      gap: 16px;
    }
    .card {
      background: var(--ar-surface-100);
      border: 1px solid var(--ar-line-200);
      border-radius: 8px;
      padding: 12px 16px;
      min-width: 0;
    }
    .card h2 {
      font-size: 1.05em;
      margin: 0 0 8px;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: flex-end;
    }
    .row .ar-field {
      flex: 0 1 200px;
      min-width: 0;
    }
    .list {
      list-style: none;
      padding: 0;
      margin: 8px 0 0;
      display: grid;
      gap: 6px;
    }
    .list li {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
    }
  `,
})
export class ArPhoneNumbers implements OnInit {
  private readonly api = inject(PhoneNumberPurchaseService);
  private readonly admin = inject(PlatformAdminService);
  protected readonly tenants = signal<{ id: string; name?: string }[]>([]);
  protected readonly tenantId = signal('');
  protected readonly numberType = signal('Landline');
  protected readonly region = signal('');
  protected readonly contains = signal('');
  protected readonly results = signal<AvailablePhoneNumber[] | null>(null);
  protected readonly chosen = signal<AvailablePhoneNumber | null>(null);
  protected readonly confirm = signal('');
  protected readonly name = signal('');
  protected readonly route = signal<'ai' | 'menu' | 'none'>('menu');
  protected readonly rented = signal<PurchasedPhoneNumber | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  async ngOnInit(): Promise<void> {
    try {
      const page = await firstValueFrom(
        this.admin.getTenants({ skipCount: 0, maxResultCount: 200 }),
      );
      this.tenants.set(
        (page.items ?? []).filter((t) => t.id).map((t) => ({ id: t.id!, name: t.name })),
      );
    } catch {
      this.tenants.set([]);
    }
  }

  protected async search(): Promise<void> {
    await this.run(async () => {
      this.results.set(
        await firstValueFrom(
          this.api.search({
            tenantId: this.tenantId() || null,
            numberType: this.numberType(),
            region: this.region().trim() || null,
            contains: this.contains().trim() || null,
          }),
        ),
      );
    }, 'The search could not be run.');
  }

  protected choose(n: AvailablePhoneNumber): void {
    this.chosen.set(n);
    this.confirm.set('');
    this.name.set('');
    this.rented.set(null);
  }

  protected async rent(): Promise<void> {
    const n = this.chosen();
    if (!n) return;
    await this.run(async () => {
      this.rented.set(
        await firstValueFrom(
          this.api.purchase({
            tenantId: this.tenantId() || null,
            phoneNumber: n.phoneNumber,
            confirmPhoneNumber: this.confirm().trim(),
            name: this.name().trim() || null,
            route: this.route(),
          }),
        ),
      );
      this.chosen.set(null);
      this.results.update((list) => list?.filter((x) => x.phoneNumber !== n.phoneNumber) ?? null);
    }, 'The number could not be rented.');
  }

  private async run(work: () => Promise<void>, fallback: string): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await work();
    } catch (e: unknown) {
      this.error.set(
        (e as { error?: { error?: { message?: string } } })?.error?.error?.message ?? fallback,
      );
    } finally {
      this.busy.set(false);
    }
  }
}
