import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AtRiskAlertService } from '../../proxy/administration/at-risk-alert.service';
import { AtRiskAlertStatus, AtRiskReason } from '../../proxy/administration/at-risk-reason.enum';

export interface AtRiskAlert {
  readonly id: string;
  readonly tenantName: string;
  readonly reason: string;
  readonly detail: string;
  readonly status: 'open' | 'acknowledged' | 'resolved';
  readonly detectedAt?: string;
  readonly assignedTo?: string;
  readonly resolvedByRecovery: boolean;
  readonly notes?: string;
}

const REASON: Record<AtRiskReason, string> = {
  [AtRiskReason.NumberQualityDegraded]: 'Number quality degraded',
  [AtRiskReason.StoppedSending]: 'Stopped sending',
  [AtRiskReason.TrialNeverSent]: 'Trial never sent',
};

const STATUS: Record<AtRiskAlertStatus, AtRiskAlert['status']> = {
  [AtRiskAlertStatus.Open]: 'open',
  [AtRiskAlertStatus.Acknowledged]: 'acknowledged',
  [AtRiskAlertStatus.Resolved]: 'resolved',
};

const SEED: readonly AtRiskAlert[] = [
  {
    id: 'a-1',
    tenantName: 'Deccan Valves',
    reason: 'Number quality degraded',
    detail:
      "A connected number's quality rating is Red. Sends can be throttled or the number restricted.",
    status: 'open',
    detectedAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    resolvedByRecovery: false,
  },
  {
    id: 'a-2',
    tenantName: 'Kohinoor Instruments',
    reason: 'Trial never sent',
    detail: 'A trial connected a number but has never sent a message — onboarding has stalled.',
    status: 'acknowledged',
    detectedAt: new Date(Date.now() - 6 * 86_400_000).toISOString(),
    assignedTo: 'success.ravi',
    resolvedByRecovery: false,
  },
];

/**
 * The success team's at-risk-tenant queue (M15-3). The nightly sweep opens these
 * and also notifies the tenant owner; this is where a human works them.
 */
@Injectable({ providedIn: 'root' })
export class AtRiskStore {
  private readonly api = inject(AtRiskAlertService);
  private readonly reloadTick = signal(0);
  readonly showResolved = signal(false);

  private readonly resource = rxResource({
    params: () =>
      environment.useMockData
        ? undefined
        : { tick: this.reloadTick(), resolved: this.showResolved() },
    stream: ({ params }) =>
      this.api
        .getList({
          status: params.resolved ? undefined : AtRiskAlertStatus.Open,
          skipCount: 0,
          maxResultCount: 100,
        })
        .pipe(
          map((page) =>
            (page.items ?? []).map((a): AtRiskAlert => ({
              id: a.id!,
              tenantName: a.tenantName ?? '(unknown tenant)',
              reason: a.reason != null ? REASON[a.reason] : 'At risk',
              detail: a.detail ?? '',
              status: a.status != null ? STATUS[a.status] : 'open',
              detectedAt: a.detectedAtUtc ?? undefined,
              assignedTo: a.assignedToUserName ?? undefined,
              resolvedByRecovery: a.resolvedByRecovery ?? false,
              notes: a.notes ?? undefined,
            })),
          ),
        ),
    defaultValue: [] as AtRiskAlert[],
  });

  readonly alerts = computed<readonly AtRiskAlert[]>(() =>
    environment.useMockData ? SEED : this.resource.value(),
  );
  readonly openCount = computed(() => this.alerts().filter((a) => a.status !== 'resolved').length);

  private reload(): void {
    this.reloadTick.update((n) => n + 1);
  }

  async acknowledge(id: string): Promise<void> {
    if (!environment.useMockData) {
      await firstValueFrom(this.api.acknowledge(id));
      this.reload();
    }
  }

  async resolve(id: string, note?: string): Promise<void> {
    if (!environment.useMockData) {
      await firstValueFrom(this.api.resolve(id, note?.trim() || undefined));
      this.reload();
    }
  }

  async addNote(id: string, note: string): Promise<void> {
    if (!environment.useMockData) {
      await firstValueFrom(this.api.addNote(id, note.trim()));
      this.reload();
    }
  }
}
