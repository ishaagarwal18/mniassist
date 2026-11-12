import { RestService } from '@abp/ng.core';
import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ReportPeriodStore } from '../../core/services/report-period.store';
import { ArTopbar } from '../../layout/topbar';
import { ChannelService } from '../../proxy/channels/channel.service';
import { ChannelDto } from '../../proxy/channels/models';
import { ArButton } from '../../ui/button';
import { ArIcon, IconName } from '../../ui/icon';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { ArCard, ArGrid, ArMeter, ArStatTile } from '../../ui';
import { ArPeriodPicker } from '../../ui/period-picker';

export interface VoiceImpactInput {
  fromDate: string;
  toDate: string;
  channelId?: string | null;
  handlingMinutesPerCall: number;
  staffCostPerHourRupees: number;
}

export interface VoiceImpactReport {
  fromDate: string;
  toDate: string;
  calls: number;
  whatsAppCalls: number;
  websiteCalls: number;
  phoneCalls: number;
  sipCalls: number;
  outboundCalls: number;
  minutes: number;
  averageSeconds: number;
  handledByAi: number;
  goalEvaluated: number;
  goalMet: number;
  positive: number;
  neutral: number;
  negative: number;
  meetingsBooked: number;
  crmUpdates: number;
  ticketsRaised: number;
  followUpsSent: number;
  paymentLinksSent: number;
  functionsRun: number;
  handedToPeople: number;
  optOuts: number;
  leads: number;
  costPaise: number;
  costPerCallPaise: number;
  staffHours: number;
  staffCostPaise: number;
  netSavingPaise: number;
  agents: {
    agent: string;
    calls: number;
    minutes: number;
    goalEvaluated: number;
    goalMet: number;
    costPaise: number;
  }[];
}

@Injectable({ providedIn: 'root' })
export class VoiceImpactService {
  private readonly rest = inject(RestService);
  get(input: VoiceImpactInput) {
    return this.rest.request<never, VoiceImpactReport>(
      {
        method: 'GET',
        url: '/api/auto-reach/voice-impact',
        params: { ...input, channelId: input.channelId ?? undefined } as never,
      },
      { apiName: 'AutoReach' },
    );
  }
  export(input: VoiceImpactInput, format: 'pdf' | 'csv') {
    return this.rest.request<VoiceImpactInput, Blob>(
      {
        method: 'POST',
        url: '/api/auto-reach/voice-impact/export',
        params: { format },
        body: input,
        responseType: 'blob',
      },
      { apiName: 'AutoReach' },
    );
  }
}

/** Icons for the actions the AI took on calls. */
const ACTION_ICONS = {
  meetings: 'clock',
  leads: 'enquiry',
  crm: 'contacts',
  tickets: 'document',
  followUps: 'send',
  payments: 'billing',
  functions: 'bolt',
} as const satisfies Record<string, IconName>;

/** A labelled count with its share of a whole, for the bar lists. */
interface Bar {
  label: string;
  value: number;
  share: number;
  tone: 'blue' | 'teal' | 'good' | 'amber' | 'bad' | 'ink';
}

/** Share of a whole as a whole percentage; 0 when there is nothing to share. */
export function shareOf(part: number, whole: number): number {
  return whole > 0 ? Math.round((100 * part) / whole) : 0;
}

/**
 * What the AI voice agents did over a period: calls, outcomes, actions, leads, AI cost and the staff time those calls would have
 * taken. The period is the shared report period (top bar); the staff figures come from the two assumptions on the Savings card.
 */
