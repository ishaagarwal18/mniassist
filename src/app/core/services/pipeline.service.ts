import type { AmcImportResultDto } from '../../proxy/pipeline/models';
import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CreateUpdateEnquiryDto,
  CreateUpdateInstalledAssetDto,
  DealScoreBand,
  EnquiryBoardColumnDto,
  EnquiryDetailDto,
  EnquiryEventDto,
  EnquiryEventKind,
  EnquiryService,
  EnquiryStage,
  InstalledAssetDto,
  InstalledAssetService,
  LostReasonCategory,
  PipelineStageDto,
  QuotationDto,
  QuotationService,
  QuotationState,
  ReminderKind,
  SalesPipelineDto,
  SalesPipelineService,
} from '../../proxy/pipeline';
import { ContactService as ContactApi } from '../../proxy/contacts';
import { settled } from '../util/resource';

/** id + a human label, for the contact / enquiry pickers in the create dialogs. */
export interface PickerOption {
  id: string;
  label: string;
}

// ---- View models --------------------------------------------------------------

export type Stage = 'new' | 'qualified' | 'siteVisit' | 'quoted' | 'negotiation' | 'won' | 'lost';
export type QState = 'draft' | 'issued' | 'revised' | 'won' | 'lost' | 'expired';

export interface EnquiryCard {
  id: string;
  reference: string;
  title: string;
  contact: string;
  company?: string;
  owner?: string;
  valueInPaise?: number;
  daysInStage: number;
  /** The specific stage (column) the enquiry is in. */
  stageId?: string;
  /** Deal score 0-100 for an open enquiry; undefined once won or lost. */
  score?: number;
  band?: ScoreBand;
  stage: Stage;
}
export type ScoreBand = 'hot' | 'warm' | 'cold';
export interface ScoreFactor {
  key: string;
  points: number;
  max: number;
  note: string;
}
export function bandOf(score: number): ScoreBand {
  return score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold';
}
function bandFrom(
  b: DealScoreBand | null | undefined,
  score: number | null | undefined,
): ScoreBand | undefined {
  if (score == null) return undefined;
  return b === DealScoreBand.Hot
    ? 'hot'
    : b === DealScoreBand.Warm
      ? 'warm'
      : b === DealScoreBand.Cold
        ? 'cold'
        : bandOf(score);
}
export interface BoardColumn {
  /** What the column counts as: one of the built-in seven. */
  stage: Stage;
  stageId?: string;
  label: string;
  count: number;
  valueInPaise: number;
  cards: EnquiryCard[];
}
export interface Quotation {
  id: string;
  reference: string;
  revision: number;
  state: QState;
  totalInPaise: number;
  /** GST across the quotation, each line at its own rate. */
  taxInPaise?: number;
  /** GST by rate, for the tooltip on the list. */
  taxBreakdown?: { ratePercent: number; taxInPaise: number }[];
  issuedAt?: string;
  validUntil?: string;
  nextFollowUpAt?: string;
  daysSinceIssue: number;
}
export interface EnquiryEvent {
  kind: string;
  at?: string;
  by?: string;
  summary: string;
}
export interface EnquiryDetail {
  id: string;
  reference: string;
  title: string;
  stage: Stage;
  stageId?: string;
  stageName?: string;
  pipelineId?: string;
  pipelineName?: string;
  contact: string;
  /** The contact's id, so a call or a task can be started for them from the deal. */
  contactId?: string;
  company?: string;
  owner?: string;
  requirement?: string;
  valueInPaise?: number;
  expectedCloseDate?: string;
  daysInStage: number;
  score?: number;
  band?: ScoreBand;
  scoreFactors: ScoreFactor[];
  lostReason?: string;
  conversationId?: string;
  quotations: Quotation[];
  timeline: EnquiryEvent[];
  /** Set when this enquiry is an AMC renewal from the Renewal Desk. */
  renewalOf?: {
    assetId: string;
    description: string;
    serial?: string;
    site?: string;
    amcEndsOn?: string;
  };
}
export interface Asset {
  id: string;
  description: string;
  serial?: string;
  make?: string;
  site?: string;
  nextDueKind?: string;
  nextDueOn?: string;
  retired: boolean;
  /** The latest AMC renewal's status (RenewalStatus) and the end date it renews. */
  renewalStatus?: number;
  renewalEndsOn?: string;
}

