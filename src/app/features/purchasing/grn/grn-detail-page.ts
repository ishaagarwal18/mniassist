import { ConfirmService } from '../../../core/ui/confirm.service';
import { ToastService } from '../../../core/ui/toast.service';
import { PermissionService } from '@abp/ng.core';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';

import { checkPolicy } from '../../../core/auth/permission';
import { readApiError } from '../../../core/util/api-error';
import { readSupplierScope, supplierScopeParams } from '../../../core/util/supplier-scope';
import { CockpitOriginService } from '../../../layout/cockpit-origin.service';
import { ArTopbar } from '../../../layout/topbar';
import { GoodsReceiptNoteDto, GoodsReceiptNoteService, GrnStatus } from '../../../proxy/purchasing';
import { ArButton, ArChip, ArIcon } from '../../../ui';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { ArGrid } from '../../../ui/grid';
import { PURCHASE_FORM_STYLES } from '../purchase-form';
import { PURCHASING_PERMISSIONS } from '../purchasing-permissions';
import { canInspect } from './grn-inspection.logic';
import { grnStatusChip, qcChip } from './grn-labels';

/**
 * One goods receipt on its own page (/purchasing/grn/<id>): gate entry, QC result, the received lines with bins and rejections,
 * and what comes next (QC inspection, bill, debit note) as far as the role allows. Back returns to where it was opened from.
 */
