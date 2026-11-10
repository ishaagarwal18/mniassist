import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import {
  BillingPlanService,
  BillingTrigger,
  DueMilestoneDto,
} from '../../proxy/project-billing/billing-plan.service';
import { ArBanner, ArButton, ArCard } from '../../ui';
import { TRIGGER_TEXT } from './billing.logic';

/** Every billing milestone ready to invoice, across orders: accounts' daily list. Ready two days or more shows amber. */
@Component({
  selector: 'ar-milestones-due-page',
  imports: [ArTopbar, ArBanner, ArButton, ArCard, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar title="Milestones due" subtitle="Billing milestones ready to invoice" />
    <div class="md ar-scroll">
      @if (error(); as e) {
        <ar-banner tone="bad">{{ e }}</ar-banner>
      }
      <ar-card [heading]="rows().length + ' ready · ' + rupees(total())">
        <table class="md__table">
          <thead>
            <tr>
              <th scope="col">Customer</th>
              <th scope="col">Order</th>
              <th scope="col">Milestone</th>
              <th scope="col">Trigger</th>
              <th scope="col" class="md__num">To bill</th>
              <th scope="col">Ready since</th>
              <th scope="col" aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>
            @for (d of rows(); track d.milestoneId) {
              <tr [class.md__late]="d.daysReady >= 2">
                <td translate="no">{{ d.customerName }}</td>
                <td>
                  <a [routerLink]="['/sales/orders', d.salesOrderId]">{{ d.orderNumber }}</a>
                </td>
                <td>{{ d.milestone }}</td>
                <td>{{ triggerText(d.trigger) }}</td>
                <td class="md__num">{{ rupees(d.billableInPaise) }}</td>
                <td>
                  {{ d.readyAtUtc ? (d.readyAtUtc | date: 'd MMM') : '' }}
                  · {{ d.daysReady }} d
                </td>
                <td class="md__actions">
                  @if (d.draftInvoiceId) {
                    <a
                      ar-button
                      variant="ghost"
                      [routerLink]="['/sales/invoices', d.draftInvoiceId]"
                      >Open draft</a
                    >
                  } @else {
                    <button
                      ar-button
                      type="button"
                      variant="primary"
                      [disabled]="busy()"
                      (click)="prepare(d)"
                    >
                      Prepare invoice
                    </button>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="md__muted">Nothing is ready to bill.</td>
              </tr>
            }
          </tbody>
        </table>
      </ar-card>
    </div>
  `,
  styleUrl: './milestones-due-page.scss',
})
export class ArMilestonesDuePage {
  private readonly api = inject(BillingPlanService);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly rows = signal<DueMilestoneDto[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly total = computed(() => this.rows().reduce((n, d) => n + d.billableInPaise, 0));

  constructor() {
    void this.load();
  }

  protected rupees(paise: number): string {
    return '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  protected triggerText(t: BillingTrigger): string {
    return TRIGGER_TEXT[t];
  }

  private async load(): Promise<void> {
    try {
      this.rows.set(await firstValueFrom(this.api.getDue()));
    } catch (e) {
      this.error.set(readApiError(e, 'The milestones could not be loaded.'));
    }
  }

  protected async prepare(d: DueMilestoneDto): Promise<void> {
    this.busy.set(true);
    try {
      const draft = await firstValueFrom(this.api.createInvoiceDraft(d.milestoneId));
      this.toasts.success(`Draft ${draft.invoiceNumber} made: check it and issue it.`);
      await this.router.navigate(['/sales/invoices', draft.invoiceId]);
    } catch (e) {
      this.toasts.error(readApiError(e, 'The invoice could not be prepared.'));
    } finally {
      this.busy.set(false);
    }
  }
}