const STAGE: Record<EnquiryStage, Stage> = {
  [EnquiryStage.New]: 'new',
  [EnquiryStage.Qualified]: 'qualified',
  [EnquiryStage.SiteVisit]: 'siteVisit',
  [EnquiryStage.Quoted]: 'quoted',
  [EnquiryStage.Negotiation]: 'negotiation',
  [EnquiryStage.Won]: 'won',
  [EnquiryStage.Lost]: 'lost',
};
const STAGE_LABEL: Record<Stage, string> = {
  new: 'New',
  qualified: 'Qualified',
  siteVisit: 'Site visit',
  quoted: 'Quoted',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
};
const QSTATE: Record<QuotationState, QState> = {
  [QuotationState.Draft]: 'draft',
  [QuotationState.Issued]: 'issued',
  [QuotationState.Revised]: 'revised',
  [QuotationState.Won]: 'won',
  [QuotationState.Lost]: 'lost',
  [QuotationState.Expired]: 'expired',
};
const DUE_KIND: Record<ReminderKind, string> = {
  [ReminderKind.AmcRenewal]: 'AMC renewal',
  [ReminderKind.WarrantyExpiry]: 'Warranty expiry',
  [ReminderKind.CalibrationDue]: 'Calibration due',
  [ReminderKind.PreventiveMaintenance]: 'PM visit',
  [ReminderKind.QuotationFollowUp]: 'Quote follow-up',
};

function boardColumn(c: EnquiryBoardColumnDto): BoardColumn {
  const stage = c.stage != null ? STAGE[c.stage] : 'new';
  return {
    stage,
    stageId: c.stageId,
    label: c.stageName ?? STAGE_LABEL[stage],
    count: c.count ?? 0,
    valueInPaise: c.totalValueInPaise ?? 0,
    cards: (c.cards ?? []).map((e) => ({
      id: e.id!,
      reference: e.reference ?? '',
      title: e.title ?? '(untitled)',
      contact: e.contactDisplayName ?? '—',
      company: e.contactCompanyName ?? undefined,
      owner: e.ownerUserName ?? undefined,
      valueInPaise: e.estimatedValueInPaise ?? 0,
      daysInStage: e.daysInStage ?? 0,
      stageId: e.stageId ?? c.stageId,
      score: e.score ?? undefined,
      band: bandFrom(e.scoreBand, e.score),
      stage,
    })),
  };
}
function quotation(q: QuotationDto): Quotation {
  return {
    id: q.id!,
    reference: q.reference ?? '',
    revision: q.revisionNumber ?? 0,
    state: q.state != null ? QSTATE[q.state] : 'draft',
    totalInPaise: q.totalInPaise ?? 0,
    taxInPaise: q.taxInPaise ?? 0,
    taxBreakdown: (q.taxBreakdown ?? []).map((t) => ({
      ratePercent: (t.rateBasisPoints ?? 0) / 100,
      taxInPaise: t.taxInPaise ?? 0,
    })),
    issuedAt: q.issuedAtUtc ?? undefined,
    validUntil: q.validUntilUtc ?? undefined,
    nextFollowUpAt: q.nextFollowUpAtUtc ?? undefined,
    daysSinceIssue: q.daysSinceIssue ?? 0,
  };
}
function asset(a: InstalledAssetDto): Asset {
  return {
    id: a.id!,
    description: a.description ?? '',
    serial: a.serialNumber ?? undefined,
    make: [a.make, a.model].filter(Boolean).join(' ') || undefined,
    site: [a.siteName, a.siteCity].filter(Boolean).join(', ') || undefined,
    nextDueKind: a.nextDueKind != null ? DUE_KIND[a.nextDueKind] : undefined,
    nextDueOn: a.nextDueOn ?? undefined,
    retired: a.isRetired ?? false,
    renewalStatus: a.renewalStatus ?? undefined,
    renewalEndsOn: a.renewalEndsOn ?? undefined,
  };
}

const EVENT_KIND: Record<EnquiryEventKind, string> = {
  [EnquiryEventKind.Created]: 'Created',
  [EnquiryEventKind.StageChange]: 'Stage change',
  [EnquiryEventKind.Note]: 'Note',
  [EnquiryEventKind.MessageSent]: 'Message sent',
  [EnquiryEventKind.MessageReceived]: 'Message received',
  [EnquiryEventKind.QuotationIssued]: 'Quotation issued',
  [EnquiryEventKind.DocumentShared]: 'Document shared',
  [EnquiryEventKind.OwnerChanged]: 'Owner changed',
  [EnquiryEventKind.FlowSubmitted]: 'Flow submitted',
  [EnquiryEventKind.TaskCompleted]: 'Task completed',
  [EnquiryEventKind.MeetingScheduled]: 'Meeting scheduled',
  [EnquiryEventKind.CallLogged]: 'Call',
};

