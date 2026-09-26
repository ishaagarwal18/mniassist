import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ArIcon } from './icon';

/** A read-optimised form row. Mockup screens are largely display state, so the
 *  control renders its resolved value; wire a real control into the projected
 *  slot when the screen becomes editable. */
@Component({
  selector: 'ar-field',
  imports: [ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="ar-field__label" [attr.for]="controlId()">{{ label() }}</label>
    <div class="ar-field__control" [id]="controlId()">
      <span class="ar-field__value" [class.ar-field__value--empty]="!value()">
        {{ value() || placeholder() }}
      </span>
      <ng-content select="[field-affix]" />
      @if (chevron()) {
        <ar-icon name="chevdown" [size]="15" class="ar-field__chev" />
      }
    </div>
    @if (hint()) {
      <span class="ar-field__hint">{{ hint() }}</span>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .ar-field__label {
      font: 500 11.5px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .ar-field__control {
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 0 11px;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-300);
      border-radius: var(--ar-radius-control);
    }
    .ar-field__value {
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .ar-field__value--empty {
      color: var(--ar-ink-400);
    }
    .ar-field__chev {
      color: var(--ar-ink-400);
    }
    .ar-field__hint {
      font: 400 11px var(--ar-font-sans);
      color: var(--ar-ink-400);
      line-height: 1.4;
    }
  `,
})
export class ArField {
  readonly label = input.required<string>();
  readonly value = input<string | null>(null);
  readonly placeholder = input('Select…');
  readonly hint = input<string | null>(null);
  readonly chevron = input(true);
  readonly controlId = input<string>(`ar-field-${Math.random().toString(36).slice(2, 8)}`);
}
