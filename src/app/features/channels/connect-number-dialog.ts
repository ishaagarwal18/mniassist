import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ChannelService as ChannelApi } from '../../proxy/channels';
import { OnboardingStep } from '../../proxy/channels/onboarding-step.enum';
import { GupshupOnboardingStep } from '../../proxy/channels/gupshup-onboarding-step.enum';
import type {
  OnboardingSessionDto,
  SolutionPartnerOnboardingSessionDto,
} from '../../proxy/channels/models';
import { ArButton, ArDialog, ArTabs } from '../../ui';
import { ToastService } from '../../core/ui/toast.service';
import { ChannelService as ChannelStore } from '../../core/services/channel.service';
import {
  type EmbeddedSignupFinish,
  loadFacebookSdk,
  openEmbeddedSignup,
  parseEmbeddedSignupMessage,
} from './facebook-sdk';

const STEP_LABEL: Record<OnboardingStep, string> = {
  [OnboardingStep.FacebookLogin]: 'Sign in with Facebook',
  [OnboardingStep.WabaCreated]: 'Create the WhatsApp Business Account',
  [OnboardingStep.NumberVerified]: 'Verify the phone number',
  [OnboardingStep.AccessGranted]: 'Grant MNI Assist access',
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
          that owns the business, pick or add the phone number, and grant MNI Assist permission to
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
          @if (!s.completed && !s.signup) {
            <p class="cn__err">
              Meta signup isn't configured on this platform yet (the Meta app or its Embedded Signup
              configuration is missing). Ask the platform administrator.
            </p>
          }
          @if (!s.completed && s.signup) {
            <label class="cn__field">
              <span>Two-step verification PIN</span>
              <input
                class="ar-field__input cn__pin"
                name="twoStepPin"
                type="password"
                inputmode="numeric"
                autocomplete="off"
                maxlength="6"
                [value]="pin()"
                (input)="pin.set($any($event.target).value)"
              />
              <small>
                Six digits. If the number already has a two-step PIN, enter that one; otherwise
                choose one and keep it safe — WhatsApp asks for it when the number moves.
              </small>
            </label>
          }
        }
      } @else {
        <p class="cn__p">
          Gupshup is a WhatsApp Business Solution Partner — a route for a tenant who'd rather not
          hold its own Meta business verification. You'll be sent to a Gupshup-hosted page to
          complete WhatsApp's signup on our partner account's behalf; the link stays valid for five
          days.
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
          @if (metaSession(); as s) {
            @if (!s.completed && s.signup) {
              <button
                ar-button
                type="button"
                variant="primary"
                [disabled]="metaBusy() || !pinValid()"
                (click)="signupWithFacebook()"
              >
                {{ metaBusy() ? metaBusyLabel() : 'Continue with Facebook' }}
              </button>
            }
          } @else {
            <button
              ar-button
              type="button"
              variant="primary"
              [disabled]="metaBusy()"
              (click)="startMeta()"
            >
              {{ metaBusy() ? 'Starting…' : 'Start setup' }}
            </button>
          }
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
    .cn__field {
      display: grid;
      gap: 4px;
      margin: 12px 0 0;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .cn__field small {
      font: 400 12px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .cn__pin {
      max-width: 160px;
      letter-spacing: 0.3em;
      font-variant-numeric: tabular-nums;
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
  private readonly toasts = inject(ToastService);
  private readonly api = inject(ChannelApi);
  private readonly channels = inject(ChannelStore);

  constructor() {
    // The signup popup reports the WABA and number it set up by postMessage, separately from
    // the OAuth code FB.login hands back.
    const onMessage = (event: MessageEvent) => {
      const parsed = parseEmbeddedSignupMessage(event);
      if (!parsed) return;
      if (parsed.kind === 'finish') {
        this.signupFinish = parsed.data;
        this.finishWaiter?.(parsed.data);
      } else if (parsed.kind === 'cancel') {
        this.signupCancelled = parsed.step ?? 'cancelled';
      } else {
        this.signupError = parsed.message ?? 'Meta reported an error during signup.';
      }
    };
    window.addEventListener('message', onMessage);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('message', onMessage));
  }

  readonly close = output<void>();

  protected readonly providerTabs = PROVIDER_LABELS;
  protected readonly provider = signal<string>(PROVIDER_LABELS[0]);

  // ---- Meta embedded signup ------------------------------------------------

  protected readonly metaBusy = signal(false);
  protected readonly metaBusyLabel = signal('Working…');
  protected readonly metaSession = signal<{
    id?: string;
    completed: boolean;
    nextLabel: string;
    error?: string;
    /** Present when the platform has a Meta app and Embedded Signup configuration. */
    signup?: { appId: string; configId: string; graphVersion: string };
  } | null>(null);
  protected readonly pin = signal('');
  protected readonly pinValid = computed(() => /^[0-9]{6}$/.test(this.pin()));

  private signupFinish: EmbeddedSignupFinish | null = null;
  private signupCancelled: string | null = null;
  private signupError: string | null = null;
  private finishWaiter: ((d: EmbeddedSignupFinish) => void) | null = null;

  protected async startMeta(): Promise<void> {
    if (environment.useMockData) {
      this.metaSession.set({
        completed: false,
        nextLabel: STEP_LABEL[OnboardingStep.WabaCreated],
      });
      this.toasts.warning(
        'Embedded signup opens a Meta window — not available in the mock build.',
        'Connect a number',
      );
      return;
    }
    this.metaBusy.set(true);
    try {
      const dto = await firstValueFrom(this.api.getOrStartOnboarding());
      this.applyMetaSession(dto);
      const signup = this.metaSession()?.signup;
      // Loaded now so the click on "Continue with Facebook" can open the popup straight away.
      if (signup && dto.completedAtUtc == null) {
        await loadFacebookSdk(signup.appId, signup.graphVersion);
      }
    } catch (e) {
      this.setMetaError(e, 'Meta signup could not start. Check your connection and try again.');
    } finally {
      this.metaBusy.set(false);
    }
  }

  /** Opens Meta's popup (must run straight from the click), then finishes the setup server-side. */
  protected async signupWithFacebook(): Promise<void> {
    const session = this.metaSession();
    if (!session?.id || !session.signup || !this.pinValid()) return;

    this.signupFinish = null;
    this.signupCancelled = null;
    this.signupError = null;
    this.metaBusy.set(true);
    this.metaBusyLabel.set('Waiting for Meta…');
    try {
      const code = await openEmbeddedSignup(session.signup.configId);
      if (!code) {
        this.patchMetaError(
          this.signupError ??
            (this.signupCancelled
              ? 'The Meta window was closed before signup finished. Continue when you are ready.'
              : 'Meta did not complete the sign-in. Try again.'),
        );
        return;
      }
      const finish = this.signupFinish ?? (await this.waitForFinish(8000));
      if (!finish) {
        this.patchMetaError('Meta did not say which number was set up. Try again.');
        return;
      }
      if (!finish.businessId) {
        this.patchMetaError('Meta did not name the business portfolio. Try again.');
        return;
      }

      this.metaBusyLabel.set('Connecting the number…');
      const dto = await firstValueFrom(
        this.api.completeEmbeddedSignup(session.id, {
          authorizationCode: code,
          wabaId: finish.wabaId,
          phoneNumberId: finish.phoneNumberId,
          businessPortfolioId: finish.businessId,
          twoStepPin: this.pin(),
        }),
      );
      this.applyMetaSession(dto);
      if (dto.completedAtUtc != null) {
        this.pin.set('');
        this.channels.reload();
        this.toasts.success(
          'Number connected. The starter templates are on the Templates page as drafts.',
          'Connect a number',
        );
      }
    } catch (e) {
      this.setMetaError(e, 'The number could not be connected. Try again.');
    } finally {
      this.metaBusy.set(false);
    }
  }

  private waitForFinish(ms: number): Promise<EmbeddedSignupFinish | null> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.finishWaiter = null;
        resolve(null);
      }, ms);
      this.finishWaiter = (d) => {
        clearTimeout(timer);
        this.finishWaiter = null;
        resolve(d);
      };
    });
  }

  private applyMetaSession(dto: OnboardingSessionDto): void {
    const appId = dto.metaAppId?.trim();
    const configId = dto.embeddedSignupConfigurationId?.trim();
    this.metaSession.set({
      id: dto.id,
      completed: dto.completedAtUtc != null,
      nextLabel: dto.nextStep != null ? STEP_LABEL[dto.nextStep] : '—',
      error: dto.lastError ?? undefined,
      signup:
        appId && configId
          ? { appId, configId, graphVersion: dto.graphVersion?.trim() || 'v23.0' }
          : undefined,
    });
  }

  private patchMetaError(error: string): void {
    const s = this.metaSession();
    if (s) this.metaSession.set({ ...s, error });
  }

  private setMetaError(e: unknown, fallback: string): void {
    const message = (e as { error?: { error?: { message?: string } } })?.error?.error?.message;
    const s = this.metaSession();
    if (s) this.metaSession.set({ ...s, error: message ?? fallback });
    else this.toasts.warning(message ?? fallback, 'Connect a number');
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
      this.toasts.warning(
        'Gupshup signup opens a hosted page — not available in the mock build.',
        'Connect a number',
      );
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
