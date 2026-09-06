import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ContactDto } from '../../proxy/contacts';
import { SegmentDto, SegmentPreviewDto, SegmentService } from '../../proxy/contacts';
import { ContactLifecycle } from '../../proxy/contacts/contact-lifecycle.enum';
import { CampaignResponse } from '../../proxy/contacts/campaign-response.enum';
import { SuppressionReason } from '../../proxy/contacts/suppression-reason.enum';
import { QuotationState } from '../../proxy/pipeline/quotation-state.enum';
import { WalletService } from '../../proxy/billing';
import {
  EMPTY_RULE,
  SEGMENT_FIELDS,
  SavedSegment,
  SegmentGroup,
  SegmentPreview,
  addClauseAt,
  addGroupAt,
  removeNodeAt,
  ruleFromJson,
  ruleToJson,
  setGroupModeAt,
  updateClauseAt,
  type SegmentClause,
} from '../models/segment.model';

const LIFECYCLE = Object.fromEntries(
  Object.entries(ContactLifecycle).map(([k, v]) => [v, k]),
) as Record<number, string>;
const QUOTATION = Object.fromEntries(
  Object.entries(QuotationState).map(([k, v]) => [v, k]),
) as Record<number, string>;
const RESPONSE = Object.fromEntries(
  Object.entries(CampaignResponse).map(([k, v]) => [v, k]),
) as Record<number, string>;

const EMPTY_PREVIEW: SegmentPreview = {
  totalMatching: 0,
  marketingEligible: 0,
  utilityEligible: 0,
  optedOut: 0,
  suppressed: 0,
  insideServiceWindow: 0,
  matchesEveryone: true,
  problems: [],
  cost: [],
  sample: [],
};

/**
 * A worked example so the builder is reviewable with `useMockData` on: quoted-and-
 * lapsed AMC accounts, roughly the "chase the expired quotes" list. The numbers are a
 * fixed snapshot — the live recount runs server-side once the API is bound.
 */
const SEED_RULE: SegmentGroup = {
  mode: 'all',
  children: [
    { field: 'tag', op: 'eq', value: 'amc' },
    {
      mode: 'any',
      children: [
        { field: 'quotationState', op: 'eq', value: 'Expired' },
        { field: 'campaignResponse', op: 'lte', value: 'Delivered' },
      ],
    },
  ],
};

const SEED_PREVIEW: SegmentPreview = {
  totalMatching: 6,
  marketingEligible: 4,
  utilityEligible: 6,
  optedOut: 1,
  suppressed: 2,
  insideServiceWindow: 1,
  matchesEveryone: false,
  problems: [],
  cost: [
    {
      category: 'Marketing',
      recipients: 4,
      rateInPaise: 86.31,
      estimatedTotalInPaise: 345,
      exceedsWalletBalance: false,
    },
    {
      category: 'Utility',
      recipients: 6,
      rateInPaise: 11.5,
      estimatedTotalInPaise: 69,
      exceedsWalletBalance: false,
    },
    {
      category: 'Authentication',
      recipients: 6,
      rateInPaise: 12.8,
      estimatedTotalInPaise: 77,
      exceedsWalletBalance: false,
    },
  ],
  sample: [
    {
      id: 'c1',
      name: 'Rakesh Mehta',
      company: 'Aurus Pharma',
      designation: 'Sr. Manager, Projects',
      city: 'Vapi',
      lifecycle: 'Quoted',
      quotationState: 'Expired',
      lastCampaignResponse: 'Read',
      canReceiveMarketing: true,
      suppression: 'None',
    },
    {
      id: 'c4',
      name: 'Imran Shaikh',
      company: 'Kohinoor Textiles',
      designation: 'Maintenance In-charge',
      city: 'Bhiwandi',
      lifecycle: 'Quoted',
      quotationState: 'Issued',
      lastCampaignResponse: 'Delivered',
      canReceiveMarketing: true,
      suppression: 'None',
    },
    {
      id: 'c7',
      name: 'Deepa Rao',
      company: 'Nutriva Foods',
      designation: 'QA Manager',
      city: 'Hubli',
      lifecycle: 'Dormant',
      quotationState: 'Lost',
      lastCampaignResponse: 'Delivered',
      canReceiveMarketing: false,
      suppression: 'OptedOut',
    },
  ],
};

const SEED_SAVED: readonly SavedSegment[] = [
  {
    id: 's1',
    name: 'Lapsed quotes — AMC accounts',
    description: 'Quoted, past validity, no decision. The follow-up list.',
    rule: SEED_RULE,
    cachedMemberCount: 6,
    isCountStale: false,
    lastEvaluatedAt: new Date().toISOString(),
  },
  {
    id: 's2',
    name: 'Siemens plants in Gujarat',
    rule: {
      mode: 'all',
      children: [
        { field: 'state', op: 'eq', value: 'Gujarat' },
        { field: 'attr:plc_platform', op: 'eq', value: 'Siemens' },
      ],
    },
    cachedMemberCount: 2,
    isCountStale: true,
    lastEvaluatedAt: new Date(Date.now() - 6 * 86_400_000).toISOString(),
  },
  {
    id: 's3',
    name: 'Never replied, not over-messaged',
    description: 'Delivered but never engaged.',
    rule: { mode: 'all', children: [{ field: 'campaignResponse', op: 'lte', value: 'Delivered' }] },
    cachedMemberCount: 4,
    isCountStale: true,
    lastEvaluatedAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
  },
];

function enumName(map: Record<number, string>, value: number | undefined): string {
  return value != null ? (map[value] ?? 'Unknown') : 'Unknown';
}

