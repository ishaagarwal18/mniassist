import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ar-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (heading()) {
      <header class="ar-card__head">
        <h2 class="ar-card__title">{{ heading() }}</h2>
        <ng-content select="[card-actions]" />
      </header>
    }
    <ng-content />
  `,
  styles: `
    :host {
      display: block;
      background: var(--ar-white);
      background-image: var(--ar-card-sheen);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      box-shadow: var(--ar-shadow-card);
      padding: var(--ar-pad-card);
    }
    .ar-card__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
    }
    .ar-card__title {
      margin: 0;
      font: 600 15px var(--ar-font-sans);
      letter-spacing: -0.01em;
      color: var(--ar-ink-900);
    }
  `,
})
export class ArCard {
  readonly heading = input<string | null>(null);
}
