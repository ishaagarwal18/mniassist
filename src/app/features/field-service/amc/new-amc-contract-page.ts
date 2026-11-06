import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { PickerOption } from '../../../core/services/pipeline.service';
import { ToastService } from '../../../core/ui/toast.service';
import { ArTopbar } from '../../../layout/topbar';
import {
  AmcContractService,
  AmcContractType,
  CreateAmcContractDto,
} from '../../../proxy/field-service';
import { ArButton, ArCard } from '../../../ui';
import { ArSalesCustomer, SalesCustomerChoice } from '../../sales/sales-customer';
import { EMPTY_PARTY, ShipToOption, defaultShipIndex, shipToText } from '../../sales/sales-party';

/** A local date (yyyy-mm-dd) some days or years later. */
function addToDate(iso: string, days: number, years = 0): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setFullYear(d.getFullYear() + years);
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const localToday = () => addToDate(new Date().toLocaleDateString('en-CA'), 0);

/**
 * A new AMC (annual maintenance contract), at /field-service/amc/new. The customer is an account and its contact person, or a
 * contact with no account, chosen from the CRM; the contract is held against that contact (as every AMC is), named after the
 * account when there is one, with the site filled from the account's shipping addresses. `?customer=<contact id>&
 * customerName=…` starts with that customer, as Customer 360 does.
 */
