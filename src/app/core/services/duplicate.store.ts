import { computed, inject, Injectable, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ChannelKind } from '../../proxy/channels';
import {
  ChannelMergeMode,
  ConsentScope,
  ContactDuplicatePairDto,
  ContactMergeDto,
  ContactMergePreviewDto,
  ContactMergeService,
  DuplicateConfidence,
  DuplicateReason,
  SuppressionReason,
} from '../../proxy/contacts';
import { settled } from '../util/resource';

/** Sample pairs for the mock-data build, so the screen is not empty offline. */
const MOCK_PAIRS: ContactDuplicatePairDto[] = [
  {
    confidence: DuplicateConfidence.High,
    reasons: [DuplicateReason.SameEmail],
    suggestedSurvivorId: 'm-1',
    first: {
      id: 'm-1',
      displayName: 'Rahul Sharma',
      companyName: 'Meridian Pumps',
      waId: '919811100001',
      emailAddress: 'rahul@meridian.in',
    },
    second: {
      id: 'm-2',
      displayName: 'R. Sharma',
      companyName: 'Meridian Pumps Pvt Ltd',
      waId: null,
      emailAddress: 'rahul@meridian.in',
      hasInstagram: true,
    },
  },
  {
    confidence: DuplicateConfidence.Medium,
    reasons: [DuplicateReason.SameNameOnDifferentChannels],
    suggestedSurvivorId: 'm-3',
    first: {
      id: 'm-3',
      displayName: 'Priya Nair',
      companyName: 'Sanand Press Works',
      waId: '919822200003',
    },
    second: { id: 'm-4', displayName: 'Priya Nair', hasMessenger: true },
  },
];

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
  private readonly dismissedMock = signal<ReadonlySet<string>>(new Set());

  private readonly resource = rxResource({
    params: () =>
      environment.useMockData ? undefined : { tick: this.reloadTick(), high: this.highOnly() },
    stream: ({ params }) =>
      this.api
        .getDuplicates({ highConfidenceOnly: params.high, maxResultCount: 100 })
        .pipe(map((page) => ({ items: page.items ?? [], total: page.totalCount ?? 0 }))),
    defaultValue: { items: [] as ContactDuplicatePairDto[], total: 0 },
  });

  readonly loading = computed(() => !environment.useMockData && this.resource.isLoading());
  readonly failed = computed(() => !environment.useMockData && this.resource.error() != null);

  readonly pairs = computed<readonly ContactDuplicatePairDto[]>(() => {
    if (environment.useMockData) {
      const gone = this.dismissedMock();
      return MOCK_PAIRS.filter(
        (p) =>
          !gone.has(p.first!.id!) &&
          (!this.highOnly() || p.confidence === DuplicateConfidence.High),
      );
    }
    return settled(this.resource, { items: [] as ContactDuplicatePairDto[], total: 0 }).items;
  });

  /** Pairs beyond the ones listed — the server pages at 100. */
  readonly moreThanShown = computed(() =>
    environment.useMockData
      ? 0
      : Math.max(
          0,
          settled(this.resource, { items: [] as ContactDuplicatePairDto[], total: 0 }).total -
            this.pairs().length,
        ),
  );

  reload(): void {
    this.reloadTick.update((n) => n + 1);
  }

  async preview(input: ContactMergeDto): Promise<ContactMergePreviewDto> {
    if (environment.useMockData) {
      return this.mockPreview(input);
    }
    return firstValueFrom(this.api.previewMerge(input));
  }

  async merge(input: ContactMergeDto): Promise<void> {
    if (environment.useMockData) {
      this.dismissedMock.update((s) => new Set(s).add(input.survivorId!).add(input.loserId!));
      return;
    }
    await firstValueFrom(this.api.merge(input));
    this.reload();
  }

  async dismiss(a: string, b: string): Promise<void> {
    if (environment.useMockData) {
      this.dismissedMock.update((s) => new Set(s).add(a).add(b));
      return;
    }
    await firstValueFrom(this.api.dismissDuplicate({ contactAId: a, contactBId: b }));
    this.reload();
  }

  private mockPreview(input: ContactMergeDto): ContactMergePreviewDto {
    return {
      survivorId: input.survivorId,
      loserId: input.loserId,
      conflicts: [
        {
          field: 'DisplayName',
          survivorValue: 'Rahul Sharma',
          loserValue: 'R. Sharma',
          needsChoice: true,
        },
        {
          field: 'InstagramIgsid',
          survivorValue: null,
          loserValue: '17841400000000001',
          needsChoice: false,
        },
      ],
      resultingScope: ConsentScope.UtilityOnly,
      resultingSuppression: SuppressionReason.None,
      resultingTags: [],
      consentNarrowed: false,
      suppressionAdded: false,
      channels: [
        {
          channel: ChannelKind.Instagram,
          mode: ChannelMergeMode.AdoptFromLoser,
          resultingScope: ConsentScope.UtilityOnly,
          resultingSuppression: SuppressionReason.None,
        },
      ],
      addressesGained: ['InstagramIgsid'],
      conversationsToMove: 1,
      messagesToMove: 14,
      enquiriesToMove: 0,
      quotationsToMove: 1,
      assetsToMove: 0,
    };
  }
}
