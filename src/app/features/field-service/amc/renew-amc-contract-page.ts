import { readApiError } from '../../../core/util/api-error';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastService } from '../../../core/ui/toast.service';
import { ArTopbar } from '../../../layout/topbar';
import {
  AmcContractDto,
  AmcContractService,
  AmcContractType,
  RenewAmcContractDto,
} from '../../../proxy/field-service';
import { ArButton, ArCard } from '../../../ui';

@Component({
  selector: 'ar-renew-amc-contract-page',
  imports: [CommonModule, FormsModule, ArTopbar, ArButton, ArCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      help="Renew a maintenance contract for a new period, with its new value and visit plan."
      title="Renew Equipment AMC Contract"
      [subtitle]="
        contract()
          ? contract()!.contractNumber + ' · ' + contract()!.customerName
          : 'Contract Renewal'
      "
    >
      <button ar-button="ghost" (click)="cancel()">Back to AMC Contracts</button>
    </ar-topbar>

    <div class="page-container ar-scroll">
      <ar-card [heading]="'Renewal Commercials & Duration'">
        @if (contract(); as c) {
          <div class="contract-banner">
            <div>
              <span class="banner-label">Customer</span>
              <strong>{{ c.customerName }}</strong>
            </div>
            <div>
              <span class="banner-label">Machine / Serial No</span>
              <strong>{{ c.equipmentModel }} ({{ c.equipmentSerialNumber }})</strong>
            </div>
            <div>
              <span class="banner-label">Current Expiry</span>
              <strong>{{ c.endDateUtc | date: 'mediumDate' }}</strong>
            </div>
          </div>
        }

        <form class="renew-form" (submit)="$event.preventDefault(); submit()">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label"
                >New Renewal Start Date <span class="required">*</span></label
              >
              <input
                type="date"
                class="ar-field__input"
                required
                [(ngModel)]="renewForm.newStartDateUtc"
                name="startDate"
              />
            </div>
            <div class="form-group">
              <label class="form-label">New Renewal End Date <span class="required">*</span></label>
              <input
                type="date"
                class="ar-field__input"
                required
                [(ngModel)]="renewForm.newEndDateUtc"
                name="endDate"
              />
            </div>
            <div class="form-group">
              <label class="form-label"
                >Renewal Contract Value (INR) <span class="required">*</span></label
              >
              <input
                type="number"
                min="0"
                class="ar-field__input"
                required
                [ngModel]="renewForm.newContractValueInPaise / 100"
                (ngModelChange)="renewForm.newContractValueInPaise = $event * 100"
                name="contractValue"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Contract Scope</label>
              <select
                class="ar-field__input"
                [(ngModel)]="renewForm.newContractType"
                name="contractType"
              >
                <option [ngValue]="AmcContractType.Comprehensive">
                  Comprehensive (With Spares)
                </option>
                <option [ngValue]="AmcContractType.NonComprehensive">Non-Comprehensive</option>
                <option [ngValue]="AmcContractType.PreventiveOnly">Preventive Only</option>
                <option [ngValue]="AmcContractType.OnDemand">On Demand SLA</option>
              </select>
            </div>
          </div>

          @if (error()) {
            <p class="error-msg" role="alert">{{ error() }}</p>
          }

          <div class="form-actions">
            <button ar-button="ghost" type="button" (click)="cancel()">Cancel</button>
            <button
              ar-button="primary"
              type="submit"
              [disabled]="busy() || !renewForm.newStartDateUtc || !renewForm.newEndDateUtc"
            >
              {{ busy() ? 'Renewing contract…' : 'Confirm Contract Renewal' }}
            </button>
          </div>
        </form>
      </ar-card>
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 1.5rem 2rem 3rem;
        max-width: 800px;
      }
      .contract-banner {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
        background: var(--ar-surface-subtle);
        border: 1px solid var(--ar-line-200);
        padding: 1rem 1.25rem;
        border-radius: var(--ar-radius-md);
        margin-bottom: 1.5rem;
      }
      .banner-label {
        display: block;
        font-size: 0.75rem;
        color: var(--ar-ink-500);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.25rem;
      }
      .renew-form {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }
      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .form-label {
        font-size: 0.8125rem;
        font-weight: 500;
        color: var(--ar-ink-800);
      }
      .required {
        color: var(--ar-bad-600);
      }
      .error-msg {
        color: var(--ar-bad-600);
        font-size: 0.875rem;
        margin: 0;
      }
      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid var(--ar-line-200);
      }
    `,
  ],
})
export class ArRenewAmcContractPage implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly amcService = inject(AmcContractService);
  private readonly toasts = inject(ToastService);

  protected readonly AmcContractType = AmcContractType;

  protected readonly contractId = signal<string>('');
  protected readonly contract = signal<AmcContractDto | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected renewForm: RenewAmcContractDto = {
    newStartDateUtc: new Date().toISOString().substring(0, 10),
    newEndDateUtc: new Date(Date.now() + 365 * 86_400_000).toISOString().substring(0, 10),
    newContractValueInPaise: 480_000_00,
    newContractType: AmcContractType.Comprehensive,
  };

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.contractId.set(id);

    if (id) {
      this.amcService.get(id).subscribe({
        next: (c) => {
          this.contract.set(c);
          if (c.endDateUtc) {
            const nextStart = new Date(c.endDateUtc);
            const nextEnd = new Date(nextStart.getTime() + 365 * 86_400_000);
            this.renewForm.newStartDateUtc = nextStart.toISOString().substring(0, 10);
            this.renewForm.newEndDateUtc = nextEnd.toISOString().substring(0, 10);
          }
          this.renewForm.newContractValueInPaise = c.contractValueInPaise;
          this.renewForm.newContractType = c.contractType;
        },
        error: () => {},
      });
    } else {
    }
  }

  cancel(): void {
    void this.router.navigateByUrl('/field-service/amc');
  }

  submit(): void {
    const id = this.contractId();
    if (!id || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);

    this.amcService.renew(id, this.renewForm).subscribe({
      next: () => {
        this.busy.set(false);
        this.toasts.success('Contract renewed successfully.');
        void this.router.navigateByUrl('/field-service/amc');
      },
      error: (err: any) => {
        this.busy.set(false);
        this.error.set(readApiError(err, 'The contract was not renewed. Check the new dates and amount, then try again.'));
      },
    });
  }
}
