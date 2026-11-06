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
      gap: 6px;
      flex-wrap: nowrap;
      white-space: nowrap;
    }
    .pp__preset {
      min-width: 128px;
      height: 32px;
      padding: 0 8px;
      font-size: 12px;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-md, 6px);
      color: var(--ar-ink-800);
    }
    .pp__dates {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: var(--ar-surface-100, #f8fafc);
      padding: 1px 6px;
      border-radius: var(--ar-radius-md, 6px);
      border: 1px solid var(--ar-line-200, #e2e8f0);
      height: 32px;
      box-sizing: border-box;
    }
    .pp__date {
      width: 105px;
      height: 26px;
      padding: 0 4px;
      font-size: 11px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--ar-ink-800);
      box-shadow: none;
    }
    .pp__date:focus {
      background: var(--ar-white, #fff);
      border-color: var(--ar-primary, #0ea5e9);
      outline: none;
    }
    .pp__to {
      font: 500 11px var(--ar-font-sans);
      color: var(--ar-ink-400, #94a3b8);
      padding: 0 1px;
    }
    .pp__compare {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font: 500 11.5px var(--ar-font-sans);
      color: var(--ar-ink-700);
      cursor: pointer;
      white-space: nowrap;
      margin-left: 2px;
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
