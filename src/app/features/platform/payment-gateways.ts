import { readApiError } from '../../core/util/api-error';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { ArTopbar } from '../../layout/topbar';
import {
  PaymentConfigSource,
  PaymentGatewayConfigDto,
  PaymentGatewayConfigService,
  PaymentGatewayTestResultDto,
} from '../../proxy/billing/payment-gateway-config.service';
import {
  BillDeskEnvironment,
  PaymentGatewayDto,
  PaymentRequestDto,
  PaymentRequestStatus,
  PaymentService,
} from '../../proxy/payments/payment.service';
import { ArButton } from '../../ui/button';
import { ArChip, ChipTone } from '../../ui/chip';
import { ArTabs } from '../../ui/tabs';
import { ArGrid } from '../../ui/grid';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { PAYMENT_STATUS_LABEL, rupees } from '../payments/payment-logic';
import { apiMessage } from '../signing/signing-logic';

const STATUS_TONE: Record<PaymentRequestStatus, ChipTone> = {
  [PaymentRequestStatus.Pending]: 'amber',
  [PaymentRequestStatus.Paid]: 'good',
  [PaymentRequestStatus.Failed]: 'bad',
  [PaymentRequestStatus.Expired]: 'neutral',
  [PaymentRequestStatus.Cancelled]: 'neutral',
};

/** The Razorpay form as entered. Secrets start empty: the server never sends them back. */
interface RazorpayForm {
  active: boolean;
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  verifyAmountViaApi: boolean;
}

interface PayUForm {
  active: boolean;
  merchantKey: string;
  merchantSalt: string;
  testMode: boolean;
}

type SecretField = 'keySecret' | 'webhookSecret' | 'merchantSalt';

/**
 * Platform › Payment gateways: Platform gateway configuration for Razorpay and PayU, plus BillDesk merchant
 * collections and customer payment requests raised from conversations.
 */