function enquiryEvent(e: EnquiryEventDto): EnquiryEvent {
  return {
    kind: e.kind != null ? EVENT_KIND[e.kind] : 'Event',
    at: e.occurredAtUtc ?? undefined,
    by: e.byUserName ?? undefined,
    summary: e.summary ?? '',
  };
}

const MOCK_FACTORS: ScoreFactor[] = [
  { key: 'Stage', points: 28, max: 35, note: 'In Quoted' },
  { key: 'Engagement', points: 14, max: 20, note: 'Contact engagement 70/100' },
  { key: 'Momentum', points: 14, max: 20, note: '9 days in this stage' },
  { key: 'Completeness', points: 10, max: 15, note: 'Missing close date' },
  { key: 'Source', points: 7, max: 10, note: 'From Exhibition' },
];

function mockScore(i: number, j: number): { score: number; band: ScoreBand } {
  const score = Math.min(96, 22 + i * 14 + ((j * 17) % 30));
  return { score, band: bandOf(score) };
}

function enquiryDetail(d: EnquiryDetailDto & { id?: string }): EnquiryDetail {
  const stage = d.stage != null ? STAGE[d.stage] : 'new';
  return {
    id: d.id!,
    reference: d.reference ?? '',
    title: d.title ?? '(untitled)',
    stage,
    contact: d.contactDisplayName ?? '—',
    contactId: d.contactId ?? undefined,
    company: d.contactCompanyName ?? undefined,
    owner: d.ownerUserName ?? undefined,
    requirement: d.requirement ?? undefined,
    valueInPaise: d.estimatedValueInPaise ?? undefined,
    expectedCloseDate: d.expectedCloseDate ?? undefined,
    daysInStage: d.daysInStage ?? 0,
    stageId: d.stageId ?? undefined,
    stageName: d.stageName ?? undefined,
    pipelineId: d.pipelineId ?? undefined,
    pipelineName: d.pipelineName ?? undefined,
    score: d.score ?? undefined,
    band: bandFrom(d.scoreBand, d.score),
    scoreFactors: (d.scoreFactors ?? []).map((f) => ({
      key: f.key ?? '',
      points: f.points ?? 0,
      max: f.max ?? 0,
      note: f.note ?? '',
    })),
    lostReason: d.lostReason ?? undefined,
    conversationId: d.conversationId ?? undefined,
    renewalOf: d.renewalOf
      ? {
          assetId: d.renewalOf.installedAssetId,
          description: d.renewalOf.description,
          serial: d.renewalOf.serialNumber ?? undefined,
          site: d.renewalOf.siteName ?? undefined,
          amcEndsOn: d.renewalOf.amcEndsOn ?? undefined,
        }
      : undefined,
    quotations: (d.quotations ?? []).map(quotation),
    timeline: (d.timeline ?? [])
      .map(enquiryEvent)
      .sort((a, b) => (b.at ?? '').localeCompare(a.at ?? '')),
  };
}

const MOCK_PIPELINES: SalesPipelineDto[] = [
  {
    id: 'p-default',
    name: 'Sales',
    isDefault: true,
    enquiryCount: 16,
    stages: [
      { id: 's-new', name: 'New', order: 0, bucket: EnquiryStage.New, enquiryCount: 5 },
      {
        id: 's-qualified',
        name: 'Qualified',
        order: 1,
        bucket: EnquiryStage.Qualified,
        enquiryCount: 4,
      },
      {
        id: 's-siteVisit',
        name: 'Site visit',
        order: 2,
        bucket: EnquiryStage.SiteVisit,
        enquiryCount: 2,
      },
      { id: 's-quoted', name: 'Quoted', order: 3, bucket: EnquiryStage.Quoted, enquiryCount: 3 },
      {
        id: 's-negotiation',
        name: 'Negotiation',
        order: 4,
        bucket: EnquiryStage.Negotiation,
        enquiryCount: 2,
      },
      {
        id: 's-won',
        name: 'Won',
        order: 5,
        bucket: EnquiryStage.Won,
        isFixed: true,
        enquiryCount: 0,
      },
      {
        id: 's-lost',
        name: 'Lost',
        order: 6,
        bucket: EnquiryStage.Lost,
        isFixed: true,
        enquiryCount: 0,
      },
    ],
  },
];

