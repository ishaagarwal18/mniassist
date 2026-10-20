import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { ContactService } from './contact.service';
import {
  ContactService as ContactApi,
  SegmentService,
  SuppressionReason,
} from '../../proxy/contacts';
import type { ContactDto, GetContactListInput } from '../../proxy/contacts';

describe('contact loading and suppression totals', () => {
  let service: ContactService;
  let list: Subject<{ items: ContactDto[]; totalCount: number }>;
  let buckets: Map<SuppressionReason, Subject<{ totalCount: number }>>;
  let getList: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    list = new Subject();
    buckets = new Map();
    getList = vi.fn((input: GetContactListInput) => {
      if (input.suppression == null) return list;
      const result = new Subject<{ totalCount: number }>();
      buckets.set(input.suppression, result);
      return result;
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: ContactApi, useValue: { getList, delete: vi.fn(() => of(undefined)) } },
        { provide: SegmentService, useValue: { getList: () => of({ items: [] }) } },
      ],
    });
    service = TestBed.inject(ContactService);
    TestBed.tick();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('stays busy until contacts arrive and exposes failures for retry', async () => {
    expect(service.loading()).toBe(true);
    list.error(new Error('network'));
    TestBed.tick();
    await vi.waitFor(() => expect(service.loading()).toBe(false));
    expect(service.loadError()).toBe(true);
    list = new Subject();
    service.reload();
    TestBed.tick();
    expect(service.loading()).toBe(true);
    list.next({ items: [], totalCount: 0 });
    list.complete();
    TestBed.tick();
    await vi.waitFor(() => expect(service.loading()).toBe(false));
    expect(service.loadError()).toBe(false);
  });

  it('uses full server totals for all four WhatsApp reasons, independent of the grid page', async () => {
    const reasons = [
      SuppressionReason.OptedOut,
      SuppressionReason.AllMessagesOptedOut,
      SuppressionReason.InvalidNumber,
      SuppressionReason.BlockedByUser,
    ];
    expect(service.suppressionLoading()).toBe(true);
    reasons.forEach((reason, index) => {
      expect(getList).toHaveBeenCalledWith({
        suppression: reason,
        skipCount: 0,
        maxResultCount: 1,
      });
      buckets.get(reason)!.next({ totalCount: index * 100 });
      buckets.get(reason)!.complete();
    });
    TestBed.tick();
    await vi.waitFor(() => expect(service.suppressionLoading()).toBe(false));
    expect(service.suppression().map((s) => [s.id, s.count])).toEqual([
      ['optout', 0],
      ['stopall', 100],
      ['invalid', 200],
      ['blocked', 300],
    ]);
  });

  it('exposes a failed bucket instead of presenting the counts as zero', async () => {
    buckets.get(SuppressionReason.OptedOut)!.error(new Error('network'));
    TestBed.tick();
    await vi.waitFor(() => expect(service.suppressionLoading()).toBe(false));
    expect(service.suppressionError()).toBe(true);
    expect(service.suppression()).toEqual([]);
  });

  it('refreshes suppression counts after deleting a contact', async () => {
    list.next({ items: [], totalCount: 0 });
    list.complete();
    for (const bucket of buckets.values()) {
      bucket.next({ totalCount: 1 });
      bucket.complete();
    }
    TestBed.tick();
    await vi.waitFor(() => {
      expect(service.loading()).toBe(false);
      expect(service.suppressionLoading()).toBe(false);
    });
    getList.mockClear();
    await service.delete('contact-id');
    TestBed.tick();
    expect(getList).toHaveBeenCalledTimes(5);
    expect(service.suppressionLoading()).toBe(true);
  });
});
