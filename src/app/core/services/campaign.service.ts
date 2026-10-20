import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CampaignDto,
  CampaignPreflightDto,
  CampaignReportDto,
  CampaignService as CampaignApi,
  CampaignState,
  PreflightCheck,
} from '../../proxy/campaigns';
import { settled } from '../util/resource';

export type CState =
  'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled' | 'suspended';

export interface Campaign {
  id: string;
  name: string;
  templateName?: string;
  segmentName?: string;
  state: CState;
  scheduledAt?: string;
  dispatched: number;
  estimatedRecipients: number;
  estimatedCostInPaise: number;
  optOutRate: number;
  suspendReason?: string;
  /** Hold each recipient until the hour they usually message us (M05-12). */
  optimiseSendTime: boolean;
}

export interface PreflightOutcome {
  check: string;
  passed: boolean;
  blocking: boolean;
  detail?: string;
}
export interface Preflight {
  outcomes: PreflightOutcome[];
  recipients: number;
  estimatedCostInPaise: number;
  walletBalanceInPaise: number;
  canSend: boolean;
  canSendImmediately: boolean;
  daysRequired: number;
  /** Of `recipients`, how many have a learned send hour. */
  learnedSendHourRecipients: number;
}

/**
 * "12 of 40 (30%) have a learned hour; the other 28 go out at the scheduled time." — what best-time sending would
 * actually change for this audience.
 */
export function sendTimeCoverage(learned: number, recipients: number): string {
  if (recipients <= 0) return 'No recipients yet, so no one to time.';
  if (learned <= 0)
    return `None of the ${recipients.toLocaleString('en-IN')} recipients has enough reply history yet — all go out at the scheduled time.`;
  const pct = Math.round((learned / recipients) * 100);
  const rest = recipients - learned;
  return rest === 0
    ? `All ${recipients.toLocaleString('en-IN')} recipients have a learned hour.`
    : `${learned.toLocaleString('en-IN')} of ${recipients.toLocaleString('en-IN')} recipients (${pct}%) have a learned hour; the other ${rest.toLocaleString('en-IN')} go out at the scheduled time.`;
}
export interface Report {
  state: CState;
  queued: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  withheld: number;
  replied: number;
  optedOut: number;
  spendInPaise: number;
  deliveryRate: number;
  readRate: number;
  replyRate: number;
  /** M12-1: only meaningful when the campaign sent a tracked link. */
  hasTrackedLinks: boolean;
  clicked: number;
  clickRate: number;
  costPerReplyInPaise?: number;
  errors: { code: number; title?: string; count: number; guidance?: string }[];
}

const STATE: Record<CampaignState, CState> = {
  [CampaignState.Draft]: 'draft',
  [CampaignState.Scheduled]: 'scheduled',
  [CampaignState.Running]: 'running',
  [CampaignState.Paused]: 'paused',
  [CampaignState.Completed]: 'completed',
  [CampaignState.Cancelled]: 'cancelled',
  [CampaignState.Suspended]: 'suspended',
};
const CHECK: Record<PreflightCheck, string> = {
  [PreflightCheck.TemplateApproved]: 'Template approved & active',
  [PreflightCheck.VariablesResolve]: 'All variables resolve',
  [PreflightCheck.AudienceNotEmpty]: 'Audience not empty',
  [PreflightCheck.TierHeadroom]: 'Tier headroom',
  [PreflightCheck.WalletBalance]: 'Wallet covers the estimate',
};