const OPEN_STAGES: Stage[] = ['new', 'qualified', 'siteVisit', 'quoted', 'negotiation'];

const SEED_BOARD: BoardColumn[] = OPEN_STAGES.map((stage, i) => ({
  stage,
  stageId: `s-${stage}`,
  label: STAGE_LABEL[stage],
  count: [5, 4, 2, 3, 2][i],
  valueInPaise: [3_20_00000, 5_80_00000, 2_10_00000, 8_40_00000, 3_60_00000][i],
  cards: Array.from({ length: [5, 4, 2, 3, 2][i] }, (_, j) => ({
    id: `e-${i}-${j}`,
    reference: `ENQ-2026-${(i * 5 + j + 101).toString()}`,
    title: [
      'Palletiser line upgrade',
      'DOL to VFD retrofit',
      'SCADA migration',
      'Servo press retrofit',
      'Calibration AMC',
    ][(i + j) % 5],
    contact: ['Sandeep Rao', 'Priya Nambiar', 'Devendra Joshi', 'Anitha Menon', 'Farhan Qureshi'][
      (i + j) % 5
    ],
    company: [
      'Meridian Foods',
      'Kanpur Polymers',
      'Sanand Press Works',
      'Hosur Machine Tools',
      'Vasai Panels',
    ][(i + j) % 5],
    owner: ['ravi.k', 'sneha.p'][(i + j) % 2],
    valueInPaise: (18 + j * 6 + i * 4) * 100000 * 100,
    daysInStage: 2 + ((i * 3 + j) % 14),
    ...mockScore(i, j),
    stageId: `s-${stage}`,
    stage,
  })),
}));

const SEED_QUOTES: Quotation[] = [
  {
    id: 'q-1',
    reference: 'QTN-2026-0044',
    revision: 1,
    state: 'issued',
    totalInPaise: 84_96_000_00,
    issuedAt: '2026-08-20',
    validUntil: '2026-09-20',
    nextFollowUpAt: '2026-09-06',
    daysSinceIssue: 17,
  },
  {
    id: 'q-2',
    reference: 'QTN-2026-0041',
    revision: 2,
    state: 'revised',
    totalInPaise: 12_40_000_00,
    issuedAt: '2026-08-28',
    validUntil: '2026-09-28',
    nextFollowUpAt: '2026-09-07',
    daysSinceIssue: 9,
  },
  {
    id: 'q-3',
    reference: 'QTN-2026-0038',
    revision: 1,
    state: 'won',
    totalInPaise: 5_10_000_00,
    issuedAt: '2026-08-02',
    daysSinceIssue: 35,
  },
  {
    id: 'q-4',
    reference: 'QTN-2026-0031',
    revision: 1,
    state: 'expired',
    totalInPaise: 2_75_000_00,
    issuedAt: '2026-07-10',
    validUntil: '2026-08-10',
    daysSinceIssue: 58,
  },
];

const SEED_ASSETS: Asset[] = [
  {
    id: 'a-1',
    description: 'Palletiser control panel',
    serial: 'VX-PL-4417',
    make: 'Siemens S7-1200',
    site: 'Chakan, Pune',
    nextDueKind: 'AMC renewal',
    nextDueOn: '2026-09-30',
    retired: false,
  },
  {
    id: 'a-2',
    description: 'Line 3 VFD bank',
    serial: 'DR-KP-2291',
    make: 'Danfoss FC-302',
    site: 'Kanpur',
    nextDueKind: 'PM visit',
    nextDueOn: '2026-10-12',
    retired: false,
  },
  {
    id: 'a-3',
    description: 'Torque calibration rig',
    serial: 'CAL-889',
    make: 'Norbar',
    site: 'Sanand',
    nextDueKind: 'Calibration due',
    nextDueOn: '2026-09-18',
    retired: false,
  },
  {
    id: 'a-4',
    description: 'Servo press controller',
    serial: 'SP-HO-114',
    make: 'Yaskawa',
    site: 'Hosur',
    nextDueKind: 'Warranty expiry',
    nextDueOn: '2027-01-04',
    retired: false,
  },
];

