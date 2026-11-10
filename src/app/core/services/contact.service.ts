import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, forkJoin, map } from 'rxjs';
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

  private readonly contactsResource = rxResource({
    params: () => ({
      filter: this.filter(),
      accountId: this.accountId() || undefined,
      includeSubsidiaries: this.accountId() ? this.includeSubsidiaries() : undefined,
      skipCount: this.skipCount(),
      maxResultCount: this.maxResultCount(),
    }),
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
    params: () => ({}),
    stream: () =>
      this.segmentApi
        .getList({ skipCount: 0, maxResultCount: 100 })
        .pipe(map((page) => (page.items ?? []).map(toSegment))),
    defaultValue: [] as Segment[],
  });

  private readonly suppressionResource = rxResource({
    params: () => ({}),
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

  readonly contacts = computed<readonly Contact[]>(
    () => settled(this.contactsResource, { items: [] as Contact[], totalCount: 0 }).items,
  );

  readonly totalCount = computed(
    () => settled(this.contactsResource, { items: [] as Contact[], totalCount: 0 }).totalCount,
  );

  readonly segments = computed<readonly Segment[]>(() =>
    settled(this.segmentsResource, [] as Segment[]),
  );

  readonly suppression = computed<readonly Segment[]>(() =>
    settled(this.suppressionResource, [] as Segment[]),
  );

  readonly loading = computed(() => this.contactsResource.isLoading());
  readonly loadError = computed(() => !!this.contactsResource.error());
  readonly suppressionLoading = computed(() => this.suppressionResource.isLoading());
  readonly suppressionError = computed(() => !!this.suppressionResource.error());

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
    await firstValueFrom(this.api.create(input));
    this.reload();
  }

  async update(id: string, input: CreateUpdateContactDto): Promise<void> {
    await firstValueFrom(this.api.update(id, input));
    this.reload();
  }

  async delete(id: string): Promise<void> {
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
