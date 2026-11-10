import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PermissionService } from '@abp/ng.core';

import {
  Breach,
  ComplianceStore,
  DpdpRequest,
  ReqKind,
} from '../../core/services/compliance.service';
import { BreachSeverity, DataRequestKind } from '../../proxy/compliance';
import { ArDateInput } from '../../ui/date-input';
import { boardStatus, breachProblem, peopleStatus, toLocalInput } from './breach.logic';
import { ArTopbar } from '../../layout/topbar';
import { ArBanner, ArButton, ArChip, ArDialog, ArStatTile } from '../../ui';
import { ArSelect } from '../../ui/select';
import { ArAiCallCompliance } from './ai-calls';
import { ChipTone } from '../../ui/chip';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { ArGrid } from '../../ui/grid';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';

const KIND_LABEL: Record<ReqKind, string> = {
  access: 'Access',
  correction: 'Correction',
  erasure: 'Erasure',
  consentWithdrawal: 'Consent withdrawal',
};

/**
 * Compliance & consent centre (M14). The DPDP request queue with its 30-day clock,
 * the retention policies the purge worker enforces, and the breach log. Consent
 * records themselves are never deletable — the policy for that class is shown but
 * cannot be enabled.
 */
@Component({
  selector: 'ar-compliance',
  imports: [
    ArTopbar,
    ArBanner,
    ArButton,
    ArChip,
    ArDialog,
    ArStatTile,
    DecimalPipe,
    ArSelect,
    ArDateInput,
    ArAiCallCompliance,
    ArGrid,
    GridModule,
    NgTemplateOutlet,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './compliance.html',
  styleUrl: './compliance.scss',
})
export class ArCompliance {
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);
  private readonly store = inject(ComplianceStore);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly router = inject(Router, { optional: true });

  protected readonly mode = (this.route?.snapshot?.data?.['mode'] as string | undefined) ?? 'list';
  protected readonly isPage = this.mode !== 'list';

  protected readonly pageTitle = computed(() =>
    this.mode === 'new'
      ? 'Log a DPDP request'
      : this.mode === 'breach'
        ? 'Log a data breach'
        : 'Compliance',
  );

  protected readonly loading = this.store.loading;
  protected readonly failed = this.store.failed;
  protected readonly overview = this.store.overview;
  protected readonly requests = this.store.requests;
  protected readonly policies = this.store.policies;
  protected readonly breaches = this.store.breaches;
  protected readonly busy = signal<string | null>(null);

  constructor() {
    if (this.mode === 'new') {
      this.openDialog();
    } else if (this.mode === 'breach') {
      this.openBreachDialog();
    }
  }

  protected goNew(): void {
    if (this.router) void this.router.navigate(['/compliance/requests/new']);
    else this.openDialog();
  }

  protected close(): void {
    this.dialogOpen.set(false);
    this.breachOpen.set(false);
    if (this.isPage && this.router) {
      void this.router.navigate(['/compliance']);
    }
  }

  // ---- Breach log ------------------------------------------------------

  /** Recording and working breaches is its own permission (AutoReach.Compliance.ManageBreaches). */
  protected readonly canManageBreaches = inject(PermissionService).getGrantedPolicy(
    'AutoReach.Compliance.ManageBreaches',
  );
  protected readonly severities = [
    { value: BreachSeverity.Low, label: 'Low — little or no harm likely' },
    { value: BreachSeverity.Medium, label: 'Medium' },
    { value: BreachSeverity.High, label: 'High — people could be harmed' },
    { value: BreachSeverity.Critical, label: 'Critical — sensitive data or many people' },
  ];
  protected readonly breachOpen = signal(false);
  protected readonly breachTitle = signal('');
  protected readonly breachSeverity = signal<BreachSeverity>(BreachSeverity.Medium);
  protected readonly breachDetected = signal('');
  protected readonly breachAffected = signal(0);
  protected readonly breachDescription = signal('');
  protected readonly breachMax = signal(toLocalInput(new Date()));
  protected readonly boardStatus = boardStatus;
  protected readonly peopleStatus = peopleStatus;

  protected goNewBreach(): void {
    if (this.router) void this.router.navigate(['/compliance/breaches/new']);
    else this.openBreachDialog();
  }

  protected openBreachDialog(): void {
    const now = toLocalInput(new Date());
    this.breachTitle.set('');
    this.breachSeverity.set(BreachSeverity.Medium);
    this.breachDetected.set(now);
    this.breachMax.set(now);
    this.breachAffected.set(0);
    this.breachDescription.set('');
    this.breachOpen.set(true);
  }

  protected async saveBreach(): Promise<void> {
    const problem = breachProblem(
      this.breachTitle(),
      this.breachDetected(),
      Number(this.breachAffected()),
    );
    if (problem) {
      this.toasts.warning(problem, 'Breach');
      return;
    }
    this.saving.set(true);
    try {
      await this.store.logBreach({
        title: this.breachTitle(),
        severity: this.breachSeverity(),
        detectedAt: new Date(this.breachDetected()).toISOString(),
        affected: Number(this.breachAffected()),
        description: this.breachDescription(),
      });
      this.toasts.success(
        'Incident logged. The 72-hour clock for telling the Data Protection Board has started.',
        'Breach',
      );
      this.close();
    } catch {
      this.toasts.error('The incident could not be logged. Try again.', 'Breach');
    } finally {
      this.saving.set(false);
    }
  }

  protected async containBreach(b: Breach): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: 'Mark this incident contained?',
      message: `Use this once the leak in “${b.title}” has been stopped — for example a password changed, access removed or a lost device wiped.`,
      confirmText: 'Mark contained',
    });
    if (!ok) return;
    await this.runBreach(b.id, () => this.store.containBreach(b.id));
  }

  protected async boardTold(b: Breach): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: 'Record that the Board was told?',
      message:
        'Use this once you have reported the incident to the Data Protection Board of India. Today’s date is recorded.',
      confirmText: 'Record it',
    });
    if (!ok) return;
    await this.runBreach(b.id, () => this.store.recordBreachNotification(b.id, { board: true }));
  }

  protected async peopleTold(b: Breach): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: 'Record that the affected people were told?',
      message: `Use this once the ${b.affected} people whose data was involved have been told what happened and what they can do. Today’s date is recorded.`,
      confirmText: 'Record it',
    });
    if (!ok) return;
    await this.runBreach(b.id, () =>
      this.store.recordBreachNotification(b.id, { principals: true }),
    );
  }

  protected async closeBreach(b: Breach): Promise<void> {
    const notes = await this.dialogs.ask(
      'Close this incident?',
      {
        label: 'What was done, and what stops it happening again',
        multiline: true,
        required: true,
        maxLength: 2000,
      },
      'Kept with the incident as its record.',
    );
    if (!notes) return;
    await this.runBreach(b.id, () => this.store.closeBreach(b.id, notes));
  }

  private async runBreach(id: string, work: () => Promise<void>): Promise<void> {
    this.busy.set(id);
    try {
      await work();
    } catch {
      this.toasts.error('That could not be saved. Try again.', 'Breach');
    } finally {
      this.busy.set(null);
    }
  }

  protected kindLabel(k: ReqKind): string {
    return KIND_LABEL[k];
  }

  // ---- Log a request dialog --------------------------------------------

  protected readonly requestKinds = [
    { value: DataRequestKind.Access, label: 'Access' },
    { value: DataRequestKind.Correction, label: 'Correction' },
    { value: DataRequestKind.Erasure, label: 'Erasure' },
    { value: DataRequestKind.ConsentWithdrawal, label: 'Consent withdrawal' },
  ];
  protected readonly dialogOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly newKind = signal<DataRequestKind>(DataRequestKind.Access);
  protected readonly requester = signal('');

  protected openDialog(): void {
    this.newKind.set(DataRequestKind.Access);
    this.requester.set('');
    this.dialogOpen.set(true);
  }

  protected async saveRequest(): Promise<void> {
    const who = this.requester().trim();
    if (!who) {
      this.toasts.warning(
        'Enter how the data principal identified themselves — a phone number or email.',
        'Request',
      );
      return;
    }
    this.saving.set(true);
    try {
      await this.store.logRequest(this.newKind(), who);
      this.close();
    } finally {
      this.saving.set(false);
    }
  }

  protected slaTone(r: DpdpRequest): ChipTone {
    if (r.state === 'fulfilled') return 'good';
    if (r.state === 'rejected') return 'neutral';
    if (r.breached || r.daysRemaining < 0) return 'bad';
    if (r.daysRemaining <= 7) return 'amber';
    return 'neutral';
  }

  protected slaLabel(r: DpdpRequest): string {
    if (r.state === 'fulfilled') return 'fulfilled';
    if (r.state === 'rejected') return 'rejected';
    if (r.daysRemaining < 0) return `${-r.daysRemaining}d over SLA`;
    return `${r.daysRemaining}d left`;
  }

  protected when(iso?: string): string {
    return iso
      ? new Date(iso).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : 'never';
  }

  protected async fulfil(r: DpdpRequest): Promise<void> {
    // Nothing can be exported or erased for someone who matches no contact: the
    // right answer is to tell them no personal data is held.
    if (!r.contact) {
      const reject = await this.dialogs.confirm({
        title: 'No contact matches this request',
        message: `Nobody in your contacts matches “${r.requester}”, so there is nothing to export, correct or erase.`,
        details: [
          'Check the phone number or email on the request; a typo is the usual cause.',
          'If you hold no data about this person, reject the request and tell them so.',
        ],
        confirmText: 'Reject: no data held',
        cancelText: 'Close',
      });
      if (!reject) return;
      this.busy.set(r.id);
      try {
        await this.store.reject(
          r.id,
          'We hold no personal data linked to the phone number or email you gave us.',
        );
      } finally {
        this.busy.set(null);
      }
      return;
    }
    if (
      !(await this.dialogs.confirm({
        title: `Fulfil this ${this.kindLabel(r.kind)} request?`,
        message:
          r.kind === 'erasure'
            ? 'Their personal data is erased. Erasure cannot be undone.'
            : 'The request is carried out and marked fulfilled.',
        confirmText: 'Fulfil',
        tone: r.kind === 'erasure' ? 'danger' : 'primary',
      }))
    )
      return;
    this.busy.set(r.id);
    try {
      await this.store.fulfil(r.id);
    } finally {
      this.busy.set(null);
    }
  }

  protected async reject(r: DpdpRequest): Promise<void> {
    const reason = await this.dialogs.ask(
      'Reject this request?',
      { label: 'Reason for rejecting', multiline: true, required: true, maxLength: 500 },
      'The data principal is told why.',
    );
    if (!reason) return;
    this.busy.set(r.id);
    try {
      await this.store.reject(r.id, reason);
    } finally {
      this.busy.set(null);
    }
  }

  protected async togglePolicy(id: string, days: number, enabled: boolean): Promise<void> {
    this.busy.set(id);
    try {
      await this.store.setPolicy(id, days, enabled);
    } finally {
      this.busy.set(null);
    }
  }

  protected onDaysChange(id: string, enabled: boolean, event: Event): void {
    const days = Number((event.target as HTMLInputElement).value);
    if (days >= 1) void this.togglePolicy(id, days, enabled);
  }

  protected isConsentClass(dataClass: string): boolean {
    return dataClass === 'Consent records';
  }
}
