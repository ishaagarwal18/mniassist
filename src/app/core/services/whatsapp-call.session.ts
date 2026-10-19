import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  WhatsAppCallSettingsDto,
  CallAgentDto,
  CallTransferDto,
  WhatsAppCallDto,
  WhatsAppCallService,
} from '../../proxy/messaging/whats-app-call.service';
import { formatDuration } from './softphone-logic';

/** How often an outbound call checks whether the customer picked up, and a transfer whether the colleague took it. */
const ANSWER_POLL_MS = 1500;
/** Meta rings for about a minute; give up a little after. */
const ANSWER_TIMEOUT_MS = 75_000;
/** A transfer offer lapses on the server after 45 s. */
const TRANSFER_TIMEOUT_MS = 45_000;
/** While relaying a transferred call, how often to check whether it has ended. */
const RELAY_POLL_MS = 3000;
/** A transferred call whose link to the relaying tab stays interrupted this long has lost that tab. */
const RELAY_LOST_MS = 6000;

const DEFAULT_ICE: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

/** The standard "this call is recorded" notice when the workspace has no clip of its own: two short 1400 Hz beeps. */
export function recordingTone(
  ctx: BaseAudioContext,
  into: AudioNode,
  at = ctx.currentTime,
): number {
  for (const start of [0, 0.7]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 1400;
    gain.gain.value = 0.2;
    osc.connect(gain).connect(into);
    osc.start(at + start);
    osc.stop(at + start + 0.35);
  }
  return 1.05;
}

/** Waits until the browser has gathered its ICE candidates, so the SDP carries them (no trickle ICE anywhere here). */
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

/** The recording format this browser can make: Opus in WebM (Chrome, Edge, Firefox) or MP4 audio (Safari). */
export function recordingType(isSupported: (type: string) => boolean): string | null {
  return (
    ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'].find(
      isSupported,
    ) ?? null
  );
}

/**
 * Why the link to the colleague relaying a transferred call went: the call ended (the customer hung up, and the relaying tab let
 * go), or only the relay did (that tab closed or lost its connection while the call was still on). Unknown when the call couldn't
 * be read.
 */
export function transferLinkOutcome(
  call: Pick<WhatsAppCallDto, 'endedAtUtc'> | null,
): 'call-ended' | 'relay-lost' | 'unknown' {
  if (!call) return 'unknown';
  return call.endedAtUtc ? 'call-ended' : 'relay-lost';
}

