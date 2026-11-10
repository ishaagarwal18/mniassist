import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastService } from '../../../core/ui/toast.service';
import { ArTopbar } from '../../../layout/topbar';
import {
  EWayBillStatus,
  GenerateEWayBillInput,
  GstAuditRegisterDto,
  GstComplianceService,
} from '../../../proxy/finance';
import { ArButton, ArCard, ArChip } from '../../../ui';

const GSTIN_OR_TRANSPORTER_ID = /^[0-9]{2}[A-Z0-9]{13}$/;
/** Indian vehicle registration, e.g. MH14BT4590 or MH-14-BT-4590 (separators ignored). */
const VEHICLE_NUMBER = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/;

/**
 * Generate the e-way bill for one invoice in the GST register (/finance/gst-compliance/eway/:id). Part A comes from the
 * invoice; Part B — the transporter, vehicle and distance — is entered here. On success the number is kept on the register
 * row and on the sales invoice.
 */
@Component({
  selector: 'ar-generate-eway-page',
  standalone: true,
  imports: [DecimalPipe, DatePipe, FormsModule, RouterLink, ArTopbar, ArCard, ArButton, ArChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar title="Generate e-way bill" [subtitle]="record()?.documentNumber ?? ''">
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
        <ar-card heading="Invoice and consignee (Part A)">
          <dl class="ewb__facts">
            <div>
              <dt>Invoice</dt>
              <dd class="ar-mono">{{ doc.documentNumber }}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{{ doc.documentDateUtc | date: 'mediumDate' }}</dd>
            </div>
            <div>
              <dt>Consignee</dt>
              <dd>{{ doc.counterpartyLegalName }}</dd>
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
              <span>
                Number <strong class="ar-mono">{{ doc.eWayBillNumber }}</strong>
                @if (doc.eWayBillValidUntilUtc) {
                  · valid until {{ doc.eWayBillValidUntilUtc | date: 'medium' }}
                }
              </span>
            </div>
            <p class="ewb__muted">
              Vehicle {{ doc.vehicleNumber || '—' }} · Transporter
              {{ doc.transporterGstin || '—' }} · {{ doc.distanceInKm ?? '—' }} km
            </p>
          </ar-card>
        } @else if (doc.eWayBillStatus !== EWayBillStatus.PendingGeneration) {
          <ar-card>
            <p class="ewb__muted">
              This invoice doesn't need an e-way bill: one is required for goods worth more than
              ₹50,000.
            </p>
          </ar-card>
        } @else {
          <ar-card heading="Transport (Part B)">
            <p class="ewb__muted">
              Needed for goods worth more than ₹50,000 (CGST Rule 138). Validity is set from the
              distance: one day for every 200 km.
            </p>
            <form class="ewb__form" (ngSubmit)="submitEWayBill()">
              <label class="ar-field">
                <span class="ar-field__label"
                  >Vehicle number <span class="ar-field__req">*</span></span
                >
                <input
                  class="ar-field__input ar-mono"
                  name="vehicleNumber"
                  placeholder="e.g. MH14BT4590"
                  autocomplete="off"
                  [(ngModel)]="vehicleNumber"
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
                  [(ngModel)]="transporterGstin"
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
                  [(ngModel)]="distanceInKm"
                />
              </label>
              @if (formError(); as e) {
                <p class="ewb__error ewb__wide" role="alert">{{ e }}</p>
              }
              <div class="ewb__actions ewb__wide">
                <a ar-button variant="ghost" routerLink="/finance/gst-compliance">Cancel</a>
                <button ar-button type="submit" variant="primary" [disabled]="isSubmitting()">
                  {{ isSubmitting() ? 'Generating…' : 'Generate e-way bill' }}
                </button>
              </div>
            </form>
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly gstService = inject(GstComplianceService);
  private readonly toasts = inject(ToastService);

  protected readonly EWayBillStatus = EWayBillStatus;

  readonly record = signal<GstAuditRegisterDto | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly isSubmitting = signal(false);
  readonly formError = signal<string | null>(null);

  vehicleNumber = '';
  transporterGstin = '';
  distanceInKm: number | null = null;

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
  }

  submitEWayBill(): void {
    const rec = this.record();
    if (!rec?.id || this.isSubmitting()) return;

    const vehicle = this.vehicleNumber.toUpperCase().replace(/[\s-]/g, '');
    const transporter = this.transporterGstin.toUpperCase().replace(/\s/g, '');
    const distance = Number(this.distanceInKm);
    if (!vehicle) {
      this.formError.set('Enter the vehicle number.');
      return;
    }
    if (!VEHICLE_NUMBER.test(vehicle)) {
      this.formError.set('That vehicle number does not look right, e.g. MH14BT4590.');
      return;
    }
    if (transporter && !GSTIN_OR_TRANSPORTER_ID.test(transporter)) {
      this.formError.set('The transporter GSTIN or ID has 15 characters, e.g. 27AAACG1234A1Z5.');
      return;
    }
    if (!(distance >= 1 && distance <= 4000)) {
      this.formError.set('Enter the distance in km, between 1 and 4,000.');
      return;
    }
    this.formError.set(null);

    const input: GenerateEWayBillInput = {
      vehicleNumber: vehicle,
      transporterGstin: transporter || undefined,
      distanceInKm: Math.round(distance),
    };

    this.isSubmitting.set(true);
    this.gstService.generateEWayBill(rec.id, input).subscribe({
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
        this.formError.set(err?.error?.error?.message ?? 'The e-way bill could not be generated.');
      },
    });
  }
}
