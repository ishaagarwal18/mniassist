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
  imports: [FormsModule, ArTopbar, ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="AI impact report"
      help="What your AI voice agents did, what it cost and the staff time it saved."
    />
    <main class="vi">
      <form class="vi__form" (submit)="$event.preventDefault(); load()">
        <label class="ar-field"
          ><span class="ar-field__label">From</span>
          <input class="ar-field__input" type="date" name="from" [(ngModel)]="input.fromDate" />
        </label>
        <label class="ar-field"
          ><span class="ar-field__label">To</span>
          <input class="ar-field__input" type="date" name="to" [(ngModel)]="input.toDate" />
        </label>
        <label class="ar-field"
          ><span class="ar-field__label">Number</span>
          <select class="ar-field__input" name="channel" [(ngModel)]="input.channelId">
            <option [ngValue]="null">All</option>
            @for (c of channels(); track c.id) {
              <option [ngValue]="c.id">{{ c.verifiedName }} · {{ c.displayPhoneNumber }}</option>
            }
          </select></label
        >
        <label class="ar-field"
          ><span class="ar-field__label">Minutes a person takes per call</span>
          <input
            class="ar-field__input"
            type="number"
            name="minutes"
            min="1"
            max="60"
            [(ngModel)]="input.handlingMinutesPerCall"
        /></label>
        <label class="ar-field"
          ><span class="ar-field__label">Staff cost per hour (₹)</span>
          <input
            class="ar-field__input"
            type="number"
            name="cost"
            min="0"
            max="100000"
            [(ngModel)]="input.staffCostPerHourRupees"
        /></label>
        <div class="vi__actions">
          <button ar-button type="submit" variant="primary" [disabled]="busy()">
            {{ busy() ? 'Working…' : 'Show' }}
          </button>
          <button
            ar-button
            type="button"
            [disabled]="busy() || !report()"
            (click)="download('pdf')"
          >
            PDF
          </button>
          <button
            ar-button
            type="button"
            [disabled]="busy() || !report()"
            (click)="download('csv')"
          >
            CSV
          </button>
        </div>
      </form>
      @if (error()) {
        <p role="alert" class="vi__err">{{ error() }}</p>
      }
      @if (report(); as r) {
        <section class="vi__tiles" aria-label="Summary">
          <div class="vi__tile">
            <span class="vi__value" translate="no">{{ r.calls }}</span
            >AI calls
            <small translate="no">{{ r.minutes }} min</small>
          </div>
          <div class="vi__tile">
            <span class="vi__value" translate="no">{{ percent(r.goalMet, r.goalEvaluated) }}</span
            >goal met
            <small translate="no">{{ r.goalMet }} / {{ r.goalEvaluated }}</small>
          </div>
          <div class="vi__tile">
            <span class="vi__value" translate="no">{{ r.meetingsBooked + r.leads }}</span
            >meetings and leads
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
          </div>
        </section>
        <div class="vi__scroll">
          <table class="vi__table">
            <tbody>
              <tr>
                <th scope="row">WhatsApp / website / phone / SIP</th>
                <td translate="no">
                  {{ r.whatsAppCalls }} / {{ r.websiteCalls }} / {{ r.phoneCalls }} /
                  {{ r.sipCalls }}
                </td>
              </tr>
              <tr>
                <th scope="row">Calls the agent placed</th>
                <td translate="no">{{ r.outboundCalls }}</td>
              </tr>
              <tr>
                <th scope="row">Handled by the AI to the end</th>
                <td translate="no">{{ r.handledByAi }}</td>
              </tr>
              <tr>
                <th scope="row">Positive / neutral / negative</th>
                <td translate="no">{{ r.positive }} / {{ r.neutral }} / {{ r.negative }}</td>
              </tr>
              <tr>
                <th scope="row">Meetings booked</th>
                <td translate="no">{{ r.meetingsBooked }}</td>
              </tr>
              <tr>
                <th scope="row">Leads opened</th>
                <td translate="no">{{ r.leads }}</td>
              </tr>
              <tr>
                <th scope="row">CRM details saved</th>
                <td translate="no">{{ r.crmUpdates }}</td>
              </tr>
              <tr>
                <th scope="row">Tickets raised</th>
                <td translate="no">{{ r.ticketsRaised }}</td>
              </tr>
              <tr>
                <th scope="row">WhatsApp follow-ups sent</th>
                <td translate="no">{{ r.followUpsSent }}</td>
              </tr>
              <tr>
                <th scope="row">Payment links sent</th>
                <td translate="no">{{ r.paymentLinksSent }}</td>
              </tr>
              <tr>
                <th scope="row">Custom functions run</th>
                <td translate="no">{{ r.functionsRun }}</td>
              </tr>
              <tr>
                <th scope="row">Handed to a person</th>
                <td translate="no">{{ r.handedToPeople }}</td>
              </tr>
              <tr>
                <th scope="row">Asked not to be called</th>
                <td translate="no">{{ r.optOuts }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        @if (r.agents.length > 0) {
          <h2 class="vi__h">By agent</h2>
          <div class="vi__scroll">
            <table class="vi__table">
              <thead>
                <tr>
                  <th scope="col">Agent</th>
                  <th scope="col">Calls</th>
                  <th scope="col">Minutes</th>
                  <th scope="col">Goal met</th>
                  <th scope="col">AI cost</th>
                </tr>
              </thead>
              <tbody>
                @for (a of r.agents; track a.agent) {
                  <tr>
                    <th scope="row" translate="no">{{ a.agent }}</th>
                    <td translate="no">{{ a.calls }}</td>
                    <td translate="no">{{ a.minutes }}</td>
                    <td translate="no">
                      {{ a.goalEvaluated ? a.goalMet + ' / ' + a.goalEvaluated : '–' }}
                    </td>
                    <td translate="no">{{ rupees(a.costPaise) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        <p class="vi__note">
          Staff time is an estimate from the minutes and hourly cost above, for calls the AI handled
          to the end. AI cost is the estimate kept with each call from the platform's rates.
        </p>
      }
    </main>
  `,
  styles: `
    .vi {
      padding: 16px;
      display: grid;
      gap: 14px;
      min-width: 0;
    }
    .vi__form {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 180px), 1fr));
      gap: 8px 12px;
      align-items: end;
    }
    .vi__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .vi__err {
      color: var(--ar-danger-600, #b42318);
    }
    .vi__tiles {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 160px), 1fr));
      gap: 10px;
    }
    .vi__tile {
      display: grid;
      gap: 2px;
      padding: 12px;
      border: 1px solid var(--ar-line-200);
      border-radius: 8px;
      background: var(--ar-surface-100, transparent);
      font-size: 0.9em;
    }
    .vi__value {
      font-size: 1.5em;
      font-weight: 600;
    }
    .vi__tile small {
      color: var(--ar-ink-600);
    }
    .vi__loss .vi__value {
      color: var(--ar-danger-600, #b42318);
    }
    .vi__scroll {
      overflow-x: auto;
    }
    .vi__table {
      width: 100%;
      max-width: 720px;
      border-collapse: collapse;
      font-size: 0.9em;
    }
    .vi__table th,
    .vi__table td {
      border-bottom: 1px solid var(--ar-line-200);
      padding: 6px 8px;
      text-align: start;
    }
    .vi__h {
      margin: 0;
      font-size: 1.05em;
    }
    .vi__note {
      margin: 0;
      color: var(--ar-ink-600);
      font-size: 0.85em;
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
