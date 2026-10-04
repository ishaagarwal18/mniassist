import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { ComplianceStore, DpdpRequest, ReqKind } from '../../core/services/compliance.service';
import { DataRequestKind } from '../../proxy/compliance';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArDialog, ArStatTile } from '../../ui';
import { ArSelect } from '../../ui/select';
import { ChipTone } from '../../ui/chip';

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
  imports: [ArTopbar, ArButton, ArChip, ArDialog, ArStatTile, DecimalPipe, ArSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './compliance.html',
  styleUrl: './compliance.scss',
})
export class ArCompliance {
  private readonly store = inject(ComplianceStore);

  protected readonly loading = this.store.loading;
  protected readonly overview = this.store.overview;
  protected readonly requests = this.store.requests;
  protected readonly policies = this.store.policies;
  protected readonly breaches = this.store.breaches;
  protected readonly busy = signal<string | null>(null);

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
      window.alert('Enter how the data principal identified themselves — a phone number or email.');
      return;
    }
    this.saving.set(true);
    try {
      await this.store.logRequest(this.newKind(), who);
      this.dialogOpen.set(false);
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
    const warn = r.kind === 'erasure' ? '\n\nErasure is irreversible.' : '';
    if (!window.confirm(`Fulfil this ${this.kindLabel(r.kind)} request?${warn}`)) return;
    this.busy.set(r.id);
    try {
      await this.store.fulfil(r.id);
    } finally {
      this.busy.set(null);
    }
  }

  protected async reject(r: DpdpRequest): Promise<void> {
    const reason = window.prompt('Reason for rejecting this request:')?.trim();
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
