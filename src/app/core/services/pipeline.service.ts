import type { AmcImportResultDto } from '../../proxy/pipeline/models';
import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';
import {
  CreateUpdateEnquiryDto,
  CreateUpdateQuotationDto,
  CreateUpdateInstalledAssetDto,
  DealScoreBand,
  EnquiryBoardColumnDto,
  EnquiryDetailDto,
  EnquiryEventDto,
  EnquiryEventKind,
  EnquiryService,
  EnquiryStage,
  InstalledAssetDto,
  IssueQuotationInput,
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
  /** Kept so an edit sends the owner, ad reference and attributes back unchanged. */
  ownerUserId?: string;
  sourceRef?: string;
  attributes?: Record<string, string>;
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
    ownerUserId: d.ownerUserId ?? undefined,
    sourceRef: d.sourceRef ?? undefined,
    attributes: d.attributes ?? {},
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
    params: () => ({ tick: this.pipelineTick() }),
    stream: () => this.pipelineApi.getList().pipe(map((r) => r.items ?? [])),
    defaultValue: [],
  });

  /** Every pipeline with its stages, default first. */
  readonly pipelines = computed<SalesPipelineDto[]>(() => settled(this.pipelinesResource, []));

  /** The pipeline on screen: the chosen one, else the default. */
  readonly currentPipeline = computed(() => {
    const all = this.pipelines();
    return all.find((p) => p.id === this.pipelineId()) ?? all.find((p) => p.isDefault) ?? all.at(0);
  });

  private readonly boardResource = rxResource({
    params: () => ({ tick: this.tick(), pipeline: this.pipelineId() }),
    stream: ({ params }) =>
      this.enquiryApi
        .getBoard({ openOnly: true, pipelineId: params.pipeline })
        .pipe(map((r) => (r.items ?? []).map(boardColumn))),
    defaultValue: [],
  });

  private readonly quotesResource = rxResource({
    params: () => ({ tick: this.tick() }),
    stream: () =>
      this.quotationApi
        .getList({ skipCount: 0, maxResultCount: 100 })
        .pipe(map((p) => (p.items ?? []).map(quotation))),
    defaultValue: [],
  });

  private readonly assetsResource = rxResource({
    params: () => ({ retired: this.includeRetired() }),
    stream: ({ params }) =>
      this.assetApi
        .getList({ includeRetired: params.retired, skipCount: 0, maxResultCount: 200 })
        .pipe(map((p) => (p.items ?? []).map(asset))),
    defaultValue: [],
  });

  readonly board = computed(() => settled(this.boardResource, []));
  readonly quotes = computed(() => settled(this.quotesResource, []));
  readonly assets = computed(() => settled(this.assetsResource, []));
  readonly loading = computed(
    () =>
      this.boardResource.isLoading() ||
      this.quotesResource.isLoading() ||
      this.assetsResource.isLoading(),
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
    competitorBrandId?: string | null,
  ): Promise<void> {
    await firstValueFrom(
      this.enquiryApi.move(id, {
        stage,
        note: note?.trim() || undefined,
        lostCategory,
        competitorBrandId: competitorBrandId || null,
      }),
    );
    this.reload();
  }

  /** Full card for the detail drawer: the enquiry, its quotations and its timeline. */
  async loadEnquiry(id: string): Promise<EnquiryDetail> {
    const dto = await firstValueFrom(this.enquiryApi.getDetail(id));
    return enquiryDetail({ ...(dto as EnquiryDetailDto & { id?: string }), id });
  }

  async addEnquiryNote(id: string, note: string): Promise<void> {
    await firstValueFrom(this.enquiryApi.addNote(id, note.trim()));
  }

  async assignEnquiry(id: string, ownerUserId: string): Promise<void> {
    await firstValueFrom(this.enquiryApi.assign(id, ownerUserId));
    this.reload();
  }

  /** Issues a quotation (a draft, or an issued one again as a revision); returns what happened on WhatsApp and by email. */
  async issueQuote(
    id: string,
    input: IssueQuotationInput,
  ): Promise<{
    sent?: boolean | null;
    note?: string | null;
    emailSent?: boolean | null;
    emailNote?: string | null;
  }> {
    const dto = await firstValueFrom(this.quotationApi.issue(id, input));
    this.reload();
    return {
      sent: dto.sentOnWhatsApp,
      note: dto.whatsAppNote,
      emailSent: dto.sentByEmail,
      emailNote: dto.emailNote,
    };
  }

  async markQuoteWon(id: string): Promise<void> {
    await firstValueFrom(this.quotationApi.markWon(id));
    this.reload();
  }

  async markQuoteLost(id: string, reason: string): Promise<void> {
    await firstValueFrom(this.quotationApi.markLost(id, reason));
    this.reload();
  }

  /**
   * Saves the quotation document to the user's computer: a draft as it stands, an issued one as it was sent. It is a PDF, or a
   * printable HTML page when the server could not make a PDF.
   */
  async downloadQuote(id: string, reference: string): Promise<void> {
    const blob = await firstValueFrom(this.quotationApi.downloadPdf(id));
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reference || 'quotation'}.${blob.type.includes('html') ? 'html' : 'pdf'}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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

  /** Contact typeahead for the enquiry and installed-asset dialogs. */
  async searchContacts(term: string): Promise<PickerOption[]> {
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
    await firstValueFrom(this.enquiryApi.create(input));
    this.reload();
  }

  async updateEnquiry(id: string, input: CreateUpdateEnquiryDto): Promise<void> {
    await firstValueFrom(this.enquiryApi.update(id, input));
    this.reload();
  }

  async deleteEnquiry(id: string): Promise<void> {
    await firstValueFrom(this.enquiryApi.delete(id));
    this.reload();
  }

  /** Creates a quotation (lines included) and returns it. A manual one gives a contact instead of an enquiry. */
  async createQuotation(input: CreateUpdateQuotationDto): Promise<QuotationDto> {
    const created = await firstValueFrom(this.quotationApi.create(input));
    this.quotesResource.reload();
    return created;
  }

  async deleteQuote(id: string): Promise<void> {
    await firstValueFrom(this.quotationApi.delete(id));
    this.quotesResource.reload();
  }

  async createAsset(input: CreateUpdateInstalledAssetDto): Promise<void> {
    await firstValueFrom(this.assetApi.create(input));
    this.assetsResource.reload();
  }

  async updateAsset(id: string, input: CreateUpdateInstalledAssetDto): Promise<void> {
    await firstValueFrom(this.assetApi.update(id, input));
    this.assetsResource.reload();
  }

  async deleteAsset(id: string): Promise<void> {
    await firstValueFrom(this.assetApi.delete(id));
    this.assetsResource.reload();
  }
}
