import { PermissionService } from '@abp/ng.core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
  ViewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { PipelineStore, QState, Quotation } from '../../core/services/pipeline.service';
import { ContactService } from '../../core/services/contact.service';
import { readApiError } from '../../core/util/api-error';
import { inr } from '../../core/util/format';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip } from '../../ui';
import { ArIcon } from '../../ui/icon';
import { ArGrid } from '../../ui/grid';
import { GridComponent, GridModule } from '@syncfusion/ej2-angular-grids';
import {
  QuotationSignatureService,
  QuotationSignatureSummaryDto,
  SignatureRequestStatus,
} from '../../proxy/pipeline';
import { SIGNATURE_STATUS_LABEL } from '../signing/signing-logic';
import { ArQuoteSignatureDialog } from './quote-signature-dialog';
import { ChipTone } from '../../ui/chip';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';

const STATE_TONE: Record<QState, ChipTone> = {
  draft: 'neutral',
  issued: 'amber',
  revised: 'amber',
  won: 'good',
  lost: 'bad',
  expired: 'warn',
};

const STATE_LABEL: Record<QState, string> = {
  draft: 'Draft',
  issued: 'Issued',
  revised: 'Revised',
  won: 'Accepted',
  lost: 'Rejected',
  expired: 'Expired',
};

/**
 * Enterprise Quotations Management Dashboard.
 * Includes KPI metrics, advanced filtering, full enquiry & contact resolution,
 * follow-up cadence monitoring, and single-click quotation actions.
 */
