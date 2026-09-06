import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ChannelService as ChannelApi } from '../../proxy/channels';
import { OnboardingStep } from '../../proxy/channels/onboarding-step.enum';
import { ArButton, ArDialog } from '../../ui';

const STEP_LABEL: Record<OnboardingStep, string> = {
  [OnboardingStep.FacebookLogin]: 'Sign in with Facebook',
  [OnboardingStep.WabaCreated]: 'Create the WhatsApp Business Account',
  [OnboardingStep.NumberVerified]: 'Verify the phone number',
  [OnboardingStep.AccessGranted]: 'Grant AutoReach access',
  [OnboardingStep.WebhooksSubscribed]: 'Subscribe to webhooks',
  [OnboardingStep.NumberRegistered]: 'Register the number on the Cloud API',
  [OnboardingStep.MetadataRead]: 'Read the number metadata',
  [OnboardingStep.StarterTemplatesSubmitted]: 'Submit the starter templates',
};

/**
 * The "connect a number" entry point. The number, the business account and the
 * verification all live with Meta, so this cannot complete the job in one dialog —
 * it starts (or resumes) the onboarding record and hands off to Meta's embedded
 * signup, then the get-started checklist tracks the rest.
 */
@Component({
  selector: 'ar-connect-number-dialog',
  imports: [RouterLink, ArDialog, ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog title="Connect a WhatsApp number" (dismiss)="close.emit()">
      <p class="cn__p">
        Connecting a number runs Meta's embedded signup: you sign in with the Facebook account that
        owns the business, pick or add the phone number, and grant AutoReach permission to send on
        it. It opens in a Meta window.
      </p>

      @if (session(); as s) {
        <p class="cn__status">
          Onboarding {{ s.completed ? 'complete' : 'in progress' }} — next:
          <strong>{{ s.nextLabel }}</strong>
        </p>
        @if (s.error) {
          <p class="cn__err">{{ s.error }}</p>
        }
      }

      <div dialogActions>
        <button ar-button type="button" variant="ghost" (click)="close.emit()">Close</button>
        <a ar-button-link routerLink="/getting-started" (click)="close.emit()"
          >Open the checklist</a
        >
        <button ar-button type="button" variant="primary" [disabled]="busy()" (click)="start()">
          {{ busy() ? 'Starting…' : session() ? 'Resume setup' : 'Start setup' }}
        </button>
      </div>
    </ar-dialog>
  `,
  styles: `
    .cn__p {
      margin: 0;
      font: 400 13px/1.6 var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .cn__status {
      margin: 0;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .cn__err {
      margin: 0;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-warn-600);
    }
    a[ar-button-link] {
      display: inline-flex;
      align-items: center;
      height: var(--ar-control-h);
      padding: 0 13px;
      border: 1px solid var(--ar-line-300);
      border-radius: var(--ar-radius-control);
      font: 500 13px var(--ar-font-sans);
      color: var(--ar-ink-700);
      text-decoration: none;
    }
  `,
})
export class ArConnectNumberDialog {
  private readonly api = inject(ChannelApi);

  readonly close = output<void>();

  protected readonly busy = signal(false);
  protected readonly session = signal<{
    completed: boolean;
    nextLabel: string;
    error?: string;
  } | null>(null);

  protected async start(): Promise<void> {
    if (environment.useMockData) {
      this.session.set({ completed: false, nextLabel: STEP_LABEL[OnboardingStep.WabaCreated] });
      window.alert('Embedded signup opens a Meta window — not available in the mock build.');
      return;
    }
    this.busy.set(true);
    try {
      const dto = await firstValueFrom(this.api.getOrStartOnboarding());
      this.session.set({
        completed: dto.completedAtUtc != null,
        nextLabel: dto.nextStep != null ? STEP_LABEL[dto.nextStep] : '—',
        error: dto.lastError ?? undefined,
      });
    } finally {
      this.busy.set(false);
    }
  }
}
