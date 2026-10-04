import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { FieldJobDto, FieldServiceService } from '../../proxy/support/field-service.service';
import { LocalVisit, fitWithin, startVisit, visitFor } from './field-logic';
import { FieldStore } from './field-store';
import { ArBrand } from '../../layout/brand';
import { ArButton, ArChip, ArIcon, ArMeter } from '../../ui';
import { ChipTone } from '../../ui/chip';

const SEED_DAY = {
  generatedAtUtc: new Date().toISOString(),
  jobs: [
    {
      ticketId: 't1',
      reference: 'TKT-2026-0142',
      subject: 'ACS580 drive tripping on overcurrent',
      description: 'Trips 2–3 times a shift since Monday.',
      priority: 'High',
      status: 'Open',
      dueAtUtc: new Date(Date.now() + 4 * 3_600_000).toISOString(),
      contactId: 'c1',
      customerName: 'R. Kulkarni',
      companyName: 'Kalyani Forge',
      phone: '+919812345678',
      asset: {
        id: 'a1',
        description: 'ACS580 drive, Line 2',
        make: 'ABB',
        model: 'ACS580-01-017A-4',
        serialNumber: 'VP-2291',
        site: 'Plant 2, Nashik',
        amcEndsOn: new Date(Date.now() + 40 * 86_400_000).toISOString(),
        lastServicedOn: new Date(Date.now() - 200 * 86_400_000).toISOString(),
      },
      visit: null,
    },
  ],
};

/** Compresses a camera photo to JPEG within 1600 px. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.82));
}

/**
 * M2: the engineer's phone app. Today's jobs with the customer and machine card; on site, notes, a checklist and photos are saved
 * on the phone and sent when there is signal. Sign-off needs signal: a code goes to the customer on WhatsApp.
 * Installable from the browser menu ("Add to home screen").
 */
