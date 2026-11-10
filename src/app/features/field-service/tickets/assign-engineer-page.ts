import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastService } from '../../../core/ui/toast.service';
import { ArTopbar } from '../../../layout/topbar';
import {
  AssignFieldServiceTicketDto,
  FieldServiceTicketDto,
  FieldServiceTicketService,
} from '../../../proxy/field-service';
import { ArButton, ArCard } from '../../../ui';

/**
 * Assign / dispatch a field engineer for a service ticket.
 * Route: /field-service/tickets/:id/assign
 */
@Component({
  selector: 'ar-assign-engineer-page',
  standalone: true,
  imports: [FormsModule, ArTopbar, ArButton, ArCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Dispatch & Assign Field Engineer"
      subtitle="Assign an on-site engineer and schedule the visit date for the selected ticket"
    >
      <button ar-button type="button" variant="ghost" (click)="cancel()">Back to tickets</button>
    </ar-topbar>

    <div class="ae ar-scroll">
      <form class="ae__form" (submit)="$event.preventDefault(); submit()">
        @if (ticket(); as t) {
          <div class="ae__context-banner">
            <span class="ae__ticket-no">{{ t.ticketNumber }}</span>
            <span class="ae__separator">·</span>
            <span>{{ t.customerName }}</span>
            <span class="ae__separator">·</span>
            <span class="ae__equipment"
              >{{ t.equipmentModel }} ({{ t.equipmentSerialNumber }})</span
            >
          </div>
        }

        <ar-card heading="Engineer assignment">
          <div class="ae__grid">
            <label class="ar-field ae__wide">
              <span class="ar-field__label">
                Field engineer name <span class="ar-field__req">*</span>
              </span>
              <input
                class="ar-field__input"
                name="engineer"
                placeholder="e.g. Sunil Deshmukh (Sr. Service Specialist)"
                [(ngModel)]="engineerName"
                required
              />
              <span class="ar-field__hint"
                >Full name and designation of the dispatched engineer.</span
              >
            </label>

            <label class="ar-field">
              <span class="ar-field__label">
                Scheduled on-site visit date &amp; time <span class="ar-field__req">*</span>
              </span>
              <input
                type="datetime-local"
                class="ar-field__input"
                name="visitDate"
                [(ngModel)]="scheduledVisitDate"
                required
              />
              <span class="ar-field__hint"
                >When the engineer is scheduled to arrive at the plant.</span
              >
            </label>
          </div>
        </ar-card>

        @if (error(); as e) {
          <p class="ae__error" role="alert">{{ e }}</p>
        }

        <div class="ae__actions">
          <button ar-button type="button" variant="ghost" (click)="cancel()">Cancel</button>
          <button ar-button type="submit" variant="primary" [disabled]="busy()">
            {{ busy() ? 'Dispatching…' : 'Dispatch Engineer' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: `
    .ae {
      flex: 1;
      min-height: 0;
      padding: 18px 24px 32px;
    }
    .ae__form {
      max-width: 760px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .ae__form ar-card {
      display: block;
    }
    .ae__context-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      padding: 10px 14px;
      background: var(--ar-blue-50, #eff6ff);
      border: 1px solid var(--ar-blue-200, #bfdbfe);
      border-radius: var(--ar-radius-control, 6px);
      font-size: 0.85rem;
      color: var(--ar-blue-800, #1e40af);
    }
    .ae__ticket-no {
      font-weight: 700;
      font-family: var(--ar-font-mono, monospace);
    }
    .ae__separator {
      color: var(--ar-blue-300, #93c5fd);
    }
    .ae__equipment {
      color: var(--ar-blue-600, #2563eb);
    }
    .ae__grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px 14px;
      align-items: start;
      margin-top: 12px;
    }
    .ae__grid .ar-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .ae__wide {
      grid-column: 1 / -1;
    }
    .ae__error {
      margin: 0;
      padding: 0.75rem 1rem;
      border: 1px solid var(--ar-red-200);
      border-radius: var(--ar-radius-control);
      background: var(--ar-red-100);
      color: var(--ar-bad-600);
      font: 500 13px var(--ar-font-sans);
    }
    .ae__actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    @media (max-width: 640px) {
      .ae {
        padding: 14px 16px 24px;
      }
      .ae__grid {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class ArAssignEngineerPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly ticketService = inject(FieldServiceTicketService);
  private readonly toasts = inject(ToastService);

  private readonly ticketId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly ticket = signal<FieldServiceTicketDto | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Default to now + 4 h in datetime-local format */
  protected engineerName = '';
  protected scheduledVisitDate = new Date(Date.now() + 4 * 3600_000).toISOString().substring(0, 16);

  constructor() {
    if (this.ticketId) {
      this.ticketService.get(this.ticketId).subscribe({
        next: (t) => {
          this.ticket.set(t);
          if (t.assignedFieldEngineer) {
            this.engineerName = t.assignedFieldEngineer;
          }
        },
        error: () => {
          /* non-critical – page still works without context banner */
        },
      });
    }
  }

  cancel(): void {
    void this.router.navigateByUrl('/field-service/tickets');
  }

  submit(): void {
    if (this.busy()) return;

    if (!this.engineerName.trim()) {
      this.error.set('Enter the field engineer name.');
      return;
    }
    if (!this.scheduledVisitDate) {
      this.error.set('Pick the scheduled visit date and time.');
      return;
    }

    const dto: AssignFieldServiceTicketDto = {
      assignedFieldEngineer: this.engineerName.trim(),
      scheduledVisitDateUtc: new Date(this.scheduledVisitDate).toISOString(),
    };

    this.busy.set(true);
    this.error.set(null);
    this.ticketService.assign(this.ticketId, dto).subscribe({
      next: (t) => {
        this.busy.set(false);
        this.toasts.success(
          `Engineer ${dto.assignedFieldEngineer} dispatched for ${t.ticketNumber}.`,
        );
        void this.router.navigateByUrl('/field-service/tickets');
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.error?.message ?? 'Could not assign the engineer.');
      },
    });
  }
}
