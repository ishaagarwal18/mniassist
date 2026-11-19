import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PickerOption } from '../../../core/services/pipeline.service';
import { ToastService } from '../../../core/ui/toast.service';
import { ArTopbar } from '../../../layout/topbar';
import {
  EquipmentCategory,
  equipmentCategoryOptions,
  InitiateRemoteMaintenanceInput,
  MaintenanceChannel,
  maintenanceChannelOptions,
  MaintenanceSeverity,
  maintenanceSeverityOptions,
  RemoteMaintenanceService,
} from '../../../proxy/maintenance';
import { ArButton, ArCard } from '../../../ui';
import { ArContactPicker } from '../../pipeline/contact-picker';

@Component({
  selector: 'ar-new-diagnostic-session-page',
  imports: [CommonModule, FormsModule, ArTopbar, ArButton, ArCard, ArContactPicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      help="Start an AI-guided diagnosis with the customer's plant engineer on WhatsApp or the phone line."
      title="Initiate AI Remote Diagnostic Session"
      subtitle="Engage customer plant engineer via WhatsApp or Voice IVR for real-time guided fault diagnosis"
    >
      <button ar-button variant="ghost" (click)="cancel()">Back to Diagnostics</button>
    </ar-topbar>

    <div class="page-container ar-scroll">
      <ar-card heading="Diagnostic Session & Machinery Parameters">
        <form class="session-form" (submit)="$event.preventDefault(); submit()">
          <div class="ar-field full-width">
            <span class="ar-field__label">Customer Contact <span class="required">*</span></span>
            <ar-contact-picker [initial]="contact()" (picked)="pickContact($event)" />
            <span class="ar-field__hint"
              >The plant engineer or technician reporting the fault; the AI communicates with
              them.</span
            >
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label"
                >Customer Company Name <span class="required">*</span></label
              >
              <input
                type="text"
                class="ar-field__input"
                required
                [(ngModel)]="sessionInput.customerName"
                placeholder="Client / Plant Name"
                name="customerName"
              />
            </div>

            <div class="form-group">
              <label class="form-label"
                >Phone (WhatsApp / Call) <span class="required">*</span></label
              >
              <input
                type="text"
                class="ar-field__input"
                required
                [(ngModel)]="sessionInput.customerContactPhone"
                placeholder="+91 98220 54321"
                name="customerContactPhone"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Preferred Channel</label>
              <select
                class="ar-field__input"
                [(ngModel)]="sessionInput.preferredChannel"
                name="channel"
              >
                @for (opt of channelOptions; track opt.value) {
                  <option [ngValue]="opt.value">{{ opt.label }}</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Equipment Category</label>
              <select
                class="ar-field__input"
                [(ngModel)]="sessionInput.equipmentCategory"
                name="category"
              >
                @for (opt of categoryOptions; track opt.value) {
                  <option [ngValue]="opt.value">{{ opt.label }}</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Machine Model / Line <span class="required">*</span></label>
              <input
                type="text"
                class="ar-field__input"
                required
                [(ngModel)]="sessionInput.equipmentModel"
                placeholder="e.g. Siemens Sinamics G120 (7.5 kW)"
                name="equipmentModel"
              />
            </div>

            <div class="form-group">
              <label class="form-label"
                >Equipment Serial Number <span class="required">*</span></label
              >
              <input
                type="text"
                class="ar-field__input"
                required
                [(ngModel)]="sessionInput.equipmentSerialNumber"
                placeholder="e.g. SN-G120-88412"
                name="serialNumber"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Fault Severity</label>
              <select class="ar-field__input" [(ngModel)]="sessionInput.severity" name="severity">
                @for (opt of severityOptions; track opt.value) {
                  <option [ngValue]="opt.value">{{ opt.label }}</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Fault Code (from Display or HMI)</label>
              <input
                type="text"
                class="ar-field__input"
                [(ngModel)]="faultCode"
                placeholder="e.g. F0002"
                name="faultCode"
              />
            </div>
          </div>

          <div class="form-group full-width mt-3">
            <label class="form-label"
              >Reported Fault Symptoms & Error Description <span class="required">*</span></label
            >
            <textarea
              class="ar-field__input"
              rows="4"
              required
              [(ngModel)]="sessionInput.reportedSymptoms"
              placeholder="e.g. VFD Drive tripped on Over-Current F0001, motor heating up to 85°C after 15 min under continuous load..."
              name="reportedSymptoms"
            ></textarea>
            <span class="ar-field__hint">
              The AI Diagnostic Assistant uses these symptoms to initiate guided troubleshooting
              with the plant engineer.
            </span>
          </div>

          @if (error()) {
            <p class="error-msg" role="alert">{{ error() }}</p>
          }

          <div class="form-actions">
            <button ar-button variant="ghost" type="button" (click)="cancel()">Cancel</button>
            <button
              ar-button
              variant="ai"
              icon="sparkle"
              type="submit"
              [disabled]="
                busy() ||
                !sessionInput.customerName.trim() ||
                !sessionInput.customerContactPhone.trim() ||
                !sessionInput.reportedSymptoms.trim()
              "
            >
              {{ busy() ? 'Initiating session…' : 'Initiate AI Diagnostic Session' }}
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
        max-width: 840px;
      }
      .session-form {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        padding-top: 0.5rem;
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
      .form-group.full-width,
      .full-width {
        grid-column: 1 / -1;
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
      @media (max-width: 640px) {
        .form-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ArNewDiagnosticSessionPage {
  private readonly router = inject(Router);
  private readonly service = inject(RemoteMaintenanceService);
  private readonly toasts = inject(ToastService);

  protected readonly categoryOptions = equipmentCategoryOptions;
  protected readonly severityOptions = maintenanceSeverityOptions;
  protected readonly channelOptions = maintenanceChannelOptions;

  protected readonly contact = signal<PickerOption | null>(null);
  protected readonly faultCode = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly sessionCode = `RMS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  protected sessionInput: InitiateRemoteMaintenanceInput = {
    customerId: 'cust-direct',
    customerName: '',
    customerContactPhone: '',
    equipmentCategory: EquipmentCategory.VfdAndDrive,
    equipmentModel: '',
    equipmentSerialNumber: '',
    severity: MaintenanceSeverity.High,
    reportedSymptoms: '',
    preferredChannel: MaintenanceChannel.WhatsApp,
  };

  pickContact(opt: PickerOption | null): void {
    this.contact.set(opt);
    if (opt) {
      if (!this.sessionInput.customerName) {
        this.sessionInput.customerName = opt.label;
      }
    }
  }

  cancel(): void {
    void this.router.navigateByUrl('/field-service/remote-maintenance');
  }

  async submit(): Promise<void> {
    if (
      !this.sessionInput.customerName.trim() ||
      !this.sessionInput.customerContactPhone.trim() ||
      !this.sessionInput.reportedSymptoms.trim() ||
      this.busy()
    ) {
      return;
    }

    if (this.faultCode()) {
      this.sessionInput.faultCode = this.faultCode();
      this.sessionInput.reportedSymptoms = `[Fault Code: ${this.faultCode()}] ${this.sessionInput.reportedSymptoms}`;
    }

    this.busy.set(true);
    this.error.set(null);

    try {
      await firstValueFrom(this.service.initiateSession(this.sessionInput));
      this.toasts.success(
        `Diagnostic session ${this.sessionCode} initiated via ${
          this.sessionInput.preferredChannel === MaintenanceChannel.WhatsApp ? 'WhatsApp' : 'Voice'
        }.`,
      );
      void this.router.navigateByUrl('/field-service/remote-maintenance');
    } catch (err: unknown) {
      this.error.set(
        (err as { message?: string })?.message || 'Failed to initiate diagnostic session.',
      );
    } finally {
      this.busy.set(false);
    }
  }
}
