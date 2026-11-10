import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import {
  RetentionReleaseCondition,
  RetentionRowDto,
  RetentionService,
  RetentionStatus,
} from '../../proxy/project-billing/retention.service';
import { SalesPaymentMode } from '../../proxy/sales/sales-enums';
import {
  BankGuaranteeDto,
  BankGuaranteeService,
} from '../../proxy/project-billing/bank-guarantee.service';
import { BG_KIND_TEXT, BG_STATUS_TEXT, BG_STATUS_TONE, expiryTone } from './guarantees.logic';
import { ArBanner, ArButton, ArCard, ArChip, ArStatTile } from '../../ui';
import type { ChipTone } from '../../ui/chip';

const STATUS_TEXT: Record<RetentionStatus, string> = {
  [RetentionStatus.NotDue]: 'Not due',
  [RetentionStatus.Due]: 'Due',
  [RetentionStatus.Requested]: 'Requested',
  [RetentionStatus.Released]: 'Released',
  [RetentionStatus.WrittenOff]: 'Written off',
};

const STATUS_TONE: Record<RetentionStatus, ChipTone> = {
  [RetentionStatus.NotDue]: 'neutral',
  [RetentionStatus.Due]: 'amber',
  [RetentionStatus.Requested]: 'teal',
  [RetentionStatus.Released]: 'good',
  [RetentionStatus.WrittenOff]: 'neutral',
};

const CONDITION_TEXT: Record<RetentionReleaseCondition, string> = {
  [RetentionReleaseCondition.OnDate]: 'On a date',
  [RetentionReleaseCondition.DefectsPeriod]: 'End of defects period',
  [RetentionReleaseCondition.AgainstBg]: 'Against a bank guarantee',
};

function rupees(paise: number): string {
  return '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function today(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

/** One order's retention, for the actions that work per order. */
interface OrderGroup {
  salesOrderId: string;
  orderNumber: string;
  customerName?: string | null;
  outstanding: number;
  due: number;
  rows: RetentionRowDto[];
}

/**
 * The retention ledger across project orders: what each customer holds back, when it is due back, and its release. Release requests
 * and receipts work per order.
 */
@Component({
  selector: 'ar-retention-page',
  imports: [ArTopbar, ArBanner, ArButton, ArCard, ArChip, ArStatTile, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './retention-page.html',
  styleUrl: './milestones-due-page.scss',
})
export class ArRetentionPage {
  private readonly api = inject(RetentionService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);
  private readonly guaranteesApi = inject(BankGuaranteeService);
  protected readonly guarantees = signal<BankGuaranteeDto[]>([]);
  protected readonly bgKind = BG_KIND_TEXT;
  protected readonly bgStatus = BG_STATUS_TEXT;
  protected readonly bgTone = BG_STATUS_TONE;
  protected readonly expiryTone = expiryTone;

  protected readonly rows = signal<RetentionRowDto[]>([]);
  protected readonly openOnly = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly releaseFor = signal<string | null>(null);
  protected readonly releaseAmount = signal('');
  protected readonly releaseDate = signal(today());
  protected readonly releaseRef = signal('');
  protected readonly Status = RetentionStatus;
  protected readonly rupees = rupees;

  protected readonly groups = computed<OrderGroup[]>(() => {
    const map = new Map<string, OrderGroup>();
    for (const r of this.rows()) {
      const g = map.get(r.salesOrderId) ?? {
        salesOrderId: r.salesOrderId,
        orderNumber: r.orderNumber,
        customerName: r.customerName,
        outstanding: 0,
        due: 0,
        rows: [],
      };
      g.rows.push(r);
      g.outstanding += r.outstandingInPaise;
      if (r.status === RetentionStatus.Due || r.status === RetentionStatus.Requested) {
        g.due += r.outstandingInPaise;
      }
      map.set(r.salesOrderId, g);
    }
    return [...map.values()];
  });

  protected readonly held = computed(() =>
    this.rows().reduce((n, r) => n + r.outstandingInPaise, 0),
  );
  protected readonly overdue = computed(() =>
    this.rows()
      .filter((r) => r.daysOverdue > 0)
      .reduce((n, r) => n + r.outstandingInPaise, 0),
  );

  constructor() {
    void this.load();
  }

  protected statusText(s: RetentionStatus): string {
    return STATUS_TEXT[s];
  }

  protected tone(s: RetentionStatus): ChipTone {
    return STATUS_TONE[s];
  }

  protected conditionText(c: RetentionReleaseCondition): string {
    return CONDITION_TEXT[c];
  }

  protected async load(): Promise<void> {
    try {
      const page = await firstValueFrom(
        this.api.getLedger({ openOnly: this.openOnly(), maxResultCount: 200 }),
      );
      this.rows.set(page.items ?? []);
      this.guarantees.set(await firstValueFrom(this.guaranteesApi.getList({ heldOnly: true })));
    } catch (e) {
      this.error.set(readApiError(e, 'The retention ledger could not be loaded.'));
    }
  }

  protected async letter(g: OrderGroup): Promise<void> {
    try {
      const blob = await firstValueFrom(this.api.getReleaseLetter(g.salesOrderId));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `retention-release-${g.orderNumber}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      this.toasts.error(readApiError(e, 'The letter could not be made.'));
    }
  }

  protected async request(g: OrderGroup, sendEmail: boolean): Promise<void> {
    this.busy.set(true);
    try {
      const r = await firstValueFrom(this.api.requestRelease(g.salesOrderId, { sendEmail }));
      if (sendEmail && !r.emailed) {
        this.toasts.warning(
          `Marked requested, but the email didn't go: ${r.emailProblem ?? 'unknown reason'}. Download the letter and send it.`,
          'Retention',
        );
      } else {
        this.toasts.success(
          `Release of ${rupees(r.amountInPaise)} requested${r.emailed ? ' and emailed' : ''}.`,
        );
      }
      await this.load();
    } catch (e) {
      this.toasts.error(readApiError(e, 'The release could not be requested.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected openRelease(g: OrderGroup): void {
    this.releaseFor.set(g.salesOrderId);
    this.releaseAmount.set(String(g.outstanding / 100));
  }

  protected async recordRelease(): Promise<void> {
    const id = this.releaseFor();
    const amount = Math.round(Number(this.releaseAmount().replace(/[₹,\s]/g, '')) * 100);
    if (!id || !(amount > 0)) return;
    this.busy.set(true);
    try {
      await firstValueFrom(
        this.api.recordRelease(id, {
          amountInPaise: amount,
          receivedOn: this.releaseDate(),
          mode: SalesPaymentMode.NeftRtgs,
          reference: this.releaseRef().trim() || null,
        }),
      );
      this.toasts.success(`${rupees(amount)} released, recorded on the invoices.`);
      this.releaseFor.set(null);
      this.releaseRef.set('');
      await this.load();
    } catch (e) {
      this.toasts.error(readApiError(e, 'The release could not be recorded.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async writeOff(r: RetentionRowDto): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: `Write off ${rupees(r.outstandingInPaise)}?`,
      message: `The retention on invoice ${r.invoiceNumber} won't be asked for again.`,
      confirmText: 'Write off',
    });
    if (!ok) return;
    try {
      await firstValueFrom(this.api.writeOff(r.id));
      await this.load();
    } catch (e) {
      this.toasts.error(readApiError(e, 'It could not be written off.'));
    }
  }
}
