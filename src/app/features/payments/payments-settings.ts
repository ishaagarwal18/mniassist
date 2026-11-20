import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { PermissionService } from '@abp/ng.core';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { ArTopbar } from '../../layout/topbar';
import {
  PaymentGatewayDto,
  PaymentRequestDto,
  PaymentRequestStatus,
  PaymentService,
} from '../../proxy/payments/payment.service';
import { ArButton, ArChip } from '../../ui';
import { ChipTone } from '../../ui/chip';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { ArGrid } from '../../ui/grid';
import { apiMessage } from '../signing/signing-logic';
import { PAYMENT_STATUS_LABEL, rupees } from './payment-logic';

const STATUS_TONE: Record<PaymentRequestStatus, ChipTone> = {
  [PaymentRequestStatus.Pending]: 'amber',
  [PaymentRequestStatus.Paid]: 'good',
  [PaymentRequestStatus.Failed]: 'bad',
  [PaymentRequestStatus.Expired]: 'neutral',
  [PaymentRequestStatus.Cancelled]: 'neutral',
};

/**
 * Collecting payment from customers: the workspace's own Razorpay account (where the money goes) with its test and live key
 * pairs, and every request sent from a conversation with where it stands. Requests themselves are raised from the inbox.
 */
@Component({
  selector: 'ar-payments-settings',
  imports: [ArTopbar, ArButton, ArChip, ArGrid, GridModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Payments"
      [subtitle]="
        !enabled() ? 'Not collecting yet' : testMode() ? 'Collecting through Razorpay (test mode)' : 'Collecting through Razorpay'
      "
      help="Send a customer a payment link from their conversation in the inbox. They pay in Razorpay's window by UPI, card, net banking or wallet, into your own Razorpay account. A request is marked paid only when Razorpay confirms the payment, captured, for exactly the amount asked. Use test mode to try the whole flow without real money."
    />

    <div class="pm ar-scroll">
      @if (canManage()) {
        <section class="pm__card">
          <div class="pm__head">
            <h2 class="pm__h">Razorpay account</h2>
            <ar-chip [tone]="testMode() ? 'amber' : 'good'" [dot]="true">
              {{ testMode() ? 'Test mode' : 'Live' }}
            </ar-chip>
          </div>

          <div class="pm__mode" role="radiogroup" aria-label="Which keys to use">
            <label class="pm__mode-opt" [class.pm__mode-opt--on]="testMode()">
              <input type="radio" name="pm-mode" [checked]="testMode()" (change)="testMode.set(true)" />
              <span>
                <strong>Test</strong>
                <small>Simulated payments with Razorpay's test cards and UPI ids. No real money.</small>
              </span>
            </label>
            <label class="pm__mode-opt" [class.pm__mode-opt--on]="!testMode()">
              <input type="radio" name="pm-mode" [checked]="!testMode()" (change)="testMode.set(false)" />
              <span>
                <strong>Live</strong>
                <small>Real payments into your Razorpay account.</small>
              </span>
            </label>
          </div>

          <div class="pm__pairs">
            <fieldset class="pm__pair" [class.pm__pair--active]="testMode()">
              <legend>Test keys</legend>
              <label class="ar-field" for="pm-test-key">
                <span class="ar-field__label">Key id</span>
                <input
                  id="pm-test-key"
                  class="ar-field__input ar-mono"
                  placeholder="rzp_test_…"
                  [value]="testKeyId()"
                  (input)="testKeyId.set($any($event.target).value)"
                />
              </label>
              <label class="ar-field" for="pm-test-secret">
                <span class="ar-field__label">
                  Key secret
                  @if (hasTestSecret()) {
                    <span class="ar-field__opt">(stored, leave empty to keep it)</span>
                  }
                </span>
                <input
                  id="pm-test-secret"
                  type="password"
                  autocomplete="off"
                  class="ar-field__input"
                  [value]="testKeySecret()"
                  (input)="testKeySecret.set($any($event.target).value)"
                />
              </label>
              <label class="ar-field" for="pm-test-hook">
                <span class="ar-field__label">
                  Webhook secret
                  @if (hasTestWebhookSecret()) {
                    <span class="ar-field__opt">(stored, leave empty to keep it)</span>
                  }
                </span>
                <input
                  id="pm-test-hook"
                  type="password"
                  autocomplete="off"
                  class="ar-field__input"
                  [value]="testWebhookSecret()"
                  (input)="testWebhookSecret.set($any($event.target).value)"
                />
              </label>
            </fieldset>
            <fieldset class="pm__pair" [class.pm__pair--active]="!testMode()">
              <legend>Live keys</legend>
              <label class="ar-field" for="pm-live-key">
                <span class="ar-field__label">Key id</span>
                <input
                  id="pm-live-key"
                  class="ar-field__input ar-mono"
                  placeholder="rzp_live_…"
                  [value]="keyId()"
                  (input)="keyId.set($any($event.target).value)"
                />
              </label>
              <label class="ar-field" for="pm-live-secret">
                <span class="ar-field__label">
                  Key secret
                  @if (hasLiveSecret()) {
                    <span class="ar-field__opt">(stored, leave empty to keep it)</span>
                  }
                </span>
                <input
                  id="pm-live-secret"
                  type="password"
                  autocomplete="off"
                  class="ar-field__input"
                  [value]="keySecret()"
                  (input)="keySecret.set($any($event.target).value)"
                />
              </label>
              <label class="ar-field" for="pm-live-hook">
                <span class="ar-field__label">
                  Webhook secret
                  @if (hasLiveWebhookSecret()) {
                    <span class="ar-field__opt">(stored, leave empty to keep it)</span>
                  }
                </span>
                <input
                  id="pm-live-hook"
                  type="password"
                  autocomplete="off"
                  class="ar-field__input"
                  [value]="webhookSecret()"
                  (input)="webhookSecret.set($any($event.target).value)"
                />
              </label>
            </fieldset>
          </div>
          <p class="pm__hint">
            Find both pairs in the Razorpay Dashboard under Account &amp; Settings › API keys. Switch the
            dashboard to test mode to see the test pair.
          </p>
          @if (webhookUrl(); as url) {
            <div class="pm__hook">
              <p class="pm__hint">
                In the Razorpay Dashboard, add a webhook in each mode (Account &amp; Settings › Webhooks)
                with this URL, the events payment.captured, payment.failed and order.paid, and a secret
                of your choice. Enter the same secret here. Payments are then confirmed even when the
                customer closes the window early.
              </p>
              <div class="pm__hook-row">
                <code class="ar-mono">{{ url }}</code>
                <button ar-button type="button" variant="quiet" (click)="copy(url)">Copy</button>
              </div>
            </div>
          }

          <label class="pm__check">
            <input
              type="checkbox"
              [checked]="enabled()"
              (change)="enabled.set($any($event.target).checked)"
            />
            <span>Let the team send payment requests</span>
          </label>
          <div class="pm__actions">
            <button ar-button type="button" variant="ghost" [disabled]="checkingKeys()" (click)="checkKeys()">
              {{ checkingKeys() ? 'Checking…' : 'Check keys' }}
            </button>
            <button
              ar-button
              type="button"
              variant="primary"
              [disabled]="saving()"
              (click)="save()"
            >
              {{ saving() ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </section>
      }

      @if (notice(); as n) {
        <p class="pm__ok" role="status">{{ n }}</p>
      }
      @if (error(); as e) {
        <p class="pm__err" role="alert">{{ e }}</p>
      }

      <section class="pm__card">
        <h2 class="pm__h">Requests</h2>
        @if (requests().length === 0) {
          <p class="pm__hint">
            No payment requests yet. Send one from a conversation in the inbox.
          </p>
        } @else {
          <ejs-grid
            arGrid="payment-requests"
            [dataSource]="requests()"
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
                  {{ r.contactName || '—' }}
                </ng-template>
              </e-column>
              <e-column field="description" headerText="For" width="200">
                <ng-template #template let-r>
                  <span class="pm__desc">{{ r.description }}</span>
                </ng-template>
              </e-column>
              <e-column field="amountInPaise" headerText="Amount" width="130" [textAlign]="'Right'">
                <ng-template #template let-r>
                  <span class="pm__num">{{ money(r.amountInPaise) }}</span>
                </ng-template>
              </e-column>
              <e-column headerText="Status" width="160">
                <ng-template #template let-r>
                  <div>
                    <ar-chip [tone]="toneOf(r.status)">{{ labelOf(r.status) }}</ar-chip>
                    @if (r.isTest) {
                      <ar-chip tone="amber">Test</ar-chip>
                    }
                    @if (r.status === Status.Failed && r.failureReason) {
                      <span class="pm__why block text-xs">{{ r.failureReason }}</span>
                    }
                  </div>
                </ng-template>
              </e-column>
              <e-column headerText="Actions" width="140">
                <ng-template #template let-r>
                  <div class="pm__row-actions">
                    @if (r.status === Status.Pending || r.status === Status.Failed) {
                      <button type="button" class="pm__link" (click)="copy(r.payUrl)">
                        Copy link
                      </button>
                      @if (canCancel()) {
                        <button type="button" class="pm__link pm__link--bad" (click)="cancel(r)">
                          Cancel
                        </button>
                      }
                    }
                  </div>
                </ng-template>
              </e-column>
            </e-columns>
          </ejs-grid>
        }
      </section>
    </div>
  `,
  styles: `
    .pm {
      padding: 20px 24px 40px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 980px;
    }
    .pm__card {
      padding: 16px 18px;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .pm__h {
      margin: 0;
      font: 600 14px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .pm__head {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .pm__mode {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 10px;
    }
    .pm__mode-opt {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      padding: 10px 12px;
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-control);
      cursor: pointer;
      font: 400 13px/1.4 var(--ar-font-sans);
      color: var(--ar-ink-800);
    }
    .pm__mode-opt--on {
      border-color: var(--ar-teal-600);
      background: var(--ar-bg-50);
    }
    .pm__mode-opt span {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .pm__mode-opt small {
      font-size: 12px;
      color: var(--ar-ink-500);
    }
    .pm__pairs {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 12px;
    }
    .pm__pair {
      margin: 0;
      padding: 10px 12px 12px;
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-control);
      display: flex;
      flex-direction: column;
      gap: 10px;
      opacity: 0.75;
    }
    .pm__pair--active {
      opacity: 1;
      border-color: var(--ar-teal-600);
    }
    .pm__pair legend {
      padding: 0 4px;
      font: 600 12.5px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .pm__check {
      display: flex;
      gap: 8px;
      align-items: center;
      font: 500 13px var(--ar-font-sans);
      color: var(--ar-ink-800);
    }
    .pm__hint {
      margin: 0;
      font: 400 12.5px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-500);
      overflow-wrap: anywhere;
    }
    .pm__hook {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .pm__hook-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .pm__hook-row code {
      padding: 3px 6px;
      border-radius: 4px;
      background: var(--ar-bg-100);
      font-size: 12px;
      overflow-wrap: anywhere;
    }
    .pm__actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .pm__ok {
      margin: 0;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-teal-600);
    }
    .pm__err {
      margin: 0;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-warn-600);
    }
    .pm__table-wrap {
      overflow-x: auto;
    }
    .pm__table {
      width: 100%;
      border-collapse: collapse;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-800);
    }
    .pm__table th {
      text-align: left;
      padding: 6px 8px;
      font-weight: 600;
      color: var(--ar-ink-500);
      border-bottom: 1px solid var(--ar-line-200);
      white-space: nowrap;
    }
    .pm__table td {
      padding: 8px;
      border-bottom: 1px solid var(--ar-line-200);
      vertical-align: top;
    }
    .pm__num {
      text-align: right;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .pm__desc {
      max-width: 260px;
    }
    .pm__why {
      display: block;
      margin-top: 3px;
      font-size: 11.5px;
      color: var(--ar-warn-600);
    }
    .pm__row-actions {
      white-space: nowrap;
    }
    .pm__link {
      background: none;
      border: 0;
      padding: 0 6px;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-teal-600);
      cursor: pointer;
    }
    .pm__link--bad {
      color: var(--ar-warn-600);
    }
  `,
})
export class ArPaymentsSettings {
  private readonly api = inject(PaymentService);
  private readonly permissions = inject(PermissionService);

  protected readonly Status = PaymentRequestStatus;
  protected toneOf(status: PaymentRequestStatus): ChipTone {
    return STATUS_TONE[status] ?? 'neutral';
  }
  protected labelOf(status: PaymentRequestStatus): string {
    return PAYMENT_STATUS_LABEL[status] ?? String(status);
  }
  protected readonly money = rupees;
  protected readonly canManage = grantedPolicy(
    'AutoReach.Payments.ManageGateway',
    this.permissions,
  );
  protected readonly canCancel = grantedPolicy('AutoReach.Payments.Cancel', this.permissions);

  protected readonly keyId = signal('');
  protected readonly keySecret = signal('');
  protected readonly hasLiveSecret = signal(false);
  protected readonly testKeyId = signal('');
  protected readonly testKeySecret = signal('');
  protected readonly hasTestSecret = signal(false);
  protected readonly webhookSecret = signal('');
  protected readonly testWebhookSecret = signal('');
  protected readonly hasLiveWebhookSecret = signal(false);
  protected readonly hasTestWebhookSecret = signal(false);
  protected readonly webhookUrl = signal<string | null>(null);
  protected readonly testMode = signal(true);
  protected readonly enabled = signal(false);
  protected readonly checkingKeys = signal(false);
  protected readonly requests = signal<PaymentRequestDto[]>([]);
  protected readonly saving = signal(false);
  protected readonly notice = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      if (this.canManage()) {
        this.apply(await firstValueFrom(this.api.getGateway()));
      }
      const page = await firstValueFrom(this.api.getList({ maxResultCount: 100 }));
      this.requests.set(page.items ?? []);
    } catch (e: unknown) {
      this.error.set(apiMessage(e, 'Payments could not be loaded.'));
    }
  }

  protected async save(): Promise<void> {
    this.saving.set(true);
    this.notice.set(null);
    this.error.set(null);
    try {
      const g = await firstValueFrom(
        this.api.setGateway({
          keyId: this.keyId().trim() || null,
          keySecret: this.keySecret().trim() || null,
          testKeyId: this.testKeyId().trim() || null,
          testKeySecret: this.testKeySecret().trim() || null,
          webhookSecret: this.webhookSecret().trim() || null,
          testWebhookSecret: this.testWebhookSecret().trim() || null,
          testMode: this.testMode(),
          enabled: this.enabled(),
        }),
      );
      this.apply(g);
      this.notice.set(
        !g.enabled
          ? 'Saved.'
          : g.testMode
            ? 'Saved. The team can send payment requests in test mode: no real money moves.'
            : 'Saved. The team can now send payment requests.',
      );
    } catch (e: unknown) {
      this.error.set(apiMessage(e, 'The account could not be saved.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected async checkKeys(): Promise<void> {
    this.checkingKeys.set(true);
    this.notice.set(null);
    this.error.set(null);
    try {
      const r = await firstValueFrom(this.api.testGateway());
      if (r.ok) this.notice.set(r.message);
      else this.error.set(r.message);
    } catch (e: unknown) {
      this.error.set(apiMessage(e, 'The keys could not be checked.'));
    } finally {
      this.checkingKeys.set(false);
    }
  }

  private apply(g: PaymentGatewayDto): void {
    this.keyId.set(g.keyId ?? '');
    this.testKeyId.set(g.testKeyId ?? '');
    this.keySecret.set('');
    this.testKeySecret.set('');
    this.hasLiveSecret.set(g.hasLiveSecret);
    this.hasTestSecret.set(g.hasTestSecret);
    this.webhookSecret.set('');
    this.testWebhookSecret.set('');
    this.hasLiveWebhookSecret.set(g.hasLiveWebhookSecret);
    this.hasTestWebhookSecret.set(g.hasTestWebhookSecret);
    this.webhookUrl.set(g.webhookUrl ?? null);
    this.testMode.set(g.testMode);
    this.enabled.set(g.enabled);
  }

  protected async cancel(r: PaymentRequestDto): Promise<void> {
    try {
      const updated = await firstValueFrom(this.api.cancel(r.id));
      this.requests.update((list) => list.map((x) => (x.id === r.id ? updated : x)));
    } catch (e: unknown) {
      this.error.set(apiMessage(e, 'The request could not be cancelled.'));
    }
  }

  protected async copy(url: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      this.notice.set('Link copied.');
    } catch {
      this.error.set('Copying was blocked by the browser.');
    }
  }
}
