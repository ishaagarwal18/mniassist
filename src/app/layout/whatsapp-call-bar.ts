import { PermissionService } from '@abp/ng.core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';

import { environment } from '../../environments/environment';
import { grantedPolicy } from '../core/auth/permission';
import { InboxRealtimeService } from '../core/realtime/inbox-realtime.service';
import { CallAlert } from '../core/services/call-alert';
import { WhatsAppCallSession } from '../core/services/whatsapp-call.session';
import { CallAgentDto } from '../proxy/messaging/whats-app-call.service';
import { ArButton, ArIcon } from '../ui';
import { ArSelect } from '../ui/select';
import { ArCallAssist } from './call-assist-panel';

const SETUP_DISMISSED_KEY = 'ar.callAlerts.setupDismissed';

function readDismissed(): boolean {
  try {
    return localStorage.getItem(SETUP_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

/** How often the app asks whether a customer's WhatsApp call is ringing. Meta rings for about a minute. */
const POLL_MS = 4000;

/**
 * M3: WhatsApp voice calls, docked in the app shell next to the softphone. Rings when a customer calls a Meta-connected number,
 * shows an agent's own call while it dials, carries the live call (recorded when the workspace records calls), and hands it to a
 * colleague. Built from Meta's published Calling API; not yet tried
 * against a live number.
 */
@Component({
  selector: 'ar-whatsapp-call-bar',
  imports: [ArButton, ArIcon, ArSelect, ArCallAssist],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (session.live(); as c) {
      <div class="wc wc--live" role="status">
        <ar-icon name="phone" [size]="15" />
        <span class="wc__who">{{ c.contactName || '+' + c.contactWaId }}</span>
        <span class="wc__state ar-mono">WhatsApp call · {{ session.elapsed() }}</span>
        @if (session.recording()) {
          <span class="wc__rec" title="Tell the customer this call is being recorded"
            >● Recording</span
          >
        }
        <button ar-button type="button" variant="ghost" (click)="session.toggleMute()">
          {{ session.muted() ? 'Unmute' : 'Mute' }}
        </button>
        @if (!session.viaTransfer()) {
          @if (session.offering(); as name) {
            <span class="wc__state">Offering to {{ name }}…</span>
            <button ar-button type="button" variant="ghost" (click)="session.cancelOffer()">
              Keep call
            </button>
          } @else {
            <button ar-button type="button" variant="ghost" (click)="openTransfer()">
              Transfer
            </button>
          }
        }
        <button
          ar-button
          type="button"
          variant="ghost"
          [attr.aria-expanded]="assisting()"
          aria-controls="wc-assist"
          (click)="assisting.set(!assisting())"
        >
          {{ assisting() ? 'Close look-up' : 'Look up' }}
        </button>
        <button ar-button type="button" variant="primary" (click)="session.hangUp()">
          Hang up
        </button>
        @if (session.recording()) {
          <span class="wc__hint">Tell the customer the call is recorded.</span>
        }
        @if (c.ivrStatus === 'AiHandoff' && c.handoffSummary) {
          <span class="wc__hint">
            From the AI agent: <span translate="no">{{ c.handoffSummary }}</span>
          </span>
        } @else if (c.queueLabel || c.ivrLookup) {
          <span class="wc__hint">
            @if (c.queueLabel) {
              Chose {{ c.queueLabel }}.
            }
            @if (c.ivrLookup) {
              <span translate="no">{{ c.ivrLookup }}</span>
            }
          </span>
        }
        @if (assisting()) {
          <div id="wc-assist" class="wc__assist">
            <ar-call-assist [contactId]="c.contactId" />
          </div>
        }
        @if (picking()) {
          <div class="wc__pick">
            <label for="wc-agent" class="wc__state">Transfer to</label>
            <select
              id="wc-agent"
              class="ar-field__input"
              (change)="pick($any($event.target).value)"
            >
              <option value="">Choose a colleague…</option>
              @for (a of agents(); track a.userId) {
                <option [value]="a.userId">{{ a.name }}</option>
              }
            </select>
            <button type="button" class="wc__x" aria-label="Close" (click)="picking.set(false)">
              ×
            </button>
          </div>
        }
      </div>
    } @else if (session.relayingTo(); as name) {
      <div class="wc wc--relay" role="status">
        <ar-icon name="phone" [size]="15" />
        <span class="wc__who">Call handed to {{ name }}</span>
        <span class="wc__state"
          >Keep this tab open until the call ends: the audio passes through it.</span
        >
        <span class="wc__hint"
          >Closing or reloading this tab cuts off the customer and {{ name }}. The browser will ask
          before it closes.</span
        >
      </div>
    } @else if (session.dialling(); as d) {
      <div class="wc wc--ring" role="status">
        <ar-icon name="phone" [size]="15" />
        <span class="wc__who">{{ d.name }}</span>
        <span class="wc__state">{{ d.call ? 'Ringing on WhatsApp…' : 'Connecting…' }}</span>
        <button ar-button type="button" variant="ghost" (click)="session.hangUp()">Cancel</button>
      </div>
    } @else if (session.incoming(); as t) {
      <div class="wc wc--ring" role="alert">
        <ar-icon name="phone" [size]="15" />
        <span class="wc__who">{{ t.fromName || 'A colleague' }}</span>
        <span class="wc__state"
          >is transferring a WhatsApp call with {{ t.contactName || '+' + t.contactWaId }}</span
        >
        <button
          ar-button
          type="button"
          variant="ghost"
          [disabled]="session.busy()"
          (click)="session.declineTransfer(t)"
        >
          Decline
        </button>
        <button
          ar-button
          type="button"
          variant="primary"
          [disabled]="session.busy()"
          (click)="session.acceptTransfer(t)"
        >
          {{ session.busy() ? 'Connecting…' : 'Take call' }}
        </button>
      </div>
    } @else if (session.ringing(); as c) {
      <div class="wc wc--ring" role="alert">
        <ar-icon name="phone" [size]="15" />
        <span class="wc__who">{{ c.contactName || '+' + c.contactWaId }}</span>
        @if (c.ivrStatus === 'AiHandoff') {
          <span class="wc__state">
            The AI agent is asking for a person{{ c.queueLabel ? ' · ' + c.queueLabel : '' }}
          </span>
          @if (c.handoffReason) {
            <span class="wc__hint"
              ><span translate="no">{{ c.handoffReason }}</span></span
            >
          }
        } @else {
          <span class="wc__state">
            is calling on WhatsApp{{ c.queueLabel ? ' · chose ' + c.queueLabel : '' }}
          </span>
        }
        @if (c.ivrLookup) {
          <span class="wc__hint">
            Looked up in the menu: <span translate="no">{{ c.ivrLookup }}</span>
          </span>
        }
        <!-- A call the menu queued or the AI handed over is already connected and waiting for the team: one agent can't
             decline it for all. -->
        @if (c.ivrStatus !== 'Queued' && c.ivrStatus !== 'AiHandoff') {
          <button
            ar-button
            type="button"
            variant="ghost"
            [disabled]="session.busy()"
            (click)="session.reject(c)"
          >
            Decline
          </button>
        }
        <button
          ar-button
          type="button"
          variant="primary"
          [disabled]="session.busy()"
          (click)="session.answer(c)"
        >
          {{
            session.busy() ? 'Connecting…' : c.ivrStatus === 'AiHandoff' ? 'Take over' : 'Answer'
          }}
        </button>
      </div>
    }
    @if (session.relayLost(); as lost) {
      <div class="wc wc--err" role="alert">
        <span
          >The call with <b>{{ lost.call.contactName || '+' + lost.call.contactWaId }}</b> was cut
          off: {{ lost.fromName }}'s tab, which was carrying it, closed or lost its connection. The
          customer didn't hang up.</span
        >
        @if (lost.call.conversationId) {
          <button ar-button type="button" variant="primary" (click)="session.callBack()">
            Call back
          </button>
        }
        <button
          type="button"
          class="wc__x"
          aria-label="Dismiss"
          (click)="session.relayLost.set(null)"
        >
          ×
        </button>
      </div>
    }
    @if (session.rejoinable(); as c) {
      <div class="wc wc--ring" role="alert">
        <ar-icon name="phone" [size]="15" />
        <span
          >You're not connected to your call with <b>{{ c.contactName || '+' + c.contactWaId }}</b
          >. The customer is still on the line.</span
        >
        <button
          ar-button
          type="button"
          variant="primary"
          [disabled]="session.busy()"
          (click)="session.rejoin(c)"
        >
          {{ session.busy() ? 'Connecting…' : 'Rejoin' }}
        </button>
        <button
          type="button"
          class="wc__x"
          aria-label="Dismiss"
          (click)="session.rejoinable.set(null)"
        >
          ×
        </button>
      </div>
    }
    @if (session.notice(); as n) {
      <div class="wc" role="status">
        <span>{{ n }}</span>
        <button type="button" class="wc__x" aria-label="Dismiss" (click)="session.notice.set(null)">
          ×
        </button>
      </div>
    }
    @if (alertSetup(); as p) {
      <div class="wc wc--setup" role="status">
        <ar-icon name="phone" [size]="15" />
        @if (p === 'audio') {
          <span>Enable a ringtone for incoming WhatsApp calls.</span>
          <button ar-button type="button" variant="primary" (click)="enableRingtone()">
            Enable ringtone
          </button>
        } @else if (p === 'denied') {
          <span
            >Desktop alerts for WhatsApp calls are blocked for this site, so a call won't reach you
            while this window is minimised. Allow notifications in the browser's site settings (the
            icon left of the address).</span
          >
          <button ar-button type="button" variant="primary" (click)="enableRingtone()">
            Enable ringtone
          </button>
        } @else {
          <span>Get a desktop alert for WhatsApp calls, even when this window is minimised.</span>
          <button ar-button type="button" variant="primary" (click)="turnOnAlerts()">
            Turn on call alerts
          </button>
        }
        <button type="button" class="wc__x" aria-label="Dismiss" (click)="dismissSetup()">×</button>
      </div>
    }
    @if (session.error(); as e) {
      <div class="wc wc--err" role="alert">
        <span>{{ e }}</span>
        <button type="button" class="wc__x" aria-label="Dismiss" (click)="session.error.set(null)">
          ×
        </button>
      </div>
    }
  `,
  styles: `
    :host {
      position: fixed;
      right: 16px;
      bottom: 64px;
      z-index: 60;
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: flex-end;
      pointer-events: none;
    }
    .wc {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px 8px 14px;
      border-radius: 10px;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      box-shadow: 0 6px 24px rgb(0 0 0 / 0.12);
      font: 500 13px var(--ar-font-sans);
      color: var(--ar-ink-900);
      max-width: calc(100vw - 32px);
      flex-wrap: wrap;
    }
    .wc--ring {
      border-color: var(--ar-teal-600, #0d9488);
    }
    .wc--live {
      border-color: var(--ar-good-600, #067647);
    }
    .wc--relay {
      border-color: var(--ar-line-200);
      background: var(--ar-bg-100);
    }
    .wc__rec {
      font: 600 12px var(--ar-font-sans);
      color: var(--ar-bad-600, #b42318);
    }
    .wc__hint {
      flex-basis: 100%;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .wc__assist {
      flex-basis: 100%;
      width: min(440px, calc(100vw - 56px));
    }
    .wc__pick {
      flex-basis: 100%;
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .wc__pick select {
      flex: 1;
      min-width: 0;
    }
    .wc--setup {
      max-width: min(420px, calc(100vw - 32px));
      border-color: var(--ar-line-200);
    }
    .wc--err {
      color: var(--ar-bad-600, #b42318);
    }
    .wc__who {
      font-weight: 600;
    }
    .wc__state {
      color: var(--ar-ink-500);
    }
    .wc__x {
      border: 0;
      background: none;
      font-size: 16px;
      cursor: pointer;
      color: inherit;
    }
    @media (prefers-reduced-motion: no-preference) {
      .wc--ring {
        animation: wc-pulse 1.2s ease-in-out infinite;
      }
    }
    @keyframes wc-pulse {
      50% {
        box-shadow: 0 0 0 6px rgb(13 148 136 / 0.18);
      }
    }
  `,
})
export class ArWhatsAppCallBar {
  protected readonly session = inject(WhatsAppCallSession);
  protected readonly picking = signal(false);
  /** The look-up panel is open on the live call. */
  protected readonly assisting = signal(false);
  protected readonly agents = signal<CallAgentDto[]>([]);

  protected async openTransfer(): Promise<void> {
    this.picking.set(true);
    try {
      this.agents.set(await this.session.agents());
    } catch {
      this.session.error.set('Could not load your colleagues.');
      this.picking.set(false);
    }
  }

  protected pick(userId: string): void {
    const agent = this.agents().find((a) => a.userId === userId);
    if (!agent) return;
    this.picking.set(false);
    void this.session.transfer(agent);
  }
  private readonly canUse = grantedPolicy('AutoReach.Inbox', inject(PermissionService));
  private readonly realtime = inject(InboxRealtimeService);
  protected readonly alert = inject(CallAlert);
  /** The agent has answered the setup card in this browser (turned alerts on or dismissed it), or alerts were already allowed. */
  private readonly setupAnswered = signal(readDismissed() || this.alert.permission() === 'granted');

  /**
   * Shown once to an agent who takes calls, until they answer it. It never comes back after that: the ringtone, which each
   * new tab must unlock again, is then unlocked by the agent's first click or key press in the app (see the constructor).
   */
  protected readonly alertSetup = computed(() => {
    if (!this.canUse() || environment.useMockData || this.setupAnswered()) return null;
    const p = this.alert.permission();
    return p === 'unsupported' ? 'audio' : p === 'granted' ? null : p;
  });

  protected async turnOnAlerts(): Promise<void> {
    this.dismissSetup();
    await this.alert.enableNotifications();
  }

  protected enableRingtone(): void {
    this.dismissSetup();
    this.alert.unlock();
  }

  protected dismissSetup(): void {
    this.setupAnswered.set(true);
    try {
      localStorage.setItem(SETUP_DISMISSED_KEY, '1');
    } catch {
      // Storage unavailable: it just shows again next time.
    }
  }

  constructor() {
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => this.alert.stop());
    if (!this.canUse() || environment.useMockData) return;

    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        if (this.canUse()) await this.session.poll();
      } catch {
        // A failed settings/rejoin request must not stop future call checks.
      } finally {
        if (!stopped)
          timer = setTimeout(
            poll,
            this.realtime.connected() && !this.session.onCall ? 15_000 : POLL_MS,
          );
      }
    };
    void poll();
    destroyRef.onDestroy(() => {
      stopped = true;
      clearTimeout(timer);
    });

    // The server says the moment a call rings, on every page, not just the inbox; the timer is the fallback.
    void this.realtime.connect();
    effect(() => {
      if (this.realtime.callRinging()) untracked(() => void this.session.poll());
    });

    // Audio hardware and permission prompts are first initialized by the explicit call-alert setup card. Once the agent has
    // answered it, each new tab unlocks the ringtone on their first click or key press, instead of asking again.
    const unlockOnGesture = () => {
      if (this.setupAnswered()) this.alert.unlock();
    };
    document.addEventListener('pointerdown', unlockOnGesture, true);
    document.addEventListener('keydown', unlockOnGesture, true);
    const removeGesture = () => {
      document.removeEventListener('pointerdown', unlockOnGesture, true);
      document.removeEventListener('keydown', unlockOnGesture, true);
    };
    destroyRef.onDestroy(removeGesture);
    effect(() => {
      if (this.alert.audioReady()) untracked(removeGesture);
    });

    // A new call starts with the look-up panel closed (the same call refreshed by a poll keeps it open).
    let liveId: string | undefined;
    effect(() => {
      const id = this.session.live()?.id;
      untracked(() => {
        if (id !== liveId) this.assisting.set(false);
        liveId = id;
      });
    });

    // Ring while a customer's call or a colleague's transfer is waiting for this agent; stop as soon as it isn't.
    effect(() => {
      const call = this.session.ringing();
      const transfer = this.session.incoming();
      untracked(() => {
        if (call) {
          const who = call.contactName || '+' + call.contactWaId;
          this.alert.start(
            `${call.id}:${call.ivrStatus ?? ''}`,
            who,
            call.queueLabel ? `WhatsApp call · chose ${call.queueLabel}` : 'WhatsApp call',
          );
        } else if (transfer) {
          this.alert.start(
            `transfer:${transfer.id}`,
            transfer.fromName || 'A colleague',
            `Transferring a WhatsApp call with ${transfer.contactName || '+' + transfer.contactWaId}`,
          );
        } else {
          this.alert.stop();
        }
      });
    });
  }
}
