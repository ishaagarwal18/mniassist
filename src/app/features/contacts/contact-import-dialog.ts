import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/ui/toast.service';
import {
  ConsentScope,
  ConsentSource,
  ContactImportService,
  ImportDryRunDto,
  ImportPreviewDto,
  ImportResultDto,
} from '../../proxy/contacts';
import { ArButton, ArDialog, ArIcon } from '../../ui';
import { ArSelect } from '../../ui/select';
import { cardsToCsv, parseVCards } from './vcard';

type Step = 'file' | 'map' | 'check' | 'done';

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
 * lists every rejected row); import.
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
                >Evidence <span class="ar-field__opt">optional but recommended</span></span
              >
              <input
                class="ar-field__input"
                maxlength="256"
                placeholder="e.g. IMTEX 2026 badge scans, signed AMC contracts folder"
                [value]="evidence()"
                (input)="evidence.set($any($event.target).value)"
              />
              <span class="ar-field__hint"
                >Kept against every contact in this import, for audits.</span
              >
            </label>
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

        @case ('done') {
          @if (result(); as r) {
            <div class="im__done">
              <ar-icon name="check" [size]="28" />
              <p>
                <strong>{{ r.created ?? 0 }}</strong> created,
                <strong>{{ r.updated ?? 0 }}</strong> updated,
                <strong>{{ r.skipped ?? 0 }}</strong> skipped.
              </p>
              @if (r.consentScopeDowngraded) {
                <p class="im__muted">
                  They were kept to service messages: this consent source is not an opt-in to
                  marketing.
                </p>
              }
              @for (e of r.errors ?? []; track $index) {
                <p class="im__warn">{{ e }}</p>
              }
            </div>
          }
        }
      }

      <div dialogActions>
        @if (step() === 'map' || step() === 'check') {
          <button ar-button type="button" variant="ghost" data-novalidate (click)="back()">
            Back
          </button>
        }
        @if (step() !== 'done') {
          <button ar-button type="button" variant="ghost" (click)="closed.emit()">Cancel</button>
        }
        @switch (step()) {
          @case ('map') {
            <button
              ar-button
              type="button"
              variant="primary"
              [disabled]="busy() || !phoneMapped()"
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
  protected readonly stepIndex = computed(() => this.steps.findIndex((s) => s.key === this.step()));
  protected readonly busy = signal(false);
  protected readonly reading = signal(false);
  protected readonly dragOver = signal(false);

  protected readonly fileName = signal('');
  protected readonly fromVcard = signal(false);
  private content = '';
  protected readonly preview = signal<ImportPreviewDto | null>(null);
  protected readonly mapping = signal<Record<string, string>>({});
  protected readonly source = signal<ConsentSource>(ConsentSource.Manual);
  protected readonly scope = signal<ConsentScope>(ConsentScope.UtilityOnly);
  protected readonly countryCode = signal('91');
  protected readonly evidence = signal('');
  protected readonly dryRun = signal<ImportDryRunDto | null>(null);
  protected readonly result = signal<ImportResultDto | null>(null);

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
      const preview = environment.useMockData
        ? localPreview(this.content)
        : await firstValueFrom(this.api.inspect({ content: this.content }));
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
      defaultCountryCode: this.countryCode() || '91',
    };
  }

  protected async check(): Promise<void> {
    this.busy.set(true);
    try {
      this.dryRun.set(
        environment.useMockData
          ? {
              totalRows: this.preview()?.rowCount,
              willCreate: this.preview()?.rowCount,
              rejected: [],
            }
          : await firstValueFrom(this.api.dryRun(this.request())),
      );
      this.step.set('check');
    } catch {
      /* shown as a toast */
    } finally {
      this.busy.set(false);
    }
  }

  protected async run(): Promise<void> {
    this.busy.set(true);
    try {
      const result = environment.useMockData
        ? { created: this.importable(), updated: 0, skipped: 0 }
        : await firstValueFrom(this.api.import(this.request()));
      this.result.set(result);
      this.step.set('done');
    } catch {
      /* shown as a toast */
    } finally {
      this.busy.set(false);
    }
  }

  protected back(): void {
    this.step.set(this.step() === 'check' ? 'map' : 'file');
  }
}

/** Mock mode: the header row and a guess at the phone column, without the API. */
function localPreview(csv: string): ImportPreviewDto {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  const headers = (lines[0] ?? '').split(',').map((h) => h.replace(/^"|"$/g, '').trim());
  const phone = headers.find((h) => /phone|mobile|whatsapp|number/i.test(h));
  return {
    headers,
    rowCount: Math.max(0, lines.length - 1),
    suggestedMapping: phone ? { [phone]: 'waId' } : {},
    sampleRows: lines.slice(1, 6).map((l) => l.split(',')) as unknown as [string][],
    availableFields: [
      { value: 'waId', label: 'Phone number', isRequired: true },
      { value: 'displayName', label: 'Contact name' },
      { value: 'companyName', label: 'Company' },
      { value: 'designation', label: 'Designation' },
      { value: 'city', label: 'City' },
      { value: 'state', label: 'State' },
    ],
  };
}
