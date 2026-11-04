import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { checkPolicy } from '../../../core/auth/permission';
import { ConfirmService } from '../../../core/ui/confirm.service';
import { ToastService } from '../../../core/ui/toast.service';
import { readApiError } from '../../../core/util/api-error';
import { readSupplierScope, supplierScopeParams } from '../../../core/util/supplier-scope';
import { CockpitOriginService } from '../../../layout/cockpit-origin.service';
import { ArTopbar } from '../../../layout/topbar';
import {
  GoodsReceiptNoteDto,
  GoodsReceiptNoteService,
  QcInspectionStatus,
} from '../../../proxy/purchasing';
import { ArButton, ArChip, ArIcon } from '../../../ui';
import { PURCHASE_FORM_STYLES } from '../purchase-form';
import { PURCHASING_PERMISSIONS } from '../purchasing-permissions';
import {
  InspectionRow,
  canInspect,
  inspectionRows,
  qcResult,
  toCompleteInspectionDto,
  validateInspection,
} from './grn-inspection.logic';
import { qcChip } from './grn-labels';

/**
 * QC inspection of a goods receipt on its own page (/purchasing/grn/<id>/inspect): accepted and rejected quantity per line, the
 * bin it goes to and why anything was rejected. Confirmed, the receipt is approved (or rejected when nothing passes) and, when it
 * is against a purchase order, the accepted quantities are received on the order. Then it opens the receipt's page.
 */
