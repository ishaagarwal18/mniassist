import { computed, inject, Injectable, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';
import {
  ContactDuplicatePairDto,
  ContactMergeDto,
  ContactMergePreviewDto,
  ContactMergeService,
} from '../../proxy/contacts';
import { settled } from '../util/resource';

/**
 * Suspected duplicate contacts and the merge that resolves them. Detection only suggests: the list is a
 * worklist, and nothing changes until someone previews a merge and confirms it.
 */
@Injectable({ providedIn: 'root' })
export class DuplicateStore {
  private readonly api = inject(ContactMergeService);

  /** Near-certain matches only (same phone or email). */
  readonly highOnly = signal(false);
  private readonly reloadTick = signal(0);

  private readonly resource = rxResource({
    params: () => ({ tick: this.reloadTick(), high: this.highOnly() }),
    stream: ({ params }) =>
      this.api
        .getDuplicates({ highConfidenceOnly: params.high, maxResultCount: 100 })
        .pipe(map((page) => ({ items: page.items ?? [], total: page.totalCount ?? 0 }))),
    defaultValue: { items: [] as ContactDuplicatePairDto[], total: 0 },
  });

  readonly loading = computed(() => this.resource.isLoading());
  readonly failed = computed(() => this.resource.error() != null);

  readonly pairs = computed<readonly ContactDuplicatePairDto[]>(() => {
    return settled(this.resource, { items: [] as ContactDuplicatePairDto[], total: 0 }).items;
  });

  /** Pairs beyond the ones listed — the server pages at 100. */
  readonly moreThanShown = computed(() =>
    Math.max(
      0,
      settled(this.resource, { items: [] as ContactDuplicatePairDto[], total: 0 }).total -
        this.pairs().length,
    ),
  );

  reload(): void {
    this.reloadTick.update((n) => n + 1);
  }

  async preview(input: ContactMergeDto): Promise<ContactMergePreviewDto> {
    return firstValueFrom(this.api.previewMerge(input));
  }

  async merge(input: ContactMergeDto): Promise<void> {
    await firstValueFrom(this.api.merge(input));
    this.reload();
  }

  async dismiss(a: string, b: string): Promise<void> {
    await firstValueFrom(this.api.dismissDuplicate({ contactAId: a, contactBId: b }));
    this.reload();
  }
}
