import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from '@abp/ng.core';
import { Subject } from 'rxjs';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';

import { environment } from '../../../environments/environment';

export interface InboxEvent {
  readonly kind: 'conversationChanged' | 'messageAdded' | 'messageStatusChanged';
  readonly conversationId: string;
  readonly messageId?: string;
  readonly direction?: string;
  readonly status?: string;
}

/**
 * The browser half of the real-time inbox (M06-1).
 *
 * Connects to the `inbox` SignalR hub, joins the tenant group automatically and the
 * open conversation on request. Every server push is a "refetch this" signal — the
 * payload never carries a rendered message — so the consumer just reloads whatever
 * the event names.
 */
@Injectable({ providedIn: 'root' })
export class InboxRealtimeService {
  private readonly eventStream = new Subject<InboxEvent>();
  readonly events$ = this.eventStream.asObservable();
  private readonly auth = inject(AuthService);

  private connection?: HubConnection;
  private subscribedConversationId: string | null = null;

  /** The most recent event. A signal so a component `effect` can react to it. */
  readonly lastEvent = signal<InboxEvent | null>(null);
  /**
   * A WhatsApp call just started ringing in this workspace (the call's id). Kept apart from `lastEvent` so it doesn't reload the
   * inbox: the call bar asks the API whether it rings for this agent.
   */
  readonly callRinging = signal<{ callId: string } | null>(null);
  readonly connected = signal(false);

  async connect(): Promise<void> {
    if (this.connection) {
      return;
    }

    const base = environment.apis['AutoReach']?.url ?? environment.apis.default.url;

    this.connection = new HubConnectionBuilder()
      .withUrl(`${base}/signalr-hubs/inbox`, {
        accessTokenFactory: () => this.auth.getAccessToken(),
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    for (const kind of ['conversationChanged', 'messageAdded', 'messageStatusChanged'] as const) {
      this.connection.on(kind, (payload: Omit<InboxEvent, 'kind'>) => {
        const event = { kind, ...payload };
        this.lastEvent.set(event);
        this.eventStream.next(event);
      });
    }
    // A new object each time, so the same call ringing again (an IVR queue after the menu) still notifies.
    this.connection.on('callRinging', (payload: { callId: string }) =>
      this.callRinging.set({ callId: payload.callId }),
    );

    this.connection.onreconnecting(() => this.connected.set(false));
    this.connection.onreconnected(async () => {
      this.connected.set(true);
      if (this.subscribedConversationId) {
        await this.invoke('SubscribeToConversation', this.subscribedConversationId);
      }
    });
    this.connection.onclose(() => this.connected.set(false));

    try {
      await this.connection.start();
      this.connected.set(true);
    } catch {
      // The inbox still works over REST; realtime is an enhancement, not a dependency.
      this.connected.set(false);
    }
  }

  async watchConversation(conversationId: string | null): Promise<void> {
    if (this.subscribedConversationId === conversationId) {
      return;
    }
    const previous = this.subscribedConversationId;
    this.subscribedConversationId = conversationId;

    if (this.connection?.state !== HubConnectionState.Connected) {
      return;
    }
    if (previous) {
      await this.invoke('UnsubscribeFromConversation', previous);
    }
    if (conversationId) {
      await this.invoke('SubscribeToConversation', conversationId);
    }
  }

  private async invoke(method: string, arg: string): Promise<void> {
    try {
      await this.connection?.invoke(method, arg);
    } catch {
      /* transient — reconnect handler re-subscribes */
    }
  }
}
