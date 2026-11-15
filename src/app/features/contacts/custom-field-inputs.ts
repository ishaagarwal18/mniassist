import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { CustomFieldDefinitionDto, CustomFieldType } from '../../proxy/contacts';
import { optionsOf, splitMulti, toggleMulti } from './custom-field-values';

/**
 * The workspace's custom fields as form inputs, one per field in its own order. The parent keeps the values
 * (keyed by field key) and the problems; this only draws them and reports each change.
 */
@Component({
  selector: 'ar-custom-field-inputs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (f of fields(); track f.id) {
      @let key = f.key ?? '';
      @let id = idPrefix() + '-' + key;
      @let problem = problems()[key];
      <div class="ar-field cf">
        @if (f.type === T.Boolean) {
          <span class="ar-field__label" [id]="id + '-label'">
            {{ f.label }}
            @if (!f.isRequired) {
              <span class="ar-field__opt">optional</span>
            }
          </span>
          <select
            class="ar-field__input"
            [id]="id"
            [attr.aria-labelledby]="id + '-label'"
            [attr.aria-invalid]="problem ? 'true' : null"
            [attr.aria-describedby]="problem ? id + '-error' : null"
            [value]="valueOf(key)"
            (change)="set(key, $any($event.target).value)"
          >
            <option value="">—</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        } @else if (f.type === T.MultiSelect) {
          <fieldset class="cf__set" [attr.aria-describedby]="problem ? id + '-error' : null">
            <legend class="ar-field__label">
              {{ f.label }}
              @if (!f.isRequired) {
                <span class="ar-field__opt">optional</span>
              }
            </legend>
            <div class="cf__options">
              @for (o of options(f); track o) {
                <label class="cf__option">
                  <input
                    type="checkbox"
                    [checked]="chosen(key, o)"
                    (change)="set(key, toggle(f, key, o))"
                  />
                  {{ o }}
                </label>
              }
            </div>
          </fieldset>
        } @else {
          <label class="ar-field__label" [for]="id">
            {{ f.label }}
            @if (!f.isRequired) {
              <span class="ar-field__opt">optional</span>
            }
          </label>
          @if (f.type === T.SingleSelect) {
            <select
              class="ar-field__input"
              [id]="id"
              [attr.aria-invalid]="problem ? 'true' : null"
              [attr.aria-describedby]="problem ? id + '-error' : null"
              [value]="valueOf(key)"
              (change)="set(key, $any($event.target).value)"
            >
              <option value="">—</option>
              @for (o of options(f); track o) {
                <option [value]="o">{{ o }}</option>
              }
            </select>
          } @else {
            <input
              class="ar-field__input"
              [id]="id"
              [type]="f.type === T.Date ? 'date' : 'text'"
              [attr.inputmode]="f.type === T.Number ? 'decimal' : null"
              [attr.aria-invalid]="problem ? 'true' : null"
              [attr.aria-describedby]="problem ? id + '-error' : null"
              [value]="valueOf(key)"
              (input)="set(key, $any($event.target).value)"
            />
          }
        }
        @if (f.helpText) {
          <span class="ar-field__hint">{{ f.helpText }}</span>
        }
        @if (problem) {
          <span class="ar-field__error" [id]="id + '-error'">{{ problem }}</span>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: contents;
    }
    .cf__set {
      margin: 0;
      padding: 0;
      border: 0;
      min-width: 0;
    }
    .cf__options {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 14px;
      padding-top: 4px;
    }
    .cf__option {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
  `,
})
export class ArCustomFieldInputs {
  readonly fields = input.required<readonly CustomFieldDefinitionDto[]>();
  readonly values = input.required<Record<string, string>>();
  readonly problems = input<Record<string, string>>({});
  /** Keeps input ids unique when two forms are on one page. */
  readonly idPrefix = input('cf');
  readonly valueChange = output<{ key: string; value: string }>();

  protected readonly T = CustomFieldType;
  protected readonly options = optionsOf;

  protected valueOf(key: string): string {
    return (this.values() as Partial<Record<string, string>>)[key] ?? '';
  }
  protected chosen(key: string, option: string): boolean {
    return splitMulti(this.values()[key]).includes(option);
  }
  protected toggle(field: CustomFieldDefinitionDto, key: string, option: string): string {
    return toggleMulti(field, this.values()[key], option);
  }
  protected set(key: string, value: string): void {
    this.valueChange.emit({ key, value });
  }
}
