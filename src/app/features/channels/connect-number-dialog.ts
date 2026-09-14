import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ChannelService as ChannelApi } from '../../proxy/channels';
import { OnboardingStep } from '../../proxy/channels/onboarding-step.enum';
import { GupshupOnboardingStep } from '../../proxy/channels/gupshup-onboarding-step.enum';
import type { SolutionPartnerOnboardingSessionDto } from '../../proxy/channels/models';
import { ArButton, ArDialog, ArTabs } from '../../ui';

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

const GUPSHUP_STEP_LABEL: Record<GupshupOnboardingStep, string> = {
  [GupshupOnboardingStep.AppCreated]: 'Create the Gupshup app',
  [GupshupOnboardingStep.CallbackConfigured]: 'Configure the webhook callback',
  [GupshupOnboardingStep.EmbedLinkIssued]: 'Get your signup link',
  [GupshupOnboardingStep.TenantLinked]: 'Complete WhatsApp signup on Gupshup',
  [GupshupOnboardingStep.AppTokenObtained]: 'Fetch the app access token',
  [GupshupOnboardingStep.ChannelSeeded]: 'Activate the channel',
};

const PROVIDER_LABELS: readonly string[] = ['Meta (direct)', 'Gupshup (Solution Partner)'];

/**
 * The "connect a number" entry point. Two routes onto the same WhatsAppChannel record
 * (spec §4.2, decision D-01): Meta's own embedded signup, or Gupshup as a Solution
 * Partner fallback for a tenant that doesn't want to hold its own Meta business
 * verification. Neither route can complete in one dialog — both hand off to a hosted
 * signup flow and resume from a session record afterward.
 */
