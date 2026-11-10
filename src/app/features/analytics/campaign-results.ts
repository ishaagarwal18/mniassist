import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { isPlanRefusal } from '../../core/http/api-feedback';
import { ChannelService } from '../../core/services/channel.service';
import { ReportPeriodStore, changeOf } from '../../core/services/report-period.store';
import { count, inr } from '../../core/util/format';
import { ArTopbar } from '../../layout/topbar';
import { AnalyticsService, CampaignResultDto, CampaignResultsDto } from '../../proxy/analytics';
import { ArBanner, ArCard, ArStatTile, StatTone } from '../../ui';
import { ArGrid } from '../../ui/grid';
import { ArPeriodPicker } from '../../ui/period-picker';

interface Totals {
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  enquiries: number;
  won: number;
  wonValue: number;
  spend: number;
}

function totals(items: readonly CampaignResultDto[]): Totals {
  const sum = (f: (c: CampaignResultDto) => number) => items.reduce((n, c) => n + f(c), 0);
  return {
    sent: sum((c) => c.sent),
    delivered: sum((c) => c.delivered),
    read: sum((c) => c.read),
    replied: sum((c) => c.replied),
    enquiries: sum((c) => c.enquiries),
    won: sum((c) => c.won),
    wonValue: sum((c) => c.wonValueInPaise),
    spend: sum((c) => c.spendInPaise),
  };
}

/**
 * Campaign results: every campaign that sent in the period, from delivery to the money
 * won from the enquiries its recipients opened. The question a WhatsApp campaign has to
 * answer — what did it bring in, and at what cost per enquiry.
 */
