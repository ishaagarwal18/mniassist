import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, forkJoin, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  BreachSeverity,
  BreachState,
  ComplianceService as ComplianceApi,
  DataRequestKind,
  DataRequestState,
  RetainedDataClass,
} from '../../proxy/compliance';

export type ReqKind = 'access' | 'correction' | 'erasure' | 'consentWithdrawal';
export type ReqState = 'received' | 'inProgress' | 'fulfilled' | 'rejected';

export interface DpdpRequest {
  id: string;
  kind: ReqKind;
  state: ReqState;
  requester: string;
  contact?: string;
  receivedAt: string;
  daysRemaining: number;
  breached: boolean;
}
export interface RetentionPolicy {
  id: string;
  dataClass: string;
  days: number;
  enabled: boolean;
  lastRun?: string;
  lastRows: number;
}
export interface Breach {
  id: string;
  title: string;
  severity: string;
  state: string;
  detectedAt: string;
  affected: number;
}
export interface Overview {
  openRequests: number;
  breachingSla: number;
  dueThisWeek: number;
  openBreaches: number;
  consentRecords: number;
  marketingConsent: number;
  utilityOnly: number;
  suppressed: number;
  lastRetentionRun?: string;
}

const KIND: Record<DataRequestKind, ReqKind> = {
  [DataRequestKind.Access]: 'access',
  [DataRequestKind.Correction]: 'correction',
  [DataRequestKind.Erasure]: 'erasure',
  [DataRequestKind.ConsentWithdrawal]: 'consentWithdrawal',
};
const STATE: Record<DataRequestState, ReqState> = {
  [DataRequestState.Received]: 'received',
  [DataRequestState.InProgress]: 'inProgress',
  [DataRequestState.Fulfilled]: 'fulfilled',
  [DataRequestState.Rejected]: 'rejected',
};
const CLASS: Record<RetainedDataClass, string> = {
  [RetainedDataClass.Conversations]: 'Conversations & messages',
  [RetainedDataClass.Media]: 'Media',
  [RetainedDataClass.RawWebhookPayloads]: 'Raw webhook payloads',
  [RetainedDataClass.Exports]: 'Exports',
  [RetainedDataClass.AuditLog]: 'Audit log',
  [RetainedDataClass.ConsentRecords]: 'Consent records',
  [RetainedDataClass.CallRecordings]: 'WhatsApp call recordings',
};
const SEV: Record<BreachSeverity, string> = {
  [BreachSeverity.Low]: 'low',
  [BreachSeverity.Medium]: 'medium',
  [BreachSeverity.High]: 'high',
  [BreachSeverity.Critical]: 'critical',
};
const BSTATE: Record<BreachState, string> = {
  [BreachState.Detected]: 'detected',
  [BreachState.Contained]: 'contained',
  [BreachState.Notified]: 'notified',
  [BreachState.Closed]: 'closed',
};

const SEED_OVERVIEW: Overview = {
  openRequests: 3,
  breachingSla: 0,
  dueThisWeek: 1,
  openBreaches: 0,
  consentRecords: 12_486,
  marketingConsent: 9_140,
  utilityOnly: 2_930,
  suppressed: 584,
  lastRetentionRun: '2026-09-05T02:00:00Z',
};
const SEED_REQUESTS: DpdpRequest[] = [
  {
    id: 'r-1',
    kind: 'access',
    state: 'inProgress',
    requester: '+91 98220 11xxx',
    contact: 'Sandeep Rao',
    receivedAt: '2026-08-30',
    daysRemaining: 22,
    breached: false,
  },
  {
    id: 'r-2',
    kind: 'erasure',
    state: 'received',
    requester: 'devendra@sanandpress.in',
    contact: 'Devendra Joshi',
    receivedAt: '2026-09-01',
    daysRemaining: 24,
    breached: false,
  },
  {
    id: 'r-3',
    kind: 'consentWithdrawal',
    state: 'fulfilled',
    requester: '+91 94440 55xxx',
    contact: 'Anitha Menon',
    receivedAt: '2026-08-18',
    daysRemaining: 11,
    breached: false,
  },
];
const SEED_POLICIES: RetentionPolicy[] = [
  {
    id: 'p-0',
    dataClass: 'Conversations & messages',
    days: 730,
    enabled: true,
    lastRun: '2026-09-05T02:00:00Z',
    lastRows: 0,
  },
  {
    id: 'p-1',
    dataClass: 'Media',
    days: 365,
    enabled: true,
    lastRun: '2026-09-05T02:00:00Z',
    lastRows: 412,
  },
  {
    id: 'p-2',
    dataClass: 'Raw webhook payloads',
    days: 30,
    enabled: true,
    lastRun: '2026-09-05T02:00:00Z',
    lastRows: 18_240,
  },
  { id: 'p-3', dataClass: 'Exports', days: 30, enabled: true, lastRows: 0 },
  { id: 'p-4', dataClass: 'Audit log', days: 2555, enabled: false, lastRows: 0 },
  { id: 'p-5', dataClass: 'Consent records', days: 2555, enabled: false, lastRows: 0 },
];

