import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ar-topbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tb__titles">
      <h1 class="tb__title">{{ title() }}</h1>
      @if (subtitle()) { <p class="tb__sub">{{ subtitle() }}</p> }
    </div>
    <div class="tb__actions"><ng-content /></div>
  `,
  styles: `
    :host {
      height: 56px; flex: none; display: flex; align-items: center; gap: 16px;
      padding: 0 22px; background: var(--ar-white);
      border-bottom: 1px solid var(--ar-line-200);
    }
    .tb__titles { flex: 1; min-width: 0; }
    .tb__title { margin: 0; font: 600 15.5px var(--ar-font-sans); letter-spacing: -.015em; color: var(--ar-ink-900); }
    .tb__sub { margin: 1px 0 0; font: 400 11.5px var(--ar-font-sans); color: var(--ar-ink-400); }
    .tb__actions { display: flex; align-items: center; gap: 10px; }
  `,
})
export class ArTopbar {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
}
