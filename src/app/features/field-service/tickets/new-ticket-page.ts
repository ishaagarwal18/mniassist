import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PickerOption } from '../../../core/services/pipeline.service';
import { ToastService } from '../../../core/ui/toast.service';
import { ArTopbar } from '../../../layout/topbar';
import { ContactService } from '../../../proxy/contacts/contact.service';
import {
  CreateFieldServiceTicketDto,
  FieldServiceTicketService,
  ServiceTicketPriority,
  ServiceTicketType,
} from '../../../proxy/field-service';
import { ArButton, ArCard } from '../../../ui';
import { ArSalesCustomer, SalesCustomerChoice } from '../../sales/sales-customer';
import { EMPTY_PARTY, defaultShipIndex, shipToText } from '../../sales/sales-party';

/**
 * Raise a field service ticket (/field-service/tickets/new). The customer is an account and its contact person, or a contact
 * with no account, chosen from the CRM; the ticket is filed against that contact (as every other ticket is), named after the
 * account when there is one, with the site and phone filled from the account and the contact. `?customer=<contact id>&
 * customerName=…` starts with that customer, as Customer 360 does.
 */
@Component({
  selector: 'ar-new-field-ticket-page',
  imports: [FormsModule, ArTopbar, ArButton, ArCard, ArSalesCustomer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="New field service ticket"
      subtitle="Send an engineer for a breakdown, maintenance visit, installation or calibration"
    >
      <button ar-button type="button" variant="ghost" (click)="cancel()">Back to tickets</button>
    </ar-topbar>

    <div class="nt ar-scroll">
      <form class="nt__form" (submit)="$event.preventDefault(); submit()">
        <ar-card heading="Customer">
          <ar-sales-customer [initialCustomer]="initialCustomer" (changed)="onCustomer($event)" />
          <div class="nt__grid">
            <label class="ar-field nt__wide">
              <span class="ar-field__label">Site address <span class="ar-field__req">*</span></span>
              @if (shipTo().length) {
                <select
                  class="ar-field__input"
                  aria-label="Site"
                  (change)="chooseSite(+$any($event.target).value)"
                >
                  @for (s of shipTo(); track $index; let i = $index) {
                    <option [value]="i" [selected]="i === siteIndex()">
                      {{ s.label }}{{ s.isDefault ? ' (default)' : '' }}
                    </option>
                  }
                  <option [value]="-1" [selected]="siteIndex() === -1">
                    Billing address / other…
                  </option>
                </select>
              }
              <textarea
                class="ar-field__input"
                rows="2"
                name="site"
                placeholder="Plant, bay, street, city"
                [(ngModel)]="site"
                (ngModelChange)="siteIndex.set(-1)"
              ></textarea>
            </label>
            <label class="ar-field">
              <span class="ar-field__label">Contact phone</span>
              <input
                type="tel"
                class="ar-field__input ar-mono"
                name="phone"
                placeholder="+91 …"
                [(ngModel)]="phone"
              />
              <span class="ar-field__hint">Filled from the contact's WhatsApp number.</span>
            </label>
          </div>
        </ar-card>

        <ar-card heading="Equipment and fault">
          <div class="nt__grid">
            <label class="ar-field">
              <span class="ar-field__label"
                >Equipment model <span class="ar-field__req">*</span></span
              >
              <input
                class="ar-field__input"
                name="model"
                placeholder="e.g. Hydraulic stamping press 400T"
                [(ngModel)]="equipmentModel"
              />
            </label>
            <label class="ar-field">
              <span class="ar-field__label"
                >Serial number <span class="ar-field__req">*</span></span
              >
              <input
                class="ar-field__input ar-mono"
                name="serial"
                placeholder="e.g. PR-400T-2024-09"
                [(ngModel)]="equipmentSerial"
              />
            </label>
            <label class="ar-field">
              <span class="ar-field__label">Type</span>
              <select class="ar-field__input" name="type" [(ngModel)]="ticketType">
                <option [ngValue]="ServiceTicketType.Breakdown">Breakdown</option>
                <option [ngValue]="ServiceTicketType.PreventiveMaintenance">
                  Preventive maintenance
                </option>
                <option [ngValue]="ServiceTicketType.InstallationCommissioning">
                  Installation and commissioning
                </option>
                <option [ngValue]="ServiceTicketType.Calibration">Calibration</option>
              </select>
            </label>
            <label class="ar-field">
              <span class="ar-field__label">Priority</span>
              <select class="ar-field__input" name="priority" [(ngModel)]="priority">
                <option [ngValue]="ServiceTicketPriority.CriticalEmergency">
                  Critical: production stopped
                </option>
                <option [ngValue]="ServiceTicketPriority.High">High</option>
                <option [ngValue]="ServiceTicketPriority.Medium">Medium</option>
                <option [ngValue]="ServiceTicketPriority.Low">Low</option>
              </select>
            </label>
            <label class="ar-field nt__wide">
              <span class="ar-field__label"
                >What is wrong <span class="ar-field__req">*</span></span
              >
              <textarea
                class="ar-field__input"
                rows="4"
                name="issue"
                placeholder="Error codes, alarms, pressure drops, abnormal vibration…"
                [(ngModel)]="issue"
              ></textarea>
            </label>
            <label class="ar-field">
              <span class="ar-field__label"
                >Ticket number <span class="ar-field__opt">optional</span></span
              >
              <input
                class="ar-field__input ar-mono"
                name="number"
                placeholder="Assigned automatically"
                [(ngModel)]="ticketNumber"
              />
            </label>
          </div>
        </ar-card>

        @if (error(); as e) {
          <p class="nt__error" role="alert">{{ e }}</p>
        }

        <div class="nt__actions">
          <button ar-button type="button" variant="ghost" (click)="cancel()">Cancel</button>
          <button ar-button type="submit" variant="primary" [disabled]="busy()">
            {{ busy() ? 'Raising…' : 'Raise ticket' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: `
    .nt {
      flex: 1;
      min-height: 0;
      padding: 18px 24px 32px;
    }
    .nt__form {
      max-width: 880px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .nt__form ar-card {
      display: block;
    }
    .nt__grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px 14px;
      align-items: start;
      margin-top: 12px;
    }
    .nt__grid .ar-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .nt__wide {
      grid-column: 1 / -1;
    }
    .nt__error {
      margin: 0;
      padding: 0.75rem 1rem;
      border: 1px solid var(--ar-red-200);
      border-radius: var(--ar-radius-control);
      background: var(--ar-red-100);
      color: var(--ar-bad-600);
      font: 500 13px var(--ar-font-sans);
    }
    .nt__actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    @media (max-width: 640px) {
      .nt {
        padding: 14px 16px 24px;
      }
      .nt__grid {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class ArNewFieldTicketPage {
  private readonly router = inject(Router);
  private readonly ticketService = inject(FieldServiceTicketService);
  private readonly contacts = inject(ContactService);
  private readonly toasts = inject(ToastService);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;

  protected readonly ServiceTicketType = ServiceTicketType;
  protected readonly ServiceTicketPriority = ServiceTicketPriority;

  /** From Customer 360 or a customer's list: ?customer=<contact id>&customerName=… */
  protected readonly initialCustomer: PickerOption | null = this.query.get('customer')
    ? { id: this.query.get('customer')!, label: this.query.get('customerName') || 'Customer' }
    : null;

  protected readonly choice = signal<SalesCustomerChoice | null>(null);
  protected readonly shipTo = signal<SalesCustomerChoice['party']['shipTo']>([]);
  protected readonly siteIndex = signal(-1);
  protected site = '';
  protected phone = '';
  protected equipmentModel = '';
  protected equipmentSerial = '';
  protected ticketType = ServiceTicketType.Breakdown;
  protected priority = ServiceTicketPriority.High;
  protected issue = '';
  protected ticketNumber = '';

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  private lastPartyAccount: string | null | undefined = undefined;
  private lastContactId: string | null = null;

  /** A new customer: a new account refills the site; a new person refills the phone. */
  protected onCustomer(choice: SalesCustomerChoice): void {
    this.choice.set(choice);
    this.error.set(null);
    const party = choice.party;
    if (party.accountId !== this.lastPartyAccount) {
      this.lastPartyAccount = party.accountId;
      this.shipTo.set(party.shipTo);
      this.chooseSite(defaultShipIndex(party));
    }
    const contactId = choice.customer?.id ?? null;
    if (contactId !== this.lastContactId) {
      this.lastContactId = contactId;
      void this.fillPhone(contactId);
    }
  }

  protected chooseSite(index: number): void {
    this.siteIndex.set(index);
    this.site = shipToText(this.choice()?.party ?? EMPTY_PARTY, index);
  }

  private async fillPhone(contactId: string | null): Promise<void> {
    if (!contactId || environment.useMockData) return;
    try {
      const c = await firstValueFrom(this.contacts.get(contactId, { skipHandleError: true }));
      if (this.lastContactId === contactId && c.waId) {
        this.phone = c.waId.startsWith('+') ? c.waId : `+${c.waId}`;
      }
    } catch {
      // Typed by hand.
    }
  }

  cancel(): void {
    void this.router.navigateByUrl('/field-service/tickets');
  }

  submit(): void {
    if (this.busy()) return;
    const choice = this.choice();
    const contact = choice?.customer;
    if (!contact) {
      this.error.set(
        choice?.mode === 'contact'
          ? 'Pick the contact this ticket is for.'
          : 'Choose the account and the contact person this ticket is for.',
      );
      return;
    }
    const missing = [
      !this.site.trim() && 'the site address',
      !this.equipmentModel.trim() && 'the equipment model',
      !this.equipmentSerial.trim() && 'the serial number',
      !this.issue.trim() && 'what is wrong',
    ].filter(Boolean);
    if (missing.length) {
      this.error.set(`Fill in ${missing.join(', ')}.`);
      return;
    }

    const input: CreateFieldServiceTicketDto = {
      ticketNumber: this.ticketNumber.trim() || undefined,
      customerId: contact.id,
      customerName: choice.party.accountName || contact.label,
      customerSiteAddress: this.site.trim(),
      customerContactPhone: this.phone.trim() || undefined,
      equipmentSerialNumber: this.equipmentSerial.trim(),
      equipmentModel: this.equipmentModel.trim(),
      ticketType: this.ticketType,
      priority: this.priority,
      issueDescription: this.issue.trim(),
    };

    this.busy.set(true);
    this.error.set(null);
    if (environment.useMockData) {
      this.busy.set(false);
      this.toasts.success('Ticket raised.');
      void this.router.navigateByUrl('/field-service/tickets');
      return;
    }
    this.ticketService.create(input).subscribe({
      next: (t) => {
        this.busy.set(false);
        this.toasts.success(`Ticket ${t.ticketNumber} raised.`);
        void this.router.navigateByUrl('/field-service/tickets');
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.error?.message ?? 'The ticket could not be raised.');
      },
    });
  }
}
