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
    templateName: c.templateName,
    segmentName: c.segmentName,
    state: STATE[c.state],
    scheduledAt: c.scheduledAtUtc,
    dispatched: c.dispatchedCount,
    estimatedRecipients: c.estimatedRecipients,
    estimatedCostInPaise: c.estimatedCostInPaise,
    optOutRate: c.optOutRate,
    suspendReason: c.suspendReason,
  };
}
function toPreflight(p: CampaignPreflightDto): Preflight {
  return {
    outcomes: (p.outcomes ?? []).map((o) => ({
      check: CHECK[o.check],
      passed: o.passed,
      blocking: o.isBlocking,
      detail: o.detail,
    })),
    recipients: p.recipients,
    estimatedCostInPaise: p.estimatedCostInPaise,
    walletBalanceInPaise: p.walletBalanceInPaise,
    canSend: p.canSend,
    canSendImmediately: p.canSendImmediately,
    daysRequired: p.daysRequired,
  };
}
function toReport(r: CampaignReportDto): Report {
  return {
    state: STATE[r.state],
    queued: r.queued,
    sent: r.sent,
    delivered: r.delivered,
    read: r.read,
    failed: r.failed,
    withheld: r.withheld,
    replied: r.replied,
    optedOut: r.optedOut,
    spendInPaise: r.spendInPaise,
    deliveryRate: r.deliveryRate,
    readRate: r.readRate,
    replyRate: r.replyRate,
    errors: (r.errors ?? []).map((e) => ({
      code: e.errorCode,
      title: e.title,
      count: e.count,
      guidance: e.guidance,
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
    defaultValue: SEED,
  });

  readonly loading = computed(() => !environment.useMockData && this.resource.isLoading());
  readonly campaigns = computed(() => (environment.useMockData ? SEED : this.resource.value()));

  private reload(): void {
    this.tick.update((n) => n + 1);
  }

  async preflight(id: string): Promise<Preflight> {
    return toPreflight(await firstValueFrom(this.api.preflight(id)));
  }
  async report(id: string): Promise<Report> {
    return toReport(await firstValueFrom(this.api.getReport(id)));
  }
  async sendNow(id: string): Promise<void> {
    await firstValueFrom(this.api.sendNow(id));
    this.reload();
  }
  async pause(id: string): Promise<void> {
    await firstValueFrom(this.api.pause(id));
    this.reload();
  }
  async resume(id: string): Promise<void> {
    await firstValueFrom(this.api.resume(id));
    this.reload();
  }
  async cancel(id: string): Promise<void> {
    await firstValueFrom(this.api.cancel(id));
    this.reload();
  }
}
