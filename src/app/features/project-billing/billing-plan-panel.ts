import { PermissionService } from '@abp/ng.core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import {
  AdvanceAdjustMode,
  BillingMilestoneDto,
  BillingMilestoneStatus,
  BillingPlanDto,
  BillingPlanService,
  BillingPlanTemplateDto,
  BillingTrigger,
  RetentionBase,
} from '../../proxy/project-billing/billing-plan.service';
import {
  AdvanceReceiptService,
  AdvanceSummaryDto,
  RetentionReleaseCondition,
} from '../../proxy/project-billing/retention.service';
import { ArButton, ArChip } from '../../ui';
import { environment } from '../../../environments/environment';
import {
  MilestoneRow,
  STATUS_TEXT,
  STATUS_TONE,
  TRIGGERS,
  TRIGGER_TEXT,
  amountsOf,
  planProblem,
  rowOf,
  toInput,
  totalBp,
} from './billing.logic';

function rupees(paise: number | null | undefined): string {
  return paise == null
    ? ''
    : '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

/**
 * The sales order's billing plan: milestones (a share of the order value before GST, a trigger, retention and terms), the totals bar,
 * and for a ready milestone "Prepare invoice", which saves a draft invoice to check and issue.
 */
@Component({
  selector: 'ar-billing-plan-panel',
  imports: [ArButton, ArChip, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './billing-plan-panel.html',
  styleUrl: './billing-plan-panel.scss',
})
export class ArBillingPlanPanel {
  private readonly api = inject(BillingPlanService);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);
  private readonly permissions = inject(PermissionService);
  private readonly advancesApi = inject(AdvanceReceiptService);

  readonly orderId = input.required<string>();
  /** The order's value before GST (subtotal less discount), for a plan not saved yet. */
  readonly orderValue = input.required<number>();

  protected readonly canSee = grantedPolicy('AutoReach.ProjectBilling', this.permissions);
  protected readonly canPlan = grantedPolicy('AutoReach.ProjectBilling.Plans', this.permissions);
  protected readonly canInvoice = grantedPolicy(
    'AutoReach.ProjectBilling.Invoice',
    this.permissions,
  );

  protected readonly plan = signal<BillingPlanDto | null>(null);
  protected readonly loaded = signal(false);
  protected readonly editing = signal(false);
  protected readonly templates = signal<BillingPlanTemplateDto[]>([]);
  protected readonly rows = signal<MilestoneRow[]>([]);
  protected readonly advance = signal('0');
  protected readonly adjustMode = signal(AdvanceAdjustMode.FullFirst);
  protected readonly retentionBase = signal(RetentionBase.Taxable);
  protected readonly reason = signal('');
  protected readonly release = signal(RetentionReleaseCondition.DefectsPeriod);
  protected readonly releaseOn = signal('');
  protected readonly releaseMonths = signal('12');
  protected readonly anchorOrder = signal('');
  protected readonly advances = signal<AdvanceSummaryDto | null>(null);
  protected readonly advanceAmount = signal('');
  protected readonly advanceDate = signal(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()),
  );
  protected readonly advanceRef = signal('');
  protected readonly Release = RetentionReleaseCondition;
  protected readonly busy = signal(false);

  protected readonly triggers = TRIGGERS;
  protected readonly Trigger = BillingTrigger;
  protected readonly Status = BillingMilestoneStatus;
  protected readonly Adjust = AdvanceAdjustMode;
  protected readonly Base = RetentionBase;
  protected readonly rupees = rupees;

  protected readonly value = computed(
    () => this.plan()?.currentOrderValueInPaise ?? this.orderValue(),
  );
  protected readonly amounts = computed(() => amountsOf(this.rows(), this.value()));
  protected readonly total = computed(() => totalBp(this.rows()) / 100);
  protected readonly problem = computed(() =>
    planProblem(this.rows(), this.advance(), this.value()),
  );
  protected readonly locked = computed(() => !!this.plan()?.lockedAtUtc);

  constructor() {
    effect(() => {
      const id = this.orderId();
      if (!environment.useMockData && this.canSee()) void this.load(id);
    });
  }

  protected triggerText(t: BillingTrigger): string {
    return TRIGGER_TEXT[t];
  }

  protected statusText(s: BillingMilestoneStatus): string {
    return STATUS_TEXT[s];
  }

  protected tone(s: BillingMilestoneStatus) {
    return STATUS_TONE[s];
  }

  protected percentOf(m: BillingMilestoneDto): string {
    return m.percentBp != null ? `${m.percentBp / 100}%` : '';
  }

  private async load(id: string): Promise<void> {
    try {
      const [plan, templates] = await Promise.all([
        firstValueFrom(this.api.getForOrder(id)),
        firstValueFrom(this.api.getTemplates()),
      ]);
      this.plan.set(plan ?? null);
      this.templates.set(templates);
      if (plan) this.advances.set(await firstValueFrom(this.advancesApi.getForOrder(id)));
    } catch {
      this.plan.set(null);
    } finally {
      this.loaded.set(true);
    }
  }

  protected startEdit(): void {
    const p = this.plan();
    if (p) {
      this.rows.set(
        p.milestones.map((m) =>
          rowOf(
            {
              id: m.id,
              name: m.name,
              percentBp: m.percentBp,
              trigger: m.trigger,
              triggerDate: m.triggerDate,
              retentionPercentBp: m.retentionPercentBp,
              paymentTermsDays: m.paymentTermsDays,
            },
            m.invoicedAmountInPaise !== 0,
          ),
        ),
      );
      this.advance.set(String(p.advancePercentBp / 100));
      this.adjustMode.set(p.advanceAdjustMode);
      this.retentionBase.set(p.retentionBase);
      this.release.set(p.retentionRelease);
      this.releaseOn.set(p.retentionReleaseOn ? p.retentionReleaseOn.slice(0, 10) : '');
      this.releaseMonths.set(
        p.retentionReleaseMonths != null ? String(p.retentionReleaseMonths) : '12',
      );
      this.anchorOrder.set(p.retentionAnchorOrder != null ? String(p.retentionAnchorOrder) : '');
    } else if (!this.rows().length) {
      const t = this.templates().find((x) => x.isStandard);
      if (t) this.applyTemplate(t);
    }
    this.reason.set('');
    this.editing.set(true);
  }

  protected applyTemplate(t: BillingPlanTemplateDto): void {
    this.rows.set(t.milestones.map((m) => rowOf(m)));
    this.advance.set(String(t.advancePercentBp / 100));
  }

  protected pickTemplate(name: string): void {
    const t = this.templates().find((x) => x.name === name);
    if (t) this.applyTemplate(t);
  }

  protected setRow(i: number, change: Partial<MilestoneRow>): void {
    this.rows.update((rs) => rs.map((r, j) => (j === i ? { ...r, ...change } : r)));
  }

  protected addRow(): void {
    this.rows.update((rs) => [
      ...rs,
      {
        id: null,
        name: '',
        percent: '',
        trigger: BillingTrigger.Manual,
        triggerDate: '',
        retention: '0',
        terms: '30',
        locked: false,
      },
    ]);
  }

  protected removeRow(i: number): void {
    this.rows.update((rs) => rs.filter((_, j) => j !== i));
  }

  protected async save(): Promise<void> {
    if (this.problem()) return;
    if (this.locked() && !this.reason().trim()) {
      this.toasts.warning('Give a reason: the plan has been invoiced.', 'Billing plan');
      return;
    }
    this.busy.set(true);
    try {
      this.plan.set(
        await firstValueFrom(
          this.api.save(this.orderId(), {
            advancePercentBp: Math.round((Number(this.advance()) || 0) * 100),
            advanceAdjustMode: this.adjustMode(),
            retentionBase: this.retentionBase(),
            reason: this.reason().trim() || null,
            milestones: this.rows().map(toInput),
            retentionRelease: this.release(),
            retentionReleaseOn:
              this.release() === RetentionReleaseCondition.OnDate ? this.releaseOn() || null : null,
            retentionReleaseMonths:
              this.release() === RetentionReleaseCondition.DefectsPeriod
                ? Number(this.releaseMonths()) || 12
                : null,
            retentionAnchorOrder: this.anchorOrder() ? Number(this.anchorOrder()) : null,
          }),
        ),
      );
      this.editing.set(false);
      this.toasts.success('Billing plan saved.');
    } catch (e) {
      this.toasts.error(readApiError(e, 'The billing plan could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async saveAsTemplate(): Promise<void> {
    const name = window.prompt('Name the template, e.g. 20 / 70 / 10');
    if (!name?.trim()) return;
    try {
      await firstValueFrom(
        this.api.saveTemplate({
          name: name.trim(),
          advancePercentBp: Math.round((Number(this.advance()) || 0) * 100),
          milestones: this.rows().map((r) => ({ ...toInput(r), id: null })),
        }),
      );
      this.templates.set(await firstValueFrom(this.api.getTemplates()));
      this.toasts.success('Template saved.');
    } catch (e) {
      this.toasts.error(readApiError(e, 'The template could not be saved.'));
    }
  }

  protected async prepare(m: BillingMilestoneDto): Promise<void> {
    this.busy.set(true);
    try {
      const draft = await firstValueFrom(this.api.createInvoiceDraft(m.id));
      this.toasts.success(
        draft.created
          ? `Draft ${draft.invoiceNumber} made: check it and issue it.`
          : `Draft ${draft.invoiceNumber} was already made.`,
      );
      await this.router.navigate(['/sales/invoices', draft.invoiceId]);
    } catch (e) {
      this.toasts.error(readApiError(e, 'The invoice could not be prepared.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async markReady(m: BillingMilestoneDto): Promise<void> {
    const reason =
      m.trigger === BillingTrigger.Manual
        ? null
        : window.prompt(`Why mark ${m.name} ready before "${TRIGGER_TEXT[m.trigger]}"?`);
    if (m.trigger !== BillingTrigger.Manual && !reason?.trim()) return;
    try {
      this.plan.set(await firstValueFrom(this.api.markReady(m.id, reason?.trim() ?? null)));
    } catch (e) {
      this.toasts.error(readApiError(e, 'It could not be marked ready.'));
    }
  }

  protected async recordAdvance(): Promise<void> {
    const amount = Math.round(Number(this.advanceAmount().replace(/[₹,\s]/g, '')) * 100);
    if (!(amount > 0)) return;
    try {
      this.advances.set(
        await firstValueFrom(
          this.advancesApi.record(this.orderId(), {
            amountInPaise: amount,
            receivedOn: this.advanceDate(),
            reference: this.advanceRef().trim() || null,
          }),
        ),
      );
      this.advanceAmount.set('');
      this.advanceRef.set('');
      this.plan.set((await firstValueFrom(this.api.getForOrder(this.orderId()))) ?? null);
      this.toasts.success('Advance recorded: later milestone invoices take it off.');
    } catch (e) {
      this.toasts.error(readApiError(e, 'The advance could not be recorded.'));
    }
  }

  protected async deleteAdvance(id: string): Promise<void> {
    try {
      this.advances.set(await firstValueFrom(this.advancesApi.delete(id)));
    } catch (e) {
      this.toasts.error(readApiError(e, 'The advance could not be removed.'));
    }
  }
}
