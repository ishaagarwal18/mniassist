import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import {
  PERIOD_PRESETS,
  PeriodPreset,
  ReportPeriodStore,
} from '../core/services/report-period.store';
import { ArDateInput } from './date-input';
import { ArSelect } from './select';

/**
 * The reporting period, for a report's top bar: a preset, or two dates, and a switch
 * to compare with the period before. It edits the shared ReportPeriodStore, so every
 * report screen follows the same choice.
 */
@Component({
  selector: 'ar-period-picker',
  imports: [ArSelect, ArDateInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <select
      class="ar-field__input pp__preset"
      aria-label="Reporting period"
      (change)="setPreset($any($event.target).value)"
    >
      @for (p of presets; track p.value) {
        <option [value]="p.value" [selected]="p.value === period.preset()">{{ p.label }}</option>
      }
    </select>
    @if (period.preset() === 'custom') {
      <span class="pp__dates">
        <input
          type="date"
          class="ar-field__input pp__date"
          aria-label="From"
          [value]="period.dates().from"
          [max]="period.dates().to"
          (change)="setFrom($any($event.target).value)"
        />
        <span class="pp__to">to</span>
        <input
          type="date"
          class="ar-field__input pp__date"
          aria-label="To"
          [value]="period.dates().to"
          [min]="period.dates().from"
          (change)="setTo($any($event.target).value)"
        />
      </span>
    }
    @if (comparable()) {
      <label class="pp__compare" [title]="period.previousLabel()">
        <input
          type="checkbox"
          [checked]="period.compare()"
          (change)="period.setCompare($any($event.target).checked)"
        />
        Compare
      </label>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .pp__preset {
      min-width: 150px;
    }
    .pp__dates {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .pp__date {
      width: 140px;
    }
    .pp__to {
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .pp__compare {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-ink-700);
      cursor: pointer;
      white-space: nowrap;
    }
  `,
})
export class ArPeriodPicker {
  protected readonly period = inject(ReportPeriodStore);
  protected readonly presets = PERIOD_PRESETS;

  /** Off where a screen has nothing to compare (it then hides the switch). */
  readonly comparable = input(true);

  protected setPreset(value: string): void {
    this.period.setPreset(value as PeriodPreset);
  }

  protected setFrom(value: string): void {
    if (value) this.period.setCustom(value, this.period.dates().to);
  }

  protected setTo(value: string): void {
    if (value) this.period.setCustom(this.period.dates().from, value);
  }
}
