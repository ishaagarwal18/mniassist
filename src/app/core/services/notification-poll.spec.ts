import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ConfigStateService, PermissionService } from '@abp/ng.core';
import { BehaviorSubject, of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationService } from '../../proxy/notifications';
import { InvoiceService, ReconciliationService } from '../../proxy/billing';
import { WebhookSubscriptionService } from '../../proxy/integrations';
import { SupportAccessService } from '../../proxy/platform';
import { OpsService } from './ops.service';

/** The bell polls notification/summary so new notifications show without a page reload. */
describe('notification bell poll', () => {
  let list: { id: string; isRead: boolean }[];
  let summary: {
    unreadCount: number;
    unreadCriticalCount: number;
    mostRecent: { id: string } | null;
  };
  let getList: ReturnType<typeof vi.fn>;
  let getSummary: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    list = [{ id: 'n1', isRead: false }];
    summary = { unreadCount: 250, unreadCriticalCount: 0, mostRecent: { id: 'n1' } };
    getList = vi.fn(() => of({ items: list.map((n) => ({ ...n })) }));
    getSummary = vi.fn(() => of({ ...summary }));
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ConfigStateService,
          useValue: { getOne$: () => of({ isAuthenticated: true }) },
        },
        { provide: Router, useValue: { url: '/home', events: new BehaviorSubject(null) } },
        {
          provide: PermissionService,
          useValue: { getGrantedPolicy: () => false, getGrantedPolicy$: () => of(false) },
        },
        {
          provide: NotificationService,
          useValue: {
            getList,
            getSummary,
            markRead: () => of(undefined),
            markAllRead: () => of(undefined),
          },
        },
        { provide: WebhookSubscriptionService, useValue: { getList: () => of({ items: [] }) } },
        { provide: InvoiceService, useValue: { getList: () => of({ items: [] }) } },
        { provide: ReconciliationService, useValue: { getList: () => of({ items: [] }) } },
        {
          provide: SupportAccessService,
          useValue: { getMyGrants: () => of([]), getSessionHistory: () => of({ items: [] }) },
        },
      ],
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  it('counts every unread notification, not just the ones loaded', async () => {
    const ops = TestBed.inject(OpsService);
    TestBed.tick();
    await vi.waitFor(() => expect(getSummary).toHaveBeenCalled());
    await vi.waitFor(() => expect(ops.unreadCount()).toBe(250));
  });

  it('reloads the list when a newer notification arrives', async () => {
    const ops = TestBed.inject(OpsService);
    TestBed.tick();
    await vi.waitFor(() => expect(ops.notifications().length).toBe(1));
    const before = getList.mock.calls.length;

    list = [{ id: 'n2', isRead: false }, ...list];
    summary = { ...summary, unreadCount: 251, mostRecent: { id: 'n2' } };
    await ops.pollSummary();
    TestBed.tick();

    await vi.waitFor(() => expect(getList.mock.calls.length).toBeGreaterThan(before));
    await vi.waitFor(() => expect(ops.notifications()[0]?.id).toBe('n2'));
  });

  it('drops the badge at once when one is marked read', async () => {
    const ops = TestBed.inject(OpsService);
    TestBed.tick();
    await vi.waitFor(() => expect(ops.unreadCount()).toBe(250));
    await vi.waitFor(() => expect(ops.notifications().length).toBe(1));

    ops.markRead('n1');

    expect(ops.unreadCount()).toBe(249);
  });
});
