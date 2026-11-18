import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  Injectable,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { inr } from '../../core/util/format';
import { ProductDto, ProductService } from '../../proxy/library/product.service';

/** Searches the product catalogue for item lines; remembers when the role may not read it, so no line asks again. */
@Injectable({ providedIn: 'root' })
export class CatalogueSearch {
  private readonly api = inject(ProductService);

  /** The catalogue answered 403: lines are typed by hand. */
  readonly blocked = signal(false);

  async search(term: string): Promise<ProductDto[]> {
    if (this.blocked()) return [];
    try {
      const page = await firstValueFrom(
        this.api.getList(
          { filter: term.trim() || null, activeOnly: true, skipCount: 0, maxResultCount: 10 },
          { skipHandleError: true },
        ),
      );
      return page.items ?? [];
    } catch (e: unknown) {
      if ((e as { status?: number })?.status === 403) this.blocked.set(true);
      return [];
    }
  }
}

/**
 * The Item name box of a sales line: typing (or focusing it) lists matching catalogue products; picking one reports the product
 * so the line can fill its item number, description and the rest. Plain typing is reported too, for hand-typed lines.
 */
@Component({
  selector: 'ar-catalogue-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input
      #box
      class="ar-field__input"
      type="search"
      autocomplete="off"
      [placeholder]="placeholder()"
      aria-label="Item name"
      [value]="value()"
      (focus)="open()"
      (blur)="closeSoon()"
      (input)="onInput($any($event.target).value)"
    />
    @if (showing()) {
      <div
        class="ci__menu"
        [style.top.px]="pos().top"
        [style.left.px]="pos().left"
        [style.min-width.px]="pos().width"
      >
        @if (searching() && !matches().length) {
          <p class="ci__note">Searching…</p>
        }
        @for (p of matches(); track p.id) {
          <button type="button" class="ci__item" (mousedown)="pick(p)">
            <span class="ci__name">{{ p.name }}</span>
            <span class="ar-mono">{{ p.partNumber }}</span>
            <span class="ci__price">{{ money(p.listPriceInPaise ?? 0) }}</span>
          </button>
        } @empty {
          @if (!searching()) {
            <p class="ci__note">
              {{ allowCreate() ? 'No item matches.' : 'No item matches. Type the item number and description.' }}
            </p>
          }
        }
        @if (allowCreate() && !searching()) {
          <button type="button" class="ci__item ci__new" (mousedown)="create()">
            <span class="ci__name">+ Add {{ value().trim() ? '"' + value().trim() + '"' : 'a new item' }} to the catalogue</span>
          </button>
        }
      </div>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      min-width: 0;
    }
    input {
      width: 100%;
    }
    /* Fixed to the page under the box, so a table cell or a scrolling card cannot cut it off. */
    .ci__menu {
      position: fixed;
      z-index: 1400;
      width: max-content;
      max-width: min(520px, 90vw);
      padding: 4px;
      max-height: 280px;
      overflow-y: auto;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-control);
      box-shadow: var(--ar-shadow-pop);
    }
    .ci__item {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      gap: 10px;
      align-items: baseline;
      width: 100%;
      padding: 7px 8px;
      text-align: left;
      background: none;
      border: 0;
      cursor: pointer;
      border-radius: var(--ar-radius-control);
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-800);
    }
    .ci__item:hover,
    .ci__item:focus-visible {
      background: var(--ar-bg-100);
      outline: none;
    }
    .ci__name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 500;
    }
    .ci__price {
      font-variant-numeric: tabular-nums;
      color: var(--ar-ink-600);
    }
    .ci__new {
      grid-template-columns: 1fr;
      margin-top: 2px;
      border-top: 1px solid var(--ar-line-200);
      border-radius: 0;
      color: var(--ar-blue-500);
    }
    .ci__note {
      margin: 0;
      padding: 8px;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
  `,
})
export class ArCatalogueItem {
  private readonly catalogue = inject(CatalogueSearch);

  readonly value = input('');
  readonly placeholder = input('Search the catalogue');
  /** Offer "Add … to the catalogue" under the matches. */
  readonly allowCreate = input(false);
  /** The person chose to add a new item; carries what they typed. */
  readonly createNew = output<string>();
  /** The name as typed. */
  readonly typed = output<string>();
  /** The catalogue product chosen. */
  readonly picked = output<ProductDto>();

  protected readonly money = (paise: number) => inr(paise);
  protected readonly showing = signal(false);
  protected readonly matches = signal<ProductDto[]>([]);
  protected readonly searching = signal(false);
  private readonly box = viewChild<ElementRef<HTMLInputElement>>('box');
  /** Where the menu sits: just under the box. */
  protected readonly pos = signal({ top: 0, left: 0, width: 0 });

  private place(): void {
    const r = this.box()?.nativeElement.getBoundingClientRect();
    if (r) this.pos.set({ top: r.bottom + 4, left: r.left, width: r.width });
  }

  /** The page or a table scrolled while the menu is open: keep it under the box. */
  @HostListener('window:resize')
  protected follow(): void {
    if (this.showing()) this.place();
  }

  constructor() {
    // Scrolls inside cards and grids do not bubble to window: listen in the capture phase.
    const onScroll = () => this.follow();
    window.addEventListener('scroll', onScroll, true);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('scroll', onScroll, true));
  }

  private timer?: ReturnType<typeof setTimeout>;
  private seq = 0;

  protected open(): void {
    if (this.catalogue.blocked() && !this.allowCreate()) return;
    this.place();
    this.showing.set(true);
    this.matches.set([]);
    void this.search(this.value());
  }

  protected closeSoon(): void {
    // Late enough for a click on an item to land first.
    setTimeout(() => this.showing.set(false), 150);
  }

  protected onInput(value: string): void {
    this.typed.emit(value);
    if (this.catalogue.blocked()) return;
    this.place();
    this.showing.set(true);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.search(value), 250);
  }

  protected pick(p: ProductDto): void {
    this.showing.set(false);
    this.picked.emit(p);
  }

  protected create(): void {
    this.showing.set(false);
    this.createNew.emit(this.value().trim());
  }

  private async search(term: string): Promise<void> {
    const seq = ++this.seq;
    this.searching.set(true);
    const found = await this.catalogue.search(term);
    if (seq !== this.seq) return;
    this.matches.set(found);
    this.searching.set(false);
    if (this.catalogue.blocked()) this.showing.set(false);
  }
}
