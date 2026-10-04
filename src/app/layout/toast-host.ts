import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastComponent, ToastModule } from '@syncfusion/ej2-angular-notifications';

import { registerSyncfusionLicense } from '../core/ui/syncfusion-license';
import { ensureSyncfusionTheme } from '../core/ui/syncfusion-theme';
import { ToastMessage, ToastService, ToastTone } from '../core/ui/toast.service';

const ICON: Record<ToastTone, string> = {
  success: 'e-check',
  error: 'e-circle-close',
  warning: 'e-warning',
  info: 'e-circle-info',
};

/** Errors stay longer: they usually need reading, and sometimes acting on. */
const TIMEOUT: Record<ToastTone, number> = {
  success: 3500,
  info: 4500,
  warning: 6000,
  error: 8000,
};

const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

/** The app's one toast stack (Syncfusion Toast), top right, fed by ToastService. */
@Component({
  selector: 'ar-toast-host',
  imports: [ToastModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Out of the shell's layout: the stack floats over the window's top-right corner.
  styles: `
    :host {
      position: fixed;
      top: 0;
      right: 0;
      width: 0;
      height: 0;
    }
  `,
  template: `
    <ejs-toast
      #toast
      id="ar-toasts"
      cssClass="ar-toast"
      width="360px"
      [position]="{ X: 'Right', Y: 'Top' }"
      [newestOnTop]="true"
      [showCloseButton]="true"
      [showProgressBar]="true"
      [enableHtmlSanitizer]="true"
      [animation]="{
        show: { effect: 'FadeIn', duration: 200 },
        hide: { effect: 'FadeOut', duration: 200 },
      }"
    />
  `,
})
export class ArToastHost {
  private readonly toast = viewChild<ToastComponent>('toast');
  private readonly pending: ToastMessage[] = [];
  private ready = false;

  constructor() {
    registerSyncfusionLicense();
    ensureSyncfusionTheme();
    inject(ToastService)
      .messages$.pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((m) => (this.ready ? this.render(m) : this.pending.push(m)));
    afterNextRender(() => {
      this.ready = true;
      this.pending.splice(0).forEach((m) => this.render(m));
    });
  }

  private render(m: ToastMessage): void {
    this.toast()?.show({
      title: escape(m.title),
      content: escape(m.content).replace(/\n/g, '<br>'),
      cssClass: `ar-toast--${m.tone}`,
      icon: `e-icons ${ICON[m.tone]}`,
      timeOut: TIMEOUT[m.tone],
    });
  }
}
