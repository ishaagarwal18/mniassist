import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { rxResource, toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom, map, bufferTime, filter } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';
import { InboxService as InboxApi } from '../../proxy/messaging';
import { toConversation, toMessage } from '../api/mapping';
import { Conversation } from '../models/conversation.model';
import { InboxRealtimeService } from '../realtime/inbox-realtime.service';
import { settled } from '../util/resource';

/**
 * Team inbox store.
 *
 * The conversation list and the selected thread's messages are two resources on
 * purpose. A 50-row list that carried every message would be a large payload for
 * data nobody is looking at, and the thread has to refetch on its own when an
 * agent switches conversations.
 */
import { ConversationState } from '../../proxy/messaging/conversation-state.enum';
@Injectable({ providedIn: 'root' })
export class InboxService {
  private readonly router = inject(Router);
  private readonly path = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects.split(/[?#]/)[0]),
    ),
    { initialValue: this.router.url },
  );
  private readonly viewingInbox = computed(() => this.path().split('?')[0] === '/inbox');
  private readonly api = inject(InboxApi);
  private readonly realtime = inject(InboxRealtimeService);

  readonly filter = signal('');
  readonly unreadOnly = signal(false);
  /** Open, snoozed or closed; null shows every state. */
  readonly state = signal<ConversationState | null>(null);
  readonly windowClosingSoon = signal(false);
  /** Only one agent's conversations (Analytics links here from its agent table); null for everyone's. */
  readonly assignee = signal<{ id: string; name: string } | null>(null);

  constructor() {
    void this.realtime.connect();

    // Keep the hub subscribed to whichever thread is open.
    effect(() => {
      void this.realtime.watchConversation(this.viewingInbox() ? this.selectedId() : null);
    });

    // Preserve every event in a burst, but fetch each affected resource only once.
    this.realtime.events$
      .pipe(
        bufferTime(100),
        filter((events) => events.length > 0),
        takeUntilDestroyed(),
      )
      .subscribe((events) => {
        if (events.some((event) => event.kind !== 'messageStatusChanged')) {
          this.countsResource.reload();
          if (this.viewingInbox()) this.listResource.reload();
        }
        if (
          this.viewingInbox() &&
          events.some(
            (event) =>
              event.conversationId === this.selectedId() && event.kind !== 'conversationChanged',
          )
        )
          this.messagesResource.reload();
      });
  }

  private readonly _selectedId = signal<string | null>(null);

  private readonly listResource = rxResource({
    params: () =>
      !this.viewingInbox()
        ? undefined
        : {
            filter: this.filter(),
            state: this.state() ?? undefined,
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
    params: () => ({}),
    stream: () => this.api.getCounts(),
    defaultValue: { all: 0, unassigned: 0, mine: 0, unread: 0, windowClosingSoon: 0, snoozed: 0 },
  });

  private readonly messagesResource = rxResource({
    params: () => {
      const id = this.selectedId();
      return !this.viewingInbox() || !id ? undefined : id;
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
    settled(this.listResource, [] as Conversation[]),
  );

  readonly selectedId = computed(() => this._selectedId() ?? this.conversations()[0]?.id ?? null);

  readonly selected = computed<Conversation | undefined>(() => {
    const conversation = this.conversations().find((c) => c.id === this.selectedId());
    if (!conversation) return undefined;

    return {
      ...conversation,
      messages: settled(this.messagesResource, [] as ReturnType<typeof toMessage>[]),
    };
  });

  /** How many conversations each filter would show, for the filter panel. */
  readonly counts = computed(() =>
    settled(this.countsResource, {
      all: 0,
      unassigned: 0,
      mine: 0,
      unread: 0,
      windowClosingSoon: 0,
      snoozed: 0,
    }),
  );

  /** True once the list has answered, so "empty" means empty and not "still loading". */
  readonly listLoaded = computed(() => this.listResource.status() !== 'loading');

  readonly unassignedCount = computed(
    () =>
      settled(this.countsResource, {
        all: 0,
        unassigned: 0,
        mine: 0,
        unread: 0,
        windowClosingSoon: 0,
        snoozed: 0,
      }).unassigned,
  );

  readonly unreadTotal = computed(
    () =>
      settled(this.countsResource, {
        all: 0,
        unassigned: 0,
        mine: 0,
        unread: 0,
        windowClosingSoon: 0,
        snoozed: 0,
      }).unread,
  );

  readonly loading = computed(() => this.listResource.isLoading());

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
    if (!id) return;
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
    if (!id) return;
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
    if (!id) return;
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
