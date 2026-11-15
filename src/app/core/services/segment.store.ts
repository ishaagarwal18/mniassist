import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';
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
  audienceFromJson,
  audienceToJson,
  PickedContact,
  setGroupModeAt,
  updateClauseAt,
  type SegmentClause,
} from '../models/segment.model';
import { settled } from '../util/resource';

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
    ...audienceFromJson(dto.ruleJson),
    cachedMemberCount: dto.cachedMemberCount ?? 0,
    isCountStale: dto.isCountStale ?? false,
    lastEvaluatedAt: dto.lastEvaluatedAtUtc ?? undefined,
  };
}

/**
 * The audience-builder store. Holds the rule the editor is working on, and keeps a
 * live preview beside it — every edit re-serialises the tree and re-asks the server
 * for the counts and the cost, which is the point of the screen.
 */
@Injectable({ providedIn: 'root' })
export class SegmentStore {
  private readonly api = inject(SegmentService);
  private readonly walletApi = inject(WalletService);

  readonly fields = SEGMENT_FIELDS;
  readonly rule = signal<SegmentGroup>(EMPTY_RULE);
  /** Contacts added by hand: in the audience whatever the rule says. */
  readonly picked = signal<readonly PickedContact[]>([]);
  private readonly ruleJson = computed(() => audienceToJson(this.rule(), this.picked()));

  private readonly previewResource = rxResource({
    params: () => ({ ruleJson: this.ruleJson() }),
    stream: ({ params }) =>
      this.api
        .preview({ name: '__preview__', ruleJson: params.ruleJson, isDynamic: true })
        .pipe(map(toPreview)),
    defaultValue: EMPTY_PREVIEW,
  });

  private readonly savedResource = rxResource({
    params: () => ({ tick: this.reloadTick() }),
    stream: () =>
      this.api
        .getList({ skipCount: 0, maxResultCount: 100 })
        .pipe(map((page) => (page.items ?? []).map(toSaved))),
    defaultValue: [] as SavedSegment[],
  });

  private readonly walletResource = rxResource({
    params: () => ({}),
    stream: () => this.walletApi.get().pipe(map((w) => w.balanceInPaise ?? 0)),
    defaultValue: 3_41_000,
  });

  private readonly reloadTick = signal(0);

  readonly loading = computed(() => this.previewResource.isLoading());

  readonly preview = computed<SegmentPreview>(() => settled(this.previewResource, EMPTY_PREVIEW));

  readonly savedSegments = computed<readonly SavedSegment[]>(() =>
    settled(this.savedResource, [] as SavedSegment[]),
  );

  readonly walletBalanceInPaise = computed(() => settled(this.walletResource, 3_41_000));

  // ---- Rule editing -------------------------------------------------------

  setRule(rule: SegmentGroup, picked: readonly PickedContact[] = []): void {
    this.rule.set(rule);
    this.picked.set(picked);
  }

  addPicked(contact: PickedContact): void {
    this.picked.update((list) =>
      list.some((p) => p.id === contact.id) ? list : [...list, contact],
    );
  }

  removePicked(id: string): void {
    this.picked.update((list) => list.filter((p) => p.id !== id));
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
        ruleJson: this.ruleJson(),
        isDynamic: true,
      }),
    );
    this.reloadTick.update((n) => n + 1);
  }

  async update(id: string, name: string, description: string | undefined): Promise<void> {
    await firstValueFrom(
      this.api.update(id, {
        name: name.trim(),
        description: description?.trim() || undefined,
        ruleJson: this.ruleJson(),
        isDynamic: true,
      }),
    );
    this.reloadTick.update((n) => n + 1);
  }

  /** Re-runs a saved segment's rules on the server and refreshes its member count. */
  async evaluate(id: string): Promise<SegmentPreviewDto> {
    const result = await firstValueFrom(this.api.evaluate(id, { skipHandleError: true }));
    this.reloadTick.update((n) => n + 1);
    return result;
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.api.delete(id));
    this.reloadTick.update((n) => n + 1);
  }
}
