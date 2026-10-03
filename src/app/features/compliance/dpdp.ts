import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { grantedPolicy } from '../../core/auth/permission';
import { ArTopbar } from '../../layout/topbar';
import {
  DpdpProfileDto,
  DpdpReadinessDto,
  DpdpReadinessService,
  ReadinessStatus,
} from '../../proxy/compliance/dpdp-readiness.service';
import { ArButton, ArChip } from '../../ui';
import type { ChipTone } from '../../ui/chip';

const SEED: DpdpReadinessDto = {
  profile: {
    legalName: 'Emnisoft Pvt Ltd',
    address: null,
    grievanceOfficerName: null,
    purposes: 'Sending quotations and order updates on WhatsApp\nScheduling service visits',
    processors: 'Meta Platforms — WhatsApp Business messaging',
  },
  ready: 6,
  gaps: 5,
  needsReview: 1,
  checks: [
    {
      key: 'fiduciary',
      title: 'Who is responsible for the data',
      status: 'Gap',
      detail: "Add the business's legal name and address.",
      section: 'profile',
    },
    {
      key: 'grievance',
      title: 'A person customers can complain to',
      status: 'Gap',
      detail: 'Name a grievance officer with an email or phone number.',
      section: 'profile',
    },
    {
      key: 'purposes',
      title: 'What the data is used for',
      status: 'Ready',
      detail: '2 purpose(s) listed.',
      section: 'profile',
    },
    {
      key: 'opt-out',
      title: 'Stopping when asked',
      status: 'Ready',
      detail: 'STOP and similar replies suppress the contact automatically.',
      section: null,
    },
    {
      key: 'consent-evidence',
      title: 'Proof of marketing consent',
      status: 'Gap',
      detail: '37 of 412 marketing contacts have no recorded source or date.',
      section: 'contacts',
    },
    {
      key: 'legal-review',
      title: 'A lawyer has reviewed the notice',
      status: 'Review',
      detail: 'The draft here is not legal advice. Have it reviewed, then record the date.',
      section: 'profile',
    },
  ],
  noticeDraft:
    'DRAFT FOR LEGAL REVIEW — NOT LEGAL ADVICE\n\nPrivacy notice — Emnisoft Pvt Ltd\n…',
  noticeDrafts: {
    en: 'DRAFT FOR LEGAL REVIEW — NOT LEGAL ADVICE\n\nPrivacy notice — Emnisoft Pvt Ltd\n…',
    hi: 'कानूनी समीक्षा के लिए मसौदा — यह कानूनी सलाह नहीं है\n\nगोपनीयता सूचना — Emnisoft Pvt Ltd\n…',
    mr: 'कायदेशीर पुनरावलोकनासाठी मसुदा — हा कायदेशीर सल्ला नाही\n\nगोपनीयता सूचना — Emnisoft Pvt Ltd\n…',
  },
};

const NOTICE_LANGUAGES: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'mr', label: 'मराठी' },
];

const FIELDS: {
  key: keyof DpdpProfileDto;
  label: string;
  hint?: string;
  multi?: boolean;
  type?: string;
}[] = [
  { key: 'legalName', label: 'Legal name of the business' },
  { key: 'address', label: 'Registered address' },
  { key: 'grievanceOfficerName', label: 'Grievance officer' },
  { key: 'grievanceEmail', label: 'Grievance email', type: 'email' },
  { key: 'grievancePhone', label: 'Grievance phone', type: 'tel' },
  {
    key: 'purposes',
    label: 'What you use customer data for',
    hint: 'One purpose per line',
    multi: true,
  },
  {
    key: 'processors',
    label: 'Who processes it for you',
    hint: 'One per line: WhatsApp, hosting, payments, email',
    multi: true,
  },
  { key: 'noticeUrl', label: 'Published notice link', hint: 'https://…', type: 'url' },
  { key: 'legalReviewedOn', label: 'Date a lawyer last reviewed the notice', type: 'date' },
];

/**
 * M5: how ready the workspace is for India's Digital Personal Data Protection Act, 2023 — a checklist computed from what the
 * workspace records, the fiduciary details a notice needs, and a plain-language notice draft. Not legal advice; the page says so.
 */
