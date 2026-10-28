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
}

@Injectable({ providedIn: 'root' })
export class AiProviderSettingsService {
  private readonly rest = inject(RestService);
  get() {
    return this.rest.request<never, AiProviderSettings>(
      { method: 'GET', url: '/api/auto-reach/ai-provider-settings' },
      { apiName: 'AutoReach' },
    );
  }
  update(analysisProvider: string) {
    return this.rest.request<unknown, AiProviderSettings>(
      { method: 'PUT', url: '/api/auto-reach/ai-provider-settings', body: { analysisProvider } },
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
                    <td>{{ usage[p.key] ?? '' }}{{ p.inUse ? '' : ' (not used yet)' }}</td>
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
  protected readonly busy = signal(false);
  protected readonly saved = signal(false);
  protected readonly error = signal('');
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
  }

  protected async save(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.saved.set(false);
    this.error.set('');
    try {
      this.show(await firstValueFrom(this.api.update(this.choice())));
      this.saved.set(true);
    } catch {
      this.error.set('The choice could not be saved.');
    } finally {
      this.busy.set(false);
    }
  }
}
