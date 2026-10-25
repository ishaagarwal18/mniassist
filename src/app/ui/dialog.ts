import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  afterEveryRender,
  input,
  output,
  viewChild,
} from '@angular/core';
import { BeforeCloseEventArgs, DialogComponent } from '@syncfusion/ej2-angular-popups';

import { registerSyncfusionLicense } from '../core/ui/syncfusion-license';
import { ensureSyncfusionTheme } from '../core/ui/syncfusion-theme';
import { isSubmitClick, recheckMarked, validateWithin } from './form-validation';

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
 *
 * Every dialog can be moved by its header, and checks its fields before its main
 * (primary or danger) button runs: `required`, `type="email"`, `min`/`max` and
 * the rest are enforced with a message under each field (see form-validation.ts).
 * `[data-autofocus]` picks the field that gets focus on open; otherwise the first.
 */
@Component({
  selector: 'ar-dialog',
  imports: [DialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ejs-dialog
      #dlg
      [cssClass]="cssClass()"
      [visible]="true"
      [isModal]="true"
      [showCloseIcon]="true"
      [closeOnEscape]="true"
      [header]="title()"
      [allowDragging]="true"
      [width]="width()"
      (open)="onOpen()"
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
export class ArDialog implements OnDestroy {
  readonly title = input.required<string>();
  readonly cssClass = input('ar-dialog');
  /** Wider dialogs (tables, two-column forms) pass e.g. "min(640px, calc(100vw - 32px))". */
  readonly width = input('min(460px, calc(100vw - 32px))');
  readonly dismiss = output<void>();

  private readonly dialog = viewChild<DialogComponent>('dlg');
  private panel: HTMLElement | null = null;
  private readonly onClick = (e: Event) => {
    const body = this.panel?.querySelector('.dlg__body');
    if (body && isSubmitClick(e.target, true) && !validateWithin(body)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  };

  constructor() {
    registerSyncfusionLicense();
    ensureSyncfusionTheme();
    afterEveryRender(() => {
      const body = this.panel?.querySelector('.dlg__body');
      if (body) recheckMarked(body);
    });
  }

  ngOnDestroy(): void {
    this.panel?.removeEventListener('click', this.onClick, true);
  }

  /** Checks run before any handler on the footer buttons; focus goes to the first field. */
  protected onOpen(): void {
    this.panel = (this.dialog()?.element as HTMLElement | undefined) ?? null;
    if (!this.panel) return;
    this.panel.addEventListener('click', this.onClick, true);
    const target =
      this.panel.querySelector<HTMLElement>('[data-autofocus]') ??
      this.panel.querySelector<HTMLElement>(
        '.dlg__body input:not([type=hidden]):not([disabled]), .dlg__body textarea:not([disabled])',
      );
    setTimeout(() => target?.focus(), 0);
  }

  /** Close requests (× or Esc) become a dismiss request; the host decides. */
  protected onBeforeClose(args: BeforeCloseEventArgs): void {
    args.cancel = true;
    this.dismiss.emit();
  }
}
