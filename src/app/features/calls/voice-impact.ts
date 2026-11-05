import { RestService } from '@abp/ng.core';
import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ArTopbar } from '../../layout/topbar';
import { ChannelService } from '../../proxy/channels/channel.service';
import { ChannelDto } from '../../proxy/channels/models';
import { ArButton } from '../../ui/button';
import { ArIcon } from '../../ui/icon';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { ArDateInput, ArGrid, ArSelect } from '../../ui';

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

/** yyyy-MM-dd of a local date. */
function day(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * What the AI voice agents did over a period: calls, outcomes, actions, leads, AI cost and the staff time those calls would have
 * taken. For a pilot's impact report or any month; the staff figures come from the two numbers entered here.
 */
@Component({
  selector: 'ar-voice-impact',
  imports: [FormsModule, ArTopbar, ArButton, ArIcon, ArGrid, GridModule, ArDateInput, ArSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="AI impact report"
      help="What your AI voice agents did, what it cost and the staff time it saved."
    />
    <main class="vi">
      <!-- Filter Parameters Card -->
      <section class="vi__filter-card" aria-label="Report Parameters">
        <form class="vi__form" (submit)="$event.preventDefault(); load()">
          <label class="ar-field">
            <span class="ar-field__label">From Date</span>
            <input class="ar-field__input" type="date" name="from" [(ngModel)]="input.fromDate" />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">To Date</span>
            <input class="ar-field__input" type="date" name="to" [(ngModel)]="input.toDate" />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Phone Number</span>
            <select class="ar-field__input" name="channel" [(ngModel)]="input.channelId">
              <option [ngValue]="null">All Numbers & Lines</option>
              @for (c of channels(); track c.id) {
                <option [ngValue]="c.id">{{ c.verifiedName }} · {{ c.displayPhoneNumber }}</option>
              }
            </select>
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Person time per call (mins)</span>
            <input
              class="ar-field__input"
              type="number"
              name="minutes"
              min="1"
              max="60"
              [(ngModel)]="input.handlingMinutesPerCall"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Staff cost per hour (₹)</span>
            <input
              class="ar-field__input"
              type="number"
              name="cost"
              min="0"
              max="100000"
              [(ngModel)]="input.staffCostPerHourRupees"
            />
          </label>
          <div class="vi__actions">
            <button ar-button type="submit" variant="primary" [disabled]="busy()">
              {{ busy() ? 'Generating…' : 'Generate Report' }}
            </button>
            <button
              ar-button
              type="button"
              variant="ghost"
              [disabled]="busy() || !report()"
              (click)="download('pdf')"
            >
              Export PDF
            </button>
            <button
              ar-button
              type="button"
              variant="ghost"
              [disabled]="busy() || !report()"
              (click)="download('csv')"
            >
              Export CSV
            </button>
          </div>
        </form>
      </section>

      @if (error()) {
        <div class="vi__alert" role="alert">
          <ar-icon name="alert" />
          <span>{{ error() }}</span>
        </div>
      }

      @if (report(); as r) {
        <!-- Executive KPI Strip -->
        <section class="vi__tiles" aria-label="Executive KPI Summary">
          <div class="vi__tile">
            <span class="vi__value" translate="no">{{ r.calls }}</span
            >AI calls
            <small translate="no">{{ r.minutes }} min · {{ r.handledByAi }} AI completed</small>
          </div>
          <div class="vi__tile">
            <span class="vi__value" translate="no">{{ percent(r.goalMet, r.goalEvaluated) }}</span
            >goal met
            <small translate="no">{{ r.goalMet }} / {{ r.goalEvaluated }}</small>
          </div>
          <div class="vi__tile">
            <span class="vi__value" translate="no">{{ r.meetingsBooked + r.leads }}</span
            >meetings and leads
            <small translate="no">{{ r.meetingsBooked }} mtgs · {{ r.leads }} leads</small>
          </div>
          <div class="vi__tile">
            <span class="vi__value" translate="no">{{ rupees(r.costPaise) }}</span
            >AI cost
            <small translate="no">{{ rupees(r.costPerCallPaise) }} a call</small>
          </div>
          <div class="vi__tile">
            <span class="vi__value" translate="no">{{ r.staffHours }} h</span>staff time
            <small translate="no">{{ rupees(r.staffCostPaise) }}</small>
          </div>
          <div class="vi__tile" [class.vi__loss]="r.netSavingPaise < 0">
            <span class="vi__value" translate="no">{{ rupees(r.netSavingPaise) }}</span
            >estimated saving
            <small translate="no">Net estimated benefit</small>
          </div>
        </section>

        <!-- Metrics Grid -->
        <div class="vi__content-grid">
          <!-- Call Volume & Channel Breakdown -->
          <section class="vi__card">
            <h2 class="vi__card-title">Call Channels & Routing</h2>
            <div class="metric-list">
              <div class="metric-row">
                <span class="metric-row__label">Channel Mix (WhatsApp / Web / Phone / SIP)</span>
                <span class="metric-row__val" translate="no">
                  {{ r.whatsAppCalls }} / {{ r.websiteCalls }} / {{ r.phoneCalls }} /
                  {{ r.sipCalls }}
                </span>
              </div>
              <div class="metric-row">
                <span class="metric-row__label">Outbound Campaign Calls Placed</span>
                <span class="metric-row__val" translate="no">{{ r.outboundCalls }}</span>
              </div>
              <div class="metric-row">
                <span class="metric-row__label"
                  >Fully Resolved by AI (without agent intervention)</span
                >
                <span class="metric-row__val text-good" translate="no">{{ r.handledByAi }}</span>
              </div>
              <div class="metric-row">
                <span class="metric-row__label">Escalated / Handed to Human Staff</span>
                <span class="metric-row__val" translate="no">{{ r.handedToPeople }}</span>
              </div>
              <div class="metric-row">
                <span class="metric-row__label">Opt-Out Requests Received</span>
                <span class="metric-row__val" translate="no">{{ r.optOuts }}</span>
              </div>
            </div>
          </section>

          <!-- Customer Sentiment & Actions Executed -->
          <section class="vi__card">
            <h2 class="vi__card-title">Sentiment & Downstream Actions</h2>
            <div class="metric-list">
              <div class="metric-row">
                <span class="metric-row__label">Sentiment (Positive / Neutral / Negative)</span>
                <span class="metric-row__val" translate="no">
                  <span class="sentiment-pill positive">{{ r.positive }}</span> /
                  <span class="sentiment-pill neutral">{{ r.neutral }}</span> /
                  <span class="sentiment-pill negative">{{ r.negative }}</span>
                </span>
              </div>
              <div class="metric-row">
                <span class="metric-row__label">Meetings Automatically Scheduled</span>
                <span class="metric-row__val text-teal" translate="no">{{ r.meetingsBooked }}</span>
              </div>
              <div class="metric-row">
                <span class="metric-row__label">New CRM Leads Created</span>
                <span class="metric-row__val text-good" translate="no">{{ r.leads }}</span>
              </div>
              <div class="metric-row">
                <span class="metric-row__label">CRM Contact / Account Updates</span>
                <span class="metric-row__val" translate="no">{{ r.crmUpdates }}</span>
              </div>
              <div class="metric-row">
                <span class="metric-row__label">Support Tickets Opened</span>
                <span class="metric-row__val" translate="no">{{ r.ticketsRaised }}</span>
              </div>
              <div class="metric-row">
                <span class="metric-row__label">WhatsApp Follow-up Messages Sent</span>
                <span class="metric-row__val" translate="no">{{ r.followUpsSent }}</span>
              </div>
              <div class="metric-row">
                <span class="metric-row__label">Payment Links Dispatched</span>
                <span class="metric-row__val" translate="no">{{ r.paymentLinksSent }}</span>
              </div>
              <div class="metric-row">
                <span class="metric-row__label">Custom Voice Functions Executed</span>
                <span class="metric-row__val" translate="no">{{ r.functionsRun }}</span>
              </div>
            </div>
          </section>
        </div>

        @if (r.agents.length > 0) {
          <!-- Agent Breakdown Table adhering to modern-web-guidance responsive-table -->
          <section class="vi__agent-table-card">
            <div class="table-card__head">
              <h2 class="table-card__title">Performance by Voice Agent</h2>
            </div>
            <ejs-grid
              arGrid="voice-impact-agents"
              [dataSource]="r.agents"
              aria-label="Performance Breakdown by Agent"
            >
              <e-columns>
                <e-column field="agent" headerText="Agent Persona" width="220">
                  <ng-template #template let-a>
                    <span class="font-medium" translate="no">{{ a.agent }}</span>
                  </ng-template>
                </e-column>
                <e-column field="calls" headerText="Total Calls" width="130" [textAlign]="'Right'">
                  <ng-template #template let-a>
                    <span class="font-mono" translate="no">{{ a.calls }}</span>
                  </ng-template>
                </e-column>
                <e-column field="minutes" headerText="Duration (min)" width="140" [textAlign]="'Right'">
                  <ng-template #template let-a>
                    <span class="font-mono" translate="no">{{ a.minutes }}</span>
                  </ng-template>
                </e-column>
                <e-column headerText="Goal Met Rate" width="180" [textAlign]="'Right'">
                  <ng-template #template let-a>
                    <div class="font-mono" translate="no">
                      @if (a.goalEvaluated) {
                        <span class="goal-pill">{{ percent(a.goalMet, a.goalEvaluated) }}</span>
                        <span class="text-muted"> ({{ a.goalMet }}/{{ a.goalEvaluated }})</span>
                      } @else {
                        <span class="text-muted">–</span>
                      }
                    </div>
                  </ng-template>
                </e-column>
                <e-column field="costPaise" headerText="AI Cost" width="140" [textAlign]="'Right'">
                  <ng-template #template let-a>
                    <span class="font-mono font-medium" translate="no">
                      {{ rupees(a.costPaise) }}
                    </span>
                  </ng-template>
                </e-column>
              </e-columns>
            </ejs-grid>
          </section>
        }

        <p class="vi__footnote">
          * Staff time savings are calculated from the handling minutes and hourly wage entered
          above for calls the AI completed to end. AI costs reflect recorded provider consumption.
        </p>
      }
    </main>
  `,
  styles: `
    .vi {
      padding: 24px 32px;
      display: grid;
      gap: 24px;
      max-width: 1440px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
    }

    .vi__filter-card {
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card, 10px);
      padding: 20px 24px;
      box-shadow: var(--ar-shadow-card, 0 1px 3px rgba(0, 0, 0, 0.05));
    }

    .vi__form {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      align-items: flex-end;
    }

    .vi__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      padding-bottom: 2px;
    }

    .vi__alert {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: #fef3f2;
      border: 1px solid #fecdca;
      border-radius: 6px;
      color: #b42318;
      font-size: 0.875rem;
    }

    .vi__tiles {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
    }

    .vi__tile {
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card, 10px);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      box-shadow: var(--ar-shadow-card, 0 1px 3px rgba(0, 0, 0, 0.05));
      font-size: 0.85rem;
      color: var(--ar-ink-500);
      transition:
        transform 0.15s ease,
        box-shadow 0.15s ease;
    }

    .vi__tile:hover {
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
    }

    .vi__value {
      font: 700 1.6rem var(--ar-font-sans);
      color: var(--ar-ink-900);
      line-height: 1.1;
    }

    .vi__tile small {
      color: var(--ar-ink-400);
      font-size: 0.75rem;
      margin-top: 2px;
    }

    .vi__loss .vi__value {
      color: #b42318;
    }

    .vi__content-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 20px;
    }

    .vi__card {
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card, 10px);
      padding: 20px;
      box-shadow: var(--ar-shadow-card, 0 1px 3px rgba(0, 0, 0, 0.05));
    }

    .vi__card-title {
      font: 600 1.05rem var(--ar-font-sans);
      color: var(--ar-ink-900);
      margin: 0 0 16px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--ar-line-200);
    }

    .metric-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .metric-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      font-size: 0.875rem;
    }

    .metric-row__label {
      color: var(--ar-ink-700);
    }

    .metric-row__val {
      font-weight: 600;
      color: var(--ar-ink-900);
    }

    .text-good {
      color: #027a48;
    }

    .text-teal {
      color: #0a776f;
    }

    .sentiment-pill {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 0.8rem;
    }

    .sentiment-pill.positive {
      background: #ecfdf3;
      color: #027a48;
    }

    .sentiment-pill.neutral {
      background: #f2f4f7;
      color: #344054;
    }

    .sentiment-pill.negative {
      background: #fef3f2;
      color: #b42318;
    }

    .vi__agent-table-card {
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card, 10px);
      padding: 20px;
      box-shadow: var(--ar-shadow-card, 0 1px 3px rgba(0, 0, 0, 0.05));
    }

    .table-card__head {
      margin-bottom: 16px;
    }

    .table-card__title {
      font: 600 1.05rem var(--ar-font-sans);
      color: var(--ar-ink-900);
      margin: 0;
    }

    .ar-table-responsive {
      overflow-x: auto;
      border: 1px solid var(--ar-line-200);
      border-radius: 6px;
    }

    .ar-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;

      thead th {
        position: sticky;
        top: 0;
        background: var(--ar-bg-50);
        color: var(--ar-ink-700);
        font-weight: 600;
        text-align: start;
        padding: 10px 14px;
        border-bottom: 1px solid var(--ar-line-200);
        white-space: nowrap;
        z-index: 1;
      }

      tbody td,
      tbody th {
        padding: 10px 14px;
        border-bottom: 1px solid var(--ar-line-200);
        color: var(--ar-ink-900);
        text-align: start;
      }

      tbody tr:last-child td,
      tbody tr:last-child th {
        border-bottom: none;
      }

      tbody tr:hover {
        background: var(--ar-bg-50);
      }
    }

    .goal-pill {
      font-weight: 600;
      color: #027a48;
    }

    .text-right {
      text-align: right !important;
    }

    .font-mono {
      font-family: var(--ar-font-mono, monospace);
    }

    .font-medium {
      font-weight: 500;
    }

    .text-muted {
      color: var(--ar-ink-400);
      font-size: 0.8rem;
    }

    .vi__footnote {
      margin: 0;
      color: var(--ar-ink-400);
      font-size: 0.82rem;
      line-height: 1.4;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
  `,
})
export class ArVoiceImpact implements OnInit {
  private readonly api = inject(VoiceImpactService);
  private readonly channelsApi = inject(ChannelService);
  protected readonly channels = signal<ChannelDto[]>([]);
  protected readonly report = signal<VoiceImpactReport | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly input: VoiceImpactInput = {
    fromDate: day(new Date(Date.now() - 29 * 86_400_000)),
    toDate: day(new Date()),
    channelId: null,
    handlingMinutesPerCall: 6,
    staffCostPerHourRupees: 300,
  };

  async ngOnInit(): Promise<void> {
    try {
      const page = await firstValueFrom(this.channelsApi.getList({ maxResultCount: 100 } as never));
      this.channels.set((page.items ?? []).filter((c) => c.provider === 0));
    } catch {
      this.channels.set([]);
    }
    await this.load();
  }

  protected async load(): Promise<void> {
    if (this.busy()) return;
    if (!this.input.fromDate || !this.input.toDate || this.input.toDate < this.input.fromDate) {
      this.error.set('Choose a start date and an end date on or after it.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      this.report.set(await firstValueFrom(this.api.get(this.input)));
    } catch {
      this.error.set('The report could not be made. Choose a period of up to a year.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async download(format: 'pdf' | 'csv'): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const blob = await firstValueFrom(this.api.export(this.input, format));
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ai-impact-${this.input.fromDate}-to-${this.input.toDate}.${format}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      this.error.set('The file could not be made.');
    } finally {
      this.busy.set(false);
    }
  }

  protected percent(part: number, whole: number): string {
    return whole === 0 ? '–' : `${Math.round((100 * part) / whole)}%`;
  }

  protected rupees(paise: number): string {
    const value = Math.abs(paise) / 100;
    return (paise < 0 ? '−₹' : '₹') + value.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }
}
