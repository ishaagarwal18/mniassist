import { RestService } from '@abp/ng.core';
import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ArTopbar } from '../../layout/topbar';
import { ChannelService } from '../../proxy/channels/channel.service';
import { ChannelDto } from '../../proxy/channels/models';
import { ArButton } from '../../ui/button';
import { ArChip } from '../../ui/chip';
import { ArIcon } from '../../ui/icon';
import { ArStatTile } from '../../ui/stat-tile';

export interface VoiceWebWidget {
  id: string;
  name: string;
  channelId: string;
  publicKey: string;
  allowedOrigins: string[];
  buttonLabel: string;
  colour: string;
  dailyLimit: number;
  enabled: boolean;
  callsToday: number;
}

export type VoiceWebWidgetInput = Omit<VoiceWebWidget, 'id' | 'publicKey' | 'callsToday'>;

@Injectable({ providedIn: 'root' })
export class VoiceWebWidgetService {
  private readonly rest = inject(RestService);
  private readonly base = '/api/auto-reach/voice-web-widget';
  getList() {
    return this.rest.request<never, VoiceWebWidget[]>(
      { method: 'GET', url: this.base },
      { apiName: 'AutoReach' },
    );
  }
  create(input: VoiceWebWidgetInput) {
    return this.rest.request<VoiceWebWidgetInput, VoiceWebWidget>(
      { method: 'POST', url: this.base, body: input },
      { apiName: 'AutoReach' },
    );
  }
  update(id: string, input: VoiceWebWidgetInput) {
    return this.rest.request<VoiceWebWidgetInput, VoiceWebWidget>(
      { method: 'PUT', url: `${this.base}/${id}`, body: input },
      { apiName: 'AutoReach' },
    );
  }
  rotateKey(id: string) {
    return this.rest.request<never, VoiceWebWidget>(
      { method: 'POST', url: `${this.base}/${id}/rotate-key` },
      { apiName: 'AutoReach' },
    );
  }
  delete(id: string) {
    return this.rest.request<never, void>(
      { method: 'DELETE', url: `${this.base}/${id}` },
      { apiName: 'AutoReach' },
    );
  }
}

interface WidgetForm extends Omit<VoiceWebWidgetInput, 'allowedOrigins'> {
  id: string | null;
  origins: string;
}

/**
 * Website call buttons: a visitor on the business's own website gives their name and mobile number, agrees, and talks to a
 * number's published AI agent in the browser. The embed code is one script tag; only the websites listed may use it, and calls stop
 * for the day at the limit.
 */
