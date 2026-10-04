import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { grantedPolicy } from '../../core/auth/permission';
import { inr } from '../../core/util/format';
import { ArTopbar } from '../../layout/topbar';
import {
  AmcRenewalDto,
  AmcRenewalService,
  RenewalStatus,
  RenewalSummaryDto,
} from '../../proxy/pipeline/amc-renewal.service';
import { SalesPipelineDto, SalesPipelineService } from '../../proxy/pipeline';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { ArSelect } from '../../ui/select';
import {
  RENEWAL_STATUS_LABEL,
  daysLeft,
  groupByStatus,
  renewalTone,
  upliftBasisPoints,
  upliftPercent,
} from './renewal-logic';

const day = 86_400_000;
const iso = (days: number) => new Date(Date.now() + days * day).toISOString();

/** Sample rows for reviewing the screen without an API. */
const SEED: AmcRenewalDto[] = [
  {
    id: 's1',
    installedAssetId: 'a1',
    assetDescription: 'ACS580 drive, Line 2',
    serialNumber: 'VP-2291',
    siteName: 'Plant 2, Nashik',
    contactId: 'c1',
    contactName: 'Kalyani Forge',
    currentEndsOn: iso(9),
    proposedEndsOn: iso(374),
    valueInPaise: 42_000_00,
    status: RenewalStatus.Contacted,
    lastContactedAtUtc: iso(-21),
  },
  {
    id: 's2',
    installedAssetId: 'a2',
    assetDescription: 'S7-1200 control panel',
    serialNumber: 'PNL-118',
    siteName: 'Chakan',
    contactId: 'c2',
    contactName: 'Precision Pumps',
    currentEndsOn: iso(24),
    proposedEndsOn: iso(389),
    valueInPaise: 28_500_00,
    status: RenewalStatus.Interested,
    interestedAtUtc: iso(-1),
    callRequestedAtUtc: iso(-1),
  },
  {
    id: 's3',
    installedAssetId: 'a3',
    assetDescription: 'Screw compressor 37 kW',
    serialNumber: 'SC-4410',
    siteName: 'Ambad MIDC',
    contactId: 'c3',
    contactName: 'Godavari Cement',
    currentEndsOn: iso(33),
    proposedEndsOn: iso(398),
    valueInPaise: 65_000_00,
    status: RenewalStatus.Quoted,
    quotationId: 'q1',
    quotationReference: 'QT-2041',
    enquiryReference: 'ENQ-3310',
  },
  {
    id: 's4',
    installedAssetId: 'a4',
    assetDescription: 'UPS 20 kVA',
    serialNumber: 'UPS-771',
    siteName: 'Sinnar',
    contactId: 'c4',
    contactName: 'Shree Textiles',
    currentEndsOn: iso(71),
    proposedEndsOn: iso(436),
    valueInPaise: 18_000_00,
    status: RenewalStatus.Due,
  },
];

const SEED_SUMMARY: RenewalSummaryDto = {
  dueIn30Count: 2,
  dueIn30InPaise: 70_500_00,
  dueIn60Count: 3,
  dueIn60InPaise: 1_35_500_00,
  dueIn90Count: 4,
  dueIn90InPaise: 1_53_500_00,
  atRiskCount: 1,
  atRiskInPaise: 42_000_00,
  renewedThisQuarterCount: 11,
  renewedThisQuarterInPaise: 4_62_000_00,
  renewalRatePercent: 78,
};

/**
 * The AMC Renewal Desk. Every AMC ending in the next 90 days, from the first reminder to the renewed contract. A customer's tap on
 * a reminder's "Send quotation" drafts the renewal quote here; a person reviews and issues it from Quotations.
 */
