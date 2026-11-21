import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  CallAssistHitDto,
  CallAssistSearchResultDto,
  CallAssistService,
  CallerSummaryDto,
  TechSupportAnswerDto,
} from '../proxy/calling/call-assist.service';
import { ArButton } from '../ui';

const KIND_LABEL: Record<CallAssistHitDto['kind'], string> = {
  Customer: 'Customer',
  Product: 'Part',
  Order: 'Order',
  Ticket: 'Ticket',
  PurchaseOrder: 'PO',
  Machine: 'Machine',
};

/** Typing pauses this long before searching, so a part number isn't searched once per key. */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * The call bar's look-up panel, for an agent on a call: who is calling (their open tickets, orders and machines), a search
 * over customers, parts, orders, tickets and purchase orders as they type, and a technical-support assistant that answers
 * from the knowledge base. The search box has focus when the panel opens, so the agent can type at once.
 */
@Component({
  selector: 'ar-call-assist',
  imports: [ArButton, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="ca" aria-label="Look up during the call">
      @if (caller(); as c) {
        <div class="ca__caller">
          <div class="ca__who">
            <b translate="no">{{ c.name || c.phone }}</b>
            @if (c.company || c.accountName) {
              <span class="ca__muted" translate="no">· {{ c.accountName || c.company }}</span>
            }
            @if (c.link) {
              <a class="ca__link" [routerLink]="c.link">Customer overview</a>
            }
          </div>
          @if (c.openTickets.length || c.recentOrders.length || c.machines.length) {
            <ul class="ca__list">
              @for (h of c.openTickets.concat(c.recentOrders, c.machines); track h.kind + h.id) {
                <li class="ca__hit">
                  <span class="ca__kind">{{ kind(h) }}</span>
                  <span class="ca__title" translate="no">{{ h.title }}</span>
                  @if (h.status) {
                    <span class="ca__status" translate="no">{{ h.status }}</span>
                  }
                </li>
              }
            </ul>
          } @else {
            <p class="ca__muted">No open tickets, orders or machines on record.</p>
          }
        </div>
      } @else if (callerError(); as e) {
        <p class="ca__muted">{{ e }}</p>
      }

      <label class="ca__label" for="ca-search">Search customers, parts, orders, tickets</label>
      <input
        #search
        id="ca-search"
        class="ar-field__input"
        type="search"
        autocomplete="off"
        placeholder="Name, phone, part, order or ticket number"
        [value]="query()"
        (input)="onQuery($any($event.target).value)"
        (keydown.escape)="onQuery('')"
      />
      @if (searching()) {
        <p class="ca__muted">Searching…</p>
      } @else if (results(); as r) {
        @if (r.hits.length === 0) {
          <p class="ca__muted">Nothing matches “{{ query() }}”.</p>
        } @else {
          <ul class="ca__list ca__results">
            @for (h of r.hits; track h.kind + h.id) {
              <li class="ca__hit" [class.ca__hit--mine]="h.ofCaller">
                <span class="ca__kind">{{ kind(h) }}</span>
                @if (h.link) {
                  <a class="ca__title" [routerLink]="h.link" translate="no">{{ h.title }}</a>
                } @else {
                  <span class="ca__title" translate="no">{{ h.title }}</span>
                }
                @if (h.subtitle) {
                  <span class="ca__muted" translate="no">{{ h.subtitle }}</span>
                }
                @if (h.status) {
                  <span class="ca__status" translate="no">{{ h.status }}</span>
                }
                @if (h.ofCaller) {
                  <span class="ca__mine">Caller's</span>
                }
              </li>
            }
          </ul>
        }
        @if (r.hidden.length) {
          <p class="ca__muted">
            Not shown, as your role can't open them: {{ r.hidden.join(', ') }}.
          </p>
        }
      } @else if (searchError(); as e) {
        <p class="ca__err" role="alert">{{ e }}</p>
      }

      <label class="ca__label" for="ca-ask">Ask technical support</label>
      <textarea
        id="ca-ask"
        class="ar-field__input ca__ask"
        rows="2"
        maxlength="1000"
        placeholder="E.g. ACS580 shows fault 2310 overcurrent at start. What should the customer check?"
        [value]="question()"
        (input)="question.set($any($event.target).value)"
        (keydown.enter)="onAskKey($any($event))"
      ></textarea>
      <div class="ca__actions">
        <button
          ar-button
          type="button"
          variant="ghost"
          [disabled]="asking() || question().trim().length < 3"
          (click)="ask()"
        >
          {{ asking() ? 'Asking…' : 'Ask' }}
        </button>
        <span class="ca__muted">Enter to ask · Shift+Enter for a new line</span>
      </div>
      @if (answer(); as a) {
        @if (a.answer) {
          <div class="ca__answer" role="status">
            <p class="ca__source" [class.ca__source--general]="!a.fromKnowledgeBase">
              {{
                a.fromKnowledgeBase
                  ? 'From your knowledge base'
                  : 'General guidance, not from your documents: check before advising'
              }}
            </p>
            <p class="ca__text" translate="no">{{ a.answer }}</p>
            @if (a.sources.length) {
              <p class="ca__muted" translate="no">Sources: {{ a.sources.join(' · ') }}</p>
            }
          </div>
        } @else {
          <p class="ca__muted" role="status">{{ a.unavailable }}</p>
        }
      }
    </section>
  `,
  styles: `
    .ca {
      flex-basis: 100%;
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: min(60vh, 520px);
      overflow: auto;
      padding-top: 8px;
      border-top: 1px solid var(--ar-line-200);
      font: 400 12.5px var(--ar-font-sans);
    }
    .ca__caller {
      padding: 6px 8px;
      border-radius: 6px;
      background: var(--ar-bg-100);
    }
    .ca__who {
      display: flex;
      gap: 6px;
      align-items: baseline;
      flex-wrap: wrap;
    }
    .ca__link {
      margin-left: auto;
      font-weight: 500;
    }
    .ca__label {
      margin-top: 4px;
      font: 600 12px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .ca__list {
      list-style: none;
      margin: 4px 0 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .ca__hit {
      display: flex;
      gap: 6px;
      align-items: baseline;
      flex-wrap: wrap;
    }
    .ca__hit--mine .ca__title {
      font-weight: 600;
    }
    .ca__kind {
      flex: none;
      min-width: 52px;
      font: 600 10.5px var(--ar-font-sans);
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--ar-ink-500);
    }
    .ca__title {
      color: var(--ar-ink-900);
    }
    .ca__status {
      color: var(--ar-teal-700, #0f766e);
    }
    .ca__mine {
      font: 600 10.5px var(--ar-font-sans);
      color: var(--ar-teal-700, #0f766e);
    }
    .ca__muted {
      margin: 0;
      color: var(--ar-ink-500);
    }
    .ca__err {
      margin: 0;
      color: var(--ar-bad-600, #b42318);
    }
    .ca__ask {
      resize: vertical;
      min-height: 44px;
    }
    .ca__actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .ca__answer {
      padding: 6px 8px;
      border-radius: 6px;
      border: 1px solid var(--ar-line-200);
    }
    .ca__source {
      margin: 0 0 4px;
      font: 600 11.5px var(--ar-font-sans);
      color: var(--ar-teal-700, #0f766e);
    }
    .ca__source--general {
      color: var(--ar-warn-700, #b54708);
    }
    .ca__text {
      margin: 0;
      white-space: pre-line;
      color: var(--ar-ink-900);
    }
  `,
})
export class ArCallAssist {
  private readonly api = inject(CallAssistService);

  /** The caller's contact; their own records come first in the search. */
  readonly contactId = input<string | null | undefined>(null);

  private readonly searchBox = viewChild<ElementRef<HTMLInputElement>>('search');

  protected readonly caller = signal<CallerSummaryDto | null>(null);
  protected readonly callerError = signal<string | null>(null);
  protected readonly query = signal('');
  protected readonly searching = signal(false);
  protected readonly results = signal<CallAssistSearchResultDto | null>(null);
  protected readonly searchError = signal<string | null>(null);
  protected readonly question = signal('');
  protected readonly asking = signal(false);
  protected readonly answer = signal<TechSupportAnswerDto | null>(null);

  private timer: ReturnType<typeof setTimeout> | undefined;
  private searchSeq = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
    afterNextRender(() => this.searchBox()?.nativeElement.focus());
    effect(() => {
      const id = this.contactId();
      untracked(() => void this.loadCaller(id));
    });
  }

  protected kind(hit: CallAssistHitDto): string {
    return KIND_LABEL[hit.kind] ?? hit.kind;
  }

  private async loadCaller(id: string | null | undefined): Promise<void> {
    this.caller.set(null);
    this.callerError.set(null);
    if (!id) return;
    try {
      this.caller.set(await firstValueFrom(this.api.getCaller(id)));
    } catch {
      this.callerError.set("The caller's details could not be loaded.");
    }
  }

  protected onQuery(value: string): void {
    this.query.set(value);
    clearTimeout(this.timer);
    const q = value.trim();
    if (q.length < 2) {
      this.searchSeq++; // a reply still on its way is for an older query
      this.results.set(null);
      this.searching.set(false);
      this.searchError.set(null);
      return;
    }
    this.timer = setTimeout(() => void this.search(q), SEARCH_DEBOUNCE_MS);
  }

  private async search(q: string): Promise<void> {
    const seq = ++this.searchSeq;
    this.searching.set(true);
    this.searchError.set(null);
    try {
      const found = await firstValueFrom(
        this.api.search({ query: q, contactId: this.contactId() }),
      );
      if (seq === this.searchSeq) this.results.set(found);
    } catch {
      if (seq === this.searchSeq) {
        this.results.set(null);
        this.searchError.set('The search did not work. Try again.');
      }
    } finally {
      if (seq === this.searchSeq) this.searching.set(false);
    }
  }

  protected onAskKey(event: KeyboardEvent): void {
    if (event.shiftKey) return; // a new line
    event.preventDefault();
    void this.ask();
  }

  protected async ask(): Promise<void> {
    const question = this.question().trim();
    if (question.length < 3 || this.asking()) return;
    this.asking.set(true);
    this.answer.set(null);
    try {
      this.answer.set(
        await firstValueFrom(this.api.ask({ question, contactId: this.contactId() })),
      );
    } catch {
      this.answer.set({
        fromKnowledgeBase: false,
        sources: [],
        unavailable: 'The assistant could not be reached. Try again in a moment.',
      });
    } finally {
      this.asking.set(false);
    }
  }
}