@Component({
  selector: 'ar-campaign-results',
  imports: [RouterLink, ArTopbar, ArBanner, ArCard, ArStatTile, ArPeriodPicker, ArGrid, GridModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Campaign results"
      [subtitle]="period.label()"
      help="What each campaign brought in: delivered, read and replied, then the enquiries its recipients opened and the value won from them. An enquiry counts for a campaign when it was opened within the attribution window after the recipient's message."
    >
      <ar-period-picker />
    </ar-topbar>

    <div class="cr ar-scroll">
      @if (notInPlan()) {
        <ar-banner tone="teal">
          Campaign results come with full analytics, which your plan does not include. Each
          campaign's own delivery report is still on the Campaigns screen.
        </ar-banner>
      }

      <section class="cr__tiles">
        @for (t of tiles(); track t.label) {
          <ar-stat-tile [label]="t.label" [value]="t.value" [note]="t.note" [tone]="t.tone" />
        }
      </section>

      <ar-card heading="From send to sale">
        <div class="funnel" role="list" aria-label="Campaign funnel">
          @for (step of funnel(); track step.label) {
            <div class="funnel__row" role="listitem">
              <span class="funnel__label">{{ step.label }}</span>
              <span class="funnel__bar"><span [style.width.%]="step.width"></span></span>
              <span class="funnel__value">{{ step.value }}</span>
              <span class="funnel__share">{{ step.share }}</span>
            </div>
          }
        </div>
        <p class="cr__note">
          Percentages are of messages sent. An enquiry is credited when it was opened within
          {{ attributionDays() }} days of the recipient's campaign message.
        </p>
      </ar-card>

      <ar-card heading="By campaign">
        <div class="cr__table-wrap">
          <ejs-grid arGrid="campaign-results" [dataSource]="rows()" aria-label="Campaign results">
            <e-columns>
              <e-column field="name" headerText="Campaign" width="220">
                <ng-template #template let-c>
                  <a
                    class="cr__link"
                    routerLink="/campaigns"
                    [queryParams]="{ open: c.campaignId }"
                    >{{ c.name }}</a
                  >
                </ng-template>
              </e-column>
              <e-column field="started" headerText="Started" width="110" />
              <e-column field="sent" headerText="Sent" type="number" textAlign="Right" width="90" />
              <e-column
                field="readPct"
                headerText="Read"
                type="number"
                textAlign="Right"
                width="80"
                format="P0"
              />
              <e-column
                field="replied"
                headerText="Replied"
                type="number"
                textAlign="Right"
                width="90"
              />
              <e-column
                field="replyPct"
                headerText="Reply rate"
                type="number"
                textAlign="Right"
                width="100"
                format="P1"
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
              <e-column
                field="spend"
                headerText="Spend (₹)"
                type="number"
                textAlign="Right"
                width="110"
                format="N0"
              />
              <e-column
                field="costPerEnquiry"
                headerText="Cost / enquiry (₹)"
                type="number"
                textAlign="Right"
                width="140"
                format="N0"
              />
            </e-columns>
            <ng-template #emptyRecordTemplate
              >No campaign messages went out in this period.</ng-template
            >
          </ejs-grid>
        </div>
      </ar-card>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }
    .cr {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overflow-x: auto;
      padding: 18px 24px 32px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .cr ar-card {
      display: block;
      min-width: 0;
    }
    .cr__table-wrap {
      overflow-x: auto;
      min-width: 0;
      width: 100%;
    }
    .cr__tiles {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 12px;
    }
    .cr__note {
      margin: 10px 0 0;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .cr__link {
      color: var(--ar-teal-600);
      text-decoration: none;
      font-weight: 500;
    }
    .cr__link:hover {
      text-decoration: underline;
    }
    .funnel {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .funnel__row {
      display: grid;
      grid-template-columns: 110px 1fr 90px 56px;
      align-items: center;
      gap: 10px;
      font: 400 13px var(--ar-font-sans);
    }
    .funnel__label {
      color: var(--ar-ink-700);
    }
    .funnel__bar {
      height: 12px;
      border-radius: 6px;
      background: var(--ar-line-200, #e2e8f0);
      overflow: hidden;
    }
    .funnel__bar span {
      display: block;
      height: 100%;
      border-radius: 6px;
      background: var(--ar-teal-600, #0d9488);
    }
    .funnel__value {
      text-align: right;
      font-weight: 600;
      color: var(--ar-ink-900);
    }
    .funnel__share {
      text-align: right;
      color: var(--ar-ink-500);
    }
    @media (max-width: 600px) {
      .cr {
        padding: 14px 16px 24px;
      }
      .funnel__row {
        grid-template-columns: 84px 1fr 70px 44px;
      }
    }
  `,
})
export class ArCampaignResults {
  private readonly api = inject(AnalyticsService);
  private readonly channels = inject(ChannelService);
  protected readonly period = inject(ReportPeriodStore);

  private readonly current = rxResource({
    params: () => ({ ...this.period.range(), channelId: this.channels.active()?.id }),
    stream: ({ params }) => this.api.getCampaignResults(params),
  });

  private readonly previous = rxResource({
    params: () =>
      this.period.compare()
        ? { ...this.period.previousRange(), channelId: this.channels.active()?.id }
        : undefined,
    stream: ({ params }) => this.api.getCampaignResults(params),
  });

  private readonly data = computed<CampaignResultsDto | null>(() =>
    this.current.error() || !this.current.hasValue() ? null : (this.current.value() ?? null),
  );
  private readonly before = computed<CampaignResultsDto | null>(() =>
    !this.period.compare() || this.previous.error() || !this.previous.hasValue()
      ? null
      : (this.previous.value() ?? null),
  );

  protected readonly notInPlan = computed(() => isPlanRefusal(this.current.error()));
  protected readonly attributionDays = computed(() => this.data()?.attributionDays ?? 14);

  private readonly now = computed(() => totals(this.data()?.items ?? []));

  protected readonly tiles = computed(() => {
    const n = this.now();
    const b = this.before() ? totals(this.before()!.items) : null;
    const tile = (
      label: string,
      value: string,
      current: number | null,
      previous: number | null | undefined,
      higherIsBetter: boolean | null,
      fallback: string | null = null,
    ): { label: string; value: string; note: string | null; tone: StatTone } => {
      const c = b ? changeOf(current, previous, { higherIsBetter }) : null;
      return {
        label,
        value,
        note: c ? `${c.text} ${this.period.previousLabel()}` : fallback,
        tone: c?.good == null ? 'neutral' : c.good ? 'good' : 'bad',
      };
    };
    const cpe = n.enquiries ? n.spend / n.enquiries : null;
    const cpeBefore = b && b.enquiries ? b.spend / b.enquiries : null;
    return [
      tile('Campaign messages', count(n.sent), n.sent, b?.sent, null),
      tile('Replies', count(n.replied), n.replied, b?.replied, true),
      tile('Enquiries', count(n.enquiries), n.enquiries, b?.enquiries, true),
      tile('Won value', inr(n.wonValue), n.wonValue, b?.wonValue, true, `${n.won} deals won`),
      tile('Spend', inr(n.spend), n.spend, b?.spend, null),
      tile('Cost per enquiry', cpe == null ? '—' : inr(cpe), cpe, cpeBefore, false),
    ];
  });

  protected readonly funnel = computed(() => {
    const n = this.now();
    const share = (v: number) =>
      n.sent ? `${((v / n.sent) * 100).toFixed(v / n.sent < 0.1 ? 1 : 0)}%` : '—';
    const width = (v: number) => (n.sent ? Math.max(v ? 1.5 : 0, (v / n.sent) * 100) : 0);
    return [
      { label: 'Sent', v: n.sent },
      { label: 'Delivered', v: n.delivered },
      { label: 'Read', v: n.read },
      { label: 'Replied', v: n.replied },
      { label: 'Enquiries', v: n.enquiries },
      { label: 'Won', v: n.won },
    ].map((s) => ({ label: s.label, value: count(s.v), share: share(s.v), width: width(s.v) }));
  });

  /** Grid rows: plain numbers (rupees, fractions) so sorting, filtering and export see values. */
  protected readonly rows = computed(() =>
    (this.data()?.items ?? []).map((c) => ({
      campaignId: c.campaignId,
      name: c.name,
      started: c.startedAtUtc
        ? new Date(c.startedAtUtc).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        : '—',
      sent: c.sent,
      readPct: c.readRate,
      replied: c.replied,
      replyPct: c.replyRate,
      enquiries: c.enquiries,
      won: c.won,
      wonValue: c.wonValueInPaise / 100,
      spend: c.spendInPaise / 100,
      costPerEnquiry: c.costPerEnquiryInPaise == null ? null : c.costPerEnquiryInPaise / 100,
    })),
  );
}
