import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ArTopbar } from '../../layout/topbar';
import { AR_DIALOG_INLINE, ArButton } from '../../ui';
import { ArWhatsAppIvrDialog } from './whatsapp-ivr-dialog';

@Component({
  selector: 'ar-whatsapp-ivr-page',
  imports: [ArTopbar, ArButton, ArWhatsAppIvrDialog],
  providers: [{ provide: AR_DIALOG_INLINE, useValue: true }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      help="The keypad menu WhatsApp callers hear, and the person, team, agent or message each key sends them to."
      title="WhatsApp call menu (IVR)"
      subtitle="Interactive voice response flows for inbound callers on WhatsApp"
    >
      <button ar-button type="button" variant="ghost" (click)="back()">
        Back to WhatsApp calls
      </button>
    </ar-topbar>
    <div class="page-container ar-scroll">
      <ar-whatsapp-ivr-dialog (closed)="back()" />
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 1.25rem 1.5rem 2rem;
        max-width: 900px;
      }
    `,
  ],
})
export class ArWhatsAppIvrPage {
  private readonly router = inject(Router);

  back(): void {
    void this.router.navigateByUrl('/calls/whatsapp');
  }
}
