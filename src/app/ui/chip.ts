import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ensureSyncfusionTheme } from '../core/ui/syncfusion-theme';

/** Status tones are reserved — never reuse them to colour a data series.
 *  `amber` means "needs attention", `teal` is the informational blue (name kept
 *  for existing call sites), `ai` marks something AI produced or suggested. */
export type ChipTone = 'neutral' | 'amber' | 'teal' | 'good' | 'warn' | 'bad' | 'ai';

/** Syncfusion's chip colour for each tone. `ai` is ours: Syncfusion has no AI style. */
const SF_TONE: Record<ChipTone, string> = {
  neutral: '',
  amber: 'e-warning',
  teal: 'e-info',
  good: 'e-success',
  warn: 'e-warning',
  bad: 'e-danger',
  ai: 'e-ai',
};

/**
 * A status label: a single, non-interactive Syncfusion chip (`e-chip-list e-chip`)
 * in the tone's colour. Kept small and pill-shaped, per the design system's rule
 * that pills are for status, tags and filters.
 */
@Component({
  selector: 'ar-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'hostClass()' },
  template: `
    @if (dot()) {
      <span class="ar-chip__dot" aria-hidden="true"></span>
    }
    <span class="e-chip-text"><ng-content /></span>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      height: auto;
      margin: 0;
      padding: 2px 8px;
      border-radius: 999px;
      font: 500 11px/1.5 var(--ar-font-sans);
      letter-spacing: 0.02em;
      white-space: nowrap;
      cursor: default;
      pointer-events: none;
    }
    :host(.ar-chip--mono) {
      font-family: var(--ar-font-mono);
    }
    .e-chip-text {
      font: inherit;
      margin: 0;
    }
    .ar-chip__dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      flex: none;
    }
    :host(.e-ai) {
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

  protected readonly hostClass = computed(
    () =>
      `e-chip-list e-chip ${SF_TONE[this.tone()]} ar-chip ar-chip--${this.tone()}` +
      (this.mono() ? ' ar-chip--mono' : ''),
  );

  constructor() {
    ensureSyncfusionTheme();
  }
}
