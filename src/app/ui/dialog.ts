import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { BeforeCloseEventArgs, DialogComponent } from '@syncfusion/ej2-angular-popups';

import { registerSyncfusionLicense } from '../core/ui/syncfusion-license';
import { ensureSyncfusionTheme } from '../core/ui/syncfusion-theme';

/**
 * A modal Syncfusion dialog (`ejs-dialog`): overlay, centred panel, titled header
 * with a close control, a content slot and a footer slot for the actions.
 * Deliberately unopinionated about what goes inside — every "New…" flow in the
 * app is a short form, and they differ enough that a generic form builder would
 * fit none of them well.
 *
 * The host owns visibility (`@if (open())`), so there is no `open` input; this
 * component assumes it is only in the DOM when it should be shown. Syncfusion's
 * dialog would close itself on ×, Esc or an overlay click; here those only
 * *ask* (`dismiss`), and the host decides — so a screen can keep a dialog open
 * while it saves, exactly as before. Visual overrides live in styles.scss
 * (`.ar-dialog`), because Syncfusion moves the dialog to the end of <body>.
 */
@Component({
  selector: 'ar-dialog',
  imports: [DialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ejs-dialog
      cssClass="ar-dialog"
      [visible]="true"
      [isModal]="true"
      [showCloseIcon]="true"
      [closeOnEscape]="true"
      [header]="title()"
      width="min(460px, calc(100vw - 32px))"
      [animationSettings]="{ effect: 'Fade', duration: 150 }"
      (beforeClose)="onBeforeClose($event)"
      (overlayClick)="dismiss.emit()"
    >
      <ng-template #content>
        <div class="dlg__body"><ng-content /></div>
      </ng-template>
      <ng-template #footerTemplate>
        <div class="dlg__foot"><ng-content select="[dialogActions]" /></div>
      </ng-template>
    </ejs-dialog>
  `,
  styles: `
    :host {
      display: contents;
    }
    .dlg__body {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .dlg__foot {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
  `,
})
export class ArDialog {
  readonly title = input.required<string>();
  readonly dismiss = output<void>();

  constructor() {
    registerSyncfusionLicense();
    ensureSyncfusionTheme();
  }

  /** Close requests (× or Esc) become a dismiss request; the host decides. */
  protected onBeforeClose(args: BeforeCloseEventArgs): void {
    args.cancel = true;
    this.dismiss.emit();
  }
}
