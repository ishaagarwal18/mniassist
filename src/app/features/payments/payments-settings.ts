import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { PermissionService } from '@abp/ng.core';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { ArTopbar } from '../../layout/topbar';
import {
  BillDeskEnvironment,
  PaymentRequestDto,
  PaymentRequestStatus,
  PaymentService,
} from '../../proxy/payments/payment.service';
import { ArButton, ArChip } from '../../ui';
import { ArSelect } from '../../ui/select';
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
 * Collecting payment from customers: the workspace's own BillDesk merchant account (where the money goes), and every request
 * sent from a conversation with where it stands. Requests themselves are raised from the inbox, next to the customer.
 */
@Component({
  selector: 'ar-payments-settings',
  imports: [ArTopbar, ArButton, ArChip, ArSelect, ArGrid, GridModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Payments"
      [subtitle]="enabled() ? 'Collecting through BillDesk' : 'Not collecting yet'"
      help="Send a customer a payment link from their conversation in the inbox. They pay on BillDesk's secure page by UPI, card or net banking, into your own BillDesk merchant account. A request is marked paid only when BillDesk's signed confirmation arrives for exactly the amount asked."
    />

    <div class="pm ar-scroll">
      @if (canManage()) {
        <section class="pm__card">
          <h2 class="pm__h">BillDesk account</h2>
          <div class="pm__grid">
            <label class="ar-field" for="pm-merchant">
              <span class="ar-field__label">Merchant ID</span>
              <input
                id="pm-merchant"
                class="ar-field__input ar-mono"
                [value]="merchantId()"
                (input)="merchantId.set($any($event.target).value)"
              />
            </label>
            <label class="ar-field" for="pm-client">
              <span class="ar-field__label">Client ID</span>
              <input
                id="pm-client"
                class="ar-field__input ar-mono"
                [value]="clientId()"
                (input)="clientId.set($any($event.target).value)"
              />
            </label>
            <label class="ar-field" for="pm-secret">
              <span class="ar-field__label">
                Signing secret
                @if (hasSecret()) {
                  <span class="ar-field__opt">(stored — leave empty to keep it)</span>
                }
              </span>
              <input
                id="pm-secret"
                type="password"
                autocomplete="off"
                class="ar-field__input"
                [value]="secret()"
                (input)="secret.set($any($event.target).value)"
              />
            </label>
            <label class="ar-field" for="pm-env">
              <span class="ar-field__label">System</span>
              <select
                id="pm-env"
                class="ar-field__input"
                (change)="environment.set(+$any($event.target).value)"
              >
                <option [value]="Env.Uat" [selected]="environment() === Env.Uat">
                  Test (UAT) — no real money
                </option>
                <option [value]="Env.Production" [selected]="environment() === Env.Production">
                  Live
                </option>
              </select>
            </label>
          </div>
          <label class="pm__check">
            <input
              type="checkbox"
              [checked]="enabled()"
              (change)="enabled.set($any($event.target).checked)"
            />
            <span>Let the team send payment requests</span>
          </label>
          @if (webhookUrl(); as url) {
            <p class="pm__hint">
              Give BillDesk this webhook address for your account:
              <span class="ar-mono">{{ url }}</span>
            </p>
          }
          <div class="pm__actions">
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
    .pm__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 10px;
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
    .pm__actions {
      display: flex;
      justify-content: flex-end;
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

  protected readonly Env = BillDeskEnvironment;
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

  protected readonly merchantId = signal('');
  protected readonly clientId = signal('');
  protected readonly secret = signal('');
  protected readonly hasSecret = signal(false);
  protected readonly environment = signal(BillDeskEnvironment.Uat);
  protected readonly enabled = signal(false);
  protected readonly webhookUrl = signal<string | null>(null);
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
        const g = await firstValueFrom(this.api.getGateway());
        this.merchantId.set(g.merchantId ?? '');
        this.clientId.set(g.clientId ?? '');
        this.hasSecret.set(g.hasSecret);
        this.environment.set(g.environment);
        this.enabled.set(g.enabled);
        this.webhookUrl.set(g.webhookUrl);
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
          merchantId: this.merchantId().trim() || null,
          clientId: this.clientId().trim() || null,
          secret: this.secret().trim() || null,
          environment: this.environment(),
          enabled: this.enabled(),
        }),
      );
      this.secret.set('');
      this.hasSecret.set(g.hasSecret);
      this.enabled.set(g.enabled);
      this.notice.set(g.enabled ? 'Saved. The team can now send payment requests.' : 'Saved.');
    } catch (e: unknown) {
      this.error.set(apiMessage(e, 'The account could not be saved.'));
    } finally {
      this.saving.set(false);
    }
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
