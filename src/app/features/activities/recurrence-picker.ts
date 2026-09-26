import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

import { RecurrenceFrequency, Weekday } from '../../proxy/activities';
import { DAY_NAMES, NO_REPEAT, RecurrenceDraft, WEEK_ORDER, recurrenceProblem } from './recurrence';

/**
 * How a task or meeting repeats: not at all, daily, weekly (on chosen days) or monthly, every so many, and when it stops. A meeting series
 * has to say when it ends, since each occurrence becomes a meeting on the calendar; a task can go on for ever, since the next one is only made
 * when the last is finished.
 */
@Component({
  selector: 'ar-recurrence-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rp">
      <label class="ar-field">
        <span class="ar-field__label">Repeats</span>
        <select
          id="rp-frequency"
          class="ar-field__input"
          (change)="set({ frequency: +$any($event.target).value })"
        >
          @for (f of frequencies; track f.value) {
            <option [value]="f.value" [selected]="f.value === draft().frequency">
              {{ f.label }}
            </option>
          }
        </select>
      </label>

      @if (repeats()) {
        <div class="rp__every">
          <span>Every</span>
          <input
            id="rp-interval"
            class="ar-field__input rp__n"
            type="number"
            min="1"
            max="52"
            aria-label="Repeat every"
            [value]="draft().interval"
            (input)="set({ interval: +$any($event.target).value })"
          />
          <span>{{ unit() }}</span>
        </div>

        @if (draft().frequency === Weekly) {
          <div class="rp__days" role="group" aria-label="On these days">
            @for (d of weekOrder; track d) {
              <button
                type="button"
                class="rp__day"
                [class.on]="draft().weekdays.includes(d)"
                [attr.aria-pressed]="draft().weekdays.includes(d)"
                (click)="toggleDay(d)"
              >
                {{ names[d] }}
              </button>
            }
          </div>
          <p class="rp__hint">No day ticked repeats on the same weekday as the first.</p>
        }

        <div class="rp__ends" role="radiogroup" aria-label="Ends">
          @if (!needsEnd()) {
            <label
              ><input
                type="radio"
                name="rp-ends"
                [checked]="draft().ends === 'never'"
                (change)="set({ ends: 'never' })"
              />
              Never</label
            >
          }
          <label class="rp__row">
            <input
              type="radio"
              name="rp-ends"
              [checked]="draft().ends === 'count'"
              (change)="set({ ends: 'count' })"
            />
            After
            <input
              id="rp-count"
              class="ar-field__input rp__n"
              type="number"
              min="1"
              max="260"
              aria-label="Number of times"
              [disabled]="draft().ends !== 'count'"
              [value]="draft().count"
              (input)="set({ count: +$any($event.target).value })"
            />
            times
          </label>
          <label class="rp__row">
            <input
              type="radio"
              name="rp-ends"
              [checked]="draft().ends === 'until'"
              (change)="set({ ends: 'until' })"
            />
            On
            <input
              id="rp-until"
              class="ar-field__input"
              type="date"
              aria-label="Last date"
              [disabled]="draft().ends !== 'until'"
              [value]="draft().until"
              (input)="set({ until: $any($event.target).value })"
            />
          </label>
        </div>

        @if (problem(); as p) {
          <p class="rp__err">{{ p }}</p>
        }
      }
    </div>
  `,
  styles: `
    .rp {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 10px;
    }
    .rp__every,
    .rp__row {
      display: flex;
      align-items: center;
      gap: 8px;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .rp__n {
      width: 72px;
    }
    .rp__days {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .rp__day {
      min-width: 40px;
      padding: 5px 8px;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: 999px;
      cursor: pointer;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-ink-600);
    }
    .rp__day.on {
      background: var(--ar-ink-900);
      color: var(--ar-white);
      border-color: var(--ar-ink-900);
    }
    .rp__day:focus-visible {
      outline: 2px solid var(--ar-amber-500);
      outline-offset: 2px;
    }
    .rp__hint {
      margin: 0;
      font: 400 11.5px var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
    .rp__ends {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .rp__ends > label {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .rp__err {
      margin: 0;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-red-600);
    }
  `,
})
export class ArRecurrencePicker {
  /** The choices. Two-way: `[(draft)]`. */
  readonly draft = model<RecurrenceDraft>({ ...NO_REPEAT });
  /** The series must say when it ends (meetings). */
  readonly needsEnd = input(false);

  protected readonly Weekly = RecurrenceFrequency.Weekly;
  protected readonly names = DAY_NAMES;
  protected readonly weekOrder = WEEK_ORDER;
  protected readonly frequencies = [
    { value: RecurrenceFrequency.None, label: 'Does not repeat' },
    { value: RecurrenceFrequency.Daily, label: 'Daily' },
    { value: RecurrenceFrequency.Weekly, label: 'Weekly' },
    { value: RecurrenceFrequency.Monthly, label: 'Monthly' },
  ];

  protected readonly repeats = computed(() => this.draft().frequency !== RecurrenceFrequency.None);
  protected readonly problem = computed(() => recurrenceProblem(this.draft(), this.needsEnd()));
  protected readonly unit = computed(() => {
    const n = this.draft().interval;
    const names: Record<number, string> = {
      [RecurrenceFrequency.Daily]: 'day',
      [RecurrenceFrequency.Weekly]: 'week',
      [RecurrenceFrequency.Monthly]: 'month',
    };
    const base = names[this.draft().frequency] ?? '';
    return n === 1 ? base : `${base}s`;
  });

  protected set(patch: Partial<RecurrenceDraft>): void {
    // A meeting series cannot go on for ever: choosing "never" is stepped back to a count.
    const next = { ...this.draft(), ...patch };
    if (this.needsEnd() && next.ends === 'never') next.ends = 'count';
    this.draft.set(next);
  }

  protected toggleDay(d: Weekday): void {
    const has = this.draft().weekdays.includes(d);
    this.set({
      weekdays: has ? this.draft().weekdays.filter((x) => x !== d) : [...this.draft().weekdays, d],
    });
  }
}
