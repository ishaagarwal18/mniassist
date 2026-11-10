import { ChangeDetectionStrategy, Component, inject, input, model, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ActivityLinkDto, ActivityLinkService, ActivityLinkType } from '../../proxy/activities';
import {
  LINK_TYPES,
  MAX_LINKS,
  addLink,
  linkRoute,
  linkTypeLabel,
  removeLink,
} from './activity-links.logic';

/**
 * What a task or meeting is about: any number of contacts, accounts, leads, quotations, sales documents, campaigns and tickets.
 * Pick a kind, type part of a name or number, choose a match. Each link shows as a chip that opens the record.
 */
@Component({
  selector: 'ar-activity-links',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="al">
      <span class="ar-field__label">Linked to <span class="ar-field__opt">optional</span></span>
      @if (links().length) {
        <ul class="al__chips">
          @for (l of links(); track l.type + ':' + l.recordId) {
            <li class="al__chip">
              <span class="al__kind">{{ typeLabel(l.type) }}</span>
              <a
                class="al__label"
                [routerLink]="route(l).path"
                [queryParams]="route(l).query ?? null"
                target="_blank"
                rel="noopener"
                translate="no"
                >{{ l.label }}</a
              >
              @if (!disabled()) {
                <button
                  type="button"
                  class="al__x"
                  [attr.aria-label]="'Remove ' + l.label"
                  (click)="remove(l)"
                >
                  ×
                </button>
              }
            </li>
          }
        </ul>
      }
      @if (!disabled() && links().length < max) {
        <div class="al__add">
          <select
            class="ar-field__input al__type"
            aria-label="Kind of record"
            (change)="setType(+$any($event.target).value)"
          >
            @for (t of types; track t.type) {
              <option [value]="t.type" [selected]="t.type === type()">{{ t.label }}</option>
            }
          </select>
          <div class="al__search">
            <input
              class="ar-field__input"
              type="search"
              autocomplete="off"
              [attr.aria-label]="'Search ' + plural()"
              [placeholder]="'Search ' + plural() + ' by name or number'"
              [value]="term()"
              (focus)="open()"
              (blur)="closeSoon()"
              (input)="onTerm($any($event.target).value)"
            />
            @if (showMenu()) {
              <div class="al__menu">
                @if (searching() && !results().length) {
                  <p class="al__note">Searching…</p>
                }
                @for (r of results(); track r.recordId) {
                  <button type="button" class="al__opt" (mousedown)="pick(r)" translate="no">
                    {{ r.label }}
                  </button>
                } @empty {
                  @if (!searching()) {
                    <p class="al__note">No {{ plural() }} match.</p>
                  }
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .al {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 10px;
    }
    .al__chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .al__chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      max-width: 100%;
      padding: 3px 4px 3px 8px;
      border: 1px solid var(--ar-line-200);
      border-radius: 999px;
      background: var(--ar-bg-50);
      font: 400 12.5px var(--ar-font-sans);
    }
    .al__kind {
      font: 600 10.5px var(--ar-font-sans);
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--ar-ink-400);
    }
    .al__label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--ar-ink-800);
      text-decoration: none;
    }
    .al__label:hover {
      text-decoration: underline;
    }
    .al__x {
      border: 0;
      background: none;
      cursor: pointer;
      color: var(--ar-ink-400);
      font-size: 15px;
      line-height: 1;
      padding: 0 4px;
    }
    .al__add {
      display: grid;
      grid-template-columns: minmax(130px, 170px) 1fr;
      gap: 8px;
    }
    .al__search {
      position: relative;
    }
    .al__menu {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      z-index: 5;
      margin-top: 4px;
      padding: 4px;
      max-height: 240px;
      overflow-y: auto;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-control);
      box-shadow: 0 10px 28px rgba(16, 20, 26, 0.18);
    }
    .al__opt {
      display: block;
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
    .al__opt:hover,
    .al__opt:focus-visible {
      background: var(--ar-bg-100);
      outline: none;
    }
    .al__note {
      margin: 0;
      padding: 8px;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
  `,
})
export class ArActivityLinks {
  private readonly api = inject(ActivityLinkService);

  readonly links = model<ActivityLinkDto[]>([]);
  readonly disabled = input(false);

  protected readonly types = LINK_TYPES;
  protected readonly max = MAX_LINKS;
  protected readonly type = signal<ActivityLinkType>(ActivityLinkType.Contact);
  protected readonly term = signal('');
  protected readonly results = signal<ActivityLinkDto[]>([]);
  protected readonly searching = signal(false);
  protected readonly showMenu = signal(false);
  private timer: ReturnType<typeof setTimeout> | undefined;
  private seq = 0;

  protected typeLabel(t: ActivityLinkType | undefined): string {
    return linkTypeLabel(t);
  }

  protected route(l: ActivityLinkDto) {
    return linkRoute(l);
  }

  protected plural(): string {
    return LINK_TYPES.find((t) => t.type === this.type())?.plural ?? 'records';
  }

  protected setType(type: ActivityLinkType): void {
    this.type.set(type);
    this.results.set([]);
    if (this.showMenu()) void this.search();
  }

  protected open(): void {
    this.showMenu.set(true);
    if (!this.results().length) void this.search();
  }

  protected closeSoon(): void {
    // Late enough for a click on a match to land first.
    setTimeout(() => this.showMenu.set(false), 150);
  }

  protected onTerm(value: string): void {
    this.term.set(value);
    this.showMenu.set(true);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.search(), 250);
  }

  private async search(): Promise<void> {
    const seq = ++this.seq;

    this.searching.set(true);
    try {
      const found = await firstValueFrom(
        this.api.search({
          type: this.type(),
          filter: this.term().trim() || null,
          maxResultCount: 10,
        }),
      );
      if (seq === this.seq) this.results.set(found);
    } catch {
      if (seq === this.seq) this.results.set([]);
    } finally {
      if (seq === this.seq) this.searching.set(false);
    }
  }

  protected pick(r: ActivityLinkDto): void {
    this.links.update((ls) => addLink(ls, r));
    this.term.set('');
    this.showMenu.set(false);
  }

  protected remove(l: ActivityLinkDto): void {
    this.links.update((ls) => removeLink(ls, l));
  }
}
