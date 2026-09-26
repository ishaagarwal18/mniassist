import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type MeterTone = 'amber' | 'teal' | 'good' | 'warn' | 'bad' | 'ink';

/** A single-value bar. Announced as a progressbar so the number is not
 *  carried by the fill width alone. */
@Component({
  selector: 'ar-meter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'progressbar',
    '[attr.aria-valuenow]': 'value()',
    '[attr.aria-valuemax]': 'max()',
    '[attr.aria-label]': 'label()',
    '[style.height.px]': 'thickness()',
  },
  template: `<span
    class="ar-meter__fill"
    [class]="'ar-meter__fill--' + tone()"
    [style.width.%]="percent()"
  ></span>`,
  styles: `
    :host {
      display: block;
      width: 100%;
      border-radius: 4px;
      background: var(--ar-line-200);
      overflow: hidden;
    }
    .ar-meter__fill {
      display: block;
      height: 100%;
      border-radius: 4px;
    }
    .ar-meter__fill--amber {
      background: var(--ar-amber-500);
    }
    .ar-meter__fill--teal {
      background: var(--ar-teal-600);
    }
    .ar-meter__fill--good {
      background: var(--ar-green-600);
    }
    .ar-meter__fill--warn {
      background: var(--ar-warn-600);
    }
    .ar-meter__fill--bad {
      background: var(--ar-red-600);
    }
    .ar-meter__fill--ink {
      background: var(--ar-ink-400);
    }
  `,
})
export class ArMeter {
  readonly value = input.required<number>();
  readonly max = input(100);
  readonly tone = input<MeterTone>('amber');
  readonly thickness = input(7);
  readonly label = input('');
  protected readonly percent = computed(() =>
    Math.min(100, Math.max(0, (this.value() / (this.max() || 1)) * 100)),
  );
}
