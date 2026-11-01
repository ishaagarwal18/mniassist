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
import { ArButton } from '../../ui/button';

export interface AiProviderStatus {
  key: string;
  name: string;
  configured: boolean;
  configKey: string;
  inUse: boolean;
}

export interface AiProviderSettings {
  analysisProvider: 'auto' | 'openai' | 'anthropic';
  analysisSource: 'setting' | 'config' | 'default';
  effectiveModel?: string | null;
  providers: AiProviderStatus[];
  /** A voice agent whose speech engine can't start, or fails during a call, switches to the other engine. */
  voiceEngineFallback: boolean;
  /** The engines the call relay can run now ('realtime', 'pipeline'). */
  voiceEngines: string[];
  /** What AI calls cost the platform, for each call's estimated cost. */
  voiceCostRates: VoiceCostRates;
}

/** AI call rates in paise: per million tokens, per minute, or per 1,000 characters spoken. */
export interface VoiceCostRates {
  realtimeInputPerMillion: number;
  realtimeOutputPerMillion: number;
  economyInputPerMillion: number;
  economyOutputPerMillion: number;
  chatInputPerMillion: number;
  chatOutputPerMillion: number;
  speechToTextPerMinute: number;
  textToSpeechPerThousandCharacters: number;
  whatsAppPerMinute: number;
  exotelPerMinute: number;
  sipPerMinute: number;
}

/** The rate fields in the order the page shows them. */
const RATE_FIELDS: { key: keyof VoiceCostRates; label: string; unit: string }[] = [
  {
    key: 'realtimeInputPerMillion',
    label: 'Speech to speech, best quality: input',
    unit: 'per 1M tokens',
  },
  {
    key: 'realtimeOutputPerMillion',
    label: 'Speech to speech, best quality: output',
    unit: 'per 1M tokens',
  },
  {
    key: 'economyInputPerMillion',
    label: 'Speech to speech, lower cost: input',
    unit: 'per 1M tokens',
  },
  {
    key: 'economyOutputPerMillion',
    label: 'Speech to speech, lower cost: output',
    unit: 'per 1M tokens',
  },
  { key: 'chatInputPerMillion', label: 'Speech pipeline chat model: input', unit: 'per 1M tokens' },
  {
    key: 'chatOutputPerMillion',
    label: 'Speech pipeline chat model: output',
    unit: 'per 1M tokens',
  },
  { key: 'speechToTextPerMinute', label: 'Speech to text', unit: 'per minute' },
  {
    key: 'textToSpeechPerThousandCharacters',
    label: 'Text to speech',
    unit: 'per 1,000 characters',
  },
  { key: 'whatsAppPerMinute', label: 'WhatsApp calls you place', unit: 'per minute' },
  { key: 'exotelPerMinute', label: 'Exotel phone line', unit: 'per minute' },
  { key: 'sipPerMinute', label: 'SIP trunk', unit: 'per minute' },
];

@Injectable({ providedIn: 'root' })
export class AiProviderSettingsService {
  private readonly rest = inject(RestService);
  get() {
    return this.rest.request<never, AiProviderSettings>(
      { method: 'GET', url: '/api/auto-reach/ai-provider-settings' },
      { apiName: 'AutoReach' },
    );
  }
  /** A null provider keeps the current analysis choice. */
  update(
    analysisProvider: string | null,
    voiceEngineFallback: boolean,
    voiceCostRates?: VoiceCostRates,
  ) {
    return this.rest.request<unknown, AiProviderSettings>(
      {
        method: 'PUT',
        url: '/api/auto-reach/ai-provider-settings',
        body: { analysisProvider, voiceEngineFallback, voiceCostRates },
      },
      { apiName: 'AutoReach' },
    );
  }
}

/**
 * The platform's AI choices: which model does analysis work (after-call analysis, agent drafting and review), and which provider
 * keys the server holds. Keys are stored in the server's secret storage, never here; this page only says whether each is present.
 */
