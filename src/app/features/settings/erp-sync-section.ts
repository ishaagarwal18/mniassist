import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  ErpSyncConnectionStatusDto,
  ErpSyncService,
} from '../../proxy/integrations/erp-sync.service';
import { IntegrationKind } from '../../proxy/integrations/integration-kind.enum';
import { IntegrationService } from '../../proxy/integrations/integration.service';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { ErpForm, applyErpForm, describeRun, erpFormProblem, readErpForm } from './erp-sync-logic';
import {
  ErpConnectionFields,
  FieldErrors,
  applyErpConnection,
  erpConnectionErrors,
  hasErrors,
} from './connector-validation';
import { IntegrationState } from '../../proxy/integrations/integration-state.enum';

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
      <div class="erp__top">
        <h2 class="erp__title">Tally &amp; SAP Business One</h2>
        <button ar-button type="button" icon="plus" (click)="openConnection(null)">
          Add connection
        </button>
      </div>
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
            <button ar-button type="button" variant="ghost" (click)="openConnection(c)">
              Connection details
            </button>
          </div>
        </article>
      } @empty {
        <p class="erp__empty">
          No Tally or SAP Business One connection. Use Add connection, then choose what to sync
          here.
        </p>
      }
    </section>

    @if (connection(); as cf) {
      <ar-dialog
        [title]="cf.id ? cf.fields.name + ' — connection' : 'Add a Tally or SAP connection'"
        (dismiss)="connection.set(null)"
      >
        <div class="erp__form">
          @if (!cf.id) {
            <label class="ar-field" for="erp-kind">
              <span class="ar-field__label">ERP</span>
              <select
                id="erp-kind"
                class="ar-field__input"
                [value]="cf.fields.kind"
                (change)="patchConnection({ kind: +$any($event.target).value })"
              >
                <option [value]="tally">Tally (Prime / ERP 9)</option>
                <option [value]="sap">SAP Business One</option>
              </select>
            </label>
          }
          <label class="ar-field" for="erp-name">
            <span class="ar-field__label">Name</span>
            <input
              id="erp-name"
              class="ar-field__input"
              maxlength="128"
              [class.ar-invalid]="!!connErrors()['name']"
              [attr.aria-invalid]="!!connErrors()['name']"
              [value]="cf.fields.name"
              (input)="patchConnection({ name: $any($event.target).value })"
            />
            @if (connErrors()['name']; as e) {
              <small class="ar-field__error">{{ e }}</small>
            }
          </label>
          <label class="ar-field" for="erp-url">
            <span class="ar-field__label">{{
              cf.fields.kind === tally ? 'Tally gateway address' : 'Service Layer address'
            }}</span>
            <input
              id="erp-url"
              class="ar-field__input ar-mono"
              translate="no"
              [placeholder]="
                cf.fields.kind === tally
                  ? 'http://192.168.1.20:9000'
                  : 'https://sap.acme.in:50000/b1s/v1'
              "
              [class.ar-invalid]="!!connErrors()['url']"
              [attr.aria-invalid]="!!connErrors()['url']"
              [value]="cf.fields.url"
              (input)="patchConnection({ url: $any($event.target).value })"
            />
            @if (connErrors()['url']; as e) {
              <small class="ar-field__error">{{ e }}</small>
            }
            <small class="ar-field__hint">{{
              cf.fields.kind === tally
                ? 'Tally must be running with its HTTP server on (F1 Help, Settings, Connectivity), and reachable from the AutoReach server — usually through a tunnel or a static IP, since Tally sits on the office network.'
                : 'The address of your SAP Business One Service Layer, ending /b1s/v1 or /b1s/v2.'
            }}</small>
          </label>
          @if (cf.fields.kind === sap) {
            <label class="ar-field" for="erp-db">
              <span class="ar-field__label">Company database</span>
              <input
                id="erp-db"
                class="ar-field__input ar-mono"
                translate="no"
                placeholder="SBODEMOIN"
                [class.ar-invalid]="!!connErrors()['companyDb']"
                [attr.aria-invalid]="!!connErrors()['companyDb']"
                [value]="cf.fields.companyDb"
                (input)="patchConnection({ companyDb: $any($event.target).value })"
              />
              @if (connErrors()['companyDb']; as e) {
                <small class="ar-field__error">{{ e }}</small>
              }
            </label>
            <label class="ar-field" for="erp-user">
              <span class="ar-field__label">User name</span>
              <input
                id="erp-user"
                class="ar-field__input"
                autocomplete="off"
                [class.ar-invalid]="!!connErrors()['username']"
                [attr.aria-invalid]="!!connErrors()['username']"
                [value]="cf.fields.username"
                (input)="patchConnection({ username: $any($event.target).value })"
              />
              @if (connErrors()['username']; as e) {
                <small class="ar-field__error">{{ e }}</small>
              }
            </label>
            <label class="ar-field" for="erp-pass">
              <span class="ar-field__label">Password</span>
              <input
                id="erp-pass"
                class="ar-field__input"
                type="password"
                autocomplete="new-password"
                [placeholder]="cf.id ? 'Saved; leave blank to keep' : ''"
                [class.ar-invalid]="!!connErrors()['password']"
                [attr.aria-invalid]="!!connErrors()['password']"
                [value]="cf.fields.password"
                (input)="patchConnection({ password: $any($event.target).value })"
              />
              @if (connErrors()['password']; as e) {
                <small class="ar-field__error">{{ e }}</small>
              }
            </label>
          }
          @if (connError(); as e) {
            <p class="erp__err" role="alert">{{ e }}</p>
          }
        </div>
        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="connection.set(null)">
            Cancel
          </button>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="saving()"
            (click)="saveConnection()"
          >
            {{ saving() ? 'Saving…' : 'Save and test' }}
          </button>
        </div>
      </ar-dialog>
    }

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
    .erp__top {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      justify-content: space-between;
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

  protected readonly connections = signal<ErpSyncConnectionStatusDto[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly running = signal<string | null>(null);

  protected readonly editing = signal<ErpSyncConnectionStatusDto | null>(null);
  protected readonly form = signal<ErpForm | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly tally = IntegrationKind.Tally;
  protected readonly sap = IntegrationKind.SapB1;
  /** The connection details being added or edited (gateway / Service Layer, database, user, password). */
  protected readonly connection = signal<{ id: string | null; fields: ErpConnectionFields } | null>(
    null,
  );
  protected readonly connErrors = signal<FieldErrors>({});
  protected readonly connError = signal<string | null>(null);

  constructor() {
    void this.load();
  }

  protected async openConnection(c: ErpSyncConnectionStatusDto | null): Promise<void> {
    this.connErrors.set({});
    this.connError.set(null);
    if (!c) {
      this.connection.set({
        id: null,
        fields: {
          kind: IntegrationKind.Tally,
          name: '',
          url: '',
          companyDb: '',
          username: '',
          password: '',
        },
      });
      return;
    }
    try {
      const config = await this.configOf(c.connectionId);
      const text = (key: string) =>
        typeof config[key] === 'string' ? (config[key] as string) : '';
      const kind = c.kind === IntegrationKind.Tally ? IntegrationKind.Tally : IntegrationKind.SapB1;
      this.connection.set({
        id: c.connectionId,
        fields: {
          kind,
          name: c.name ?? '',
          url: kind === IntegrationKind.Tally ? text('url') : text('serviceLayerUrl'),
          companyDb: text('companyDb'),
          username: text('username'),
          password: '',
        },
      });
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Could not load the connection.');
    }
  }

  protected patchConnection(change: Partial<ErpConnectionFields>): void {
    this.connection.update((c) => (c ? { ...c, fields: { ...c.fields, ...change } } : c));
  }

  protected async saveConnection(): Promise<void> {
    const c = this.connection();
    if (!c || this.saving()) return;
    const errors = erpConnectionErrors(c.fields, !c.id);
    this.connErrors.set(errors);
    if (hasErrors(errors)) return;

    this.saving.set(true);
    this.connError.set(null);
    try {
      const config = applyErpConnection(c.id ? await this.configOf(c.id) : {}, c.fields);
      const input = {
        kind: c.fields.kind,
        name: c.fields.name.trim(),
        configJson: JSON.stringify(config),
        // Tally has no password; for SAP a blank one on an edit keeps the stored password.
        credential:
          c.fields.kind === IntegrationKind.SapB1 && c.fields.password ? c.fields.password : null,
      };
      const saved = await firstValueFrom(
        c.id ? this.integrations.update(c.id, input) : this.integrations.create(input),
      );
      this.connection.set(null);
      if (saved.id) {
        const tested = await firstValueFrom(this.integrations.test(saved.id));
        if (tested.state === IntegrationState.Connected) {
          this.notice.set(`${input.name}: connected. Choose what to sync next.`);
          this.error.set(null);
        } else {
          this.error.set(
            `${input.name} was saved, but the test failed: ${tested.lastError || 'no answer'}`,
          );
        }
      }
      await this.load();
    } catch (e: unknown) {
      this.connError.set(e instanceof Error ? e.message : 'The connection could not be saved.');
    } finally {
      this.saving.set(false);
    }
  }

  private async load(): Promise<void> {
    try {
      this.connections.set((await firstValueFrom(this.erp.getStatus())).connections ?? []);
    } catch {
      this.error.set('Could not load Tally / SAP sync status.');
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
      this.notice.set(
        `${c.name}: ${describeRun(await firstValueFrom(this.erp.run(c.connectionId)))}`,
      );
      await this.load();
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
      this.editing.set(null);
    } catch (e: unknown) {
      this.formError.set(e instanceof Error ? e.message : 'The settings could not be saved.');
    } finally {
      this.saving.set(false);
    }
  }

  private async configOf(connectionId: string): Promise<Record<string, unknown>> {
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
