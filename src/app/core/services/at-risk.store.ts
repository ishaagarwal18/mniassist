import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';
import { AtRiskAlertService } from '../../proxy/administration/at-risk-alert.service';
import { AtRiskAlertStatus, AtRiskReason } from '../../proxy/administration/at-risk-reason.enum';
import { settled } from '../util/resource';

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
    params: () => ({ tick: this.reloadTick(), resolved: this.showResolved() }),
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
    settled(this.resource, [] as AtRiskAlert[]),
  );
  readonly openCount = computed(() => this.alerts().filter((a) => a.status !== 'resolved').length);

  private reload(): void {
    this.reloadTick.update((n) => n + 1);
  }

  async acknowledge(id: string): Promise<void> {
    await firstValueFrom(this.api.acknowledge(id));
    this.reload();
  }

  async resolve(id: string, note?: string): Promise<void> {
    await firstValueFrom(this.api.resolve(id, note?.trim() || undefined));
    this.reload();
  }

  async addNote(id: string, note: string): Promise<void> {
    await firstValueFrom(this.api.addNote(id, note.trim()));
    this.reload();
  }
}
