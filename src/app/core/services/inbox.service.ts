import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { InboxService as InboxApi } from '../../proxy/messaging';
import { toConversation, toMessage } from '../api/mapping';
import { Conversation } from '../models/conversation.model';
import { InboxRealtimeService } from '../realtime/inbox-realtime.service';
import { settled } from '../util/resource';

const inHours = (h: number) => new Date(Date.now() + h * 3_600_000);

/**
 * Team inbox store.
 *
 * The conversation list and the selected thread's messages are two resources on
 * purpose. A 50-row list that carried every message would be a large payload for
 * data nobody is looking at, and the thread has to refetch on its own when an
 * agent switches conversations.
 */
@Injectable({ providedIn: 'root' })
export class InboxService {
  private readonly api = inject(InboxApi);
  private readonly realtime = inject(InboxRealtimeService);

  readonly filter = signal('');
  readonly unreadOnly = signal(false);
  readonly windowClosingSoon = signal(false);
  /** Only one agent's conversations (Analytics links here from its agent table); null for everyone's. */
  readonly assignee = signal<{ id: string; name: string } | null>(null);

  constructor() {
    if (environment.useMockData) {
      return;
    }

    void this.realtime.connect();

    // Keep the hub subscribed to whichever thread is open.
    effect(() => {
      void this.realtime.watchConversation(this.selectedId());
    });

    // Every push is a "refetch this" signal.
    effect(() => {
      const event = this.realtime.lastEvent();
      if (!event) return;

      untracked(() => {
        this.listResource.reload();
        this.countsResource.reload();
        if (event.conversationId === this.selectedId() && event.kind !== 'conversationChanged') {
          this.messagesResource.reload();
        }
      });
    });
  }

  private readonly seed: readonly Conversation[] = [
    {
      id: 'c-1',
      contactName: 'Sandeep Rao',
      company: 'Meridian Foods · Pune',
      phoneE164: '+91 98220 11xxx',
      snippet: 'Can you share the wiring drawing for the…',
      at: '11:04',
      unread: 1,
      window: { expiresAt: inHours(3.8) },
      messages: [
        {
          id: 'm1',
          direction: 'out',
          at: '09:12',
          status: 'read',
          body: 'Good morning Sandeep — your AMC for the palletiser line (VX-PL-4417) is due for renewal on 30 September. Shall I send the renewal quote?',
        },
        {
          id: 'm2',
          direction: 'in',
          at: '10:48',
          body: 'Yes please. Also the line 3 drive is tripping on overload once a shift.',
        },
        {
          id: 'm3',
          direction: 'out',
          at: '10:52',
          status: 'read',
          body: 'Noted. I have raised service ticket SR-1184 for the line 3 drive — an engineer will call today.',
        },
        {
          id: 'm4',
          direction: 'in',
          at: '11:04',
          body: 'Can you share the wiring drawing for the drive panel as well? We changed the motor last year.',
        },
      ],
    },
    {
      id: 'c-2',
      contactName: 'Priya Nambiar',
      company: 'Kanpur Polymers · Maintenance',
      phoneE164: '+91 99360 22xxx',
      snippet: 'The AMC quote looks fine. Sending the PO…',
      at: '10:37',
      unread: 0,
      window: { expiresAt: inHours(2.1) },
      messages: [],
    },
    {
      id: 'c-3',
      contactName: 'Devendra Joshi',
      company: 'Sanand Press Works',
      phoneE164: '+91 90990 33xxx',
      snippet: 'Calibration certificate please',
      at: 'Yesterday',
      unread: 0,
      window: { expiresAt: null },
      messages: [],
    },
    {
      id: 'c-4',
      contactName: 'Anitha Menon',
      company: 'Hosur Machine Tools',
      phoneE164: '+91 94440 55xxx',
      snippet: 'What is the lead time on the servo pack?',
      at: 'Yesterday',
      unread: 0,
      window: { expiresAt: inHours(0.4) },
      messages: [],
    },
  ];

  private readonly _selectedId = signal<string | null>(null);

  private readonly listResource = rxResource({
    params: () =>
      environment.useMockData
        ? undefined
        : {
            filter: this.filter(),
            unreadOnly: this.unreadOnly(),
            windowClosingSoon: this.windowClosingSoon(),
            assignedUserId: this.assignee()?.id,
            skipCount: 0,
            maxResultCount: 50,
          },
    stream: ({ params }) =>
      this.api
        .getConversations(params)
        .pipe(map((page) => (page.items ?? []).map((dto) => toConversation(dto)))),
    defaultValue: [] as Conversation[],
  });

  private readonly countsResource = rxResource({
    params: () => (environment.useMockData ? undefined : {}),
    stream: () => this.api.getCounts(),
    defaultValue: { all: 0, unassigned: 0, mine: 0, unread: 0, windowClosingSoon: 0, snoozed: 0 },
  });

  private readonly messagesResource = rxResource({
    params: () => {
      const id = this.selectedId();
      return environment.useMockData || !id ? undefined : id;
    },
    stream: ({ params: conversationId }) =>
      this.api.getMessages(conversationId as string, { skipCount: 0, maxResultCount: 100 }).pipe(
        // The API returns newest first for paging; the thread reads oldest first.
        map((page) =>
          (page.items ?? []).map((m) => toMessage(m, conversationId as string)).reverse(),
        ),
      ),
    defaultValue: [] as ReturnType<typeof toMessage>[],
  });

