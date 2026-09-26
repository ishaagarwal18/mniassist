import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { grantedPolicy } from '../../core/auth/permission';
import { inr } from '../../core/util/format';
import { ArTopbar } from '../../layout/topbar';
import {
  ConsumableRuleDto,
  SaveConsumableRuleInput,
  SpareReorderDto,
  SparesService,
} from '../../proxy/pipeline/spares.service';
import { ArButton, ArChip, ArDialog } from '../../ui';
import type { ChipTone } from '../../ui/chip';

const day = 86_400_000;
const iso = (days: number) => new Date(Date.now() + days * day).toISOString();

const SEED_DUE: SpareReorderDto[] = [
  {
    id: 'r1',
    assetId: 'a1',
    machine: 'Atlas Copco GA 37',
    serialNumber: 'API-44120',
    site: 'Plant 2, Nashik',
    contactId: 'c1',
    contactName: 'Kalyani Forge',
    partNumber: 'AF-2901',
    description: 'Air filter element',
    quantity: 2,
    dueOn: iso(-6),
    daysToDue: -6,
    state: 'Due',
  },
  {
    id: 'r2',
    assetId: 'a1',
    machine: 'Atlas Copco GA 37',
    serialNumber: 'API-44120',
    site: 'Plant 2, Nashik',
    contactId: 'c1',
    contactName: 'Kalyani Forge',
    partNumber: 'OF-1613',
    description: 'Oil filter',
    quantity: 1,
    dueOn: iso(4),
    daysToDue: 4,
    state: 'Due',
  },
  {
    id: 'r3',
    assetId: 'a2',
    machine: 'ABB ACS580',
    serialNumber: 'VP-2291',
    site: 'Chakan',
    contactId: 'c2',
    contactName: 'Precision Pumps',
    partNumber: 'FAN-KIT-R3',
    description: 'Cooling fan kit',
    quantity: 1,
    dueOn: iso(21),
    daysToDue: 21,
    state: 'Quoted',
    quotationId: 'q1',
  },
];
const SEED_RULES: ConsumableRuleDto[] = [
  {
    id: 'u1',
    assetLabel: 'Atlas Copco GA 37',
    partNumber: 'AF-2901',
    description: 'Air filter element',
    quantityPerMachine: 2,
    intervalDays: 120,
    leadDays: 14,
    isActive: true,
    machineCount: 6,
  },
  {
    id: 'u2',
    assetLabel: 'ABB ACS580',
    partNumber: 'FAN-KIT-R3',
    description: 'Cooling fan kit',
    quantityPerMachine: 1,
    intervalDays: 1095,
    leadDays: 45,
    isActive: true,
    machineCount: 14,
  },
];

const EMPTY_RULE: SaveConsumableRuleInput = {
  assetLabel: '',
  partNumber: '',
  description: '',
  quantityPerMachine: 1,
  intervalDays: 365,
  leadDays: 30,
  isActive: true,
};

/**
 * M4: spares and consumables coming due on customers' machines. Rules say what each machine model uses up and how often; a daily
 * scan puts each due part here, and one click quotes a customer's due parts together, priced from their price list.
 */
