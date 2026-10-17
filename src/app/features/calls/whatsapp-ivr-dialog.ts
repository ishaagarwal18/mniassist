import { RouterLink } from '@angular/router';
import { PromptAudioError, toPromptWav } from './prompt-audio';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { TeamService } from '../../proxy/identity/team.service';
import type { TeamDto } from '../../proxy/identity/models';
import {
  WhatsAppCallService,
  WhatsAppIvrOptionDto,
  WhatsAppIvrSettingsDto,
} from '../../proxy/messaging/whats-app-call.service';
import { ArBanner, ArButton, ArDialog } from '../../ui';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '*', '#'];

const MOCK: WhatsAppIvrSettingsDto = {
  enabled: false,
  options: [],
  inputSeconds: 6,
  attempts: 3,
  hasPrompt: false,
  active: false,
  problems: ['Upload the menu prompt.', 'Add the menu options.', 'The menu is switched off.'],
  queueMinutes: 3,
};

type Row = Pick<WhatsAppIvrOptionDto, 'digit' | 'label' | 'teamId'>;

/**
 * Native WhatsApp IVR: the call relay answers a customer's WhatsApp call, plays this prompt, reads the key they press and rings
 * only that option's team ("Press 1 for English; press 2 for Hindi" → the English desk or the Hindi desk). Until everything is in
 * place — the relay, a prompt, and every option's team staffed — calls ring every agent as before, and the dialog says what's
 * missing.
 */
