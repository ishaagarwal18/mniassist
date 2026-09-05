import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

@Component({
  selector: 'ar-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'role': 'tablist' },
  template: `
    @for (t of tabs(); track t) {
      <button class="ar-tab" type="button" role="tab"
              [class.ar-tab--on]="t === active()"
              [attr.aria-selected]="t === active()"
              (click)="active.set(t)">{{ t }}</button>
    }
  `,
  styles: `
    :host { display: flex; gap: 2px; border-bottom: 1px solid var(--ar-line-200); }
    .ar-tab {
      padding: 9px 14px; margin-bottom: -1px; cursor: pointer;
      background: none; border: 0; border-bottom: 2px solid transparent;
      font: 400 12.5px var(--ar-font-sans); color: var(--ar-ink-500);
    }
    .ar-tab:hover { color: var(--ar-ink-900); }
    .ar-tab--on { font-weight: 600; color: var(--ar-ink-900); border-bottom-color: var(--ar-amber-500); }
  `,
})
export class ArTabs {
  readonly tabs = input.required<readonly string[]>();
  readonly active = model.required<string>();
}
