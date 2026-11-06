import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PickerOption } from '../../core/services/pipeline.service';
import { ToastService } from '../../core/ui/toast.service';
import { ArTopbar } from '../../layout/topbar';
import { ArContactPicker } from '../pipeline/contact-picker';
import {
  ServiceTicketService,
  TicketPriority,
} from '../../proxy/support';
import { ArButton, ArCard } from '../../ui';
import { errorMessage } from '../activities/activity-logic';

@Component({
  selector: 'ar-new-ticket-page',
  imports: [FormsModule, ArTopbar, ArButton, ArCard, ArContactPicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="New Support Ticket"
      subtitle="Log customer incident, plant technical issue or automation service request"
    >
      <button ar-button type="button" variant="ghost" (click)="cancel()">
        Back to Helpdesk
      </button>
    </ar-topbar>

    <div class="page-container ar-scroll">
      <ar-card heading="Ticket Details & Priority">
        <form class="ticket-form" (submit)="$event.preventDefault(); create()">
          <div class="ar-field">
            <span class="ar-field__label">Customer Contact <span class="required">*</span></span>
            <ar-contact-picker (picked)="contact.set($event)" />
            <span class="ar-field__hint">The person and organization reporting the incident.</span>
          </div>

          <label class="ar-field">
            <span class="ar-field__label">Subject <span class="required">*</span></span>
            <input
              class="ar-field__input"
              required
              maxlength="256"
              placeholder="e.g. Line 2 PLC Profinet bus fault / intermittent sensor trip"
              [(ngModel)]="subject"
              name="subject"
            />
          </label>

          <label class="ar-field">
            <span class="ar-field__label">Priority <span class="required">*</span></span>
            <select class="ar-field__input" [(ngModel)]="priority" name="priority">
              <option [value]="TicketPriority.Urgent">Urgent (Immediate SLA)</option>
              <option [value]="TicketPriority.High">High</option>
              <option [value]="TicketPriority.Normal">Normal</option>
              <option [value]="TicketPriority.Low">Low</option>
            </select>
            <span class="ar-field__hint">Priority determines the promised SLA response countdown.</span>
          </label>

          <label class="ar-field">
            <span class="ar-field__label">Detailed Description / Error Logs</span>
            <textarea
              class="ar-field__input"
              rows="5"
              placeholder="Provide symptoms, error codes, machinery line number, plant bay, and steps already tried..."
              [(ngModel)]="description"
              name="description"
            ></textarea>
          </label>

          @if (error()) {
            <p class="error-msg" role="alert">{{ error() }}</p>
          }

          <div class="form-actions">
            <button ar-button type="button" variant="ghost" (click)="cancel()">
              Cancel
            </button>
            <button
              ar-button
              type="submit"
              variant="primary"
              [disabled]="busy() || !subject().trim() || !contact()"
            >
              {{ busy() ? 'Creating ticket…' : 'Create Support Ticket' }}
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
      .ticket-form {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        padding-top: 0.5rem;
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
export class ArNewTicketPage {
  private readonly router = inject(Router);
  private readonly api = inject(ServiceTicketService);
  private readonly toasts = inject(ToastService);

  protected readonly TicketPriority = TicketPriority;

  protected readonly contact = signal<PickerOption | null>(null);
  protected readonly subject = signal('');
  protected readonly priority = signal<TicketPriority>(TicketPriority.Normal);
  protected readonly description = signal('');

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  cancel(): void {
    void this.router.navigateByUrl('/helpdesk');
  }

  async create(): Promise<void> {
    const c = this.contact();
    if (!c) {
      this.error.set('Please select a contact for this ticket.');
      return;
    }
    const subj = this.subject().trim();
    if (!subj) {
      this.error.set('Subject is required.');
      return;
    }

    this.busy.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(
        this.api.create({
          contactId: c.id,
          subject: subj,
          description: this.description().trim() || undefined,
          priority: this.priority(),
        }),
      );
      this.toasts.success(`Ticket "${subj}" raised.`);
      void this.router.navigateByUrl('/helpdesk');
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'Could not create ticket.'));
    } finally {
      this.busy.set(false);
    }
  }
}
