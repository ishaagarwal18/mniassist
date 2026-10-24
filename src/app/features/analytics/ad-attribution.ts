import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { firstValueFrom, map, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { grantedPolicy } from '../../core/auth/permission';
import { isPlanRefusal } from '../../core/http/api-feedback';
import { ChannelService } from '../../core/services/channel.service';
import { ReportPeriodStore, changeOf } from '../../core/services/report-period.store';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { count, inr } from '../../core/util/format';
import { ArTopbar } from '../../layout/topbar';
import { AdAttributionDto, AnalyticsService } from '../../proxy/analytics';
import {
  MetaAdsService,
  type MetaAdAccountChoiceDto,
  type MetaAdAccountDto,
} from '../../proxy/meta-ads/meta-ads.service';
import { ArBanner, ArButton, ArCard, ArDialog, ArStatTile, StatTone } from '../../ui';
import { ArGrid } from '../../ui/grid';
import { ArPeriodPicker } from '../../ui/period-picker';
import { readCallback } from '../channels/lead-forms.logic';
import { accountWarning, money, rememberAdsState, takeAdsState } from './ad-spend.logic';

const SEED: AdAttributionDto[] = [
  {
    sourceId: '120210000000001',
    sourceType: 'ad',
    headline: 'ABB ACS580 drives — ex-stock Pune',
    sourceUrl: 'https://fb.me/example-ad',
    adName: 'ACS580 ex-stock · CTWA',
    campaignName: 'Q3 drives',
    conversations: 64,
    contacts: 61,
    replied: 52,
    leadFormLeads: 0,
    enquiriesCreated: 14,
    won: 5,
    wonValueInPaise: 38_00_000,
    spendMinor: 18_400_00,
    spendCurrency: 'INR',
    impressions: 182_000,
    clicks: 2_310,
    costPerResultMinor: 287_50,
    costPerEnquiryMinor: 1_314_29,
    firstSeenUtc: '2026-09-02T04:00:00Z',
    lastSeenUtc: '2026-09-29T12:00:00Z',
  },
  {
    sourceId: '120210000000003',
    sourceType: 'ad',
    headline: null,
    sourceUrl: null,
    adName: 'Panel retrofit lead form',
    campaignName: 'Q3 panels',
    conversations: 0,
    contacts: 0,
    replied: 0,
    leadFormLeads: 38,
    enquiriesCreated: 9,
    won: 2,
    wonValueInPaise: 11_20_000,
    spendMinor: 9_120_00,
    spendCurrency: 'INR',
    impressions: 96_400,
    clicks: 1_120,
    costPerResultMinor: 240_00,
    costPerEnquiryMinor: 1_013_33,
    firstSeenUtc: '2026-09-01T00:00:00Z',
    lastSeenUtc: '2026-09-28T18:30:00Z',
  },
  {
    sourceId: '120210000000002',
    sourceType: 'post',
    headline: 'Panel retrofit case study',
    sourceUrl: null,
    conversations: 21,
    contacts: 21,
    replied: 15,
    enquiriesCreated: 3,
    won: 1,
    wonValueInPaise: 6_50_000,
    firstSeenUtc: '2026-09-11T04:00:00Z',
    lastSeenUtc: '2026-09-27T12:00:00Z',
  },
];

function when(utc: string | null | undefined): string {
  return utc
    ? new Date(utc).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';
}

/**
 * Meta ads against what they brought: for each ad or boosted post, the Click-to-WhatsApp chats
 * it started, the lead-form leads it brought, the enquiries and wins that followed and, once the
 * workspace connects its ad account (ads_read), what the ad cost and so what each enquiry cost.
 * Facebook sends the person back to /analytics/ads/callback, which is this same screen finishing
 * the sign-in.
 */
@Component({
  selector: 'ar-ad-attribution',
  imports: [
    ArTopbar,
    ArBanner,
    ArButton,
    ArCard,
    ArDialog,
    ArStatTile,
    ArPeriodPicker,
    ArGrid,
    GridModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Ad attribution"
      [subtitle]="period.label()"
      help="Each Meta ad or boosted post that opened a chat or brought a lead-form lead, with the enquiries and wins that followed. Connect your ad account to see what each ad cost, and what each enquiry cost."
    >
      <ar-period-picker />
    </ar-topbar>

    <div class="aa ar-scroll">
      @if (notInPlan()) {
        <ar-banner tone="teal">
          Ad attribution comes with the Growth plan and above. Ask your MNI Assist contact to switch
          it on.
        </ar-banner>
      }
      @if (notice(); as n) {
        <ar-banner [tone]="n.tone">{{ n.text }}</ar-banner>
      }

      <section class="aa__tiles">
        @for (t of tiles(); track t.label) {
          <ar-stat-tile [label]="t.label" [value]="t.value" [note]="t.note" [tone]="t.tone" />
        }
      </section>

      <ar-card heading="Ad spend from Meta">
        @if (canConnect()) {
          <button
            card-actions
            ar-button
            variant="ghost"
            icon="plus"
            [disabled]="busy()"
            (click)="connect()"
          >
            Connect an ad account
          </button>
        }
        @for (a of accounts(); track a.id) {
          <div class="aa__account">
            <div class="aa__who">
              <strong>{{ a.name }}</strong>
              <span class="aa__muted">
                {{ a.adAccountId }} · {{ money(a.spendLast30DaysMinor, a.currency) }} spent in 30
                days · updated {{ when(a.lastSyncedAtUtc) }}
              </span>
              @if (warning(a); as w) {
                <span [class]="w.tone === 'bad' ? 'aa__error' : 'aa__warn'">{{ w.text }}</span>
              }
            </div>
            <div class="aa__act">
              @if (a.needsReconnect && canConnect()) {
                <button ar-button variant="primary" [disabled]="busy()" (click)="connect()">
                  Connect again
                </button>
              } @else {
                <button ar-button variant="ghost" [disabled]="busy()" (click)="sync(a)">
                  Update now
                </button>
              }
              @if (canConnect()) {
                <button ar-button variant="ghost" [disabled]="busy()" (click)="disconnect(a)">
                  Disconnect
                </button>
              }
            </div>
          </div>
        } @empty {
          <p class="aa__muted">
            No ad account connected. Connect the Meta ad account your ads run from to see what each
            ad cost beside the chats and enquiries it brought. MNI Assist only reads spend; it
            cannot change your ads or budgets.
          </p>
        }
      </ar-card>

      <ar-card heading="By ad">
        <ejs-grid arGrid="ad-attribution" [dataSource]="rows()" aria-label="Ad attribution">
          <e-columns>
            <e-column field="headline" headerText="Ad or post" width="240">
              <ng-template #template let-r>
                @if (r.url) {
                  <a class="aa__link" [href]="r.url" target="_blank" rel="noopener">{{
                    r.headline
                  }}</a>
                } @else {
                  {{ r.headline }}
                }
                <span class="aa__id">{{ r.detail }}</span>
              </ng-template>
            </e-column>
            <e-column
              field="conversations"
              headerText="Chats started"
              type="number"
              textAlign="Right"
              width="110"
            />
            <e-column
              field="leadFormLeads"
              headerText="Form leads"
              type="number"
              textAlign="Right"
              width="100"
            />
            <e-column
              field="replyRate"
              headerText="Reply rate"
              type="number"
              textAlign="Right"
              width="100"
              format="P0"
            />
            <e-column
              field="enquiries"
              headerText="Enquiries"
              type="number"
              textAlign="Right"
              width="100"
            />
            <e-column field="won" headerText="Won" type="number" textAlign="Right" width="70" />
            <e-column
              field="wonValue"
              headerText="Won value (₹)"
              type="number"
              textAlign="Right"
              width="130"
              format="N0"
            />
            <e-column field="spend" headerText="Spend" type="number" textAlign="Right" width="110">
              <ng-template #template let-r>{{ r.spendText }}</ng-template>
            </e-column>
            <e-column
              field="costPerResult"
              headerText="Per chat or lead"
              type="number"
              textAlign="Right"
              width="130"
            >
              <ng-template #template let-r>{{ r.costPerResultText }}</ng-template>
            </e-column>
            <e-column
              field="costPerEnquiry"
              headerText="Per enquiry"
              type="number"
              textAlign="Right"
              width="120"
            >
              <ng-template #template let-r>{{ r.costPerEnquiryText }}</ng-template>
            </e-column>
            <e-column field="lastSeen" headerText="Last activity" width="110" />
          </e-columns>
          <ng-template #emptyRecordTemplate
            >No ad activity in this period. Chats opened from a Click-to-WhatsApp ad, leads from a
            lead form, and spend from a connected ad account appear here by ad.</ng-template
          >
        </ejs-grid>
      </ar-card>
    </div>

    @if (choice(); as c) {
      <ar-dialog
        title="Choose the ad accounts to connect"
        width="min(520px, calc(100vw - 32px))"
        (dismiss)="choice.set(null)"
      >
        <div class="aa__choices">
          @for (a of c.accounts; track a.adAccountId) {
            <label class="aa__choice">
              <input
                type="checkbox"
                [checked]="picked().has(a.adAccountId)"
                (change)="toggle(a.adAccountId)"
              />
              <span>
                <strong>{{ a.name }}</strong>
                <span class="aa__muted">
                  {{ a.adAccountId }} · {{ a.currency
                  }}{{ a.businessName ? ' · ' + a.businessName : ''
                  }}{{ a.isActiveOnMeta ? '' : ' · not active on Meta'
                  }}{{ a.alreadyConnected ? ' · already connected (refreshes it)' : '' }}
                </span>
              </span>
            </label>
          }
        </div>
        <p class="aa__muted">The last 90 days of spend are imported straight away.</p>
        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="choice.set(null)">Cancel</button>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy() || picked().size === 0"
            (click)="connectPicked()"
          >
            Connect {{ picked().size || '' }}
          </button>
        </div>
      </ar-dialog>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }
    .aa {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 18px 24px 32px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .aa ar-card {
      display: block;
    }
    .aa__tiles {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 12px;
    }
    .aa__account {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px 16px;
      align-items: center;
      padding: 10px 0;
      border-top: 1px solid var(--ar-line-200);
    }
    .aa__account:first-of-type {
      border-top: 0;
    }
    .aa__who {
      display: grid;
      gap: 2px;
      min-width: 0;
      font: 400 13px var(--ar-font-sans);
    }
    .aa__muted {
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .aa__error {
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-red-600);
    }
    .aa__warn {
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-amber-700);
    }
    .aa__act {
      display: flex;
      gap: 6px;
    }
    .aa__link {
      color: var(--ar-primary);
      text-decoration: none;
      font-weight: 500;
    }
    .aa__link:hover {
      text-decoration: underline;
    }
    .aa__id {
      display: block;
      font: 400 11px var(--ar-font-mono);
      color: var(--ar-ink-400);
    }
    .aa__choices {
      display: grid;
      gap: 10px;
    }
    .aa__choice {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      font: 400 13px var(--ar-font-sans);
    }
    .aa__choice span {
      display: grid;
    }
    @media (max-width: 600px) {
      .aa {
        padding: 14px 16px 24px;
      }
      .aa__account {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class ArAdAttribution {
  private readonly api = inject(AnalyticsService);
  private readonly ads = inject(MetaAdsService);
  private readonly channels = inject(ChannelService);
  private readonly permissions = inject(PermissionService);
  private readonly dialogs = inject(ConfirmService);
  private readonly toasts = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly period = inject(ReportPeriodStore);

  protected readonly canConnect = grantedPolicy('AutoReach.Channels.Onboard', this.permissions);
  protected readonly accounts = signal<MetaAdAccountDto[]>([]);
  protected readonly choice = signal<MetaAdAccountChoiceDto | null>(null);
  protected readonly picked = signal<Set<string>>(new Set());
  protected readonly busy = signal(false);
  protected readonly notice = signal<{ tone: 'good' | 'bad' | 'warn'; text: string } | null>(null);
  /** Bumped after a sync or connect so the report re-reads the new spend. */
  private readonly refresh = signal(0);

  protected readonly money = money;
  protected readonly when = when;
  protected readonly warning = (a: MetaAdAccountDto) => accountWarning(a);

  private readonly current = rxResource({
    params: () => ({
      ...this.period.range(),
      channelId: this.channels.active()?.id,
      n: this.refresh(),
    }),
    stream: ({ params }) =>
      environment.useMockData
        ? of(SEED)
        : this.api.getAdAttribution(params).pipe(map((r) => r.items ?? [])),
  });

  private readonly previous = rxResource({
    params: () =>
      this.period.compare()
        ? { ...this.period.previousRange(), channelId: this.channels.active()?.id }
        : undefined,
    stream: ({ params }) =>
      environment.useMockData
        ? of([])
        : this.api.getAdAttribution(params).pipe(map((r) => r.items ?? [])),
  });

  constructor() {
    if (environment.useMockData) return;
    void this.reloadAccounts();
    if (this.route.snapshot.url.some((s) => s.path === 'callback')) void this.finishSignIn();
  }

  private readonly items = computed(() =>
    this.current.error() || !this.current.hasValue() ? [] : (this.current.value() ?? []),
  );
  private readonly before = computed(() =>
    !this.period.compare() || this.previous.error() || !this.previous.hasValue()
      ? null
      : (this.previous.value() ?? []),
  );

  protected readonly notInPlan = computed(() => isPlanRefusal(this.current.error()));

  protected readonly tiles = computed(() => {
    const sum = (items: AdAttributionDto[], f: (a: AdAttributionDto) => number | undefined) =>
      items.reduce((n, a) => n + (f(a) ?? 0), 0);
    // Rupee totals add up only rupee spend; an account in another currency shows per row.
    const inrSpend = (a: AdAttributionDto) => (a.spendCurrency === 'INR' ? (a.spendMinor ?? 0) : 0);
    const inrEnquiries = (a: AdAttributionDto) =>
      a.spendCurrency === 'INR' ? (a.enquiriesCreated ?? 0) : 0;
    const now = this.items();
    const before = this.before();
    const note = (value: number, previous: number | null, higherIsBetter: boolean | null) => {
      const c = previous == null ? null : changeOf(value, previous, { higherIsBetter });
      return {
        note: c ? `${c.text} ${this.period.previousLabel()}` : null,
        tone: (c?.good == null ? 'neutral' : c.good ? 'good' : 'bad') as StatTone,
      };
    };
    const tile = (
      label: string,
      f: (a: AdAttributionDto) => number | undefined,
      money = false,
      higherIsBetter: boolean | null = true,
    ) => {
      const value = sum(now, f);
      return {
        label,
        value: money ? inr(value) : count(value),
        ...note(value, before ? sum(before, f) : null, higherIsBetter),
      };
    };

    const tiles = [
      tile('Chats from ads', (a) => a.conversations),
      tile('Lead-form leads', (a) => a.leadFormLeads),
      tile('Enquiries', (a) => a.enquiriesCreated),
      tile('Won value', (a) => a.wonValueInPaise, true),
    ];

    const spend = sum(now, inrSpend);
    if (spend > 0) {
      tiles.push(tile('Ad spend', inrSpend, true, null));
      const perEnquiry = (items: AdAttributionDto[]) => {
        const e = sum(items, inrEnquiries);
        return e > 0 ? Math.round(sum(items, inrSpend) / e) : null;
      };
      const value = perEnquiry(now);
      const previous = before ? perEnquiry(before) : null;
      tiles.push({
        label: 'Cost per enquiry',
        value: value == null ? '—' : inr(value),
        ...(value == null
          ? { note: null, tone: 'neutral' as StatTone }
          : note(value, previous, false)),
      });
    }
    return tiles;
  });

  protected readonly rows = computed(() =>
    this.items().map((a) => {
      const major = (minor: number | null | undefined) => (minor == null ? null : minor / 100);
      const detail = [
        a.sourceType === 'post' ? 'Post' : 'Ad',
        a.sourceId,
        a.campaignName,
        a.impressions ? `${count(a.impressions)} impressions` : null,
      ].filter(Boolean);
      return {
        sourceId: a.sourceId ?? '—',
        headline: a.headline || a.adName || (a.sourceId ? `Ad ${a.sourceId}` : 'Unidentified ad'),
        detail: detail.join(' · '),
        url: a.sourceUrl,
        conversations: a.conversations ?? 0,
        leadFormLeads: a.leadFormLeads ?? 0,
        replyRate: a.contacts ? (a.replied ?? 0) / a.contacts : 0,
        enquiries: a.enquiriesCreated ?? 0,
        won: a.won ?? 0,
        wonValue: (a.wonValueInPaise ?? 0) / 100,
        spend: major(a.spendMinor),
        spendText: money(a.spendMinor, a.spendCurrency),
        costPerResult: major(a.costPerResultMinor),
        costPerResultText: money(a.costPerResultMinor, a.spendCurrency),
        costPerEnquiry: major(a.costPerEnquiryMinor),
        costPerEnquiryText: money(a.costPerEnquiryMinor, a.spendCurrency),
        lastSeen: a.lastSeenUtc
          ? new Date(a.lastSeenUtc).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
          : '—',
      };
    }),
  );

  private async reloadAccounts(): Promise<void> {
    try {
      this.accounts.set((await firstValueFrom(this.ads.getAccounts())).items ?? []);
    } catch {
      /* the interceptor has shown the error */
    }
  }

  protected async connect(): Promise<void> {
    this.busy.set(true);
    try {
      const start = await firstValueFrom(this.ads.getLoginStart());
      rememberAdsState(start.state);
      window.location.assign(start.authorizeUrl);
    } catch (e) {
      this.busy.set(false);
      this.notice.set({ tone: 'bad', text: readApiError(e, 'Could not start Facebook sign-in.') });
    }
  }

  private async finishSignIn(): Promise<void> {
    const result = readCallback(this.route.snapshot.queryParams, takeAdsState());
    // Drop the code from the address bar, whatever happens next.
    void this.router.navigate(['/analytics/ads'], { replaceUrl: true });
    if (!result.ok) {
      this.notice.set({ tone: 'warn', text: result.reason });
      return;
    }
    this.busy.set(true);
    try {
      const choice = await firstValueFrom(this.ads.completeLogin(result.code, result.state));
      this.picked.set(
        new Set(
          choice.accounts
            .filter((a) => a.isActiveOnMeta && !a.alreadyConnected)
            .map((a) => a.adAccountId),
        ),
      );
      this.choice.set(choice);
    } catch (e) {
      this.notice.set({ tone: 'bad', text: readApiError(e, 'Facebook sign-in did not complete.') });
    } finally {
      this.busy.set(false);
    }
  }

  protected toggle(id: string): void {
    const next = new Set(this.picked());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.picked.set(next);
  }

  protected async connectPicked(): Promise<void> {
    const c = this.choice();
    if (!c) return;
    this.busy.set(true);
    try {
      const connected = await firstValueFrom(
        this.ads.connectAccounts(c.selectionId, [...this.picked()]),
      );
      const n = connected.items?.length ?? 0;
      this.choice.set(null);
      this.notice.set(null);
      this.toasts.success(
        `${n} ad account${n === 1 ? '' : 's'} connected. Spend is shown beside each ad.`,
      );
      await this.reloadAccounts();
      this.refresh.update((x) => x + 1);
    } catch (e) {
      this.notice.set({ tone: 'bad', text: readApiError(e, 'Could not connect the ad accounts.') });
      this.choice.set(null);
    } finally {
      this.busy.set(false);
    }
  }

  protected async sync(a: MetaAdAccountDto): Promise<void> {
    this.busy.set(true);
    try {
      const r = await firstValueFrom(this.ads.syncAccount(a.id));
      this.toasts.success(
        `Spend updated: ${money(r.spendMinor, r.currency)} over the last ${r.days} days.`,
      );
      this.refresh.update((x) => x + 1);
    } catch (e) {
      this.toasts.error(readApiError(e, 'Could not update the spend.'));
    } finally {
      await this.reloadAccounts();
      this.busy.set(false);
    }
  }

  protected async disconnect(a: MetaAdAccountDto): Promise<void> {
    if (
      !(await this.dialogs.confirm({
        title: `Disconnect ${a.name}?`,
        message:
          'Spend stops updating. Spend already imported stays in the report for the days it covers.',
        confirmText: 'Disconnect',
        tone: 'danger',
      }))
    )
      return;
    await firstValueFrom(this.ads.disconnectAccount(a.id));
    await this.reloadAccounts();
  }
}