@Component({
  selector: 'ar-renewals',
  imports: [ArTopbar, ArButton, ArChip, ArDialog, RouterLink, ArSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="AMC renewals"
      [subtitle]="subtitle()"
      help="Every AMC ending in the next 90 days. Reminders go out 30 and 7 days before; when a customer taps “Send quotation”, a renewal quote is drafted from last term's value plus your uplift, ready for you to review and issue."
    >
      @if (canManage) {
        <button
          ar-button
          type="button"
          variant="ghost"
          icon="refresh"
          [disabled]="busy() === 'refresh'"
          (click)="refresh()"
        >
          {{ busy() === 'refresh' ? 'Refreshing…' : 'Refresh' }}
        </button>
      }
      @if (canSettings) {
        <button ar-button type="button" variant="ghost" icon="settings" (click)="openSettings()">
          Settings
        </button>
      }
    </ar-topbar>

    <div class="rn ar-scroll">
      @if (summary(); as s) {
        <section class="rn__kpis" aria-label="Renewal summary">
          <div class="kpi">
            <span class="kpi__l">Due in 30 days</span
            ><b class="kpi__n">{{ money(s.dueIn30InPaise) }}</b
            ><span class="kpi__s"
              >{{ s.dueIn30Count }} contract{{ s.dueIn30Count === 1 ? '' : 's' }}</span
            >
          </div>
          <div class="kpi">
            <span class="kpi__l">Due in 90 days</span
            ><b class="kpi__n">{{ money(s.dueIn90InPaise) }}</b
            ><span class="kpi__s"
              >{{ s.dueIn90Count }} contract{{ s.dueIn90Count === 1 ? '' : 's' }}</span
            >
          </div>
          <div class="kpi" [class.kpi--bad]="s.atRiskCount > 0">
            <span class="kpi__l">At risk · 15 days, no quote</span
            ><b class="kpi__n">{{ money(s.atRiskInPaise) }}</b
            ><span class="kpi__s"
              >{{ s.atRiskCount }} contract{{ s.atRiskCount === 1 ? '' : 's' }}</span
            >
          </div>
          <div class="kpi kpi--good">
            <span class="kpi__l">Renewed this quarter</span
            ><b class="kpi__n">{{ money(s.renewedThisQuarterInPaise) }}</b
            ><span class="kpi__s"
              >{{ s.renewedThisQuarterCount }} renewed · rate
              {{ s.renewalRatePercent != null ? s.renewalRatePercent + '%' : '—' }}</span
            >
          </div>
        </section>
      }

      <div class="rn__tools">
        <div class="seg" role="group" aria-label="Ending within">
          @for (w of windows; track w.days) {
            <button
              type="button"
              [attr.aria-pressed]="window() === w.days"
              (click)="setWindow(w.days)"
            >
              {{ w.label }}
            </button>
          }
        </div>
        <label class="rn__search" for="rn-search">
          <span class="sr-only">Search renewals</span>
          <input
            id="rn-search"
            class="ar-field__input"
            placeholder="Search machine, serial, site or customer"
            [value]="query()"
            (input)="query.set($any($event.target).value)"
          />
        </label>
      </div>

      @if (error(); as e) {
        <p class="rn__err" role="alert">{{ e }}</p>
      }
      @if (notice(); as n) {
        <p class="rn__ok" role="status">{{ n }}</p>
      }

      @if (loading()) {
        <p class="rn__empty">Loading…</p>
      } @else if (visible().length === 0) {
        <p class="rn__empty">
          No AMC ends in this window. Renewals appear here once an installed-base machine has an AMC
          end date within 90 days — add AMC dates and values on
          <a routerLink="/installed-base">Installed base</a>.
        </p>
      } @else {
        <div class="board">
          @for (col of columns(); track col.status) {
            <section class="col" [attr.aria-label]="label(col.status)">
              <header class="col__h">
                <span>{{ label(col.status) }}</span
                ><span class="col__n">{{ col.rows.length }}</span>
              </header>
              @for (r of col.rows; track r.id) {
                <article class="card">
                  <div class="card__top">
                    <b class="card__asset">{{ r.assetDescription }}</b>
                    <ar-chip [tone]="tone(r)" [dot]="true">{{ endsLabel(r) }}</ar-chip>
                  </div>
                  <p class="card__meta">
                    {{ r.contactName || 'Unknown customer' }}
                    @if (r.siteName) {
                      · {{ r.siteName }}
                    }
                    @if (r.serialNumber) {
                      · <span class="ar-mono">{{ r.serialNumber }}</span>
                    }
                  </p>
                  <p class="card__val">
                    {{
                      r.valueInPaise != null
                        ? money(r.valueInPaise) + ' last term'
                        : 'No AMC value on file'
                    }}
                  </p>
                  @if (r.callRequestedAtUtc) {
                    <p class="card__flag">Asked for a call {{ ago(r.callRequestedAtUtc) }}</p>
                  } @else if (r.interestedAtUtc && !r.quotationId) {
                    <p class="card__flag">Asked for a quote {{ ago(r.interestedAtUtc) }}</p>
                  }
                  @if (r.quotationReference) {
                    <p class="card__meta">
                      Quote
                      <a routerLink="/quotations" class="ar-mono">{{ r.quotationReference }}</a>
                      @if (r.enquiryReference) {
                        · enquiry <span class="ar-mono">{{ r.enquiryReference }}</span>
                      }
                    </p>
                  }
                  @if (canManage) {
                    <div class="card__actions">
                      @if (!r.quotationId) {
                        <button
                          ar-button
                          type="button"
                          variant="primary"
                          [disabled]="busy() === r.id"
                          (click)="draft(r)"
                        >
                          {{ busy() === r.id ? 'Drafting…' : 'Draft renewal quote' }}
                        </button>
                      } @else {
                        <a class="card__link" routerLink="/quotations">Open quotation →</a>
                      }
                      <button ar-button type="button" variant="ghost" (click)="openLost(r)">
                        Mark lost
                      </button>
                    </div>
                  }
                </article>
              } @empty {
                <p class="col__empty">None</p>
              }
            </section>
          }
        </div>
      }
    </div>

    @if (losing(); as r) {
      <ar-dialog [title]="'Mark lost: ' + r.assetDescription" (dismiss)="losing.set(null)">
        <label class="ar-field" for="rn-reason">
          <span class="ar-field__label">Reason <span class="ar-field__opt">(optional)</span></span>
          <input
            id="rn-reason"
            class="ar-field__input"
            placeholder="e.g. moved to the OEM's own contract"
            [value]="reason()"
            (input)="reason.set($any($event.target).value)"
          />
        </label>
        <p class="rn__hint">
          The renewal leaves the board and counts against the renewal rate. Reminders for this term
          stop only when the AMC date passes.
        </p>
        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="losing.set(null)">Cancel</button>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy() === r.id"
            (click)="markLost(r)"
          >
            Mark lost
          </button>
        </div>
      </ar-dialog>
    }

    @if (settingsOpen()) {
      <ar-dialog title="Renewal settings" (dismiss)="settingsOpen.set(false)">
        <label class="ar-field" for="rn-uplift">
          <span class="ar-field__label">Yearly uplift (%)</span>
          <input
            id="rn-uplift"
            class="ar-field__input"
            inputmode="decimal"
            [value]="uplift()"
            (input)="uplift.set($any($event.target).value)"
          />
        </label>
        <label class="ar-field" for="rn-item">
          <span class="ar-field__label"
            >AMC item code
            <span class="ar-field__opt">(what Tally / SAP calls the service)</span></span
          >
          <input
            id="rn-item"
            class="ar-field__input ar-mono"
            [value]="itemCode()"
            (input)="itemCode.set($any($event.target).value)"
          />
        </label>
        <label class="ar-field" for="rn-pipeline">
          <span class="ar-field__label">Pipeline for renewal enquiries</span>
          <select
            id="rn-pipeline"
            class="ar-field__input"
            [value]="pipelineId()"
            (change)="pipelineId.set($any($event.target).value)"
          >
            <option value="">Default pipeline</option>
            @for (p of pipelines(); track p.id) {
              <option [value]="p.id">{{ p.name }}</option>
            }
          </select>
        </label>
        @if (settingsError(); as e) {
          <p class="rn__err" role="alert">{{ e }}</p>
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
    .rn {
      padding: 16px 20px 32px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .rn__kpis {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
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
    .rn__tools {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }
    .seg {
      display: inline-flex;
      border: 1px solid var(--ar-line-200);
      border-radius: 6px;
      overflow: hidden;
    }
    .seg button {
      font: 500 12.5px var(--ar-font-sans);
      border: 0;
      border-right: 1px solid var(--ar-line-200);
      background: var(--ar-white);
      color: var(--ar-ink-900);
      padding: 6px 12px;
      cursor: pointer;
    }
    .seg button:last-child {
      border-right: 0;
    }
    .seg button[aria-pressed='true'] {
      background: var(--ar-inverse-bg);
      color: var(--ar-inverse-fg);
    }
    .rn__search {
      flex: 1 1 240px;
      max-width: 420px;
    }
    .rn__search input {
      width: 100%;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
    .board {
      display: grid;
      grid-template-columns: repeat(4, minmax(230px, 1fr));
      gap: 12px;
      overflow-x: auto;
    }
    .col {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 0;
    }
    .col__h {
      display: flex;
      justify-content: space-between;
      font: 600 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0 2px;
    }
    .col__n {
      font-variant-numeric: tabular-nums;
    }
    .col__empty {
      margin: 0;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-400);
      padding: 8px 2px;
    }
    .card {
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .card__top {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      align-items: flex-start;
    }
    .card__asset {
      font: 600 13.5px var(--ar-font-sans);
      color: var(--ar-ink-900);
      overflow-wrap: anywhere;
    }
    .card__meta,
    .card__val {
      margin: 0;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
      overflow-wrap: anywhere;
    }
    .card__val {
      color: var(--ar-ink-900);
      font-variant-numeric: tabular-nums;
    }
    .card__flag {
      margin: 0;
      font: 600 12px var(--ar-font-sans);
      color: var(--ar-teal-700, #0f766e);
    }
    .card__actions {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      align-items: center;
      margin-top: 2px;
    }
    .card__link {
      font: 600 12.5px var(--ar-font-sans);
      color: var(--ar-teal-700, #0f766e);
      padding: 6px 4px;
    }
    .rn__empty {
      margin: 0;
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-500);
      max-width: 70ch;
    }
    .rn__err {
      margin: 0;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-bad-600, #b42318);
    }
    .rn__ok {
      margin: 0;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-good-600, #067647);
    }
    .rn__hint {
      margin: 0;
      font: 400 12.5px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    @media (max-width: 900px) {
      .board {
        grid-template-columns: repeat(2, minmax(220px, 1fr));
      }
    }
    @media (max-width: 560px) {
      .board {
        grid-template-columns: 1fr;
      }
      .rn {
        padding-inline: 12px;
      }
    }
  `,
})
export class ArRenewals {
  private readonly api = inject(AmcRenewalService);
  private readonly pipelinesApi = inject(SalesPipelineService);
  private readonly permissions = inject(PermissionService);

  protected readonly canManage = grantedPolicy('AutoReach.Renewals.Manage', this.permissions);
  protected readonly canSettings = grantedPolicy('AutoReach.Renewals.Settings', this.permissions);

  protected readonly windows = [
    { days: 30, label: '30 days' },
    { days: 60, label: '60 days' },
    { days: 90, label: '90 days' },
  ];

  protected readonly rows = signal<AmcRenewalDto[]>([]);
  protected readonly summary = signal<RenewalSummaryDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly window = signal(90);
  protected readonly query = signal('');
  protected readonly busy = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);

  protected readonly losing = signal<AmcRenewalDto | null>(null);
  protected readonly reason = signal('');

  protected readonly settingsOpen = signal(false);
  protected readonly uplift = signal('5');
  protected readonly itemCode = signal('AMC');
  protected readonly pipelineId = signal('');
  protected readonly pipelines = signal<SalesPipelineDto[]>([]);
  protected readonly settingsError = signal<string | null>(null);

  protected readonly visible = computed(() => {
    const q = this.query().trim().toLowerCase();
    const limit = this.window();
    return this.rows().filter((r) => {
      if (daysLeft(r.currentEndsOn) > limit) return false;
      if (!q) return true;
      return [r.assetDescription, r.serialNumber, r.siteName, r.contactName].some((v) =>
        v?.toLowerCase().includes(q),
      );
    });
  });

  protected readonly columns = computed(() => groupByStatus(this.visible()));

  protected readonly subtitle = computed(() => {
    const n = this.visible().length;
    return `${n} open renewal${n === 1 ? '' : 's'} ending within ${this.window()} days`;
  });

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      if (environment.useMockData) {
        this.rows.set(SEED);
        this.summary.set(SEED_SUMMARY);
        return;
      }
      const [list, summary] = await Promise.all([
        firstValueFrom(this.api.getList({ openOnly: true, endingWithinDays: 90 })),
        firstValueFrom(this.api.getSummary()),
      ]);
      this.rows.set(list.items ?? []);
      this.summary.set(summary);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Could not load renewals.');
    } finally {
      this.loading.set(false);
    }
  }

  protected setWindow(days: number): void {
    this.window.set(days);
  }

  protected label(status: RenewalStatus): string {
    return RENEWAL_STATUS_LABEL[status];
  }

  protected tone(r: AmcRenewalDto) {
    return renewalTone(r);
  }

  protected money(paise: number): string {
    return inr(paise);
  }

  protected endsLabel(r: AmcRenewalDto): string {
    const d = daysLeft(r.currentEndsOn);
    if (d < 0) return `ended ${-d}d ago`;
    if (d === 0) return 'ends today';
    return `ends in ${d}d`;
  }

  protected ago(isoDate: string): string {
    const hours = Math.round((Date.now() - new Date(isoDate).getTime()) / 3_600_000);
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
  }

  protected async refresh(): Promise<void> {
    this.busy.set('refresh');
    this.notice.set(null);
    try {
      if (!environment.useMockData) {
        const r = await firstValueFrom(this.api.refresh());
        this.notice.set(
          r.added
            ? `${r.added} new renewal${r.added === 1 ? '' : 's'} added.`
            : 'The board is up to date.',
        );
      }
      await this.load();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Could not refresh.');
    } finally {
      this.busy.set(null);
    }
  }

  protected async draft(r: AmcRenewalDto): Promise<void> {
    this.busy.set(r.id);
    this.error.set(null);
    this.notice.set(null);
    try {
      const updated = environment.useMockData
        ? {
            ...r,
            status: RenewalStatus.Quoted,
            quotationId: 'q-new',
            quotationReference: 'QT-DRAFT',
          }
        : await firstValueFrom(this.api.draftQuote(r.id));
      this.rows.update((list) => list.map((x) => (x.id === r.id ? updated : x)));
      this.notice.set(
        `Draft ${updated.quotationReference} created. Review and issue it from Quotations.`,
      );
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'The quote could not be drafted.');
    } finally {
      this.busy.set(null);
    }
  }

  protected openLost(r: AmcRenewalDto): void {
    this.reason.set('');
    this.losing.set(r);
  }

  protected async markLost(r: AmcRenewalDto): Promise<void> {
    this.busy.set(r.id);
    this.error.set(null);
    try {
      if (!environment.useMockData) {
        await firstValueFrom(this.api.markLost(r.id, this.reason().trim() || null));
      }
      this.rows.update((list) => list.filter((x) => x.id !== r.id));
      this.losing.set(null);
      this.notice.set(`${r.assetDescription} marked lost.`);
      if (!environment.useMockData) {
        this.summary.set(await firstValueFrom(this.api.getSummary()));
      }
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Could not mark the renewal lost.');
    } finally {
      this.busy.set(null);
    }
  }

  protected async openSettings(): Promise<void> {
    this.settingsError.set(null);
    this.settingsOpen.set(true);
    if (environment.useMockData) return;
    try {
      const [settings, pipelines] = await Promise.all([
        firstValueFrom(this.api.getSettings()),
        firstValueFrom(this.pipelinesApi.getList()),
      ]);
      this.uplift.set(upliftPercent(settings.upliftBasisPoints));
      this.itemCode.set(settings.serviceItemCode);
      this.pipelineId.set(settings.pipelineId ?? '');
      this.pipelines.set(pipelines.items ?? []);
    } catch (e: unknown) {
      this.settingsError.set(e instanceof Error ? e.message : 'Could not load the settings.');
    }
  }

  protected async saveSettings(): Promise<void> {
    const bp = upliftBasisPoints(this.uplift());
    if (bp == null) {
      this.settingsError.set(
        'Enter the uplift as a percentage between -50 and 100, e.g. 5 or 7.5.',
      );
      return;
    }
    this.busy.set('settings');
    this.settingsError.set(null);
    try {
      if (!environment.useMockData) {
        await firstValueFrom(
          this.api.updateSettings({
            upliftBasisPoints: bp,
            serviceItemCode: this.itemCode().trim() || 'AMC',
            pipelineId: this.pipelineId() || null,
          }),
        );
      }
      this.settingsOpen.set(false);
      this.notice.set('Renewal settings saved. They apply to the next quote drafted.');
    } catch (e: unknown) {
      this.settingsError.set(e instanceof Error ? e.message : 'The settings could not be saved.');
    } finally {
      this.busy.set(null);
    }
  }
}
