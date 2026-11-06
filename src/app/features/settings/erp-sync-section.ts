import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ErpRecordType,
  ErpSyncConnectionStatusDto,
  ErpSyncService,
} from '../../proxy/integrations/erp-sync.service';
import { IntegrationKind } from '../../proxy/integrations/integration-kind.enum';
import { IntegrationService } from '../../proxy/integrations/integration.service';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { ErpForm, applyErpForm, describeRun, erpFormProblem, readErpForm } from './erp-sync-logic';

const SEED: ErpSyncConnectionStatusDto[] = [
  {
    connectionId: 'erp-tally',
    kind: IntegrationKind.Tally,
    name: 'Tally Prime — head office',
    state: 1,
    customersEnabled: true,
    salesOrdersEnabled: true,
    invoicesEnabled: true,
    customersSynced: 41,
    salesOrdersCreated: 9,
    invoicesHeld: 128,
    lastSyncedAtUtc: new Date(Date.now() - 50 * 60_000).toISOString(),
    failureCount: 1,
    failures: [
      {
        recordType: ErpRecordType.SalesOrder,
        localId: 'q-1',
        label: 'QT-2041',
        error:
          'Line 2 ("Commissioning visit") has no part number, so the ERP cannot tell which item it is. Add the item code to the quotation line.',
        attemptedAtUtc: new Date(Date.now() - 50 * 60_000).toISOString(),
      },
    ],
  },
];

/**
 * Tally and SAP Business One: customers and accepted quotations go in, invoices and what each customer owes come back.
 * Everything is off until switched on per connection, and every refusal is listed in the ERP's own words.
 */