@Component({
  selector: 'ar-voice-web-widgets',
  imports: [FormsModule, ArTopbar, ArButton, ArChip, ArIcon, ArStatTile],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Website call button"
      help="Let visitors to your website talk to your AI voice agent directly from the browser."
    />

    <main class="ww">
      <!-- Executive KPI Strip -->
      <section class="ww__kpis" aria-label="Web Call Widgets Overview">
        <ar-stat-tile
          label="Total Embed Buttons"
          [value]="stats().total"
          note="Configured website widgets"
        />
        <ar-stat-tile
          label="Active & Live"
          [value]="stats().active"
          tone="good"
          note="Accepting incoming website calls"
        />
        <ar-stat-tile
          label="Calls Placed Today"
          [value]="stats().callsToday"
          tone="teal"
          [note]="'Across all connected domains'"
        />
        <ar-stat-tile
          label="Daily Capacity Limit"
          [value]="stats().totalLimit"
          note="Total maximum calls allowed per day"
        />
      </section>

      @if (!form()) {
        <div class="ww__create-row">
          <button
            ar-button
            type="button"
            variant="primary"
            icon="plus"
            [disabled]="busy()"
            (click)="edit(null)"
          >
            Add a call button
          </button>
        </div>
      }

      @if (error()) {
        <div class="ww__alert" role="alert">
          <ar-icon name="alert" />
          <span>{{ error() }}</span>
        </div>
      }

      @if (form(); as f) {
        <!-- Create / Edit Widget Form with Live Interactive Preview -->
        <section class="ww__form-card">
          <div class="form-card__head">
            <h2 class="form-card__title">
              {{ f.id ? 'Edit Call Button' : 'New Website Call Button' }}
            </h2>
            <p class="form-card__subtitle">
              Generates a single lightweight script tag. Visitors can talk to your voice agent from
              their browser with no phone line needed.
            </p>
          </div>

          <div class="form-layout">
            <form class="ww__form" (submit)="$event.preventDefault(); save()">
              <label class="ar-field">
                <span class="ar-field__label">Widget Name</span>
                <input
                  class="ar-field__input"
                  name="name"
                  maxlength="100"
                  placeholder="e.g. Homepage Floating Call Button"
                  [(ngModel)]="f.name"
                  [disabled]="busy()"
                />
              </label>

              <label class="ar-field">
                <span class="ar-field__label">Voice Agent Channel</span>
                <select
                  class="ar-field__input"
                  name="channel"
                  [(ngModel)]="f.channelId"
                  [disabled]="busy()"
                >
                  @for (c of channels(); track c.id) {
                    <option [ngValue]="c.id">
                      {{ c.verifiedName }} · {{ c.displayPhoneNumber }}
                    </option>
                  }
                </select>
              </label>

              <label class="ar-field ww__wide">
                <span class="ar-field__label">
                  Allowed Websites (one URL per line, e.g. https://www.example.com)
                </span>
                <textarea
                  class="ar-field__input"
                  name="origins"
                  rows="3"
                  translate="no"
                  placeholder="https://www.mycompany.com&#10;https://app.mycompany.com"
                  [(ngModel)]="f.origins"
                  [disabled]="busy()"
                ></textarea>
              </label>

              <label class="ar-field">
                <span class="ar-field__label">Button Label</span>
                <input
                  class="ar-field__input"
                  name="label"
                  maxlength="40"
                  [(ngModel)]="f.buttonLabel"
                  [disabled]="busy()"
                />
              </label>

              <label class="ar-field">
                <span class="ar-field__label">Brand Colour</span>
                <div class="color-picker-wrapper">
                  <input
                    class="color-picker-input"
                    type="color"
                    name="colour"
                    [(ngModel)]="f.colour"
                    [disabled]="busy()"
                  />
                  <span class="color-hex-text" translate="no">{{ f.colour }}</span>
                </div>
              </label>

              <label class="ar-field">
                <span class="ar-field__label">Max Calls Per Day</span>
                <input
                  class="ar-field__input"
                  type="number"
                  name="limit"
                  min="1"
                  max="1000"
                  [(ngModel)]="f.dailyLimit"
                  [disabled]="busy()"
                />
              </label>

              <div class="ww__toggle-row">
                <label class="toggle-control">
                  <input
                    type="checkbox"
                    name="enabled"
                    [(ngModel)]="f.enabled"
                    [disabled]="busy()"
                  />
                  <span class="toggle-control__label">Enable widget immediately</span>
                </label>
              </div>

              <div class="ww__form-actions">
                <button ar-button type="submit" variant="primary" [disabled]="busy()">
                  {{ busy() ? 'Saving…' : 'Save Call Button' }}
                </button>
                <button
                  ar-button
                  type="button"
                  variant="ghost"
                  [disabled]="busy()"
                  (click)="form.set(null)"
                >
                  Cancel
                </button>
              </div>
            </form>

            <!-- Live Widget Preview Pane -->
            <aside class="widget-preview-pane">
              <span class="preview-label">Live Button Preview</span>
              <div class="mock-browser">
                <div class="mock-browser__bar">
                  <span class="dot"></span>
                  <span class="dot"></span>
                  <span class="dot"></span>
                  <div class="mock-url-bar">https://yourcompany.com</div>
                </div>
                <div class="mock-browser__canvas">
                  <div class="mock-content-lines">
                    <div class="line w-75"></div>
                    <div class="line w-50"></div>
                    <div class="line w-90"></div>
                  </div>
                  <!-- Floating call button preview -->
                  <div
                    class="mock-floating-button"
                    [style.background-color]="f.colour || '#0f766e'"
                  >
                    <ar-icon name="phone" class="btn-icon" />
                    <span>{{ f.buttonLabel || 'Talk to us' }}</span>
                  </div>
                </div>
              </div>
              <small class="preview-note">Preview updates in real-time as you type.</small>
            </aside>
          </div>
        </section>
      }

      <!-- Widget List -->
      <section class="ww__directory" aria-label="Active Call Buttons">
        <div class="directory__head">
          <h2 class="directory__title">Configured Call Buttons ({{ widgets().length }})</h2>
        </div>

        <div class="ww__grid">
          @for (w of widgets(); track w.id) {
            <article class="widget-card">
              <header class="widget-card__header">
                <div class="widget-card__info">
                  <div class="widget-card__badge-row">
                    @if (w.enabled) {
                      <ar-chip tone="good" [dot]="true">Live & Active</ar-chip>
                    } @else {
                      <ar-chip tone="neutral">Paused</ar-chip>
                    }
                    <span class="widget-card__channel">{{ channelName(w.channelId) }}</span>
                  </div>
                  <h3 class="widget-card__name">{{ w.name }}</h3>
                </div>
                <div class="widget-card__preview-badge" [style.background-color]="w.colour">
                  <ar-icon name="phone" class="preview-badge-icon" />
                  <span>{{ w.buttonLabel }}</span>
                </div>
              </header>

              <!-- Daily Quota Usage Meter -->
              <div class="widget-card__meter-section">
                <div class="meter-head">
                  <span class="meter-label">Daily Call Quota</span>
                  <span class="meter-val" translate="no"
                    >{{ w.callsToday }}/{{ w.dailyLimit }} calls</span
                  >
                </div>
                <div class="meter-track">
                  <div
                    class="meter-fill"
                    [style.width.%]="quotaPercent(w.callsToday, w.dailyLimit)"
                    [class.meter-fill--full]="w.callsToday >= w.dailyLimit"
                  ></div>
                </div>
              </div>

              <!-- Allowed Domains -->
              <div class="widget-card__domains">
                <span class="domains-label">Permitted Domains:</span>
                <div class="domains-chips">
                  @for (origin of w.allowedOrigins; track origin) {
                    <span class="domain-pill" translate="no">{{ origin }}</span>
                  }
                </div>
              </div>

              <!-- Embed Script Code Box -->
              <div class="widget-card__code-section">
                <div class="code-head">
                  <span class="code-label">HTML Embed Script (paste before &lt;/body&gt;)</span>
                  <button
                    ar-button
                    type="button"
                    variant="ghost"
                    (click)="copy(w)"
                    [class.copied]="copied() === w.id"
                  >
                    {{ copied() === w.id ? '✓ Copied to Clipboard' : 'Copy Script' }}
                  </button>
                </div>
                <textarea class="ar-field__input ww__code" rows="2" readonly translate="no">{{
                  embed(w)
                }}</textarea>
              </div>

              <footer class="widget-card__footer">
                <div class="widget-card__actions">
                  <button
                    ar-button
                    type="button"
                    variant="primary"
                    [disabled]="busy()"
                    (click)="edit(w)"
                  >
                    Edit Settings
                  </button>
                  <button
                    ar-button
                    type="button"
                    variant="ghost"
                    [disabled]="busy()"
                    (click)="rotate(w)"
                  >
                    Rotate API Key
                  </button>
                  <button
                    ar-button
                    type="button"
                    variant="ghost"
                    [disabled]="busy()"
                    (click)="remove(w)"
                  >
                    Delete
                  </button>
                </div>
              </footer>
            </article>
          } @empty {
            <div class="ww__empty-state">
              <ar-icon name="phone" class="empty-icon" />
              <h3>No Website Call Buttons Created</h3>
              <p>
                Add a button to let visitors trigger direct AI voice calls right from your website.
              </p>
              <button ar-button type="button" variant="primary" (click)="edit(null)">
                + Add Call Button
              </button>
            </div>
          }
        </div>
      </section>

      <p class="ww__note">
        Calls stop for the day once the daily quota is reached. Rate limiting prevents repeat
        nuisance calls from the same network.
      </p>
    </main>
  `,
  styles: `
    .ww {
      padding: 24px 32px;
      display: grid;
      gap: 24px;
      max-width: 1440px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
    }

    .ww__kpis {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }

    .ww__alert {
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

    .ww__form-card {
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card, 10px);
      padding: 24px;
      box-shadow: var(--ar-shadow-card, 0 1px 3px rgba(0, 0, 0, 0.05));
    }

    .form-card__head {
      margin-bottom: 20px;
    }

    .form-card__title {
      font: 600 1.2rem var(--ar-font-sans);
      color: var(--ar-ink-900);
      margin: 0;
    }

    .form-card__subtitle {
      margin: 4px 0 0;
      color: var(--ar-ink-500);
      font-size: 0.875rem;
    }

    .form-layout {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 28px;
      align-items: flex-start;
    }

    @media (max-width: 960px) {
      .form-layout {
        grid-template-columns: 1fr;
      }
    }

    .ww__form {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      align-items: flex-end;
    }

    .ww__wide {
      grid-column: 1 / -1;
    }

    .color-picker-wrapper {
      display: flex;
      align-items: center;
      gap: 10px;
      height: 38px;
    }

    .color-picker-input {
      width: 44px;
      height: 38px;
      padding: 2px;
      border: 1px solid var(--ar-line-200);
      border-radius: 6px;
      cursor: pointer;
      background: none;
    }

    .color-hex-text {
      font-family: var(--ar-font-mono, monospace);
      font-size: 0.875rem;
      color: var(--ar-ink-700);
    }

    .ww__toggle-row {
      grid-column: 1 / -1;
      padding: 6px 0;
    }

    .toggle-control {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }

    .toggle-control__label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--ar-ink-700);
    }

    .ww__form-actions {
      grid-column: 1 / -1;
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }

    /* Live Preview Mockup */
    .widget-preview-pane {
      background: var(--ar-bg-50);
      border: 1px solid var(--ar-line-200);
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .preview-label {
      font-size: 0.78rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--ar-ink-500);
    }

    .mock-browser {
      background: #ffffff;
      border: 1px solid var(--ar-line-200);
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);
    }

    .mock-browser__bar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 10px;
      background: #f2f4f7;
      border-bottom: 1px solid #e4e7ec;
    }

    .mock-browser__bar .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #d0d5dd;
    }

    .mock-url-bar {
      flex: 1;
      background: #ffffff;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.72rem;
      color: #667085;
      font-family: monospace;
    }

    .mock-browser__canvas {
      height: 160px;
      position: relative;
      padding: 16px;
      background: #fafbfc;
    }

    .mock-content-lines {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .mock-content-lines .line {
      height: 8px;
      background: #eaecf0;
      border-radius: 4px;
    }

    .w-75 {
      width: 75%;
    }
    .w-50 {
      width: 50%;
    }
    .w-90 {
      width: 90%;
    }

    .mock-floating-button {
      position: absolute;
      bottom: 16px;
      right: 16px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 999px;
      color: #ffffff;
      font-size: 0.8rem;
      font-weight: 600;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
      cursor: default;
    }

    .mock-floating-button .btn-icon {
      font-size: 0.9rem;
    }

    .preview-note {
      font-size: 0.75rem;
      color: var(--ar-ink-400);
    }

    /* Directory and Cards */
    .directory__head {
      margin-bottom: 16px;
    }

    .directory__title {
      font: 600 1.15rem var(--ar-font-sans);
      color: var(--ar-ink-900);
      margin: 0;
    }

    .ww__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 20px;
    }

    .widget-card {
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card, 10px);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: var(--ar-shadow-card, 0 1px 3px rgba(0, 0, 0, 0.05));
      transition:
        transform 0.15s ease,
        box-shadow 0.15s ease;
    }

    .widget-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      border-color: var(--ar-line-300);
    }

    .widget-card__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    .widget-card__badge-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .widget-card__channel {
      font-size: 0.78rem;
      color: var(--ar-ink-500);
    }

    .widget-card__name {
      font: 600 1.15rem var(--ar-font-sans);
      color: var(--ar-ink-900);
      margin: 0;
    }

    .widget-card__preview-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 12px;
      border-radius: 999px;
      color: #ffffff;
      font-size: 0.78rem;
      font-weight: 600;
      white-space: nowrap;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .preview-badge-icon {
      font-size: 0.85rem;
    }

    /* Meter Section */
    .widget-card__meter-section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .meter-head {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
    }

    .meter-label {
      color: var(--ar-ink-500);
    }

    .meter-val {
      font-weight: 600;
      color: var(--ar-ink-900);
    }

    .meter-track {
      height: 6px;
      background: var(--ar-bg-100);
      border-radius: 999px;
      overflow: hidden;
    }

    .meter-fill {
      height: 100%;
      background: #027a48;
      border-radius: 999px;
      transition: width 0.3s ease;
    }

    .meter-fill--full {
      background: #b42318;
    }

    /* Domains */
    .widget-card__domains {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .domains-label {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--ar-ink-500);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .domains-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .domain-pill {
      background: var(--ar-bg-50);
      border: 1px solid var(--ar-line-200);
      border-radius: 4px;
      padding: 2px 8px;
      font-size: 0.8rem;
      font-family: var(--ar-font-mono, monospace);
      color: var(--ar-ink-700);
    }

    /* Code Block */
    .widget-card__code-section {
      background: var(--ar-bg-50);
      border: 1px solid var(--ar-line-200);
      border-radius: 6px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .code-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .code-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--ar-ink-500);
    }

    .embed-code-block {
      margin: 0;
      font-family: var(--ar-font-mono, monospace);
      font-size: 0.78rem;
      color: var(--ar-ink-900);
      white-space: pre-wrap;
      word-break: break-all;
      background: var(--ar-white);
      padding: 8px;
      border: 1px solid var(--ar-line-200);
      border-radius: 4px;
    }

    .copied {
      color: #027a48 !important;
      font-weight: 600;
    }

    .widget-card__footer {
      border-top: 1px solid var(--ar-line-200);
      padding-top: 14px;
    }

    .widget-card__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .ww__empty-state {
      grid-column: 1 / -1;
      padding: 40px;
      text-align: center;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card, 10px);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .empty-icon {
      font-size: 2rem;
      color: var(--ar-ink-400);
    }

    .ww__note {
      margin: 0;
      color: var(--ar-ink-400);
      font-size: 0.85rem;
    }
  `,
})
export class ArVoiceWebWidgets implements OnInit {
  private readonly api = inject(VoiceWebWidgetService);
  private readonly channelsApi = inject(ChannelService);
  private readonly dialogs = inject(ConfirmService);
  protected readonly widgets = signal<VoiceWebWidget[]>([]);
  protected readonly channels = signal<ChannelDto[]>([]);
  protected readonly form = signal<WidgetForm | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly copied = signal<string | null>(null);
  private readonly apiBase = environment.apis.default.url.replace(/\/+$/, '');

  protected readonly stats = computed(() => {
    const list = this.widgets();
    const total = list.length;
    const active = list.filter((w) => w.enabled).length;
    const callsToday = list.reduce((s, w) => s + (w.callsToday || 0), 0);
    const totalLimit = list.reduce((s, w) => s + (w.dailyLimit || 0), 0);
    return { total, active, callsToday, totalLimit };
  });

  async ngOnInit(): Promise<void> {
    try {
      const page = await firstValueFrom(this.channelsApi.getList({ maxResultCount: 100 } as never));
      this.channels.set((page.items ?? []).filter((c) => c.provider === 0));
    } catch {
      this.channels.set([]);
    }
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      this.widgets.set(await firstValueFrom(this.api.getList()));
    } catch {
      this.error.set('The call buttons could not be loaded.');
    }
  }

  protected channelName(id: string): string {
    const channel = this.channels().find((c) => c.id === id);
    return channel ? `${channel.verifiedName} · ${channel.displayPhoneNumber}` : '';
  }

  protected embed(w: VoiceWebWidget): string {
    return `<script src="${this.apiBase}/api/auto-reach/public/voice-widget/${w.publicKey}/widget.js" async></script>`;
  }

  protected quotaPercent(callsToday: number, dailyLimit: number): number {
    if (!dailyLimit || dailyLimit <= 0) return 0;
    return Math.min(100, Math.round((callsToday / dailyLimit) * 100));
  }

  protected edit(w: VoiceWebWidget | null): void {
    this.error.set('');
    this.form.set(
      w
        ? { ...w, origins: w.allowedOrigins.join('\n') }
        : {
            id: null,
            name: '',
            channelId: this.channels()[0]?.id ?? '',
            origins: '',
            buttonLabel: 'Talk to us',
            colour: '#0f766e',
            dailyLimit: 50,
            enabled: true,
          },
    );
  }

  protected async save(): Promise<void> {
    const f = this.form();
    if (!f || this.busy()) return;
    const origins = f.origins
      .split(/[\n,]/)
      .map((o) => o.trim())
      .filter((o) => o.length > 0);
    if (!f.name.trim() || !f.channelId || origins.length === 0 || origins.length > 10) {
      this.error.set('Enter a name, choose a number and list 1 to 10 websites.');
      return;
    }
    if (
      origins.some(
        (o) => !/^https:\/\/[^/\s]+\/?$/i.test(o) && !/^http:\/\/localhost(:\d+)?\/?$/i.test(o),
      )
    ) {
      this.error.set(
        'Each website must be an address like https://www.example.com, with nothing after it.',
      );
      return;
    }
    const input: VoiceWebWidgetInput = {
      name: f.name.trim(),
      channelId: f.channelId,
      allowedOrigins: origins,
      buttonLabel: f.buttonLabel.trim() || 'Talk to us',
      colour: f.colour,
      dailyLimit: Number(f.dailyLimit) || 50,
      enabled: f.enabled,
    };
    this.busy.set(true);
    this.error.set('');
    try {
      await firstValueFrom(f.id ? this.api.update(f.id, input) : this.api.create(input));
      this.form.set(null);
      await this.load();
    } catch {
      this.error.set(
        'The call button could not be saved. Check the websites, label, colour and limit.',
      );
    } finally {
      this.busy.set(false);
    }
  }

  protected async rotate(w: VoiceWebWidget): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: 'Make a new embed code?',
      message: 'The current code stops working at once. Paste the new code on your website.',
      confirmText: 'New code',
    });
    if (!ok) return;
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.rotateKey(w.id));
      await this.load();
    } catch {
      this.error.set('A new code could not be made.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(w: VoiceWebWidget): Promise<void> {
    if (!(await this.dialogs.delete('this call button', w.name))) return;
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.delete(w.id));
      await this.load();
    } catch {
      this.error.set('The call button could not be deleted.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async copy(w: VoiceWebWidget): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.embed(w));
      this.copied.set(w.id);
    } catch {
      this.error.set('Copy the code from the box above.');
    }
  }
}
