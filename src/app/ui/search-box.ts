import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { ArIcon } from './icon';

@Component({
  selector: 'ar-search-box',
  imports: [ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-icon name="search" [size]="15" class="ar-search__icon" />
    <input
      class="ar-search__input"
      type="search"
      [attr.placeholder]="placeholder()"
      [attr.aria-label]="placeholder()"
      [value]="query()"
      (input)="query.set($any($event.target).value)"
    />
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: 8px;
      height: var(--ar-control-h);
      padding: 0 10px;
      min-width: 0;
      background: var(--ar-bg-100);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-control);
    }
    :host:focus-within {
      border-color: var(--ar-amber-500);
      background: var(--ar-white);
    }
    .ar-search__icon {
      color: var(--ar-ink-400);
    }
    .ar-search__input {
      flex: 1;
      min-width: 0;
      border: 0;
      background: transparent;
      outline: none;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .ar-search__input::placeholder {
      color: var(--ar-ink-400);
    }
  `,
})
export class ArSearchBox {
  readonly placeholder = input('Search');
  /** Two-way bindable: [(query)]="term" */
  readonly query = model('');
}