@Component({
  selector: 'ar-connect-number-dialog',
  imports: [RouterLink, ArDialog, ArButton, ArTabs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog title="Connect a WhatsApp number" (dismiss)="close.emit()">
      <ar-tabs [tabs]="providerTabs" [active]="provider()" (activeChange)="provider.set($event)" />

      @if (provider() === providerTabs[0]) {
        <p class="cn__p">
          Connecting a number runs Meta's embedded signup: you sign in with the Facebook account
          that owns the business, pick or add the phone number, and grant AutoReach permission to
          send on it. It opens in a Meta window.
        </p>

        @if (metaSession(); as s) {
          <p class="cn__status">
            Onboarding {{ s.completed ? 'complete' : 'in progress' }} — next:
            <strong>{{ s.nextLabel }}</strong>
          </p>
          @if (s.error) {
            <p class="cn__err">{{ s.error }}</p>
          }
        }
      } @else {
        <p class="cn__p">
          Gupshup is a WhatsApp Business Solution Partner — a route for a tenant who'd rather not
          hold its own Meta business verification. You'll be sent to a Gupshup-hosted page to
          complete WhatsApp's signup on our partner account's behalf; the link stays valid for
          five days.
        </p>

        @if (gupshupSession(); as s) {
          <p class="cn__status">
            Onboarding {{ s.completed ? 'complete' : 'in progress' }} — next:
            <strong>{{ s.nextLabel }}</strong>
          </p>
          @if (s.error) {
            <p class="cn__err">{{ s.error }}</p>
          }
          @if (s.embedLink && !s.completed) {
            <p class="cn__link">
              <button ar-button type="button" variant="ghost" (click)="openEmbedLink(s.embedLink)">
                Open Gupshup signup ↗
              </button>
            </p>
          }
        }
      }

      <div dialogActions>
        <button ar-button type="button" variant="ghost" (click)="close.emit()">Close</button>
        @if (provider() === providerTabs[0]) {
          <a ar-button-link routerLink="/getting-started" (click)="close.emit()"
            >Open the checklist</a
          >
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="metaBusy()"
            (click)="startMeta()"
          >
            {{ metaBusy() ? 'Starting…' : metaSession() ? 'Resume setup' : 'Start setup' }}
          </button>
        } @else if (gupshupSession() && !gupshupSession()!.completed) {
          <button
            ar-button
            type="button"
            variant="ghost"
            [disabled]="gupshupBusy()"
            (click)="regenerateGupshupLink()"
          >
            Link expired — get a new one
          </button>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="gupshupBusy()"
            (click)="checkGupshupStatus()"
          >
            {{ gupshupBusy() ? 'Checking…' : "I've finished on Gupshup — check status" }}
          </button>
        } @else {
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="gupshupBusy()"
            (click)="startGupshup()"
          >
            {{ gupshupBusy() ? 'Starting…' : gupshupSession() ? 'Resume setup' : 'Start setup' }}
          </button>
        }
      </div>
    </ar-dialog>
  `,
  styles: `
    .cn__p {
      margin: 0 0 12px;
      font: 400 13px/1.6 var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    ar-tabs {
      margin-bottom: 12px;
    }
    .cn__status {
      margin: 0;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .cn__err {
      margin: 6px 0 0;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-warn-600);
    }
    .cn__link {
      margin: 10px 0 0;
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

  protected readonly providerTabs = PROVIDER_LABELS;
  protected readonly provider = signal<string>(PROVIDER_LABELS[0]);

  // ---- Meta embedded signup ------------------------------------------------

  protected readonly metaBusy = signal(false);
  protected readonly metaSession = signal<{
    completed: boolean;
    nextLabel: string;
    error?: string;
  } | null>(null);

  protected async startMeta(): Promise<void> {
    if (environment.useMockData) {
      this.metaSession.set({
        completed: false,
        nextLabel: STEP_LABEL[OnboardingStep.WabaCreated],
      });
      window.alert('Embedded signup opens a Meta window — not available in the mock build.');
      return;
    }
    this.metaBusy.set(true);
    try {
      const dto = await firstValueFrom(this.api.getOrStartOnboarding());
      this.metaSession.set({
        completed: dto.completedAtUtc != null,
        nextLabel: dto.nextStep != null ? STEP_LABEL[dto.nextStep] : '—',
        error: dto.lastError ?? undefined,
      });
    } finally {
      this.metaBusy.set(false);
    }
  }

  // ---- Gupshup Solution Partner onboarding ---------------------------------

  protected readonly gupshupBusy = signal(false);
  protected readonly gupshupSession = signal<{
    id: string;
    completed: boolean;
    nextLabel: string;
    embedLink?: string | null;
    error?: string;
  } | null>(null);

  protected async startGupshup(): Promise<void> {
    if (environment.useMockData) {
      this.gupshupSession.set({
        id: 'mock-session',
        completed: false,
        nextLabel: GUPSHUP_STEP_LABEL[GupshupOnboardingStep.EmbedLinkIssued],
        embedLink: null,
      });
      window.alert('Gupshup signup opens a hosted page — not available in the mock build.');
      return;
    }
    this.gupshupBusy.set(true);
    try {
      const dto = await firstValueFrom(this.api.getOrStartSolutionPartnerOnboarding());
      this.applyGupshupSession(dto);
    } finally {
      this.gupshupBusy.set(false);
    }
  }

  protected openEmbedLink(link: string): void {
    window.open(link, '_blank', 'noopener,noreferrer,width=600,height=760');
  }

  protected async checkGupshupStatus(): Promise<void> {
    const session = this.gupshupSession();
    if (!session) return;

    this.gupshupBusy.set(true);
    try {
      const dto = await firstValueFrom(this.api.completeSolutionPartnerOnboarding(session.id));
      this.applyGupshupSession(dto);
    } finally {
      this.gupshupBusy.set(false);
    }
  }

  protected async regenerateGupshupLink(): Promise<void> {
    const session = this.gupshupSession();
    if (!session) return;

    this.gupshupBusy.set(true);
    try {
      const dto = await firstValueFrom(
        this.api.regenerateSolutionPartnerEmbedLink(session.id, { regenerate: true }),
      );
      this.applyGupshupSession(dto);
    } finally {
      this.gupshupBusy.set(false);
    }
  }

  private applyGupshupSession(dto: SolutionPartnerOnboardingSessionDto): void {
    if (!dto.id) return;
    this.gupshupSession.set({
      id: dto.id,
      completed: dto.completedAtUtc != null,
      nextLabel: dto.nextStep != null ? GUPSHUP_STEP_LABEL[dto.nextStep] : '—',
      embedLink: dto.embedLink,
      error: dto.lastError ?? undefined,
    });
  }
}
