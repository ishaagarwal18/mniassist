import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, forkJoin, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ContactService as ContactApi,
  CreateUpdateContactDto,
  SegmentService as SegmentApi,
  SuppressionReason,
} from '../../proxy/contacts';
import { toContact, toSegment } from '../api/mapping';
import { Contact, Segment } from '../models/contact.model';
import { settled } from '../util/resource';

/**
 * Contacts, saved segments and the suppression buckets.
 *
 * The suppression counts are fetched as four filtered counts rather than derived
 * from the loaded page — a page of 50 contacts cannot tell you how many of 12,000
 * opted out, and showing a page-derived number as a total would be wrong in a way
 * nobody would notice until they trusted it.
 */
@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly api = inject(ContactApi);
  private readonly segmentApi = inject(SegmentApi);

  readonly filter = signal('');

  /** Show only contacts on this company account (empty = all). */
  readonly accountId = signal('');

  /** With an account chosen: also the contacts of every account beneath it. */
  readonly includeSubsidiaries = signal(true);
  readonly skipCount = signal(0);
  readonly maxResultCount = signal(50);

  private readonly seedSegments: readonly Segment[] = [
    { id: 'all', name: 'All contacts', count: 12_486 },
    { id: 'amc60', name: 'AMC expiring ≤ 60 days', count: 1_347 },
    { id: 'quoted', name: 'Quoted, no reply 7d', count: 284 },
    { id: 'dealers', name: 'Dealers — West', count: 196 },
    { id: 'expo', name: 'Exhibition 2026 leads', count: 612 },
  ];

  private readonly seedSuppression: readonly Segment[] = [
    { id: 'optout', name: 'Opted out', count: 412 },
    { id: 'stopall', name: 'Stopped all WhatsApp messages', count: 0 },
    { id: 'invalid', name: 'Invalid number', count: 118 },
    { id: 'blocked', name: 'Blocked by user', count: 54 },
  ];

  private readonly seedContacts = signal<Contact[]>([
    {
      id: 'p1',
      name: 'Sandeep Rao',
      phoneE164: '+91 98220 11xxx',
      company: 'Meridian Foods · Pune',
      attributes: {
        industry: 'Food & beverage',
        plantLocation: 'Chakan, Pune',
        systems: ['PLC + HMI', 'VFD'],
        decisionRole: 'Maintenance',
        capexBand: '₹10–50L',
      },
      consent: {
        source: 'website',
        evidence: 'IP 49.36.x.x',
        textVersion: 'v2',
        grantedAt: '14 Mar 2026',
      },
      amcExpiry: '30 Sep 2026',
      lastActivity: '2 hours ago',
      score: 84,
    },
    {
      id: 'p2',
      name: 'Priya Nambiar',
      phoneE164: '+91 99360 22xxx',
      company: 'Kanpur Polymers · Kanpur',
      attributes: {
        industry: 'Polymers',
        plantLocation: 'Kanpur',
        systems: ['SCADA', 'VFD'],
        decisionRole: 'Purchase',
      },
      consent: {
        source: 'website',
        evidence: 'IP 103.21.x.x',
        textVersion: 'v2',
        grantedAt: '02 Apr 2026',
      },
      amcExpiry: '11 Oct 2026',
      lastActivity: 'Today 10:37',
      score: 71,
    },
    {
      id: 'p3',
      name: 'Devendra Joshi',
      phoneE164: '+91 90990 33xxx',
      company: 'Sanand Press Works · Sanand',
      attributes: {
        industry: 'Metal forming',
        plantLocation: 'Sanand',
        systems: ['Servo', 'Vision'],
        decisionRole: 'Maintenance',
      },
      consent: {
        source: 'qr',
        evidence: 'wamid.HBg…9A2',
        textVersion: 'v2',
        grantedAt: '11 Feb 2026',
      },
      amcExpiry: '04 Oct 2026',
      lastActivity: 'Yesterday',
      score: 63,
    },
    {
      id: 'p4',
      name: 'Anitha Menon',
      phoneE164: '+91 94440 55xxx',
      company: 'Hosur Machine Tools · Hosur',
      attributes: {
        industry: 'Machine tools',
        plantLocation: 'Hosur',
        systems: ['Servo', 'PLC + HMI'],
        decisionRole: 'Engineering',
      },
      consent: {
        source: 'website',
        evidence: 'IP 45.118.x.x',
        textVersion: 'v2',
        grantedAt: '19 May 2026',
      },
      amcExpiry: '22 Sep 2026',
      lastActivity: 'Yesterday',
      score: 58,
    },
    {
      id: 'p5',
      name: 'Farhan Qureshi',
      phoneE164: '+91 98190 77xxx',
      company: 'Vasai Panel Systems · Vasai',
      attributes: {
        industry: 'Panel building',
        plantLocation: 'Vasai',
        systems: ['Panels', 'VFD'],
        decisionRole: 'Dealer',
      },
      consent: {
        source: 'manual',
        evidence: 'Dealer agreement DA-114',
        textVersion: 'v2',
        grantedAt: '08 Jan 2026',
      },
      lastActivity: '24 Aug',
      score: 44,
    },
    {
      id: 'p6',
      name: 'Lalitha Iyer',
      phoneE164: '+91 93440 88xxx',
      company: 'Coimbatore Textiles · Coimbatore',
      attributes: {
        industry: 'Textiles',
        plantLocation: 'Coimbatore',
        systems: ['SCADA', 'Drives'],
        decisionRole: 'Plant head',
      },
      consent: {
        source: 'ctwa',
        evidence: 'Ad 238114 · referral',
        textVersion: 'v2',
        grantedAt: '22 Aug 2026',
      },
      amcExpiry: '18 Oct 2026',
      lastActivity: '22 Aug',
      score: 32,
    },
    {
      id: 'p7',
      name: 'Imran Shaikh',
      phoneE164: '+91 91750 66xxx',
      company: 'Aurangabad Auto Parts · Waluj',
      attributes: {
        industry: 'Automotive',
        plantLocation: 'Waluj',
        systems: ['Robotics', 'PLC'],
        decisionRole: 'Purchase',
      },
      consent: {
        source: 'import',
        evidence: 'Batch IMP-0271 · signed form',
        textVersion: 'v1',
        grantedAt: '19 Jan 2026',
      },
      amcExpiry: '07 Oct 2026',
      lastActivity: '19 Aug',
      score: 21,
    },
  ]);

  private readonly contactsResource = rxResource({
    params: () =>
      environment.useMockData
        ? undefined
        : {
            filter: this.filter(),
            accountId: this.accountId() || undefined,
            includeSubsidiaries: this.accountId() ? this.includeSubsidiaries() : undefined,
            skipCount: this.skipCount(),
            maxResultCount: this.maxResultCount(),
          },
    stream: ({ params }) =>
      this.api.getList(params).pipe(
        map((page) => ({
          items: (page.items ?? []).map(toContact),
          totalCount: page.totalCount ?? 0,
        })),
      ),
    defaultValue: { items: [] as Contact[], totalCount: 0 },
  });

  private readonly segmentsResource = rxResource({
    params: () => (environment.useMockData ? undefined : {}),
    stream: () =>
      this.segmentApi
        .getList({ skipCount: 0, maxResultCount: 100 })
        .pipe(map((page) => (page.items ?? []).map(toSegment))),
    defaultValue: [] as Segment[],
  });

  private readonly suppressionResource = rxResource({
    params: () => (environment.useMockData ? undefined : {}),
    stream: () =>
      forkJoin({
        optout: this.countBy(SuppressionReason.OptedOut),
        stopall: this.countBy(SuppressionReason.AllMessagesOptedOut),
        invalid: this.countBy(SuppressionReason.InvalidNumber),
        blocked: this.countBy(SuppressionReason.BlockedByUser),
      }).pipe(
        map((counts) => [
          { id: 'optout', name: 'Opted out', count: counts.optout },
          { id: 'stopall', name: 'Stopped all WhatsApp messages', count: counts.stopall },
          { id: 'invalid', name: 'Invalid number', count: counts.invalid },
          { id: 'blocked', name: 'Blocked by user', count: counts.blocked },
        ]),
      ),
    defaultValue: [] as Segment[],
  });

  readonly contacts = computed<readonly Contact[]>(() =>
    environment.useMockData
      ? this.seedContacts()
      : settled(this.contactsResource, { items: [] as Contact[], totalCount: 0 }).items,
  );

  readonly totalCount = computed(() =>
    environment.useMockData
      ? this.seedContacts().length
      : settled(this.contactsResource, { items: [] as Contact[], totalCount: 0 }).totalCount,
  );

  readonly segments = computed<readonly Segment[]>(() =>
    environment.useMockData ? this.seedSegments : settled(this.segmentsResource, [] as Segment[]),
  );

  readonly suppression = computed<readonly Segment[]>(() =>
    environment.useMockData
      ? this.seedSuppression
      : settled(this.suppressionResource, [] as Segment[]),
  );

  readonly loading = computed(() => !environment.useMockData && this.contactsResource.isLoading());
  readonly loadError = computed(() => !environment.useMockData && !!this.contactsResource.error());
  readonly suppressionLoading = computed(
    () => !environment.useMockData && this.suppressionResource.isLoading(),
  );
  readonly suppressionError = computed(
    () => !environment.useMockData && !!this.suppressionResource.error(),
  );

  search(term: string): void {
    this.filter.set(term);
    this.skipCount.set(0);
  }

  /** Restricts the list to one account (or clears the restriction with an empty id) and returns to the first page. */
  filterByAccount(accountId: string): void {
    this.accountId.set(accountId);
    this.skipCount.set(0);
  }

  reload(): void {
    this.contactsResource.reload();
    this.segmentsResource.reload();
    this.suppressionResource.reload();
  }

  async create(input: CreateUpdateContactDto): Promise<void> {
    if (environment.useMockData) {
      const newContact: Contact = {
        id: `c-${Date.now()}`,
        name: input.displayName || input.waId,
        phoneE164: '+' + input.waId,
        company: input.companyName || '—',
        attributes: {
          decisionRole: 'Maintenance',
          ...input.attributes,
        },
        consent: {
          source: 'manual',
          evidence: 'Direct contact',
          textVersion: 'v1',
          grantedAt: new Date().toISOString(),
        },
        lastActivity: new Date().toISOString(),
        score: 50,
      };
      this.seedContacts.update((list) => [newContact, ...list]);
      return;
    }
    await firstValueFrom(this.api.create(input));
    this.reload();
  }

  async update(id: string, input: CreateUpdateContactDto): Promise<void> {
    if (environment.useMockData) {
      this.seedContacts.update((list) =>
        list.map((c) =>
          c.id === id
            ? {
                ...c,
                name: input.displayName ?? c.name,
                company: input.companyName ?? c.company,
                attributes: {
                  ...c.attributes,
                  ...input.attributes,
                },
              }
            : c,
        ),
      );
      return;
    }
    await firstValueFrom(this.api.update(id, input));
    this.reload();
  }

  async delete(id: string): Promise<void> {
    if (environment.useMockData) {
      this.seedContacts.update((list) => list.filter((c) => c.id !== id));
      return;
    }
    await firstValueFrom(this.api.delete(id));
    this.reload();
  }

  /** The total is independent of the single returned row and the grid's page. */
  private countBy(suppression: SuppressionReason) {
    return this.api
      .getList({ suppression, skipCount: 0, maxResultCount: 1 })
      .pipe(map((page) => page.totalCount ?? 0));
  }
}