@Component({
  selector: 'ar-voice-impact',
  imports: [
    ArTopbar,
    ArButton,
    ArIcon,
    ArGrid,
    GridModule,
    ArPeriodPicker,
    ArStatTile,
    ArCard,
    ArMeter,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="AI impact report"
      [subtitle]="period.label()"
      help="What your AI voice agents did, what it cost and the staff time it saved. Staff savings use the two assumptions on the Savings card."
    >
      <select
        class="ar-field__input vi__line"
        aria-label="Phone number or line"
        (change)="channelId.set($any($event.target).value || null)"
      >
        <option value="" [selected]="!channelId()">All numbers and lines</option>
        @for (c of channels(); track c.id) {
          <option [value]="c.id" [selected]="c.id === channelId()">
            {{ c.verifiedName }} · {{ c.displayPhoneNumber }}
          </option>
        }
      </select>
      <ar-period-picker [comparable]="false" />
      <button
        ar-button
        type="button"
        variant="ghost"
        [disabled]="busy() || !report()"
        (click)="download('pdf')"
      >
        PDF
      </button>
      <button
        ar-button
        type="button"
        variant="ghost"
        [disabled]="busy() || !report()"
        (click)="download('csv')"
      >
        CSV
      </button>
    </ar-topbar>

    <div class="vi ar-scroll" [attr.aria-busy]="busy()">
      @if (error()) {
        <div class="vi__alert" role="alert">
          <ar-icon name="alert" [size]="16" />
          <span>{{ error() }}</span>
          <button type="button" class="vi__retry" (click)="load()">Try again</button>
        </div>
      }

      @if (report(); as r) {
        <section class="vi__tiles" aria-label="Summary">
          <ar-stat-tile
            label="AI calls"
            [value]="r.calls"
            [note]="r.minutes + ' min · ' + duration(r.averageSeconds) + ' average'"
          />
          <ar-stat-tile
            label="Resolved by AI"
            [value]="percent(r.handledByAi, r.calls)"
            [note]="r.handledByAi + ' of ' + r.calls + ' without a person'"
            tone="good"
          />
          <ar-stat-tile
            label="Goal met"
            [value]="percent(r.goalMet, r.goalEvaluated)"
            [note]="
              r.goalEvaluated
                ? r.goalMet + ' of ' + r.goalEvaluated + ' calls with a goal'
                : 'No call had a goal set'
            "
          />
          <ar-stat-tile
            label="Meetings and leads"
            [value]="r.meetingsBooked + r.leads"
            [note]="r.meetingsBooked + ' meetings · ' + r.leads + ' leads'"
            tone="teal"
          />
          <ar-stat-tile
            label="AI cost"
            [value]="rupees(r.costPaise)"
            [note]="rupees(r.costPerCallPaise) + ' a call'"
          />
          <ar-stat-tile
            label="Estimated saving"
            [value]="rupees(r.netSavingPaise)"
            [note]="
              r.netSavingPaise < 0
                ? 'AI cost more than the staff time'
                : 'Staff time saved, less AI cost'
            "
            [tone]="r.netSavingPaise < 0 ? 'bad' : 'good'"
          />
        </section>

        @if (r.calls === 0) {
          <ar-card>
            <div class="vi__empty">
              <ar-icon name="phone" [size]="28" />
              <h2>No AI calls in this period</h2>
              <p>
                Choose a longer period or another line. Calls appear here once an AI voice agent
                answers or places them.
              </p>
            </div>
          </ar-card>
        } @else {
          <div class="vi__cols">
            <ar-card heading="Savings">
              <div class="vi__sum" aria-label="How the saving is worked out">
                <div class="vi__sum-row">
                  <span>Staff time the AI took on</span>
                  <strong>{{ r.staffHours }} h</strong>
                </div>
                <div class="vi__sum-row">
                  <span>Cost of that staff time</span>
                  <strong>{{ rupees(r.staffCostPaise) }}</strong>
                </div>
                <div class="vi__sum-row">
                  <span>Less AI cost</span>
                  <strong>− {{ rupees(r.costPaise) }}</strong>
                </div>
                <div
                  class="vi__sum-row vi__sum-row--total"
                  [class.vi__sum-row--loss]="r.netSavingPaise < 0"
                >
                  <span>Estimated saving</span>
                  <strong>{{ rupees(r.netSavingPaise) }}</strong>
                </div>
              </div>
              <div class="vi__assume">
                <span class="ar-label">Assumptions</span>
                <div class="vi__assume-row">
                  <label class="ar-field">
                    <span class="ar-field__label">Person time per call (min)</span>
                    <input
                      class="ar-field__input"
                      type="number"
                      min="1"
                      max="60"
                      [value]="minutesPerCall()"
                      (change)="setMinutes(+$any($event.target).value)"
                    />
                  </label>
                  <label class="ar-field">
                    <span class="ar-field__label">Staff cost per hour (₹)</span>
                    <input
                      class="ar-field__input"
                      type="number"
                      min="0"
                      max="100000"
                      [value]="costPerHour()"
                      (change)="setCost(+$any($event.target).value)"
                    />
                  </label>
                </div>
                <p class="vi__hint">
                  Counted only for calls the AI completed to the end. AI cost is what the voice
                  providers recorded.
                </p>
              </div>
            </ar-card>

            <ar-card heading="Where the calls came from">
              <ul class="vi__bars">
                @for (b of channelBars(); track b.label) {
                  <li class="vi__bar">
                    <span class="vi__bar-label">{{ b.label }}</span>
                    <span class="vi__bar-track"
                      ><span
                        [class]="'vi__bar-fill vi__bar-fill--' + b.tone"
                        [style.width.%]="b.share"
                      ></span
                    ></span>
                    <span class="vi__bar-value">{{ b.value }}</span>
                    <span class="vi__bar-share">{{ b.share }}%</span>
                  </li>
                }
              </ul>
              <p class="vi__hint">
                {{ r.outboundCalls }} of these were outbound calls placed by the AI (campaigns and
                call batches).
              </p>
            </ar-card>

            <ar-card heading="How the calls ended">
              <ul class="vi__bars">
                @for (b of outcomeBars(); track b.label) {
                  <li class="vi__bar">
                    <span class="vi__bar-label">{{ b.label }}</span>
                    <span class="vi__bar-track"
                      ><span
                        [class]="'vi__bar-fill vi__bar-fill--' + b.tone"
                        [style.width.%]="b.share"
                      ></span
                    ></span>
                    <span class="vi__bar-value">{{ b.value }}</span>
                    <span class="vi__bar-share">{{ b.share }}%</span>
                  </li>
                }
              </ul>
            </ar-card>

            <ar-card heading="Customer sentiment">
              @if (sentimentTotal() > 0) {
                <div class="vi__stack" role="img" [attr.aria-label]="sentimentLabel()">
                  @for (s of sentiment(); track s.label) {
                    @if (s.value > 0) {
                      <span
                        [class]="'vi__stack-part vi__bar-fill--' + s.tone"
                        [style.flex-grow]="s.value"
                      ></span>
                    }
                  }
                </div>
                <ul class="vi__legend">
                  @for (s of sentiment(); track s.label) {
                    <li>
                      <span [class]="'vi__dot vi__bar-fill--' + s.tone"></span>
                      <span>{{ s.label }}</span>
                      <strong>{{ s.value }}</strong>
                      <small>{{ s.share }}%</small>
                    </li>
                  }
                </ul>
              } @else {
                <p class="vi__hint">No call in this period has a sentiment yet.</p>
              }
            </ar-card>
          </div>

          <ar-card heading="What the AI did on calls">
            <ul class="vi__actions">
              @for (a of actions(); track a.label) {
                <li class="vi__action">
                  <span class="vi__action-icon"><ar-icon [name]="a.icon" [size]="16" /></span>
                  <strong>{{ a.value }}</strong>
                  <span>{{ a.label }}</span>
                </li>
              }
            </ul>
          </ar-card>

          @if (r.agents.length > 0) {
            <ar-card heading="By voice agent">
              <ejs-grid
                arGrid="voice-impact-agents"
                [dataSource]="r.agents"
                aria-label="Results by voice agent"
              >
                <e-columns>
                  <e-column field="agent" headerText="Agent" width="220">
                    <ng-template #template let-a>
                      <span class="vi__agent" translate="no">{{ a.agent }}</span>
                    </ng-template>
                  </e-column>
                  <e-column field="calls" headerText="Calls" width="110" textAlign="Right" />
                  <e-column field="minutes" headerText="Minutes" width="120" textAlign="Right" />
                  <e-column headerText="Goal met" width="220">
                    <ng-template #template let-a>
                      @if (a.goalEvaluated) {
                        <div class="vi__goal">
                          <ar-meter
                            [value]="share(a.goalMet, a.goalEvaluated)"
                            tone="good"
                            [thickness]="6"
                            [label]="'Goal met ' + percent(a.goalMet, a.goalEvaluated)"
                          />
                          <span>{{ percent(a.goalMet, a.goalEvaluated) }}</span>
                          <small>{{ a.goalMet }}/{{ a.goalEvaluated }}</small>
                        </div>
                      } @else {
                        <span class="vi__muted">No goal set</span>
                      }
                    </ng-template>
                  </e-column>
                  <e-column field="costPaise" headerText="AI cost" width="130" textAlign="Right">
                    <ng-template #template let-a>
                      <span class="vi__num">{{ rupees(a.costPaise) }}</span>
                    </ng-template>
                  </e-column>
                </e-columns>
              </ejs-grid>
            </ar-card>
          }
        }
      } @else if (busy()) {
        <section class="vi__tiles" aria-hidden="true">
          @for (i of skeletons; track i) {
            <div class="vi__skeleton"></div>
          }
        </section>
      }
    </div>
  `,
  styles: `
    .vi {
      flex: 1;
      min-height: 0;
      padding: 18px 24px 32px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .vi > ar-card {
      display: block;
      min-width: 0;
    }
    .vi__line {
      width: auto;
      max-width: 240px;
      height: 32px;
      font-size: 12.5px;
    }
    .vi__alert {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: var(--ar-red-100);
      border: 1px solid var(--ar-red-200);
      border-radius: var(--ar-radius-control);
      color: var(--ar-bad-600);
      font: 500 13px var(--ar-font-sans);
    }
    .vi__retry {
      margin-left: auto;
      background: none;
      border: 0;
      cursor: pointer;
      font: 600 12.5px var(--ar-font-sans);
      color: var(--ar-bad-600);
      text-decoration: underline;
    }
    .vi__tiles {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 12px;
    }
    .vi__skeleton {
      height: 92px;
      border-radius: var(--ar-radius-card);
      background: linear-gradient(90deg, var(--ar-bg-100), var(--ar-bg-50), var(--ar-bg-100));
      background-size: 200% 100%;
      animation: vi-shimmer 1.2s ease-in-out infinite;
    }
    @keyframes vi-shimmer {
      to {
        background-position: -200% 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .vi__skeleton {
        animation: none;
      }
    }
    .vi__cols {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }
    .vi__cols ar-card {
      display: block;
      min-width: 0;
    }

    .vi__sum {
      display: flex;
      flex-direction: column;
      gap: 8px;
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .vi__sum-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }
    .vi__sum-row strong {
      font-weight: 600;
      color: var(--ar-ink-900);
      font-variant-numeric: tabular-nums;
    }
    .vi__sum-row--total {
      margin-top: 2px;
      padding-top: 10px;
      border-top: 1px solid var(--ar-line-200);
      align-items: baseline;
    }
    .vi__sum-row--total span {
      font-weight: 600;
      color: var(--ar-ink-900);
    }
    .vi__sum-row--total strong {
      font-size: 20px;
      color: var(--ar-good-700);
    }
    .vi__sum-row--loss strong {
      color: var(--ar-bad-600);
    }
    .vi__assume {
      margin-top: 16px;
      padding: 12px;
      border-radius: var(--ar-radius-control);
      background: var(--ar-bg-50);
      border: 1px solid var(--ar-line-100);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .vi__assume-row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .vi__assume-row .ar-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .vi__hint {
      margin: 10px 0 0;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
      line-height: 1.45;
    }
    .vi__assume .vi__hint {
      margin: 0;
    }

    .vi__bars {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .vi__bar {
      display: grid;
      grid-template-columns: 140px minmax(0, 1fr) 48px 40px;
      gap: 10px;
      align-items: center;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .vi__bar-track {
      height: 8px;
      border-radius: 999px;
      background: var(--ar-bg-100);
      overflow: hidden;
    }
    .vi__bar-fill {
      display: block;
      height: 100%;
      border-radius: 999px;
      min-width: 2px;
    }
    .vi__bar-value {
      text-align: right;
      font-weight: 600;
      color: var(--ar-ink-900);
      font-variant-numeric: tabular-nums;
    }
    .vi__bar-share {
      text-align: right;
      color: var(--ar-ink-400);
      font-variant-numeric: tabular-nums;
    }
    .vi__bar-fill--blue {
      background: var(--ar-blue-500);
    }
    .vi__bar-fill--teal {
      background: var(--ar-teal-500);
    }
    .vi__bar-fill--good {
      background: var(--ar-good-600);
    }
    .vi__bar-fill--amber {
      background: var(--ar-amber-500);
    }
    .vi__bar-fill--bad {
      background: var(--ar-bad-600);
    }
    .vi__bar-fill--ink {
      background: var(--ar-ink-300);
    }

    .vi__stack {
      display: flex;
      gap: 2px;
      height: 14px;
      border-radius: 999px;
      overflow: hidden;
    }
    .vi__stack-part {
      flex-basis: 0;
      min-width: 4px;
    }
    .vi__legend {
      list-style: none;
      margin: 14px 0 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .vi__legend li {
      display: grid;
      grid-template-columns: 10px minmax(0, 1fr) auto 40px;
      gap: 10px;
      align-items: center;
    }
    .vi__legend strong {
      font-weight: 600;
      color: var(--ar-ink-900);
      font-variant-numeric: tabular-nums;
    }
    .vi__legend small {
      text-align: right;
      color: var(--ar-ink-400);
    }
    .vi__dot {
      width: 10px;
      height: 10px;
      border-radius: 3px;
    }

    .vi__actions {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
      gap: 10px;
    }
    .vi__action {
      display: grid;
      grid-template-columns: 32px minmax(0, 1fr);
      grid-template-rows: auto auto;
      column-gap: 10px;
      align-items: center;
      padding: 10px 12px;
      border: 1px solid var(--ar-line-100);
      border-radius: var(--ar-radius-control);
      background: var(--ar-bg-50);
    }
    .vi__action-icon {
      grid-row: span 2;
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      border-radius: 8px;
      background: var(--ar-blue-100);
      color: var(--ar-blue-700);
    }
    .vi__action strong {
      font: 600 18px var(--ar-font-sans);
      color: var(--ar-ink-900);
      line-height: 1.1;
      font-variant-numeric: tabular-nums;
    }
    .vi__action span:last-child {
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }

    .vi__agent {
      font-weight: 500;
    }
    .vi__goal {
      display: grid;
      grid-template-columns: minmax(60px, 1fr) 40px auto;
      gap: 8px;
      align-items: center;
      font-variant-numeric: tabular-nums;
    }
    .vi__goal small,
    .vi__muted {
      color: var(--ar-ink-400);
      font-size: 12px;
    }
    .vi__num {
      font-variant-numeric: tabular-nums;
    }

    .vi__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 32px 16px;
      text-align: center;
      color: var(--ar-ink-400);
    }
    .vi__empty h2 {
      margin: 6px 0 0;
      font: 600 15px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .vi__empty p {
      margin: 0;
      max-width: 420px;
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }

    @media (max-width: 960px) {
      .vi__cols {
        grid-template-columns: minmax(0, 1fr);
      }
    }
    @media (max-width: 640px) {
      .vi {
        padding: 14px 16px 24px;
      }
      .vi__bar {
        grid-template-columns: 100px minmax(0, 1fr) 40px 36px;
      }
      .vi__assume-row {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class ArVoiceImpact {
  private readonly api = inject(VoiceImpactService);
  private readonly channelsApi = inject(ChannelService);
  protected readonly period = inject(ReportPeriodStore);

  protected readonly skeletons = [1, 2, 3, 4, 5, 6];
  protected readonly channels = signal<ChannelDto[]>([]);
  protected readonly channelId = signal<string | null>(null);
  protected readonly minutesPerCall = signal(6);
  protected readonly costPerHour = signal(300);
  protected readonly report = signal<VoiceImpactReport | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  /** The report's input: the shared period, the line and the two assumptions. */
  private readonly input = computed<VoiceImpactInput>(() => ({
    fromDate: this.period.dates().from,
    toDate: this.period.dates().to,
    channelId: this.channelId(),
    handlingMinutesPerCall: this.minutesPerCall(),
    staffCostPerHourRupees: this.costPerHour(),
  }));

  private seq = 0;

  constructor() {
    void this.loadChannels();
    // Reload whenever the period, the line or an assumption changes.
    effect(() => {
      const input = this.input();
      untracked(() => void this.load(input));
    });
  }

  protected readonly channelBars = computed<Bar[]>(() => {
    const r = this.report();
    if (!r) return [];
    const bars: Omit<Bar, 'share'>[] = [
      { label: 'WhatsApp', value: r.whatsAppCalls, tone: 'good' },
      { label: 'Phone', value: r.phoneCalls, tone: 'blue' },
      { label: 'Website', value: r.websiteCalls, tone: 'teal' },
      { label: 'SIP trunk', value: r.sipCalls, tone: 'ink' },
    ];
    return bars.map((b) => ({ ...b, share: shareOf(b.value, r.calls) }));
  });

  protected readonly outcomeBars = computed<Bar[]>(() => {
    const r = this.report();
    if (!r) return [];
    const bars: Omit<Bar, 'share'>[] = [
      { label: 'Resolved by AI', value: r.handledByAi, tone: 'good' },
      { label: 'Handed to a person', value: r.handedToPeople, tone: 'amber' },
      { label: 'Asked not to be called', value: r.optOuts, tone: 'bad' },
    ];
    return bars.map((b) => ({ ...b, share: shareOf(b.value, r.calls) }));
  });

  protected readonly sentimentTotal = computed(() => {
    const r = this.report();
    return r ? r.positive + r.neutral + r.negative : 0;
  });

  protected readonly sentiment = computed<Bar[]>(() => {
    const r = this.report();
    const total = this.sentimentTotal();
    if (!r) return [];
    const bars: Omit<Bar, 'share'>[] = [
      { label: 'Positive', value: r.positive, tone: 'good' },
      { label: 'Neutral', value: r.neutral, tone: 'ink' },
      { label: 'Negative', value: r.negative, tone: 'bad' },
    ];
    return bars.map((b) => ({ ...b, share: shareOf(b.value, total) }));
  });

  protected readonly sentimentLabel = computed(() =>
    this.sentiment()
      .map((s) => `${s.label} ${s.value} (${s.share}%)`)
      .join(', '),
  );

  protected readonly actions = computed<{ label: string; value: number; icon: IconName }[]>(() => {
    const r = this.report();
    if (!r) return [];
    return [
      { label: 'Meetings booked', value: r.meetingsBooked, icon: ACTION_ICONS.meetings },
      { label: 'Leads created', value: r.leads, icon: ACTION_ICONS.leads },
      { label: 'CRM records updated', value: r.crmUpdates, icon: ACTION_ICONS.crm },
      { label: 'Tickets raised', value: r.ticketsRaised, icon: ACTION_ICONS.tickets },
      { label: 'WhatsApp follow-ups', value: r.followUpsSent, icon: ACTION_ICONS.followUps },
      { label: 'Payment links sent', value: r.paymentLinksSent, icon: ACTION_ICONS.payments },
      { label: 'Custom functions run', value: r.functionsRun, icon: ACTION_ICONS.functions },
    ];
  });

  private async loadChannels(): Promise<void> {
    try {
      const page = await firstValueFrom(this.channelsApi.getList({ maxResultCount: 100 } as never));
      this.channels.set(page.items ?? []);
    } catch {
      this.channels.set([]);
    }
  }

  protected setMinutes(value: number): void {
    if (value >= 1 && value <= 60) this.minutesPerCall.set(value);
  }

  protected setCost(value: number): void {
    if (value >= 0 && value <= 100_000) this.costPerHour.set(value);
  }

  protected async load(input: VoiceImpactInput = this.input()): Promise<void> {
    const seq = ++this.seq;
    this.busy.set(true);
    this.error.set('');
    try {
      const report = await firstValueFrom(this.api.get(input));
      if (seq === this.seq) this.report.set(report);
    } catch {
      if (seq === this.seq) {
        this.error.set('The report could not be made. Choose a period of up to a year.');
      }
    } finally {
      if (seq === this.seq) this.busy.set(false);
    }
  }

  protected async download(format: 'pdf' | 'csv'): Promise<void> {
    if (this.busy()) return;
    const input = this.input();
    this.busy.set(true);
    try {
      const blob = await firstValueFrom(this.api.export(input, format));
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ai-impact-${input.fromDate}-to-${input.toDate}.${format}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      this.error.set('The file could not be made.');
    } finally {
      this.busy.set(false);
    }
  }

  protected share(part: number, whole: number): number {
    return shareOf(part, whole);
  }

  protected percent(part: number, whole: number): string {
    return whole === 0 ? '–' : `${shareOf(part, whole)}%`;
  }

  /** 95 → "1m 35s". */
  protected duration(seconds: number): string {
    const s = Math.round(seconds);
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
  }

  protected rupees(paise: number): string {
    const value = Math.abs(paise) / 100;
    return (paise < 0 ? '−₹' : '₹') + value.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }
}