function toCampaign(c: CampaignDto): Campaign {
  return {
    id: c.id!,
    name: c.name ?? '(untitled)',
    templateName: c.templateName ?? undefined,
    segmentName: c.segmentName ?? undefined,
    state: c.state != null ? STATE[c.state] : 'draft',
    scheduledAt: c.scheduledAtUtc ?? undefined,
    dispatched: c.dispatchedCount ?? 0,
    estimatedRecipients: c.estimatedRecipients ?? 0,
    estimatedCostInPaise: c.estimatedCostInPaise ?? 0,
    optOutRate: c.optOutRate ?? 0,
    suspendReason: c.suspendReason ?? undefined,
    optimiseSendTime: c.optimiseSendTime ?? false,
  };
}
function toPreflight(p: CampaignPreflightDto): Preflight {
  return {
    outcomes: (p.outcomes ?? []).map((o) => ({
      check: o.check != null ? CHECK[o.check] : '',
      passed: o.passed ?? false,
      blocking: o.isBlocking ?? false,
      detail: o.detail ?? undefined,
    })),
    recipients: p.recipients ?? 0,
    estimatedCostInPaise: p.estimatedCostInPaise ?? 0,
    walletBalanceInPaise: p.walletBalanceInPaise ?? 0,
    canSend: p.canSend ?? false,
    canSendImmediately: p.canSendImmediately ?? false,
    daysRequired: p.daysRequired ?? 0,
    learnedSendHourRecipients: p.learnedSendHourRecipients ?? 0,
  };
}
function toReport(r: CampaignReportDto): Report {
  return {
    state: r.state != null ? STATE[r.state] : 'draft',
    queued: r.queued ?? 0,
    sent: r.sent ?? 0,
    delivered: r.delivered ?? 0,
    read: r.read ?? 0,
    failed: r.failed ?? 0,
    withheld: r.withheld ?? 0,
    replied: r.replied ?? 0,
    optedOut: r.optedOut ?? 0,
    spendInPaise: r.spendInPaise ?? 0,
    deliveryRate: r.deliveryRate ?? 0,
    readRate: r.readRate ?? 0,
    replyRate: r.replyRate ?? 0,
    hasTrackedLinks: r.hasTrackedLinks ?? false,
    clicked: r.clicked ?? 0,
    clickRate: r.clickRate ?? 0,
    costPerReplyInPaise: r.costPerReplyInPaise ?? undefined,
    errors: (r.errors ?? []).map((e) => ({
      code: e.errorCode ?? 0,
      title: e.title ?? undefined,
      count: e.count ?? 0,
      guidance: e.guidance ?? undefined,
    })),
  };
}

const SEED: Campaign[] = [
  {
    id: 'c-1',
    name: 'September AMC renewal',
    templateName: 'amc_renewal_30d',
    segmentName: 'AMC expiring ≤ 60 days',
    state: 'running',
    dispatched: 940,
    estimatedRecipients: 1_347,
    estimatedCostInPaise: 3_780_00,
    optOutRate: 0.002,
    optimiseSendTime: false,
  },
  {
    id: 'c-2',
    name: 'August technical bulletin',
    templateName: 'vfd_retrofit_bulletin',
    segmentName: 'Exhibition 2026 leads',
    state: 'completed',
    dispatched: 612,
    estimatedRecipients: 612,
    estimatedCostInPaise: 5_282_00,
    optOutRate: 0.004,
    optimiseSendTime: false,
  },
  {
    id: 'c-3',
    name: 'Q4 dealer price revision',
    templateName: 'dealer_price_list_v2',
    segmentName: 'Dealers — West',
    state: 'scheduled',
    scheduledAt: '2026-09-08T04:30:00Z',
    dispatched: 0,
    estimatedRecipients: 196,
    estimatedCostInPaise: 1_690_00,
    optOutRate: 0,
    optimiseSendTime: false,
  },
  {
    id: 'c-4',
    name: 'Calibration due — Sept batch',
    templateName: 'calibration_due_v1',
    segmentName: 'Instrumentation contacts',
    state: 'draft',
    dispatched: 0,
    estimatedRecipients: 284,
    estimatedCostInPaise: 0,
    optOutRate: 0,
    optimiseSendTime: false,
  },
];

@Injectable({ providedIn: 'root' })
export class CampaignStore {
  private readonly api = inject(CampaignApi);
  private readonly tick = signal(0);

