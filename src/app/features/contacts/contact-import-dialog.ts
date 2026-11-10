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
import { ToastService } from '../../core/ui/toast.service';
import {
  ConsentScope,
  ConsentSource,
  ContactImportJobDto,
  ContactImportService,
  ContactImportStatus,
  ImportDryRunDto,
  ImportPreviewDto,
} from '../../proxy/contacts';
import { ArButton, ArDialog, ArIcon } from '../../ui';
import { ArSelect } from '../../ui/select';
import { cardsToCsv, parseVCards } from './vcard';

type Step = 'file' | 'map' | 'check' | 'running' | 'done';

/** How often the progress screen asks how the background import is doing. */
const POLL_MS = 1500;

const SOURCES: { value: ConsentSource; label: string }[] = [
  {
    value: ConsentSource.Manual,
    label: 'Collected in person — visiting cards, exhibitions, site visits',
  },
  { value: ConsentSource.Website, label: 'Website form with a WhatsApp opt-in' },
  { value: ConsentSource.WhatsAppOptIn, label: 'They messaged or opted in on WhatsApp' },
  { value: ConsentSource.QrCode, label: 'Scanned our QR code' },
  { value: ConsentSource.ClickToWhatsApp, label: 'Click-to-WhatsApp ad' },
  { value: ConsentSource.Import, label: 'An existing list with no recorded opt-in' },
];

/** Files this size and up are almost certainly not a contact list (or need splitting). */
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Bring contacts in from a file: a CSV (Excel, Tally, Google Sheets, a CRM export)
 * or a vCard file (.vcf — a phone's "share contact", Google/Outlook/iCloud
 * exports). Four steps, as the import API intends: read the file and match its
 * columns; say where consent came from; check (a dry run that writes nothing and
 * lists every rejected row); import. The import runs as a background job: this shows its
 * progress, and the person can close the window — a notification says when it is done.
 */
