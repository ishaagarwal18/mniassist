import { NgTemplateOutlet } from '@angular/common';
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
  WhatsAppIvrLookup,
  WhatsAppIvrOptionKind,
  WhatsAppIvrSettingsDto,
} from '../../proxy/messaging/whats-app-call.service';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ArBanner, ArButton, ArDialog } from '../../ui';
import {
  IVR_KEYS,
  IvrRow,
  MAX_IVR_LEVELS,
  RECOMMENDED_WELCOME,
  addIvrRow,
  recommendedIvrMenu,
  ivrMenuProblem,
  removeIvrRow,
  toIvrInput,
  toIvrRows,
  updateIvrRow,
} from './ivr-menu';

const MOCK: WhatsAppIvrSettingsDto = {
  enabled: false,
  options: [],
  inputSeconds: 6,
  attempts: 3,
  hasPrompt: false,
  canSpeakPrompt: false,
  active: false,
  problems: ['Upload the menu prompt.', 'Add the menu options.', 'The menu is switched off.'],
  queueMinutes: 3,
  maxLevels: MAX_IVR_LEVELS,
  stepPrompts: {},
};

const KINDS: { value: WhatsAppIvrOptionKind; label: string }[] = [
  { value: 'RingTeam', label: 'Rings a team' },
  { value: 'SubMenu', label: 'Opens a sub-menu' },
  { value: 'Lookup', label: 'Reads out a lookup' },
];

const LOOKUPS: { value: WhatsAppIvrLookup; label: string }[] = [
  { value: 'ServiceTicket', label: 'Service ticket status (caller keys in the number)' },
  { value: 'SalesOrder', label: 'Sales order status (caller keys in the number)' },
  { value: 'PurchaseOrder', label: 'Purchase order status, for suppliers (keys in the number)' },
  {
    value: 'Product',
    label: "Spare or hardware part number: the caller's machine and warranty, then price and stock",
  },
  { value: 'FaultCode', label: 'Fault code from the machine, answered from the knowledge base' },
  { value: 'MyAccount', label: "The caller's open tickets and latest order" },
];

/**
 * Native WhatsApp IVR: the call relay answers a customer's WhatsApp call, plays the menu and reads the keys they press. An
 * option rings a team, opens a sub-menu (Sales · Purchase · Service → Repairs · Spares · Ticket status), or reads out a lookup
 * from the workspace's records (a ticket's status, an order's delivery) before ringing a team. Until everything is in place —
 * the relay, the prompts, and every option's team staffed — calls ring every agent as before, and the dialog says what's
 * missing.
 */