function problem(e: unknown, fallback: string): string {
  if (e instanceof DOMException && e.name === 'NotAllowedError') {
    return 'Allow microphone access in the browser to make or take calls.';
  }
  return (e as { error?: { error?: { message?: string } } })?.error?.error?.message ?? fallback;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The native IVR accepted this call and queued it for my team: answering means joining it on the relay. */
export const isQueued = (call: Pick<WhatsAppCallDto, 'ivrStatus'>) => call.ivrStatus === 'Queued';

/**
 * M3: the one WhatsApp call this browser tab is on, whichever way it started.
 *
 * Two ways to carry a call, chosen by the API (settings.serverRelay):
 *
 * - With the call relay, a server holds the customer's leg and this browser connects to it. A transfer is the colleague's
 *   browser connecting; this one lets go. A closed or reloaded tab doesn't cut the customer off: the agent can rejoin. The relay
 *   records the call.
 * - Without it, this browser holds the customer's leg. Recording: both sides are mixed here and uploaded when the call ends.
 *   Transfer: Meta can't move a call, so this browser keeps the customer's leg and relays audio to the colleague over a
 *   browser-to-browser link; its own microphone goes quiet and the tab must stay open until the call ends.
 */
@Injectable({ providedIn: 'root' })
export class WhatsAppCallSession {
  private readonly api = inject(WhatsAppCallService);

  readonly ringing = signal<WhatsAppCallDto | null>(null);
  readonly live = signal<WhatsAppCallDto | null>(null);
  /** An outbound call waiting for the customer to pick up. */
  readonly dialling = signal<{ call: WhatsAppCallDto | null; name: string } | null>(null);
  /** A colleague offering me their call. */
  readonly incoming = signal<CallTransferDto | null>(null);
  /** I am offering my call to a colleague and waiting for them. */
  readonly offering = signal<string | null>(null);
  /** I handed my call on and am relaying it: the name of who has it now. */
  readonly relayingTo = signal<string | null>(null);
  /** The call came to me by transfer: hang-up ends it for everyone. */
  readonly viaTransfer = signal(false);
  /**
   * A call transferred to me was cut off because the colleague's tab relaying it closed or lost its connection. The customer
   * didn't hang up; the call bar offers to call them back.
   */
  readonly relayLost = signal<{ call: WhatsAppCallDto; fromName: string } | null>(null);
  /**
   * With the call relay: a live call of mine this tab isn't connected to (its link dropped, or the page was reloaded). The customer
   * is still on the line; the call bar offers to rejoin.
   */
  readonly rejoinable = signal<WhatsAppCallDto | null>(null);
  /** A short confirmation for the call bar, e.g. once a call has been handed on. */
  readonly notice = signal<string | null>(null);
  readonly recording = signal(false);
  readonly busy = signal(false);
  readonly muted = signal(false);
  readonly error = signal<string | null>(null);

  private readonly startedAt = signal<number | null>(null);
  private readonly tick = signal(0);
  readonly elapsed = computed(() => {
    this.tick();
    const t = this.startedAt();
    return t ? formatDuration(Math.round((Date.now() - t) / 1000)) : '0:00';
  });

  private pc: RTCPeerConnection | null = null;
  private agentPc: RTCPeerConnection | null = null;
  private mic: MediaStream | null = null;
  private customerStream: MediaStream | null = null;
  private audio: HTMLAudioElement | null = null;
  private readonly dismissed = new Set<string>();
  private clock: ReturnType<typeof setInterval> | null = null;

  private relayLostTimer: ReturnType<typeof setTimeout> | null = null;
  private checkedForLiveCall = false;
  private recorder: MediaRecorder | null = null;
  private recordCtx: AudioContext | null = null;
  private recordMix: MediaStreamAudioDestinationNode | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private recordChunks: Blob[] = [];
  private settings: WhatsAppCallSettingsDto | null = null;

  constructor() {
    // Closing or reloading the tab ends a call it carries: the customer's leg lives here, and so does the relay of a call handed
    // to a colleague. Browsers show their own "Leave page?" text; the call bar explains why.
    window.addEventListener('beforeunload', (e) => {
      if (!this.carriesCall) return;
      e.preventDefault();
      e.returnValue = '';
    });
  }

  /** This tab holds a customer's call, as the agent on it or as the relay for a colleague. */
  get carriesCall(): boolean {
    return !!this.live() || !!this.dialling()?.call || !!this.relayingTo();
  }

  get onCall(): boolean {
    return (
      !!this.live() || !!this.dialling() || this.busy() || !!this.relayingTo() || !!this.offering()
    );
  }

  private polling = false;

  /**
   * Checks for a customer's call ringing and a colleague's transfer. Called by the call bar on a timer and the moment the server
   * says a call is ringing. Runs in a background tab too: that is exactly when an agent needs to hear a call.
   */
  async poll(): Promise<void> {
    if (this.polling) return;
    this.polling = true;
    try {
      await this.check();
    } finally {
      this.polling = false;
    }
  }

  private async check(): Promise<void> {
    if (!this.checkedForLiveCall) {
      this.checkedForLiveCall = true;
      await this.findCallToRejoin();
    }
    if (!this.onCall) {
      try {
        const calls = await firstValueFrom(this.api.getRinging());
        this.ringing.set(
          calls.find((c) => (c.offerSdp || isQueued(c)) && !this.dismissed.has(c.id)) ?? null,
        );
      } catch {
        // A missed poll is harmless: the next one is seconds away.
      }
    }
    if (!this.live() && !this.relayingTo()) {
      try {
        const offers = await firstValueFrom(this.api.getIncomingTransfers());
        this.incoming.set(
          offers.find((t) => (t.offerSdp || t.viaRelay) && !this.dismissed.has(t.id)) ?? null,
        );
      } catch {
        // As above.
      }
    }
  }

  // ---- a customer calls ---------------------------------------------------------------------------------------------

  async answer(call: WhatsAppCallDto): Promise<void> {
    if (!call.offerSdp && !isQueued(call)) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      // A call the IVR queued is already connected to the relay (Meta has no offer left to answer): joining it is the answer.
      if ((await this.viaRelay()) || isQueued(call)) {
        const relay = await this.connectRelay();
        const answered = await firstValueFrom(
          this.api.answer(call.id, { sdpOffer: relay.localDescription?.sdp ?? '' }),
        );
        await relay.setRemoteDescription({ type: 'answer', sdp: answered.agentAnswerSdp ?? '' });
        this.ringing.set(null);
        await this.goLive(answered);
        return;
      }
      const offer = call.offerSdp;
      if (!offer) return; // unreachable: only a queued call has no offer, and it took the relay path
      const pc = await this.connectCustomer();
      await pc.setRemoteDescription({ type: 'offer', sdp: offer });
      await pc.setLocalDescription(await pc.createAnswer());
      await iceGathered(pc);
      const answered = await firstValueFrom(
        this.api.answer(call.id, { sdpAnswer: pc.localDescription?.sdp ?? '' }),
      );
      this.ringing.set(null);
      await this.goLive(answered);
    } catch (e: unknown) {
      this.cleanup();
      this.ringing.set(null);
      this.error.set(problem(e, 'The call could not be answered. It may have stopped ringing.'));
    } finally {
      this.busy.set(false);
    }
  }

  async reject(call: WhatsAppCallDto): Promise<void> {
    this.dismissed.add(call.id);
    this.ringing.set(null);
    try {
      await firstValueFrom(this.api.reject(call.id));
    } catch {
      // Meta stops ringing by itself after a minute either way.
    }
  }

  // ---- I call a customer --------------------------------------------------------------------------------------------

  /** Calls a conversation's customer. They must have allowed calls ("Ask to call"). */
  async dial(conversationId: string, name: string): Promise<void> {
    if (this.onCall) return;
    this.busy.set(true);
    this.error.set(null);
    this.dialling.set({ call: null, name });
    try {
      const relayed = await this.viaRelay();
      const pc = relayed ? await this.connectRelay() : await this.connectCustomer();
      if (!relayed) {
        await pc.setLocalDescription(await pc.createOffer({ offerToReceiveAudio: true }));
        await iceGathered(pc);
      }
      let call = await firstValueFrom(
        this.api.start(conversationId, pc.localDescription?.sdp ?? ''),
      );
      if (relayed) {
        // Connected to the relay now; the relay rings the customer and picks up their answer itself.
        await pc.setRemoteDescription({ type: 'answer', sdp: call.agentAnswerSdp ?? '' });
      }
      this.dialling.set({ call, name });
      this.busy.set(false);

      const deadline = Date.now() + ANSWER_TIMEOUT_MS;
      while (this.dialling() && Date.now() < deadline) {
        await wait(ANSWER_POLL_MS);
        call = await firstValueFrom(this.api.get(call.id));
        if (relayed ? call.status === 'Answered' : !!call.answerSdp) {
          if (!relayed) await pc.setRemoteDescription({ type: 'answer', sdp: call.answerSdp! });
          this.dialling.set(null);
          await this.goLive(call);
          return;
        }
        if (call.endedAtUtc) {
          this.error.set(
            call.status === 'Rejected' ? `${name} declined the call.` : `${name} didn't pick up.`,
          );
          break;
        }
      }
      if (this.dialling() && !call.endedAtUtc) {
        this.error.set(`${name} didn't pick up.`);
        await firstValueFrom(this.api.hangUp(call.id)).catch(() => undefined);
      }
      this.dialling.set(null);
      this.cleanup();
    } catch (e: unknown) {
      this.dialling.set(null);
      this.cleanup();
      this.error.set(problem(e, 'The call could not be placed.'));
    } finally {
      this.busy.set(false);
    }
  }

  // ---- transfer: I hand my call on -----------------------------------------------------------------------------------

  agents(): Promise<CallAgentDto[]> {
    return firstValueFrom(this.api.getAgents());
  }

  /**
   * Offers my live call to a colleague. When they take it, the customer's audio goes to them and theirs to the customer, through
   * this tab; my microphone goes quiet. I stay out of the conversation but must keep the tab open until the call ends.
   */
  async transfer(to: CallAgentDto): Promise<void> {
    const call = this.live();
    if (call?.viaRelay) {
      await this.transferOnRelay(call, to);
      return;
    }
    const customerLeg = this.pc;
    if (!call || !customerLeg || !this.customerStream) return;
    this.error.set(null);
    this.offering.set(to.name);
    let transferId: string | null = null;
    try {
      const agentPc = new RTCPeerConnection({ iceServers: await this.iceServers() });
      this.agentPc = agentPc;
      this.customerStream
        .getAudioTracks()
        .forEach((t) => agentPc.addTrack(t, this.customerStream!));
      const colleagueAudio = new Promise<MediaStreamTrack>((resolve) => {
        agentPc.ontrack = (e) => resolve(e.track);
      });

      await agentPc.setLocalDescription(await agentPc.createOffer({ offerToReceiveAudio: true }));
      await iceGathered(agentPc);
      const offer = await firstValueFrom(
        this.api.transfer(call.id, to.userId, agentPc.localDescription?.sdp ?? ''),
      );
      transferId = offer.id;

      const deadline = Date.now() + TRANSFER_TIMEOUT_MS;
      let answer: string | null = null;
      while (this.offering() && Date.now() < deadline) {
        await wait(ANSWER_POLL_MS);
        const t = await firstValueFrom(this.api.getTransfer(offer.id));
        if (t.state === 'Accepted' && t.answerSdp) {
          answer = t.answerSdp;
          break;
        }
        if (t.state !== 'Offered') {
          throw new Error(
            t.state === 'Declined' ? `${to.name} declined the call.` : `${to.name} didn't answer.`,
          );
        }
      }
      if (!answer) {
        if (!this.offering()) return; // cancelled from the call bar
        throw new Error(`${to.name} didn't answer.`);
      }

      await agentPc.setRemoteDescription({ type: 'answer', sdp: answer });
      const track = await Promise.race([
        colleagueAudio,
        wait(8000).then(() => {
          throw new Error(
            `Couldn't connect to ${to.name}'s browser. You are still on the call with the customer.`,
          );
        }),
      ]);

      // The colleague now speaks to the customer; my microphone leaves the call and the recording.
      const sender = customerLeg.getSenders().find((s) => s.track?.kind === 'audio');
      await sender?.replaceTrack(track);
      this.mic?.getTracks().forEach((t) => t.stop());
      this.micSource?.disconnect();
      this.addToRecording(new MediaStream([track]));
      if (this.audio) this.audio.muted = true;

      this.offering.set(null);
      this.relayingTo.set(to.name);
      this.live.set(null);
      void this.relayUntilEnded(call.id);
    } catch (e: unknown) {
      if (transferId)
        await firstValueFrom(this.api.cancelTransfer(transferId)).catch(() => undefined);
      this.agentPc?.close();
      this.agentPc = null;
      this.offering.set(null);
      this.error.set(
        e instanceof Error ? e.message : problem(e, 'The call could not be transferred.'),
      );
    }
  }

  /**
   * With the call relay: offer the call; the colleague's browser joins the relay when they take it, and becomes the one the
   * customer hears. Then this tab simply lets go: nothing of the call lives here.
   */
  private async transferOnRelay(call: WhatsAppCallDto, to: CallAgentDto): Promise<void> {
    this.error.set(null);
    this.offering.set(to.name);
    let transferId: string | null = null;
    try {
      transferId = (await firstValueFrom(this.api.transfer(call.id, to.userId, null))).id;
      const deadline = Date.now() + TRANSFER_TIMEOUT_MS;
      while (this.offering() && Date.now() < deadline) {
        await wait(ANSWER_POLL_MS);
        const t = await firstValueFrom(this.api.getTransfer(transferId));
        if (t.state === 'Accepted') {
          this.offering.set(null);
          this.notice.set(`Call handed to ${to.name}.`);
          // A moment for their audio to reach the relay, which then lets my leg go; leaving now would only mean a beat of silence.
          await wait(1500);
          this.ended();
          return;
        }
        if (t.state !== 'Offered') {
          throw new Error(
            t.state === 'Declined' ? `${to.name} declined the call.` : `${to.name} didn't answer.`,
          );
        }
      }
      if (!this.offering()) {
        await firstValueFrom(this.api.cancelTransfer(transferId)).catch(() => undefined);
        return;
      }
      throw new Error(`${to.name} didn't answer.`);
    } catch (e: unknown) {
      if (transferId)
        await firstValueFrom(this.api.cancelTransfer(transferId)).catch(() => undefined);
      this.offering.set(null);
      this.error.set(
        e instanceof Error ? e.message : problem(e, 'The call could not be transferred.'),
      );
    }
  }

  /** Stops waiting for the colleague; the call stays with me. */
  cancelOffer(): void {
    this.offering.set(null);
  }

  private async relayUntilEnded(callId: string): Promise<void> {
    while (this.relayingTo()) {
      await wait(RELAY_POLL_MS);
      try {
        const call = await firstValueFrom(this.api.get(callId));
        if (call.endedAtUtc) break;
      } catch {
        // Keep relaying through a missed check.
      }
      if (this.pc?.connectionState === 'failed' || this.pc?.connectionState === 'closed') break;
    }
    await this.finishRecording(callId);
    this.relayingTo.set(null);
    this.ended();
  }

  // ---- transfer: a colleague hands me their call ---------------------------------------------------------------------

  async acceptTransfer(t: CallTransferDto): Promise<void> {
    if (t.viaRelay) {
      await this.acceptTransferOnRelay(t);
      return;
    }
    if (!t.offerSdp) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      this.mic = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const pc = new RTCPeerConnection({ iceServers: await this.iceServers() });
      this.pc = pc;
      this.mic.getTracks().forEach((track) => pc.addTrack(track, this.mic!));
      pc.ontrack = (e) => this.play(e.streams[0] ?? new MediaStream([e.track]));
      // This link runs to the colleague's tab, not to Meta. If it goes, find out whether the call ended or only the relay did.
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (this.relayLostTimer) {
          clearTimeout(this.relayLostTimer);
          this.relayLostTimer = null;
        }
        if (state === 'failed' || state === 'closed') {
          void this.linkLost(t);
        } else if (state === 'disconnected') {
          // A brief network blip recovers by itself; a closed tab doesn't.
          this.relayLostTimer = setTimeout(() => void this.linkLost(t), RELAY_LOST_MS);
        }
      };
      await pc.setRemoteDescription({ type: 'offer', sdp: t.offerSdp });
      await pc.setLocalDescription(await pc.createAnswer());
      await iceGathered(pc);
      await firstValueFrom(
        this.api.acceptTransfer(t.id, { sdpAnswer: pc.localDescription?.sdp ?? '' }),
      );
      this.incoming.set(null);
      this.viaTransfer.set(true);
      const call = await firstValueFrom(this.api.get(t.callId));
      this.live.set(call);
      this.startClock();
    } catch (e: unknown) {
      this.cleanup();
      this.incoming.set(null);
      this.error.set(problem(e, 'The transferred call could not be taken.'));
    } finally {
      this.busy.set(false);
    }
  }

  /**
   * The link to the colleague relaying my transferred call is gone. When the call itself ended (the customer hung up, or the
   * colleague's tab saw it end), that's the normal end. Otherwise the relaying tab closed or lost its connection: the customer is
   * cut off without having hung up, so say so, end the call properly, and offer to call them back.
   */
  private async linkLost(t: CallTransferDto): Promise<void> {
    if (!this.viaTransfer()) return;
    const call = await firstValueFrom(this.api.get(t.callId)).catch(() => null);
    this.ended();
    if (call && transferLinkOutcome(call) === 'relay-lost') {
      this.relayLost.set({ call, fromName: t.fromName || 'your colleague' });
      await firstValueFrom(this.api.hangUp(call.id)).catch(() => undefined);
    }
  }

  /** Calls back the customer whose transferred call was cut off. */
  async callBack(): Promise<void> {
    const lost = this.relayLost();
    this.relayLost.set(null);
    if (!lost?.call.conversationId) return;
    await this.dial(
      lost.call.conversationId,
      lost.call.contactName || '+' + (lost.call.contactWaId ?? ''),
    );
  }

  /** With the call relay: my browser joins the relay and takes over speaking to the customer. */
  private async acceptTransferOnRelay(t: CallTransferDto): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const relay = await this.connectRelay();
      const taken = await firstValueFrom(
        this.api.acceptTransfer(t.id, { sdpOffer: relay.localDescription?.sdp ?? '' }),
      );
      await relay.setRemoteDescription({ type: 'answer', sdp: taken.agentAnswerSdp ?? '' });
      this.incoming.set(null);
      this.live.set(await firstValueFrom(this.api.get(t.callId)));
      this.recording.set(!!(await this.loadSettings())?.recordCalls);
      this.startClock();
    } catch (e: unknown) {
      this.cleanup();
      this.incoming.set(null);
      this.error.set(problem(e, 'The transferred call could not be taken.'));
    } finally {
      this.busy.set(false);
    }
  }

  /** With the call relay: connect this tab to a live call of mine again. The customer never left. */
  async rejoin(call: WhatsAppCallDto): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const relay = await this.connectRelay();
      const back = await firstValueFrom(
        this.api.rejoin(call.id, relay.localDescription?.sdp ?? ''),
      );
      await relay.setRemoteDescription({ type: 'answer', sdp: back.agentAnswerSdp ?? '' });
      this.rejoinable.set(null);
      this.live.set(back);
      this.recording.set(!!(await this.loadSettings())?.recordCalls);
      this.startClock();
    } catch (e: unknown) {
      this.cleanup();
      this.error.set(problem(e, 'The call could not be rejoined. It may have ended.'));
      this.rejoinable.set(null);
    } finally {
      this.busy.set(false);
    }
  }

  /** After a reload: a live call of mine on the relay, to offer rejoining. */
  private async findCallToRejoin(): Promise<void> {
    if (!(await this.viaRelay()) || this.onCall) return;
    try {
      this.rejoinable.set(await firstValueFrom(this.api.getMyLiveCall()));
    } catch {
      // Nothing to rejoin, as far as we can tell.
    }
  }

  async declineTransfer(t: CallTransferDto): Promise<void> {
    this.dismissed.add(t.id);
    this.incoming.set(null);
    await firstValueFrom(this.api.declineTransfer(t.id)).catch(() => undefined);
  }

  // ---- hang up and mute ----------------------------------------------------------------------------------------------

  /** Ends the live call, or stops dialling. */
  async hangUp(): Promise<void> {
    const call = this.live() ?? this.dialling()?.call ?? null;
    this.dialling.set(null);
    if (call) {
      await this.finishRecording(call.id);
    }
    this.ended();
    if (call) {
      try {
        await firstValueFrom(this.api.hangUp(call.id));
      } catch {
        // The customer may already have hung up; the webhook closes the log either way.
      }
    }
  }

  toggleMute(): void {
    const next = !this.muted();
    this.mic?.getAudioTracks().forEach((t) => (t.enabled = !next));
    this.muted.set(next);
  }

  // ---- internals ------------------------------------------------------------------------------------------------------

  private async viaRelay(): Promise<boolean> {
    return !!(await this.loadSettings())?.serverRelay;
  }

  /**
   * With the call relay: this tab's link to it, carrying my microphone out and the customer in. Returns once the offer (with its
   * candidates) is ready to send. If the link drops while I'm on the call, the customer is still on the line: offer to rejoin.
   */
  private async connectRelay(): Promise<RTCPeerConnection> {
    this.mic = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const pc = new RTCPeerConnection({ iceServers: await this.iceServers() });
    this.pc = pc;
    this.mic.getTracks().forEach((t) => pc.addTrack(t, this.mic!));
    pc.ontrack = (e) => {
      this.customerStream = e.streams[0] ?? new MediaStream([e.track]);
      this.play(this.customerStream);
    };
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (this.relayLostTimer) {
        clearTimeout(this.relayLostTimer);
        this.relayLostTimer = null;
      }
      if (pc !== this.pc) return;
      if (state === 'failed' || state === 'closed') {
        void this.relayLinkLost();
      } else if (state === 'disconnected') {
        this.relayLostTimer = setTimeout(() => void this.relayLinkLost(), RELAY_LOST_MS);
      }
    };
    await pc.setLocalDescription(await pc.createOffer({ offerToReceiveAudio: true }));
    await iceGathered(pc);
    return pc;
  }

  /** My link to the relay dropped. If the call is still on, it waits for me there. */
  private async relayLinkLost(): Promise<void> {
    const call = this.live();
    if (!call?.viaRelay) return;
    this.ended();
    const now = await firstValueFrom(this.api.get(call.id)).catch(() => null);
    if (now && !now.endedAtUtc) {
      this.rejoinable.set(now);
    }
  }

  private async connectCustomer(): Promise<RTCPeerConnection> {
    this.mic = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const pc = new RTCPeerConnection({ iceServers: await this.iceServers() });
    this.pc = pc;
    this.mic.getTracks().forEach((t) => pc.addTrack(t, this.mic!));
    pc.ontrack = (e) => {
      this.customerStream = e.streams[0] ?? new MediaStream([e.track]);
      this.play(this.customerStream);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        // While relaying a transferred call, the relay loop saves the recording and cleans up.
        if (this.relayingTo()) return;
        const call = this.live();
        void (call ? this.finishRecording(call.id) : Promise.resolve()).then(() => this.ended());
      }
    };
    return pc;
  }

  private play(stream: MediaStream): void {
    this.audio ??= new Audio();
    this.audio.autoplay = true;
    this.audio.muted = false;
    this.audio.srcObject = stream;
  }

  private async goLive(call: WhatsAppCallDto): Promise<void> {
    this.live.set(call);
    this.startClock();
    await this.startRecording();
  }

  private startClock(): void {
    this.startedAt.set(Date.now());
    this.clock ??= setInterval(() => this.tick.update((n) => n + 1), 1000);
  }

  /** The workspace's call settings, fetched once per page. Null when they can't be read (calls still work, unrecorded). */
  private async loadSettings(): Promise<WhatsAppCallSettingsDto | null> {
    try {
      this.settings ??= await firstValueFrom(this.api.getSettings());
    } catch {
      return null;
    }
    return this.settings;
  }

  /** STUN/TURN servers from the workspace's configuration; the public STUN server when none are set. */
  private async iceServers(): Promise<RTCIceServer[]> {
    const configured = (await this.loadSettings())?.iceServers ?? [];
    return configured.length
      ? configured.map((s) => ({
          urls: s.urls,
          username: s.username ?? undefined,
          credential: s.credential ?? undefined,
        }))
      : DEFAULT_ICE;
  }

  /**
   * Mixes my microphone and the customer into one track and records it, when the workspace records calls. Before anything
   * else the customer hears the recording notice: the workspace's own clip, or two beeps. It goes into the recording too.
   */
  private async startRecording(): Promise<void> {
    const settings = await this.loadSettings();
    if (this.live()?.viaRelay) {
      // The relay records the call. This tab only plays the notice to the customer, mixed into what it sends.
      this.recording.set(!!settings?.recordCalls);
      if (!settings?.recordCalls || !this.mic) return;
      this.recordCtx = new AudioContext();
      this.recordMix = this.recordCtx.createMediaStreamDestination();
      this.micSource = this.recordCtx.createMediaStreamSource(this.mic);
      await this.announce(!!settings.hasAnnouncement);
      return;
    }
    const type =
      typeof MediaRecorder === 'undefined'
        ? null
        : recordingType((t) => MediaRecorder.isTypeSupported(t));
    if (!settings?.recordCalls || !type || !this.mic || !this.customerStream) return;

    this.recordCtx = new AudioContext();
    this.recordMix = this.recordCtx.createMediaStreamDestination();
    this.micSource = this.recordCtx.createMediaStreamSource(this.mic);
    this.micSource.connect(this.recordMix);
    this.addToRecording(this.customerStream);

    this.recordChunks = [];
    this.recorder = new MediaRecorder(this.recordMix.stream, { mimeType: type });
    this.recorder.ondataavailable = (e) => e.data.size && this.recordChunks.push(e.data);
    this.recorder.start(5000);
    this.recording.set(true);

    await this.announce(!!settings.hasAnnouncement);
  }

  /**
   * Plays the recording notice to the customer: my microphone and the notice are mixed into what the customer's leg sends,
   * so I can keep talking over the end of it. Best effort: a notice that can't play never stops the call.
   */
  private async announce(hasClip: boolean): Promise<void> {
    const ctx = this.recordCtx;
    const sender = this.pc?.getSenders().find((x) => x.track?.kind === 'audio');
    if (!ctx || !sender || !this.micSource || !this.recordMix) return;
    try {
      const outgoing = ctx.createMediaStreamDestination();
      this.micSource.connect(outgoing);

      const notice = ctx.createGain();
      notice.connect(outgoing);
      notice.connect(this.recordMix);
      if (hasClip) {
        const blob = await firstValueFrom(this.api.getAnnouncement());
        const clip = ctx.createBufferSource();
        clip.buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
        clip.connect(notice);
        clip.start();
      } else {
        recordingTone(ctx, notice);
      }

      await sender.replaceTrack(outgoing.stream.getAudioTracks()[0]);
    } catch {
      // The call carries on without the notice; the agent was already told to say it.
    }
  }

  private addToRecording(stream: MediaStream): void {
    if (!this.recordCtx || !this.recordMix) return;
    this.recordCtx.createMediaStreamSource(stream).connect(this.recordMix);
  }

  /** Stops the recorder and uploads what it has. Never blocks hanging up for long, and never throws. */
  private async finishRecording(callId: string): Promise<void> {
    const recorder = this.recorder;
    this.recorder = null;
    this.recording.set(false);
    if (!recorder || recorder.state === 'inactive') return;
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
      setTimeout(resolve, 2000);
    });
    void this.recordCtx?.close();
    this.recordCtx = null;
    this.recordMix = null;
    this.micSource = null;

    const blob = new Blob(this.recordChunks, { type: recorder.mimeType.split(';')[0] });
    this.recordChunks = [];
    if (blob.size === 0) return;
    const form = new FormData();
    form.append('CallId', callId);
    form.append('File', blob, `call-${callId}.${blob.type.includes('mp4') ? 'm4a' : 'webm'}`);
    try {
      await firstValueFrom(this.api.uploadRecording(form));
    } catch (e: unknown) {
      this.error.set(problem(e, 'The call recording could not be saved.'));
    }
  }

  private ended(): void {
    if (this.relayLostTimer) {
      clearTimeout(this.relayLostTimer);
      this.relayLostTimer = null;
    }
    this.cleanup();
    this.live.set(null);
    this.viaTransfer.set(false);
    this.startedAt.set(null);
    this.muted.set(false);
    if (this.clock) {
      clearInterval(this.clock);
      this.clock = null;
    }
  }

  private cleanup(): void {
    this.recorder = null;
    this.recording.set(false);
    void this.recordCtx?.close();
    this.recordCtx = null;
    this.mic?.getTracks().forEach((t) => t.stop());
    this.mic = null;
    this.pc?.close();
    this.pc = null;
    this.agentPc?.close();
    this.agentPc = null;
    this.customerStream = null;
    if (this.audio) this.audio.srcObject = null;
  }
}
