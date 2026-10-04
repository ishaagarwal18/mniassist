import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { SelectEventArgs, TabAllModule } from '@syncfusion/ej2-angular-navigations';

import { registerSyncfusionLicense } from '../core/ui/syncfusion-license';
import { ensureSyncfusionTheme } from '../core/ui/syncfusion-theme';

/**
 * A Syncfusion tab strip (`ejs-tab`) used as headers only: the screen shows the
 * panel for the active tab itself. Keyboard navigation, overflow scrolling and
 * the ARIA tab pattern come from Syncfusion. Same API as before:
 * `[tabs]` and two-way `[(active)]`.
 */
@Component({
  selector: 'ar-tabs',
  imports: [TabAllModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ejs-tab
      cssClass="ar-tabs"
      heightAdjustMode="None"
      overflowMode="Scrollable"
      [selectedItem]="selectedIndex()"
      (selected)="onSelected($event)"
    >
      <e-tabitems>
        @for (t of tabs(); track t) {
          <e-tabitem [header]="{ text: t }" content=" " />
        }
      </e-tabitems>
    </ejs-tab>
  `,
  styles: `
    :host {
      display: block;
    }
    :host ::ng-deep .e-tab.ar-tabs > .e-content {
      display: none;
    }
    :host ::ng-deep .e-tab.ar-tabs .e-tab-header .e-tab-text {
      font: 500 12.5px var(--ar-font-sans);
      text-transform: none;
    }
  `,
})
export class ArTabs {
  readonly tabs = input.required<readonly string[]>();
  readonly active = model.required<string>();

  protected readonly selectedIndex = computed(() =>
    Math.max(0, this.tabs().indexOf(this.active())),
  );

  constructor() {
    registerSyncfusionLicense();
    ensureSyncfusionTheme();
  }

  protected onSelected(args: SelectEventArgs): void {
    const tab = this.tabs()[args.selectedIndex];
    if (tab !== undefined && tab !== this.active()) this.active.set(tab);
  }
}