@Component({
  selector: 'ar-grn-inspect-page',
  imports: [ArTopbar, ArButton, ArChip, ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      [title]="'QC inspection' + (grn() ? ' · ' + grn()!.grnNumber : '')"
      [subtitle]="grn()?.supplierName ?? 'Record what passed and what was rejected'"
    />

    <div class="pf ar-scroll ar-scroll--bare">
      @if (!canInspectRole) {
        <section class="pf__card pf__denied" role="alert">
          <ar-icon name="shield" [size]="20" />
          <div>
            <strong>Your role can't record QC inspections.</strong>
            <p>Ask an administrator for the "Goods receipt notes › Inspect" permission.</p>
          </div>
          <button ar-button variant="ghost" type="button" (click)="back()">Go back</button>
        </section>
      } @else if (loading()) {
        <p class="qi-muted">Loading the goods receipt…</p>
      } @else if (problem(); as p) {
        <section class="pf__card pf__denied" role="alert">
          <ar-icon name="alert" [size]="20" />
          <div>
            <strong>{{ p }}</strong>
          </div>
          <button ar-button variant="ghost" type="button" (click)="back()">Go back</button>
        </section>
      } @else if (grn(); as g) {
        <form class="pf__form" novalidate (submit)="$event.preventDefault(); save()">
          <section class="pf__card" aria-labelledby="qi-s1">
            <header class="pf__head">
              <span class="pf__step">1</span>
              <div>
                <h2 id="qi-s1">Inspector</h2>
                <p>
                  {{ g.grnNumber }} from <strong translate="no">{{ g.supplierName }}</strong> ·
                  challan <span class="ar-mono">{{ g.challanNumber }}</span>
                </p>
              </div>
            </header>
            <div class="pf__grid">
              <div class="ar-field pf__span2">
                <label class="ar-field__label" for="qi-who"
                  >Inspected by <span class="pf__req">*</span></label
                >
                <input
                  id="qi-who"
                  class="ar-field__input"
                  placeholder="e.g. Ramesh Pawar (QC head)"
                  [attr.aria-invalid]="!!err('inspector')"
                  [value]="inspector()"
                  (input)="inspector.set($any($event.target).value)"
                />
                @if (err('inspector'); as e) {
                  <span class="pf__err">{{ e }}</span>
                }
              </div>
              <div class="ar-field pf__span2">
                <span class="ar-field__label">Result</span>
                <div class="qi-result">
                  <ar-chip [tone]="result().tone">{{ result().label }}</ar-chip>
                  <span class="qi-muted">Worked out from the lines below.</span>
                </div>
              </div>
            </div>
          </section>

          <section class="pf__card" aria-labelledby="qi-s2">
            <header class="pf__head">
              <span class="pf__step">2</span>
              <div>
                <h2 id="qi-s2">Lines</h2>
                <p>Accepted and rejected must add up to what was received.</p>
              </div>
            </header>
            <div class="pf__lines" role="table" aria-label="Inspection lines">
              <div class="pf__line pf__line--qi pf__line--head" role="row">
                <span role="columnheader">Part</span>
                <span role="columnheader" class="pf__num">Received</span>
                <span role="columnheader" class="pf__num">Accepted</span>
                <span role="columnheader" class="pf__num">Rejected</span>
                <span role="columnheader">Bin</span>
                <span role="columnheader">Rejection reason</span>
              </div>
              @for (r of rows(); track r.lineId; let i = $index) {
                <div class="pf__line pf__line--qi" role="row">
                  <span role="cell">
                    <b class="ar-mono">{{ r.partNumber }}</b>
                    <span class="pf__sub">{{ r.description }}</span>
                  </span>
                  <span role="cell" class="pf__cell-value">{{ r.received }} {{ r.unit }}</span>
                  <span role="cell">
                    <input
                      class="ar-field__input pf__num"
                      type="number"
                      min="0"
                      step="any"
                      [attr.aria-label]="'Accepted, ' + r.partNumber"
                      [attr.aria-invalid]="!!err('row.' + i)"
                      [value]="r.accepted"
                      (input)="setAccepted(i, +$any($event.target).value)"
                    />
                  </span>
                  <span role="cell">
                    <input
                      class="ar-field__input pf__num"
                      type="number"
                      min="0"
                      step="any"
                      [attr.aria-label]="'Rejected, ' + r.partNumber"
                      [attr.aria-invalid]="!!err('row.' + i)"
                      [value]="r.rejected"
                      (input)="setRejected(i, +$any($event.target).value)"
                    />
                    @if (err('row.' + i); as e) {
                      <span class="pf__err">{{ e }}</span>
                    }
                  </span>
                  <span role="cell">
                    <input
                      class="ar-field__input ar-mono"
                      placeholder="BIN-A1"
                      [attr.aria-label]="'Storage bin, ' + r.partNumber"
                      [value]="r.storageBin"
                      (input)="patchRow(i, { storageBin: $any($event.target).value })"
                    />
                  </span>
                  <span role="cell">
                    <input
                      class="ar-field__input"
                      [placeholder]="r.rejected > 0 ? 'Why it was rejected' : 'Only if rejected'"
                      [disabled]="r.rejected === 0"
                      [attr.aria-label]="'Rejection reason, ' + r.partNumber"
                      [attr.aria-invalid]="!!err('reason.' + i)"
                      [value]="r.rejectionReason"
                      (input)="patchRow(i, { rejectionReason: $any($event.target).value })"
                    />
                    @if (err('reason.' + i); as e) {
                      <span class="pf__err">{{ e }}</span>
                    }
                  </span>
                </div>
              }
            </div>
            <div class="ar-field">
              <label class="ar-field__label" for="qi-rem"
                >Inspection summary <span class="ar-field__opt">optional</span></label
              >
              <textarea
                id="qi-rem"
                class="ar-field__input"
                rows="2"
                placeholder="e.g. Dimensions checked per drawing Rev C; sampling per ISO 2859"
                [value]="remarks()"
                (input)="remarks.set($any($event.target).value)"
              ></textarea>
            </div>
          </section>

          @if (saveError(); as e) {
            <p class="pf__alert" role="alert">{{ e }}</p>
          }

          <footer class="pf__bar">
            <span class="pf__summary">
              {{ totals().accepted }} accepted
              @if (totals().rejected > 0) {
                · <span class="qi-bad">{{ totals().rejected }} rejected</span>
              }
            </span>
            <button ar-button variant="ghost" type="button" (click)="back()">Cancel</button>
            <button ar-button variant="primary" type="submit" icon="check" [disabled]="busy()">
              {{ busy() ? 'Saving…' : 'Confirm inspection' }}
            </button>
          </footer>
        </form>
      }
    </div>
  `,
  styles: [
    PURCHASE_FORM_STYLES,
    `
      .pf__line--qi {
        grid-template-columns: 2.2fr 0.8fr 0.8fr 0.8fr 1fr 2fr;
      }
      .qi-muted {
        color: var(--ar-ink-500);
        font: 400 12.5px var(--ar-font-sans);
      }
      .qi-result {
        height: 36px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .qi-bad {
        color: var(--ar-bad-600);
        font-weight: 600;
      }
    `,
  ],
})
export class ArGrnInspectPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toasts = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly origin = inject(CockpitOriginService);
  private readonly api = inject(GoodsReceiptNoteService);

  protected readonly canInspectRole = checkPolicy(
    PURCHASING_PERMISSIONS.inspectGrn,
    inject(PermissionService),
  );
  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';
  private readonly scope = readSupplierScope(this.route);

  protected readonly grn = signal<GoodsReceiptNoteDto | null>(null);
  protected readonly rows = signal<InspectionRow[]>([]);
  protected readonly inspector = signal('');
  protected readonly remarks = signal('');
  protected readonly loading = signal(this.canInspectRole);
  protected readonly problem = signal<string | null>(null);

  private readonly submitted = signal(false);
  protected readonly errors = computed(() =>
    this.submitted() ? validateInspection(this.inspector(), this.rows()) : {},
  );
  protected readonly result = computed(() => qcChip(qcResult(this.rows())));
  protected readonly totals = computed(() => ({
    accepted: this.rows().reduce((s, r) => s + (r.accepted || 0), 0),
    rejected: this.rows().reduce((s, r) => s + (r.rejected || 0), 0),
  }));
  protected readonly busy = signal(false);
  protected readonly saveError = signal<string | null>(null);

  constructor() {
    if (this.canInspectRole) void this.load();
  }

  private async load(): Promise<void> {
    try {
      const g = await firstValueFrom(this.api.get(this.id, { skipHandleError: true }));
      if (!canInspect(g)) {
        this.problem.set(`${g.grnNumber} has already been inspected.`);
        return;
      }
      this.grn.set(g);
      this.rows.set(inspectionRows(g));
    } catch (e: unknown) {
      this.problem.set(readApiError(e, 'This goods receipt could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected err(key: string): string | null {
    return this.errors()[key] ?? null;
  }

  protected patchRow(i: number, p: Partial<InspectionRow>): void {
    this.rows.update((rs) => rs.map((r, j) => (j === i ? { ...r, ...p } : r)));
  }

  /** Typing one side fills the other, so the line always adds up to what was received. */
  protected setAccepted(i: number, accepted: number): void {
    const r = this.rows()[i];
    const a = Math.min(Math.max(0, accepted || 0), r.received);
    this.patchRow(i, { accepted: a, rejected: r.received - a });
  }

  protected setRejected(i: number, rejected: number): void {
    const r = this.rows()[i];
    const x = Math.min(Math.max(0, rejected || 0), r.received);
    this.patchRow(i, { rejected: x, accepted: r.received - x });
  }

  protected back(): void {
    const detail = this.router
      .createUrlTree(['/purchasing/grn', this.id], {
        queryParams: this.scope ? supplierScopeParams(this.scope) : {},
      })
      .toString();
    void this.router.navigateByUrl(this.origin.returnUrl(detail));
  }

  protected async save(): Promise<void> {
    this.submitted.set(true);
    this.saveError.set(null);
    if (Object.keys(validateInspection(this.inspector(), this.rows())).length) {
      this.toasts.warning('Fill in the highlighted fields.');
      return;
    }
    const g = this.grn()!;
    const t = this.totals();
    const ok = await this.confirm.confirm({
      title: `Confirm QC for ${g.grnNumber}?`,
      message:
        qcResult(this.rows()) === QcInspectionStatus.Passed
          ? 'All goods passed: they are put away and the receipt is approved.'
          : 'The receipt is closed for inspection with this result. It can’t be inspected again.',
      details: [
        `Result: ${this.result().label}`,
        `${t.accepted} accepted, ${t.rejected} rejected`,
        ...(g.purchaseOrderReference
          ? [`Accepted quantities are received on ${g.purchaseOrderReference}`]
          : []),
      ],
      confirmText: 'Confirm inspection',
      tone: 'primary',
    });
    if (!ok) return;
    this.busy.set(true);
    try {
      const saved = await firstValueFrom(
        this.api.completeInspection(
          this.id,
          toCompleteInspectionDto(this.inspector(), this.remarks(), this.rows()),
          { skipHandleError: true },
        ),
      );
      this.toasts.success(
        `${saved.grnNumber}: ${qcChip(saved.qcStatus).label.toLowerCase()}.`,
        'Inspection recorded',
      );
      void this.router.navigate(['/purchasing/grn', this.id], {
        queryParams: this.scope ? supplierScopeParams(this.scope) : {},
        replaceUrl: true,
      });
    } catch (e: unknown) {
      const message = readApiError(e, 'The inspection could not be saved.');
      this.saveError.set(message);
      this.toasts.error(message, 'Not saved');
    } finally {
      this.busy.set(false);
    }
  }
}
