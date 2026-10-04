import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ProgressBarModule } from '@syncfusion/ej2-angular-progressbar';

import { registerSyncfusionLicense } from '../core/ui/syncfusion-license';
import { ensureSyncfusionTheme } from '../core/ui/syncfusion-theme';

export type MeterTone = 'amber' | 'teal' | 'good' | 'warn' | 'bad' | 'ink';

let nextId = 0;

/** The colour token for each tone. */
const TONE_COLOUR: Record<MeterTone, string> = {
  amber: 'var(--ar-amber-500)',
  teal: 'var(--ar-blue-500)',
  good: 'var(--ar-green-500)',
  warn: 'var(--ar-warn-500)',
  bad: 'var(--ar-red-500)',
  ink: 'var(--ar-ink-400)',
};

/**
 * A single-value bar: a linear Syncfusion progress bar (`ejs-progressbar`),
 * announced as a progressbar so the number is not carried by the fill width
 * alone. Colours are applied through CSS rather than Syncfusion's colour
 * properties, which SVG takes as fixed attributes and so would not follow the
 * light/dark theme switch.
 */
@Component({
  selector: 'ar-meter',
  imports: [ProgressBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style.--meter-fill]': 'colour()' },
  template: `
    <ejs-progressbar
      [id]="id"
      type="Linear"
      [value]="value()"
      [minimum]="0"
      [maximum]="max() || 1"
      [height]="thickness() + 'px'"
      [trackThickness]="thickness()"
      [progressThickness]="thickness()"
      [cornerRadius]="value() > 0 ? 'Round' : 'Square'"
      [animation]="{ enable: false }"
      [attr.aria-label]="label()"
    />
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      line-height: 0;
    }
    :host ::ng-deep [id$='_Lineartrack'] {
      fill: var(--ar-line-200);
      stroke: var(--ar-line-200);
    }
    :host ::ng-deep [id$='_Linearprogress'] {
      fill: var(--meter-fill);
      stroke: var(--meter-fill);
    }
  `,
})
export class ArMeter {
  readonly value = input.required<number>();
  readonly max = input(100);
  readonly tone = input<MeterTone>('amber');
  readonly thickness = input(7);
  readonly label = input('');

  protected readonly colour = computed(() => TONE_COLOUR[this.tone()]);

  /** Syncfusion's SVG controls find their own parts by element id, so each needs a unique one. */
  protected readonly id = `ar-meter-${++nextId}`;

  constructor() {
    registerSyncfusionLicense();
    ensureSyncfusionTheme();
  }
}
