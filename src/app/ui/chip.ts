import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Status tones are reserved — never reuse them to colour a data series. */
export type ChipTone = 'neutral' | 'amber' | 'teal' | 'good' | 'warn' | 'bad';

@Component({
  selector: 'ar-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': '"ar-chip ar-chip--" + tone() + (mono() ? " ar-chip--mono" : "")' },
  template: `
    @if (dot()) { <span class="ar-chip__dot" aria-hidden="true"></span> }
    <ng-content />
  `,
  styles: `
    :host {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 3px 8px; border-radius: var(--ar-radius-chip);
      font: 500 11px var(--ar-font-sans); letter-spacing: .02em; white-space: nowrap;
    }
    :host(.ar-chip--mono) { font-family: var(--ar-font-mono); }
    .ar-chip__dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex: none; }

    :host(.ar-chip--neutral) { background: var(--ar-bg-100); color: var(--ar-ink-500); }
    :host(.ar-chip--amber) { background: var(--ar-amber-100); color: var(--ar-amber-600); }
    :host(.ar-chip--teal) { background: var(--ar-teal-100); color: var(--ar-teal-600); }
    :host(.ar-chip--good) { background: var(--ar-green-100); color: var(--ar-green-600); }
    :host(.ar-chip--warn) { background: var(--ar-warn-100); color: var(--ar-warn-600); }
    :host(.ar-chip--bad) { background: var(--ar-red-100); color: var(--ar-red-600); }
  `,
})
export class ArChip {
  readonly tone = input<ChipTone>('neutral');
  readonly dot = input(false);
  readonly mono = input(false);
}