@Injectable({ providedIn: 'root' })
export class PipelineStore {
  private readonly enquiryApi = inject(EnquiryService);
  private readonly quotationApi = inject(QuotationService);
  private readonly assetApi = inject(InstalledAssetService);
  private readonly contactApi = inject(ContactApi);
  private readonly pipelineApi = inject(SalesPipelineService);

  private readonly tick = signal(0);
  readonly includeRetired = signal(false);

  /** The pipeline the board shows. Null means the workspace's default. */
  readonly pipelineId = signal<string | null>(null);
  private readonly pipelineTick = signal(0);

  private readonly pipelinesResource = rxResource({
    params: () => (environment.useMockData ? undefined : { tick: this.pipelineTick() }),
    stream: () => this.pipelineApi.getList().pipe(map((r) => r.items ?? [])),
    defaultValue: [],
  });

  /** Every pipeline with its stages, default first. */
  readonly pipelines = computed<SalesPipelineDto[]>(() =>
    environment.useMockData ? MOCK_PIPELINES : settled(this.pipelinesResource, []),
  );

  /** The pipeline on screen: the chosen one, else the default. */
  readonly currentPipeline = computed(() => {
    const all = this.pipelines();
    return all.find((p) => p.id === this.pipelineId()) ?? all.find((p) => p.isDefault) ?? all.at(0);
  });

  private readonly boardResource = rxResource({
    params: () =>
      environment.useMockData ? undefined : { tick: this.tick(), pipeline: this.pipelineId() },
    stream: ({ params }) =>
      this.enquiryApi
        .getBoard({ openOnly: true, pipelineId: params.pipeline })
        .pipe(map((r) => (r.items ?? []).map(boardColumn))),
    defaultValue: [],
  });

  private readonly quotesResource = rxResource({
    params: () => (environment.useMockData ? undefined : { tick: this.tick() }),
    stream: () =>
      this.quotationApi
        .getList({ skipCount: 0, maxResultCount: 100 })
        .pipe(map((p) => (p.items ?? []).map(quotation))),
    defaultValue: [],
  });

  private readonly assetsResource = rxResource({
    params: () => (environment.useMockData ? undefined : { retired: this.includeRetired() }),
    stream: ({ params }) =>
      this.assetApi
        .getList({ includeRetired: params.retired, skipCount: 0, maxResultCount: 200 })
        .pipe(map((p) => (p.items ?? []).map(asset))),
    defaultValue: [],
  });

  private readonly mockQuotes = signal<Quotation[]>([...SEED_QUOTES]);
  private readonly mockBoard = signal<BoardColumn[]>([...SEED_BOARD]);
  private readonly mockAssets = signal<Asset[]>([...SEED_ASSETS]);

  readonly board = computed(() =>
    environment.useMockData ? this.mockBoard() : settled(this.boardResource, []),
  );
  readonly quotes = computed(() =>
    environment.useMockData ? this.mockQuotes() : settled(this.quotesResource, []),
  );
  readonly assets = computed(() =>
    environment.useMockData ? this.mockAssets() : settled(this.assetsResource, []),
  );
  readonly loading = computed(
    () =>
      !environment.useMockData &&
      (this.boardResource.isLoading() ||
        this.quotesResource.isLoading() ||
        this.assetsResource.isLoading()),
  );

  readonly pipelineValueInPaise = computed(() =>
    this.board().reduce((n, c) => n + c.valueInPaise, 0),
  );
  readonly openEnquiryCount = computed(() => this.board().reduce((n, c) => n + c.count, 0));

  reload(): void {
    this.tick.update((n) => n + 1);
  }

  /** Re-reads the quotation list, after lines were edited elsewhere. */
  reloadQuotes(): void {
    this.quotesResource.reload();
  }

  /** Where a card or drawer goes when advanced: the next stage of its pipeline, up to and including Won. */
  nextStageOf(
    pipelineId: string | undefined,
    stageId: string | undefined,
    bucket: Stage,
  ): { stageId: string; label: string } | undefined {
    if (environment.useMockData) {
      const order: Stage[] = ['new', 'qualified', 'siteVisit', 'quoted', 'negotiation', 'won'];
      const next = order[order.indexOf(bucket) + 1];
      return next ? { stageId: `s-${next}`, label: STAGE_LABEL[next] } : undefined;
    }
    const pipeline = this.pipelines().find((p) => p.id === pipelineId) ?? this.currentPipeline();
    const stages = pipeline?.stages ?? [];
    const at = stages.findIndex((s) => s.id === stageId);
    const next: PipelineStageDto | undefined = at >= 0 ? stages[at + 1] : undefined;
    return next &&
      next.bucket !== EnquiryStage.Lost &&
      at >= 0 &&
      stages[at].bucket !== EnquiryStage.Won
      ? { stageId: next.id!, label: next.name ?? '' }
      : undefined;
  }

