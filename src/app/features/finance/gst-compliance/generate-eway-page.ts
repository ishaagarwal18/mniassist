import { grantedPolicy } from '../../../core/auth/permission';
import { PermissionService } from '@abp/ng.core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConfirmService } from '../../../core/ui/confirm.service';
import { ToastService } from '../../../core/ui/toast.service';
import { readApiError } from '../../../core/util/api-error';
import { ArTopbar } from '../../../layout/topbar';
import {
  EWayBillStatus,
  EWayTransportMode,
  GstAuditRegisterDto,
  GstComplianceService,
  GstPortalMode,
  GstPortalReadinessDto,
} from '../../../proxy/finance';
import { ArBanner, ArButton, ArCard, ArChip } from '../../../ui';
import {
  askCancelReason,
  EWayForm,
  eWayInputFrom,
  portalModeLabel,
  TRANSPORT_MODES,
  unofficialNumberChip,
} from './gst-portal.logic';

/**
 * The e-way bill for one invoice in the GST register (/finance/gst-compliance/eway/:id). Part A comes from the invoice;
 * Part B — how the goods travel, the transporter, the vehicle and the distance — is entered here. The number comes from
 * the GST portal in Live mode and goes on the register row and the sales invoice; in Test and Sandbox it stays on the
 * register only.
 */
