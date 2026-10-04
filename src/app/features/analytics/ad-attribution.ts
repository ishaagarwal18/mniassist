import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { map, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { isPlanRefusal } from '../../core/http/api-feedback';
import { ChannelService } from '../../core/services/channel.service';
import { ReportPeriodStore, changeOf } from '../../core/services/report-period.store';
import { count, inr } from '../../core/util/format';
import { ArTopbar } from '../../layout/topbar';
import { AdAttributionDto, AnalyticsService } from '../../proxy/analytics';
import { ArBanner, ArCard, ArStatTile, StatTone } from '../../ui';
import { ArGrid } from '../../ui/grid';
import { ArPeriodPicker } from '../../ui/period-picker';

const SEED: AdAttributionDto[] = [
  {
    sourceId: '120210000000001',
    sourceType: 'ad',
    headline: 'ABB ACS580 drives — ex-stock Pune',
    sourceUrl: 'https://fb.me/example-ad',
    conversations: 64,
    contacts: 61,
    replied: 52,
    enquiriesCreated: 14,
    won: 5,
    wonValueInPaise: 38_00_000,
    firstSeenUtc: '2026-09-02T04:00:00Z',
    lastSeenUtc: '2026-09-29T12:00:00Z',
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

/**
 * Click-to-WhatsApp ads: for each Meta ad or post that opened a chat, the conversations it
 * started, how many of those people replied, and the enquiries and wins that followed — the
 * number to set beside its cost in Ads Manager.
 */
@Component({
  selector: 'ar-ad-attribution',
  imports: [ArTopbar, ArBanner, ArCard, ArStatTile, ArPeriodPicker, ArGrid, GridModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Ad attribution"
      [subtitle]="period.label()"
      help="Each Click-to-WhatsApp ad or boosted post that opened a chat, with the conversations, replies, enquiries and wins that followed. Set these against the ad's cost in Meta Ads Manager to see what each enquiry cost."
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

      <section class="aa__tiles">
        @for (t of tiles(); track t.label) {
          <ar-stat-tile [label]="t.label" [value]="t.value" [note]="t.note" [tone]="t.tone" />
        }
      </section>

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
                <span class="aa__id">{{ r.type }} · {{ r.sourceId }}</span>
              </ng-template>
            </e-column>
            <e-column
              field="conversations"
              headerText="Chats started"
              type="number"
              textAlign="Right"
              width="120"
            />
            <e-column
              field="replied"
              headerText="Replied"
              type="number"
              textAlign="Right"
              width="90"
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
            <e-column field="lastSeen" headerText="Last chat" width="110" />
          </e-columns>
          <ng-template #emptyRecordTemplate
            >No chats came from ads in this period. Chats opened from a Click-to-WhatsApp ad appear
            here with the ad they came from.</ng-template
          >
        </ejs-grid>
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
    @media (max-width: 600px) {
      .aa {
        padding: 14px 16px 24px;
      }
    }
  `,
})
export class ArAdAttribution {
  private readonly api = inject(AnalyticsService);
  private readonly channels = inject(ChannelService);
  protected readonly period = inject(ReportPeriodStore);

  private readonly current = rxResource({
    params: () => ({ ...this.period.range(), channelId: this.channels.active()?.id }),
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
    const now = this.items();
    const before = this.before();
    const tile = (
      label: string,
      f: (a: AdAttributionDto) => number | undefined,
      money = false,
    ): { label: string; value: string; note: string | null; tone: StatTone } => {
      const value = sum(now, f);
      const c = before ? changeOf(value, sum(before, f), { higherIsBetter: true }) : null;
      return {
        label,
        value: money ? inr(value) : count(value),
        note: c ? `${c.text} ${this.period.previousLabel()}` : null,
        tone: c?.good == null ? 'neutral' : c.good ? 'good' : 'bad',
      };
    };
    return [
      tile('Chats from ads', (a) => a.conversations),
      tile('Replied', (a) => a.replied),
      tile('Enquiries', (a) => a.enquiriesCreated),
      tile('Won value', (a) => a.wonValueInPaise, true),
    ];
  });

  protected readonly rows = computed(() =>
    this.items().map((a) => ({
      sourceId: a.sourceId ?? '—',
      type: a.sourceType === 'post' ? 'Post' : 'Ad',
      headline: a.headline || (a.sourceId ? `Ad ${a.sourceId}` : 'Unidentified ad'),
      url: a.sourceUrl,
      conversations: a.conversations ?? 0,
      replied: a.replied ?? 0,
      replyRate: a.contacts ? (a.replied ?? 0) / a.contacts : 0,
      enquiries: a.enquiriesCreated ?? 0,
      won: a.won ?? 0,
      wonValue: (a.wonValueInPaise ?? 0) / 100,
      lastSeen: a.lastSeenUtc
        ? new Date(a.lastSeenUtc).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        : '—',
    })),
  );
}
