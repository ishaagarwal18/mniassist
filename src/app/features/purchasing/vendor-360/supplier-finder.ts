import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Vendor360Service, Vendor360SupplierDto } from '../../../proxy/purchasing';
import { matchesEveryWord, supplierMatchDetail } from './supplier-finder.logic';

/**
 * Vendor 360's supplier finder: a search box rather than one long list, for workspaces with thousands of suppliers. Typing
 * (or focusing it) asks the server for the first 20 suppliers matching every word, by name, GSTIN, phone, email or contact
 * person; arrow keys and Enter pick one.
 */
@Component({
  selector: 'ar-supplier-finder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input
      class="ar-field__input sf__box"
      type="search"
      autocomplete="off"
      role="combobox"
      aria-autocomplete="list"
      aria-controls="sf-list"
      [attr.aria-expanded]="showing()"
      [attr.aria-activedescendant]="activeId()"
      aria-label="Find a supplier by name, GSTIN, phone or contact person"
      placeholder="Find a supplier: name, GSTIN, phone, contact"
      [value]="showing() ? term() : (currentName() ?? '')"
      (focus)="open()"
      (blur)="closeSoon()"
      (input)="onInput($any($event.target).value)"
      (keydown)="onKey($event)"
    />
    @if (showing()) {
      <div class="sf__menu" id="sf-list" role="listbox" aria-label="Suppliers">
        @if (searching() && !matches().length) {
          <p class="sf__note">Searching…</p>
        }
        @for (s of matches(); track s.id; let i = $index) {
          <div
            class="sf__item"
            role="option"
            [id]="'sf-opt-' + i"
            [attr.aria-selected]="i === active()"
            [class.sf__item--on]="i === active()"
            (mousedown)="pick(s)"
            (mouseenter)="active.set(i)"
          >
            <span class="sf__name" translate="no">{{ s.name }}</span>
            <span class="sf__detail">{{ detail(s) }}</span>
          </div>
        } @empty {
          @if (!searching()) {
            <p class="sf__note">
              {{ error() ?? (term().trim() ? 'No supplier matches "' + term().trim() + '".' : 'No suppliers yet.') }}
            </p>
          }
        }
        @if (matches().length === limit) {
          <p class="sf__note">Showing the first {{ limit }}. Type more to narrow it down.</p>
        }
      </div>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      width: min(420px, 60vw);
      min-width: 0;
    }
    .sf__box {
      width: 100%;
    }
    .sf__menu {
      position: absolute;
      top: 100%;
      right: 0;
      left: 0;
      z-index: 20;
      margin-top: 4px;
      padding: 4px;
      max-height: 360px;
      overflow-y: auto;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-control);
      box-shadow: var(--ar-shadow-pop);
    }
    .sf__item {
      display: flex;
      flex-direction: column;
      gap: 1px;
      padding: 7px 8px;
      border-radius: var(--ar-radius-control);
      cursor: pointer;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-800);
    }
    .sf__item--on {
      background: var(--ar-bg-100);
    }
    .sf__name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 500;
    }
    .sf__detail {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 11.5px;
      color: var(--ar-ink-500);
    }
    .sf__note {
      margin: 0;
      padding: 8px;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    @media (max-width: 560px) {
      :host {
        width: 100%;
      }
    }
  `,
})
export class ArSupplierFinder {
  private readonly api = inject(Vendor360Service);

  /** The supplier on screen, shown in the box while it is not being searched. */
  readonly currentName = input<string | null>(null);
  /** Sample suppliers, searched in the browser instead of the server (mock data). */
  readonly local = input<Vendor360SupplierDto[] | null>(null);
  readonly picked = output<string>();

  protected readonly limit = 20;
  protected readonly showing = signal(false);
  protected readonly term = signal('');
  protected readonly matches = signal<Vendor360SupplierDto[]>([]);
  protected readonly searching = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly active = signal(-1);
  protected readonly activeId = computed(() =>
    this.showing() && this.active() >= 0 ? 'sf-opt-' + this.active() : null,
  );
  protected readonly detail = supplierMatchDetail;

  private timer?: ReturnType<typeof setTimeout>;
  private seq = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  protected open(): void {
    if (this.showing()) return;
    this.showing.set(true);
    this.term.set('');
    void this.search('');
  }

  protected closeSoon(): void {
    // Late enough for a click on an option to land first.
    setTimeout(() => this.showing.set(false), 150);
  }

  protected onInput(value: string): void {
    this.term.set(value);
    this.showing.set(true);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.search(value), 250);
  }

  protected onKey(event: KeyboardEvent): void {
    const n = this.matches().length;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.showing()) this.open();
        else if (n) this.active.set((this.active() + 1) % n);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (n) this.active.set((this.active() - 1 + n) % n);
        break;
      case 'Enter': {
        const s = this.matches()[this.active() >= 0 ? this.active() : 0];
        if (this.showing() && s) {
          event.preventDefault();
          this.pick(s);
        }
        break;
      }
      case 'Escape':
        if (this.showing()) {
          event.preventDefault();
          this.showing.set(false);
        }
        break;
    }
  }

  protected pick(s: Vendor360SupplierDto): void {
    this.showing.set(false);
    this.term.set('');
    if (s.id) this.picked.emit(s.id);
  }

  private async search(term: string): Promise<void> {
    const seq = ++this.seq;
    this.searching.set(true);
    this.error.set(null);
    let found: Vendor360SupplierDto[] = [];
    try {
      const local = this.local();
      found =
        local || environment.useMockData
          ? (local ?? []).filter((s) => matchesEveryWord(s, term)).slice(0, this.limit)
          : await firstValueFrom(
              this.api.getSupplierMatches(term.trim() || null, this.limit, {
                skipHandleError: true,
              }),
            );
    } catch {
      if (seq === this.seq) this.error.set('Suppliers could not be searched. Try again.');
    }
    if (seq !== this.seq) return;
    this.matches.set(found);
    this.active.set(found.length ? 0 : -1);
    this.searching.set(false);
  }
}
