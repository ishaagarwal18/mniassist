import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  PublicCatalogueDto,
  PublicCatalogueItemDto,
  PublicCatalogueService,
} from '../../proxy/reorder/public-catalogue.service';
import { PublicReorderSubmittedDto } from '../../proxy/reorder/reorder-public.service';
import { apiMessage } from '../signing/signing-logic';
import { parseQuantity, rupees, stockText } from './reorder-logic';
import { isPincode } from './shipping-logic';

type Step = 'loading' | 'unavailable' | 'browse' | 'done';

/**
 * A distributor's public catalogue (/catalogue/{code}): anyone can look up parts (with list prices when the distributor shows them)
 * and send an enquiry. The team calls back to confirm and sends a quotation on WhatsApp.
 */
@Component({
  selector: 'ar-catalogue-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="cp">
      @switch (step()) {
        @case ('loading') {
          <p class="cp__soft">Loading…</p>
        }
        @case ('unavailable') {
          <section class="cp__card">
            <h1 class="cp__title">This catalogue isn't available</h1>
            <p class="cp__soft">Check the address with the distributor who gave it to you.</p>
          </section>
        }
        @case ('done') {
          @if (done(); as d) {
            <section class="cp__card">
              <h1 class="cp__title">Enquiry sent</h1>
              <p>{{ d.message }}</p>
              @if (d.reference !== '—') {
                <p class="cp__soft">
                  Reference <b class="cp__mono">{{ d.reference }}</b
                  >.
                </p>
              }
              <button type="button" class="cp__link" (click)="again()">Look up more parts</button>
            </section>
          }
        }
        @case ('browse') {
          @if (page(); as p) {
            <header class="cp__head">
              @if (p.heading) {
                <p class="cp__eyebrow">{{ p.heading }}</p>
              }
              <h1 class="cp__title">Spares catalogue</h1>
              <p class="cp__soft">
                {{
                  p.intro ||
                    'Find the parts you need and send an enquiry. We will call you to confirm and send a quotation on WhatsApp.'
                }}
              </p>
            </header>

            <section class="cp__card" aria-label="Find parts">
              <div class="cp__find">
                <input
                  id="cp-q"
                  type="search"
                  placeholder="Part number or name"
                  aria-label="Part number or name"
                  [value]="query()"
                  (input)="search($any($event.target).value)"
                />
                @if (p.categories.length) {
                  <select
                    id="cp-cat"
                    aria-label="Category"
                    [value]="category()"
                    (change)="pickCategory($any($event.target).value)"
                  >
                    <option value="">All categories</option>
                    @for (c of p.categories; track c) {
                      <option [value]="c">{{ c }}</option>
                    }
                  </select>
                }
              </div>
              @for (item of items(); track item.partNumber) {
                <div class="cp__item">
                  <div class="cp__main">
                    <b>{{ item.name }}</b>
                    <span class="cp__mono cp__soft">{{ item.partNumber }}</span>
                    @if (item.description) {
                      <span class="cp__soft cp__small">{{ item.description }}</span>
                    }
                    @if (stock(item); as s) {
                      <span class="cp__band" [attr.data-band]="item.availability">{{ s }}</span>
                    }
                  </div>
                  <div class="cp__side">
                    <span class="cp__price">{{
                      item.priceInPaise
                        ? money(item.priceInPaise) + ' / ' + item.unit
                        : 'Price on request'
                    }}</span>
                    <label class="cp__qty">
                      <span class="cp__sr">Quantity of {{ item.partNumber }}</span>
                      <input
                        inputmode="decimal"
                        placeholder="Qty"
                        [value]="qtyOf(item.partNumber)"
                        (input)="setQty(item, $any($event.target).value)"
                      />
                    </label>
                  </div>
                </div>
              } @empty {
                <p class="cp__soft">
                  {{
                    busy()
                      ? 'Searching…'
                      : 'No parts match. Describe what you need in the note below.'
                  }}
                </p>
              }
              @if (total() > items().length) {
                <button type="button" class="cp__link" [disabled]="busy()" (click)="more()">
                  Show more ({{ total() - items().length }} more)
                </button>
              }
            </section>

            <section class="cp__card" aria-label="Your enquiry">
              <h2>Your enquiry</h2>
              @if (cartLines().length === 0) {
                <p class="cp__soft">
                  Enter a quantity against any part above, or describe it in the note.
                </p>
              } @else {
                <ul class="cp__lines">
                  @for (l of cartLines(); track l.partNumber) {
                    <li>
                      <span
                        >{{ l.quantity }} × {{ l.name }}
                        <span class="cp__mono">{{ l.partNumber }}</span></span
                      >
                    </li>
                  }
                </ul>
              }
              <div class="cp__form">
                <label for="cp-name">Your name</label>
                <input
                  id="cp-name"
                  autocomplete="name"
                  [value]="name()"
                  (input)="name.set($any($event.target).value)"
                />
                <label for="cp-company">Company <span class="cp__soft">(optional)</span></label>
                <input
                  id="cp-company"
                  autocomplete="organization"
                  [value]="company()"
                  (input)="company.set($any($event.target).value)"
                />
                <label for="cp-phone">WhatsApp number</label>
                <input
                  id="cp-phone"
                  inputmode="tel"
                  autocomplete="tel"
                  [value]="phone()"
                  (input)="phone.set($any($event.target).value)"
                />
                <label for="cp-email">Email <span class="cp__soft">(optional)</span></label>
                <input
                  id="cp-email"
                  type="email"
                  autocomplete="email"
                  [value]="email()"
                  (input)="email.set($any($event.target).value)"
                />
                <div class="cp__pair">
                  <div>
                    <label for="cp-city">City</label>
                    <input
                      id="cp-city"
                      [value]="city()"
                      (input)="city.set($any($event.target).value)"
                    />
                  </div>
                  <div>
                    <label for="cp-pin">PIN code <span class="cp__soft">(optional)</span></label>
                    <input
                      id="cp-pin"
                      inputmode="numeric"
                      maxlength="6"
                      [value]="pincode()"
                      (input)="pincode.set($any($event.target).value)"
                    />
                  </div>
                </div>
                <label for="cp-note"
                  >Note
                  <span class="cp__soft">(machine, make and model, anything else)</span></label
                >
                <textarea
                  id="cp-note"
                  rows="3"
                  [value]="note()"
                  (input)="note.set($any($event.target).value)"
                ></textarea>
                <input
                  class="cp__trap"
                  tabindex="-1"
                  autocomplete="off"
                  aria-hidden="true"
                  [value]="website()"
                  (input)="website.set($any($event.target).value)"
                />
                <label class="cp__consent" for="cp-consent">
                  <input
                    id="cp-consent"
                    type="checkbox"
                    [checked]="consent()"
                    (change)="consent.set($any($event.target).checked)"
                  />
                  You may contact me on WhatsApp and by phone about this enquiry.
                </label>
              </div>
              @if (problem(); as pr) {
                <p class="cp__bad" role="alert">{{ pr }}</p>
              }
              <button
                type="button"
                class="cp__btn"
                [disabled]="busy() || cartLines().length === 0 || !consent()"
                (click)="submit()"
              >
                {{ busy() ? 'Sending…' : 'Send enquiry' }}
              </button>
            </section>
          }
        }
      }
    </main>
  `,
  styles: `
    :host {
      --cp-ink: var(--ar-ink-900);
      --cp-soft: var(--ar-ink-500);
      --cp-line: var(--ar-line-300);
      --cp-card: var(--ar-white);
      --cp-bg: var(--ar-bg-100);
      --cp-accent: var(--ar-blue-600);
      --cp-on-accent: #ffffff;
      --cp-good: var(--ar-green-600);
      --cp-warn: var(--ar-amber-600);
      --cp-bad: var(--ar-red-600);
      display: block;
      min-height: 100%;
      background: var(--cp-bg);
      color: var(--cp-ink);
      font:
        400 15px/1.5 'IBM Plex Sans',
        system-ui,
        sans-serif;
    }
    @media (prefers-color-scheme: dark) {
      :host {
        --cp-ink: #e6edf5;
        --cp-soft: #a6b4c5;
        --cp-line: #1d3654;
        --cp-card: #10263d;
        --cp-bg: var(--ar-navy);
        --cp-accent: #6ea2ff;
        --cp-on-accent: var(--ar-navy);
        --cp-good: #6fd394;
        --cp-warn: #f2c46b;
        --cp-bad: #ff8b7e;
      }
    }
    .cp {
      max-width: 760px;
      margin: 0 auto;
      padding: 28px 16px 48px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .cp__head {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .cp__eyebrow {
      margin: 0;
      font:
        600 12px/1 'IBM Plex Mono',
        monospace;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--cp-accent);
    }
    .cp__title {
      margin: 0;
      font:
        700 28px/1.15 'IBM Plex Sans Condensed',
        'IBM Plex Sans',
        sans-serif;
    }
    .cp__card {
      background: var(--cp-card);
      border: 1px solid var(--cp-line);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 0;
    }
    .cp__card h2 {
      margin: 0;
      font:
        600 18px 'IBM Plex Sans Condensed',
        'IBM Plex Sans',
        sans-serif;
    }
    .cp__soft {
      margin: 0;
      color: var(--cp-soft);
    }
    .cp__small {
      font-size: 13px;
    }
    .cp__mono {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 13px;
    }
    .cp__find {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .cp__find input {
      flex: 1 1 220px;
    }
    input,
    select,
    textarea {
      font: inherit;
      padding: 9px 11px;
      border: 1px solid var(--cp-line);
      border-radius: 8px;
      background: var(--cp-bg);
      color: var(--cp-ink);
      min-width: 0;
    }
    .cp__item {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      padding-block: 10px;
      border-top: 1px solid var(--cp-line);
    }
    .cp__main {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .cp__side {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
    }
    .cp__price {
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      font-weight: 600;
    }
    .cp__qty input {
      width: 80px;
      text-align: right;
    }
    .cp__band {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--cp-good);
    }
    .cp__band[data-band='Limited'] {
      color: var(--cp-warn);
    }
    .cp__band[data-band='OnOrder'] {
      color: var(--cp-soft);
    }
    .cp__lines {
      margin: 0;
      padding-left: 18px;
    }
    .cp__form {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .cp__form label {
      font-weight: 600;
      font-size: 13.5px;
      margin-top: 4px;
    }
    .cp__pair {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 10px;
    }
    .cp__pair > div {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .cp__consent {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      font-weight: 400 !important;
    }
    .cp__trap {
      position: absolute;
      left: -9999px;
      width: 1px;
      height: 1px;
      opacity: 0;
    }
    .cp__btn {
      font:
        600 15px 'IBM Plex Sans',
        sans-serif;
      padding: 12px;
      border: 0;
      border-radius: 8px;
      background: var(--cp-accent);
      color: var(--cp-on-accent);
      cursor: pointer;
    }
    .cp__btn:disabled {
      opacity: 0.55;
      cursor: default;
    }
    .cp__link {
      border: 0;
      background: none;
      color: var(--cp-accent);
      font:
        500 14px 'IBM Plex Sans',
        sans-serif;
      cursor: pointer;
      padding: 4px 0;
      text-align: left;
    }
    .cp__bad {
      margin: 0;
      color: var(--cp-bad);
      font-weight: 500;
    }
    .cp__sr {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
    :focus-visible {
      outline: 2px solid var(--cp-accent);
      outline-offset: 2px;
    }
  `,
})
export class ArCataloguePage {
  private readonly api = inject(PublicCatalogueService);
  private readonly code = inject(ActivatedRoute).snapshot.paramMap.get('code') ?? '';

  protected readonly step = signal<Step>('loading');
  protected readonly page = signal<PublicCatalogueDto | null>(null);
  protected readonly items = signal<PublicCatalogueItemDto[]>([]);
  protected readonly total = signal(0);
  protected readonly query = signal('');
  protected readonly category = signal('');
  protected readonly busy = signal(false);
  protected readonly problem = signal<string | null>(null);
  protected readonly cart = signal<
    Map<string, { partNumber: string; name: string; quantity: number }>
  >(new Map());
  protected readonly name = signal('');
  protected readonly company = signal('');
  protected readonly phone = signal('');
  protected readonly email = signal('');
  protected readonly city = signal('');
  protected readonly pincode = signal('');
  protected readonly note = signal('');
  protected readonly website = signal('');
  protected readonly consent = signal(false);
  protected readonly done = signal<PublicReorderSubmittedDto | null>(null);

  protected readonly cartLines = computed(() =>
    [...this.cart().values()].filter((l) => l.quantity > 0),
  );

  private pageNo = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private seq = 0;

  constructor() {
    void this.start();
  }

  private async start(): Promise<void> {
    try {
      this.page.set(await firstValueFrom(this.api.open(this.code)));
      this.step.set('browse');
      await this.load(true);
    } catch {
      this.step.set('unavailable');
    }
  }

  private async load(reset: boolean): Promise<void> {
    const seq = ++this.seq;
    if (reset) this.pageNo = 0;
    this.busy.set(true);
    try {
      const result = await firstValueFrom(
        this.api.browse(this.code, this.query().trim(), this.category(), this.pageNo),
      );
      if (seq !== this.seq) return;
      this.items.update((list) => (reset ? result.items : [...list, ...result.items]));
      this.total.set(result.total);
    } catch {
      if (seq === this.seq && reset) this.items.set([]);
    } finally {
      if (seq === this.seq) this.busy.set(false);
    }
  }

  protected search(text: string): void {
    this.query.set(text);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.load(true), 300);
  }

  protected pickCategory(c: string): void {
    this.category.set(c);
    void this.load(true);
  }

  protected more(): void {
    this.pageNo++;
    void this.load(false);
  }

  protected money(paise: number): string {
    return rupees(paise);
  }

  protected stock(item: PublicCatalogueItemDto): string {
    return stockText({ availability: item.availability, availableQuantity: null, unit: item.unit });
  }

  protected qtyOf(partNumber: string): string {
    const q = this.cart().get(partNumber.toUpperCase())?.quantity;
    return q ? String(q) : '';
  }

  protected setQty(item: PublicCatalogueItemDto, text: string): void {
    const q = parseQuantity(text);
    if (q === null) return;
    this.cart.update((map) => {
      const next = new Map(map);
      const key = item.partNumber.toUpperCase();
      if (q === 0) next.delete(key);
      else next.set(key, { partNumber: item.partNumber, name: item.name, quantity: q });
      return next;
    });
  }

  protected async submit(): Promise<void> {
    if (!this.name().trim() || !this.phone().trim()) {
      this.problem.set('Enter your name and WhatsApp number.');
      return;
    }
    if (this.pincode().trim() && !isPincode(this.pincode())) {
      this.problem.set('Enter the PIN code as six digits, or leave it blank.');
      return;
    }
    this.busy.set(true);
    this.problem.set(null);
    try {
      this.done.set(
        await firstValueFrom(
          this.api.submit(this.code, {
            name: this.name().trim(),
            company: this.company().trim() || null,
            phone: this.phone().trim(),
            email: this.email().trim() || null,
            city: this.city().trim() || null,
            pincode: this.pincode().trim() || null,
            note: this.note().trim() || null,
            lines: this.cartLines().map((l) => ({
              partNumber: l.partNumber,
              quantity: l.quantity,
            })),
            consent: this.consent(),
            website: this.website() || null,
          }),
        ),
      );
      this.step.set('done');
    } catch (e: unknown) {
      this.problem.set(apiMessage(e, "The enquiry couldn't be sent. Try again in a minute."));
    } finally {
      this.busy.set(false);
    }
  }

  protected again(): void {
    this.cart.set(new Map());
    this.note.set('');
    this.done.set(null);
    this.step.set('browse');
  }
}
