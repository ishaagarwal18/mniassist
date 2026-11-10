import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { grantedPolicy } from '../../core/auth/permission';
import { inr } from '../../core/util/format';
import { ArTopbar } from '../../layout/topbar';
import {
  CollectionBoardDto,
  CollectionInvoiceDto,
  CollectionService,
} from '../../proxy/integrations/collection.service';
import { ArButton, ArChip } from '../../ui';
import { ArGrid } from '../../ui/grid';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import type { ChipTone } from '../../ui/chip';

const day = 86_400_000;

/**
 * Q4: unpaid ERP invoices, chased on WhatsApp. Reminders go out 3 days before the due date and at 7 and 15 days overdue with the
 * amount, the invoice number and (when BillDesk is connected) a pay link. They stop when the ERP sync reads the invoice back as paid.
 */
@Component({
  selector: 'ar-collections',
  imports: [ArTopbar, ArButton, ArChip, RouterLink, ArGrid, GridModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Collections"
      [subtitle]="subtitle()"
      help="Unpaid invoices from Tally or SAP. When switched on, the customer gets your approved reminder 3 days before the due date, then at 7 and 15 days overdue. Each stage goes once; reminders stop when the ERP shows the invoice paid."
    >
      @if (canManage()) {
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
        <a ar-button variant="ghost" icon="settings" routerLink="/collections/settings">
          Settings
        </a>
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
        <ejs-grid arGrid="collections" [dataSource]="rows()" aria-label="Unpaid invoices">
          <e-columns>
            <e-column field="number" headerText="Invoice" width="160">
              <ng-template #template let-r>
                <span class="ar-mono">{{ r.number }}</span>
              </ng-template>
            </e-column>
            <e-column field="customerName" headerText="Customer" width="220">
              <ng-template #template let-r>
                {{ r.customerName || '—' }}
              </ng-template>
            </e-column>
            <e-column headerText="Due" width="160">
              <ng-template #template let-r>
                <ar-chip [tone]="tone(r)" [dot]="true">{{ dueLabel(r) }}</ar-chip>
                @if (r.dueDateAssumed) {
                  <span
                    class="cl__assumed"
                    title="The ERP gave no due date: invoice date plus your credit days"
                    >est.</span
                  >
                }
              </ng-template>
            </e-column>
            <e-column
              field="outstandingInPaise"
              headerText="Outstanding"
              textAlign="Right"
              width="140"
            >
              <ng-template #template let-r>
                {{ money(r.outstandingInPaise) }}
              </ng-template>
            </e-column>
            <e-column headerText="Reminders" width="180">
              <ng-template #template let-r>
                {{ r.remindersSent }}
                @if (r.lastReminderAtUtc) {
                  <span class="cl__muted">· last {{ ago(r.lastReminderAtUtc) }}</span>
                }
              </ng-template>
            </e-column>
            @if (canManage()) {
              <e-column headerText="Actions" width="150">
                <ng-template #template let-r>
                  <button
                    ar-button
                    type="button"
                    variant="ghost"
                    [disabled]="busy() === r.id"
                    (click)="sendNow(r)"
                  >
                    {{ busy() === r.id ? 'Sending…' : 'Remind now' }}
                  </button>
                </ng-template>
              </e-column>
            }
          </e-columns>
        </ejs-grid>
      }
    </div>
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
  protected readonly canManage = grantedPolicy(
    'AutoReach.Collections.Manage',
    inject(PermissionService),
  );

  protected readonly board = signal<CollectionBoardDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);

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
      this.board.set(await firstValueFrom(this.api.getBoard()));
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
      const sent = (await firstValueFrom(this.api.run())).sent;
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

  private problem(e: unknown, fallback: string): string {
    return (e as { error?: { error?: { message?: string } } })?.error?.error?.message ?? fallback;
  }
}