@Component({
  selector: 'ar-generate-eway-page',
  standalone: true,
  imports: [
    DecimalPipe,
    DatePipe,
    FormsModule,
    RouterLink,
    ArTopbar,
    ArCard,
    ArButton,
    ArChip,
    ArBanner,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      help="Generate the e-way bill for an invoice's goods movement, with the transporter and vehicle details."
      title="E-way bill" [subtitle]="record()?.documentNumber ?? ''">
      <a ar-button variant="ghost" routerLink="/finance/gst-compliance">Back to GST compliance</a>
    </ar-topbar>

    <div class="ewb ar-scroll">
      @if (loading()) {
        <p class="ewb__muted">Loading the invoice…</p>
      } @else if (loadError(); as e) {
        <ar-card>
          <div class="ewb__empty">
            <p>{{ e }}</p>
            <a ar-button variant="primary" routerLink="/finance/gst-compliance"
              >Back to GST compliance</a
            >
          </div>
        </ar-card>
      } @else if (record(); as doc) {
        @if (readiness(); as ready) {
          @if (ready.mode === GstPortalMode.Off) {
            <ar-banner tone="warn">
              E-way bills are switched off for this workspace.
              <a
                banner-actions
                ar-button
                variant="ghost"
                routerLink="/finance/gst-compliance/connection"
                >GST portal connection</a
              >
            </ar-banner>
          } @else if (!ready.isConnected) {
            <ar-banner tone="warn">
              The Masters India account is not set, so nothing can be sent to the portal yet.
              <a
                banner-actions
                ar-button
                variant="ghost"
                routerLink="/finance/gst-compliance/connection"
                >GST portal connection</a
              >
            </ar-banner>
          } @else if (ready.mode !== GstPortalMode.Live) {
            <ar-banner tone="teal">
              {{ modeLabel(ready.mode) }} mode: the number you get here is a rehearsal and is not a
              valid e-way bill.
            </ar-banner>
          }
        }

        <ar-card heading="Invoice and consignee (Part A)">
          <dl class="ewb__facts">
            <div>
              <dt>Invoice</dt>
              <dd class="ar-mono" translate="no">{{ doc.documentNumber }}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{{ doc.documentDateUtc | date: 'mediumDate' }}</dd>
            </div>
            <div>
              <dt>Consignee</dt>
              <dd translate="no">{{ doc.counterpartyLegalName }}</dd>
            </div>
            <div>
              <dt>Consignee GSTIN</dt>
              <dd class="ar-mono">{{ doc.counterpartyGstin || 'Unregistered' }}</dd>
            </div>
            <div>
              <dt>Place of supply</dt>
              <dd>{{ doc.placeOfSupplyStateCode || '—' }}</dd>
            </div>
            <div>
              <dt>Taxable value</dt>
              <dd>₹{{ doc.taxableAmountInPaise / 100 | number: '1.2-2' }}</dd>
            </div>
            <div>
              <dt>Invoice value</dt>
              <dd class="ewb__strong">
                ₹{{ doc.totalInvoiceValueInPaise / 100 | number: '1.2-2' }}
              </dd>
            </div>
          </dl>
        </ar-card>

        @if (doc.eWayBillStatus === EWayBillStatus.Active) {
          <ar-card heading="E-way bill">
            <div class="ewb__done">
              <ar-chip tone="good" [dot]="true">Active</ar-chip>
              @if (chip(doc.eWayBillMode); as c) {
                <ar-chip [tone]="c.tone" [title]="c.title">{{ c.label }}</ar-chip>
              }
              <span>
                Number <strong class="ar-mono" translate="no">{{ doc.eWayBillNumber }}</strong>
                @if (doc.eWayBillValidUntilUtc) {
                  · valid until {{ doc.eWayBillValidUntilUtc | date: 'medium' }}
                }
              </span>
            </div>
            <p class="ewb__muted">
              Vehicle {{ doc.vehicleNumber || '—' }} · Transporter
              {{ doc.transporterName || doc.transporterGstin || '—' }} ·
              {{ doc.distanceInKm ?? '—' }} km
            </p>
            <div class="ewb__actions" [hidden]="!canEWay()">
              <button
                ar-button
                type="button"
                variant="ghost"
                [disabled]="isSubmitting()"
                (click)="cancelEWayBill()"
              >
                Cancel e-way bill
              </button>
            </div>
          </ar-card>
        }

        @if (doc.eWayBillStatus === EWayBillStatus.Cancelled) {
          <ar-banner tone="teal">
            E-way bill <span class="ar-mono" translate="no">{{ doc.eWayBillNumber }}</span> was
            cancelled{{ doc.eWayBillCancelRemarks ? ': ' + doc.eWayBillCancelRemarks : '' }}. A new
            one can be generated below.
          </ar-banner>
        }

        @if (showForm(doc) && !canEWay()) {
          <ar-banner tone="warn"
            >You can see this e-way bill. Generating or cancelling one needs the Generate e-way bill
            permission.</ar-banner
          >
        }
        @if (showForm(doc) && canEWay()) {
          @if (problems().length) {
            <ar-banner tone="warn">
              <strong>Fix these first, then generate the e-way bill:</strong>
              <ul class="ewb__list">
                @for (p of problems(); track p) {
                  <li>{{ p }}</li>
                }
              </ul>
            </ar-banner>
          }
          @if (doc.eWayBillLastError; as last) {
            <ar-banner tone="bad"
              >The portal refused the last attempt:
              <span translate="no">{{ last }}</span></ar-banner
            >
          }

          <ar-card heading="Transport (Part B)">
            <p class="ewb__muted">
              Needed for goods worth more than ₹50,000 (CGST Rule 138). The portal sets the validity
              from the distance: one day for every 200 km.
            </p>
            <form class="ewb__form" (ngSubmit)="submitEWayBill()">
              <label class="ar-field">
                <span class="ar-field__label">Mode of transport</span>
                <select
                  class="ar-field__input"
                  name="transportMode"
                  [(ngModel)]="form.transportMode"
                >
                  @for (m of transportModes; track m.value) {
                    <option [ngValue]="m.value">{{ m.label }}</option>
                  }
                </select>
              </label>
              <label class="ar-field">
                <span class="ar-field__label"
                  >Vehicle number
                  @if (form.transportMode === EWayTransportMode.Road) {
                    <span class="ar-field__opt">or a transporter</span>
                  } @else {
                    <span class="ar-field__opt">optional</span>
                  }
                </span>
                <input
                  class="ar-field__input ar-mono"
                  name="vehicleNumber"
                  placeholder="e.g. MH14BT4590"
                  autocomplete="off"
                  [(ngModel)]="form.vehicleNumber"
                />
              </label>
              <label class="ar-field">
                <span class="ar-field__label"
                  >Distance (km) <span class="ar-field__req">*</span></span
                >
                <input
                  type="number"
                  min="1"
                  max="4000"
                  class="ar-field__input"
                  name="distanceInKm"
                  [(ngModel)]="form.distanceInKm"
                />
              </label>
              <label class="ar-field">
                <span class="ar-field__label"
                  >Transporter GSTIN or ID <span class="ar-field__opt">optional</span></span
                >
                <input
                  class="ar-field__input ar-mono"
                  name="transporterGstin"
                  maxlength="15"
                  placeholder="15 characters"
                  autocomplete="off"
                  [(ngModel)]="form.transporterGstin"
                />
              </label>
              <label class="ar-field">
                <span class="ar-field__label"
                  >Transporter name <span class="ar-field__opt">optional</span></span
                >
                <input
                  class="ar-field__input"
                  name="transporterName"
                  maxlength="100"
                  autocomplete="off"
                  [(ngModel)]="form.transporterName"
                />
              </label>
              <label class="ar-field">
                <span class="ar-field__label"
                  >{{ documentLabel() }}
                  @if (form.transportMode === EWayTransportMode.Road) {
                    <span class="ar-field__opt">optional</span>
                  } @else {
                    <span class="ar-field__req">*</span>
                  }
                </span>
                <input
                  class="ar-field__input ar-mono"
                  name="transportDocumentNumber"
                  maxlength="15"
                  autocomplete="off"
                  [(ngModel)]="form.transportDocumentNumber"
                />
              </label>
              <label class="ar-field">
                <span class="ar-field__label"
                  >Document date <span class="ar-field__opt">optional</span></span
                >
                <input
                  type="date"
                  class="ar-field__input"
                  name="transportDocumentDate"
                  [(ngModel)]="form.transportDocumentDate"
                />
              </label>
              @if (formError(); as e) {
                <p class="ewb__error ewb__wide" role="alert">{{ e }}</p>
              }
              <div class="ewb__actions ewb__wide">
                <a ar-button variant="ghost" routerLink="/finance/gst-compliance">Cancel</a>
                <button
                  ar-button
                  type="submit"
                  variant="primary"
                  [disabled]="isSubmitting() || !canSend()"
                >
                  {{ isSubmitting() ? 'Generating…' : 'Generate e-way bill' }}
                </button>
              </div>
            </form>
          </ar-card>
        } @else if (doc.eWayBillStatus === EWayBillStatus.NotApplicable) {
          <ar-card>
            <p class="ewb__muted">
              This invoice doesn't need an e-way bill: one is required for goods worth more than
              ₹50,000.
            </p>
          </ar-card>
        }
      }
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }
    .ewb {
      flex: 1;
      min-height: 0;
      padding: 18px 24px 32px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      max-width: 920px;
    }
    .ewb ar-card {
      display: block;
    }
    .ewb__facts {
      margin: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px 16px;
    }
    .ewb__facts dt {
      font: 400 11.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .ewb__facts dd {
      margin: 2px 0 0;
      font: 500 13.5px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .ewb__strong {
      font-weight: 700 !important;
    }
    .ewb__muted {
      margin: 0 0 12px;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .ewb__list {
      margin: 6px 0 0;
      padding-left: 18px;
    }
    .ewb__done {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
      font: 400 13.5px var(--ar-font-sans);
    }
    .ewb__form {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px 14px;
    }
    .ewb__form .ar-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .ewb__wide {
      grid-column: 1 / -1;
    }
    .ewb__error {
      margin: 0;
      padding: 8px 12px;
      border-radius: var(--ar-radius-control);
      background: var(--ar-red-100);
      color: var(--ar-bad-600);
      font: 500 12.5px var(--ar-font-sans);
    }
    .ewb__actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding-top: 12px;
      border-top: 1px solid var(--ar-line-100);
    }
    .ewb__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 24px;
      text-align: center;
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    @media (max-width: 760px) {
      .ewb {
        padding: 14px 16px 24px;
      }
      .ewb__form {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class ArGenerateEWayPage implements OnInit {
  private readonly permissionGate = inject(PermissionService);
  protected readonly canEWay = grantedPolicy(
    'AutoReach.GstCompliance.GenerateEWayBill',
    this.permissionGate,
  );
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly gstService = inject(GstComplianceService);
  private readonly toasts = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly EWayBillStatus = EWayBillStatus;
  protected readonly EWayTransportMode = EWayTransportMode;
  protected readonly GstPortalMode = GstPortalMode;
  protected readonly transportModes = TRANSPORT_MODES;
  protected readonly chip = unofficialNumberChip;
  protected readonly modeLabel = portalModeLabel;

  readonly record = signal<GstAuditRegisterDto | null>(null);
  readonly readiness = signal<GstPortalReadinessDto | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly isSubmitting = signal(false);
  readonly formError = signal<string | null>(null);

  form: EWayForm = {
    transportMode: EWayTransportMode.Road,
    vehicleNumber: '',
    transporterGstin: '',
    transporterName: '',
    transportDocumentNumber: '',
    transportDocumentDate: '',
    distanceInKm: null,
  };

  protected problems(): string[] {
    return this.readiness()?.eWayBillProblems ?? [];
  }

  /** The portal is on and has an account, and nothing is missing on the invoice. */
  protected canSend(): boolean {
    const ready = this.readiness();
    if (!ready) return true; // The check did not load: let the server decide.
    return ready.mode !== GstPortalMode.Off && ready.isConnected && !ready.eWayBillProblems.length;
  }

  /** The form shows whenever a bill can be generated: one is due, or the last one was cancelled or was a rehearsal. */
  protected showForm(doc: GstAuditRegisterDto): boolean {
    if (doc.eWayBillStatus === EWayBillStatus.NotApplicable) return false;
    if (doc.eWayBillStatus === EWayBillStatus.Active) {
      return doc.eWayBillMode !== GstPortalMode.Live && doc.eWayBillMode != null;
    }
    return true;
  }

  protected documentLabel(): string {
    switch (this.form.transportMode) {
      case EWayTransportMode.Rail:
        return 'RR number';
      case EWayTransportMode.Air:
        return 'Airway bill number';
      case EWayTransportMode.Ship:
        return 'Bill of lading number';
      default:
        return 'LR / transport document number';
    }
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';

    this.gstService.get(id, { skipHandleError: true }).subscribe({
      next: (doc) => {
        this.record.set(doc);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('This invoice is not in the GST register. It may have been removed.');
        this.loading.set(false);
      },
    });
    this.gstService.getReadiness(id, { skipHandleError: true }).subscribe({
      next: (ready) => this.readiness.set(ready),
      error: () => this.readiness.set(null),
    });
  }

  submitEWayBill(): void {
    const rec = this.record();
    if (!rec?.id || this.isSubmitting()) return;

    const built = eWayInputFrom(this.form);
    if (built.error !== undefined) {
      this.formError.set(built.error);
      return;
    }
    this.formError.set(null);

    this.isSubmitting.set(true);
    this.gstService.generateEWayBill(rec.id, built.input, { skipHandleError: true }).subscribe({
      next: (updated) => {
        this.isSubmitting.set(false);
        this.toasts.success(
          updated.eWayBillNumber
            ? `E-way bill ${updated.eWayBillNumber} generated for ${rec.documentNumber}.`
            : `E-way bill generated for ${rec.documentNumber}.`,
        );
        void this.router.navigate(['/finance/gst-compliance']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.formError.set(readApiError(err, 'The e-way bill could not be generated.'));
      },
    });
  }

  async cancelEWayBill(): Promise<void> {
    const rec = this.record();
    if (!rec?.id || !rec.eWayBillNumber || this.isSubmitting()) return;

    const input = await askCancelReason(
      this.confirm,
      'e-way bill',
      rec.eWayBillNumber,
      rec.eWayBillMode === GstPortalMode.Live,
    );
    if (!input) return;

    this.isSubmitting.set(true);
    this.gstService.cancelEWayBill(rec.id, input, { skipHandleError: true }).subscribe({
      next: (updated) => {
        this.isSubmitting.set(false);
        this.record.set(updated);
        this.toasts.success(`E-way bill ${rec.eWayBillNumber} cancelled.`);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toasts.error(readApiError(err, 'The e-way bill could not be cancelled.'));
      },
    });
  }
}
