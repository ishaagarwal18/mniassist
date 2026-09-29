import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  PublicReorderLinkDto,
  PublicReorderPartDto,
  PublicReorderPortalDto,
  PublicReorderSubmittedDto,
  ReorderPublicService,
  StockBand,
} from '../../proxy/reorder/reorder-public.service';
import { apiMessage } from '../signing/signing-logic';
import { BAND_LABEL, CartLine, dueLabel, parseQuantity, rupees, totals } from './reorder-logic';

type Step = 'loading' | 'unavailable' | 'code' | 'portal' | 'done';

/**
 * The customer's spares re-order page, opened from a personal WhatsApp link: no login, no app shell. A one-time code to their own
 * WhatsApp opens it; then their machines with the spares due, their own prices and availability, a search for anything else, and a
 * review that sends it to the sales team as a quotation request. Built phone-first: that's where the link is tapped.
 */
@Component({
  selector: 'ar-reorder-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="rp">
      @switch (step()) {
        @case ('loading') {
          <p class="rp__note">Opening…</p>
        }
        @case ('unavailable') {
          <section class="rp__card">
            <h1 class="rp__title">This link isn't available</h1>
            <p>{{ problem() }}</p>
          </section>
        }
        @case ('code') {
          <section class="rp__card">
            @if (link()?.heading; as h) {
              <p class="rp__eyebrow">{{ h }}</p>
            }
            <h1 class="rp__title">Re-order spares for your machines</h1>
            @if (link()?.intro; as intro) {
              <p class="rp__soft">{{ intro }}</p>
            }
            <p>
              To keep your prices private, we'll send a 6-digit code to your WhatsApp number
              <b>{{ link()?.sendsCodeTo }}</b
              >.
            </p>
            @if (!codeSent()) {
              <button type="button" class="rp__btn" [disabled]="busy()" (click)="sendCode()">
                {{ busy() ? 'Sending…' : 'Send me the code' }}
              </button>
            } @else {
              <form class="rp__code" (submit)="$event.preventDefault(); verify()">
                <label for="rp-code">Code from WhatsApp</label>
                <input
                  id="rp-code"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  maxlength="7"
                  [value]="code()"
                  (input)="code.set($any($event.target).value)"
                />
                <button
                  type="submit"
                  class="rp__btn"
                  [disabled]="busy() || code().trim().length < 6"
                >
                  {{ busy() ? 'Checking…' : 'Open' }}
                </button>
              </form>
              <button type="button" class="rp__link" [disabled]="busy()" (click)="sendCode()">
                Send a new code
              </button>
            }
            @if (problem(); as p) {
              <p class="rp__bad" role="alert">{{ p }}</p>
            }
          </section>
        }
        @case ('portal') {
          @if (portal(); as p) {
            <header class="rp__head">
              @if (p.heading) {
                <p class="rp__eyebrow">{{ p.heading }}</p>
              }
              <h1 class="rp__title">Hello {{ p.customerName }}</h1>
              @if (p.intro) {
                <p class="rp__soft">{{ p.intro }}</p>
              }
            </header>

            @for (m of p.machines; track $index) {
              <section class="rp__machine" [attr.aria-label]="m.description">
                <h2>
                  {{ m.description }}
                  @if (m.serialNumber) {
                    <span class="rp__mono">{{ m.serialNumber }}</span>
                  }
                </h2>
                @if (m.site) {
                  <p class="rp__soft rp__site">{{ m.site }}</p>
                }
                @for (part of m.parts; track part.partNumber) {
                  <ng-container
                    *ngTemplateOutlet="row; context: { $implicit: part, due: part.dueInDays }"
                  />
                } @empty {
                  <p class="rp__soft">Nothing due on this machine. Search below for any part.</p>
                }
              </section>
            } @empty {
              <p class="rp__soft">No machines on record. Search below for the parts you need.</p>
            }

            <section class="rp__machine" aria-label="Search parts">
              <h2>Other parts</h2>
              <input
                id="rp-search"
                class="rp__search"
                type="search"
                placeholder="Part number or name"
                [value]="query()"
                (input)="search($any($event.target).value)"
              />
              @for (part of results(); track part.partNumber) {
                <ng-container *ngTemplateOutlet="row; context: { $implicit: part, due: null }" />
              }
              @if (query().trim().length >= 2 && !searching() && results().length === 0) {
                <p class="rp__soft">
                  Nothing found. Add it in the note below and we'll include it.
                </p>
              }
            </section>

            <section class="rp__review" aria-label="Your request">
              <h2>Your request</h2>
              @if (cartLines().length === 0) {
                <p class="rp__soft">Enter a quantity against any part above.</p>
              } @else {
                <ul class="rp__lines">
                  @for (l of cartLines(); track l.part.partNumber) {
                    <li>
                      <span
                        >{{ l.quantity }} × {{ l.part.description }}
                        <span class="rp__mono">{{ l.part.partNumber }}</span></span
                      >
                      <span class="rp__num">{{
                        l.part.unitPriceInPaise > 0
                          ? money(l.part.unitPriceInPaise * l.quantity)
                          : 'to be quoted'
                      }}</span>
                    </li>
                  }
                </ul>
                <dl class="rp__totals">
                  <dt>Before GST</dt>
                  <dd class="rp__num">{{ money(sum().subtotalInPaise) }}</dd>
                  <dt>GST</dt>
                  <dd class="rp__num">{{ money(sum().taxInPaise) }}</dd>
                  <dt><b>Total</b></dt>
                  <dd class="rp__num">
                    <b>{{ money(sum().totalInPaise) }}</b>
                  </dd>
                </dl>
                @if (sum().unpriced) {
                  <p class="rp__soft">
                    {{ sum().unpriced }} part{{ sum().unpriced === 1 ? '' : 's' }} will be priced in
                    the quotation.
                  </p>
                }
              }
              <label for="rp-po">Your PO number <span class="rp__soft">(optional)</span></label>
              <input id="rp-po" [value]="po()" (input)="po.set($any($event.target).value)" />
              <label for="rp-site">Deliver to <span class="rp__soft">(optional)</span></label>
              <input id="rp-site" [value]="site()" (input)="site.set($any($event.target).value)" />
              <label for="rp-note">Note <span class="rp__soft">(optional)</span></label>
              <textarea
                id="rp-note"
                rows="3"
                [value]="note()"
                (input)="note.set($any($event.target).value)"
              ></textarea>
              @if (belowMinimum(); as min) {
                <p class="rp__bad">The minimum order is {{ money(min) }} before GST.</p>
              }
              @if (problem(); as pr) {
                <p class="rp__bad" role="alert">{{ pr }}</p>
              }
              <button
                type="button"
                class="rp__btn"
                [disabled]="busy() || cartLines().length === 0 || !!belowMinimum()"
                (click)="submit()"
              >
                {{ busy() ? 'Sending…' : payNow() ? 'Place order and pay' : 'Send for quotation' }}
              </button>
              <p class="rp__soft rp__small">
                @if (payNow()) {
                  Prices are your agreed prices. You pay securely on the next page; the quotation
                  comes on WhatsApp.
                } @else {
                  Prices are your agreed prices. Our team checks stock and delivery and sends the
                  quotation on WhatsApp.
                }
              </p>
            </section>

            @if (p.recent.length) {
              <section class="rp__machine" aria-label="Your recent requests">
                <h2>Recent requests</h2>
                <ul class="rp__lines">
                  @for (r of p.recent; track r.reference) {
                    <li>
                      <span
                        ><span class="rp__mono">{{ r.reference }}</span> ·
                        {{ day(r.sentAtUtc) }}</span
                      >
                      <span>{{ r.status }}</span>
                    </li>
                  }
                </ul>
              </section>
            }
          }
        }
        @case ('done') {
          @if (done(); as d) {
            <section class="rp__card rp__card--done">
              <h1 class="rp__title">{{ d.payUrl ? 'Order placed' : 'Request sent' }}</h1>
              <p>{{ d.message }}</p>
              @if (d.payUrl) {
                <a class="rp__btn rp__pay" [href]="d.payUrl"
                  >Pay {{ money(d.subtotalInPaise + d.taxInPaise) }} now</a
                >
              }
              <p>
                Reference <b class="rp__mono">{{ d.reference }}</b> ·
                {{ money(d.subtotalInPaise + d.taxInPaise) }} including GST{{
                  d.unpriced ? ', plus ' + d.unpriced + ' part(s) to be priced' : ''
                }}.
              </p>
              <button type="button" class="rp__link" (click)="again()">Order something else</button>
            </section>
          }
        }
      }
    </main>

    <ng-template #row let-part let-due="due">
      <div class="rp__part">
        <div class="rp__part-main">
          <b>{{ part.description }}</b>
          <span class="rp__mono rp__soft">{{ part.partNumber }}</span>
          <span class="rp__meta">
            @if (due != null) {
              <span [class.rp__due]="due <= 0">{{ dueText(due) }}</span>
            }
            @if (part.availability) {
              <span class="rp__band" [attr.data-band]="part.availability">{{
                band(part.availability)
              }}</span>
            }
          </span>
        </div>
        <div class="rp__part-side">
          <span class="rp__price">{{
            part.unitPriceInPaise > 0
              ? money(part.unitPriceInPaise) + ' / ' + part.unit
              : 'Price on quotation'
          }}</span>
          <label class="rp__qty">
            <span class="rp__sr">Quantity of {{ part.partNumber }}</span>
            <input
              inputmode="decimal"
              [attr.id]="'q-' + part.partNumber"
              [value]="qtyOf(part)"
              [attr.placeholder]="part.suggestedQuantity > 0 ? part.suggestedQuantity : 'Qty'"
              (input)="setQty(part, $any($event.target).value)"
            />
          </label>
          @if (part.suggestedQuantity > 0 && !qtyOf(part)) {
            <button
              type="button"
              class="rp__link"
              (click)="setQty(part, part.suggestedQuantity + '')"
            >
              Add {{ part.suggestedQuantity }}
            </button>
          }
        </div>
      </div>
    </ng-template>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      background: #f2f3ef;
      --rp-ink: #1c2227;
      --rp-soft: #5a646c;
      --rp-line: #d6dad2;
      --rp-card: #ffffff;
      --rp-accent: #b4470f;
      --rp-good: #17703b;
      --rp-warn: #9a5b00;
      --rp-bad: #b42318;
      color: var(--rp-ink);
      font:
        400 15px/1.5 system-ui,
        -apple-system,
        'Segoe UI',
        Roboto,
        sans-serif;
    }
    .rp {
      max-width: 620px;
      margin: 0 auto;
      padding: 20px 16px 56px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .rp__card,
    .rp__machine,
    .rp__review {
      background: var(--rp-card);
      border: 1px solid var(--rp-line);
      border-radius: 10px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .rp__card--done {
      background: #eaf5ec;
      border-color: #a8d3b4;
    }
    .rp__eyebrow {
      margin: 0;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--rp-accent);
    }
    .rp__title {
      margin: 0;
      font-size: 22px;
      line-height: 1.25;
      text-wrap: balance;
    }
    .rp__head {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    h2 {
      margin: 0;
      font-size: 16px;
      display: flex;
      gap: 8px;
      align-items: baseline;
      flex-wrap: wrap;
    }
    p {
      margin: 0;
    }
    .rp__soft {
      color: var(--rp-soft);
    }
    .rp__small {
      font-size: 13px;
    }
    .rp__site {
      margin-top: -6px;
      font-size: 13px;
    }
    .rp__mono {
      font-family: ui-monospace, Consolas, monospace;
      font-size: 13px;
    }
    .rp__note {
      text-align: center;
      color: var(--rp-soft);
      margin-top: 48px;
    }
    .rp__bad {
      color: var(--rp-bad);
      font-weight: 500;
    }
    .rp__btn {
      align-self: flex-start;
      border: 0;
      border-radius: 8px;
      padding: 11px 18px;
      font: inherit;
      font-weight: 600;
      color: #fff;
      background: var(--rp-accent);
      cursor: pointer;
    }
    .rp__pay {
      text-decoration: none;
    }
    .rp__btn:disabled {
      opacity: 0.55;
      cursor: default;
    }
    .rp__link {
      align-self: flex-start;
      border: 0;
      background: none;
      padding: 0;
      font: inherit;
      font-size: 14px;
      color: var(--rp-accent);
      text-decoration: underline;
      cursor: pointer;
    }
    button:focus-visible,
    input:focus-visible,
    textarea:focus-visible {
      outline: 2px solid var(--rp-accent);
      outline-offset: 2px;
    }
    input,
    textarea {
      font: inherit;
      border: 1px solid var(--rp-line);
      border-radius: 8px;
      padding: 9px 10px;
      background: #fff;
      color: var(--rp-ink);
      width: 100%;
      box-sizing: border-box;
    }
    label {
      font-size: 14px;
      font-weight: 500;
    }
    .rp__code {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 260px;
    }
    .rp__code input {
      font-size: 22px;
      letter-spacing: 0.3em;
      text-align: center;
    }
    .rp__part {
      display: flex;
      gap: 12px;
      justify-content: space-between;
      flex-wrap: wrap;
      padding-top: 10px;
      border-top: 1px solid var(--rp-line);
    }
    .rp__part-main {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      flex: 1 1 200px;
    }
    .rp__meta {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      font-size: 13px;
      color: var(--rp-soft);
    }
    .rp__due {
      color: var(--rp-bad);
      font-weight: 600;
    }
    .rp__band[data-band='InStock'] {
      color: var(--rp-good);
    }
    .rp__band[data-band='Limited'] {
      color: var(--rp-warn);
    }
    .rp__band[data-band='OnOrder'] {
      color: var(--rp-soft);
    }
    .rp__part-side {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }
    .rp__price {
      font-size: 14px;
      font-variant-numeric: tabular-nums;
    }
    .rp__qty input {
      width: 88px;
      text-align: right;
    }
    .rp__sr {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
    .rp__lines {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 14px;
    }
    .rp__lines li {
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }
    .rp__num {
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      text-align: right;
    }
    .rp__totals {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 2px 16px;
      margin: 4px 0;
      font-size: 14px;
    }
    .rp__totals dd {
      margin: 0;
    }
    @media (max-width: 420px) {
      .rp__part-side {
        align-items: flex-start;
      }
    }
  `,
  imports: [NgTemplateOutlet],
})
export class ArReorderPage {
  private readonly api = inject(ReorderPublicService);
  private readonly token = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '';
  private readonly sessionKey = 'reorder-session:' + this.token.slice(-12);

  protected readonly step = signal<Step>('loading');
  protected readonly link = signal<PublicReorderLinkDto | null>(null);
  protected readonly portal = signal<PublicReorderPortalDto | null>(null);
  protected readonly problem = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly codeSent = signal(false);
  protected readonly code = signal('');
  protected readonly query = signal('');
  protected readonly results = signal<PublicReorderPartDto[]>([]);
  protected readonly searching = signal(false);
  protected readonly cart = signal<Map<string, CartLine>>(new Map());
  protected readonly po = signal('');
  protected readonly site = signal('');
  protected readonly note = signal('');
  protected readonly done = signal<PublicReorderSubmittedDto | null>(null);

  private session = '';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private searchSeq = 0;

  protected readonly cartLines = computed(() =>
    [...this.cart().values()].filter((l) => l.quantity > 0),
  );
  protected readonly sum = computed(() => totals(this.cartLines()));
  /** Order and pay applies when the workspace uses it and every part in the list has a price. */
  protected readonly payNow = computed(
    () => !!this.portal()?.orderAndPay && this.sum().unpriced === 0,
  );
  protected readonly belowMinimum = computed(() => {
    const min = this.portal()?.minimumOrderInPaise;
    return min && this.cartLines().length > 0 && this.sum().subtotalInPaise < min ? min : null;
  });

  constructor() {
    void this.start();
  }

  private async start(): Promise<void> {
    try {
      this.link.set(await firstValueFrom(this.api.open(this.token)));
    } catch (e: unknown) {
      this.fail(
        e,
        'This link has expired or is no longer valid. Ask us for a new one on WhatsApp.',
      );
      return;
    }

    // A session from earlier in this tab saves asking for another code.
    const saved = readSession(this.sessionKey);
    if (saved && (await this.loadPortal(saved))) return;
    this.step.set('code');
  }

  private async loadPortal(session: string): Promise<boolean> {
    try {
      this.portal.set(await firstValueFrom(this.api.portal(this.token, session)));
      this.session = session;
      this.step.set('portal');
      return true;
    } catch {
      writeSession(this.sessionKey, null);
      return false;
    }
  }

  private fail(e: unknown, fallback: string): void {
    const status = (e as { status?: number })?.status;
    this.problem.set(
      status === 429 ? apiMessage(e, 'Too many attempts. Please wait a few minutes.') : fallback,
    );
    this.step.set('unavailable');
  }

  protected async sendCode(): Promise<void> {
    this.busy.set(true);
    this.problem.set(null);
    try {
      await firstValueFrom(this.api.sendCode(this.token));
      this.codeSent.set(true);
    } catch (e: unknown) {
      this.problem.set(apiMessage(e, "The code couldn't be sent. Try again in a minute."));
    } finally {
      this.busy.set(false);
    }
  }

  protected async verify(): Promise<void> {
    this.busy.set(true);
    this.problem.set(null);
    try {
      const s = await firstValueFrom(this.api.verify(this.token, this.code().replace(/\D/g, '')));
      writeSession(this.sessionKey, s.session);
      if (!(await this.loadPortal(s.session))) {
        this.problem.set("The page couldn't be opened. Try again.");
      }
    } catch (e: unknown) {
      this.problem.set(apiMessage(e, "That code isn't right or has expired."));
    } finally {
      this.busy.set(false);
    }
  }

  protected search(text: string): void {
    this.query.set(text);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    if (text.trim().length < 2) {
      this.results.set([]);
      return;
    }
    this.searchTimer = setTimeout(async () => {
      const seq = ++this.searchSeq;
      this.searching.set(true);
      try {
        const found = await firstValueFrom(this.api.search(this.token, this.session, text.trim()));
        if (seq === this.searchSeq) this.results.set(found);
      } catch {
        if (seq === this.searchSeq) this.results.set([]);
      } finally {
        if (seq === this.searchSeq) this.searching.set(false);
      }
    }, 300);
  }

  protected qtyOf(part: PublicReorderPartDto): string {
    const q = this.cart().get(part.partNumber.toUpperCase())?.quantity;
    return q ? String(q) : '';
  }

  protected setQty(part: PublicReorderPartDto, text: string): void {
    const q = parseQuantity(text);
    if (q === null) return;
    this.cart.update((map) => {
      const next = new Map(map);
      const key = part.partNumber.toUpperCase();
      if (q === 0) next.delete(key);
      else next.set(key, { part, quantity: q });
      return next;
    });
  }

  protected async submit(): Promise<void> {
    this.busy.set(true);
    this.problem.set(null);
    try {
      const result = await firstValueFrom(
        this.api.submit(this.token, this.session, {
          lines: this.cartLines().map((l) => ({
            partNumber: l.part.partNumber,
            quantity: l.quantity,
          })),
          poNumber: this.po().trim() || null,
          deliverySite: this.site().trim() || null,
          note: this.note().trim() || null,
        }),
      );
      this.done.set(result);
      this.step.set('done');
    } catch (e: unknown) {
      const status = (e as { status?: number })?.status;
      if (status === 401) {
        writeSession(this.sessionKey, null);
        this.codeSent.set(false);
        this.step.set('code');
        this.problem.set('Your session ended. Get a new code to send the request.');
      } else {
        this.problem.set(apiMessage(e, "The request couldn't be sent. Try again."));
      }
    } finally {
      this.busy.set(false);
    }
  }

  protected async again(): Promise<void> {
    this.cart.set(new Map());
    this.po.set('');
    this.site.set('');
    this.note.set('');
    this.done.set(null);
    if (!(await this.loadPortal(this.session))) this.step.set('code');
  }

  protected money(paise: number): string {
    return rupees(Math.round(paise));
  }

  protected band(b: StockBand): string {
    return BAND_LABEL[b] ?? b;
  }

  protected dueText(days: number): string {
    return dueLabel(days);
  }

  protected day(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
}

// The session lives only in this browser tab, and the page works without it (it just asks for a new code).
function readSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string | null): void {
  try {
    if (value) sessionStorage.setItem(key, value);
    else sessionStorage.removeItem(key);
  } catch {
    // Private windows can refuse storage; the page still works.
  }
}