function toSampleContact(c: ContactDto) {
  return {
    id: c.id ?? '',
    name: c.displayName ?? c.waId ?? '(no name)',
    company: c.companyName ?? undefined,
    designation: c.designation ?? undefined,
    city: c.city ?? undefined,
    lifecycle: enumName(LIFECYCLE, c.lifecycle),
    quotationState: enumName(QUOTATION, c.quotationState),
    lastCampaignResponse: enumName(RESPONSE, c.lastCampaignResponse),
    canReceiveMarketing: c.canReceiveMarketing ?? false,
    suppression: enumName(
      Object.fromEntries(Object.entries(SuppressionReason).map(([k, v]) => [v, k])) as Record<
        number,
        string
      >,
      c.suppression,
    ),
  };
}

function toPreview(dto: SegmentPreviewDto): SegmentPreview {
  return {
    totalMatching: dto.totalMatching ?? 0,
    marketingEligible: dto.marketingEligible ?? 0,
    utilityEligible: dto.utilityEligible ?? 0,
    optedOut: dto.optedOut ?? 0,
    suppressed: dto.suppressed ?? 0,
    insideServiceWindow: dto.insideServiceWindow ?? 0,
    matchesEveryone: dto.matchesEveryone ?? false,
    problems: dto.problems ?? [],
    cost: (dto.cost ?? []).map((line) => ({
      category: line.category ?? '',
      recipients: line.recipients ?? 0,
      rateInPaise: line.rateInPaise ?? 0,
      estimatedTotalInPaise: line.estimatedTotalInPaise ?? 0,
      exceedsWalletBalance: line.exceedsWalletBalance ?? false,
    })),
    sample: (dto.sample ?? []).map(toSampleContact),
  };
}

function toSaved(dto: SegmentDto): SavedSegment {
  return {
    id: dto.id!,
    name: dto.name ?? '(unnamed)',
    description: dto.description ?? undefined,
    rule: ruleFromJson(dto.ruleJson),
    cachedMemberCount: dto.cachedMemberCount ?? 0,
    isCountStale: dto.isCountStale ?? false,
    lastEvaluatedAt: dto.lastEvaluatedAtUtc ?? undefined,
  };
}

/**
 * The audience-builder store. Holds the rule the editor is working on, and keeps a
 * live preview beside it — every edit re-serialises the tree and re-asks the server
 * for the counts and the cost, which is the point of the screen.
 *
 * With `useMockData` on the preview is a fixed snapshot: the recount is a server job
 * and cannot be faked honestly in the browser.
 */
@Injectable({ providedIn: 'root' })
export class SegmentStore {
  private readonly api = inject(SegmentService);
  private readonly walletApi = inject(WalletService);

  readonly fields = SEGMENT_FIELDS;
  readonly rule = signal<SegmentGroup>(environment.useMockData ? SEED_RULE : EMPTY_RULE);

  private readonly previewResource = rxResource({
    params: () => (environment.useMockData ? undefined : { ruleJson: ruleToJson(this.rule()) }),
    stream: ({ params }) =>
      this.api
        .preview({ name: '__preview__', ruleJson: params.ruleJson, isDynamic: true })
        .pipe(map(toPreview)),
    defaultValue: EMPTY_PREVIEW,
  });

  private readonly savedResource = rxResource({
    params: () => (environment.useMockData ? undefined : { tick: this.reloadTick() }),
    stream: () =>
      this.api
        .getList({ skipCount: 0, maxResultCount: 100 })
        .pipe(map((page) => (page.items ?? []).map(toSaved))),
    defaultValue: [] as SavedSegment[],
  });

  private readonly walletResource = rxResource({
    params: () => (environment.useMockData ? undefined : {}),
    stream: () => this.walletApi.get().pipe(map((w) => w.balanceInPaise ?? 0)),
    defaultValue: 3_41_000,
  });

  private readonly reloadTick = signal(0);

  readonly loading = computed(() => !environment.useMockData && this.previewResource.isLoading());

  readonly preview = computed<SegmentPreview>(() =>
    environment.useMockData ? SEED_PREVIEW : this.previewResource.value(),
  );

  readonly savedSegments = computed<readonly SavedSegment[]>(() =>
    environment.useMockData ? SEED_SAVED : this.savedResource.value(),
  );

  readonly walletBalanceInPaise = computed(() =>
    environment.useMockData ? 3_41_000 : this.walletResource.value(),
  );

  // ---- Rule editing -------------------------------------------------------

  setRule(rule: SegmentGroup): void {
    this.rule.set(rule);
  }

  addClause(path: readonly number[]): void {
    this.rule.update((root) => addClauseAt(root, path));
  }

  addGroup(path: readonly number[], mode: 'all' | 'any' | 'not'): void {
    this.rule.update((root) => addGroupAt(root, path, mode));
  }

  removeAt(path: readonly number[], index: number): void {
    this.rule.update((root) => removeNodeAt(root, path, index));
  }

  updateClause(path: readonly number[], index: number, patch: Partial<SegmentClause>): void {
    this.rule.update((root) => updateClauseAt(root, path, index, patch));
  }

  setGroupMode(path: readonly number[], mode: 'all' | 'any' | 'not'): void {
    this.rule.update((root) => setGroupModeAt(root, path, mode));
  }

  // ---- Persistence -------------------------------------------------------

  async save(name: string, description: string | undefined): Promise<void> {
    await firstValueFrom(
      this.api.create({
        name: name.trim(),
        description: description?.trim() || undefined,
        ruleJson: ruleToJson(this.rule()),
        isDynamic: true,
      }),
    );
    this.reloadTick.update((n) => n + 1);
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.api.delete(id));
    this.reloadTick.update((n) => n + 1);
  }
}