@Component({
  selector: 'ar-contact-import',
  imports: [ArDialog, ArButton, ArIcon, ArSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog
      title="Import contacts"
      width="min(680px, calc(100vw - 32px))"
      (dismiss)="closed.emit()"
    >
      <ol class="im__steps" aria-label="Steps">
        @for (s of steps; track s.key; let i = $index) {
          <li [class.on]="s.key === step()" [class.done]="stepIndex() > i">
            <span class="im__num">{{ i + 1 }}</span
            >{{ s.label }}
          </li>
        }
      </ol>

      @switch (step()) {
        @case ('file') {
          <label
            class="im__drop"
            [class.im__drop--over]="dragOver()"
            (dragover)="$event.preventDefault(); dragOver.set(true)"
            (dragleave)="dragOver.set(false)"
            (drop)="onDrop($event)"
          >
            <ar-icon name="upload" [size]="26" />
            <strong>Drop a file here, or click to choose one</strong>
            <span>
              CSV (Excel: File → Save As → CSV UTF-8), or vCard (.vcf) from a phone, Google
              Contacts, Outlook or iCloud. Up to 20,000 contacts.
            </span>
            <input
              type="file"
              accept=".csv,.vcf,.vcard,.txt,text/csv,text/vcard,text/x-vcard"
              (change)="onPick($event)"
            />
          </label>
          @if (reading()) {
            <p class="im__muted">Reading {{ fileName() }}…</p>
          }
          <p class="im__muted">
            Each contact needs a WhatsApp-capable phone number. Numbers without a country code get
            the default one you choose next.
          </p>
        }

        @case ('map') {
          @if (preview(); as p) {
            <p class="im__lead">
              <strong>{{ fileName() }}</strong> — {{ p.rowCount }} row{{
                p.rowCount === 1 ? '' : 's'
              }}.
              @if (fromVcard()) {
                Read from {{ p.rowCount }} vCard{{ p.rowCount === 1 ? '' : 's' }}.
              }
              Match each column to a contact field.
            </p>
            <div class="im__map">
              <div class="im__map-head">
                <span>Column in your file</span><span>Sample</span><span>Goes into</span>
              </div>
              @for (h of p.headers ?? []; track h; let i = $index) {
                <div class="im__map-row">
                  <span class="im__col">{{ h }}</span>
                  <span class="im__sample">{{ sampleOf(i) }}</span>
                  <select
                    class="ar-field__input"
                    [attr.aria-label]="'Field for column ' + h"
                    (change)="setMapping(h, $any($event.target).value)"
                  >
                    <option value="" [selected]="!mapping()[h]">Don't import</option>
                    @for (f of p.availableFields ?? []; track f.value) {
                      <option [value]="f.value" [selected]="mapping()[h] === f.value">
                        {{ f.label }}{{ f.isRequired ? ' (required)' : '' }}
                      </option>
                    }
                  </select>
                </div>
              }
            </div>
            @if (!phoneMapped()) {
              <p class="im__warn" role="alert">Choose which column holds the phone number.</p>
            }

            <div class="ar-field-row">
              <label class="ar-field">
                <span class="ar-field__label"
                  >Where did these contacts agree to hear from you?</span
                >
                <select
                  class="ar-field__input"
                  required
                  (change)="source.set(+$any($event.target).value)"
                >
                  @for (s of sources; track s.value) {
                    <option [value]="s.value" [selected]="s.value === source()">
                      {{ s.label }}
                    </option>
                  }
                </select>
              </label>
              <label class="ar-field">
                <span class="ar-field__label">Country code for numbers without one</span>
                <input
                  class="ar-field__input"
                  inputmode="numeric"
                  required
                  pattern="\\d{1,3}"
                  title="One to three digits, e.g. 91 for India."
                  [value]="countryCode()"
                  (input)="countryCode.set($any($event.target).value.trim())"
                />
              </label>
            </div>
            <label class="ar-field">
              <span class="ar-field__label">They may receive</span>
              <select
                required
                class="ar-field__input"
                (change)="scope.set(+$any($event.target).value)"
              >
                <option [value]="Scope.UtilityOnly" [selected]="scope() === Scope.UtilityOnly">
                  Service messages only (order updates, reminders, AMC notices)
                </option>
                <option
                  [value]="Scope.MarketingAndUtility"
                  [selected]="scope() === Scope.MarketingAndUtility"
                >
                  Marketing and service messages
                </option>
              </select>
              <span class="ar-field__hint">
                Marketing needs a real opt-in. A list without one is kept to service messages,
                whatever is chosen here.
              </span>
            </label>
            <label class="ar-field">
              <span class="ar-field__label"
                >Opt-in evidence
                <span class="ar-field__opt">{{
                  needsMarketingEvidence() ? 'required' : 'optional'
                }}</span></span
              >
              <input
                class="ar-field__input"
                maxlength="256"
                [required]="needsMarketingEvidence()"
                placeholder="e.g. form submissions recording explicit WhatsApp opt-in"
                [value]="evidence()"
                (input)="evidence.set($any($event.target).value)"
              />
              <span class="ar-field__hint"
                >Recorded for newly created contacts. Existing consent and opt-outs stay
                unchanged.</span
              >
            </label>
            @if (needsMarketingEvidence()) {
              <label class="ar-field">
                <span class="ar-field__label">Consent notice version</span>
                <input
                  class="ar-field__input"
                  required
                  maxlength="256"
                  placeholder="e.g. website-whatsapp-opt-in/en/v3"
                  [value]="consentTextRef()"
                  (input)="consentTextRef.set($any($event.target).value)"
                />
                <span class="ar-field__hint"
                  >Identify the wording these people agreed to. A QR scan or badge scan alone is not
                  marketing consent.</span
                >
              </label>
            }
          }
        }

        @case ('check') {
          @if (dryRun(); as d) {
            <div class="im__tiles">
              <div>
                <strong>{{ d.willCreate ?? 0 }}</strong
                ><span>new</span>
              </div>
              <div>
                <strong>{{ d.willUpdate ?? 0 }}</strong
                ><span>updated</span>
              </div>
              <div>
                <strong>{{ d.duplicatesInFile ?? 0 }}</strong
                ><span>repeated in file</span>
              </div>
              <div [class.bad]="(d.rejectedCount ?? 0) > 0">
                <strong>{{ d.rejectedCount ?? d.rejected?.length ?? 0 }}</strong
                ><span>rejected</span>
              </div>
            </div>
            @if ((d.countryCodeAdded ?? 0) > 0) {
              <p class="im__muted">
                {{ d.countryCodeAdded }} number{{ d.countryCodeAdded === 1 ? '' : 's' }} had no
                country code; +{{ countryCode() }} was added.
              </p>
            }
            @if (d.rejected?.length) {
              <div class="im__rejects">
                <div class="im__map-head"><span>Row</span><span>Value</span><span>Why</span></div>
                @for (r of d.rejected!.slice(0, 50); track r.rowNumber) {
                  <div class="im__map-row">
                    <span>{{ r.rowNumber }}</span>
                    <span class="im__sample">{{ r.rawValue || '(empty)' }}</span>
                    <span>{{ r.reason }}</span>
                  </div>
                }
              </div>
              <p class="im__muted">
                Rejected rows are skipped. Fix them in the file and import it again.
              </p>
            }
            @if ((d.willCreate ?? 0) + (d.willUpdate ?? 0) === 0) {
              <p class="im__warn" role="alert">Nothing in this file can be imported.</p>
            }
          }
        }

        @case ('running') {
          @if (job(); as j) {
            <div class="im__running" role="status" aria-live="polite">
              <p class="im__lead">
                @if (j.status === Status.Pending) {
                  Waiting to start{{ j.fileName ? ' — ' + j.fileName : '' }}…
                } @else {
                  Importing {{ j.fileName || 'contacts' }}:
                  <strong>{{ (j.processedRows ?? 0).toLocaleString() }}</strong> of
                  {{ (j.totalRows ?? 0).toLocaleString() }} rows
                }
              </p>
              <div
                class="im__bar"
                role="progressbar"
                aria-label="Import progress"
                aria-valuemin="0"
                aria-valuemax="100"
                [attr.aria-valuenow]="percent()"
              >
                <span [style.width.%]="percent()"></span>
              </div>
              <p class="im__muted">
                You can close this window and carry on working. The import continues, and you'll get
                a notification when it finishes. Contacts appear once the whole file is in.
              </p>
              @if (pollLost()) {
                <p class="im__warn" role="alert">
                  Couldn't check on the import just now. It is still running.
                  <button ar-button type="button" variant="ghost" (click)="checkAgain()">
                    Check again
                  </button>
                </p>
              }
            </div>
          }
        }

        @case ('done') {
          @if (job(); as r) {
            @if (r.status === Status.Failed) {
              <div class="im__done im__done--failed">
                <ar-icon name="alert" [size]="28" />
                <p><strong>The import didn't finish, so nothing was imported.</strong></p>
                <p class="im__warn">{{ r.error }}</p>
              </div>
            } @else {
              <div class="im__done">
                <ar-icon name="check" [size]="28" />
                <p>
                  <strong>{{ (r.created ?? 0).toLocaleString() }}</strong> created,
                  <strong>{{ (r.updated ?? 0).toLocaleString() }}</strong> updated,
                  <strong>{{ (r.skipped ?? 0).toLocaleString() }}</strong> skipped.
                </p>
                @if (r.consentScopeDowngraded) {
                  <p class="im__muted">
                    They were kept to service messages: this consent source is not an opt-in to
                    marketing.
                  </p>
                }
              </div>
            }
          }
        }
      }

      <div dialogActions>
        @if (step() === 'map' || step() === 'check') {
          <button ar-button type="button" variant="ghost" data-novalidate (click)="back()">
            Back
          </button>
        }
        @if (step() === 'running') {
          <button ar-button type="button" variant="primary" (click)="closed.emit()">Close</button>
        } @else if (step() !== 'done') {
          <button ar-button type="button" variant="ghost" (click)="closed.emit()">Cancel</button>
        }
        @switch (step()) {
          @case ('map') {
            <button
              ar-button
              type="button"
              variant="primary"
              [disabled]="busy() || !phoneMapped() || !consentEvidenceValid()"
              (click)="check()"
            >
              {{ busy() ? 'Checking…' : 'Check the file' }}
            </button>
          }
          @case ('check') {
            <button
              ar-button
              type="button"
              variant="primary"
              [disabled]="busy() || importable() === 0"
              (click)="run()"
            >
              {{
                busy()
                  ? 'Importing…'
                  : 'Import ' + importable() + ' contact' + (importable() === 1 ? '' : 's')
              }}
            </button>
          }
          @case ('done') {
            @if (job()?.status === Status.Failed && content) {
              <button ar-button type="button" variant="ghost" (click)="step.set('check')">
                Back to the check
              </button>
            }
            <button ar-button type="button" variant="primary" (click)="imported.emit()">
              Done
            </button>
          }
        }
      </div>
    </ar-dialog>
  `,
  styles: `
    .im__steps {
      display: flex;
      gap: 6px;
      margin: 0;
      padding: 0;
      list-style: none;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
    .im__steps li {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 6px;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--ar-line-200);
    }
    .im__steps li.on {
      color: var(--ar-ink-900);
      border-color: var(--ar-primary);
    }
    .im__steps li.done {
      color: var(--ar-ink-600, var(--ar-ink-500));
      border-color: color-mix(in srgb, var(--ar-primary) 45%, transparent);
    }
    .im__num {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-size: 10.5px;
      background: var(--ar-bg-100);
    }
    li.on .im__num {
      background: var(--ar-primary);
      color: #fff;
    }
    .im__drop {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 28px 20px;
      text-align: center;
      border: 1.5px dashed var(--ar-line-300);
      border-radius: var(--ar-radius-card);
      background: var(--ar-bg-50);
      color: var(--ar-ink-500);
      font: 400 12.5px/1.5 var(--ar-font-sans);
      cursor: pointer;
      transition:
        border-color var(--ar-ease),
        background-color var(--ar-ease);
    }
    .im__drop strong {
      font: 600 13.5px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .im__drop:hover,
    .im__drop--over {
      border-color: var(--ar-primary);
      background: var(--ar-blue-100);
    }
    .im__drop input {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
    }
    .im__lead,
    .im__muted,
    .im__warn {
      margin: 0;
      font: 400 12.5px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .im__lead {
      color: var(--ar-ink-700);
    }
    .im__warn {
      color: var(--ar-red-600);
      font-weight: 500;
    }
    .im__map,
    .im__rejects {
      max-height: 260px;
      overflow: auto;
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
    }
    .im__map-head,
    .im__map-row {
      display: grid;
      grid-template-columns: 1.1fr 1.2fr 1.4fr;
      gap: 10px;
      align-items: center;
      padding: 7px 10px;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .im__map-head {
      position: sticky;
      top: 0;
      z-index: 1;
      background: var(--ar-bg-50);
      font: 600 10.5px var(--ar-font-sans);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--ar-ink-400);
      border-bottom: 1px solid var(--ar-line-200);
    }
    .im__map-row + .im__map-row {
      border-top: 1px solid var(--ar-line-200);
    }
    .im__col {
      font-weight: 600;
      overflow-wrap: anywhere;
    }
    .im__sample {
      color: var(--ar-ink-400);
      font-family: var(--ar-font-mono);
      font-size: 11.5px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .im__tiles {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }
    .im__tiles div {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 10px 12px;
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      background: var(--ar-bg-50);
      font: 400 11.5px var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
    .im__tiles strong {
      font: 600 20px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .im__tiles .bad strong {
      color: var(--ar-red-600);
    }
    .im__done {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 10px 0;
      text-align: center;
      color: var(--ar-green-500);
    }
    .im__done p {
      margin: 0;
      font: 400 13.5px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .im__done--failed {
      color: var(--ar-red-600);
    }
    .im__running {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 6px 0;
    }
    .im__bar {
      height: 8px;
      border-radius: 999px;
      background: var(--ar-bg-100);
      overflow: hidden;
    }
    .im__bar span {
      display: block;
      height: 100%;
      min-width: 4px;
      border-radius: inherit;
      background: var(--ar-primary);
      transition: width 0.4s ease;
    }
  `,
})
export class ArContactImport {
  readonly closed = output<void>();
  /** The import ran; the list should refresh. */
  readonly imported = output<void>();

  private readonly api = inject(ContactImportService);
  private readonly toasts = inject(ToastService);

  protected readonly Scope = ConsentScope;
  protected readonly sources = SOURCES;
  protected readonly steps: { key: Step; label: string }[] = [
    { key: 'file', label: 'Choose file' },
    { key: 'map', label: 'Match columns' },
    { key: 'check', label: 'Check' },
    { key: 'done', label: 'Import' },
  ];

  protected readonly step = signal<Step>('file');
  protected readonly stepIndex = computed(() =>
    this.steps.findIndex((s) => s.key === (this.step() === 'running' ? 'done' : this.step())),
  );
  protected readonly busy = signal(false);
  protected readonly reading = signal(false);
  protected readonly dragOver = signal(false);

  protected readonly fileName = signal('');
  protected readonly fromVcard = signal(false);
  /** The file as CSV text; empty when this window resumed an import started elsewhere. */
  protected content = '';
  protected readonly preview = signal<ImportPreviewDto | null>(null);
  protected readonly mapping = signal<Record<string, string>>({});
  protected readonly source = signal<ConsentSource>(ConsentSource.Manual);
  protected readonly scope = signal<ConsentScope>(ConsentScope.UtilityOnly);
  protected readonly countryCode = signal('91');
  protected readonly evidence = signal('');
  protected readonly consentTextRef = signal('');
  protected readonly needsMarketingEvidence = computed(
    () =>
      this.scope() === ConsentScope.MarketingAndUtility &&
      [
        ConsentSource.Website,
        ConsentSource.WhatsAppOptIn,
        ConsentSource.ClickToWhatsApp,
        ConsentSource.QrCode,
      ].includes(this.source()),
  );
  protected readonly consentEvidenceValid = computed(
    () =>
      !this.needsMarketingEvidence() ||
      (!!this.evidence().trim() && !!this.consentTextRef().trim()),
  );
  protected readonly dryRun = signal<ImportDryRunDto | null>(null);
  protected readonly Status = ContactImportStatus;
  /** The background import being watched (or the finished one). */
  protected readonly job = signal<ContactImportJobDto | null>(null);
  protected readonly pollLost = signal(false);
  protected readonly percent = computed(() => {
    const j = this.job();
    const total = j?.totalRows ?? 0;
    return total > 0 ? Math.min(100, Math.round(((j?.processedRows ?? 0) * 100) / total)) : 0;
  });
  private pollTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.pollTimer));
    // An import already running in this workspace (started here earlier, or by a colleague):
    // show its progress instead of a fresh file picker.
    void this.resume();
  }

  private async resume(): Promise<void> {
    try {
      const latest = (await firstValueFrom(this.api.getImportJobs())).items?.[0];
      if (latest && this.isActive(latest) && this.step() === 'file') this.track(latest);
    } catch {
      /* the file picker stays; a failed look-up is shown as a toast */
    }
  }

  private isActive(j: ContactImportJobDto): boolean {
    return j.status === ContactImportStatus.Pending || j.status === ContactImportStatus.Running;
  }

  /** Show this import and keep polling it until it finishes. */
  private track(j: ContactImportJobDto): void {
    this.job.set(j);
    if (this.isActive(j) && j.id) {
      this.step.set('running');
      this.schedulePoll(j.id);
    } else {
      this.step.set('done');
    }
  }

  private schedulePoll(id: string): void {
    clearTimeout(this.pollTimer);
    this.pollTimer = setTimeout(async () => {
      try {
        this.pollLost.set(false);
        this.track(await firstValueFrom(this.api.getImportJob(id)));
      } catch {
        // Stop asking; the import carries on server-side. The person can ask again.
        this.pollLost.set(true);
      }
    }, POLL_MS);
  }

  protected checkAgain(): void {
    const id = this.job()?.id;
    if (id) this.schedulePoll(id);
  }

  protected readonly phoneMapped = computed(() => Object.values(this.mapping()).includes('waId'));
  protected readonly importable = computed(
    () => (this.dryRun()?.willCreate ?? 0) + (this.dryRun()?.willUpdate ?? 0),
  );

  protected onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) void this.read(file);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) void this.read(file);
  }

  private async read(file: File): Promise<void> {
    if (/\.(xlsx?|ods|numbers)$/i.test(file.name)) {
      this.toasts.warning(
        'Save the sheet as CSV first (File → Save As → CSV UTF-8), then choose that file.',
        'Spreadsheet file',
      );
      return;
    }
    if (file.size > MAX_BYTES) {
      this.toasts.warning('That file is over 8 MB. Split it into smaller files.', 'File too large');
      return;
    }
    this.reading.set(true);
    this.fileName.set(file.name);
    try {
      const text = await file.text();
      const isVcard = /\.(vcf|vcard)$/i.test(file.name) || /^\s*BEGIN:VCARD/i.test(text);
      this.fromVcard.set(isVcard);
      if (isVcard) {
        const cards = parseVCards(text);
        if (cards.length === 0) {
          this.toasts.warning(
            'No contacts with a name or number were found in that vCard file.',
            'vCard',
          );
          return;
        }
        this.content = cardsToCsv(cards);
      } else {
        this.content = text.replace(/^﻿/, '');
      }
      const preview = await firstValueFrom(this.api.inspect({ content: this.content }));
      this.preview.set(preview);
      this.mapping.set({ ...(preview.suggestedMapping ?? {}) });
      this.step.set('map');
    } catch {
      // The server's reason is shown as a toast by the API feedback interceptor.
    } finally {
      this.reading.set(false);
    }
  }

  protected sampleOf(column: number): string {
    return (this.preview()?.sampleRows ?? [])
      .map((r) => (r as unknown as string[])[column])
      .filter((v) => v && v.trim())
      .slice(0, 2)
      .join(' · ');
  }

  protected setMapping(header: string, field: string): void {
    this.mapping.update((m) => {
      const next = { ...m };
      // One column per field: choosing a field elsewhere takes it from the column that had it.
      if (field) for (const k of Object.keys(next)) if (next[k] === field) delete next[k];
      if (field) next[header] = field;
      else delete next[header];
      return next;
    });
  }

  private request() {
    return {
      content: this.content,
      columnMapping: this.mapping(),
      consentSource: this.source(),
      consentScope: this.scope(),
      evidenceReference: this.evidence().trim() || null,
      consentTextRef: this.consentTextRef().trim() || null,
      defaultCountryCode: this.countryCode() || '91',
    };
  }

  protected async check(): Promise<void> {
    if (!this.consentEvidenceValid()) return;
    this.busy.set(true);
    try {
      this.dryRun.set(await firstValueFrom(this.api.dryRun(this.request())));
      this.step.set('check');
    } catch {
      /* shown as a toast */
    } finally {
      this.busy.set(false);
    }
  }

  /** Queues the import and switches to its progress; nobody waits on the request itself. */
  protected async run(): Promise<void> {
    this.busy.set(true);
    try {
      this.track(
        await firstValueFrom(
          this.api.startImport({ ...this.request(), fileName: this.fileName() || null }),
        ),
      );
    } catch {
      /* shown as a toast (e.g. another import is still running) */
    } finally {
      this.busy.set(false);
    }
  }

  protected back(): void {
    this.step.set(this.step() === 'check' ? 'map' : 'file');
  }
}