@Component({
  selector: 'ar-dpdp',
  imports: [ArTopbar, ArButton, ArChip, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="DPDP readiness"
      subtitle="Digital Personal Data Protection Act, 2023"
      help="A working checklist, not legal advice. Most checks read what MNI Assist already records (consent evidence, opt-outs, retention, requests, breaches); the rest need the details below. The notice draft is a starting point for your lawyer."
    >
      <a ar-button variant="ghost" routerLink="/compliance">Requests, retention & breaches</a>
    </ar-topbar>

    <div class="dp ar-scroll">
      @if (error(); as e) {
        <p class="dp__err" role="alert">{{ e }}</p>
      }
      @if (data(); as d) {
        <p class="dp__sum">
          <b>{{ d.ready }}</b> ready · <b>{{ d.gaps }}</b> to fix · <b>{{ d.needsReview }}</b> for
          your lawyer
        </p>
        <ul class="checks">
          @for (c of d.checks; track c.key) {
            <li class="check">
              <ar-chip [tone]="tone(c.status)" [dot]="true">{{ statusLabel(c.status) }}</ar-chip>
              <div>
                <b>{{ c.title }}</b>
                <p>{{ c.detail }}</p>
              </div>
            </li>
          }
        </ul>

        <section class="card" aria-labelledby="dp-profile">
          <h2 id="dp-profile">Your details as data fiduciary</h2>
          <div class="grid">
            @for (f of fields; track f.key) {
              <label class="ar-field" [class.wide]="f.multi" [attr.for]="'dp-' + f.key">
                <span class="ar-field__label"
                  >{{ f.label }}
                  @if (f.hint) {
                    <span class="ar-field__opt">({{ f.hint }})</span>
                  }
                </span>
                @if (f.multi) {
                  <textarea
                    class="ar-field__input"
                    rows="3"
                    [id]="'dp-' + f.key"
                    [disabled]="!canEdit"
                    [value]="value(f.key)"
                    (input)="set(f.key, $any($event.target).value)"
                  ></textarea>
                } @else {
                  <input
                    class="ar-field__input"
                    [id]="'dp-' + f.key"
                    [type]="f.type || 'text'"
                    [disabled]="!canEdit"
                    [value]="value(f.key)"
                    (input)="set(f.key, $any($event.target).value)"
                  />
                }
              </label>
            }
          </div>
          @if (saveError(); as e) {
            <p class="dp__err" role="alert">{{ e }}</p>
          }
          @if (canEdit) {
            <div class="actions">
              <button
                ar-button
                type="button"
                variant="primary"
                [disabled]="busy()"
                (click)="save()"
              >
                {{ busy() ? 'Saving…' : 'Save and recheck' }}
              </button>
            </div>
          }
        </section>

        <section class="card" aria-labelledby="dp-notice">
          <h2 id="dp-notice">Privacy notice draft</h2>
          <p class="dp__hint">
            Generated from your details and retention periods. Have a lawyer review it before you
            publish it; then record the link and the review date above. The Hindi and Marathi
            versions are machine-written starting points: have a native speaker check them too.
          </p>
          <div class="langs" role="tablist" aria-label="Notice language">
            @for (l of languages; track l.code) {
              <button
                type="button"
                role="tab"
                class="langs__tab"
                [attr.aria-selected]="language() === l.code"
                [attr.lang]="l.code"
                (click)="language.set(l.code); copied.set(false)"
              >
                {{ l.label }}
              </button>
            }
          </div>
          <pre class="notice" role="tabpanel" [attr.lang]="language()">{{ notice(d) }}</pre>
          <div class="actions">
            <button
              ar-button
              type="button"
              variant="ghost"
              icon="download"
              (click)="copy(notice(d))"
            >
              {{ copied() ? 'Copied' : 'Copy text' }}
            </button>
          </div>
        </section>
      } @else if (!error()) {
        <p class="dp__hint">Loading…</p>
      }
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
    }
    .dp {
      padding: 16px 20px 32px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      max-width: 980px;
    }
    .dp__sum {
      margin: 0;
      font: 400 13.5px var(--ar-font-sans);
      color: var(--ar-ink-700, #344054);
    }
    .dp__sum b {
      font-variant-numeric: tabular-nums;
      color: var(--ar-ink-900);
    }
    .checks {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 8px;
    }
    .check {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      padding: 10px 12px;
      font: 400 13px var(--ar-font-sans);
    }
    .check p {
      margin: 2px 0 0;
      color: var(--ar-ink-500);
      font-size: 12.5px;
      line-height: 1.45;
    }
    .card {
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .card h2 {
      margin: 0;
      font: 600 14px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 10px;
    }
    .grid .wide {
      grid-column: 1 / -1;
    }
    .actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    .langs {
      display: flex;
      gap: 4px;
      margin-bottom: 8px;
    }
    .langs__tab {
      border: 1px solid var(--ar-line-200);
      background: var(--ar-white);
      border-radius: 999px;
      padding: 4px 12px;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-ink-700, #344054);
      cursor: pointer;
    }
    .langs__tab[aria-selected='true'] {
      background: var(--ar-inverse-bg);
      border-color: var(--ar-inverse-bg);
      color: var(--ar-inverse-fg);
    }
    .langs__tab:focus-visible {
      outline: 2px solid var(--ar-teal-600, #0d9488);
      outline-offset: 2px;
    }
    .notice {
      margin: 0;
      padding: 12px;
      background: var(--ar-bg-100);
      border-radius: 6px;
      font: 400 12.5px/1.55 var(--ar-font-mono, ui-monospace, monospace);
      white-space: pre-wrap;
      overflow-x: auto;
      max-height: 420px;
    }
    .dp__hint {
      margin: 0;
      font: 400 12.5px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-500);
      max-width: 80ch;
    }
    .dp__err {
      margin: 0;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-bad-600, #b42318);
    }
    @media (max-width: 560px) {
      .dp {
        padding-inline: 12px;
      }
    }
  `,
})
export class ArDpdp {
  private readonly api = inject(DpdpReadinessService);
  protected readonly canEdit = grantedPolicy(
    'AutoReach.Compliance.ManageConsentText',
    inject(PermissionService),
  );
  protected readonly fields = FIELDS;

  protected readonly data = signal<DpdpReadinessDto | null>(null);
  protected readonly profile = signal<DpdpProfileDto>({});
  protected readonly busy = signal(false);
  protected readonly copied = signal(false);
  protected readonly languages = NOTICE_LANGUAGES;
  protected readonly language = signal('en');

  protected notice(d: DpdpReadinessDto): string {
    return d.noticeDrafts?.[this.language()] ?? d.noticeDraft;
  }
  protected readonly error = signal<string | null>(null);
  protected readonly saveError = signal<string | null>(null);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const d = environment.useMockData ? SEED : await firstValueFrom(this.api.get());
      this.data.set(d);
      this.profile.set({
        ...d.profile,
        legalReviewedOn: d.profile.legalReviewedOn?.slice(0, 10) ?? null,
      });
    } catch (e: unknown) {
      this.error.set(this.problem(e, 'Could not load the readiness check.'));
    }
  }

  protected value(key: keyof DpdpProfileDto): string {
    return this.profile()[key] ?? '';
  }

  protected set(key: keyof DpdpProfileDto, value: string): void {
    this.profile.update((p) => ({ ...p, [key]: value }));
  }

  protected tone(s: ReadinessStatus): ChipTone {
    return s === 'Ready' ? 'good' : s === 'Gap' ? 'bad' : 'warn';
  }

  protected statusLabel(s: ReadinessStatus): string {
    return s === 'Ready' ? 'Ready' : s === 'Gap' ? 'To fix' : 'Lawyer';
  }

  protected async save(): Promise<void> {
    this.busy.set(true);
    this.saveError.set(null);
    try {
      const p = this.profile();
      const input: DpdpProfileDto = Object.fromEntries(
        Object.entries(p).map(([k, v]) => [k, typeof v === 'string' && v.trim() === '' ? null : v]),
      );
      if (!environment.useMockData) await firstValueFrom(this.api.updateProfile(input));
      await this.load();
    } catch (e: unknown) {
      this.saveError.set(this.problem(e, 'The details could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async copy(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      this.saveError.set('The browser blocked copying; select the text and copy it instead.');
    }
  }

  private problem(e: unknown, fallback: string): string {
    return (e as { error?: { error?: { message?: string } } })?.error?.error?.message ?? fallback;
  }
}
