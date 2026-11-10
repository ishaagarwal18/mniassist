import { Injectable, DestroyRef, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PermissionService } from '@abp/ng.core';
import type { SimpleUser as SimpleUserType, SimpleUserDelegate } from 'sip.js/lib/platform/web';
import {
  CallLogDto,
  CallService,
  SoftphoneCredentialsDto,
  VoiceCallStatus,
} from '../../proxy/voice';
import { readApiError } from '../util/api-error';
import { sipTarget } from './softphone-logic';
import { checkPolicy } from '../auth/permission';
import { PlanService } from './plan.service';

export type SoftphoneConnection = 'offline' | 'connecting' | 'registered' | 'failed';
export type SoftphoneCallState = 'idle' | 'calling' | 'ringing-in' | 'connected' | 'ended';

export interface SoftphoneCall {
  callLogId: string | null;
  direction: 'outbound' | 'inbound';
  remoteNumber: string;
  contactId: string | null;
  contactName: string | null;
  enquiryId: string | null;
}

/**
 * The in-browser phone: registers a WebRTC/SIP session against the workspace's shared softphone line and drives calls through it.
 * A real SIP.js `SimpleUser` does the actual signalling and media.
 *
 * The browser is the source of truth for a softphone call's live state — there is no server webhook the way Exotel's own
 * click-to-call has. Every state change (answered, ended) is reported to the server as it happens, the same log entry a
 * click-to-call makes, just written by the browser instead of a callback.
 */
@Injectable({ providedIn: 'root' })
export class SoftphoneService {
  private readonly api = inject(CallService);
  private readonly permissions = inject(PermissionService);
  private readonly plan = inject(PlanService);

  private simpleUser: SimpleUserType | null = null;
  private credentials: SoftphoneCredentialsDto | null = null;
  private connectPromise: Promise<boolean> | null = null;
  private wasAnswered = false;
  private pendingInboundLog: Promise<CallLogDto | null> | null = null;
  private durationTimer: ReturnType<typeof setInterval> | null = null;

  /** True once the workspace is known to have the softphone turned on and ready — the signal a shell-level widget uses to decide
   *  whether to show itself at all. A workspace that has never touched this feature should see nothing, not a broken bar. */
  readonly configured = signal(false);