  private readonly resource = rxResource({
    params: () => (environment.useMockData ? undefined : { tick: this.tick() }),
    stream: () =>
      this.api
        .getList({ skipCount: 0, maxResultCount: 100 })
        .pipe(map((p) => (p.items ?? []).map(toCampaign))),
    defaultValue: [],
  });

  readonly loading = computed(() => !environment.useMockData && this.resource.isLoading());
  // Mock mode has no server to hold the toggle, so it lives here for the session.
  private readonly mockOptimise = signal<Record<string, boolean>>({});
  private readonly mockCampaigns = signal<Campaign[]>([...SEED]);

  readonly campaigns = computed(() =>
    environment.useMockData
      ? this.mockCampaigns().map((c) => ({
          ...c,
          optimiseSendTime: this.mockOptimise()[c.id] ?? c.optimiseSendTime,
        }))
      : settled(this.resource, []),
  );

  private reload(): void {
    this.tick.update((n) => n + 1);
  }

  refresh(): void {
    this.reload();
  }

  async preflight(id: string): Promise<Preflight> {
    return toPreflight(await firstValueFrom(this.api.preflight(id)));
  }
  async report(id: string): Promise<Report> {
    return toReport(await firstValueFrom(this.api.getReport(id)));
  }
  async sendNow(id: string): Promise<void> {
    if (environment.useMockData) {
      this.mockCampaigns.update((list) =>
        list.map((c) => (c.id === id ? { ...c, state: 'running' as CState } : c)),
      );
      return;
    }
    await firstValueFrom(this.api.sendNow(id));
    this.reload();
  }
  async pause(id: string): Promise<void> {
    if (environment.useMockData) {
      this.mockCampaigns.update((list) =>
        list.map((c) => (c.id === id ? { ...c, state: 'paused' as CState } : c)),
      );
      return;
    }
    await firstValueFrom(this.api.pause(id));
    this.reload();
  }
  async resume(id: string): Promise<void> {
    if (environment.useMockData) {
      this.mockCampaigns.update((list) =>
        list.map((c) => (c.id === id ? { ...c, state: 'running' as CState } : c)),
      );
      return;
    }
    await firstValueFrom(this.api.resume(id));
    this.reload();
  }
  async cancel(id: string): Promise<void> {
    if (environment.useMockData) {
      this.mockCampaigns.update((list) =>
        list.map((c) => (c.id === id ? { ...c, state: 'cancelled' as CState } : c)),
      );
      return;
    }
    await firstValueFrom(this.api.cancel(id));
    this.reload();
  }
  async delete(id: string): Promise<void> {
    if (environment.useMockData) {
      this.mockCampaigns.update((list) => list.filter((c) => c.id !== id));
      return;
    }
    await firstValueFrom(this.api.delete(id));
    this.reload();
  }

  /**
   * Send-time optimisation (M05-12). A dedicated call rather than a campaign update: the
   * update replaces the audience, throttle and content, and a toggle must not be able to.
   * Only draft and scheduled campaigns accept it.
   */
  async setOptimiseSendTime(id: string, optimise: boolean): Promise<void> {
    if (environment.useMockData) {
      this.mockOptimise.update((m) => ({ ...m, [id]: optimise }));
      return;
    }
    await firstValueFrom(this.api.configureSendTime(id, { optimise }));
    this.reload();
  }

  /** Creates a draft campaign. Template, segment and schedule are set later. */
  async create(name: string, channelId: string, templateId: string): Promise<string> {
    if (environment.useMockData) {
      const id = 'c-' + Date.now();
      this.mockCampaigns.update((list) => [
        {
          id,
          name: name.trim(),
          state: 'draft',
          dispatched: 0,
          estimatedRecipients: 0,
          estimatedCostInPaise: 0,
          optOutRate: 0,
          optimiseSendTime: false,
        },
        ...list,
      ]);
      return id;
    }
    const created = await firstValueFrom(
      this.api.create({ name: name.trim(), channelId, templateId }),
    );
    this.reload();
    return created.id!;
  }
}