@Component({
  selector: 'ar-whatsapp-ivr-dialog',
  imports: [ArDialog, ArButton, ArBanner, RouterLink, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog
      title="Call menu (IVR)"
      width="min(760px, calc(100vw - 32px))"
      (dismiss)="closed.emit()"
    >
      <p class="ivr__hint">
        Callers hear the menu and press a key. An option can ring a team, open a sub-menu (for
        example Sales, Purchase and Service, with Repairs, Spares and Ticket status under Service),
        or read out a ticket's or order's status the caller keys in, then ring a team.
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

        <section class="ivr__section" aria-labelledby="ivr-welcome-h">
          <h3 id="ivr-welcome-h" class="ivr__h">Welcome greeting</h3>
          <label class="ar-field" for="ivr-welcome">
            <span class="ar-field__label">Spoken first, before the menu (optional)</span>
            <textarea
              id="ivr-welcome"
              class="ar-field__input"
              rows="2"
              maxlength="300"
              placeholder="Welcome to Sun Energy Automation. नमस्ते। नमस्कार।"
              [value]="welcome()"
              (input)="welcome.set($any($event.target).value)"
            ></textarea>
          </label>
          @if (s.hasPrompt && !s.spokenPrompt) {
            <p class="ivr__hint">
              Your uploaded recording plays instead of the spoken menu, so record the welcome in it,
              or use a spoken prompt.
            </p>
          }
        </section>

        <section class="ivr__section" aria-labelledby="ivr-prompt-h">
          <h3 id="ivr-prompt-h" class="ivr__h">Main menu prompt</h3>
          @if (s.spokenPrompt) {
            <p class="ivr__hint">
              Spoken automatically from the options ({{ s.promptSeconds }} s):
            </p>
            <p class="ivr__script">{{ s.spokenPrompt }}</p>
          } @else if (s.hasPrompt) {
            <p class="ivr__hint">
              Your recording, {{ s.promptSeconds }} s, converted for WhatsApp calling.
            </p>
          }
          @if (s.hasPrompt) {
            @if (promptUrl(); as url) {
              <audio controls preload="none" [src]="url" aria-label="Current menu prompt"></audio>
            } @else {
              <button ar-button type="button" variant="ghost" (click)="previewPrompt()">
                Play the prompt
              </button>
            }
          } @else if (s.canSpeakPrompt) {
            <p class="ivr__hint">
              No recording needed: saving the options speaks them in each option's language
              (English, Hindi, Marathi; other labels in English).
            </p>
          } @else {
            <p class="ivr__hint">No prompt yet.</p>
          }
          @if (s.canSpeakPrompt && s.hasPrompt) {
            <button
              ar-button
              type="button"
              variant="ghost"
              [disabled]="saving() || rows().length === 0"
              (click)="speakPrompt()"
            >
              {{ s.spokenPrompt ? 'Speak the prompt again' : 'Use a spoken prompt instead' }}
            </button>
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
            The first option at each level is where a caller who presses nothing goes. Up to
            {{ maxLevels() }} levels. Sub-menus and lookups are spoken by the server's text to
            speech. A caller waits up to {{ s.queueMinutes }} minutes for an agent.
          </p>
          @if (!s.canSpeakPrompt) {
            <p class="ivr__hint">
              Text to speech isn't available on this server, so only options that ring a team will
              work.
            </p>
          }
          <button ar-button type="button" variant="ghost" (click)="useRecommended()">
            Use the recommended menu
          </button>
          <p class="ivr__hint">
            Language (English, हिंदी, मराठी) → New purchase, Sales and billing, Support and repair →
            in Support and repair, a spare or part number or a fault code. Teams named Purchase,
            Sales or Billing, and Support or Service are chosen for you.
          </p>
          <ng-container
            [ngTemplateOutlet]="level"
            [ngTemplateOutletContext]="{ $implicit: rows(), parent: [], depth: 1, prefix: '' }"
          />
          @if (teams().length === 0) {
            <p class="ivr__hint">
              Create the teams first (for example Sales, Purchase and Service desks) under
              <a routerLink="/settings/teams" (click)="closed.emit()">Settings → Teams</a>.
            </p>
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
            [disabled]="saving() || (!s.hasPrompt && !s.canSpeakPrompt && !enabled())"
            (change)="enabled.set($any($event.target).checked)"
          />
          Answer WhatsApp calls with this menu
        </label>
      } @else {
        <p class="ivr__hint">Loading…</p>
      }

      @if (problem(); as p) {
        <p class="ivr__hint ivr__warn">{{ p }}</p>
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
          [disabled]="saving() || !!problem()"
          (click)="save()"
        >
          {{ saving() ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </ar-dialog>

    <!-- One level of the menu; a sub-menu renders its own options with this template, indented. -->
    <ng-template #level let-rows let-parent="parent" let-depth="depth" let-prefix="prefix">
      <ul class="ivr__level" [class.ivr__level--sub]="depth > 1">
        @for (row of rows; track $index; let i = $index) {
          @let path = parent.concat([i]);
          @let id = idOf(path);
          @let where = prefix + row.digit;
          <li class="ivr__opt">
            <div class="ivr__row">
              <label class="ar-field ivr__key" [for]="'ivr-key-' + id">
                <span class="ar-field__label">Key</span>
                <select
                  class="ar-field__input"
                  [id]="'ivr-key-' + id"
                  (change)="edit(path, { digit: $any($event.target).value })"
                >
                  @for (k of digitKeys; track k) {
                    <option [value]="k" [selected]="k === row.digit">{{ k }}</option>
                  }
                </select>
              </label>
              <label class="ar-field" [for]="'ivr-label-' + id">
                <span class="ar-field__label">Label</span>
                <input
                  class="ar-field__input"
                  [id]="'ivr-label-' + id"
                  maxlength="64"
                  [value]="row.label"
                  [placeholder]="depth === 1 ? 'Service' : 'Spares'"
                  (input)="edit(path, { label: $any($event.target).value })"
                />
              </label>
              <label class="ar-field" [for]="'ivr-kind-' + id">
                <span class="ar-field__label">Pressing it</span>
                <select
                  class="ar-field__input"
                  [id]="'ivr-kind-' + id"
                  (change)="setKind(path, $any($event.target).value)"
                >
                  @for (k of kinds; track k.value) {
                    <option
                      [value]="k.value"
                      [selected]="k.value === row.kind"
                      [disabled]="k.value === 'SubMenu' && depth >= maxLevels()"
                    >
                      {{ k.label }}
                    </option>
                  }
                </select>
              </label>
              <button
                ar-button
                type="button"
                variant="ghost"
                class="ivr__remove"
                [attr.aria-label]="'Remove option ' + where"
                (click)="remove(path)"
              >
                Remove
              </button>
            </div>

            @if (row.kind === 'Lookup') {
              <div class="ivr__row ivr__row--more">
                <label class="ar-field" [for]="'ivr-lookup-' + id">
                  <span class="ar-field__label">Looks up</span>
                  <select
                    class="ar-field__input"
                    [id]="'ivr-lookup-' + id"
                    (change)="edit(path, { lookup: $any($event.target).value })"
                  >
                    <option value="" [selected]="!row.lookup" disabled>Choose…</option>
                    @for (l of lookups; track l.value) {
                      <option [value]="l.value" [selected]="l.value === row.lookup">
                        {{ l.label }}
                      </option>
                    }
                  </select>
                </label>
                <ng-container
                  [ngTemplateOutlet]="team"
                  [ngTemplateOutletContext]="{
                    $implicit: row,
                    path: path,
                    id: id,
                    label: 'Then rings',
                  }"
                />
              </div>
            } @else if (row.kind === 'RingTeam') {
              <div class="ivr__row ivr__row--more">
                <ng-container
                  [ngTemplateOutlet]="team"
                  [ngTemplateOutletContext]="{
                    $implicit: row,
                    path: path,
                    id: id,
                    label: 'Rings team',
                  }"
                />
              </div>
            }

            @if (row.kind === 'SubMenu' || (row.kind === 'Lookup' && row.lookup !== 'MyAccount')) {
              <label class="ar-field ivr__say" [for]="'ivr-say-' + id">
                <span class="ar-field__label">{{
                  row.kind === 'SubMenu'
                    ? 'Opening words (optional; default: the label)'
                    : 'Words asking for the number (optional)'
                }}</span>
                <input
                  class="ar-field__input"
                  [id]="'ivr-say-' + id"
                  maxlength="300"
                  [value]="row.say"
                  [placeholder]="
                    row.kind === 'SubMenu'
                      ? 'Service desk.'
                      : 'Please key in your ticket number, then press hash.'
                  "
                  (input)="edit(path, { say: $any($event.target).value })"
                />
              </label>
              @if (spoken(where); as words) {
                <p class="ivr__hint ivr__heard">
                  Callers hear: <span class="ivr__words" translate="no">{{ words }}</span>
                </p>
              }
            }

            @if (row.kind === 'SubMenu') {
              <ng-container
                [ngTemplateOutlet]="level"
                [ngTemplateOutletContext]="{
                  $implicit: row.options,
                  parent: path,
                  depth: depth + 1,
                  prefix: where,
                }"
              />
            }
          </li>
        }
      </ul>
      @if (rows.length < 9) {
        <button ar-button type="button" variant="ghost" class="ivr__add" (click)="add(parent)">
          {{ depth === 1 ? 'Add an option' : 'Add an option to this sub-menu' }}
        </button>
      }
    </ng-template>

    <ng-template #team let-row let-path="path" let-id="id" let-label="label">
      <label class="ar-field" [for]="'ivr-team-' + id">
        <span class="ar-field__label">{{ label }}</span>
        <select
          class="ar-field__input"
          [id]="'ivr-team-' + id"
          (change)="edit(path, { teamId: $any($event.target).value })"
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
    </ng-template>
  `,
  styles: `
    .ivr__script {
      margin: 0 0 8px;
      padding: 8px 10px;
      white-space: pre-line;
      font: 500 13px var(--ar-font-sans);
      color: var(--ar-ink-900);
      background: var(--ar-bg-100);
      border-radius: 6px;
    }
    .ivr__hint {
      margin: 0 0 8px;
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .ivr__warn {
      margin-top: 8px;
      color: var(--ar-warn-700, #b54708);
    }
    .ivr__heard {
      margin: 4px 0 0;
      font-size: 12px;
    }
    .ivr__words {
      white-space: pre-line;
      color: var(--ar-ink-700);
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
    .ivr__level {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .ivr__level--sub {
      margin: 8px 0 0 12px;
      padding-left: 12px;
      border-left: 2px solid var(--ar-line-200);
    }
    .ivr__opt {
      padding: 8px 0;
      border-bottom: 1px solid var(--ar-line-100, var(--ar-line-200));
    }
    .ivr__level--sub > .ivr__opt:last-child {
      border-bottom: 0;
    }
    .ivr__row {
      display: grid;
      grid-template-columns: 64px 1fr 1.2fr auto;
      gap: 8px;
      align-items: end;
    }
    .ivr__row--more {
      grid-template-columns: 1fr 1fr;
      margin-top: 6px;
    }
    .ivr__say {
      display: block;
      margin-top: 6px;
    }
    .ivr__add {
      margin-top: 4px;
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
    @media (max-width: 600px) {
      .ivr__row,
      .ivr__row--more {
        grid-template-columns: 1fr 1fr;
      }
      .ivr__key {
        grid-column: 1 / -1;
      }
    }
  `,
})
export class ArWhatsAppIvrDialog {
  private readonly api = inject(WhatsAppCallService);
  private readonly teamApi = inject(TeamService);
  private readonly confirm = inject(ConfirmService);

  readonly closed = output<void>();

  protected readonly digitKeys = IVR_KEYS;
  protected readonly kinds = KINDS;
  protected readonly lookups = LOOKUPS;
  protected readonly settings = signal<WhatsAppIvrSettingsDto | null>(null);
  protected readonly teams = signal<TeamDto[]>([]);
  protected readonly rows = signal<IvrRow[]>([]);
  protected readonly enabled = signal(false);
  protected readonly welcome = signal('');
  protected readonly inputSeconds = signal(6);
  protected readonly attempts = signal(3);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly promptUrl = signal<string | null>(null);
  protected readonly maxLevels = computed(() => this.settings()?.maxLevels ?? MAX_IVR_LEVELS);

  /** What stops the options being saved, in words; null when they can be. */
  protected readonly problem = computed(() =>
    this.settings()
      ? ivrMenuProblem(this.rows(), this.maxLevels(), this.enabled())
      : 'The call menu is still loading.',
  );

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
    this.rows.set(toIvrRows(s.options));
    this.enabled.set(s.enabled);
    this.welcome.set(s.welcome ?? '');
    this.inputSeconds.set(s.inputSeconds);
    this.attempts.set(s.attempts);
  }

  /** A stable id for a row's fields, from where it sits ("0-2"). */
  protected idOf(path: number[]): string {
    return path.join('-');
  }

  /** The words callers hear for the sub-menu or lookup question at these keys, as last saved. */
  protected spoken(keys: string): string | null {
    return this.settings()?.stepPrompts?.[keys] ?? null;
  }

  protected add(parent: number[]): void {
    this.rows.update((rows) => addIvrRow(rows, parent));
  }

  protected remove(path: number[]): void {
    this.rows.update((rows) => removeIvrRow(rows, path));
  }

  protected edit(path: number[], change: Partial<IvrRow>): void {
    this.rows.update((rows) => updateIvrRow(rows, path, (r) => ({ ...r, ...change })));
  }

  protected setKind(path: number[], kind: WhatsAppIvrOptionKind): void {
    this.rows.update((rows) =>
      updateIvrRow(rows, path, (r) => ({
        ...r,
        kind,
        // A new sub-menu starts with one option to fill in, so it is never saved empty by accident.
        options: kind === 'SubMenu' && r.options.length === 0 ? addIvrRow([], []) : r.options,
      })),
    );
  }

  /** Fills in the recommended menu (and a welcome, if there is none); nothing is saved until Save. */
  protected async useRecommended(): Promise<void> {
    if (
      this.rows().length > 0 &&
      !(await this.confirm.confirm({
        title: 'Replace the menu?',
        message:
          'The options below are replaced with the recommended menu. Nothing is saved until you press Save.',
        confirmText: 'Replace',
      }))
    ) {
      return;
    }
    this.rows.set(recommendedIvrMenu(this.teams()));
    if (!this.welcome().trim()) {
      this.welcome.set(RECOMMENDED_WELCOME.replace('{0}', 'our company'));
    }
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
            welcome: this.welcome().trim() || null,
            options: toIvrInput(this.rows()),
            inputSeconds: this.inputSeconds(),
            attempts: this.attempts(),
          }),
        ),
      );
      this.clearPreview(); // the options may have been spoken again
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

  protected async speakPrompt(): Promise<void> {
    this.saving.set(true);
    this.error.set(null);
    try {
      if (environment.useMockData) return;
      this.apply(await firstValueFrom(this.api.speakIvrPrompt()));
      this.clearPreview();
    } catch (e) {
      this.error.set(this.message(e, 'The prompt could not be spoken.'));
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