  async moveEnquiryToStage(id: string, stageId: string, note?: string): Promise<void> {
    if (environment.useMockData) return;
    await firstValueFrom(this.enquiryApi.move(id, { stageId, note: note?.trim() || undefined }));
    this.reload();
    this.reloadPipelines();
  }

  reloadPipelines(): void {
    this.pipelineTick.update((n) => n + 1);
  }

  // ---- Pipeline and stage administration (settings screen) ---------------------

  async createPipeline(name: string, copyFrom?: string): Promise<void> {
    await firstValueFrom(
      this.pipelineApi.create({ name, copyStagesFromPipelineId: copyFrom ?? null }),
    );
    this.reloadPipelines();
  }

  async renamePipeline(id: string, name: string): Promise<void> {
    await firstValueFrom(this.pipelineApi.update(id, { name }));
    this.reloadPipelines();
  }

  async makeDefaultPipeline(id: string): Promise<void> {
    await firstValueFrom(this.pipelineApi.setDefault(id));
    this.reloadPipelines();
    this.reload();
  }

  async deletePipeline(id: string, moveTo?: string): Promise<void> {
    await firstValueFrom(
      this.pipelineApi.delete(id, { moveEnquiriesToPipelineId: moveTo ?? null }),
    );
    if (this.pipelineId() === id) this.pipelineId.set(null);
    this.reloadPipelines();
    this.reload();
  }

  async addStage(
    pipelineId: string,
    name: string,
    bucket: EnquiryStage,
    position?: number,
  ): Promise<void> {
    await firstValueFrom(
      this.pipelineApi.addStage(pipelineId, { name, bucket, position: position ?? null }),
    );
    this.reloadPipelines();
    this.reload();
  }

  async saveStage(stageId: string, name: string, bucket: EnquiryStage): Promise<void> {
    await firstValueFrom(this.pipelineApi.updateStage(stageId, { name, bucket }));
    this.reloadPipelines();
    this.reload();
  }

  async reorderStages(pipelineId: string, stageIds: string[]): Promise<void> {
    await firstValueFrom(this.pipelineApi.reorderStages(pipelineId, { stageIds }));
    this.reloadPipelines();
    this.reload();
  }

  async deleteStage(stageId: string, moveTo?: string): Promise<void> {
    await firstValueFrom(
      this.pipelineApi.deleteStage(stageId, { moveEnquiriesToStageId: moveTo ?? null }),
    );
    this.reloadPipelines();
    this.reload();
  }

  async moveEnquiry(
    id: string,
    stage: EnquiryStage,
    note?: string,
    lostCategory?: LostReasonCategory,
  ): Promise<void> {
    await firstValueFrom(
      this.enquiryApi.move(id, { stage, note: note?.trim() || undefined, lostCategory }),
    );
    this.reload();
  }

  /** Full card for the detail drawer: the enquiry, its quotations and its timeline. */
  async loadEnquiry(id: string): Promise<EnquiryDetail> {
    if (environment.useMockData) {
      return this.seedEnquiryDetail(id);
    }
    const dto = await firstValueFrom(this.enquiryApi.getDetail(id));
    return enquiryDetail({ ...(dto as EnquiryDetailDto & { id?: string }), id });
  }

  async addEnquiryNote(id: string, note: string): Promise<void> {
    if (!environment.useMockData) {
      await firstValueFrom(this.enquiryApi.addNote(id, note.trim()));
    }
  }

  async assignEnquiry(id: string, ownerUserId: string): Promise<void> {
    if (!environment.useMockData) {
      await firstValueFrom(this.enquiryApi.assign(id, ownerUserId));
      this.reload();
    }
  }

