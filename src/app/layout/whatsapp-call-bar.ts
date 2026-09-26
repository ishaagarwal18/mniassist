import { PermissionService } from '@abp/ng.core';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { grantedPolicy } from '../core/auth/permission';
import { formatDuration } from '../core/services/softphone-logic';
import { WhatsAppCallDto, WhatsAppCallService } from '../proxy/messaging/whats-app-call.service';
import { ArButton, ArIcon } from '../ui';

/** How often the inbox asks whether a WhatsApp call is ringing. Meta rings for about a minute. */
const POLL_MS = 4000;

/** Waits until the browser has gathered its ICE candidates, so the SDP answer carries them (Meta takes no trickle ICE). */
export function iceGathered(pc: RTCPeerConnection, timeoutMs = 3000): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      pc.removeEventListener('icegatheringstatechange', check);
      clearTimeout(timer);
      resolve();
    };
    const check = () => pc.iceGatheringState === 'complete' && done();
    const timer = setTimeout(done, timeoutMs);
    pc.addEventListener('icegatheringstatechange', check);
  });
}

/**
 * M3: WhatsApp voice calls from customers, answered in the browser. Docked in the app shell next to the softphone. Rings when Meta
 * reports a call to a Meta-connected number; Answer builds a WebRTC answer to the customer's offer and hands it to Meta through the
 * API. Built from Meta's published Calling API; not yet tried against a live number.
 */
@Component({
  selector: 'ar-whatsapp-call-bar',
  imports: [ArButton, ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (live(); as c) {
      <div class="wc wc--live" role="status">
        <ar-icon name="phone" [size]="15" />
        <span class="wc__who">{{ c.contactName || '+' + c.contactWaId }}</span>
        <span class="wc__state ar-mono">WhatsApp call · {{ elapsed() }}</span>
        <button ar-button type="button" variant="ghost" (click)="toggleMute()">
          {{ muted() ? 'Unmute' : 'Mute' }}
        </button>
        <button ar-button type="button" variant="primary" (click)="hangUp()">Hang up</button>
      </div>
    } @else if (ringing(); as c) {
      <div class="wc wc--ring" role="alert">
        <ar-icon name="phone" [size]="15" />
        <span class="wc__who">{{ c.contactName || '+' + c.contactWaId }}</span>
        <span class="wc__state">is calling on WhatsApp</span>
        <button ar-button type="button" variant="ghost" [disabled]="busy()" (click)="reject(c)">
          Decline
        </button>
        <button ar-button type="button" variant="primary" [disabled]="busy()" (click)="answer(c)">
          {{ busy() ? 'Connecting…' : 'Answer' }}
        </button>
      </div>
    }
    @if (error(); as e) {
      <div class="wc wc--err" role="alert">
        <span>{{ e }}</span>
        <button type="button" class="wc__x" aria-label="Dismiss" (click)="error.set(null)">
          ×
        </button>
      </div>
    }
    <audio #remote autoplay hidden></audio>
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
  private readonly api = inject(WhatsAppCallService);
  private readonly canUse = grantedPolicy('AutoReach.Inbox', inject(PermissionService));
  private readonly remote = viewChild<ElementRef<HTMLAudioElement>>('remote');

  protected readonly ringing = signal<WhatsAppCallDto | null>(null);
  protected readonly live = signal<WhatsAppCallDto | null>(null);
  protected readonly busy = signal(false);
  protected readonly muted = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly startedAt = signal<number | null>(null);
  private readonly tick = signal(0);

  protected readonly elapsed = computed(() => {
    this.tick();
    const t = this.startedAt();
    return t ? formatDuration(Math.round((Date.now() - t) / 1000)) : '0:00';
  });

  private pc: RTCPeerConnection | null = null;
  private mic: MediaStream | null = null;
  private dismissed = new Set<string>();

  constructor() {
    if (!this.canUse || environment.useMockData) return;
    const poll = setInterval(() => void this.poll(), POLL_MS);
    const clock = setInterval(() => this.tick.update((n) => n + 1), 1000);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(poll);
      clearInterval(clock);
      this.cleanup();
    });
  }

  private async poll(): Promise<void> {
    if (this.live() || this.busy() || document.hidden) return;
    try {
      const calls = await firstValueFrom(this.api.getRinging());
      this.ringing.set(calls.find((c) => c.offerSdp && !this.dismissed.has(c.id)) ?? null);
    } catch {
      // A missed poll is harmless: the next one is four seconds away.
    }
  }

  protected async answer(call: WhatsAppCallDto): Promise<void> {
    if (!call.offerSdp) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      this.mic = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      this.pc = pc;
      this.mic.getTracks().forEach((t) => pc.addTrack(t, this.mic!));
      pc.ontrack = (e) => {
        const audio = this.remote()?.nativeElement;
        if (audio) audio.srcObject = e.streams[0];
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') this.ended();
      };

      await pc.setRemoteDescription({ type: 'offer', sdp: call.offerSdp });
      await pc.setLocalDescription(await pc.createAnswer());
      await iceGathered(pc);

      const answered = await firstValueFrom(
        this.api.answer(call.id, pc.localDescription?.sdp ?? ''),
      );
      this.ringing.set(null);
      this.live.set(answered);
      this.startedAt.set(Date.now());
    } catch (e: unknown) {
      this.cleanup();
      this.error.set(
        e instanceof DOMException && e.name === 'NotAllowedError'
          ? 'Allow microphone access in the browser to answer calls.'
          : ((e as { error?: { error?: { message?: string } } })?.error?.error?.message ??
              'The call could not be answered. It may have stopped ringing.'),
      );
      this.ringing.set(null);
    } finally {
      this.busy.set(false);
    }
  }

  protected async reject(call: WhatsAppCallDto): Promise<void> {
    this.dismissed.add(call.id);
    this.ringing.set(null);
    try {
      await firstValueFrom(this.api.reject(call.id));
    } catch {
      // Meta stops ringing by itself after a minute either way.
    }
  }

  protected async hangUp(): Promise<void> {
    const call = this.live();
    this.ended();
    if (call) {
      try {
        await firstValueFrom(this.api.hangUp(call.id));
      } catch {
        // The customer may already have hung up; the webhook closes the log either way.
      }
    }
  }

  protected toggleMute(): void {
    const next = !this.muted();
    this.mic?.getAudioTracks().forEach((t) => (t.enabled = !next));
    this.muted.set(next);
  }

  private ended(): void {
    this.cleanup();
    this.live.set(null);
    this.startedAt.set(null);
    this.muted.set(false);
  }

  private cleanup(): void {
    this.mic?.getTracks().forEach((t) => t.stop());
    this.mic = null;
    this.pc?.close();
    this.pc = null;
  }
}