@Component({
  selector: 'ar-payment-gateways',
  imports: [FormsModule, ArTopbar, ArButton, ArChip, ArTabs, ArGrid, GridModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Payment gateways"
      help="Manage checkout payment accounts (Razorpay, PayU) and customer collection gateways (BillDesk)."
    />
    <div class="pg-nav">
      <ar-tabs [tabs]="tabs" [(active)]="activeTab" />
    </div>

    <main class="gateways ar-scroll">
      @if (activeTab() === 'Platform gateways') {
        @if (error()) {
          <p role="alert" class="alert-err">{{ error() }}</p>
        }
        @if (config(); as c) {
          <p class="intro">
            Workspaces choose one of the gateways switched on here when they top up their wallet or
            pay an invoice. Key secrets and salts are stored in the server's secret storage and are
            never shown again after you save them. A field left empty uses the server
            configuration's value, if there is one.
          </p>

          <section class="card" aria-labelledby="pg-razorpay">
            <header class="head">
              <h2 id="pg-razorpay" translate="no">Razorpay</h2>
              @if (c.razorpay.enabled) {
                <ar-chip tone="good" [dot]="true">Offered at checkout</ar-chip>
              } @else if (!c.razorpay.active) {
                <ar-chip tone="neutral" [dot]="true">Switched off</ar-chip>
              } @else {
                <ar-chip tone="warn" [dot]="true">Keys missing</ar-chip>
              }
              @if (c.razorpay.keyId) {
                <ar-chip [tone]="c.razorpay.testMode ? 'amber' : 'teal'">{{
                  c.razorpay.testMode ? 'Test keys' : 'Live keys'
                }}</ar-chip>
              }
            </header>
            <p>
              UPI, cards, net banking and wallets. Keys are on Razorpay's dashboard under Account
              &amp; Settings › API keys.
            </p>

            <form class="fields" (ngSubmit)="saveRazorpay()">
              <label class="check">
                <input
                  type="checkbox"
                  name="rzpActive"
                  [(ngModel)]="rzp.active"
                  [disabled]="busy()"
                />
                Offer Razorpay at checkout
              </label>
              <label class="ar-field">
                <span>Key id</span>
                <input
                  class="ar-field__input"
                  name="rzpKeyId"
                  autocomplete="off"
                  spellcheck="false"
                  translate="no"
                  placeholder="rzp_live_… or rzp_test_…"
                  [(ngModel)]="rzp.keyId"
                  [disabled]="busy()"
                />
                <small>{{ sourceText(c.razorpay.keyIdSource, 'key id') }}</small>
              </label>
              <label class="ar-field">
                <span>Key secret</span>
                <input
                  class="ar-field__input"
                  type="password"
                  name="rzpKeySecret"
                  autocomplete="new-password"
                  [placeholder]="secretPlaceholder(c.razorpay.keySecretSource)"
                  [(ngModel)]="rzp.keySecret"
                  [disabled]="busy()"
                />
                <small>{{ sourceText(c.razorpay.keySecretSource, 'key secret') }}</small>
              </label>
              @if (c.razorpay.keySecretSource === 'saved') {
                <div class="inline">
                  <button
                    ar-button
                    variant="quiet"
                    type="button"
                    [disabled]="busy()"
                    (click)="clearSecret('keySecret')"
                  >
                    Remove saved key secret
                  </button>
                </div>
              }
              <label class="ar-field">
                <span>Webhook secret</span>
                <input
                  class="ar-field__input"
                  type="password"
                  name="rzpWebhookSecret"
                  autocomplete="new-password"
                  [placeholder]="secretPlaceholder(c.razorpay.webhookSecretSource)"
                  [(ngModel)]="rzp.webhookSecret"
                  [disabled]="busy()"
                />
                <small>{{ sourceText(c.razorpay.webhookSecretSource, 'webhook secret') }}</small>
              </label>
              @if (c.razorpay.webhookSecretSource === 'saved') {
                <div class="inline">
                  <button
                    ar-button
                    variant="quiet"
                    type="button"
                    [disabled]="busy()"
                    (click)="clearSecret('webhookSecret')"
                  >
                    Remove saved webhook secret
                  </button>
                </div>
              }
              @if (c.razorpayWebhookUrl) {
                <p class="hook">
                  Webhook URL for your Razorpay dashboard:
                  <code>{{ c.razorpayWebhookUrl }}</code>
                  <button
                    ar-button
                    variant="quiet"
                    type="button"
                    (click)="copy(c.razorpayWebhookUrl)"
                  >
                    Copy
                  </button>
                </p>
              }
              <label class="check">
                <input
                  type="checkbox"
                  name="rzpVerify"
                  [(ngModel)]="rzp.verifyAmountViaApi"
                  [disabled]="busy()"
                />
                Fetch order from Razorpay before crediting wallet
              </label>
              <div class="actions">
                <button
                  ar-button
                  type="button"
                  variant="ghost"
                  [disabled]="busy() || testing() === 'razorpay'"
                  (click)="test('razorpay')"
                >
                  {{ testing() === 'razorpay' ? 'Testing…' : 'Test Razorpay keys' }}
                </button>
                <button ar-button type="submit" variant="primary" [disabled]="busy()">
                  Save Razorpay
                </button>
              </div>
            </form>
            @if (rzpTest(); as t) {
              <p class="test" [class.test--ok]="t.ok" [class.test--bad]="!t.ok">{{ t.message }}</p>
            }
          </section>

          <section class="card" aria-labelledby="pg-payu">
            <header class="head">
              <h2 id="pg-payu" translate="no">PayU</h2>
              @if (c.payU.enabled) {
                <ar-chip tone="good" [dot]="true">Offered at checkout</ar-chip>
              } @else if (!c.payU.active) {
                <ar-chip tone="neutral" [dot]="true">Switched off</ar-chip>
              } @else {
                <ar-chip tone="warn" [dot]="true">Keys missing</ar-chip>
              }
              <ar-chip [tone]="c.payU.testMode ? 'amber' : 'teal'">{{
                c.payU.testMode ? 'Test mode' : 'Live mode'
              }}</ar-chip>
            </header>
            <p>
              PayU India merchant hosted checkout. Merchant key and salt are in PayU's dashboard.
            </p>

            <form class="fields" (ngSubmit)="savePayU()">
              <label class="check">
                <input
                  type="checkbox"
                  name="payuActive"
                  [(ngModel)]="payu.active"
                  [disabled]="busy()"
                />
                Offer PayU at checkout
              </label>
              <label class="check">
                <input
                  type="checkbox"
                  name="payuTestMode"
                  [(ngModel)]="payu.testMode"
                  [disabled]="busy()"
                />
                Test mode (uses test.payu.in)
              </label>
              <label class="ar-field">
                <span>Merchant key</span>
                <input
                  class="ar-field__input"
                  name="payuKey"
                  autocomplete="off"
                  spellcheck="false"
                  translate="no"
                  [(ngModel)]="payu.merchantKey"
                  [disabled]="busy()"
                />
                <small>{{ sourceText(c.payU.merchantKeySource, 'merchant key') }}</small>
              </label>
              <label class="ar-field">
                <span>Merchant salt</span>
                <input
                  class="ar-field__input"
                  type="password"
                  name="payuSalt"
                  autocomplete="new-password"
                  [placeholder]="secretPlaceholder(c.payU.merchantSaltSource)"
                  [(ngModel)]="payu.merchantSalt"
                  [disabled]="busy()"
                />
                <small>{{ sourceText(c.payU.merchantSaltSource, 'merchant salt') }}</small>
              </label>
              @if (c.payU.merchantSaltSource === 'saved') {
                <div class="inline">
                  <button
                    ar-button
                    variant="quiet"
                    type="button"
                    [disabled]="busy()"
                    (click)="clearSecret('merchantSalt')"
                  >
                    Remove saved salt
                  </button>
                </div>
              }
              <div class="actions">
                <button
                  ar-button
                  type="button"
                  variant="ghost"
                  [disabled]="busy() || testing() === 'payu'"
                  (click)="test('payu')"
                >
                  {{ testing() === 'payu' ? 'Testing…' : 'Test PayU keys' }}
                </button>
                <button ar-button type="submit" variant="primary" [disabled]="busy()">
                  Save PayU
                </button>
              </div>
            </form>
            @if (payuTest(); as t) {
              <p class="test" [class.test--ok]="t.ok" [class.test--bad]="!t.ok">{{ t.message }}</p>
            }
          </section>

          <section class="card" aria-labelledby="pg-billdesk">
            <header class="head">
              <h2 id="pg-billdesk" translate="no">BillDesk collections</h2>
              <ar-chip [tone]="billDeskEnabled() ? 'good' : 'neutral'" [dot]="true">
                {{ billDeskEnabled() ? 'Collecting active' : 'Not collecting yet' }}
              </ar-chip>
              <ar-chip [tone]="billDeskEnvironment() === Env.Uat ? 'amber' : 'teal'">
                {{ billDeskEnvironment() === Env.Uat ? 'Sandbox (UAT)' : 'Live Production' }}
              </ar-chip>
            </header>
            <p>
              Collect payments from customer conversations in WhatsApp inbox via BillDesk's secure
              checkout.
            </p>

            <div class="fields">
              <label class="check">
                <input
                  type="checkbox"
                  [checked]="billDeskEnabled()"
                  (change)="billDeskEnabled.set($any($event.target).checked)"
                />
                Enable customer payment requests via BillDesk
              </label>
              <label class="ar-field">
                <span>System environment</span>
                <select
                  class="ar-field__input"
                  (change)="billDeskEnvironment.set(+$any($event.target).value)"
                >
                  <option [value]="Env.Uat" [selected]="billDeskEnvironment() === Env.Uat">
                    Test (UAT) - Sandbox
                  </option>
                  <option
                    [value]="Env.Production"
                    [selected]="billDeskEnvironment() === Env.Production"
                  >
                    Live Production
                  </option>
                </select>
              </label>
              <label class="ar-field">
                <span>Merchant ID</span>
                <input
                  class="ar-field__input ar-mono"
                  placeholder="e.g. BD_MERCHANT_ID"
                  [value]="billDeskMerchantId()"
                  (input)="billDeskMerchantId.set($any($event.target).value)"
                />
              </label>
              <label class="ar-field">
                <span>Client ID</span>
                <input
                  class="ar-field__input ar-mono"
                  placeholder="e.g. BD_CLIENT_ID"
                  [value]="billDeskClientId()"
                  (input)="billDeskClientId.set($any($event.target).value)"
                />
              </label>
              <label class="ar-field">
                <span
                  >Signing secret
                  @if (billDeskHasSecret()) {
                    <small>(Stored - leave blank to keep)</small>
                  }
                </span>
                <input
                  type="password"
                  autocomplete="off"
                  class="ar-field__input"
                  [placeholder]="
                    billDeskHasSecret() ? 'Saved. Leave empty to keep it' : 'Enter signing secret'
                  "
                  [value]="billDeskSecret()"
                  (input)="billDeskSecret.set($any($event.target).value)"
                />
              </label>
              @if (billDeskWebhookUrl()) {
                <p class="hook">
                  BillDesk Webhook URL:
                  <code>{{ billDeskWebhookUrl() }}</code>
                  <button
                    ar-button
                    variant="quiet"
                    type="button"
                    (click)="copy(billDeskWebhookUrl()!)"
                  >
                    Copy
                  </button>
                </p>
              }
              <div class="actions">
                <button
                  ar-button
                  type="button"
                  variant="primary"
                  [disabled]="savingBillDesk()"
                  (click)="saveBillDesk()"
                >
                  {{ savingBillDesk() ? 'Saving…' : 'Save BillDesk account' }}
                </button>
              </div>
            </div>
            @if (billDeskNotice(); as n) {
              <p class="test test--ok">{{ n }}</p>
            }
            @if (billDeskError(); as e) {
              <p class="test test--bad">{{ e }}</p>
            }
          </section>
        }
      } @else if (activeTab() === 'Payment requests') {
        <section class="card card--full">
          <header class="head">
            <h2>Payment Requests</h2>
            <span class="muted"
              >{{ paymentRequests().length }} request{{
                paymentRequests().length === 1 ? '' : 's'
              }}</span
            >
          </header>
          <ejs-grid
            arGrid="payment-requests"
            [dataSource]="paymentRequests()"
            aria-label="Payment requests"
          >
            <e-columns>
              <e-column field="reference" headerText="Reference" width="140">
                <ng-template #template let-r>
                  <span class="ar-mono">{{ r.reference }}</span>
                </ng-template>
              </e-column>
              <e-column field="contactName" headerText="Customer" width="160">
                <ng-template #template let-r>
                  {{ r.contactName || '-' }}
                </ng-template>
              </e-column>
              <e-column field="description" headerText="For" width="220">
                <ng-template #template let-r>
                  <span>{{ r.description }}</span>
                </ng-template>
              </e-column>
              <e-column field="amountInPaise" headerText="Amount" width="130" textAlign="Right">
                <ng-template #template let-r>
                  <span class="ar-mono font-medium">{{ money(r.amountInPaise) }}</span>
                </ng-template>
              </e-column>
              <e-column headerText="Status" width="140">
                <ng-template #template let-r>
                  <ar-chip [tone]="toneOf(r.status)">{{ labelOf(r.status) }}</ar-chip>
                </ng-template>
              </e-column>
              <e-column field="creationTime" headerText="Raised" width="150">
                <ng-template #template let-r>
                  <span class="text-xs">{{ formatWhen(r.creationTime) }}</span>
                </ng-template>
              </e-column>
              <e-column headerText="Actions" width="170" textAlign="Right">
                <ng-template #template let-r>
                  <div class="row-actions">
                    @if (r.status === Status.Pending && r.payUrl) {
                      <button ar-button variant="ghost" (click)="copy(r.payUrl)">Copy link</button>
                      <button ar-button variant="ghost" (click)="cancelRequest(r)">Cancel</button>
                    }
                  </div>
                </ng-template>
              </e-column>
            </e-columns>
            <ng-template #emptyRecordTemplate>No payment requests recorded.</ng-template>
          </ejs-grid>
        </section>
      }
    </main>
  `,
  styles: `
    .pg-nav {
      padding: 0 1.5rem;
      border-bottom: 1px solid var(--ar-line-200);
      background: var(--ar-white);
    }
    .gateways {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding: 1.5rem;
      max-width: 960px;
    }
    .gateways:has(.card--full) {
      max-width: 100%;
    }
    .intro {
      margin: 0;
      font: 400 13px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-600);
    }
    .card {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1.25rem 1.5rem;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      box-shadow: var(--ar-shadow-card);
    }
    .card--full {
      max-width: 100%;
    }
    .head {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .head h2 {
      margin: 0;
      font: 600 1.1rem var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .fields {
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
    }
    .check {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font: 500 13px var(--ar-font-sans);
      color: var(--ar-ink-800);
      cursor: pointer;
    }
    .hook {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-600);
      flex-wrap: wrap;
    }
    .hook code {
      background: var(--ar-surface-100);
      padding: 3px 6px;
      border-radius: 4px;
      font-size: 11.5px;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }
    .test {
      margin: 0;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      font: 500 12.5px var(--ar-font-sans);
    }
    .test--ok {
      background: var(--ar-teal-50, #f0fdfa);
      color: var(--ar-teal-700, #0f766e);
      border: 1px solid var(--ar-teal-200, #99f6e4);
    }
    .test--bad {
      background: var(--ar-warn-50, #fef2f2);
      color: var(--ar-warn-700, #b91c1c);
      border: 1px solid var(--ar-warn-200, #fecaca);
    }
    .row-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      justify-content: flex-end;
    }
  `,
})
export class ArPaymentGateways implements OnInit {
  private readonly api = inject(PaymentGatewayConfigService);
  private readonly paymentService = inject(PaymentService);
  private readonly dialogs = inject(ConfirmService);
  private readonly toasts = inject(ToastService);

  readonly tabs = ['Platform gateways', 'Payment requests'] as const;
  protected readonly activeTab = signal<'Platform gateways' | 'Payment requests'>(
    'Platform gateways',
  );

  protected readonly config = signal<PaymentGatewayConfigDto | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly testing = signal<'razorpay' | 'payu' | null>(null);
  protected readonly rzpTest = signal<PaymentGatewayTestResultDto | null>(null);
  protected readonly payuTest = signal<PaymentGatewayTestResultDto | null>(null);

  protected readonly rzp: RazorpayForm = {
    active: false,
    keyId: '',
    keySecret: '',
    webhookSecret: '',
    verifyAmountViaApi: true,
  };

  protected readonly payu: PayUForm = {
    active: false,
    merchantKey: '',
    merchantSalt: '',
    testMode: true,
  };

  // BillDesk state
  protected readonly Env = BillDeskEnvironment;
  protected readonly Status = PaymentRequestStatus;
  protected readonly money = rupees;
  protected readonly billDeskMerchantId = signal('');
  protected readonly billDeskClientId = signal('');
  protected readonly billDeskSecret = signal('');
  protected readonly billDeskHasSecret = signal(false);
  protected readonly billDeskEnvironment = signal(BillDeskEnvironment.Uat);
  protected readonly billDeskEnabled = signal(false);
  protected readonly billDeskWebhookUrl = signal<string | null>(null);
  protected readonly paymentRequests = signal<PaymentRequestDto[]>([]);
  protected readonly savingBillDesk = signal(false);
  protected readonly billDeskNotice = signal<string | null>(null);
  protected readonly billDeskError = signal<string | null>(null);

  protected toneOf(status: PaymentRequestStatus): ChipTone {
    return STATUS_TONE[status] ?? 'neutral';
  }
  protected labelOf(status: PaymentRequestStatus): string {
    return PAYMENT_STATUS_LABEL[status] ?? String(status);
  }
  protected formatWhen(iso?: string | null): string {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadConfig(), this.loadBillDesk()]);
  }

  private async loadConfig(): Promise<void> {
    try {
      this.show(await firstValueFrom(this.api.get()));
    } catch {
      this.error.set('The payment gateway configuration could not be loaded.');
    }
  }

  private async loadBillDesk(): Promise<void> {
    try {
      const g = await firstValueFrom(this.paymentService.getGateway());
      this.billDeskMerchantId.set(g.merchantId ?? '');
      this.billDeskClientId.set(g.clientId ?? '');
      this.billDeskHasSecret.set(g.hasSecret);
      this.billDeskEnvironment.set(g.environment);
      this.billDeskEnabled.set(g.enabled);
      this.billDeskWebhookUrl.set(g.webhookUrl);

      const page = await firstValueFrom(this.paymentService.getList({ maxResultCount: 100 }));
      this.paymentRequests.set(page.items ?? []);
    } catch (e: unknown) {
      this.paymentRequests.set([]);
      this.billDeskError.set(readApiError(e, 'The BillDesk settings could not be loaded.'));
    }
  }

  protected async saveBillDesk(): Promise<void> {
    this.savingBillDesk.set(true);
    this.billDeskNotice.set(null);
    this.billDeskError.set(null);
    try {
      const g = await firstValueFrom(
        this.paymentService.setGateway({
          merchantId: this.billDeskMerchantId().trim() || null,
          clientId: this.billDeskClientId().trim() || null,
          secret: this.billDeskSecret().trim() || null,
          environment: this.billDeskEnvironment(),
          enabled: this.billDeskEnabled(),
        }),
      );
      this.billDeskSecret.set('');
      this.billDeskHasSecret.set(g.hasSecret);
      this.billDeskEnabled.set(g.enabled);
      this.billDeskNotice.set('BillDesk merchant settings saved successfully.');
    } catch (e: unknown) {
      this.billDeskError.set(apiMessage(e, 'The BillDesk account could not be saved.'));
    } finally {
      this.savingBillDesk.set(false);
    }
  }

  protected async cancelRequest(r: PaymentRequestDto): Promise<void> {
    try {
      const updated = await firstValueFrom(this.paymentService.cancel(r.id));
      this.paymentRequests.update((list) => list.map((x) => (x.id === r.id ? updated : x)));
      this.toasts.success('Payment request cancelled.', 'Cancelled');
    } catch (e: unknown) {
      this.toasts.error(apiMessage(e, 'The request could not be cancelled.'));
    }
  }

  private show(c: PaymentGatewayConfigDto): void {
    this.config.set(c);
    this.rzp.active = c.razorpay.active;
    this.rzp.keyId = c.razorpay.keyIdSource === 'saved' ? (c.razorpay.keyId ?? '') : '';
    this.rzp.keySecret = '';
    this.rzp.webhookSecret = '';
    this.rzp.verifyAmountViaApi = c.razorpay.verifyAmountViaApi;

    this.payu.active = c.payU.active;
    this.payu.merchantKey = c.payU.merchantKeySource === 'saved' ? (c.payU.merchantKey ?? '') : '';
    this.payu.merchantSalt = '';
    this.payu.testMode = c.payU.testMode;
  }

  protected sourceText(source: PaymentConfigSource, what: string): string {
    const c = this.config();
    if (source === 'config') {
      const value =
        what === 'key id'
          ? c?.razorpay.keyId
          : what === 'merchant key'
            ? c?.payU.merchantKey
            : null;
      return value
        ? `In use from the server configuration: ${value}. Enter one here to replace it.`
        : `The server configuration's ${what} is in use. Enter one here to replace it.`;
    }
    if (source === 'saved') return '';
    return `No ${what} is set.`;
  }

  protected secretPlaceholder(source: PaymentConfigSource): string {
    if (source === 'saved') return 'Saved. Leave empty to keep it';
    if (source === 'config') return 'From the server configuration';
    return 'Not set';
  }

  protected async saveRazorpay(): Promise<void> {
    if (this.busy()) return;
    const keyId = this.rzp.keyId.trim();
    if (keyId && !/^rzp_(test|live)_[A-Za-z0-9]+$/.test(keyId)) {
      this.toasts.error('A Razorpay key id starts rzp_test_ or rzp_live_.', 'Check the key id');
      return;
    }
    await this.run(async () => {
      this.show(
        await firstValueFrom(
          this.api.updateRazorpay({
            active: this.rzp.active,
            keyId,
            keySecret: this.rzp.keySecret.trim() || null,
            webhookSecret: this.rzp.webhookSecret.trim() || null,
            verifyAmountViaApi: this.rzp.verifyAmountViaApi,
          }),
        ),
      );
      this.rzpTest.set(null);
      this.toasts.success('Razorpay settings saved.', 'Saved');
    });
  }

  protected async savePayU(): Promise<void> {
    if (this.busy()) return;
    const merchantKey = this.payu.merchantKey.trim();
    if (merchantKey && !/^[A-Za-z0-9]+$/.test(merchantKey)) {
      this.toasts.error('A PayU merchant key is letters and digits.', 'Check the merchant key');
      return;
    }
    await this.run(async () => {
      this.show(
        await firstValueFrom(
          this.api.updatePayU({
            active: this.payu.active,
            merchantKey,
            merchantSalt: this.payu.merchantSalt.trim() || null,
            testMode: this.payu.testMode,
          }),
        ),
      );
      this.payuTest.set(null);
      this.toasts.success('PayU settings saved.', 'Saved');
    });
  }

  protected async clearSecret(field: SecretField): Promise<void> {
    const c = this.config();
    if (this.busy() || !c) return;
    const label =
      field === 'keySecret'
        ? 'Razorpay key secret'
        : field === 'webhookSecret'
          ? 'Razorpay webhook secret'
          : 'PayU salt';
    const ok = await this.dialogs.confirm({
      title: `Remove the saved ${label}?`,
      message:
        "It is deleted from secret storage. The server configuration's value is used if it has one; otherwise checkout stops offering the gateway until a new one is saved.",
      confirmText: 'Remove',
      tone: 'danger',
    });
    if (!ok) return;
    await this.run(async () => {
      const saved = await firstValueFrom(
        field === 'merchantSalt'
          ? this.api.updatePayU({
              active: c.payU.active,
              merchantKey: c.payU.merchantKeySource === 'saved' ? c.payU.merchantKey : '',
              testMode: c.payU.testMode,
              clearMerchantSalt: true,
            })
          : this.api.updateRazorpay({
              active: c.razorpay.active,
              keyId: c.razorpay.keyIdSource === 'saved' ? c.razorpay.keyId : '',
              verifyAmountViaApi: c.razorpay.verifyAmountViaApi,
              clearKeySecret: field === 'keySecret',
              clearWebhookSecret: field === 'webhookSecret',
            }),
      );
      this.show(saved);
      this.toasts.success(`Removed saved ${label}.`, 'Removed');
    });
  }

  protected async test(gateway: 'razorpay' | 'payu'): Promise<void> {
    if (this.testing()) return;
    this.testing.set(gateway);
    const result = gateway === 'razorpay' ? this.rzpTest : this.payuTest;
    result.set(null);
    try {
      result.set(
        await firstValueFrom(
          gateway === 'razorpay' ? this.api.testRazorpay() : this.api.testPayU(),
        ),
      );
    } catch {
      result.set({ ok: false, message: 'The test could not be run.' });
    } finally {
      this.testing.set(null);
    }
  }

  protected async copy(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.toasts.success('Copied to clipboard.', 'Copied');
    } catch {
      this.toasts.error('Copy it manually.', 'Could not copy');
    }
  }

  private async run(work: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    try {
      await work();
    } catch {
      // The API error is shown as a toast.
    } finally {
      this.busy.set(false);
    }
  }
}