@Component({
  selector: 'ar-quotations',
  imports: [
    ArTopbar,
    ArButton,
    ArChip,
    ArIcon,
    ArQuoteSignatureDialog,
    RouterLink,
    ArGrid,
    GridModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quotations.html',
  styleUrl: './quotations.scss',
})
export class ArQuotations {
  @ViewChild(GridComponent) protected grid?: GridComponent;

  private readonly permissions = inject(PermissionService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);
  private readonly store = inject(PipelineStore);
  private readonly signatures = inject(QuotationSignatureService);
  private readonly contactService = inject(ContactService);
  private readonly router = inject(Router);

  protected readonly canCreate = grantedPolicy('AutoReach.Quotations.Create', this.permissions);
  protected readonly canUpdate = grantedPolicy('AutoReach.Quotations.Update', this.permissions);
  protected readonly canDelete = grantedPolicy('AutoReach.Quotations.Delete', this.permissions);
  protected readonly canImport = grantedPolicy('AutoReach.Quotations.Import', this.permissions);
  protected readonly canCrossReference = grantedPolicy(
    'AutoReach.Quotations.CrossReferences',
    this.permissions,
  );

  protected readonly quotes = this.store.quotes;
  protected readonly loading = this.store.loading;
  protected readonly busy = signal<string | null>(null);

  // ---- Signatures ------------------------------------------------------
  protected readonly signingAvailable = true;
  protected readonly signatureStatus = signal<ReadonlyMap<string, QuotationSignatureSummaryDto>>(
    new Map(),
  );
  protected readonly signingFor = signal<Quotation | null>(null);

  // ---- Search and Filters ----------------------------------------------
  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<string>('all');
  protected readonly followUpFilter = signal<string>('all');
  protected readonly validityFilter = signal<string>('all');
  protected readonly dateRangePreset = signal<string>('all');

  // ---- Enquiry & Contact Mapping ---------------------------------------
  private readonly enquiryMap = computed(() => {
    const map = new Map<string, { reference: string; title: string; contact: string; company?: string }>();
    for (const col of this.store.board()) {
      for (const card of col.cards) {
        map.set(card.id, {
          reference: card.reference,
          title: card.title,
          contact: card.contact,
          company: card.company,
        });
      }
    }
    return map;
  });

  private readonly contactMap = computed(() => {
    const map = new Map<string, { name: string; company?: string }>();
    for (const c of this.contactService.contacts()) {
      map.set(c.id, {
        name: c.name,
        company: c.company || undefined,
      });
    }
    return map;
  });

  // ---- Summary KPI Metrics ---------------------------------------------
  protected readonly totalQuotesCount = computed(() => this.quotes().length);

  protected readonly draftQuotesCount = computed(
    () => this.quotes().filter((q) => q.state === 'draft').length,
  );

  protected readonly issuedQuotesCount = computed(
    () => this.quotes().filter((q) => q.state === 'issued').length,
  );

  protected readonly awaitingDecision = computed(
    () => this.quotes().filter((q) => q.state === 'issued' || q.state === 'revised').length,
  );

  protected readonly awaitingDecisionValue = computed(() =>
    this.quotes()
      .filter((q) => q.state === 'issued' || q.state === 'revised')
      .reduce((sum, q) => sum + q.totalInPaise, 0),
  );

  protected readonly followUpsDueCount = computed(() => {
    const now = Date.now();
    return this.quotes().filter((q) => {
      if (!q.nextFollowUpAt) return false;
      const diff = new Date(q.nextFollowUpAt).getTime() - now;
      return diff <= 86_400_000;
    }).length;
  });

  protected readonly totalQuotationValue = computed(() =>
    this.quotes().reduce((sum, q) => sum + q.totalInPaise, 0),
  );

  // ---- Active Filter Computation ---------------------------------------
  protected readonly activeFiltersCount = computed(() => {
    let count = 0;
    if (this.searchTerm().trim()) count++;
    if (this.statusFilter() !== 'all') count++;
    if (this.followUpFilter() !== 'all') count++;
    if (this.validityFilter() !== 'all') count++;
    if (this.dateRangePreset() !== 'all') count++;
    return count;
  });

  protected readonly filteredQuotes = computed(() => {
    let list = this.quotes();
    const search = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();
    const fu = this.followUpFilter();
    const val = this.validityFilter();
    const preset = this.dateRangePreset();
    const now = Date.now();

    // Search filter: Reference, Customer Name, Company Name, Enquiry Ref
    if (search) {
      list = list.filter((q) => {
        const ref = q.reference.toLowerCase();
        const cust = this.customerName(q).toLowerCase();
        const comp = this.companyName(q).toLowerCase();
        const enq = this.enquiryRef(q).toLowerCase();
        return ref.includes(search) || cust.includes(search) || comp.includes(search) || enq.includes(search);
      });
    }

    // Status filter
    if (status !== 'all') {
      if (status === 'awaiting') {
        list = list.filter((q) => q.state === 'issued' || q.state === 'revised');
      } else {
        list = list.filter((q) => q.state === status);
      }
    }

    // Follow-up status filter
    if (fu !== 'all') {
      list = list.filter((q) => {
        if (fu === 'due') {
          if (!q.nextFollowUpAt) return false;
          return new Date(q.nextFollowUpAt).getTime() - now <= 86_400_000;
        }
        if (fu === 'scheduled') {
          if (!q.nextFollowUpAt) return false;
          return new Date(q.nextFollowUpAt).getTime() - now > 86_400_000;
        }
        if (fu === 'none') {
          return !q.nextFollowUpAt;
        }
        return true;
      });
    }

    // Validity filter
    if (val !== 'all') {
      list = list.filter((q) => {
        if (!q.validUntil) return val === 'expired';
        const diff = new Date(q.validUntil).getTime() - now;
        const days = Math.round(diff / 86_400_000);
        if (val === 'expired') return days < 0;
        if (val === 'expiring') return days >= 0 && days <= 3;
        if (val === 'valid') return days > 3;
        return true;
      });
    }

    // Date range preset
    if (preset !== 'all') {
      let minTime = 0;
      if (preset === '7d') {
        minTime = now - 7 * 86_400_000;
      } else if (preset === '30d') {
        minTime = now - 30 * 86_400_000;
      } else if (preset === 'this_month') {
        const d = new Date();
        minTime = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      }

      list = list.filter((q) => {
        if (!q.issuedAt) return true;
        return new Date(q.issuedAt).getTime() >= minTime;
      });
    }

    return list;
  });

  protected readonly visibleTotal = computed(() =>
    this.filteredQuotes().reduce((sum, q) => sum + q.totalInPaise, 0),
  );

  constructor() {
    effect(() => {
      const ids = this.quotes().map((q) => q.id);
      if (!this.signingAvailable || ids.length === 0) return;
      untracked(() => void this.loadSignatureStatuses(ids));
    });
  }

  private async loadSignatureStatuses(ids: string[]): Promise<void> {
    try {
      const rows = await firstValueFrom(this.signatures.lookupStatuses(ids.slice(0, 200)));
      this.signatureStatus.set(
        new Map(rows.filter((r) => r.quotationId).map((r) => [r.quotationId!, r])),
      );
    } catch {
      // The list is still useful without the chips.
    }
  }

  // ---- Row Helper Methods ----------------------------------------------
  protected customerName(q: Quotation): string {
    const enq = q.enquiryId ? this.enquiryMap().get(q.enquiryId) : undefined;
    if (enq?.contact) return enq.contact;
    const con = q.contactId ? this.contactMap().get(q.contactId) : undefined;
    if (con?.name) return con.name;
    return 'Direct Customer';
  }

  protected companyName(q: Quotation): string {
    const enq = q.enquiryId ? this.enquiryMap().get(q.enquiryId) : undefined;
    if (enq?.company) return enq.company;
    const con = q.contactId ? this.contactMap().get(q.contactId) : undefined;
    if (con?.company) return con.company;
    return '';
  }

  protected enquiryRef(q: Quotation): string {
    if (!q.enquiryId) return 'Manual Quote';
    const enq = this.enquiryMap().get(q.enquiryId);
    return enq?.reference || 'ENQ-' + q.enquiryId.slice(0, 6);
  }

  protected enquiryTitle(q: Quotation): string {
    if (!q.enquiryId) return '';
    return this.enquiryMap().get(q.enquiryId)?.title || '';
  }

  protected sigChip(q: Quotation): { label: string; tone: ChipTone } | null {
    const s = this.signatureStatus().get(q.id)?.status;
    if (s === undefined) return null;
    const tone: Record<SignatureRequestStatus, ChipTone> = {
      [SignatureRequestStatus.Pending]: 'amber',
      [SignatureRequestStatus.Signed]: 'good',
      [SignatureRequestStatus.Declined]: 'bad',
      [SignatureRequestStatus.Expired]: 'warn',
      [SignatureRequestStatus.Voided]: 'neutral',
    };
    return { label: SIGNATURE_STATUS_LABEL[s], tone: tone[s] };
  }

  protected canSign(q: Quotation): boolean {
    return q.state === 'issued' || q.state === 'revised';
  }

  protected signingClosed(): void {
    this.signingFor.set(null);
    this.store.reloadQuotes();
  }

  protected isRecord(q: Quotation): boolean {
    return q.state === 'won' || q.state === 'lost' || q.state === 'expired';
  }

  protected tone(s: QState): ChipTone {
    return STATE_TONE[s];
  }

  protected statusLabel(s: QState): string {
    return STATE_LABEL[s] || s;
  }

  protected statusBadgeClass(s: QState): string {
    return `status-badge status-badge--${s}`;
  }

  protected gstTitle(q: Quotation): string {
    const parts = q.taxBreakdown ?? [];
    return parts.length > 1
      ? 'GST ' + parts.map((t) => `${t.ratePercent}% ${inr(t.taxInPaise)}`).join(' · ')
      : '';
  }

  protected money(paise: number): string {
    return inr(paise);
  }

  protected when(iso?: string): string {
    return iso
      ? new Date(iso).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '—';
  }

  protected validityInfo(q: Quotation): {
    label: string;
    status: 'valid' | 'expiring' | 'expired' | 'none';
    isWarning: boolean;
  } {
    if (!q.validUntil) {
      return { label: '—', status: 'none', isWarning: false };
    }
    const dateStr = this.when(q.validUntil);
    const diffMs = new Date(q.validUntil).getTime() - Date.now();
    const days = Math.round(diffMs / 86_400_000);

    if (days < 0) {
      return { label: `${dateStr} (Expired)`, status: 'expired', isWarning: true };
    }
    if (days <= 3) {
      const hint = days === 0 ? 'Expires today' : `Expires in ${days}d`;
      return { label: `${dateStr} (${hint})`, status: 'expiring', isWarning: true };
    }
    return { label: dateStr, status: 'valid', isWarning: false };
  }

  protected followUpInfo(q: Quotation): {
    label: string;
    sub: string;
    status: 'due' | 'overdue' | 'upcoming' | 'finished' | 'none';
    badgeClass: string;
    icon: 'alert' | 'clock' | 'check';
  } {
    if (!q.nextFollowUpAt) {
      if (q.state === 'issued' || q.state === 'revised') {
        return {
          label: 'Cadence completed',
          sub: 'No follow-up pending',
          status: 'finished',
          badgeClass: 'fu-badge--finished',
          icon: 'check',
        };
      }
      return {
        label: 'No follow-up',
        sub: q.state === 'draft' ? 'Draft quote' : 'Closed',
        status: 'none',
        badgeClass: 'fu-badge--none',
        icon: 'clock',
      };
    }

    const diffMs = new Date(q.nextFollowUpAt).getTime() - Date.now();
    const days = Math.round(diffMs / 86_400_000);

    if (days < 0) {
      const overdueDays = Math.abs(days);
      return {
        label: overdueDays === 0 ? 'Due today' : `Overdue by ${overdueDays}d`,
        sub: `Due: ${this.when(q.nextFollowUpAt)}`,
        status: 'overdue',
        badgeClass: 'fu-badge--overdue',
        icon: 'alert',
      };
    }

    if (days === 0) {
      return {
        label: 'Due today',
        sub: 'Action required',
        status: 'due',
        badgeClass: 'fu-badge--due',
        icon: 'alert',
      };
    }

    if (days === 1) {
      return {
        label: 'Due tomorrow',
        sub: 'Follow-up in 1 day',
        status: 'upcoming',
        badgeClass: 'fu-badge--upcoming',
        icon: 'clock',
      };
    }

    return {
      label: `Due in ${days}d`,
      sub: `Date: ${this.when(q.nextFollowUpAt)}`,
      status: 'upcoming',
      badgeClass: 'fu-badge--upcoming',
      icon: 'clock',
    };
  }

  // ---- Filter and Preset Handlers --------------------------------------
  protected setStatusFilter(status: string): void {
    this.statusFilter.set(this.statusFilter() === status ? 'all' : status);
  }

  protected setFollowUpFilter(filter: string): void {
    this.followUpFilter.set(this.followUpFilter() === filter ? 'all' : filter);
  }

  protected clearAllFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('all');
    this.followUpFilter.set('all');
    this.validityFilter.set('all');
    this.dateRangePreset.set('all');
  }

  protected refreshData(): void {
    this.store.reloadQuotes();
  }

  protected exportExcel(): void {
    void this.grid?.excelExport({ fileName: 'quotations.xlsx' });
  }

  protected exportCsv(): void {
    void this.grid?.csvExport({ fileName: 'quotations.csv' });
  }

  // ---- Quotation Actions -----------------------------------------------
  protected async won(q: Quotation): Promise<void> {
    if (
      !(await this.dialogs.confirm({
        title: `Mark ${q.reference} as accepted?`,
        message: 'This records the quotation as accepted/won by the customer and advances its status.',
      }))
    ) {
      return;
    }
    this.busy.set(q.id);
    try {
      await this.store.markQuoteWon(q.id);
      this.toasts.success(`${q.reference} marked as accepted.`, 'Quotation');
    } finally {
      this.busy.set(null);
    }
  }

  protected async lost(q: Quotation): Promise<void> {
    const reason = await this.dialogs.ask(`Mark ${q.reference} as rejected?`, {
      label: 'Why was it rejected / lost?',
      multiline: true,
      required: true,
      maxLength: 500,
      placeholder: 'e.g. Price too high, lead time, chose a competitor',
    });
    if (!reason) return;
    this.busy.set(q.id);
    try {
      await this.store.markQuoteLost(q.id, reason);
      this.toasts.info(`${q.reference} marked as rejected.`, 'Quotation');
    } finally {
      this.busy.set(null);
    }
  }

  protected duplicateQuote(q: Quotation): void {
    if (q.enquiryId) {
      void this.router.navigate(['/quotations/new'], {
        queryParams: { enquiry: q.enquiryId },
      });
    } else if (q.contactId) {
      void this.router.navigate(['/quotations/new'], {
        queryParams: { contact: q.contactId, name: this.customerName(q) },
      });
    } else {
      void this.router.navigate(['/quotations/new']);
    }
  }

  protected async download(q: Quotation): Promise<void> {
    this.busy.set(q.id);
    try {
      await this.store.downloadQuote(q.id, q.reference);
      this.toasts.success(`Downloaded PDF for ${q.reference}.`, 'Quotation');
    } catch (e: unknown) {
      this.toasts.error(
        readApiError(e, `The PDF of ${q.reference} could not be generated.`),
        'Quotation',
      );
    } finally {
      this.busy.set(null);
    }
  }

  protected async remove(q: Quotation): Promise<void> {
    if (
      !(await this.dialogs.delete(
        'quotation',
        q.reference,
        'This will permanently remove the quotation and its line items.',
      ))
    ) {
      return;
    }
    this.busy.set(q.id);
    try {
      await this.store.deleteQuote(q.id);
      this.toasts.success(`${q.reference} deleted.`);
    } catch {
      this.toasts.error(`Could not delete ${q.reference}.`);
    } finally {
      this.busy.set(null);
    }
  }
}
