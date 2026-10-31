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
import { environment } from '../../../environments/environment';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ArTopbar } from '../../layout/topbar';
import { ChannelService } from '../../proxy/channels/channel.service';
import { ChannelDto } from '../../proxy/channels/models';
import { ArButton } from '../../ui/button';

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
  imports: [FormsModule, ArTopbar, ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Website call button"
      help="Let visitors to your website talk to your AI voice agent from the browser."
    />
    <main class="ww">
      <p class="ww__intro">
        Add a call button to your website. A visitor gives their name and mobile number, agrees, and
        talks to the number's published AI agent through their microphone. Each call is kept like
        any AI call: transcript, analysis, actions and follow-ups.
      </p>
      @if (error()) {
        <p role="alert" class="ww__err">{{ error() }}</p>
      }
      @if (!form()) {
        <div>
          <button ar-button type="button" icon="plus" [disabled]="busy()" (click)="edit(null)">
            Add a call button
          </button>
        </div>
      }
      @if (form(); as f) {
        <form class="ww__form" (submit)="$event.preventDefault(); save()">
          <label class="ar-field"
            ><span class="ar-field__label">Name</span>
            <input
              class="ar-field__input"
              name="name"
              maxlength="100"
              [(ngModel)]="f.name"
              [disabled]="busy()"
          /></label>
          <label class="ar-field"
            ><span class="ar-field__label">The agent of</span>
            <select
              class="ar-field__input"
              name="channel"
              [(ngModel)]="f.channelId"
              [disabled]="busy()"
            >
              @for (c of channels(); track c.id) {
                <option [ngValue]="c.id">{{ c.verifiedName }} · {{ c.displayPhoneNumber }}</option>
              }
            </select></label
          >
          <label class="ar-field ww__wide"
            ><span class="ar-field__label"
              >Your websites, one per line (such as https://www.example.com)</span
            >
            <textarea
              class="ar-field__input"
              name="origins"
              rows="3"
              translate="no"
              [(ngModel)]="f.origins"
              [disabled]="busy()"
            ></textarea>
          </label>
          <label class="ar-field"
            ><span class="ar-field__label">Button text</span>
            <input
              class="ar-field__input"
              name="label"
              maxlength="40"
              [(ngModel)]="f.buttonLabel"
              [disabled]="busy()"
          /></label>
          <label class="ar-field"
            ><span class="ar-field__label">Colour</span>
            <input
              class="ar-field__input"
              type="color"
              name="colour"
              [(ngModel)]="f.colour"
              [disabled]="busy()"
          /></label>
          <label class="ar-field"
            ><span class="ar-field__label">Calls a day at most</span>
            <input
              class="ar-field__input"
              type="number"
              name="limit"
              min="1"
              max="1000"
              [(ngModel)]="f.dailyLimit"
              [disabled]="busy()"
          /></label>
          <label class="ww__check"
            ><input type="checkbox" name="enabled" [(ngModel)]="f.enabled" [disabled]="busy()" />
            On</label
          >
          <div class="ww__actions">
            <button ar-button type="submit" variant="primary" [disabled]="busy()">
              {{ busy() ? 'Saving…' : 'Save' }}
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
      }
      <ul class="ww__list">
        @for (w of widgets(); track w.id) {
          <li>
            <div class="ww__row">
              <div>
                <strong>{{ w.name }}</strong>
                · {{ channelName(w.channelId) }} · {{ w.enabled ? 'On' : 'Off' }} ·
                <span translate="no">{{ w.callsToday }}/{{ w.dailyLimit }}</span> calls today
                <div class="ww__sites" translate="no">{{ w.allowedOrigins.join(', ') }}</div>
              </div>
              <div class="ww__actions">
                <button
                  ar-button
                  type="button"
                  variant="ghost"
                  [disabled]="busy()"
                  (click)="edit(w)"
                >
                  Edit
                </button>
                <button
                  ar-button
                  type="button"
                  variant="ghost"
                  [disabled]="busy()"
                  (click)="rotate(w)"
                >
                  New embed code
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
            </div>
            <label class="ar-field"
              ><span class="ar-field__label"
                >Embed code: paste it before &lt;/body&gt; on your pages</span
              >
              <textarea class="ar-field__input ww__code" rows="2" readonly translate="no">{{
                embed(w)
              }}</textarea>
            </label>
            <div>
              <button ar-button type="button" variant="ghost" (click)="copy(w)">
                {{ copied() === w.id ? 'Copied' : 'Copy code' }}
              </button>
            </div>
          </li>
        } @empty {
          <li>No call buttons yet.</li>
        }
      </ul>
      <p class="ww__note">
        Calls stop for the day at the limit, and one number or network can start only a few calls an
        hour. Visitors need a microphone; some strict office networks block browser calls.
      </p>
    </main>
  `,
  styles: `
    .ww {
      padding: 16px;
      display: grid;
      gap: 14px;
      min-width: 0;
    }
    .ww__intro,
    .ww__note,
    .ww__sites {
      margin: 0;
      color: var(--ar-ink-600);
      font-size: 0.9em;
    }
    .ww__err {
      color: var(--ar-danger-600, #b42318);
    }
    .ww__form {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
      gap: 8px 12px;
      align-items: end;
      padding: 12px;
      border: 1px solid var(--ar-line-200);
      border-radius: 8px;
    }
    .ww__wide,
    .ww__form .ww__actions {
      grid-column: 1 / -1;
    }
    .ww__check {
      display: inline-flex;
      gap: 8px;
      align-items: center;
      padding-bottom: 6px;
    }
    .ww__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .ww__list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 12px;
    }
    .ww__list li {
      display: grid;
      gap: 8px;
      border: 1px solid var(--ar-line-200);
      border-radius: 8px;
      padding: 12px;
      min-width: 0;
    }
    .ww__row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: space-between;
    }
    .ww__code {
      font-family: var(--ar-font-mono, monospace);
      font-size: 0.85em;
      overflow-wrap: anywhere;
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