@Component({
  selector: 'ar-grn-detail-page',
  imports: [ArTopbar, ArButton, ArChip, ArIcon, DatePipe, RouterLink, ArGrid, GridModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      help="One goods receipt: the gate entry, items received, QC result, bins and rejections, and what to do next."
      [title]="grn()?.grnNumber ?? 'Goods receipt'"
      [subtitle]="grn()?.supplierName ?? 'Gate entry, QC result and received items'"
    />

    <div class="pf ar-scroll ar-scroll--bare">
      @if (loading()) {
        <p class="gd-muted">Loading the goods receipt…</p>
      } @else if (problem(); as p) {
        <section class="pf__card pf__denied" role="alert">
          <ar-icon name="alert" [size]="20" />
          <div>
            <strong>{{ p }}</strong>
          </div>
          <button ar-button variant="ghost" type="button" (click)="back()">Go back</button>
        </section>
      } @else if (grn(); as g) {
        <div class="pf__form">
          <section class="pf__card">
            <div class="gd-head">
              <div>
                <span class="gd-label">Supplier</span>
                <h2 translate="no">{{ g.supplierName }}</h2>
                <span class="gd-muted"
                  >Challan <span class="ar-mono">{{ g.challanNumber }}</span> · PO
                  {{ g.purchaseOrderReference || 'none (direct)' }}</span
                >
              </div>
              <div class="gd-chips">
                <ar-chip [tone]="status().tone">{{ status().label }}</ar-chip>
                <ar-chip [tone]="qc().tone">{{ qc().label }}</ar-chip>
              </div>
            </div>

            <div class="gd-facts">
              <div class="gd-box">
                <h3>Gate entry</h3>
                <dl>
                  <dt>Gate entry no.</dt>
                  <dd class="ar-mono">{{ g.gateEntryNumber || '—' }}</dd>
                  <dt>Gate-in</dt>
                  <dd>{{ g.gateInTimeUtc ? (g.gateInTimeUtc | date: 'medium') : '—' }}</dd>
                  <dt>Vehicle</dt>
                  <dd class="ar-mono">{{ g.vehicleNumber || '—' }}</dd>
                  <dt>Transporter</dt>
                  <dd>{{ g.transporterName || 'Direct delivery' }}</dd>
                  @if (g.locationName) {
                    <dt>Received into</dt>
                    <dd>{{ g.locationName }}</dd>
                  }
                </dl>
              </div>
              <div class="gd-box">
                <h3>QC inspection</h3>
                <dl>
                  <dt>Inspected</dt>
                  <dd>{{ g.inspectedAtUtc ? (g.inspectedAtUtc | date: 'medium') : 'Not yet' }}</dd>
                  <dt>Findings</dt>
                  <dd>{{ g.inspectorNotes || '—' }}</dd>
                  @if (g.remarks) {
                    <dt>Gate remarks</dt>
                    <dd>{{ g.remarks }}</dd>
                  }
                </dl>
              </div>
            </div>
          </section>

          <section class="pf__card" aria-labelledby="gd-items">
            <header class="pf__head">
              <div>
                <h2 id="gd-items">Received items & bins</h2>
                <p>
                  {{ g.lines.length }} item(s) · {{ totals().received }} received ·
                  {{ totals().accepted }} accepted
                  @if (totals().rejected > 0) {
                    · <span class="gd-bad">{{ totals().rejected }} rejected</span>
                  }
                </p>
              </div>
            </header>
            <ejs-grid
              arGrid="goods-receipt-note-lines"
              [dataSource]="g.lines"
              aria-label="Received items"
            >
              <e-columns>
                <e-column field="partNumber" headerText="Part no." width="150">
                  <ng-template #template let-l>
                    <strong class="ar-mono">{{ l.partNumber }}</strong>
                  </ng-template>
                </e-column>
                <e-column field="description" headerText="Description" width="240"></e-column>
                <e-column headerText="Received" width="130" [textAlign]="'Right'">
                  <ng-template #template let-l>
                    {{ l.receivedQuantity }} {{ l.unitOfMeasure }}
                  </ng-template>
                </e-column>
                <e-column
                  field="acceptedQuantity"
                  headerText="Accepted"
                  width="110"
                  [textAlign]="'Right'"
                >
                  <ng-template #template let-l>
                    <span class="gd-good">{{ l.acceptedQuantity }}</span>
                  </ng-template>
                </e-column>
                <e-column
                  field="rejectedQuantity"
                  headerText="Rejected"
                  width="110"
                  [textAlign]="'Right'"
                >
                  <ng-template #template let-l>
                    <span [class.gd-bad]="l.rejectedQuantity > 0">{{ l.rejectedQuantity }}</span>
                  </ng-template>
                </e-column>
                <e-column field="storageBin" headerText="Bin" width="130">
                  <ng-template #template let-l>
                    <span class="gd-bin">{{ l.storageBin || 'Unassigned' }}</span>
                  </ng-template>
                </e-column>
                <e-column field="rejectionReason" headerText="Rejection reason" width="180">
                  <ng-template #template let-l>
                    <span class="gd-muted">{{ l.rejectionReason || '—' }}</span>
                  </ng-template>
                </e-column>
              </e-columns>
            </ejs-grid>
          </section>

          <footer class="pf__bar">
            <span class="pf__summary">What next</span>
            <button ar-button variant="ghost" type="button" (click)="back()">Back</button>
            @if (
              can().cancel && g.status !== GrnStatus.Billed && g.status !== GrnStatus.Cancelled
            ) {
              <button
                ar-button
                variant="ghost"
                type="button"
                [disabled]="acting()"
                (click)="cancelGrn(g)"
              >
                Cancel GRN
              </button>
            }
            @if (can().inspect && g.status === GrnStatus.Draft) {
              <button
                ar-button
                variant="ghost"
                type="button"
                [disabled]="acting()"
                (click)="startInspection(g)"
              >
                Move to QC
              </button>
            }
            @if (can().debitNote && totals().rejected > 0 && g.status !== GrnStatus.Cancelled) {
              <a
                ar-button
                variant="danger"
                routerLink="/purchasing/debit-notes/new"
                [queryParams]="{ grn: g.id }"
                >Debit note for rejections</a
              >
            }
            @if (can().bill && g.status === GrnStatus.Approved) {
              <a
                ar-button
                variant="primary"
                icon="billing"
                routerLink="/purchasing/bills/new"
                [queryParams]="{ grn: g.id }"
                >Create vendor bill</a
              >
            }
            @if (can().inspect && inspectable()) {
              <a
                ar-button
                variant="primary"
                icon="check"
                [routerLink]="['/purchasing/grn', g.id, 'inspect']"
                [queryParams]="scopeParams"
                >Record QC inspection</a
              >
            }
          </footer>
        </div>
      }
    </div>
  `,
  styles: [
    PURCHASE_FORM_STYLES,
    `
      .gd-muted {
        color: var(--ar-ink-500);
        font: 400 12.5px var(--ar-font-sans);
      }
      .gd-label {
        font: 600 10.5px var(--ar-font-sans);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--ar-ink-500);
      }
      .gd-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
        flex-wrap: wrap;
      }
      .gd-head h2 {
        margin: 2px 0;
        font: 600 18px var(--ar-font-sans);
      }
      .gd-chips {
        display: flex;
        gap: 6px;
      }
      .gd-facts {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 12px;
      }
      .gd-box {
        padding: 0.8rem 1rem;
        border-radius: var(--ar-radius-inset);
        background: var(--ar-bg-50);
        border: 1px solid var(--ar-line-100);
      }
      .gd-box h3 {
        margin: 0 0 8px;
        font: 600 10.5px var(--ar-font-sans);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--ar-ink-500);
      }
      .gd-box dl {
        margin: 0;
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 4px 16px;
        font: 400 13px var(--ar-font-sans);
      }
      .gd-box dt {
        color: var(--ar-ink-500);
      }
      .gd-box dd {
        margin: 0;
        color: var(--ar-ink-900);
      }
      .gd-table {
        overflow-x: auto;
      }
      .gd-table table {
        width: 100%;
        border-collapse: collapse;
        font: 400 13px var(--ar-font-sans);
      }
      .gd-table th {
        padding: 0.55rem 0.8rem;
        text-align: left;
        background: var(--ar-bg-50);
        border-bottom: 1px solid var(--ar-line-200);
        font: 600 11px var(--ar-font-sans);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--ar-ink-500);
      }
      .gd-table td {
        padding: 0.6rem 0.8rem;
        border-bottom: 1px solid var(--ar-line-100);
      }
      .num {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
      .gd-good {
        color: var(--ar-good-700);
        font-weight: 600;
      }
      .gd-bad {
        color: var(--ar-bad-600);
        font-weight: 600;
      }
      .gd-bin {
        padding: 2px 7px;
        border-radius: 4px;
        background: var(--ar-blue-100);
        color: var(--ar-blue-700);
        font: 600 12px var(--ar-font-mono);
      }
    `,
  ],
})
export class ArGrnDetailPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly origin = inject(CockpitOriginService);
  private readonly api = inject(GoodsReceiptNoteService);
  private readonly permissions = inject(PermissionService);

  protected readonly GrnStatus = GrnStatus;
  private readonly scope = readSupplierScope(this.route);
  protected readonly scopeParams = this.scope ? supplierScopeParams(this.scope) : {};

  protected readonly grn = signal<GoodsReceiptNoteDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly problem = signal<string | null>(null);

  protected readonly status = computed(() => grnStatusChip(this.grn()?.status ?? GrnStatus.Draft));
  protected readonly qc = computed(() => qcChip(this.grn()!.qcStatus));
  protected readonly inspectable = computed(() => !!this.grn() && canInspect(this.grn()!));
  protected readonly totals = computed(() => {
    const lines = this.grn()?.lines ?? [];
    const sum = (f: (l: (typeof lines)[number]) => number) => lines.reduce((s, l) => s + f(l), 0);
    return {
      received: sum((l) => l.receivedQuantity),
      accepted: sum((l) => l.acceptedQuantity),
      rejected: sum((l) => l.rejectedQuantity),
    };
  });
  protected readonly can = computed(() => {
    const has = (p: string) => checkPolicy(p, this.permissions);
    return {
      inspect: has(PURCHASING_PERMISSIONS.inspectGrn),
      cancel: has(PURCHASING_PERMISSIONS.cancelGrn),
      bill: has(PURCHASING_PERMISSIONS.createBill),
      debitNote: has(PURCHASING_PERMISSIONS.createDebitNote),
    };
  });

  constructor() {
    void this.load(this.route.snapshot.paramMap.get('id') ?? '');
  }

  private readonly dialogs = inject(ConfirmService);
  private readonly toasts = inject(ToastService);
  protected readonly acting = signal(false);

  /** Marks the goods as being checked, so the team sees they are in QC and not yet usable. */
  protected async startInspection(g: GoodsReceiptNoteDto): Promise<void> {
    await this.act(
      () => this.api.startInspection(g.id!, { skipHandleError: true }),
      `${g.grnNumber} is in QC inspection.`,
      'The goods receipt could not be moved to QC.',
    );
  }

  protected async cancelGrn(g: GoodsReceiptNoteDto): Promise<void> {
    if (
      !(await this.dialogs.confirm({
        title: `Cancel ${g.grnNumber}?`,
        message:
          'It stays on record as cancelled. Stock it added is not reversed here; adjust stock separately if the goods went back.',
        confirmText: 'Cancel GRN',
        cancelText: 'Keep it',
        tone: 'danger',
      }))
    )
      return;
    await this.act(
      () => this.api.cancel(g.id!, { skipHandleError: true }),
      `${g.grnNumber} cancelled.`,
      'The goods receipt could not be cancelled.',
    );
  }

  private async act(
    call: () => Observable<GoodsReceiptNoteDto>,
    done: string,
    failed: string,
  ): Promise<void> {
    this.acting.set(true);
    try {
      this.grn.set(await firstValueFrom(call()));
      this.toasts.success(done);
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, failed));
    } finally {
      this.acting.set(false);
    }
  }

  private async load(id: string): Promise<void> {
    try {
      this.grn.set(await firstValueFrom(this.api.get(id, { skipHandleError: true })));
    } catch (e: unknown) {
      this.problem.set(readApiError(e, 'This goods receipt could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected back(): void {
    const list = this.router
      .createUrlTree(['/purchasing/grn'], { queryParams: this.scopeParams })
      .toString();
    void this.router.navigateByUrl(this.origin.returnUrl(list));
  }
}