@Component({
  selector: 'ar-new-amc-contract-page',
  imports: [FormsModule, ArTopbar, ArButton, ArCard, ArSalesCustomer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="New AMC contract"
      subtitle="An annual maintenance contract with planned visits and a guaranteed response time"
    >
      <button ar-button type="button" variant="ghost" (click)="cancel()">
        Back to AMC contracts
      </button>
    </ar-topbar>

    <div class="na ar-scroll">
      <form class="na__form" (submit)="$event.preventDefault(); submit()">
        <ar-card heading="Customer">
          <ar-sales-customer [initialCustomer]="initialCustomer" (changed)="onCustomer($event)" />
          <div class="na__grid">
            <label class="ar-field na__wide">
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
                placeholder="Plant, shop floor, city"
                [(ngModel)]="site"
                (ngModelChange)="siteIndex.set(-1)"
              ></textarea>
            </label>
          </div>
        </ar-card>

        <ar-card heading="Equipment covered">
          <div class="na__grid">
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
          </div>
        </ar-card>

        <ar-card heading="Contract terms">
          <div class="na__grid na__grid--3">
            <label class="ar-field">
              <span class="ar-field__label">Contract type</span>
              <select class="ar-field__input" name="type" [(ngModel)]="contractType">
                <option [ngValue]="AmcContractType.Comprehensive">
                  Comprehensive (with spares)
                </option>
                <option [ngValue]="AmcContractType.NonComprehensive">
                  Non-comprehensive (labour only)
                </option>
                <option [ngValue]="AmcContractType.PreventiveOnly">
                  Preventive maintenance only
                </option>
                <option [ngValue]="AmcContractType.OnDemand">On demand</option>
              </select>
            </label>
            <label class="ar-field">
              <span class="ar-field__label"
                >Annual value (₹) <span class="ar-field__req">*</span></span
              >
              <input
                type="number"
                min="0"
                class="ar-field__input"
                name="value"
                [(ngModel)]="valueRupees"
              />
            </label>
            <label class="ar-field">
              <span class="ar-field__label">Response time (hours)</span>
              <input
                type="number"
                min="1"
                class="ar-field__input"
                name="sla"
                [(ngModel)]="slaHours"
              />
            </label>
            <label class="ar-field">
              <span class="ar-field__label">Start date <span class="ar-field__req">*</span></span>
              <input
                type="date"
                class="ar-field__input"
                name="start"
                [ngModel]="startDate"
                (ngModelChange)="setStart($event)"
              />
            </label>
            <label class="ar-field">
              <span class="ar-field__label">End date <span class="ar-field__req">*</span></span>
              <input
                type="date"
                class="ar-field__input"
                name="end"
                [min]="startDate"
                [(ngModel)]="endDate"
              />
            </label>
            <label class="ar-field">
              <span class="ar-field__label">Planned visits a year</span>
              <input
                type="number"
                min="1"
                max="24"
                class="ar-field__input"
                name="visits"
                [(ngModel)]="visitsPerYear"
              />
            </label>
          </div>
          <label class="na__check">
            <input type="checkbox" name="spares" [(ngModel)]="sparesIncluded" />
            <span>Spares and wear parts are included in the contract</span>
          </label>
          <label class="ar-field na__notes">
            <span class="ar-field__label"
              >Scope and special terms <span class="ar-field__opt">optional</span></span
            >
            <textarea
              class="ar-field__input"
              rows="3"
              name="remarks"
              placeholder="e.g. 24x7 line; 4-hour on-site response; oil and seal replacement included."
              [(ngModel)]="remarks"
            ></textarea>
          </label>
          <label class="ar-field na__number">
            <span class="ar-field__label"
              >Contract number <span class="ar-field__opt">optional</span></span
            >
            <input
              class="ar-field__input ar-mono"
              name="number"
              placeholder="Assigned automatically"
              [(ngModel)]="contractNumber"
            />
          </label>
        </ar-card>

        @if (error(); as e) {
          <p class="na__error" role="alert">{{ e }}</p>
        }

        <div class="na__actions">
          <button ar-button type="button" variant="ghost" (click)="cancel()">Cancel</button>
          <button ar-button type="submit" variant="primary" [disabled]="busy()">
            {{ busy() ? 'Creating…' : 'Create contract' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: `
    .na {
      flex: 1;
      min-height: 0;
      padding: 18px 24px 32px;
    }
    .na__form {
      max-width: 880px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .na__form ar-card {
      display: block;
    }
    .na__grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px 14px;
      align-items: start;
    }
    ar-sales-customer + .na__grid {
      margin-top: 12px;
    }
    .na__grid--3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .na__grid .ar-field,
    .na__notes,
    .na__number {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .na__wide {
      grid-column: 1 / -1;
    }
    .na__check {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 14px;
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-800);
      cursor: pointer;
    }
    .na__notes {
      margin-top: 14px;
    }
    .na__number {
      margin-top: 12px;
      max-width: 280px;
    }
    .na__error {
      margin: 0;
      padding: 0.75rem 1rem;
      border: 1px solid var(--ar-red-200);
      border-radius: var(--ar-radius-control);
      background: var(--ar-red-100);
      color: var(--ar-bad-600);
      font: 500 13px var(--ar-font-sans);
    }
    .na__actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    @media (max-width: 760px) {
      .na__grid--3 {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 560px) {
      .na {
        padding: 14px 16px 24px;
      }
      .na__grid,
      .na__grid--3 {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class ArNewAmcContractPage {
  private readonly router = inject(Router);
  private readonly amcService = inject(AmcContractService);
  private readonly toasts = inject(ToastService);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;

  protected readonly AmcContractType = AmcContractType;

  /** From Customer 360 or a customer's list: ?customer=<contact id>&customerName=… */
  protected readonly initialCustomer: PickerOption | null = this.query.get('customer')
    ? { id: this.query.get('customer')!, label: this.query.get('customerName') || 'Customer' }
    : null;

  protected readonly choice = signal<SalesCustomerChoice | null>(null);
  protected readonly shipTo = signal<ShipToOption[]>([]);
  protected readonly siteIndex = signal(-1);
  protected site = '';
  protected equipmentModel = '';
  protected equipmentSerial = '';
  protected contractType = AmcContractType.Comprehensive;
  protected valueRupees = 250_000;
  protected slaHours = 4;
  protected startDate = localToday();
  /** A year's contract: the day before the same date next year. */
  protected endDate = addToDate(localToday(), -1, 1);
  protected visitsPerYear = 4;
  protected sparesIncluded = true;
  protected remarks = '';
  protected contractNumber = '';

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  private lastAccount: string | null | undefined = undefined;

  /** A new customer; a new account (or none) refills the site from its shipping addresses. */
  protected onCustomer(choice: SalesCustomerChoice): void {
    this.choice.set(choice);
    this.error.set(null);
    if (choice.party.accountId !== this.lastAccount) {
      this.lastAccount = choice.party.accountId;
      this.shipTo.set(choice.party.shipTo);
      this.chooseSite(defaultShipIndex(choice.party));
    }
  }

  protected chooseSite(index: number): void {
    this.siteIndex.set(index);
    this.site = shipToText(this.choice()?.party ?? EMPTY_PARTY, index);
  }

  /** Moving the start keeps a one-year term when the end was still the default. */
  protected setStart(value: string): void {
    if (!value) return;
    const wasDefault = this.endDate === addToDate(this.startDate, -1, 1);
    this.startDate = value;
    if (wasDefault || this.endDate < value) this.endDate = addToDate(value, -1, 1);
  }

  cancel(): void {
    void this.router.navigateByUrl('/field-service/amc');
  }

  submit(): void {
    if (this.busy()) return;
    const choice = this.choice();
    const contact = choice?.customer;
    if (!contact) {
      this.error.set(
        choice?.mode === 'contact'
          ? 'Pick the contact this contract is for.'
          : 'Choose the account and the contact person this contract is for.',
      );
      return;
    }
    const missing = [
      !this.site.trim() && 'the site address',
      !this.equipmentModel.trim() && 'the equipment model',
      !this.equipmentSerial.trim() && 'the serial number',
      !(this.valueRupees >= 0) && 'the annual value',
      !this.startDate && 'the start date',
      !this.endDate && 'the end date',
    ].filter(Boolean);
    if (missing.length) {
      this.error.set(`Fill in ${missing.join(', ')}.`);
      return;
    }
    if (this.endDate <= this.startDate) {
      this.error.set('The end date must be after the start date.');
      return;
    }

    const input: CreateAmcContractDto = {
      contractNumber: this.contractNumber.trim() || undefined,
      customerId: contact.id,
      customerName: choice.party.accountName || contact.label,
      customerSiteAddress: this.site.trim(),
      equipmentSerialNumber: this.equipmentSerial.trim(),
      equipmentModel: this.equipmentModel.trim(),
      contractType: this.contractType,
      startDateUtc: new Date(`${this.startDate}T00:00:00`).toISOString(),
      endDateUtc: new Date(`${this.endDate}T00:00:00`).toISOString(),
      slaResponseHours: this.slaHours || 8,
      contractValueInPaise: Math.round((this.valueRupees || 0) * 100),
      scheduledVisitsPerYear: this.visitsPerYear || 4,
      sparesIncluded: this.sparesIncluded,
      remarks: this.remarks.trim() || undefined,
    };

    this.busy.set(true);
    this.error.set(null);
    if (environment.useMockData) {
      this.busy.set(false);
      this.toasts.success('AMC contract created.');
      void this.router.navigateByUrl('/field-service/amc');
      return;
    }
    this.amcService.create(input).subscribe({
      next: (c) => {
        this.busy.set(false);
        this.toasts.success(`AMC contract ${c.contractNumber} created.`);
        void this.router.navigateByUrl('/field-service/amc');
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.error?.message ?? 'The contract could not be created.');
      },
    });
  }
}