@Injectable({ providedIn: 'root' })
export class ComplianceStore {
  private readonly api = inject(ComplianceApi);
  private readonly tick = signal(0);

  private readonly resource = rxResource({
    params: () => (environment.useMockData ? undefined : { tick: this.tick() }),
    stream: () =>
      forkJoin({
        overview: this.api.getOverview(),
        requests: this.api.getRequests({ skipCount: 0, maxResultCount: 100 }),
        policies: this.api.getRetentionPolicies(),
        breaches: this.api.getBreaches({ skipCount: 0, maxResultCount: 50 }),
      }).pipe(
        map((r) => ({
          overview: {
            openRequests: r.overview.openRequests,
            breachingSla: r.overview.requestsBreachingSla,
            dueThisWeek: r.overview.requestsDueThisWeek,
            openBreaches: r.overview.openBreaches,
            consentRecords: r.overview.consentRecordsHeld,
            marketingConsent: r.overview.contactsWithMarketingConsent,
            utilityOnly: r.overview.contactsUtilityOnly,
            suppressed: r.overview.suppressedContacts,
            lastRetentionRun: r.overview.lastRetentionRunUtc,
          } as Overview,
          requests: (r.requests.items ?? []).map(
            (d) =>
              ({
                id: d.id!,
                kind: d.kind != null ? KIND[d.kind] : KIND[0],
                state: d.state != null ? STATE[d.state] : STATE[0],
                requester: d.requesterIdentifier,
                contact: d.contactDisplayName,
                receivedAt: d.receivedAtUtc,
                daysRemaining: d.daysRemaining,
                breached: d.isBreached,
              }) as DpdpRequest,
          ),
          policies: (r.policies.items ?? []).map(
            (p) =>
              ({
                id: p.id!,
                dataClass: p.dataClass != null ? CLASS[p.dataClass] : CLASS[0],
                days: p.retentionDays,
                enabled: p.isEnabled,
                lastRun: p.lastPurgeAtUtc,
                lastRows: p.lastPurgedRowCount,
              }) as RetentionPolicy,
          ),
          breaches: (r.breaches.items ?? []).map(
            (b) =>
              ({
                id: b.id!,
                title: b.title,
                severity: b.severity != null ? SEV[b.severity] : SEV[0],
                state: b.state != null ? BSTATE[b.state] : BSTATE[0],
                detectedAt: b.detectedAtUtc,
                affected: b.affectedPrincipalCount,
              }) as Breach,
          ),
        })),
      ),
    defaultValue: {
      overview: SEED_OVERVIEW,
      requests: SEED_REQUESTS,
      policies: SEED_POLICIES,
      breaches: [] as Breach[],
    },
  });

  private readonly data = computed(() =>
    environment.useMockData
      ? {
          overview: SEED_OVERVIEW,
          requests: SEED_REQUESTS,
          policies: SEED_POLICIES,
          breaches: [] as Breach[],
        }
      : this.resource.value(),
  );

  readonly loading = computed(() => !environment.useMockData && this.resource.isLoading());
  readonly overview = computed(() => this.data().overview);
  readonly requests = computed(() => this.data().requests);
  readonly policies = computed(() => this.data().policies);
  readonly breaches = computed(() => this.data().breaches);

  private reload(): void {
    this.tick.update((n) => n + 1);
  }

  async fulfil(id: string, notes?: string): Promise<void> {
    await firstValueFrom(this.api.fulfilRequest(id, { notes }));
    this.reload();
  }
  async reject(id: string, reason: string): Promise<void> {
    await firstValueFrom(this.api.rejectRequest(id, { reason }));
    this.reload();
  }
  async setPolicy(id: string, days: number, enabled: boolean): Promise<void> {
    await firstValueFrom(
      this.api.updateRetentionPolicy(id, { retentionDays: days, isEnabled: enabled }),
    );
    this.reload();
  }

  async logRequest(kind: DataRequestKind, requesterIdentifier: string): Promise<void> {
    if (!environment.useMockData) {
      await firstValueFrom(
        this.api.createRequest({ kind, requesterIdentifier: requesterIdentifier.trim() }),
      );
      this.reload();
    }
  }
}
