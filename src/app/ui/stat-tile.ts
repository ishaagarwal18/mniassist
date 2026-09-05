import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type StatTone = 'neutral' | 'good' | 'warn' | 'bad' | 'teal' | 'amber';

/** A hero number with its label and one line of context.
 *  Deliberately not a chart — a single magnitude reads faster as text. */
@Component({
  selector: 'ar-stat-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="ar-label">{{ label() }}</span>
    <strong class="ar-stat__value">{{ value() }}</strong>
    @if (note()) { <span class="ar-stat__note" [class]="'ar-stat__note--' + tone()">{{ note() }}</span> }
  `,
  styles: `
    :host {
      display: flex; flex-direction: column; gap: 7px;
      background: var(--ar-white); border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card); padding: 16px;
    }
    .ar-stat__value {
      font: 600 25px var(--ar-font-sans); letter-spacing: -.025em;
      line-height: 1; color: var(--ar-ink-900);
    }
    .ar-stat__note { font: 400 11.5px var(--ar-font-sans); }
    .ar-stat__note--neutral { color: var(--ar-ink-400); }
    .ar-stat__note--good { color: var(--ar-green-600); }
    .ar-stat__note--warn { color: var(--ar-warn-600); }
    .ar-stat__note--bad  { color: var(--ar-red-600); }
    .ar-stat__note--teal { color: var(--ar-teal-600); }
    .ar-stat__note--amber { color: var(--ar-amber-600); }
  `,
})
export class ArStatTile {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly note = input<string | null>(null);
  readonly tone = input<StatTone>('neutral');
}