  private seedEnquiryDetail(id: string): EnquiryDetail {
    const card = this.board()
      .flatMap((c) => c.cards)
      .find((c) => c.id === id);
    return {
      id,
      reference: card?.reference ?? 'ENQ-2026-000',
      title: card?.title ?? 'Enquiry',
      stage: card?.stage ?? 'new',
      contact: card?.contact ?? '—',
      contactId: 'mock-contact',
      company: card?.company,
      owner: card?.owner,
      requirement:
        'Existing DOL starters on the packing line trip on peak load. Wants a VFD retrofit ' +
        'with soft-start on four 15 kW motors, plus a walkthrough of the payback before ' +
        'committing.',
      valueInPaise: card?.valueInPaise,
      daysInStage: card?.daysInStage ?? 0,
      stageId: card?.stageId,
      score: card?.score,
      band: card?.band,
      scoreFactors: card?.score == null ? [] : MOCK_FACTORS,
      quotations: SEED_QUOTES.slice(0, 1),
      timeline: [
        {
          kind: 'Stage change',
          at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
          by: 'sneha.p',
          summary: `Moved to ${card?.stage ?? 'new'}`,
        },
        {
          kind: 'Note',
          at: new Date(Date.now() - 4 * 86_400_000).toISOString(),
          by: 'ravi.k',
          summary: 'Site visit booked for Thursday; needs single-line diagram beforehand.',
        },
        {
          kind: 'Message received',
          at: new Date(Date.now() - 6 * 86_400_000).toISOString(),
          by: card?.contact,
          summary: 'Shared the motor nameplate photos.',
        },
        {
          kind: 'Created',
          at: new Date(Date.now() - 9 * 86_400_000).toISOString(),
          by: 'ravi.k',
          summary: 'Enquiry created from an inbox conversation.',
        },
      ],
    };
  }

  /** Issues a draft or revised quotation; returns what happened on WhatsApp when that was asked for. */
  async issueQuote(
    id: string,
    validUntilIso: string,
    sendOnWhatsApp: boolean,
    templateId: string | null,
  ): Promise<{ sent?: boolean | null; note?: string | null }> {
    const dto = await firstValueFrom(
      this.quotationApi.issue(id, { validUntilUtc: validUntilIso, sendOnWhatsApp, templateId }),
    );
    this.reload();
    return { sent: dto.sentOnWhatsApp, note: dto.whatsAppNote };
  }

  async markQuoteWon(id: string): Promise<void> {
    await firstValueFrom(this.quotationApi.markWon(id));
    this.reload();
  }

  async markQuoteLost(id: string, reason: string): Promise<void> {
    await firstValueFrom(this.quotationApi.markLost(id, reason));
    this.reload();
  }

  async downloadQuote(id: string): Promise<string> {
    return firstValueFrom(this.quotationApi.generatePdf(id));
  }

  async recordService(id: string): Promise<void> {
    await firstValueFrom(this.assetApi.recordService(id, new Date().toISOString()));
    this.assetsResource.reload();
  }

  /** Loads AMC values and end dates by serial number from CSV. Saves nothing while dryRun is true. */
  async importAmc(csv: string, dryRun: boolean): Promise<AmcImportResultDto> {
    const result = await firstValueFrom(this.assetApi.importAmc({ csv, dryRun }));
    if (!dryRun) this.assetsResource.reload();
    return result;
  }

  async retireAsset(id: string): Promise<void> {
    await firstValueFrom(this.assetApi.retire(id));
    this.assetsResource.reload();
  }

  // ---- Create-dialog support -------------------------------------------

  private static readonly MOCK_CONTACTS: PickerOption[] = [
    { id: 'p1', label: 'Sandeep Rao — Meridian Foods' },
    { id: 'p2', label: 'Priya Nambiar — Kanpur Polymers' },
    { id: 'p3', label: 'Devendra Joshi — Sanand Press Works' },
    { id: 'p4', label: 'Anitha Menon — Hosur Machine Tools' },
  ];

  /** Contact typeahead for the enquiry and installed-asset dialogs. */
  async searchContacts(term: string): Promise<PickerOption[]> {
    const q = term.trim().toLowerCase();
    if (environment.useMockData) {
      return PipelineStore.MOCK_CONTACTS.filter((c) => c.label.toLowerCase().includes(q));
    }
    const page = await firstValueFrom(
      this.contactApi.getList({
        filter: term.trim() || undefined,
        skipCount: 0,
        maxResultCount: 10,
      }),
    );
    return (page.items ?? []).map((c) => ({
      id: c.id!,
      label: [c.displayName ?? c.waId, c.companyName].filter(Boolean).join(' — '),
    }));
  }