  readonly connection = signal<SoftphoneConnection>('offline');
  readonly callState = signal<SoftphoneCallState>('idle');
  readonly call = signal<SoftphoneCall | null>(null);
  readonly muted = signal(false);
  readonly durationSeconds = signal(0);
  readonly error = signal<string | null>(null);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.stopDurationTimer();
    });
  }

  /** Registers the softphone if it is not already registered or registering. Safe to call repeatedly — a component mounting
   *  does not need to know whether another one already connected it. */
  async ensureConnected(): Promise<boolean> {
    if (!checkPolicy('AutoReach.Inbox.Reply', this.permissions) || !this.plan.hasFeature('Voice')) {
      return false;
    }
    if (this.connection() === 'registered') return true;
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = this.connect().finally(() => {
      this.connectPromise = null;
    });
    return this.connectPromise;
  }

  private async connect(): Promise<boolean> {
    this.error.set(null);
    this.connection.set('connecting');

    try {
      const creds = await firstValueFrom(this.api.getSoftphoneCredentials());
      this.credentials = creds;
      if (!creds.ready || !creds.wsServer || !creds.sipUri || !creds.password) {
        // Not configured is not a failure to show — a workspace that never turned this on should see nothing.
        this.connection.set('offline');
        return false;
      }
      this.configured.set(true);
    } catch (e) {
      this.error.set(readApiError(e, 'Could not check whether the in-browser phone is set up.'));
      this.connection.set('offline');
      return false;
    }

    try {
      const { SimpleUser } = await import('sip.js/lib/platform/web');
      const aor = this.credentials.sipUri!;
      const user = new SimpleUser(this.credentials.wsServer!, {
        aor,
        userAgentOptions: {
          authorizationUsername: aor.replace(/^sips?:/, '').split('@')[0],
          authorizationPassword: this.credentials.password!,
          displayName: this.credentials.displayName ?? undefined,
        },
        delegate: this.delegate(),
      });
      this.simpleUser = user;
      await user.connect();
      await user.register();
      return true;
    } catch {
      this.error.set(
        'Could not connect the in-browser phone. Check the SIP settings under Channels.',
      );
      this.connection.set('failed');
      this.simpleUser = null;
      return false;
    }
  }

  private delegate(): SimpleUserDelegate {
    return {
      onServerConnect: () => this.error.set(null),
      onServerDisconnect: (err) => {
        this.connection.set(err ? 'failed' : 'offline');
        if (err) this.error.set('The in-browser phone lost its connection.');
      },
      onRegistered: () => this.connection.set('registered'),
      onUnregistered: () => this.connection.set('offline'),
      onCallReceived: () => {
        this.wasAnswered = false;
        const remoteNumber = this.readRemoteNumber() ?? 'Unknown number';
        this.call.set({
          callLogId: null,
          direction: 'inbound',
          remoteNumber,
          contactId: null,
          contactName: null,
          enquiryId: null,
        });
        this.callState.set('ringing-in');
        this.pendingInboundLog = this.logInbound(remoteNumber);
      },
      onCallAnswered: () => {
        this.wasAnswered = true;
        this.callState.set('connected');
        this.startDurationTimer();
        void this.reportEvent(VoiceCallStatus.InProgress);
      },
      onCallHangup: () => {
        const wasConnected = this.wasAnswered;
        this.stopDurationTimer();
        void this.reportEvent(wasConnected ? VoiceCallStatus.Completed : VoiceCallStatus.NoAnswer);
        this.callState.set('idle');
        this.call.set(null);
        this.muted.set(false);
        this.wasAnswered = false;
        this.pendingInboundLog = null;
      },
    };
  }

  /** Best-effort: SimpleUser does not expose the remote party officially, but it keeps the live session on a documented-adjacent
   *  `session` field this reads defensively. A caller ID that cannot be read falls back to "Unknown number" rather than failing
   *  the call. */
  private readRemoteNumber(): string | null {
    try {
      const held = (
        this.simpleUser as unknown as { session?: { remoteIdentity?: { uri?: { user?: string } } } }
      )?.session;
      return held?.remoteIdentity?.uri?.user ?? null;
    } catch {
      return null;
    }
  }

  private async logInbound(remoteNumber: string): Promise<CallLogDto | null> {
    try {
      const logged = await firstValueFrom(
        this.api.reportSoftphoneInbound({ fromNumber: remoteNumber }),
      );
      this.call.update((c) =>
        c && c.direction === 'inbound'
          ? {
              ...c,
              callLogId: logged.id,
              contactId: logged.contactId,
              contactName: logged.contactName ?? null,
            }
          : c,
      );
      return logged;
    } catch (e) {
      this.error.set(readApiError(e, 'This call could not be logged.'));
      return null;
    }
  }

  private async reportEvent(status: VoiceCallStatus): Promise<void> {
    const c = this.call();
    let id = c?.callLogId ?? null;
    if (!id && this.pendingInboundLog) {
      id = (await this.pendingInboundLog)?.id ?? null;
    }
    if (!id) return;

    try {
      await firstValueFrom(
        this.api.reportSoftphoneEvent(id, { status, durationSeconds: this.durationSeconds() }),
      );
    } catch {
      // Best effort — the call itself has already happened; a failed report does not undo it.
    }
  }

  private startDurationTimer(): void {
    this.durationSeconds.set(0);
    this.durationTimer = setInterval(() => this.durationSeconds.update((s) => s + 1), 1000);
  }

  private stopDurationTimer(): void {
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
  }

  // ---- what a page or the shell bar calls -----------------------------------------------------------------------------

  /** Calls a known contact (the number is resolved from their record) or, from the bar's own dialler, a raw number with no
   *  contact picked yet — matched or created by number the same way an inbound call is. Either `contactId` or `number` must be
   *  given. `number` is digits with the country code, as every contact number is stored. */
  async dial(target: {
    contactId?: string;
    number?: string;
    contactName?: string | null;
    enquiryId?: string | null;
  }): Promise<void> {
    if (
      this.callState() !== 'idle' ||
      !(await this.ensureConnected()) ||
      (!target.contactId && !target.number)
    )
      return;

    this.error.set(null);
    this.wasAnswered = false;
    this.callState.set('calling');
    this.call.set({
      callLogId: null,
      direction: 'outbound',
      remoteNumber: target.number ?? '',
      contactId: target.contactId ?? null,
      contactName: target.contactName ?? null,
      enquiryId: target.enquiryId ?? null,
    });

    try {
      const logged = await firstValueFrom(
        this.api.startSoftphoneCall({
          contactId: target.contactId ?? null,
          number: target.contactId ? null : target.number,
          enquiryId: target.enquiryId ?? null,
        }),
      );
      const dialNumber = logged.contactNumber ?? target.number;
      this.call.update((c) =>
        c
          ? {
              ...c,
              callLogId: logged.id,
              contactId: logged.contactId,
              contactName: c.contactName ?? logged.contactName ?? null,
              remoteNumber: dialNumber ?? c.remoteNumber,
            }
          : c,
      );

      if (!dialNumber) {
        throw new Error('This contact has no phone number to call.');
      }

      const destination = sipTarget(this.credentials?.sipUri, dialNumber);
      if (!destination) {
        throw new Error('The in-browser phone has no SIP address to dial through.');
      }
      await this.simpleUser?.call(destination);
    } catch (e) {
      this.error.set(readApiError(e, 'The call could not be placed.'));
      this.callState.set('idle');
      this.call.set(null);
    }
  }

  async hangup(): Promise<void> {
    if (this.callState() === 'ringing-in') {
      await this.simpleUser?.decline();
    } else {
      await this.simpleUser?.hangup();
    }
  }

  async answer(): Promise<void> {
    await this.simpleUser?.answer();
  }

  async decline(): Promise<void> {
    await this.simpleUser?.decline();
  }

  toggleMute(): void {
    const next = !this.muted();
    this.muted.set(next);

    if (next) this.simpleUser?.mute();
    else this.simpleUser?.unmute();
  }

  sendDigit(digit: string): void {
    void this.simpleUser?.sendDTMF(digit);
  }
}
