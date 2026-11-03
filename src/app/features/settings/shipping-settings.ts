import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ArTopbar } from '../../layout/topbar';
import { TemplateStatus } from '../../proxy/messaging/template-status.enum';
import { TemplateService } from '../../proxy/messaging/template.service';
import { ShippingService, ShippingSettingsDto } from '../../proxy/shipping/shipping.service';
import { ArButton, ArCard } from '../../ui';
import { ArSelect } from '../../ui/select';
import { isPincode } from '../reorder/shipping-logic';

function problem(e: unknown, fallback: string): string {
  return (e as { error?: { error?: { message?: string } } })?.error?.error?.message ?? fallback;
}

/** Settings → Shipping: Shiprocket's API user (optional), the pickup PIN code, and how customers are told. */
@Component({
  selector: 'ar-shipping-settings',
  imports: [ArTopbar, ArCard, ArButton, ArSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Shipping"
      subtitle="How dispatched orders reach customers: WhatsApp dispatch notices and Shiprocket"
      help="Used when you dispatch a won re-order or sales order. Transporters you book directly work without Shiprocket."
    />
    <div class="sh ar-scroll">
      <ar-card heading="Dispatch and courier">
        <div class="sh__body">
          <label class="sh__check" for="ss-notify">
            <input
              id="ss-notify"
              type="checkbox"
              [checked]="notify()"
              (change)="notify.set($any($event.target).checked)"
            />
            Tell the customer on WhatsApp when an order is dispatched (transporter, docket, tracking
            link)
          </label>
          <label class="ar-field" for="ss-tpl">
            <span class="ar-field__label"
              >Dispatch template
              <span class="ar-field__opt"
                >(outside the 24-hour window; body values: customer, order, date, transporter,
                docket)</span
              ></span
            >
            <select
              id="ss-tpl"
              class="ar-field__input"
              [value]="templateId()"
              (change)="templateId.set($any($event.target).value)"
            >
              <option value="">None: tell customers only inside the window</option>
              @for (t of templates(); track t.id) {
                <option [value]="t.id">{{ t.name }} ({{ t.lang }})</option>
              }
            </select>
          </label>
          <h3 class="sh__h">Shiprocket <span class="sh__soft">(optional)</span></h3>
          <p class="sh__hint">
            For courier rates by PIN code and weight, and shipments that track themselves. Create an
            API user in Shiprocket (Settings → API) and enter it here. Transporters you book
            directly work without it.
          </p>
          <div class="sh__grid">
            <label class="ar-field" for="ss-email">
              <span class="ar-field__label">API user email</span>
              <input
                id="ss-email"
                class="ar-field__input"
                type="email"
                [value]="email()"
                (input)="email.set($any($event.target).value)"
              />
            </label>
            <label class="ar-field" for="ss-pass">
              <span class="ar-field__label"
                >Password
                <span class="ar-field__opt">{{
                  connected() ? '(blank: keep the saved one)' : ''
                }}</span></span
              >
              <input
                id="ss-pass"
                class="ar-field__input"
                type="password"
                autocomplete="new-password"
                [value]="password()"
                (input)="password.set($any($event.target).value)"
              />
            </label>
            <label class="ar-field" for="ss-pin">
              <span class="ar-field__label">Pickup PIN code</span>
              <input
                pattern="d{6}"
                title="Six digits."
                id="ss-pin"
                class="ar-field__input"
                inputmode="numeric"
                maxlength="6"
                [value]="pickup()"
                (input)="pickup.set($any($event.target).value)"
              />
            </label>
          </div>
          @if (error(); as e) {
            <p class="sh__err" role="alert">{{ e }}</p>
          }
          @if (saved()) {
            <p class="sh__ok" role="status">Saved.</p>
          }
          <div class="sh__actions">
            <button ar-button type="button" variant="ghost" [disabled]="busy()" (click)="reset()">
              Reset
            </button>
            <button ar-button type="button" variant="primary" [disabled]="busy()" (click)="save()">
              {{ busy() ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </div>
      </ar-card>
    </div>
  `,
  styles: `
    .sh {
      padding: 20px 24px;
      max-width: 760px;
    }
    .sh__body {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .sh__actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .sh__ok {
      margin: 0;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-good-600, #067647);
    }
    .sh__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 10px;
    }
    .sh__check {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      font: 400 13px var(--ar-font-sans);
    }
    .sh__h {
      margin: 8px 0 0;
      font: 600 13.5px var(--ar-font-sans);
    }
    .sh__soft {
      font-weight: 400;
      color: var(--ar-ink-500);
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
export class ArShippingSettings {
  private readonly api = inject(ShippingService);
  private readonly templatesApi = inject(TemplateService);

  protected readonly notify = signal(true);
  protected readonly templateId = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly pickup = signal('');
  protected readonly connected = signal(false);
  protected readonly templates = signal<{ id: string; name: string; lang: string }[]>([]);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly saved = signal(false);

  constructor() {
    void this.load();
  }

  private show(s: ShippingSettingsDto): void {
    this.notify.set(s.notifyCustomer);
    this.templateId.set(s.dispatchTemplateId ?? '');
    this.email.set(s.shiprocketEmail ?? '');
    this.pickup.set(s.pickupPincode ?? '');
    this.connected.set(!!s.shiprocketConnected);
  }

  private async load(): Promise<void> {
    if (environment.useMockData) {
      this.show({ notifyCustomer: true, pickupPincode: '411019' });
      return;
    }
    try {
      const [settings, templates] = await Promise.all([
        firstValueFrom(this.api.getSettings()),
        firstValueFrom(
          this.templatesApi.getList({ status: TemplateStatus.Approved, maxResultCount: 200 }),
        ),
      ]);
      this.show(settings);
      this.templates.set(
        (templates.items ?? []).map((t) => ({
          id: t.id!,
          name: t.name ?? 'Template',
          lang: t.languageCode ?? '',
        })),
      );
    } catch (e: unknown) {
      this.error.set(problem(e, 'The shipping settings could not be loaded.'));
    }
  }

  protected reset(): void {
    this.password.set('');
    this.saved.set(false);
    void this.load();
  }

  protected async save(): Promise<void> {
    this.saved.set(false);
    if (this.pickup().trim() && !isPincode(this.pickup())) {
      this.error.set('Enter the pickup PIN code as six digits.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      if (!environment.useMockData) {
        this.show(
          await firstValueFrom(
            this.api.updateSettings({
              shiprocketEmail: this.email().trim() || null,
              shiprocketPassword: this.password() || null,
              pickupPincode: this.pickup().trim() || null,
              notifyCustomer: this.notify(),
              dispatchTemplateId: this.templateId() || null,
            }),
          ),
        );
      }
      this.password.set('');
      this.saved.set(true);
    } catch (e: unknown) {
      this.error.set(problem(e, 'The shipping settings could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }
}
