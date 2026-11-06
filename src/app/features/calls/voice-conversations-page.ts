import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ArTopbar } from '../../layout/topbar';
import { AR_DIALOG_INLINE, ArButton } from '../../ui';
import { ArVoiceConversations } from './voice-conversations';

@Component({
  selector: 'ar-voice-conversations-page',
  imports: [ArTopbar, ArButton, ArVoiceConversations],
  providers: [{ provide: AR_DIALOG_INLINE, useValue: true }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="AI voice conversations"
      subtitle="Auditable WhatsApp call transcripts and audio records"
    >
      <button ar-button type="button" variant="ghost" (click)="back()">
        Back to WhatsApp calls
      </button>
    </ar-topbar>
    <div class="page-container ar-scroll">
      <ar-voice-conversations (closed)="back()" />
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 1.25rem 1.5rem 2rem;
        max-width: 1000px;
      }
    `,
  ],
})
export class ArVoiceConversationsPage {
  private readonly router = inject(Router);

  back(): void {
    void this.router.navigateByUrl('/calls/whatsapp');
  }
}
