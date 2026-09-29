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

function problem(e: unknown, fallback: string): string {
  if (e instanceof DOMException && e.name === 'NotAllowedError') {
    return 'Allow microphone access in the browser to make or take calls.';
  }
  return (e as { error?: { error?: { message?: string } } })?.error?.error?.message ?? fallback;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * M3: the one WhatsApp call this browser tab is on, whichever way it started.
 *
 * Recording: when the workspace records calls, both sides are mixed in the browser holding the customer's leg and uploaded when
 * the call ends. Transfer: Meta can't move a call, so this browser keeps the customer's leg and relays audio to the colleague over a
 * browser-to-browser link; its own microphone goes quiet and the tab must stay open until the call ends.
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

  private recorder: MediaRecorder | null = null;
  private recordCtx: AudioContext | null = null;
  private recordMix: MediaStreamAudioDestinationNode | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private recordChunks: Blob[] = [];
  private settings: WhatsAppCallSettingsDto | null = null;

  get onCall(): boolean {
    return (
      !!this.live() || !!this.dialling() || this.busy() || !!this.relayingTo() || !!this.offering()
    );
  }

  /** Checks for a customer's call ringing and a colleague's transfer. Called by the call bar on a timer. */
  async poll(): Promise<void> {
    if (document.hidden) return;
    if (!this.onCall) {
      try {
        const calls = await firstValueFrom(this.api.getRinging());
        this.ringing.set(calls.find((c) => c.offerSdp && !this.dismissed.has(c.id)) ?? null);
      } catch {
        // A missed poll is harmless: the next one is seconds away.
      }
    }
    if (!this.live() && !this.relayingTo()) {
      try {
        const offers = await firstValueFrom(this.api.getIncomingTransfers());
        this.incoming.set(offers.find((t) => t.offerSdp && !this.dismissed.has(t.id)) ?? null);
      } catch {
        // As above.
      }
    }
  }

  // ---- a customer calls ---------------------------------------------------------------------------------------------

  async answer(call: WhatsAppCallDto): Promise<void> {
    if (!call.offerSdp) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      const pc = await this.connectCustomer();
      await pc.setRemoteDescription({ type: 'offer', sdp: call.offerSdp });
      await pc.setLocalDescription(await pc.createAnswer());
      await iceGathered(pc);
      const answered = await firstValueFrom(
        this.api.answer(call.id, pc.localDescription?.sdp ?? ''),
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
      const pc = await this.connectCustomer();
      await pc.setLocalDescription(await pc.createOffer({ offerToReceiveAudio: true }));
      await iceGathered(pc);
      let call = await firstValueFrom(
        this.api.start(conversationId, pc.localDescription?.sdp ?? ''),
      );
      this.dialling.set({ call, name });
      this.busy.set(false);

      const deadline = Date.now() + ANSWER_TIMEOUT_MS;
      while (this.dialling() && Date.now() < deadline) {
        await wait(ANSWER_POLL_MS);
        call = await firstValueFrom(this.api.get(call.id));
        if (call.answerSdp) {
          await pc.setRemoteDescription({ type: 'answer', sdp: call.answerSdp });
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
    if (!t.offerSdp) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      this.mic = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const pc = new RTCPeerConnection({ iceServers: await this.iceServers() });
      this.pc = pc;
      this.mic.getTracks().forEach((track) => pc.addTrack(track, this.mic!));
      pc.ontrack = (e) => this.play(e.streams[0] ?? new MediaStream([e.track]));
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') this.ended();
      };
      await pc.setRemoteDescription({ type: 'offer', sdp: t.offerSdp });
      await pc.setLocalDescription(await pc.createAnswer());
      await iceGathered(pc);
      await firstValueFrom(this.api.acceptTransfer(t.id, pc.localDescription?.sdp ?? ''));
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
