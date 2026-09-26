import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  computed,
  inject,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { FieldJobDto, FieldServiceService } from '../../proxy/support/field-service.service';
import { LocalVisit, fitWithin, startVisit, visitFor } from './field-logic';
import { FieldStore } from './field-store';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="top">
      <div>
        <h1>Today's jobs</h1>
        <p class="top__s">
          <span class="dot" [class.dot--on]="store.online()"></span>
          {{ store.online() ? 'Online' : 'Offline — changes are saved on this phone' }}
          @if (store.summary().waiting) {
            · {{ store.summary().waiting }} visit(s) waiting to send
          }
        </p>
      </div>
      <button
        type="button"
        class="btn btn--ghost"
        [disabled]="store.syncing() || !store.online()"
        (click)="store.sync()"
      >
        {{ store.syncing() ? 'Syncing…' : 'Sync' }}
      </button>
    </header>

    @for (p of store.problems(); track $index) {
      <p class="err" role="alert">{{ p }}</p>
    }

    @if (open(); as j) {
      <section class="job" [attr.aria-label]="j.reference">
        <button type="button" class="back" (click)="openId.set(null)">← All jobs</button>
        <h2>{{ j.subject }}</h2>
        <p class="muted">{{ j.reference }} · {{ j.priority }}</p>
        @if (j.description) {
          <p>{{ j.description }}</p>
        }

        <div class="card">
          <b>{{ j.companyName || j.customerName }}</b>
          @if (j.customerName && j.companyName) {
            <span class="muted">{{ j.customerName }}</span>
          }
          @if (j.phone) {
            <a class="btn btn--ghost" [href]="'tel:' + j.phone">Call {{ j.phone }}</a>
          }
        </div>

        @if (j.asset; as a) {
          <div class="card">
            <b>{{ a.description }}</b>
            <dl class="facts">
              @if (a.make || a.model) {
                <dt>Model</dt>
                <dd>{{ a.make }} {{ a.model }}</dd>
              }
              @if (a.serialNumber) {
                <dt>Serial</dt>
                <dd class="mono">{{ a.serialNumber }}</dd>
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
            <p class="ok">Signed off by {{ v.signedByName }}. The ticket is resolved.</p>
          } @else {
            <label class="field" for="fv-notes">
              <span>Work done</span>
              <textarea
                id="fv-notes"
                rows="5"
                [value]="v.notes"
                (change)="setNotes(v, $any($event.target).value)"
              ></textarea>
            </label>
            <fieldset class="field">
              <legend>Checklist</legend>
              @for (c of v.checklist; track $index) {
                <label class="check"
                  ><input
                    type="checkbox"
                    [checked]="c.done"
                    (change)="tick(v, $index, $any($event.target).checked)"
                  />
                  {{ c.label }}</label
                >
              }
            </fieldset>
            <div class="field">
              <span>Photos ({{ v.photoIds.length }})</span>
              <div class="thumbs">
                @for (id of v.photoIds; track id) {
                  <img [src]="thumbs()[id] || ''" alt="Visit photo" />
                }
              </div>
              <label class="btn btn--ghost" for="fv-photo">Take a photo</label>
              <input
                id="fv-photo"
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                (change)="photo(v, $event)"
              />
            </div>

            <div class="sign">
              <h3>Customer sign-off</h3>
              @if (!store.online()) {
                <p class="muted">Needs signal: the code is sent to the customer on WhatsApp.</p>
              } @else if (v.state !== 'AwaitingSignOff' && !codeSent()) {
                <button type="button" class="btn" [disabled]="busy()" (click)="requestCode(v)">
                  {{ busy() ? 'Sending…' : 'Send sign-off code to customer' }}
                </button>
              } @else {
                <p class="muted">
                  Ask the customer for the 6-digit code they just got on WhatsApp.
                </p>
                <label class="field" for="fv-code"
                  ><span>Code</span>
                  <input
                    id="fv-code"
                    inputmode="numeric"
                    maxlength="6"
                    autocomplete="one-time-code"
                    [value]="code()"
                    (input)="code.set($any($event.target).value)"
                  />
                </label>
                <label class="field" for="fv-name"
                  ><span>Signed by</span>
                  <input
                    id="fv-name"
                    [value]="signer()"
                    (input)="signer.set($any($event.target).value)"
                  />
                </label>
                <button
                  type="button"
                  class="btn"
                  [disabled]="busy() || code().length !== 6 || !signer().trim()"
                  (click)="confirm(v)"
                >
                  {{ busy() ? 'Checking…' : 'Confirm sign-off' }}
                </button>
                <button
                  type="button"
                  class="btn btn--ghost"
                  [disabled]="busy()"
                  (click)="requestCode(v)"
                >
                  Send a new code
                </button>
              }
              @if (signError(); as e) {
                <p class="err" role="alert">{{ e }}</p>
              }
            </div>
          }
        } @else {
          <button type="button" class="btn" (click)="arrive(j)">
            I've arrived — start the visit
          </button>
        }
      </section>
    } @else {
      <ul class="jobs">
        @for (j of jobs(); track j.ticketId) {
          <li>
            <button type="button" class="jobrow" (click)="openId.set(j.ticketId)">
              <b>{{ j.subject }}</b>
              <span class="muted"
                >{{ j.companyName || j.customerName }} · {{ j.asset?.site || '' }}</span
              >
              <span class="muted"
                >{{ j.reference }} · {{ j.priority
                }}{{ j.dueAtUtc ? ' · due ' + time(j.dueAtUtc) : '' }}{{ state(j) }}</span
              >
            </button>
          </li>
        } @empty {
          <li class="muted">
            {{
              store.day()
                ? 'No open tickets are assigned to you.'
                : 'Connect once to download today’s jobs; after that they work offline.'
            }}
          </li>
        }
      </ul>
      @if (store.lastSyncedAt(); as at) {
        <p class="muted small">Last synced {{ time(at) }}</p>
      }
    }
  `,
  styles: `
    :host {
      display: block;
      max-width: 640px;
      margin: 0 auto;
      padding: 12px 16px 48px;
      font: 400 15px/1.45 var(--ar-font-sans);
      color: var(--ar-ink-900);
      background: var(--ar-bg-100);
      min-height: 100vh;
      box-sizing: border-box;
    }
    h1 {
      margin: 0;
      font-size: 20px;
    }
    h2 {
      margin: 8px 0 2px;
      font-size: 18px;
    }
    h3 {
      margin: 0 0 6px;
      font-size: 15px;
    }
    .top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      position: sticky;
      top: env(safe-area-inset-top, 0px);
      background: var(--ar-bg-100);
      padding: 6px 0 10px;
      z-index: 1;
    }
    .top__s {
      margin: 2px 0 0;
      font-size: 13px;
      color: var(--ar-ink-500);
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--ar-amber-500, #f59e0b);
    }
    .dot--on {
      background: var(--ar-good-600, #067647);
    }
    .jobs {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .jobrow {
      width: 100%;
      text-align: left;
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 12px 14px;
      border: 1px solid var(--ar-line-200);
      border-radius: 10px;
      background: var(--ar-white);
      font: inherit;
      color: inherit;
      cursor: pointer;
    }
    .card {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 12px 14px;
      margin: 10px 0;
      border: 1px solid var(--ar-line-200);
      border-radius: 10px;
      background: var(--ar-white);
    }
    .facts {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 2px 12px;
      margin: 4px 0 0;
      font-size: 14px;
    }
    .facts dt {
      color: var(--ar-ink-500);
    }
    .facts dd {
      margin: 0;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin: 12px 0;
      border: 0;
      padding: 0;
    }
    .field > span,
    .field legend {
      font-weight: 600;
      font-size: 14px;
      padding: 0;
    }
    textarea,
    input:not([type='checkbox']) {
      font: inherit;
      padding: 10px;
      border: 1px solid var(--ar-line-200);
      border-radius: 8px;
      background: var(--ar-white);
      width: 100%;
      box-sizing: border-box;
    }
    .check {
      display: flex;
      gap: 10px;
      align-items: center;
      padding: 6px 0;
      font-size: 15px;
    }
    .check input {
      width: 20px;
      height: 20px;
    }
    .thumbs {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .thumbs img {
      width: 72px;
      height: 72px;
      object-fit: cover;
      border-radius: 6px;
      background: var(--ar-line-200);
    }
    .sign {
      margin-top: 16px;
      padding: 12px 14px;
      border: 1px solid var(--ar-line-200);
      border-radius: 10px;
      background: var(--ar-white);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .btn {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      min-height: 44px;
      padding: 0 16px;
      border-radius: 8px;
      border: 0;
      background: var(--ar-ink-900);
      color: var(--ar-white);
      font: 600 15px var(--ar-font-sans);
      cursor: pointer;
      text-decoration: none;
    }
    .btn--ghost {
      background: var(--ar-white);
      color: var(--ar-ink-900);
      border: 1px solid var(--ar-line-200);
    }
    .btn:disabled {
      opacity: 0.55;
    }
    .back {
      border: 0;
      background: none;
      padding: 4px 0;
      font: 600 14px var(--ar-font-sans);
      color: var(--ar-teal-700, #0f766e);
      cursor: pointer;
    }
    .muted {
      color: var(--ar-ink-500);
      font-size: 13.5px;
    }
    .small {
      font-size: 12px;
      margin-top: 12px;
    }
    .mono {
      font-family: var(--ar-font-mono, ui-monospace, monospace);
    }
    .err {
      margin: 6px 0;
      color: var(--ar-bad-600, #b42318);
      font-weight: 500;
    }
    .ok {
      margin: 12px 0;
      color: var(--ar-good-600, #067647);
      font-weight: 600;
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
