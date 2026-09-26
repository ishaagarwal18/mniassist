import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { grantedPolicy } from '../../core/auth/permission';
import { inr } from '../../core/util/format';
import { ArTopbar } from '../../layout/topbar';
import {
  CollectionBoardDto,
  CollectionInvoiceDto,
  CollectionService,
} from '../../proxy/integrations/collection.service';
import { TemplateService } from '../../proxy/messaging/template.service';
import { TemplateStatus } from '../../proxy/messaging/template-status.enum';
import { ArButton, ArChip, ArDialog } from '../../ui';
import type { ChipTone } from '../../ui/chip';

const day = 86_400_000;
const iso = (days: number) => new Date(Date.now() + days * day).toISOString();

/** Sample board for reviewing the screen without an API. */
const SEED: CollectionBoardDto = {
  outstandingInPaise: 9_84_500_00,
  overdueInPaise: 4_12_000_00,
  overdueCount: 3,
  collectedThisMonthInPaise: 2_75_000_00,
  notChaseableCount: 0,
  invoices: [
    {
      id: 'i1',
      number: 'SI/2026/1184',
      customerId: 'c1',
      customerName: 'Kalyani Forge',
      invoiceDateUtc: iso(-48),
      dueDateUtc: iso(-18),
      dueDateAssumed: false,
      daysOverdue: 18,
      totalInPaise: 2_36_000_00,
      outstandingInPaise: 2_36_000_00,
      remindersSent: 2,
      lastReminderAtUtc: iso(-3),
      paidByLink: false,
    },
    {
      id: 'i2',
      number: 'SI/2026/1201',
      customerId: 'c2',
      customerName: 'Precision Pumps',
      invoiceDateUtc: iso(-39),
      dueDateUtc: iso(-9),
      dueDateAssumed: true,
      daysOverdue: 9,
      totalInPaise: 1_18_000_00,
      outstandingInPaise: 1_18_000_00,
      remindersSent: 1,
      lastReminderAtUtc: iso(-2),
      paidByLink: false,
    },
    {
      id: 'i3',
      number: 'SI/2026/1233',
      customerId: 'c3',
      customerName: 'Godavari Cement',
      invoiceDateUtc: iso(-32),
      dueDateUtc: iso(-2),
      dueDateAssumed: false,
      daysOverdue: 2,
      totalInPaise: 58_000_00,
      outstandingInPaise: 58_000_00,
      remindersSent: 1,
      lastReminderAtUtc: iso(-5),
      paidByLink: false,
    },
    {
      id: 'i4',
      number: 'SI/2026/1260',
      customerId: 'c4',
      customerName: 'Shree Textiles',
      invoiceDateUtc: iso(-12),
      dueDateUtc: iso(18),
      dueDateAssumed: false,
      daysOverdue: 0,
      totalInPaise: 5_72_500_00,
      outstandingInPaise: 5_72_500_00,
      remindersSent: 0,
      lastReminderAtUtc: null,
      paidByLink: false,
    },
  ],
};

/**
 * Q4: unpaid ERP invoices, chased on WhatsApp. Reminders go out 3 days before the due date and at 7 and 15 days overdue with the
 * amount, the invoice number and (when BillDesk is connected) a pay link. They stop when the ERP sync reads the invoice back as paid.
 */
