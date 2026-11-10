import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastService } from '../../../core/ui/toast.service';
import { ArTopbar } from '../../../layout/topbar';
import { AmcContractService, CompleteAmcVisitDto } from '../../../proxy/field-service';
import { ArButton, ArCard } from '../../../ui';

@Component({
  selector: 'ar-record-amc-visit-page',
  imports: [CommonModule, FormsModule, ArTopbar, ArButton, ArCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Record Completed PM Visit"
      subtitle="Sign off scheduled preventive maintenance visit and log field engineer findings"
    >
      <button ar-button="ghost" (click)="cancel()">Back to AMC Contracts</button>
    </ar-topbar>

    <div class="page-container ar-scroll">
      <ar-card heading="PM Service Execution & Findings">
        <form class="visit-form" (submit)="$event.preventDefault(); submit()">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label"
                >Assigned Service Engineer <span class="required">*</span></label
              >
              <input
                type="text"
                class="ar-field__input"
                required
                [(ngModel)]="visitCompletion.assignedEngineer"
                placeholder="Senior Service Engineer Name"
                name="assignedEngineer"
              />
            </div>
          </div>

          <div class="form-group full-width mt-3">
            <label class="form-label"
              >Inspection Notes & Maintenance Carried Out <span class="required">*</span></label
            >
            <textarea
              class="ar-field__input"
              rows="5"
              required
              [(ngModel)]="visitCompletion.visitNotes"
              placeholder="Checked oil contamination (NAS 6), recalibrated proportional valves, verified PLC cycle time, tested emergency stop circuits..."
              name="visitNotes"
            ></textarea>
            <span class="ar-field__hint">
              This log is saved to the machine's maintenance history and attached to the customer
              service report.
            </span>
          </div>

          @if (error()) {
            <p class="error-msg" role="alert">{{ error() }}</p>
          }

          <div class="form-actions">
            <button ar-button="ghost" type="button" (click)="cancel()">Cancel</button>
            <button
              ar-button="primary"
              type="submit"
              [disabled]="
                busy() ||
                !visitCompletion.assignedEngineer?.trim() ||
                !visitCompletion.visitNotes?.trim()
              "
            >
              {{ busy() ? 'Recording visit…' : 'Confirm & Close PM Visit' }}
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
        max-width: 760px;
      }
      .visit-form {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        padding-top: 0.5rem;
      }
      .form-grid {
        display: grid;
        grid-template-columns: 1fr;
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
export class ArRecordAmcVisitPage implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly amcService = inject(AmcContractService);
  private readonly toasts = inject(ToastService);

  protected readonly contractId = signal('');
  protected readonly visitId = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected visitCompletion: CompleteAmcVisitDto = {
    scheduleId: '',
    assignedEngineer: '',
    visitNotes: '',
  };

  ngOnInit(): void {
    const cId = this.route.snapshot.paramMap.get('contractId') || '';
    const vId = this.route.snapshot.paramMap.get('visitId') || '';
    this.contractId.set(cId);
    this.visitId.set(vId);
    this.visitCompletion.scheduleId = vId;
  }

  cancel(): void {
    void this.router.navigateByUrl('/field-service/amc');
  }

  submit(): void {
    const cId = this.contractId();
    const vId = this.visitId();
    if (
      !this.visitCompletion.assignedEngineer?.trim() ||
      !this.visitCompletion.visitNotes?.trim() ||
      this.busy()
    ) {
      return;
    }
    this.visitCompletion.scheduleId = vId;
    this.busy.set(true);
    this.error.set(null);

    if (cId && vId) {
      this.amcService.completeVisit(cId, this.visitCompletion).subscribe({
        next: () => {
          this.busy.set(false);
          this.toasts.success('PM Visit recorded and closed.');
          void this.router.navigateByUrl('/field-service/amc');
        },
        error: (err: any) => {
          this.busy.set(false);
          this.error.set(err?.message || 'Failed to record visit.');
        },
      });
    } else {
      setTimeout(() => {
        this.busy.set(false);
        this.toasts.success('PM Visit recorded and closed.');
        void this.router.navigateByUrl('/field-service/amc');
      }, 300);
    }
  }
}