@Component({
  selector: 'ar-spares',
  imports: [ArTopbar, ArButton, ArChip, ArDialog, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Spares due"
      [subtitle]="subtitle()"
      help="Filters, fan kits, oils: the parts each machine model wears out, and when. A daily check matches every machine on the installed base to these rules; a part shows here once it's within its lead time. Quote a customer's due parts in one go, or record that the part was changed to restart its clock."
    >
      @if (canManage) {
        <button
          ar-button
          type="button"
          variant="ghost"
          icon="refresh"
          [disabled]="busy() === 'scan'"
          (click)="scan()"
        >
          {{ busy() === 'scan' ? 'Checking…' : 'Check now' }}
        </button>
        <button
          ar-button
          type="button"
          variant="ghost"
          icon="settings"
          (click)="rulesOpen.set(true)"
        >
          Rules ({{ rules().length }})
        </button>
      }
    </ar-topbar>

    <div class="sp ar-scroll">
      @if (error(); as e) {
        <p class="sp__err" role="alert">{{ e }}</p>
      }
      @if (notice(); as n) {
        <p class="sp__ok" role="status">
          {{ n }}
          @if (quotedRef()) {
            <a routerLink="/quotations">Open Quotations →</a>
          }
        </p>
      }

      @if (loading()) {
        <p class="sp__hint">Loading…</p>
      } @else if (groups().length === 0) {
        <p class="sp__hint">
          Nothing is due.
          @if (rules().length === 0) {
            Add a rule (for example: every Atlas Copco GA 37 needs 2 × AF-2901 air filters every 120
            days) and the machines on your installed base are checked against it every day.
          }
        </p>
      } @else {
        @for (g of groups(); track g.contactId) {
          <section class="grp" [attr.aria-label]="g.name">
            <header class="grp__h">
              <b>{{ g.name }}</b>
              <span class="grp__n"
                >{{ g.rows.length }} part{{ g.rows.length === 1 ? '' : 's' }}</span
              >
              @if (canQuote && dueIds(g.rows).length > 0) {
                <button
                  ar-button
                  type="button"
                  variant="primary"
                  [disabled]="busy() === g.contactId"
                  (click)="quote(g.contactId, g.rows)"
                >
                  {{
                    busy() === g.contactId
                      ? 'Quoting…'
                      : 'Quote ' +
                        dueIds(g.rows).length +
                        ' due part' +
                        (dueIds(g.rows).length === 1 ? '' : 's')
                  }}
                </button>
              }
            </header>
            <ul class="rows">
              @for (r of g.rows; track r.id) {
                <li class="row">
                  <div class="row__main">
                    <b>{{ r.description }}</b> <span class="ar-mono">{{ r.partNumber }}</span> ×
                    {{ r.quantity }}
                    <span class="row__meta">
                      {{ r.machine }}
                      @if (r.serialNumber) {
                        · <span class="ar-mono">{{ r.serialNumber }}</span>
                      }
                      @if (r.site) {
                        · {{ r.site }}
                      }
                    </span>
                  </div>
                  <ar-chip [tone]="tone(r)" [dot]="true">{{ dueLabel(r) }}</ar-chip>
                  @if (r.state === 'Quoted') {
                    <a class="row__link" routerLink="/quotations">Quoted →</a>
                  }
                  @if (canManage) {
                    <button
                      ar-button
                      type="button"
                      variant="ghost"
                      [disabled]="busy() === r.id"
                      (click)="replaced(r)"
                    >
                      Changed today
                    </button>
                    @if (r.state === 'Due') {
                      <button
                        ar-button
                        type="button"
                        variant="ghost"
                        [disabled]="busy() === r.id"
                        (click)="dismiss(r)"
                      >
                        Dismiss
                      </button>
                    }
                  }
                </li>
              }
            </ul>
          </section>
        }
      }
    </div>

    @if (rulesOpen()) {
      <ar-dialog title="Spare part rules" (dismiss)="rulesOpen.set(false)">
        <ul class="rules">
          @for (u of rules(); track u.id) {
            <li>
              <span>
                <b>{{ u.assetLabel }}</b
                >: {{ u.quantityPerMachine }} × {{ u.description }} (<span class="ar-mono">{{
                  u.partNumber
                }}</span
                >) every {{ u.intervalDays }} days, shown {{ u.leadDays }} days ahead
                <small
                  >{{ u.machineCount }} machine{{ u.machineCount === 1 ? '' : 's' }} match{{
                    u.isActive ? '' : ' · paused'
                  }}</small
                >
              </span>
              <button
                type="button"
                class="rules__x"
                [attr.aria-label]="'Delete rule for ' + u.assetLabel"
                (click)="deleteRule(u)"
              >
                ×
              </button>
            </li>
          } @empty {
            <li>No rules yet.</li>
          }
        </ul>
        <fieldset class="rule-form">
          <legend>Add a rule</legend>
          <label class="ar-field" for="sp-asset">
            <span class="ar-field__label">Machine (make and model, or its part number)</span>
            <input
              id="sp-asset"
              class="ar-field__input"
              placeholder="Atlas Copco GA 37"
              [value]="draft().assetLabel"
              (input)="set('assetLabel', $any($event.target).value)"
            />
          </label>
          <div class="rule-form__row">
            <label class="ar-field" for="sp-part">
              <span class="ar-field__label">Spare part number</span>
              <input
                id="sp-part"
                class="ar-field__input ar-mono"
                placeholder="AF-2901"
                [value]="draft().partNumber"
                (input)="set('partNumber', $any($event.target).value)"
              />
            </label>
            <label class="ar-field" for="sp-desc">
              <span class="ar-field__label"
                >Description <span class="ar-field__opt">(optional)</span></span
              >
              <input
                id="sp-desc"
                class="ar-field__input"
                placeholder="Air filter element"
                [value]="draft().description"
                (input)="set('description', $any($event.target).value)"
              />
            </label>
          </div>
          <div class="rule-form__row">
            <label class="ar-field" for="sp-qty">
              <span class="ar-field__label">Per machine</span>
              <input
                id="sp-qty"
                class="ar-field__input"
                inputmode="decimal"
                [value]="draft().quantityPerMachine"
                (input)="set('quantityPerMachine', $any($event.target).value)"
              />
            </label>
            <label class="ar-field" for="sp-int">
              <span class="ar-field__label">Every (days)</span>
              <input
                id="sp-int"
                class="ar-field__input"
                inputmode="numeric"
                [value]="draft().intervalDays"
                (input)="set('intervalDays', $any($event.target).value)"
              />
            </label>
            <label class="ar-field" for="sp-lead">
              <span class="ar-field__label">Show ahead (days)</span>
              <input
                id="sp-lead"
                class="ar-field__input"
                inputmode="numeric"
                [value]="draft().leadDays"
                (input)="set('leadDays', $any($event.target).value)"
              />
            </label>
          </div>
        </fieldset>
        @if (ruleError(); as e) {
          <p class="sp__err" role="alert">{{ e }}</p>
        }
        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="rulesOpen.set(false)">
            Close
          </button>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy() === 'rule'"
            (click)="addRule()"
          >
            {{ busy() === 'rule' ? 'Adding…' : 'Add rule' }}
          </button>
        </div>
      </ar-dialog>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
    }
    .sp {
      padding: 16px 20px 32px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .grp {
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .grp__h {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
      font: 500 13.5px var(--ar-font-sans);
    }
    .grp__n {
      color: var(--ar-ink-500);
      font-size: 12.5px;
      flex: 1;
    }
    .rows {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
    }
    .row {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
      padding: 8px 0;
      border-top: 1px solid var(--ar-line-100, #eef0f2);
      font: 400 13px var(--ar-font-sans);
    }
    .row__main {
      flex: 1 1 280px;
      min-width: 0;
    }
    .row__meta {
      display: block;
      color: var(--ar-ink-500);
      font-size: 12px;
    }
    .row__link {
      font: 600 12.5px var(--ar-font-sans);
      color: var(--ar-teal-700, #0f766e);
    }
    .rules {
      list-style: none;
      margin: 0 0 12px;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font: 400 13px/1.45 var(--ar-font-sans);
    }
    .rules li {
      display: flex;
      gap: 8px;
      justify-content: space-between;
      align-items: flex-start;
    }
    .rules small {
      display: block;
      color: var(--ar-ink-500);
    }
    .rules__x {
      border: 0;
      background: none;
      font-size: 16px;
      cursor: pointer;
      color: var(--ar-ink-500);
    }
    .rule-form {
      border: 1px solid var(--ar-line-200);
      border-radius: 8px;
      padding: 10px 12px;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .rule-form legend {
      font: 600 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
      padding: 0 4px;
    }
    .rule-form__row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 8px;
    }
    .sp__hint {
      margin: 0;
      font: 400 13px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-500);
      max-width: 75ch;
    }
    .sp__err {
      margin: 0;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-bad-600, #b42318);
    }
    .sp__ok {
      margin: 0;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-good-600, #067647);
    }
    .sp__ok a {
      margin-left: 6px;
      color: var(--ar-teal-700, #0f766e);
    }
    @media (max-width: 560px) {
      .sp {
        padding-inline: 12px;
      }
    }
  `,
})
export class ArSpares {
  private readonly api = inject(SparesService);
  private readonly permissions = inject(PermissionService);
  protected readonly canManage = grantedPolicy('AutoReach.InstalledBase.Update', this.permissions);
  protected readonly canQuote = grantedPolicy('AutoReach.Quotations.Create', this.permissions);

  protected readonly due = signal<SpareReorderDto[]>([]);
  protected readonly rules = signal<ConsumableRuleDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly quotedRef = signal<string | null>(null);

  protected readonly rulesOpen = signal(false);
  protected readonly draft = signal<SaveConsumableRuleInput>({ ...EMPTY_RULE });
  protected readonly ruleError = signal<string | null>(null);

  protected readonly groups = computed(() => {
    const map = new Map<string, { contactId: string; name: string; rows: SpareReorderDto[] }>();
    for (const r of this.due()) {
      const g = map.get(r.contactId) ?? {
        contactId: r.contactId,
        name: r.contactName || 'Unknown customer',
        rows: [],
      };
      g.rows.push(r);
      map.set(r.contactId, g);
    }
    return [...map.values()].sort(
      (a, b) =>
        Math.min(...a.rows.map((r) => r.daysToDue)) - Math.min(...b.rows.map((r) => r.daysToDue)),
    );
  });

  protected readonly subtitle = computed(() => {
    const n = this.due().filter((r) => r.state === 'Due').length;
    return `${n} part${n === 1 ? '' : 's'} due across ${this.groups().length} customer${this.groups().length === 1 ? '' : 's'}`;
  });

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      if (environment.useMockData) {
        this.due.set(SEED_DUE);
        this.rules.set(SEED_RULES);
        return;
      }
      const [due, rules] = await Promise.all([
        firstValueFrom(this.api.getDue()),
        firstValueFrom(this.api.getRules()),
      ]);
      this.due.set(due);
      this.rules.set(rules);
    } catch (e: unknown) {
      this.error.set(this.problem(e, 'Could not load spares.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected dueIds(rows: SpareReorderDto[]): string[] {
    return rows.filter((r) => r.state === 'Due').map((r) => r.id);
  }

  protected tone(r: SpareReorderDto): ChipTone {
    return r.state === 'Quoted'
      ? 'teal'
      : r.daysToDue < 0
        ? 'bad'
        : r.daysToDue <= 7
          ? 'warn'
          : 'neutral';
  }

  protected dueLabel(r: SpareReorderDto): string {
    if (r.daysToDue < 0) return `overdue ${-r.daysToDue}d`;
    if (r.daysToDue === 0) return 'due today';
    return `due in ${r.daysToDue}d`;
  }

  protected set<K extends keyof SaveConsumableRuleInput>(key: K, value: string): void {
    this.draft.update((d) => ({ ...d, [key]: value }));
  }

  protected async scan(): Promise<void> {
    await this.act('scan', async () => {
      const n = environment.useMockData ? 0 : await firstValueFrom(this.api.scan());
      this.notice.set(n ? `${n} part${n === 1 ? '' : 's'} newly due.` : 'Nothing new is due.');
      await this.load();
    });
  }

  protected async quote(contactId: string, rows: SpareReorderDto[]): Promise<void> {
    await this.act(contactId, async () => {
      const ids = this.dueIds(rows);
      if (environment.useMockData) {
        this.due.update((list) =>
          list.map((r) => (ids.includes(r.id) ? { ...r, state: 'Quoted' as const } : r)),
        );
        this.quotedRef.set('QT-DRAFT');
        this.notice.set('Draft QT-DRAFT created.');
        return;
      }
      const result = await firstValueFrom(this.api.quote(ids));
      this.quotedRef.set(result.reference);
      this.notice.set(
        `Draft ${result.reference} created for ${inr(result.subtotalInPaise)}` +
          (result.unpriced ? `; ${result.unpriced} line(s) need a price.` : '.'),
      );
      await this.load();
    });
  }

  protected async replaced(r: SpareReorderDto): Promise<void> {
    await this.act(r.id, async () => {
      if (!environment.useMockData) {
        await firstValueFrom(this.api.markReplaced(r.id, new Date().toISOString().slice(0, 10)));
      }
      this.due.update((list) => list.filter((x) => x.id !== r.id));
      this.notice.set(
        `${r.description} recorded as changed. The next one falls due in the rule's interval.`,
      );
    });
  }

  protected async dismiss(r: SpareReorderDto): Promise<void> {
    await this.act(r.id, async () => {
      if (!environment.useMockData) await firstValueFrom(this.api.dismiss(r.id));
      this.due.update((list) => list.filter((x) => x.id !== r.id));
    });
  }

  protected async addRule(): Promise<void> {
    const d = this.draft();
    const input: SaveConsumableRuleInput = {
      ...d,
      assetLabel: d.assetLabel.trim(),
      partNumber: d.partNumber.trim(),
      description: d.description?.trim() || null,
      quantityPerMachine: Number(d.quantityPerMachine),
      intervalDays: Number(d.intervalDays),
      leadDays: Number(d.leadDays),
    };
    if (!input.assetLabel || !input.partNumber) {
      this.ruleError.set('Enter the machine and the spare part number.');
      return;
    }
    if (
      !(input.quantityPerMachine > 0) ||
      !Number.isInteger(input.intervalDays) ||
      input.intervalDays < 1 ||
      !Number.isInteger(input.leadDays) ||
      input.leadDays < 0 ||
      input.leadDays >= input.intervalDays
    ) {
      this.ruleError.set(
        'Use a quantity above 0, an interval in whole days, and a lead time shorter than the interval.',
      );
      return;
    }
    this.busy.set('rule');
    this.ruleError.set(null);
    try {
      const created = environment.useMockData
        ? ({
            ...input,
            id: crypto.randomUUID(),
            description: input.description ?? input.partNumber,
            machineCount: 0,
          } as ConsumableRuleDto)
        : await firstValueFrom(this.api.createRule(input));
      this.rules.update((list) => [...list, created]);
      this.draft.set({ ...EMPTY_RULE });
    } catch (e: unknown) {
      this.ruleError.set(this.problem(e, 'The rule could not be added.'));
    } finally {
      this.busy.set(null);
    }
  }

  protected async deleteRule(u: ConsumableRuleDto): Promise<void> {
    if (
      !window.confirm(
        `Delete the rule for ${u.assetLabel} (${u.partNumber})? Parts it put on this board are dismissed.`,
      )
    )
      return;
    try {
      if (!environment.useMockData) await firstValueFrom(this.api.deleteRule(u.id));
      this.rules.update((list) => list.filter((x) => x.id !== u.id));
      await this.load();
    } catch (e: unknown) {
      this.ruleError.set(this.problem(e, 'The rule could not be deleted.'));
    }
  }

  private async act(key: string, work: () => Promise<void>): Promise<void> {
    this.busy.set(key);
    this.error.set(null);
    this.notice.set(null);
    this.quotedRef.set(null);
    try {
      await work();
    } catch (e: unknown) {
      this.error.set(this.problem(e, 'That did not work. Try again.'));
    } finally {
      this.busy.set(null);
    }
  }

  private problem(e: unknown, fallback: string): string {
    return (e as { error?: { error?: { message?: string } } })?.error?.error?.message ?? fallback;
  }
}