@Component({
  selector: 'ar-collections',
  imports: [ArTopbar, ArButton, ArChip, ArDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Collections"
      [subtitle]="subtitle()"
      help="Unpaid invoices from Tally or SAP. When switched on, the customer gets your approved reminder 3 days before the due date, then at 7 and 15 days overdue. Each stage goes once; reminders stop when the ERP shows the invoice paid."
    >
      @if (canManage) {
        <button
          ar-button
          type="button"
          variant="ghost"
          icon="send"
          [disabled]="busy() === 'run'"
          (click)="run()"
        >
          {{ busy() === 'run' ? 'Sending…' : 'Send due reminders now' }}
        </button>
        <button ar-button type="button" variant="ghost" icon="settings" (click)="openSettings()">
          Settings
        </button>
      }
    </ar-topbar>

    <div class="cl ar-scroll">
      @if (board(); as b) {
        <section class="kpis" aria-label="Collections summary">
          <div class="kpi">
            <span class="kpi__l">Outstanding</span
            ><b class="kpi__n">{{ money(b.outstandingInPaise) }}</b>
          </div>
          <div class="kpi" [class.kpi--bad]="b.overdueCount > 0">
            <span class="kpi__l">Overdue</span><b class="kpi__n">{{ money(b.overdueInPaise) }}</b
            ><span class="kpi__s"
              >{{ b.overdueCount }} invoice{{ b.overdueCount === 1 ? '' : 's' }}</span
            >
          </div>
          <div class="kpi kpi--good">
            <span class="kpi__l">Collected by pay link this month</span
            ><b class="kpi__n">{{ money(b.collectedThisMonthInPaise) }}</b>
          </div>
        </section>
        @if (b.notChaseableCount > 0) {
          <p class="cl__hint">
            {{ b.notChaseableCount }} invoice(s) from Tally have no per-invoice balance, so they are
            not chased. Tally reports balances per customer, not per bill.
          </p>
        }
      }

      @if (error(); as e) {
        <p class="cl__err" role="alert">{{ e }}</p>
      }
      @if (notice(); as n) {
        <p class="cl__ok" role="status">{{ n }}</p>
      }

      @if (loading()) {
        <p class="cl__hint">Loading…</p>
      } @else if (rows().length === 0) {
        <p class="cl__hint">
          No unpaid invoices. Invoices arrive from the ERP connection (Integrations → ERP) with
          their balances.
        </p>
      } @else {
        <div class="tbl-wrap">
          <table class="tbl">
            <thead>
              <tr>
                <th scope="col">Invoice</th>
                <th scope="col">Customer</th>
                <th scope="col">Due</th>
                <th scope="col" class="num">Outstanding</th>
                <th scope="col">Reminders</th>
                @if (canManage) {
                  <th scope="col"><span class="sr-only">Actions</span></th>
                }
              </tr>
            </thead>
            <tbody>
              @for (r of rows(); track r.id) {
                <tr>
                  <td class="ar-mono">{{ r.number }}</td>
                  <td>{{ r.customerName || '—' }}</td>
                  <td>
                    <ar-chip [tone]="tone(r)" [dot]="true">{{ dueLabel(r) }}</ar-chip>
                    @if (r.dueDateAssumed) {
                      <span
                        class="cl__assumed"
                        title="The ERP gave no due date: invoice date plus your credit days"
                        >est.</span
                      >
                    }
                  </td>
                  <td class="num">{{ money(r.outstandingInPaise) }}</td>
                  <td>
                    {{ r.remindersSent }}
                    @if (r.lastReminderAtUtc) {
                      <span class="cl__muted">· last {{ ago(r.lastReminderAtUtc) }}</span>
                    }
                  </td>
                  @if (canManage) {
                    <td class="act">
                      <button
                        ar-button
                        type="button"
                        variant="ghost"
                        [disabled]="busy() === r.id"
                        (click)="sendNow(r)"
                      >
                        {{ busy() === r.id ? 'Sending…' : 'Remind now' }}
                      </button>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    @if (settingsOpen()) {
      <ar-dialog title="Collection reminders" (dismiss)="settingsOpen.set(false)">
        <label class="cl__check" for="cl-on">
          <input
            id="cl-on"
            type="checkbox"
            [checked]="enabled()"
            (change)="enabled.set($any($event.target).checked)"
          />
          Send reminders automatically
        </label>
        <label class="ar-field" for="cl-tpl">
          <span class="ar-field__label">Approved WhatsApp template</span>
          <select
            id="cl-tpl"
            class="ar-field__input"
            [value]="templateId()"
            (change)="templateId.set($any($event.target).value)"
          >
            <option value="">Choose a template…</option>
            @for (t of templates(); track t.id) {
              <option [value]="t.id">{{ t.name }} ({{ t.lang }})</option>
            }
          </select>
        </label>
        <p class="cl__hint">
          Body values in order: customer name, invoice number, amount outstanding, due date. Add a
          URL button ending in a variable to carry the pay link.
        </p>
        <label class="ar-field" for="cl-days">
          <span class="ar-field__label"
            >Credit days
            <span class="ar-field__opt">(used when the ERP gives no due date)</span></span
          >
          <input
            id="cl-days"
            class="ar-field__input"
            inputmode="numeric"
            [value]="creditDays()"
            (input)="creditDays.set($any($event.target).value)"
          />
        </label>
        <label class="cl__check" for="cl-pay">
          <input
            id="cl-pay"
            type="checkbox"
            [checked]="payLink()"
            (change)="payLink.set($any($event.target).checked)"
          />
          Include a BillDesk pay link for the amount outstanding
        </label>
        @if (settingsError(); as e) {
          <p class="cl__err" role="alert">{{ e }}</p>
        }
        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="settingsOpen.set(false)">
            Cancel
          </button>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy() === 'settings'"
            (click)="saveSettings()"
          >
            {{ busy() === 'settings' ? 'Saving…' : 'Save' }}
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
    .cl {
      padding: 16px 20px 32px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .kpis {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
    }
    .kpi {
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .kpi__l {
      font: 500 11.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .kpi__n {
      font: 600 20px var(--ar-font-sans);
      color: var(--ar-ink-900);
      font-variant-numeric: tabular-nums;
    }
    .kpi__s {
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .kpi--bad .kpi__n {
      color: var(--ar-bad-600, #b42318);
    }
    .kpi--good .kpi__n {
      color: var(--ar-good-600, #067647);
    }
    .tbl-wrap {
      overflow-x: auto;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
    }
    .tbl {
      width: 100%;
      border-collapse: collapse;
      font: 400 13px var(--ar-font-sans);
    }
    .tbl th {
      text-align: left;
      font: 600 11.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 10px 12px;
      border-bottom: 1px solid var(--ar-line-200);
    }
    .tbl td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--ar-line-100, #eef0f2);
      color: var(--ar-ink-900);
    }
    .tbl tr:last-child td {
      border-bottom: 0;
    }
    .num {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .act {
      text-align: right;
    }
    .cl__muted {
      color: var(--ar-ink-500);
      font-size: 12px;
    }
    .cl__assumed {
      margin-left: 4px;
      font: 500 11px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .cl__hint {
      margin: 0;
      font: 400 12.5px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-500);
      max-width: 75ch;
    }
    .cl__err {
      margin: 0;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-bad-600, #b42318);
    }
    .cl__ok {
      margin: 0;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-good-600, #067647);
    }
    .cl__check {
      display: flex;
      gap: 8px;
      align-items: center;
      font: 500 13px var(--ar-font-sans);
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
    @media (max-width: 560px) {
      .cl {
        padding-inline: 12px;
      }
    }
  `,
})
export class ArCollections {
  private readonly api = inject(CollectionService);
  private readonly templatesApi = inject(TemplateService);
  protected readonly canManage = grantedPolicy(
    'AutoReach.Collections.Manage',
    inject(PermissionService),
  );

  protected readonly board = signal<CollectionBoardDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);

  protected readonly settingsOpen = signal(false);
  protected readonly enabled = signal(false);
  protected readonly templateId = signal('');
  protected readonly creditDays = signal('30');
  protected readonly payLink = signal(true);
  protected readonly templates = signal<{ id: string; name: string; lang: string }[]>([]);
  protected readonly settingsError = signal<string | null>(null);

  protected readonly rows = computed(() => this.board()?.invoices ?? []);
  protected readonly subtitle = computed(() => {
    const b = this.board();
    return b
      ? `${b.invoices.length} unpaid invoice${b.invoices.length === 1 ? '' : 's'}`
      : 'Unpaid ERP invoices';
  });

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.board.set(environment.useMockData ? SEED : await firstValueFrom(this.api.getBoard()));
    } catch (e: unknown) {
      this.error.set(this.problem(e, 'Could not load the collections board.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected money(paise: number): string {
    return inr(paise);
  }

  protected tone(r: CollectionInvoiceDto): ChipTone {
    return r.daysOverdue >= 15 ? 'bad' : r.daysOverdue > 0 ? 'warn' : 'neutral';
  }

  protected dueLabel(r: CollectionInvoiceDto): string {
    if (r.daysOverdue > 0) return `${r.daysOverdue}d overdue`;
    const days = Math.round((new Date(r.dueDateUtc).getTime() - Date.now()) / day);
    return days <= 0 ? 'due today' : `due in ${days}d`;
  }

  protected ago(isoDate: string): string {
    const days = Math.round((Date.now() - new Date(isoDate).getTime()) / day);
    return days <= 0 ? 'today' : `${days}d ago`;
  }

  protected async sendNow(r: CollectionInvoiceDto): Promise<void> {
    this.busy.set(r.id);
    this.error.set(null);
    this.notice.set(null);
    try {
      if (environment.useMockData) {
        this.notice.set(`Reminder for ${r.number} sent.`);
        return;
      }
      const result = await firstValueFrom(this.api.sendNow(r.id));
      if (result.sent) {
        this.notice.set(`Reminder for ${r.number} sent.`);
        await this.load();
      } else {
        this.error.set(`Not sent: ${result.note}`);
      }
    } catch (e: unknown) {
      this.error.set(this.problem(e, 'The reminder could not be sent.'));
    } finally {
      this.busy.set(null);
    }
  }

  protected async run(): Promise<void> {
    this.busy.set('run');
    this.error.set(null);
    try {
      const sent = environment.useMockData ? 0 : (await firstValueFrom(this.api.run())).sent;
      this.notice.set(
        sent
          ? `${sent} reminder${sent === 1 ? '' : 's'} sent.`
          : 'Nothing is due a reminder right now.',
      );
      await this.load();
    } catch (e: unknown) {
      this.error.set(this.problem(e, 'The reminders could not be sent.'));
    } finally {
      this.busy.set(null);
    }
  }

  protected async openSettings(): Promise<void> {
    this.settingsError.set(null);
    this.settingsOpen.set(true);
    if (environment.useMockData) return;
    try {
      const [s, list] = await Promise.all([
        firstValueFrom(this.api.getSettings()),
        firstValueFrom(
          this.templatesApi.getList({ status: TemplateStatus.Approved, maxResultCount: 200 }),
        ),
      ]);
      this.enabled.set(s.enabled);
      this.templateId.set(s.templateId ?? '');
      this.creditDays.set(String(s.creditDays));
      this.payLink.set(s.includePayLink);
      this.templates.set(
        (list.items ?? []).map((t) => ({
          id: t.id!,
          name: t.name ?? 'Template',
          lang: t.languageCode ?? '',
        })),
      );
    } catch (e: unknown) {
      this.settingsError.set(this.problem(e, 'Could not load the settings.'));
    }
  }

  protected async saveSettings(): Promise<void> {
    const days = Number(this.creditDays().trim());
    if (!Number.isInteger(days) || days < 0 || days > 365) {
      this.settingsError.set('Credit days must be a whole number from 0 to 365.');
      return;
    }
    if (this.enabled() && !this.templateId()) {
      this.settingsError.set('Choose an approved template before switching reminders on.');
      return;
    }
    this.busy.set('settings');
    this.settingsError.set(null);
    try {
      if (!environment.useMockData) {
        await firstValueFrom(
          this.api.updateSettings({
            enabled: this.enabled(),
            templateId: this.templateId() || null,
            creditDays: days,
            includePayLink: this.payLink(),
          }),
        );
      }
      this.settingsOpen.set(false);
      this.notice.set(
        this.enabled()
          ? 'Reminders are on. The next pass runs within 6 hours.'
          : 'Settings saved. Reminders are off.',
      );
    } catch (e: unknown) {
      this.settingsError.set(this.problem(e, 'The settings could not be saved.'));
    } finally {
      this.busy.set(null);
    }
  }

  private problem(e: unknown, fallback: string): string {
    return (e as { error?: { error?: { message?: string } } })?.error?.error?.message ?? fallback;
  }
}