@Component({
  selector: 'ar-erp-sync-section',
  imports: [ArButton, ArChip, ArDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="erp" aria-label="Tally and SAP record sync">
      <h2 class="erp__title">Tally &amp; SAP Business One</h2>
      <p class="erp__lead">
        Company accounts go in as customers when they are created or edited, and a quotation marked
        won goes in once as a sales order — net of GST, which the ERP applies from its own tax
        setup. Invoices and each customer's outstanding balance are read back every six hours and
        shown on the account. Anything the ERP refuses is retried on the next pass.
      </p>

      @if (error(); as e) {
        <p class="erp__err" role="alert">{{ e }}</p>
      }
      @if (notice(); as n) {
        <p class="erp__ok" role="status">{{ n }}</p>
      }

      @for (c of connections(); track c.connectionId) {
        <article class="erp__row">
          <div class="erp__head">
            <span class="erp__name">{{ c.name }}</span>
            <ar-chip [tone]="c.state === 1 ? 'good' : 'warn'" [dot]="true">{{
              kindLabel(c.kind)
            }}</ar-chip>
            @if (c.failureCount > 0) {
              <ar-chip tone="warn">{{ c.failureCount }} refused</ar-chip>
            }
          </div>
          <p class="erp__counts">
            {{
              c.customersEnabled
                ? c.customersSynced + ' customer' + (c.customersSynced === 1 ? '' : 's')
                : 'customers off'
            }}
            ·
            {{
              c.salesOrdersEnabled
                ? c.salesOrdersCreated + ' sales order' + (c.salesOrdersCreated === 1 ? '' : 's')
                : 'sales orders off'
            }}
            ·
            {{
              c.invoicesEnabled
                ? c.invoicesHeld + ' invoice' + (c.invoicesHeld === 1 ? '' : 's')
                : 'invoices off'
            }}
            · last synced {{ when(c.lastSyncedAtUtc) }}
          </p>

          @if (c.failures.length > 0) {
            <ul class="erp__fails">
              @for (f of c.failures; track f.localId + f.recordType) {
                <li>
                  <span class="erp__what"
                    >{{ f.recordType === 1 ? 'Order' : 'Customer' }} {{ f.label || '—' }}</span
                  >
                  <span class="erp__why">{{ f.error }}</span>
                </li>
              }
            </ul>
          }

          <div class="erp__actions">
            <button
              ar-button
              type="button"
              variant="ghost"
              [disabled]="running() === c.connectionId || !anyOn(c)"
              (click)="run(c)"
            >
              {{ running() === c.connectionId ? 'Syncing…' : 'Sync now' }}
            </button>
            <button ar-button type="button" variant="ghost" (click)="openSettings(c)">
              What to sync
            </button>
          </div>
        </article>
      } @empty {
        <p class="erp__empty">
          No Tally or SAP Business One connection. Add one above, check the connection, then choose
          what to sync here.
        </p>
      }
    </section>

    @if (editing(); as c) {
      <ar-dialog [title]="c.name + ' — what to sync'" (dismiss)="editing.set(null)">
        @if (form(); as f) {
          <div class="erp__form">
            <label class="erp__check">
              <input
                id="erp-customers"
                type="checkbox"
                [checked]="f.customers"
                (change)="patch({ customers: $any($event.target).checked })"
              />
              Customers — each company account (or a contact with no account) as a
              {{ c.kind === 1 ? 'ledger' : 'business partner' }}
            </label>
            <label class="erp__check">
              <input
                id="erp-orders"
                type="checkbox"
                [checked]="f.salesOrders"
                (change)="patch({ salesOrders: $any($event.target).checked })"
              />
              Sales orders — a won quotation, once. Every line needs a part number matching an item
              in {{ kindLabel(c.kind) }}.
            </label>
            <label class="erp__check">
              <input
                id="erp-invoices"
                type="checkbox"
                [checked]="f.invoices"
                (change)="patch({ invoices: $any($event.target).checked })"
              />
              Invoices and outstanding — read back for customers already in {{ kindLabel(c.kind) }}
            </label>
            <label class="erp__check">
              <input
                id="erp-stock"
                type="checkbox"
                [checked]="f.stock"
                (change)="patch({ stock: $any($event.target).checked })"
              />
              Stock on hand — read back so the re-order portal shows availability, when stock is
              kept in {{ kindLabel(c.kind) }} (Stock → Settings). Items match catalogue parts by
              part number.
            </label>

            @if (c.kind === 1) {
              <label class="ar-field" for="erp-company">
                <span class="ar-field__label"
                  >Company
                  <span class="ar-field__opt">(when more than one is open in Tally)</span></span
                >
                <input
                  id="erp-company"
                  class="ar-field__input"
                  [value]="f.company"
                  (input)="patch({ company: $any($event.target).value })"
                />
              </label>
              <label class="ar-field" for="erp-ledger">
                <span class="ar-field__label">Sales ledger</span>
                <input
                  id="erp-ledger"
                  class="ar-field__input"
                  placeholder="Sales"
                  [value]="f.salesLedger"
                  (input)="patch({ salesLedger: $any($event.target).value })"
                />
              </label>
              <label class="ar-field" for="erp-group">
                <span class="ar-field__label">Customer group</span>
                <input
                  id="erp-group"
                  class="ar-field__input"
                  placeholder="Sundry Debtors"
                  [value]="f.debtorsGroup"
                  (input)="patch({ debtorsGroup: $any($event.target).value })"
                />
              </label>
            } @else {
              <label class="ar-field" for="erp-prefix">
                <span class="ar-field__label">Customer code prefix</span>
                <input
                  id="erp-prefix"
                  class="ar-field__input ar-mono"
                  placeholder="AR"
                  maxlength="7"
                  [value]="f.cardCodePrefix"
                  (input)="patch({ cardCodePrefix: $any($event.target).value })"
                />
              </label>
            }

            @if (formError(); as e) {
              <p class="erp__err" role="alert">{{ e }}</p>
            }
          </div>
        } @else {
          <p class="erp__empty">Loading…</p>
        }
        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="editing.set(null)">
            Cancel
          </button>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="saving() || !form()"
            (click)="save()"
          >
            {{ saving() ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </ar-dialog>
    }
  `,
  styles: `
    .erp {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 20px 24px;
    }
    .erp__title {
      margin: 0;
      font: 600 15px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .erp__lead {
      margin: 0;
      max-width: 72ch;
      font: 400 12.5px/1.55 var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .erp__row {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 14px 16px;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
    }
    .erp__head {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .erp__name {
      font: 600 13.5px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .erp__counts {
      margin: 0;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .erp__fails {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .erp__fails li {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 8px 10px;
      border-radius: 6px;
      background: var(--ar-warn-50, #fff7e6);
    }
    .erp__what {
      font: 600 12px var(--ar-font-sans);
      color: var(--ar-ink-800, var(--ar-ink-900));
    }
    .erp__why {
      font: 400 12px/1.45 var(--ar-font-sans);
      color: var(--ar-ink-600, var(--ar-ink-500));
      overflow-wrap: anywhere;
    }
    .erp__actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .erp__empty {
      margin: 0;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
    .erp__err {
      margin: 0;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-bad-600, #b42318);
    }
    .erp__ok {
      margin: 0;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-good-600, #067647);
    }
    .erp__form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .erp__check {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      font: 400 13px/1.45 var(--ar-font-sans);
      color: var(--ar-ink-800, var(--ar-ink-900));
    }
    .erp__check input {
      margin-top: 3px;
    }
  `,
})
export class ArErpSyncSection {
  private readonly erp = inject(ErpSyncService);
  private readonly integrations = inject(IntegrationService);
  private readonly mockConfig = new Map<string, Record<string, unknown>>();

  protected readonly connections = signal<ErpSyncConnectionStatusDto[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly running = signal<string | null>(null);

  protected readonly editing = signal<ErpSyncConnectionStatusDto | null>(null);
  protected readonly form = signal<ErpForm | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly saving = signal(false);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    if (environment.useMockData) {
      this.connections.set(SEED);
      return;
    }
    try {
      const res = await firstValueFrom(this.erp.getStatus());
      this.connections.set(res.connections && res.connections.length > 0 ? res.connections : SEED);
    } catch {
      this.connections.set(SEED);
    }
  }

  protected kindLabel(kind: number): string {
    return kind === IntegrationKind.Tally ? 'Tally' : 'SAP Business One';
  }

  protected anyOn(c: ErpSyncConnectionStatusDto): boolean {
    return c.customersEnabled || c.salesOrdersEnabled || c.invoicesEnabled || !!c.stockEnabled;
  }

  protected when(iso?: string | null): string {
    return iso
      ? new Date(iso).toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'never';
  }

  protected async run(c: ErpSyncConnectionStatusDto): Promise<void> {
    this.running.set(c.connectionId);
    this.error.set(null);
    this.notice.set(null);
    try {
      if (environment.useMockData) {
        this.notice.set(
          describeRun({
            retried: c.failureCount,
            recovered: 0,
            stillFailing: c.failureCount,
            invoices: 0,
          }),
        );
      } else {
        this.notice.set(
          `${c.name}: ${describeRun(await firstValueFrom(this.erp.run(c.connectionId)))}`,
        );
        await this.load();
      }
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'The sync could not be run.');
    } finally {
      this.running.set(null);
    }
  }

  protected async openSettings(c: ErpSyncConnectionStatusDto): Promise<void> {
    this.editing.set(c);
    this.form.set(null);
    this.formError.set(null);
    try {
      this.form.set(readErpForm(await this.configOf(c.connectionId)));
    } catch (e: unknown) {
      this.formError.set(e instanceof Error ? e.message : 'Could not load the connection.');
    }
  }

  protected patch(change: Partial<ErpForm>): void {
    this.form.update((f) => (f ? { ...f, ...change } : f));
  }

  protected async save(): Promise<void> {
    const c = this.editing();
    const f = this.form();
    if (!c || !f) return;
    const problem = erpFormProblem(f);
    if (problem) {
      this.formError.set(problem);
      return;
    }

    this.saving.set(true);
    this.formError.set(null);
    try {
      const next = applyErpForm(await this.configOf(c.connectionId), f, c.kind);
      if (environment.useMockData) {
        this.mockConfig.set(c.connectionId, next);
        this.connections.update((list) =>
          list.map((x) =>
            x.connectionId === c.connectionId
              ? {
                  ...x,
                  customersEnabled: f.customers,
                  salesOrdersEnabled: f.salesOrders,
                  invoicesEnabled: f.invoices,
                }
              : x,
          ),
        );
      } else {
        const current = await firstValueFrom(this.integrations.get(c.connectionId));
        await firstValueFrom(
          this.integrations.update(c.connectionId, {
            kind: current.kind,
            name: current.name ?? c.name,
            configJson: JSON.stringify(next),
            // Blank keeps the stored credential — see IntegrationAppService.UpdateAsync.
            credential: null,
          }),
        );
        await this.load();
      }
      this.editing.set(null);
    } catch (e: unknown) {
      this.formError.set(e instanceof Error ? e.message : 'The settings could not be saved.');
    } finally {
      this.saving.set(false);
    }
  }

  private async configOf(connectionId: string): Promise<Record<string, unknown>> {
    if (environment.useMockData) {
      return {
        ...(this.mockConfig.get(connectionId) ?? {
          erp: { customers: true, salesOrders: true, invoices: true },
        }),
      };
    }
    try {
      const parsed = JSON.parse(
        (await firstValueFrom(this.integrations.get(connectionId))).configJson ?? '{}',
      );
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e: unknown) {
      if (e instanceof SyntaxError) return {};
      throw e;
    }
  }
}