  readonly conversations = computed<readonly Conversation[]>(() =>
    environment.useMockData ? this.seed : settled(this.listResource, [] as Conversation[]),
  );

  readonly selectedId = computed(() => this._selectedId() ?? this.conversations()[0]?.id ?? null);

  readonly selected = computed<Conversation | undefined>(() => {
    const conversation = this.conversations().find((c) => c.id === this.selectedId());
    if (!conversation) return undefined;

    return environment.useMockData
      ? conversation
      : {
          ...conversation,
          messages: settled(this.messagesResource, [] as ReturnType<typeof toMessage>[]),
        };
  });

  readonly unassignedCount = computed(() =>
    environment.useMockData
      ? 12
      : settled(this.countsResource, {
          all: 0,
          unassigned: 0,
          mine: 0,
          unread: 0,
          windowClosingSoon: 0,
          snoozed: 0,
        }).unassigned,
  );

  readonly unreadTotal = computed(() =>
    environment.useMockData
      ? this.conversations().reduce((n, c) => n + c.unread, 0)
      : settled(this.countsResource, {
          all: 0,
          unassigned: 0,
          mine: 0,
          unread: 0,
          windowClosingSoon: 0,
          snoozed: 0,
        }).unread,
  );

  readonly loading = computed(() => !environment.useMockData && this.listResource.isLoading());

  select(id: string): void {
    this._selectedId.set(id);
  }

  /** Send a free-form reply. Only valid while the 24-hour window is open. */
  async sendText(text: string): Promise<void> {
    const id = this.selectedId();
    const body = text.trim();
    if (!id || !body) return;
    await this.dispatch(id, { text: body });
  }

  /** AI-drafted reply options for the composer (M06-12). */
  async suggestReplies(): Promise<string[]> {
    const id = this.selectedId();
    if (!id) return [];
    if (environment.useMockData) {
      const last = (this.selected()?.snippet ?? '').toLowerCase();
      const hi = 'Hi,';
      const picks: string[] = [];
      if (/price|quote|cost|rate/.test(last))
        picks.push(
          `${hi} thanks for your interest. I'll prepare a quotation and send it across shortly — could you confirm the quantity and the delivery location?`,
        );
      if (/delivery|lead time|when|how long/.test(last))
        picks.push(
          `${hi} current lead time is about 2–3 weeks from order confirmation. I'll confirm the exact date once the order is placed.`,
        );
      if (picks.length === 0)
        picks.push(
          `${hi} thanks for your message — noted. Let me check the details and get back to you today.`,
          `${hi} could you share a little more detail so I can point you to the right person?`,
        );
      picks.push(`${hi} happy to jump on a quick call if that's easier — what time works for you?`);
      return picks;
    }
    const result = await firstValueFrom(this.api.suggestReplies(id));
    return result.suggestions ?? [];
  }

  /**
   * Send a document from the library, with an optional caption. The API resolves
   * the stored file and its media handle — this only carries the id and the text.
   */
  async sendDocument(libraryDocumentId: string, caption?: string): Promise<void> {
    const id = this.selectedId();
    if (!id) return;
    await this.dispatch(id, {
      libraryDocumentId,
      text: caption?.trim() || undefined,
    });
  }

  /** Send an ad-hoc file the agent picked (not from the library). M06-6. */
  async sendMedia(file: File, caption?: string): Promise<void> {
    const id = this.selectedId();
    if (!id || environment.useMockData) return;
    const body = new FormData();
    body.append('file', file, file.name);
    if (caption?.trim()) body.append('caption', caption.trim());
    await firstValueFrom(this.api.sendMedia(id, body));
    this.afterSend();
  }

  /** Send a location pin. M06-6. */
  async sendLocation(
    latitude: number,
    longitude: number,
    name?: string,
    address?: string,
  ): Promise<void> {
    const id = this.selectedId();
    if (!id || environment.useMockData) return;
    await firstValueFrom(
      this.api.sendLocation(id, {
        latitude,
        longitude,
        name: name?.trim() || undefined,
        address: address?.trim() || undefined,
      }),
    );
    this.afterSend();
  }

  /** Send a message with up to three reply buttons. M06-6. */
  async sendButtons(
    bodyText: string,
    footerText: string | undefined,
    buttons: { title: string }[],
  ): Promise<void> {
    const id = this.selectedId();
    if (!id || environment.useMockData) return;
    await firstValueFrom(
      this.api.sendInteractive(id, {
        bodyText: bodyText.trim(),
        footerText: footerText?.trim() || undefined,
        buttons: buttons.filter((b) => b.title.trim()).map((b) => ({ title: b.title.trim() })),
      }),
    );
    this.afterSend();
  }

  private async dispatch(
    conversationId: string,
    input: { text?: string; libraryDocumentId?: string },
  ): Promise<void> {
    if (environment.useMockData) {
      return;
    }
    await firstValueFrom(this.api.send(conversationId, input));
    this.afterSend();
  }

  private afterSend(): void {
    this.messagesResource.reload();
    this.listResource.reload();
  }

  reload(): void {
    this.listResource.reload();
    this.countsResource.reload();
    this.messagesResource.reload();
  }
}
