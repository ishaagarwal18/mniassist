import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { InputEventArgs, TextBoxComponent } from '@syncfusion/ej2-angular-inputs';

import { registerSyncfusionLicense } from '../core/ui/syncfusion-license';
import { ensureSyncfusionTheme } from '../core/ui/syncfusion-theme';

/**
 * A Syncfusion text box (`ejs-textbox`) with a search icon and a clear button.
 * Two-way bindable as before: `[(query)]="term"`.
 */
@Component({
  selector: 'ar-search-box',
  imports: [TextBoxComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ejs-textbox
      #box
      cssClass="ar-search"
      type="search"
      [placeholder]="placeholder()"
      [value]="query()"
      [showClearButton]="true"
      [htmlAttributes]="{ 'aria-label': placeholder() }"
      (created)="box.addIcon('prepend', 'e-icons e-search')"
      (input)="onInput($event)"
      (change)="onInput($event)"
    />
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    :host ::ng-deep .e-input-group.ar-search {
      height: var(--ar-control-h);
      margin: 0;
      font: 400 12.5px var(--ar-font-sans);
    }
    :host ::ng-deep .e-input-group.ar-search input.e-input {
      height: 100%;
      min-height: 0;
      font: inherit;
    }
  `,
})
export class ArSearchBox {
  readonly placeholder = input('Search');
  /** Two-way bindable: [(query)]="term" */
  readonly query = model('');

  constructor() {
    registerSyncfusionLicense();
    ensureSyncfusionTheme();
  }

  protected onInput(args: InputEventArgs | { value?: string | null }): void {
    const value = args.value ?? '';
    if (value !== this.query()) this.query.set(value);
  }
}
