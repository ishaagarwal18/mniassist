import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  EnquiryBoardColumnDto,
  EnquiryService,
  EnquiryStage,
  InstalledAssetDto,
  InstalledAssetService,
  QuotationDto,
  QuotationService,
  QuotationState,
  ReminderKind,
} from '../../proxy/pipeline';

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
  stage: Stage;
}
export interface BoardColumn {
  stage: Stage;
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
  issuedAt?: string;
  validUntil?: string;
  nextFollowUpAt?: string;
  daysSinceIssue: number;
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
    label: STAGE_LABEL[stage],
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
  };
}

const OPEN_STAGES: Stage[] = ['new', 'qualified', 'siteVisit', 'quoted', 'negotiation'];

const SEED_BOARD: BoardColumn[] = OPEN_STAGES.map((stage, i) => ({
  stage,
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

  private readonly tick = signal(0);
  readonly includeRetired = signal(false);

  private readonly boardResource = rxResource({
    params: () => (environment.useMockData ? undefined : { tick: this.tick() }),
    stream: () =>
      this.enquiryApi
        .getBoard({ openOnly: true })
        .pipe(map((r) => (r.items ?? []).map(boardColumn))),
    defaultValue: SEED_BOARD,
  });

  private readonly quotesResource = rxResource({
    params: () => (environment.useMockData ? undefined : { tick: this.tick() }),
    stream: () =>
      this.quotationApi
        .getList({ skipCount: 0, maxResultCount: 100 })
        .pipe(map((p) => (p.items ?? []).map(quotation))),
    defaultValue: SEED_QUOTES,
  });

  private readonly assetsResource = rxResource({
    params: () => (environment.useMockData ? undefined : { retired: this.includeRetired() }),
    stream: ({ params }) =>
      this.assetApi
        .getList({ includeRetired: params.retired, skipCount: 0, maxResultCount: 200 })
        .pipe(map((p) => (p.items ?? []).map(asset))),
    defaultValue: SEED_ASSETS,
  });

  readonly board = computed(() =>
    environment.useMockData ? SEED_BOARD : this.boardResource.value(),
  );
  readonly quotes = computed(() =>
    environment.useMockData ? SEED_QUOTES : this.quotesResource.value(),
  );
  readonly assets = computed(() =>
    environment.useMockData ? SEED_ASSETS : this.assetsResource.value(),
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

  private reload(): void {
    this.tick.update((n) => n + 1);
  }

  async moveEnquiry(id: string, stage: EnquiryStage): Promise<void> {
    await firstValueFrom(this.enquiryApi.move(id, { stage }));
    this.reload();
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

  async retireAsset(id: string): Promise<void> {
    await firstValueFrom(this.assetApi.retire(id));
    this.assetsResource.reload();
  }
}
