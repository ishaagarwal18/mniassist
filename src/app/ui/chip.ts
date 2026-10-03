import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Status tones are reserved — never reuse them to colour a data series.
 *  `amber` means "needs attention", `teal` is the informational blue (name kept
 *  for existing call sites), `ai` marks something AI produced or suggested. */
export type ChipTone = 'neutral' | 'amber' | 'teal' | 'good' | 'warn' | 'bad' | 'ai';

@Component({
  selector: 'ar-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': '"ar-chip ar-chip--" + tone() + (mono() ? " ar-chip--mono" : "")' },
  template: `
    @if (dot()) {
      <span class="ar-chip__dot" aria-hidden="true"></span>
    }
    <ng-content />
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 8px;
      border: 1px solid transparent;
      border-radius: 999px;
      font: 500 11px var(--ar-font-sans);
      letter-spacing: 0.02em;
      white-space: nowrap;
    }
    :host(.ar-chip--mono) {
      font-family: var(--ar-font-mono);
    }
    .ar-chip__dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      flex: none;
    }

    :host(.ar-chip--neutral) {
      background: var(--ar-bg-100);
      border-color: var(--ar-line-200);
      color: var(--ar-ink-500);
    }
    :host(.ar-chip--amber) {
      background: var(--ar-amber-100);
      border-color: var(--ar-amber-200);
      color: var(--ar-amber-600);
    }
    :host(.ar-chip--teal) {
      background: var(--ar-blue-100);
      border-color: var(--ar-blue-200);
      color: var(--ar-blue-700);
    }
    :host(.ar-chip--good) {
      background: var(--ar-green-100);
      border-color: var(--ar-green-200);
      color: var(--ar-green-600);
    }
    :host(.ar-chip--warn) {
      background: var(--ar-warn-100);
      border-color: var(--ar-amber-200);
      color: var(--ar-warn-600);
    }
    :host(.ar-chip--bad) {
      background: var(--ar-red-100);
      border-color: var(--ar-red-200);
      color: var(--ar-red-600);
    }
    :host(.ar-chip--ai) {
      background: var(--ar-ai-100);
      border-color: var(--ar-ai-200);
      color: var(--ar-ai-700);
    }
  `,
})
export class ArChip {
  readonly tone = input<ChipTone>('neutral');
  readonly dot = input(false);
  readonly mono = input(false);
}
