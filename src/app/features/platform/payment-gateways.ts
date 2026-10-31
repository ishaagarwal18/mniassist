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
import { ArButton } from '../../ui/button';
import { ArChip } from '../../ui/chip';

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
 * Platform › Payment gateways: the platform's own Razorpay and PayU accounts, which workspaces pay the platform through
 * (Billing › Top up, Invoices › Pay). Secrets are write-only: they go to the server's secret storage and only "saved" comes back.
 * Anything left empty here uses the server configuration (Payments:* settings), if it has a value.
 */
@Component({
  selector: 'ar-payment-gateways',
  imports: [FormsModule, ArTopbar, ArButton, ArChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Payment gateways"
      help="The Razorpay and PayU accounts workspaces pay the platform through."
    />
    <main class="gateways">
      @if (error()) {
        <p role="alert">{{ error() }}</p>
      }
      @if (config(); as c) {
        <p class="intro">
          Workspaces choose one of the gateways switched on here when they top up their wallet or
          pay an invoice. Key secrets and salts are stored in the server's secret storage and are
          never shown again after you save them. A field left empty uses the server configuration's
          value, if there is one.
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
            <label class="check"
              ><input
                type="checkbox"
                name="rzpActive"
                [(ngModel)]="rzp.active"
                [disabled]="busy()"
              />
              Offer Razorpay at checkout</label
            >
            <label class="ar-field"
              ><span>Key id</span>
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
              <small>{{ sourceText(c.razorpay.keyIdSource, 'key id') }}</small></label
            >
            <label class="ar-field"
              ><span>Key secret</span>
              <input
                class="ar-field__input"
                type="password"
                name="rzpKeySecret"
                autocomplete="new-password"
                [placeholder]="secretPlaceholder(c.razorpay.keySecretSource)"
                [(ngModel)]="rzp.keySecret"
                [disabled]="busy()"
              />
              <small>{{ sourceText(c.razorpay.keySecretSource, 'key secret') }}</small></label
            >
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
            <label class="ar-field"
              ><span>Webhook secret</span>
              <input
                class="ar-field__input"
                type="password"
                name="rzpWebhookSecret"
                autocomplete="new-password"
                [placeholder]="secretPlaceholder(c.razorpay.webhookSecretSource)"
                [(ngModel)]="rzp.webhookSecret"
                [disabled]="busy()"
              />
              <small
                >Credits a payment even when the payer closes the browser before returning.
                {{ sourceText(c.razorpay.webhookSecretSource, 'webhook secret') }}</small
              ></label
            >
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
            <label class="check"
              ><input
                type="checkbox"
                name="rzpVerify"
                [(ngModel)]="rzp.verifyAmountViaApi"
                [disabled]="busy()"
              />
              Confirm the amount and status with Razorpay's API, not only the signature
              (recommended)</label
            >
            <div class="actions">
              <button ar-button type="submit" [disabled]="busy()">
                {{ busy() ? 'Saving…' : 'Save Razorpay' }}
              </button>
              <button
                ar-button
                variant="ghost"
                type="button"
                [disabled]="busy() || testing() !== null"
                (click)="test('razorpay')"
              >
                {{ testing() === 'razorpay' ? 'Testing…' : 'Test saved keys' }}
              </button>
            </div>
            @if (rzpTest(); as t) {
              <p [attr.role]="t.ok ? 'status' : 'alert'" [class.bad]="!t.ok">{{ t.message }}</p>
            }
          </form>

          <div class="setup">
            <h3>Webhook</h3>
            @if (c.razorpayWebhookUrl) {
              <p>
                On Razorpay's dashboard, Account &amp; Settings › Webhooks, add this URL with the
                events <code translate="no">payment.captured</code> and
                <code translate="no">order.paid</code>, and the same secret as above.
              </p>
              <div class="copy">
                <code translate="no">{{ c.razorpayWebhookUrl }}</code>
                <button
                  ar-button
                  variant="quiet"
                  icon="copy"
                  type="button"
                  (click)="copy(c.razorpayWebhookUrl)"
                >
                  Copy
                </button>
              </div>
            } @else {
              <p>
                The server's own URL (App:SelfUrl) is not configured, so the webhook URL can't be
                shown.
              </p>
            }
          </div>
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
              c.payU.testMode ? 'Test environment' : 'Live'
            }}</ar-chip>
          </header>
          <p>
            UPI, cards, net banking and EMI. The merchant key and salt are on PayU's dashboard under
            Developers › API keys.
          </p>

          <form class="fields" (ngSubmit)="savePayU()">
            <label class="check"
              ><input
                type="checkbox"
                name="payuActive"
                [(ngModel)]="payu.active"
                [disabled]="busy()"
              />
              Offer PayU at checkout</label
            >
            <label class="ar-field"
              ><span>Merchant key</span>
              <input
                class="ar-field__input"
                name="payuKey"
                autocomplete="off"
                spellcheck="false"
                translate="no"
                [(ngModel)]="payu.merchantKey"
                [disabled]="busy()"
              />
              <small>{{ sourceText(c.payU.merchantKeySource, 'merchant key') }}</small></label
            >
            <label class="ar-field"
              ><span>Merchant salt</span>
              <input
                class="ar-field__input"
                type="password"
                name="payuSalt"
                autocomplete="new-password"
                [placeholder]="secretPlaceholder(c.payU.merchantSaltSource)"
                [(ngModel)]="payu.merchantSalt"
                [disabled]="busy()"
              />
              <small>{{ sourceText(c.payU.merchantSaltSource, 'salt') }}</small></label
            >
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
            <label class="check"
              ><input
                type="checkbox"
                name="payuTest"
                [(ngModel)]="payu.testMode"
                [disabled]="busy()"
              />
              Use PayU's test environment (test.payu.in): no real money moves</label
            >
            <div class="actions">
              <button ar-button type="submit" [disabled]="busy()">
                {{ busy() ? 'Saving…' : 'Save PayU' }}
              </button>
              <button
                ar-button
                variant="ghost"
                type="button"
                [disabled]="busy() || testing() !== null"
                (click)="test('payu')"
              >
                {{ testing() === 'payu' ? 'Testing…' : 'Test saved keys' }}
              </button>
            </div>
            @if (payuTest(); as t) {
              <p [attr.role]="t.ok ? 'status' : 'alert'" [class.bad]="!t.ok">{{ t.message }}</p>
            }
          </form>

          @if (c.payUReturnUrl) {
            <div class="setup">
              <h3>Return URL</h3>
              <p>
                Sent with every payment; nothing to set on PayU unless your account restricts return
                URLs, in which case allow this one.
              </p>
              <div class="copy">
                <code translate="no">{{ c.payUReturnUrl }}</code>
                <button
                  ar-button
                  variant="quiet"
                  icon="copy"
                  type="button"
                  (click)="copy(c.payUReturnUrl)"
                >
                  Copy
                </button>
              </div>
            </div>
          }
        </section>
      } @else if (!error()) {
        <p role="status">Loading…</p>
      }
    </main>
  `,
  styles: `
    .gateways {
      padding: 16px;
      display: grid;
      gap: 16px;
      max-width: 880px;
    }
    .intro {
      margin: 0;
      color: var(--ar-ink-600);
    }
    .card {
      background: var(--ar-surface-100);
      border: 1px solid var(--ar-line-200);
      border-radius: 8px;
      padding: 12px 16px;
      min-width: 0;
    }
    .head {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      margin-bottom: 4px;
    }
    .card h2 {
      font-size: 1.05em;
      margin: 0 8px 0 0;
    }
    .card h3 {
      font-size: 0.95em;
      margin: 0 0 4px;
    }
    .fields {
      display: grid;
      gap: 10px;
      max-width: 560px;
    }
    .fields .ar-field {
      min-width: 0;
    }
    .fields small {
      color: var(--ar-ink-500);
    }
    .check {
      display: inline-flex;
      gap: 8px;
      align-items: flex-start;
      min-width: 0;
    }
    .check input {
      margin-top: 3px;
    }
    .inline {
      margin-top: -6px;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .bad {
      color: var(--ar-bad-600, #b42318);
    }
    .setup {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid var(--ar-line-200);
    }
    .copy {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    code {
      overflow-wrap: anywhere;
    }
  `,
})
export class ArPaymentGateways implements OnInit {
  private readonly api = inject(PaymentGatewayConfigService);
  private readonly dialogs = inject(ConfirmService);
  private readonly toasts = inject(ToastService);

  protected readonly config = signal<PaymentGatewayConfigDto | null>(null);
  protected readonly busy = signal(false);
  protected readonly testing = signal<'razorpay' | 'payu' | null>(null);
  protected readonly error = signal('');
  protected readonly rzpTest = signal<PaymentGatewayTestResultDto | null>(null);
  protected readonly payuTest = signal<PaymentGatewayTestResultDto | null>(null);

  protected rzp: RazorpayForm = {
    active: true,
    keyId: '',
    keySecret: '',
    webhookSecret: '',
    verifyAmountViaApi: true,
  };
  protected payu: PayUForm = { active: true, merchantKey: '', merchantSalt: '', testMode: false };

  async ngOnInit(): Promise<void> {
    try {
      this.show(await firstValueFrom(this.api.get()));
    } catch {
      this.error.set('The payment gateway settings could not be loaded.');
    }
  }

  private show(c: PaymentGatewayConfigDto): void {
    this.config.set(c);
    this.rzp = {
      active: c.razorpay.active,
      // A key id from the server configuration is shown in the source note, not copied into the field: saving would pin it.
      keyId: c.razorpay.keyIdSource === 'saved' ? (c.razorpay.keyId ?? '') : '',
      keySecret: '',
      webhookSecret: '',
      verifyAmountViaApi: c.razorpay.verifyAmountViaApi,
    };
    this.payu = {
      active: c.payU.active,
      merchantKey: c.payU.merchantKeySource === 'saved' ? (c.payU.merchantKey ?? '') : '',
      merchantSalt: '',
      testMode: c.payU.testMode,
    };
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
        'It is deleted from secret storage. The server configuration’s value is used if it has one; otherwise checkout stops offering the gateway until a new one is saved.',
      confirmText: 'Remove',
      tone: 'danger',
    });
    if (!ok) return;
    await this.run(async () => {
      // The other fields are sent as they are stored, so removing a secret changes nothing else.
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
      this.toasts.success('Copied to the clipboard.', 'Copied');
    } catch {
      this.toasts.error('Copy it by hand instead.', 'Could not copy');
    }
  }

  private async run(work: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    try {
      await work();
    } catch {
      // The API's own message is already shown as a toast.
    } finally {
      this.busy.set(false);
    }
  }
}