@Component({
  selector: 'ar-ai-providers',
  imports: [FormsModule, ArTopbar, ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="AI providers"
      help="Which AI models the platform uses, and which provider keys are set."
    />
    <main class="providers">
      @if (error()) {
        <p role="alert">{{ error() }}</p>
      }
      @if (settings(); as s) {
        <section class="card" aria-labelledby="ai-analysis">
          <h2 id="ai-analysis">Analysis model</h2>
          <p>
            Used for after-call analysis, drafting voice agents with AI and reviewing them before
            publishing. If the chosen provider has no key, the other one is used.
          </p>
          <div class="row">
            <label class="ar-field"
              ><span>Provider</span>
              <select
                class="ar-field__input"
                [ngModel]="choice()"
                (ngModelChange)="choice.set($event)"
                [disabled]="busy()"
              >
                <option value="auto">Automatic (OpenAI when it has a key)</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select></label
            >
            <button
              ar-button
              type="button"
              [disabled]="
                busy() || (choice() === s.analysisProvider && s.analysisSource === 'setting')
              "
              (click)="save()"
            >
              {{ busy() ? 'Saving…' : 'Save' }}
            </button>
          </div>
          <p role="status">
            @if (s.effectiveModel) {
              In use now: <strong translate="no">{{ s.effectiveModel }}</strong
              >.
            } @else {
              No analysis model is available: neither OpenAI nor Anthropic has a key.
            }
            @if (s.analysisSource === 'config') {
              Chosen by the server configuration until you save a choice here.
            }
          </p>
          @if (saved()) {
            <p role="status">Saved.</p>
          }
        </section>

        <section class="card" aria-labelledby="ai-fallback">
          <h2 id="ai-fallback">Voice engine fallback</h2>
          <p>
            Each voice agent speaks with one engine: speech to speech (OpenAI realtime) or the
            speech pipeline (Deepgram and ElevenLabs). With fallback on, an agent whose engine can't
            start uses the other one instead of sending the call to people, and an engine that fails
            during a call hands the conversation over to the other once. The caller hears a short
            apology.
          </p>
          <div class="row">
            <label class="check"
              ><input
                type="checkbox"
                [ngModel]="fallback()"
                (ngModelChange)="fallback.set($event)"
                [disabled]="busy()"
              />
              Switch to the other engine when an agent's engine fails</label
            >
            <button
              ar-button
              type="button"
              [disabled]="busy() || fallback() === s.voiceEngineFallback"
              (click)="save()"
            >
              {{ busy() ? 'Saving…' : 'Save' }}
            </button>
          </div>
          <p role="status">
            @if (s.voiceEngines.length === 0) {
              The call relay runs no voice engine now, so there is no engine to switch to.
            } @else if (s.voiceEngines.length < 2) {
              The call relay can run only speech to speech now, so there is no engine to switch to
              until it has the speech pipeline's keys.
            } @else {
              The call relay can run both engines.
            }
          </p>
        </section>

        <section class="card" aria-labelledby="ai-rates">
          <h2 id="ai-rates">Call cost rates</h2>
          <p>
            Each AI call shows an estimated cost worked out from these rates when it ends. They
            start as estimates from the providers' list prices; enter the rates on your bills. A
            changed rate applies to calls that end after you save it.
          </p>
          <div class="rates">
            @for (f of rateFields; track f.key) {
              <label class="ar-field"
                ><span
                  >{{ f.label }} <small>(₹ {{ f.unit }})</small></span
                >
                <input
                  class="ar-field__input"
                  type="number"
                  min="0"
                  max="1000000"
                  step="0.01"
                  [ngModel]="rates()[f.key]"
                  (ngModelChange)="setRate(f.key, $event)"
                  [disabled]="busy()"
              /></label>
            }
          </div>
          <div class="row">
            <button ar-button type="button" [disabled]="busy()" (click)="saveRates()">
              {{ busy() ? 'Saving…' : 'Save rates' }}
            </button>
          </div>
          @if (ratesError()) {
            <p role="alert">{{ ratesError() }}</p>
          }
          @if (ratesSaved()) {
            <p role="status">Rates saved.</p>
          }
        </section>

        <section class="card" aria-labelledby="ai-keys">
          <h2 id="ai-keys">Provider keys</h2>
          <p>
            Keys go in the server's secret storage (AWS Secrets Manager in production,
            appsettings.secrets.json locally) under the names shown. They are never shown or entered
            here.
          </p>
          <div class="scroll">
            <table class="keys">
              <thead>
                <tr>
                  <th scope="col">Provider</th>
                  <th scope="col">Key</th>
                  <th scope="col">Used for</th>
                  <th scope="col">Setting name</th>
                </tr>
              </thead>
              <tbody>
                @for (p of s.providers; track p.key) {
                  <tr>
                    <th scope="row" translate="no">{{ p.name }}</th>
                    <td [class.missing]="!p.configured">{{ p.configured ? 'Set' : 'Not set' }}</td>
                    <td>{{ usage[p.key] }}{{ p.inUse ? '' : ' (not used yet)' }}</td>
                    <td>
                      <code translate="no">{{ p.configKey }}</code>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <p>
            Deepgram and ElevenLabs run the speech pipeline, which an agent can choose as its speech
            engine. Their keys belong to the call relay, not this server, so they show as set once
            the relay reports it has both. Sarvam AI and Bhashini come in a later update.
          </p>
        </section>
      } @else if (!error()) {
        <p role="status">Loading…</p>
      }
    </main>
  `,
  styles: `
    .providers {
      padding: 16px;
      display: grid;
      gap: 16px;
    }
    .card {
      background: var(--ar-surface-100);
      border: 1px solid var(--ar-line-200);
      border-radius: 8px;
      padding: 12px 16px;
      min-width: 0;
    }
    .card h2 {
      font-size: 1.05em;
      margin: 0 0 8px;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: flex-end;
    }
    .check {
      display: inline-flex;
      gap: 8px;
      align-items: center;
      min-width: 0;
    }
    .rates {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
      gap: 8px 16px;
      margin-bottom: 8px;
    }
    .rates .ar-field {
      min-width: 0;
    }
    .row .ar-field {
      flex: 0 1 320px;
      min-width: 0;
    }
    .scroll {
      overflow-x: auto;
    }
    .keys {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9em;
    }
    .keys th,
    .keys td {
      border-bottom: 1px solid var(--ar-line-200);
      padding: 6px 8px;
      text-align: start;
      vertical-align: top;
    }
    .missing {
      color: var(--ar-ink-500);
    }
    code {
      overflow-wrap: anywhere;
    }
  `,
})
export class ArAiProviders implements OnInit {
  private readonly api = inject(AiProviderSettingsService);
  protected readonly settings = signal<AiProviderSettings | null>(null);
  protected readonly choice = signal<string>('auto');
  protected readonly fallback = signal(true);
  protected readonly busy = signal(false);
  protected readonly saved = signal(false);
  protected readonly error = signal('');
  protected readonly rateFields = RATE_FIELDS;
  /** The rates as entered, in rupees. */
  protected readonly rates = signal<Record<string, number | null>>({});
  protected readonly ratesSaved = signal(false);
  protected readonly ratesError = signal('');
  protected readonly usage: Record<string, string> = {
    openai: 'Voice calls, analysis, voice previews',
    anthropic: 'Analysis, assistant',
    sarvam: 'Indian-language speech',
    elevenlabs: 'Text-to-speech',
    deepgram: 'Speech-to-text',
    bhashini: 'Indian-language speech',
  };

  async ngOnInit(): Promise<void> {
    try {
      this.show(await firstValueFrom(this.api.get()));
    } catch {
      this.error.set('The AI settings could not be loaded.');
    }
  }

  private show(settings: AiProviderSettings): void {
    this.settings.set(settings);
    this.choice.set(settings.analysisProvider);
    this.fallback.set(settings.voiceEngineFallback);
    const rupees: Record<string, number> = {};
    for (const f of RATE_FIELDS) rupees[f.key] = (settings.voiceCostRates?.[f.key] ?? 0) / 100;
    this.rates.set(rupees);
  }

  protected setRate(key: string, value: number | string | null): void {
    const rate = value === '' || value == null ? null : Number(value);
    this.rates.update((r) => ({ ...r, [key]: rate }));
    this.ratesSaved.set(false);
  }

  protected async saveRates(): Promise<void> {
    const s = this.settings();
    if (this.busy() || !s) return;
    const paise = {} as VoiceCostRates;
    for (const f of RATE_FIELDS) {
      const rate = this.rates()[f.key];
      if (rate == null || !Number.isFinite(rate) || rate < 0 || rate > 1_000_000) {
        this.ratesError.set(`Enter a rate between ₹0 and ₹10,00,000 for ${f.label.toLowerCase()}.`);
        return;
      }
      paise[f.key] = Math.round(rate * 100);
    }
    this.busy.set(true);
    this.ratesSaved.set(false);
    this.ratesError.set('');
    try {
      this.show(await firstValueFrom(this.api.update(null, s.voiceEngineFallback, paise)));
      this.ratesSaved.set(true);
    } catch {
      this.ratesError.set('The rates could not be saved.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async save(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.saved.set(false);
    this.error.set('');
    try {
      this.show(await firstValueFrom(this.api.update(this.choice(), this.fallback())));
      this.saved.set(true);
    } catch {
      this.error.set('The choice could not be saved.');
    } finally {
      this.busy.set(false);
    }
  }
}