@Component({
  selector: 'ar-field',
  imports: [RouterLink, ArBrand, ArButton, ArChip, ArIcon, ArMeter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app">
      <header class="bar">
        <a class="bar__brand" routerLink="/home" title="Back to MNI Assist">
          <ar-brand size="sm" />
        </a>
        <span class="bar__title">Field</span>
        <span class="pill" [class.pill--on]="store.online()">
          <span class="pill__dot"></span>{{ store.online() ? 'Online' : 'Offline' }}
        </span>
        <button
          ar-button
          type="button"
          variant="ghost"
          icon="refresh"
          [disabled]="store.syncing() || !store.online()"
          (click)="store.sync()"
        >
          {{ store.syncing() ? 'Syncing…' : 'Sync' }}
        </button>
      </header>

      @if (!store.online()) {
        <p class="offline">
          You're offline. Notes, ticks and photos are kept on this phone and sent when there is
          signal.
        </p>
      }
      @if (store.summary().waiting) {
        <p class="offline offline--wait">
          {{ store.summary().waiting }} visit{{ store.summary().waiting === 1 ? '' : 's' }}
          waiting to send.
        </p>
      }
      @for (p of store.problems(); track $index) {
        <p class="err" role="alert">{{ p }}</p>
      }

      @if (open(); as j) {
        <!-- ===== One job ===== -->
        <section class="job" [attr.aria-label]="j.reference">
          <button type="button" class="back" (click)="openId.set(null)">
            <ar-icon name="chevron" [size]="14" class="back__icon" /> All jobs
          </button>

          <div class="hero" [class]="'hero hero--' + priorityTone(j.priority)">
            <div class="hero__chips">
              <ar-chip [tone]="priorityTone(j.priority)">{{ j.priority }}</ar-chip>
              <ar-chip tone="neutral" [mono]="true">{{ j.reference }}</ar-chip>
              @if (j.dueAtUtc) {
                <ar-chip [tone]="dueSoon(j.dueAtUtc) ? 'warn' : 'neutral'"
                  >Due {{ time(j.dueAtUtc) }}</ar-chip
                >
              }
            </div>
            <h2 class="hero__t">{{ j.subject }}</h2>
            @if (j.description) {
              <p class="hero__d">{{ j.description }}</p>
            }
          </div>

          <div class="card">
            <p class="card__k">Customer</p>
            <b class="card__t">{{ j.companyName || j.customerName }}</b>
            @if (j.customerName && j.companyName) {
              <span class="muted">{{ j.customerName }}</span>
            }
            @if (j.phone) {
              <div class="row">
                <a ar-button variant="ghost" icon="phone" [href]="'tel:' + j.phone">Call</a>
                <a
                  ar-button
                  variant="ghost"
                  icon="send"
                  [href]="'https://wa.me/' + digits(j.phone)"
                  target="_blank"
                  rel="noopener"
                  >WhatsApp</a
                >
              </div>
            }
          </div>

          @if (j.asset; as a) {
            <div class="card">
              <p class="card__k">Machine</p>
              <b class="card__t">{{ a.description }}</b>
              <dl class="facts">
                @if (a.make || a.model) {
                  <dt>Model</dt>
                  <dd>{{ a.make }} {{ a.model }}</dd>
                }
                @if (a.serialNumber) {
                  <dt>Serial</dt>
                  <dd class="ar-mono">{{ a.serialNumber }}</dd>
                }
                @if (a.site) {
                  <dt>Site</dt>
                  <dd>{{ a.site }}</dd>
                }
                @if (a.amcEndsOn) {
                  <dt>AMC ends</dt>
                  <dd>{{ date(a.amcEndsOn) }}</dd>
                }
                @if (a.warrantyEndsOn) {
                  <dt>Warranty ends</dt>
                  <dd>{{ date(a.warrantyEndsOn) }}</dd>
                }
                @if (a.lastServicedOn) {
                  <dt>Last service</dt>
                  <dd>{{ date(a.lastServicedOn) }}</dd>
                }
              </dl>
            </div>
          }

          @if (visit(); as v) {
            @if (v.state === 'SignedOff') {
              <div class="done">
                <ar-icon name="check" [size]="22" />
                <div>
                  <b>Signed off by {{ v.signedByName }}</b>
                  <p>The ticket is resolved. Nothing more to do here.</p>
                </div>
              </div>
            } @else {
              <div class="card">
                <p class="card__k">Visit · step 1 of 2</p>
                <label class="ar-field" for="fv-notes">
                  <span class="ar-field__label">Work done</span>
                  <textarea
                    id="fv-notes"
                    class="ar-field__input"
                    rows="5"
                    placeholder="What you found, what you changed, parts used"
                    [value]="v.notes"
                    (change)="setNotes(v, $any($event.target).value)"
                  ></textarea>
                </label>

                <div class="checklist">
                  <div class="checklist__head">
                    <span class="ar-field__label">Checklist</span>
                    <span class="muted">{{ doneCount(v) }}/{{ v.checklist.length }}</span>
                  </div>
                  <ar-meter
                    [value]="doneCount(v)"
                    [max]="v.checklist.length || 1"
                    tone="good"
                    [thickness]="5"
                    label="Checklist progress"
                  />
                  @for (c of v.checklist; track $index) {
                    <label class="check" [class.check--done]="c.done">
                      <input
                        type="checkbox"
                        [checked]="c.done"
                        (change)="tick(v, $index, $any($event.target).checked)"
                      />
                      <span>{{ c.label }}</span>
                    </label>
                  }
                </div>

                <div class="photos">
                  <span class="ar-field__label">Photos ({{ v.photoIds.length }})</span>
                  <div class="thumbs">
                    @for (id of v.photoIds; track id) {
                      <img [src]="thumbs()[id] || ''" alt="Visit photo" />
                    }
                    <label class="thumbs__add" for="fv-photo" title="Take a photo">
                      <ar-icon name="camera" [size]="22" />
                      <span>Add</span>
                    </label>
                  </div>
                  <input
                    id="fv-photo"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    hidden
                    (change)="photo(v, $event)"
                  />
                </div>
              </div>

              <div class="card sign">
                <p class="card__k">Customer sign-off · step 2 of 2</p>
                @if (!store.online()) {
                  <p class="muted">
                    Needs signal: a code is sent to the customer on WhatsApp. Everything else is
                    saved.
                  </p>
                } @else if (v.state !== 'AwaitingSignOff' && !codeSent()) {
                  <p class="muted">
                    When the work is done, send the customer a code on WhatsApp to confirm it.
                  </p>
                  <button
                    ar-button
                    type="button"
                    variant="primary"
                    icon="send"
                    [disabled]="busy()"
                    (click)="requestCode(v)"
                  >
                    {{ busy() ? 'Sending…' : 'Send sign-off code' }}
                  </button>
                } @else {
                  <p class="muted">
                    Ask the customer for the 6-digit code they just got on WhatsApp.
                  </p>
                  <div class="ar-field-row">
                    <label class="ar-field" for="fv-code">
                      <span class="ar-field__label">Code</span>
                      <input
                        id="fv-code"
                        class="ar-field__input code"
                        inputmode="numeric"
                        maxlength="6"
                        autocomplete="one-time-code"
                        placeholder="••••••"
                        [value]="code()"
                        (input)="code.set($any($event.target).value)"
                      />
                    </label>
                    <label class="ar-field" for="fv-name">
                      <span class="ar-field__label">Signed by</span>
                      <input
                        id="fv-name"
                        class="ar-field__input"
                        placeholder="Name of the person signing"
                        [value]="signer()"
                        (input)="signer.set($any($event.target).value)"
                      />
                    </label>
                  </div>
                  <div class="row">
                    <button
                      ar-button
                      type="button"
                      variant="primary"
                      icon="check"
                      [disabled]="busy() || code().length !== 6 || !signer().trim()"
                      (click)="confirm(v)"
                    >
                      {{ busy() ? 'Checking…' : 'Confirm sign-off' }}
                    </button>
                    <button
                      ar-button
                      type="button"
                      variant="ghost"
                      [disabled]="busy()"
                      (click)="requestCode(v)"
                    >
                      Send a new code
                    </button>
                  </div>
                }
                @if (signError(); as e) {
                  <p class="err" role="alert">{{ e }}</p>
                }
              </div>
            }
          } @else {
            <button ar-button type="button" variant="primary" class="wide" (click)="arrive(j)">
              I've arrived — start the visit
            </button>
          }
        </section>
      } @else {
        <!-- ===== Today ===== -->
        <div class="today">
          <h1>Today's jobs</h1>
          <p class="muted">{{ todayLabel }}</p>
        </div>
        <section class="tiles" aria-label="Today at a glance">
          <div class="tile">
            <b>{{ jobs().length }}</b
            ><span>jobs</span>
          </div>
          <div class="tile">
            <b>{{ dueSoonCount() }}</b
            ><span>due in 4 h</span>
          </div>
          <div class="tile">
            <b>{{ signedCount() }}</b
            ><span>signed off</span>
          </div>
        </section>

        <ul class="jobs">
          @for (j of jobs(); track j.ticketId) {
            <li>
              <button
                type="button"
                class="jobrow"
                [class]="'jobrow jobrow--' + priorityTone(j.priority)"
                (click)="openId.set(j.ticketId)"
              >
                <span class="jobrow__main">
                  <span class="jobrow__chips">
                    <ar-chip [tone]="priorityTone(j.priority)">{{ j.priority }}</ar-chip>
                    @if (stateLabel(j); as s) {
                      <ar-chip [tone]="s === 'Signed off' ? 'good' : 'teal'">{{ s }}</ar-chip>
                    }
                  </span>
                  <b class="jobrow__t">{{ j.subject }}</b>
                  <span class="muted">{{ j.companyName || j.customerName }}</span>
                  <span class="jobrow__meta">
                    @if (j.asset?.site) {
                      <span>{{ j.asset?.site }}</span>
                    }
                    @if (j.dueAtUtc) {
                      <span [class.late]="dueSoon(j.dueAtUtc)">Due {{ time(j.dueAtUtc) }}</span>
                    }
                    <span class="ar-mono">{{ j.reference }}</span>
                  </span>
                </span>
                <ar-icon name="chevron" [size]="16" class="jobrow__go" />
              </button>
            </li>
          } @empty {
            <li class="empty">
              <ar-icon name="check" [size]="22" />
              {{
                store.day()
                  ? 'No open tickets are assigned to you. Enjoy the quiet.'
                  : 'Connect once to download today’s jobs; after that they work offline.'
              }}
            </li>
          }
        </ul>
        @if (store.lastSyncedAt(); as at) {
          <p class="muted small">Last synced {{ time(at) }}</p>
        }
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      background: var(--ar-bg-100);
      background-image: var(--ar-page-glow);
      font: 400 15px/1.45 var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .app {
      max-width: 680px;
      margin: 0 auto;
      padding: 0 16px 48px;
      box-sizing: border-box;
    }
    h1 {
      margin: 0;
      font: 600 22px var(--ar-font-sans);
    }

    /* The bar */
    .bar {
      position: sticky;
      top: 0;
      z-index: 5;
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0 -16px 12px;
      padding: calc(env(safe-area-inset-top, 0px) + 10px) 16px 10px;
      background: var(--ar-header-bg, var(--ar-white));
      backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--ar-line-200);
    }
    .bar__brand {
      display: flex;
      text-decoration: none;
    }
    .bar__title {
      flex: 1;
      padding-left: 10px;
      border-left: 1px solid var(--ar-line-200);
      font: 600 15px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      background: var(--ar-amber-100, var(--ar-bg-50));
      font: 600 12px var(--ar-font-sans);
      color: var(--ar-amber-600);
    }
    .pill--on {
      background: color-mix(in srgb, var(--ar-green-500) 14%, transparent);
      color: var(--ar-green-500);
    }
    .pill__dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
    }
    .offline {
      margin: 0 0 10px;
      padding: 10px 12px;
      border-radius: var(--ar-radius-card);
      background: var(--ar-amber-100, var(--ar-bg-50));
      color: var(--ar-ink-700);
      font-size: 13.5px;
    }
    .offline--wait {
      background: var(--ar-blue-100);
    }

    /* Today */
    .today {
      margin: 6px 0 12px;
    }
    .tiles {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }
    .tile {
      display: flex;
      flex-direction: column;
      padding: 12px 14px;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      box-shadow: var(--ar-shadow-card);
    }
    .tile b {
      font: 600 22px var(--ar-font-sans);
    }
    .tile span {
      font-size: 12.5px;
      color: var(--ar-ink-500);
    }
    .jobs {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .jobrow {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 14px 14px 16px;
      text-align: left;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-left: 4px solid var(--ar-line-300);
      border-radius: var(--ar-radius-card);
      box-shadow: var(--ar-shadow-card);
      font: inherit;
      color: inherit;
      cursor: pointer;
      transition:
        border-color var(--ar-ease),
        transform var(--ar-ease);
    }
    .jobrow:hover,
    .jobrow:focus-visible {
      border-color: var(--ar-primary);
      outline: none;
    }
    .jobrow:active {
      transform: scale(0.99);
    }
    .jobrow--bad {
      border-left-color: var(--ar-red-500);
    }
    .jobrow--warn,
    .jobrow--amber {
      border-left-color: var(--ar-amber-500);
    }
    .jobrow--neutral {
      border-left-color: var(--ar-blue-500);
    }
    .jobrow__main {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .jobrow__chips {
      display: flex;
      gap: 6px;
      margin-bottom: 2px;
    }
    .jobrow__t {
      font: 600 15.5px var(--ar-font-sans);
    }
    .jobrow__meta {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 12px;
      font-size: 12.5px;
      color: var(--ar-ink-400);
    }
    .jobrow__go {
      color: var(--ar-ink-400);
    }
    .late {
      color: var(--ar-red-600);
      font-weight: 600;
    }
    .empty {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 18px;
      border: 1px dashed var(--ar-line-300);
      border-radius: var(--ar-radius-card);
      color: var(--ar-ink-500);
    }

    /* One job */
    .back {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin: 2px 0 10px;
      padding: 6px 0;
      border: 0;
      background: none;
      font: 600 14px var(--ar-font-sans);
      color: var(--ar-primary);
      cursor: pointer;
    }
    .back__icon {
      transform: rotate(180deg);
    }
    .hero {
      padding: 16px;
      border-radius: var(--ar-radius-card);
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-top: 4px solid var(--ar-blue-500);
      box-shadow: var(--ar-shadow-card);
    }
    .hero--bad {
      border-top-color: var(--ar-red-500);
    }
    .hero--warn,
    .hero--amber {
      border-top-color: var(--ar-amber-500);
    }
    .hero__chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .hero__t {
      margin: 10px 0 4px;
      font: 600 19px/1.3 var(--ar-font-sans);
    }
    .hero__d {
      margin: 0;
      color: var(--ar-ink-500);
    }
    .card {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 12px;
      padding: 14px 16px;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      box-shadow: var(--ar-shadow-card);
    }
    .card__k {
      margin: 0;
      font: 600 10.5px var(--ar-font-sans);
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--ar-ink-400);
    }
    .card__t {
      font: 600 16px var(--ar-font-sans);
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .facts {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 4px 14px;
      margin: 0;
      font-size: 14px;
    }
    .facts dt {
      color: var(--ar-ink-500);
    }
    .facts dd {
      margin: 0;
    }
    .checklist {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 6px;
    }
    .checklist__head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .check {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 44px;
      padding: 0 10px;
      border-radius: var(--ar-radius-control);
      background: var(--ar-bg-50);
      font-size: 14.5px;
      cursor: pointer;
    }
    .check input {
      width: 20px;
      height: 20px;
    }
    .check--done span {
      color: var(--ar-ink-400);
      text-decoration: line-through;
    }
    .photos {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 6px;
    }
    .thumbs {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
      gap: 8px;
    }
    .thumbs img,
    .thumbs__add {
      width: 100%;
      aspect-ratio: 1;
      object-fit: cover;
      border-radius: var(--ar-radius-control);
      background: var(--ar-line-200);
    }
    .thumbs__add {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      background: var(--ar-bg-50);
      border: 1.5px dashed var(--ar-line-300);
      color: var(--ar-primary);
      font: 600 12px var(--ar-font-sans);
      cursor: pointer;
    }
    .code {
      letter-spacing: 0.4em;
      font: 600 18px var(--ar-font-mono);
      text-align: center;
    }
    .done {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      margin-top: 12px;
      padding: 16px;
      border-radius: var(--ar-radius-card);
      background: color-mix(in srgb, var(--ar-green-500) 12%, var(--ar-white));
      color: var(--ar-green-500);
    }
    .done b {
      color: var(--ar-ink-900);
    }
    .done p {
      margin: 2px 0 0;
      color: var(--ar-ink-500);
    }
    .wide {
      width: 100%;
      height: 48px;
      margin-top: 14px;
      font-size: 15px;
    }
    .muted {
      color: var(--ar-ink-500);
      font-size: 13.5px;
      margin: 0;
    }
    .small {
      font-size: 12px;
      margin-top: 14px;
    }
    .err {
      margin: 6px 0;
      color: var(--ar-red-600);
      font-weight: 500;
    }
  `,
})
export class ArField {
  protected readonly store = inject(FieldStore);
  private readonly api = inject(FieldServiceService);
  private readonly doc = inject(DOCUMENT);

  protected readonly openId = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly codeSent = signal(false);
  protected readonly code = signal('');
  protected readonly signer = signal('');
  protected readonly signError = signal<string | null>(null);
  protected readonly thumbs = signal<Record<string, string>>({});

  protected readonly jobs = computed(() => this.store.day()?.jobs ?? []);
  protected readonly open = computed(
    () => this.jobs().find((j) => j.ticketId === this.openId()) ?? null,
  );
  protected readonly visit = computed(() => {
    const j = this.open();
    return j ? visitFor(j, this.store.visits()[j.ticketId]) : null;
  });

  constructor() {
    this.installable();
    if (environment.useMockData) {
      this.store.day.set(SEED_DAY);
    }
    void this.store.start().then(() => this.loadThumbs());
  }

  /** The manifest and service worker, added only on this page so the rest of the app is untouched. */
  private installable(): void {
    if (!this.doc.querySelector('link[rel="manifest"]')) {
      const link = this.doc.createElement('link');
      link.rel = 'manifest';
      link.href = '/field.webmanifest';
      this.doc.head.appendChild(link);
    }
    const secure = location.protocol === 'https:' || location.hostname === 'localhost';
    if (secure && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/field-sw.js').catch(() => undefined);
    }
  }

  private async loadThumbs(): Promise<void> {
    const map: Record<string, string> = { ...this.thumbs() };
    for (const v of Object.values(this.store.visits())) {
      for (const id of v.photoIds) {
        if (map[id]) continue;
        const blob = await this.store.photo(id);
        if (blob) map[id] = URL.createObjectURL(blob);
      }
    }
    this.thumbs.set(map);
  }

  protected date(isoDate: string): string {
    return new Date(isoDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  protected time(isoDate: string): string {
    return new Date(isoDate).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  protected readonly todayLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  protected priorityTone(priority: string | null | undefined): ChipTone {
    switch ((priority ?? '').toLowerCase()) {
      case 'urgent':
        return 'bad';
      case 'high':
        return 'warn';
      case 'low':
        return 'neutral';
      default:
        return 'neutral';
    }
  }

  /** Due within four hours, or already late. */
  protected dueSoon(isoDate: string): boolean {
    return new Date(isoDate).getTime() - Date.now() < 4 * 3_600_000;
  }

  protected readonly dueSoonCount = computed(
    () => this.jobs().filter((j) => j.dueAtUtc && this.dueSoon(j.dueAtUtc)).length,
  );
  protected readonly signedCount = computed(
    () => this.jobs().filter((j) => this.stateLabel(j) === 'Signed off').length,
  );

  protected stateLabel(j: FieldJobDto): string | null {
    const v = visitFor(j, this.store.visits()[j.ticketId]);
    return !v ? null : v.state === 'SignedOff' ? 'Signed off' : 'In progress';
  }

  protected doneCount(v: LocalVisit): number {
    return v.checklist.filter((c) => c.done).length;
  }

  protected digits(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  protected state(j: FieldJobDto): string {
    const v = visitFor(j, this.store.visits()[j.ticketId]);
    return !v ? '' : v.state === 'SignedOff' ? ' · signed off' : ' · visit started';
  }

  protected async arrive(j: FieldJobDto): Promise<void> {
    await this.store.saveVisit(startVisit(j.ticketId, crypto.randomUUID(), new Date()));
  }

  protected async setNotes(v: LocalVisit, notes: string): Promise<void> {
    await this.store.saveVisit({ ...v, notes });
  }

  protected async tick(v: LocalVisit, index: number, done: boolean): Promise<void> {
    await this.store.saveVisit({
      ...v,
      checklist: v.checklist.map((c, i) => (i === index ? { ...c, done } : c)),
    });
  }

  protected async photo(v: LocalVisit, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const blob = await shrink(file);
    const next = await this.store.addPhoto(v, blob);
    const id = next.photoIds[next.photoIds.length - 1];
    this.thumbs.update((t) => ({ ...t, [id]: URL.createObjectURL(blob) }));
  }

  protected async requestCode(v: LocalVisit): Promise<void> {
    this.busy.set(true);
    this.signError.set(null);
    try {
      await this.store.sync(); // the visit must be on the server before it can be signed
      if (this.store.outbox().some((o) => o.clientVisitId === v.clientVisitId)) {
        this.signError.set('The visit is still sending. Try again when the sync finishes.');
        return;
      }
      const r = await firstValueFrom(this.api.requestSignOff(v.clientVisitId));
      if (r.sent) {
        this.codeSent.set(true);
      } else {
        this.signError.set(r.reason ?? 'The code could not be sent.');
      }
    } catch (e: unknown) {
      this.signError.set(
        (e as { error?: { error?: { message?: string } } })?.error?.error?.message ??
          'The code could not be sent.',
      );
    } finally {
      this.busy.set(false);
    }
  }

  protected async confirm(v: LocalVisit): Promise<void> {
    this.busy.set(true);
    this.signError.set(null);
    try {
      const signed = await firstValueFrom(
        this.api.confirmSignOff(v.clientVisitId, {
          code: this.code().trim(),
          signedByName: this.signer().trim(),
        }),
      );
      await this.store.settle({ ...v, state: signed.state, signedByName: signed.signedByName });
      this.code.set('');
      this.codeSent.set(false);
      void this.store.sync();
    } catch (e: unknown) {
      this.signError.set(
        (e as { error?: { error?: { message?: string } } })?.error?.error?.message ??
          'Sign-off failed.',
      );
    } finally {
      this.busy.set(false);
    }
  }
}
