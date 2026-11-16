import { PermissionService } from '@abp/ng.core';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import {
  BankGuaranteeDto,
  BankGuaranteeKind,
  BankGuaranteeReturnCondition,
  BankGuaranteeService,
  BankGuaranteeStatus,
} from '../../proxy/project-billing/bank-guarantee.service';
import { ArButton, ArChip } from '../../ui';
import {
  BG_KIND_TEXT,
  BG_RETURN_TEXT,
  BG_STATUS_TEXT,
  BG_STATUS_TONE,
  defaultReturn,
  expiryTone,
} from './guarantees.logic';

function today(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

/** "2026-11-16" from an ISO date or date-time. */
export function dateOnly(value: string): string {
  return value.slice(0, 10);
}

function rupees(paise: number): string {
  return '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

/** The order's bank guarantees: record one, and mark it returned or invoked. A performance guarantee can release the retention. */
@Component({
  selector: 'ar-guarantees-panel',
  imports: [ArButton, ArChip, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './guarantees-panel.html',
  styleUrl: './billing-plan-panel.scss',
})
export class ArGuaranteesPanel {
  private readonly api = inject(BankGuaranteeService);
  private readonly toasts = inject(ToastService);
  private readonly permissions = inject(PermissionService);
  private readonly dialogs = inject(ConfirmService);

  readonly orderId = input.required<string>();

  protected readonly canSee = grantedPolicy('AutoReach.ProjectBilling.Invoice', this.permissions);
  protected readonly list = signal<BankGuaranteeDto[]>([]);
  protected readonly loaded = signal(false);
  protected readonly adding = signal(false);
  protected readonly kind = signal(BankGuaranteeKind.Performance);
  protected readonly number = signal('');
  protected readonly bank = signal('');
  protected readonly amount = signal('');
  protected readonly issuedOn = signal(today());
  protected readonly validTo = signal('');
  protected readonly claimDays = signal('30');
  protected readonly returnCondition = signal(BankGuaranteeReturnCondition.RetentionReleased);
  protected readonly returnOn = signal('');
  protected readonly busy = signal(false);
  /** The guarantee being corrected; null while recording a new one. */
  protected readonly editingId = signal<string | null>(null);

  protected readonly Kind = BankGuaranteeKind;
  protected readonly Back = BankGuaranteeReturnCondition;
  protected readonly Status = BankGuaranteeStatus;
  protected readonly rupees = rupees;
  protected readonly returns = [
    BankGuaranteeReturnCondition.AdvanceAdjusted,
    BankGuaranteeReturnCondition.RetentionReleased,
    BankGuaranteeReturnCondition.OnDate,
  ];

  constructor() {
    effect(() => {
      const id = this.orderId();
      if (this.canSee()) void this.load(id);
    });
  }

  protected kindText(k: BankGuaranteeKind): string {
    return BG_KIND_TEXT[k];
  }

  protected statusText(s: BankGuaranteeStatus): string {
    return BG_STATUS_TEXT[s];
  }

  protected tone(s: BankGuaranteeStatus) {
    return BG_STATUS_TONE[s];
  }

  protected returnText(r: BankGuaranteeReturnCondition): string {
    return BG_RETURN_TEXT[r];
  }

  protected expiry(g: BankGuaranteeDto): string | null {
    return g.status === BankGuaranteeStatus.Active || g.status === BankGuaranteeStatus.DueForReturn
      ? expiryTone(g.daysToExpiry)
      : null;
  }

  protected setKind(k: BankGuaranteeKind): void {
    this.kind.set(k);
    this.returnCondition.set(defaultReturn(k));
  }

  private async load(id: string): Promise<void> {
    try {
      this.list.set(await firstValueFrom(this.api.getList({ salesOrderId: id })));
    } catch {
      this.list.set([]);
    } finally {
      this.loaded.set(true);
    }
  }

  protected startAdd(): void {
    this.editingId.set(null);
    this.kind.set(BankGuaranteeKind.Performance);
    this.number.set('');
    this.bank.set('');
    this.amount.set('');
    this.issuedOn.set(today());
    this.validTo.set('');
    this.claimDays.set('30');
    this.returnCondition.set(defaultReturn(BankGuaranteeKind.Performance));
    this.returnOn.set('');
    this.adding.set(true);
  }

  /** Opens the form filled with this guarantee, to extend its expiry or fix a detail. */
  protected startEdit(g: BankGuaranteeDto): void {
    this.editingId.set(g.id);
    this.kind.set(g.kind);
    this.number.set(g.number);
    this.bank.set(g.bank);
    this.amount.set(String(g.amountInPaise / 100));
    this.issuedOn.set(dateOnly(g.issuedOn));
    this.validTo.set(dateOnly(g.validTo));
    this.claimDays.set(g.claimPeriodDays != null ? String(g.claimPeriodDays) : '');
    this.returnCondition.set(g.returnCondition);
    this.returnOn.set(g.returnOn ? dateOnly(g.returnOn) : '');
    this.adding.set(true);
  }

  protected cancelForm(): void {
    this.adding.set(false);
    this.editingId.set(null);
  }

  protected async add(): Promise<void> {
    const amount = Math.round(Number(this.amount().replace(/[₹,\s]/g, '')) * 100);
    if (!this.number().trim() || !this.bank().trim() || !(amount > 0) || !this.validTo()) return;
    this.busy.set(true);
    try {
      const editing = this.editingId();
      const body = {
        kind: this.kind(),
        number: this.number().trim(),
        bank: this.bank().trim(),
        amountInPaise: amount,
        issuedOn: this.issuedOn(),
        validTo: this.validTo(),
        claimPeriodDays: this.claimDays() ? Number(this.claimDays()) : null,
        returnCondition: this.returnCondition(),
        returnOn:
          this.returnCondition() === BankGuaranteeReturnCondition.OnDate
            ? this.returnOn() || null
            : null,
      };
      await firstValueFrom(
        editing ? this.api.update(editing, body) : this.api.create(this.orderId(), body),
      );
      this.adding.set(false);
      this.editingId.set(null);
      this.number.set('');
      this.amount.set('');
      this.toasts.success(editing ? 'Bank guarantee updated.' : 'Bank guarantee recorded.');
      await this.load(this.orderId());
    } catch (e) {
      this.toasts.error(
        readApiError(
          e,
          this.editingId()
            ? 'The guarantee could not be updated.'
            : 'The guarantee could not be recorded.',
        ),
      );
    } finally {
      this.busy.set(false);
    }
  }

  protected async returned(g: BankGuaranteeDto): Promise<void> {
    try {
      await firstValueFrom(this.api.markReturned(g.id, today()));
      await this.load(this.orderId());
    } catch (e) {
      this.toasts.error(readApiError(e, 'It could not be marked returned.'));
    }
  }

  protected async invoked(g: BankGuaranteeDto): Promise<void> {
    if (
      !(await this.dialogs.confirm({
        title: `Mark ${g.number} invoked?`,
        message: 'Record that the customer has claimed against this guarantee.',
        confirmText: 'Mark invoked',
        tone: 'danger',
      }))
    )
      return;
    try {
      await firstValueFrom(this.api.markInvoked(g.id));
      await this.load(this.orderId());
    } catch (e) {
      this.toasts.error(readApiError(e, 'It could not be marked invoked.'));
    }
  }

  /** Removes a guarantee entered by mistake. A real one that ended is marked returned or invoked instead. */
  protected async remove(g: BankGuaranteeDto): Promise<void> {
    if (
      !(await this.dialogs.delete(
        'guarantee',
        g.number,
        'Use this for one entered by mistake. A guarantee that has ended is marked Returned or Invoked instead, so the record stays.',
      ))
    )
      return;
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.delete(g.id));
      this.toasts.success('Guarantee deleted.');
      await this.load(this.orderId());
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The guarantee could not be deleted.'));
    } finally {
      this.busy.set(false);
    }
  }
}
