import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ArTopbar } from '../../layout/topbar';
import { AR_DIALOG_INLINE, ArButton } from '../../ui';
import { ArVoiceAgentDialog } from '../channels/voice-agent-dialog';

@Component({
  selector: 'ar-voice-agent-editor-page',
  imports: [ArTopbar, ArButton, ArVoiceAgentDialog],
  providers: [{ provide: AR_DIALOG_INLINE, useValue: true }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      help="Build an AI voice agent: what it says and knows, its voice, the actions it can take and what is noted after each call. Test it, then publish."
      title="Voice Agent Studio" subtitle="Configure AI persona, tools, prompt and behaviors">
      <button ar-button type="button" variant="ghost" (click)="back()">Back to Voice Agents</button>
    </ar-topbar>
    <div class="page-container ar-scroll">
      @if (agentId(); as id) {
        <ar-voice-agent-dialog [channelId]="id" (close)="back()" />
      }
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 1.25rem 1.5rem 2rem;
        max-width: 1080px;
      }
    `,
  ],
})
export class ArVoiceAgentEditorPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly agentId = () => this.route.snapshot.paramMap.get('id');

  back(): void {
    void this.router.navigateByUrl('/calls/ai-agents');
  }
}
