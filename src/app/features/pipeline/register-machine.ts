import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { PickerOption, PipelineStore } from '../../core/services/pipeline.service';
import { ToastService } from '../../core/ui/toast.service';
import { CockpitOriginService } from '../../layout/cockpit-origin.service';
import { ArTopbar } from '../../layout/topbar';
import { AR_DIALOG_INLINE, ArButton, ArDialog } from '../../ui';
import { ArContactPicker } from './contact-picker';
import { amcCommercials } from './renewal-logic';

type MachineForm = {
  description: string;
  serialNumber: string;
  make: string;
  model: string;
  siteName: string;
  siteCity: string;
  amcEndsOn: string;
  amcValue: string;
  amcTermMonths: string;
};

const EMPTY: MachineForm = {
  description: '',
  serialNumber: '',
  make: '',
  model: '',
  siteName: '',
  siteCity: '',
  amcEndsOn: '',
  amcValue: '',
  amcTermMonths: '',
};

/**
 * Register a machine (/installed-base/new), the same fields as the Installed base dialog. `?customer=<contact id>&customerName=…`
 * sets the owner contact, as an account's Customer 360 does: the machine then counts on that account. Returns to the Customer 360
 * it was opened from, otherwise to Installed base.
 */
@Component({
  selector: 'ar-register-machine',
  imports: [ArTopbar, ArButton, ArDialog, ArContactPicker],
  providers: [{ provide: AR_DIALOG_INLINE, useValue: true }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar title="Register a machine" [subtitle]="owner()?.label ?? ''" />
    <div class="new-record ar-scroll">
      <ar-dialog title="Register a machine" (dismiss)="back()">
        <div class="ar-field">
          <span class="ar-field__label"
            >Owner contact <span class="ar-field__opt">(optional)</span></span
          >
          <ar-contact-picker [initial]="owner()" (picked)="owner.set($event)" />
        </div>
        <label class="ar-field">
          <span class="ar-field__label">Description</span>
          <input
            required
            maxlength="256"
            class="ar-field__input"
            placeholder="e.g. Line 3 VFD panel"
            [value]="f().description"
            (input)="patch('description', $any($event.target).value)"
          />
        </label>
        <div class="ar-field-row">
          <label class="ar-field">
            <span class="ar-field__label"
              >Serial no. <span class="ar-field__opt">optional</span></span
            >
            <input
              class="ar-field__input"
              [value]="f().serialNumber"
              (input)="patch('serialNumber', $any($event.target).value)"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label"
              >AMC ends <span class="ar-field__opt">optional</span></span
            >
            <input
              class="ar-field__input"
              type="date"
              [value]="f().amcEndsOn"
              (input)="patch('amcEndsOn', $any($event.target).value)"
            />
          </label>
        </div>
        <div class="ar-field-row">
          <label class="ar-field">
            <span class="ar-field__label"
              >AMC value (₹, before GST) <span class="ar-field__opt">(optional)</span></span
            >
            <input
              class="ar-field__input"
              inputmode="decimal"
              placeholder="e.g. 42000"
              [value]="f().amcValue"
              (input)="patch('amcValue', $any($event.target).value)"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label"
              >AMC term (months) <span class="ar-field__opt">(default 12)</span></span
            >
            <input
              class="ar-field__input"
              inputmode="numeric"
              placeholder="12"
              [value]="f().amcTermMonths"
              (input)="patch('amcTermMonths', $any($event.target).value)"
            />
          </label>
        </div>
        <div class="ar-field-row">
          <label class="ar-field">
            <span class="ar-field__label">Make <span class="ar-field__opt">optional</span></span>
            <input
              class="ar-field__input"
              [value]="f().make"
              (input)="patch('make', $any($event.target).value)"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Model <span class="ar-field__opt">optional</span></span>
            <input
              class="ar-field__input"
              [value]="f().model"
              (input)="patch('model', $any($event.target).value)"
            />
          </label>
        </div>
        <div class="ar-field-row">
          <label class="ar-field">
            <span class="ar-field__label"
              >Site name <span class="ar-field__opt">optional</span></span
            >
            <input
              class="ar-field__input"
              [value]="f().siteName"
              (input)="patch('siteName', $any($event.target).value)"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label"
              >Site city <span class="ar-field__opt">optional</span></span
            >
            <input
              class="ar-field__input"
              [value]="f().siteCity"
              (input)="patch('siteCity', $any($event.target).value)"
            />
          </label>
        </div>
        @if (error(); as e) {
          <p class="err" role="alert">{{ e }}</p>
        }
        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="back()">Cancel</button>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="saving()"
            (click)="register()"
          >
            {{ saving() ? 'Saving…' : 'Register' }}
          </button>
        </div>
      </ar-dialog>
    </div>
  `,
  styles: `
    .new-record {
      padding: 1.25rem 1.5rem 2rem;
    }
    .err {
      margin: 0;
      color: var(--ar-red-600, #b91c1c);
    }
  `,
})
export class ArRegisterMachine {
  private readonly store = inject(PipelineStore);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);
  private readonly origin = inject(CockpitOriginService);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;

  protected readonly owner = signal<PickerOption | null>(
    this.query.get('customer')
      ? { id: this.query.get('customer')!, label: this.query.get('customerName') || 'Customer' }
      : null,
  );
  protected readonly f = signal<MachineForm>({ ...EMPTY });
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected patch(key: keyof MachineForm, value: string): void {
    this.f.update((v) => ({ ...v, [key]: value }));
  }

  protected back(): void {
    void this.router.navigateByUrl(this.origin.returnUrl('/installed-base'));
  }

  protected async register(): Promise<void> {
    const v = this.f();
    if (!v.description.trim()) {
      this.error.set('Describe the machine — e.g. “Line 3 VFD panel”.');
      return;
    }
    const amc = amcCommercials(v.amcValue, v.amcTermMonths);
    if (typeof amc === 'string') {
      this.error.set(amc);
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.store.createAsset({
        contactId: this.owner()?.id,
        description: v.description.trim(),
        serialNumber: v.serialNumber.trim() || undefined,
        make: v.make.trim() || undefined,
        model: v.model.trim() || undefined,
        siteName: v.siteName.trim() || undefined,
        siteCity: v.siteCity.trim() || undefined,
        amcEndsOn: v.amcEndsOn || undefined,
        amcValueInPaise: amc.valueInPaise,
        amcTermMonths: amc.termMonths,
      });
      this.toasts.success(`“${v.description.trim()}” registered.`);
      this.back();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'The machine could not be saved.');
    } finally {
      this.saving.set(false);
    }
  }
}
