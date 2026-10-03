import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * A modal shell: scrim, a centred panel, a titled header with a close control, a
 * content slot and a footer slot for the actions. Deliberately unopinionated about
 * what goes inside — every "New…" flow in the app is a short form, and they differ
 * enough that a generic form builder would fit none of them well.
 *
 * The host owns visibility (`@if (open())`), so there is no `open` input; this
 * component assumes it is only in the DOM when it should be shown.
 */
@Component({
  selector: 'ar-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dlg__scrim" (click)="dismiss.emit()"></div>
    <div class="dlg" role="dialog" aria-modal="true" [attr.aria-label]="title()">
      <header class="dlg__head">
        <h2 class="dlg__title">{{ title() }}</h2>
        <button type="button" class="dlg__x" aria-label="Close" (click)="dismiss.emit()">×</button>
      </header>
      <div class="dlg__body"><ng-content /></div>
      <footer class="dlg__foot"><ng-content select="[dialogActions]" /></footer>
    </div>
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 50;
      display: grid;
      place-items: center;
    }
    .dlg__scrim {
      position: absolute;
      inset: 0;
      background: var(--ar-backdrop);
    }
    .dlg {
      position: relative;
      width: min(460px, calc(100vw - 32px));
      max-height: calc(100vh - 64px);
      display: flex;
      flex-direction: column;
      background: var(--ar-white);
      border-radius: var(--ar-radius-modal);
      box-shadow: var(--ar-shadow-pop);
    }
    .dlg__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 16px 20px;
      border-bottom: 1px solid var(--ar-line-200);
    }
    .dlg__title {
      margin: 0;
      font: 600 15px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .dlg__x {
      background: none;
      border: 0;
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
      color: var(--ar-ink-400);
    }
    .dlg__body {
      padding: 18px 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .dlg__foot {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 14px 20px;
      border-top: 1px solid var(--ar-line-200);
    }
  `,
})
export class ArDialog {
  readonly title = input.required<string>();
  readonly dismiss = output<void>();
}