  /** Open enquiries, for the quotation dialog's picker. */
  openEnquiryOptions(): PickerOption[] {
    return this.board()
      .flatMap((col) => col.cards)
      .map((card) => ({
        id: card.id,
        label: `${card.reference} · ${card.title}${card.company ? ' — ' + card.company : ''}`,
      }));
  }

  async createEnquiry(input: CreateUpdateEnquiryDto): Promise<void> {
    if (environment.useMockData) {
      const newCard: EnquiryCard = {
        id: 'enq-' + Date.now(),
        reference: `ENQ-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        title: input.title ?? 'Enquiry',
        contact: input.contactId ?? 'New Contact',
        daysInStage: 0,
        stage: 'new',
        valueInPaise: input.estimatedValueInPaise ?? undefined,
      };
      this.mockBoard.update((cols) =>
        cols.map((c, i) => (i === 0 ? { ...c, cards: [newCard, ...c.cards], count: c.count + 1 } : c)),
      );
      return;
    }
    await firstValueFrom(this.enquiryApi.create(input));
    this.reload();
  }

  async updateEnquiry(id: string, input: CreateUpdateEnquiryDto): Promise<void> {
    if (environment.useMockData) {
      this.mockBoard.update((cols) =>
        cols.map((col) => ({
          ...col,
          cards: col.cards.map((c) =>
            c.id === id
              ? {
                  ...c,
                  title: input.title || c.title,
                  valueInPaise: input.estimatedValueInPaise ?? c.valueInPaise,
                }
              : c,
          ),
        })),
      );
      return;
    }
    await firstValueFrom(this.enquiryApi.update(id, input));
    this.reload();
  }

  async deleteEnquiry(id: string): Promise<void> {
    if (environment.useMockData) {
      this.mockBoard.update((cols) =>
        cols.map((col) => {
          const filtered = col.cards.filter((c) => c.id !== id);
          return {
            ...col,
            cards: filtered,
            count: filtered.length,
          };
        }),
      );
      return;
    }
    await firstValueFrom(this.enquiryApi.delete(id));
    this.reload();
  }

  async createQuotation(enquiryId: string): Promise<void> {
    if (environment.useMockData) {
      const newQ: Quotation = {
        id: 'q-' + Date.now(),
        reference: `QTN-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        revision: 1,
        state: 'draft',
        totalInPaise: 50_000_00,
        daysSinceIssue: 0,
        issuedAt: new Date().toISOString().slice(0, 10),
      };
      this.mockQuotes.update((list) => [newQ, ...list]);
      return;
    }
    await firstValueFrom(
      this.quotationApi.create({ enquiryId, lines: [], taxRateBasisPoints: 1800 }),
    );
    this.quotesResource.reload();
  }

  async deleteQuote(id: string): Promise<void> {
    if (environment.useMockData) {
      this.mockQuotes.update((list) => list.filter((q) => q.id !== id));
      return;
    }
    await firstValueFrom(this.quotationApi.delete(id));
    this.quotesResource.reload();
  }

  async createAsset(input: CreateUpdateInstalledAssetDto): Promise<void> {
    if (environment.useMockData) {
      const newAsset: Asset = {
        id: 'a-' + Date.now(),
        description: input.description,
        serial: input.serialNumber ?? 'SN-' + Date.now(),
        make: input.model ?? 'Standard',
        site: input.siteCity ?? input.siteName ?? 'Pune',
        retired: false,
      };
      this.mockAssets.update((list) => [newAsset, ...list]);
      return;
    }
    await firstValueFrom(this.assetApi.create(input));
    this.assetsResource.reload();
  }

  async updateAsset(id: string, input: CreateUpdateInstalledAssetDto): Promise<void> {
    if (environment.useMockData) {
      this.mockAssets.update((list) =>
        list.map((a) =>
          a.id === id
            ? {
                ...a,
                description: input.description,
                serial: input.serialNumber ?? a.serial,
                make: input.model ?? a.make,
                site: input.siteCity ?? input.siteName ?? a.site,
              }
            : a,
        ),
      );
      return;
    }
    await firstValueFrom(this.assetApi.update(id, input));
    this.assetsResource.reload();
  }

  async deleteAsset(id: string): Promise<void> {
    if (environment.useMockData) {
      this.mockAssets.update((list) => list.filter((a) => a.id !== id));
      return;
    }
    await firstValueFrom(this.assetApi.delete(id));
    this.assetsResource.reload();
  }
}
