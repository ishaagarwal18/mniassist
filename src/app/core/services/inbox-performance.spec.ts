import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { InboxService as InboxApi } from '../../proxy/messaging';
import { ConversationLabelService } from '../../proxy/messaging/conversation-label.service';
import { InboxEvent, InboxRealtimeService } from '../realtime/inbox-realtime.service';
import { InboxService } from './inbox.service';

describe('inbox request scheduling', () => {
  let navigation: Subject<NavigationEnd>;
  let events: Subject<InboxEvent>;
  let list: ReturnType<typeof vi.fn>;
  let counts: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    navigation = new Subject();
    events = new Subject();
    list = vi.fn(() => of({ items: [] }));
    counts = vi.fn(() => of({ all: 0, unread: 0 }));
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { url: '/home', events: navigation } },
        { provide: InboxApi, useValue: { getConversations: list, getCounts: counts } },
        { provide: ConversationLabelService, useValue: { setStatus: () => of(undefined) } },
        {
          provide: InboxRealtimeService,
          useValue: {
            events$: events,
            connect: () => Promise.resolve(),
            watchConversation: () => Promise.resolve(),
          },
        },
      ],
    });
  });

  it('loads the badge on home and fetches conversations only on entering inbox', async () => {
    TestBed.inject(InboxService);
    TestBed.tick();
    await vi.waitFor(() => expect(counts).toHaveBeenCalledTimes(1));
    expect(list).not.toHaveBeenCalled();
    navigation.next(new NavigationEnd(1, '/inbox', '/inbox'));
    TestBed.tick();
    await vi.waitFor(() => expect(list).toHaveBeenCalledTimes(1));
  });

  it('coalesces message bursts and skips count reloads for delivery status changes', async () => {
    TestBed.inject(InboxService);
    TestBed.tick();
    await vi.waitFor(() => expect(counts).toHaveBeenCalledTimes(1));
    for (let i = 0; i < 20; i++) events.next({ kind: 'messageAdded', conversationId: 'one' });
    await vi.waitFor(() => {
      TestBed.tick();
      expect(counts).toHaveBeenCalledTimes(2);
    });
    events.next({ kind: 'messageStatusChanged', conversationId: 'one' });
    await new Promise((resolve) => setTimeout(resolve, 150));
    TestBed.tick();
    expect(counts).toHaveBeenCalledTimes(2);
    expect(list).not.toHaveBeenCalled();
  });
});