@Component({
  selector: 'ar-whatsapp-ivr-dialog',
  imports: [ArDialog, ArButton, ArBanner, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog
      title="Call menu (IVR)"
      width="min(560px, calc(100vw - 32px))"
      (dismiss)="closed.emit()"
    >
      <p class="ivr__hint">
        Callers hear your prompt and press a key; the call then rings only that option's team. Say
        every option in the prompt, for example “Press 1 for English; press 2 for Hindi.”
      </p>

      @if (settings(); as s) {
        @if (s.active) {
          <ar-banner tone="good">The menu is answering WhatsApp calls.</ar-banner>
        } @else {
          <ar-banner tone="warn">
            Calls ring every agent until this is fixed:
            <ul class="ivr__list">
              @for (p of s.problems; track p) {
                <li>{{ p }}</li>
              }
            </ul>
          </ar-banner>
        }

        <section class="ivr__section" aria-labelledby="ivr-prompt-h">
          <h3 id="ivr-prompt-h" class="ivr__h">Prompt</h3>
          @if (s.hasPrompt) {
            <p class="ivr__hint">{{ s.promptSeconds }} s, converted for WhatsApp calling.</p>
            @if (promptUrl(); as url) {
              <audio controls preload="none" [src]="url" aria-label="Current menu prompt"></audio>
            } @else {
              <button ar-button type="button" variant="ghost" (click)="previewPrompt()">
                Play the prompt
              </button>
            }
          } @else {
            <p class="ivr__hint">No prompt yet.</p>
          }
          <label class="ar-field" for="ivr-file">
            <span class="ar-field__label"
              >{{ s.hasPrompt ? 'Replace with' : 'Upload' }} a recording (WAV, MP3, M4A or Ogg,
              under 30 s)</span
            >
            <input
              id="ivr-file"
              class="ar-field__input"
              type="file"
              accept="audio/*,.wav,.mp3,.m4a,.ogg,.opus"
              [disabled]="saving()"
              (change)="uploadPrompt($any($event.target))"
            />
          </label>
        </section>

        <section class="ivr__section" aria-labelledby="ivr-opts-h">
          <h3 id="ivr-opts-h" class="ivr__h">Options</h3>
          <p class="ivr__hint">
            The first option is where a caller who presses nothing goes. A caller waits up to
            {{ s.queueMinutes }} minutes for an agent.
          </p>
          @for (row of rows(); track $index; let i = $index) {
            <div class="ivr__row">
              <label class="ar-field ivr__key" [for]="'ivr-key-' + i">
                <span class="ar-field__label">Key</span>
                <select
                  class="ar-field__input"
                  [id]="'ivr-key-' + i"
                  [value]="row.digit"
                  (change)="edit(i, { digit: $any($event.target).value })"
                >
                  @for (k of keys; track k) {
                    <option [value]="k" [selected]="k === row.digit">{{ k }}</option>
                  }
                </select>
              </label>
              <label class="ar-field ivr__label" [for]="'ivr-label-' + i">
                <span class="ar-field__label">Label</span>
                <input
                  class="ar-field__input"
                  [id]="'ivr-label-' + i"
                  maxlength="64"
                  [value]="row.label"
                  placeholder="Hindi"
                  (input)="edit(i, { label: $any($event.target).value })"
                />
              </label>
              <label class="ar-field ivr__team" [for]="'ivr-team-' + i">
                <span class="ar-field__label">Rings team</span>
                <select
                  class="ar-field__input"
                  [id]="'ivr-team-' + i"
                  (change)="edit(i, { teamId: $any($event.target).value })"
                >
                  <option value="" [selected]="!row.teamId" disabled>Choose a team</option>
                  @for (t of teams(); track t.id) {
                    <option [value]="t.id" [selected]="t.id === row.teamId">
                      {{ t.name }} · {{ t.members?.length ?? 0 }} agents{{
                        t.isActive === false ? ' · inactive' : ''
                      }}
                    </option>
                  }
                </select>
              </label>
              <button
                ar-button
                type="button"
                variant="ghost"
                class="ivr__remove"
                [attr.aria-label]="'Remove option ' + row.digit"
                (click)="remove(i)"
              >
                Remove
              </button>
            </div>
          }
          @if (teams().length === 0) {
            <p class="ivr__hint">
              Create the teams first (for example an English desk and a Hindi desk) under
              <a routerLink="/settings/teams" (click)="closed.emit()">Settings → Teams</a>.
            </p>
          }
          @if (rows().length < 9) {
            <button ar-button type="button" variant="ghost" (click)="add()">Add an option</button>
          }
        </section>

        <section class="ivr__section ivr__timing" aria-labelledby="ivr-timing-h">
          <h3 id="ivr-timing-h" class="ivr__h">Timing</h3>
          <label class="ar-field" for="ivr-wait">
            <span class="ar-field__label">Seconds to wait for a key</span>
            <input
              id="ivr-wait"
              class="ar-field__input"
              type="number"
              min="2"
              max="30"
              [value]="inputSeconds()"
              (input)="inputSeconds.set(+$any($event.target).value)"
            />
          </label>
          <label class="ar-field" for="ivr-attempts">
            <span class="ar-field__label">Times the prompt plays</span>
            <input
              id="ivr-attempts"
              class="ar-field__input"
              type="number"
              min="1"
              max="5"
              [value]="attempts()"
              (input)="attempts.set(+$any($event.target).value)"
            />
          </label>
        </section>

        <label class="ivr__toggle" for="ivr-on">
          <input
            id="ivr-on"
            type="checkbox"
            [checked]="enabled()"
            [disabled]="saving() || (!s.hasPrompt && !enabled())"
            (change)="enabled.set($any($event.target).checked)"
          />
          Answer WhatsApp calls with this menu
        </label>
      } @else {
        <p class="ivr__hint">Loading…</p>
      }

      @if (error(); as e) {
        <p class="ivr__err" role="alert">{{ e }}</p>
      }

      <div dialogActions>
        @if (settings()?.hasPrompt) {
          <button
            ar-button
            type="button"
            variant="ghost"
            [disabled]="saving()"
            (click)="removePrompt()"
          >
            Remove prompt
          </button>
        }
        <button ar-button type="button" variant="ghost" (click)="closed.emit()">Close</button>
        <button
          ar-button
          type="button"
          variant="primary"
          [disabled]="saving() || !valid()"
          (click)="save()"
        >
          Save
        </button>
      </div>
    </ar-dialog>
  `,
  styles: `
    .ivr__hint {
      margin: 0 0 8px;
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .ivr__err {
      margin: 8px 0 0;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-bad-600, #b42318);
    }
    .ivr__list {
      margin: 4px 0 0;
      padding-left: 18px;
    }
    .ivr__section {
      margin-top: 16px;
    }
    .ivr__h {
      margin: 0 0 6px;
      font: 600 13px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .ivr__row {
      display: grid;
      grid-template-columns: 72px 1fr 1.4fr auto;
      gap: 8px;
      align-items: end;
      margin-bottom: 8px;
    }
    .ivr__timing {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .ivr__timing .ivr__h {
      grid-column: 1 / -1;
    }
    .ivr__toggle {
      display: flex;
      gap: 6px;
      align-items: center;
      margin-top: 16px;
      font: 500 13px var(--ar-font-sans);
    }
    audio {
      height: 32px;
      max-width: 100%;
    }
    @media (max-width: 560px) {
      .ivr__row {
        grid-template-columns: 1fr 1fr;
      }
      .ivr__team {
        grid-column: 1 / -1;
      }
    }
  `,
})
export class ArWhatsAppIvrDialog {
  private readonly api = inject(WhatsAppCallService);
  private readonly teamApi = inject(TeamService);

  readonly closed = output<void>();

  protected readonly keys = KEYS;
  protected readonly settings = signal<WhatsAppIvrSettingsDto | null>(null);
  protected readonly teams = signal<TeamDto[]>([]);
  protected readonly rows = signal<Row[]>([]);
  protected readonly enabled = signal(false);
  protected readonly inputSeconds = signal(6);
  protected readonly attempts = signal(3);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly promptUrl = signal<string | null>(null);

  /** Every option complete, and no key used twice. */
  protected readonly valid = computed(() => {
    const rows = this.rows();
    const keys = new Set(rows.map((r) => r.digit));
    return (
      keys.size === rows.length &&
      rows.every((r) => r.digit && r.label.trim() && r.teamId) &&
      (!this.enabled() || rows.length > 0)
    );
  });

  constructor() {
    void this.load();
    inject(DestroyRef).onDestroy(() => {
      const url = this.promptUrl();
      if (url) URL.revokeObjectURL(url);
    });
  }

  private async load(): Promise<void> {
    if (environment.useMockData) {
      this.apply(MOCK);
      return;
    }
    try {
      const [settings, teams] = await Promise.all([
        firstValueFrom(this.api.getIvr()),
        firstValueFrom(this.teamApi.getList({ maxResultCount: 100 })),
      ]);
      this.teams.set(teams.items ?? []);
      this.apply(settings);
    } catch (e) {
      this.error.set(this.message(e, 'The call menu could not be loaded.'));
    }
  }

  private apply(s: WhatsAppIvrSettingsDto): void {
    this.settings.set(s);
    this.rows.set(s.options.map((o) => ({ digit: o.digit, label: o.label, teamId: o.teamId })));
    this.enabled.set(s.enabled);
    this.inputSeconds.set(s.inputSeconds);
    this.attempts.set(s.attempts);
  }

  protected add(): void {
    const used = new Set(this.rows().map((r) => r.digit));
    const digit = KEYS.find((k) => !used.has(k)) ?? '1';
    this.rows.update((rows) => [...rows, { digit, label: '', teamId: '' }]);
  }

  protected remove(index: number): void {
    this.rows.update((rows) => rows.filter((_, i) => i !== index));
  }

  protected edit(index: number, change: Partial<Row>): void {
    this.rows.update((rows) => rows.map((r, i) => (i === index ? { ...r, ...change } : r)));
  }

  protected async save(): Promise<void> {
    this.saving.set(true);
    this.error.set(null);
    try {
      if (environment.useMockData) return;
      this.apply(
        await firstValueFrom(
          this.api.updateIvr({
            enabled: this.enabled(),
            options: this.rows().map((r) => ({ ...r, label: r.label.trim() })),
            inputSeconds: this.inputSeconds(),
            attempts: this.attempts(),
          }),
        ),
      );
    } catch (e) {
      this.error.set(this.message(e, 'The call menu could not be saved.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected async uploadPrompt(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      this.error.set('That file is over 50 MB. Keep the prompt under 30 seconds.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    try {
      // Whatever was picked becomes the 16-bit mono 48 kHz WAV the server takes, in the browser.
      const { wav } = await toPromptWav(file);
      if (environment.useMockData) return;
      const form = new FormData();
      form.append('file', wav, file.name.replace(/\.[^.]+$/, '') + '.wav');
      const s = await firstValueFrom(this.api.uploadIvrPrompt(form));
      this.settings.set(s);
      this.clearPreview();
    } catch (e) {
      this.error.set(
        e instanceof PromptAudioError
          ? e.message
          : this.message(e, 'The prompt could not be uploaded.'),
      );
    } finally {
      this.saving.set(false);
    }
  }

  protected async removePrompt(): Promise<void> {
    this.saving.set(true);
    this.error.set(null);
    try {
      if (environment.useMockData) return;
      this.apply(await firstValueFrom(this.api.deleteIvrPrompt()));
      this.clearPreview();
    } catch (e) {
      this.error.set(this.message(e, 'The prompt could not be removed.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected async previewPrompt(): Promise<void> {
    try {
      const blob = await firstValueFrom(this.api.getIvrPrompt());
      this.promptUrl.set(URL.createObjectURL(blob));
    } catch {
      this.error.set('The prompt could not be loaded.');
    }
  }

  private clearPreview(): void {
    const url = this.promptUrl();
    if (url) URL.revokeObjectURL(url);
    this.promptUrl.set(null);
  }

  private message(e: unknown, fallback: string): string {
    const err = e as { error?: { error?: { message?: string } } };
    return err?.error?.error?.message ?? fallback;
  }
}
