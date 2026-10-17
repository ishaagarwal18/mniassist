import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { PermissionService } from '@abp/ng.core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { grantedPolicy } from '../../core/auth/permission';
import { readApiError } from '../../core/util/api-error';
import { ToastService } from '../../core/ui/toast.service';
import { ArTopbar } from '../../layout/topbar';
import { WorkspaceProfileService } from '../../proxy/business/workspace-profile.service';
import type { UpdateWorkspaceProfileInput } from '../../proxy/business/models';
import { ArBanner, ArButton } from '../../ui';

/** GST state codes, as the first two digits of a GSTIN carry them. */
const GST_STATES: readonly { code: string; name: string }[] = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
];

const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

type Field = keyof UpdateWorkspaceProfileInput;

const EMPTY: UpdateWorkspaceProfileInput = {
  legalName: '',
  tradeName: '',
  gstin: '',
  pan: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
  phone: '',
  email: '',
};

/**
 * The workspace's business profile: the legal name, GSTIN and registered address its
 * quotations and invoices are issued under. Completing it ticks Get started's
 * "Complete your business profile".
 */
@Component({
  selector: 'ar-business-profile',
  imports: [ArTopbar, ArButton, ArBanner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Business profile"
      subtitle="Who your quotations and invoices are from"
      help="Your legal name, GSTIN and registered address. They are printed at the top of every quotation and invoice you send, and the GSTIN's state decides whether a sale is charged CGST + SGST or IGST."
    >
      @if (canEdit()) {
        <button ar-button variant="primary" [disabled]="busy() || loading()" (click)="save()">
          {{ busy() ? 'Saving…' : 'Save' }}
        </button>
      }
    </ar-topbar>

    <form class="bp ar-scroll" (submit)="$event.preventDefault(); save()">
      @if (error(); as e) {
        <ar-banner tone="bad">{{ e }}</ar-banner>
      }
      @if (!canEdit()) {
        <ar-banner tone="teal"
          >Only someone who manages the workspace can change these details.</ar-banner
        >
      }

      <section class="block">
        <h2 class="block__t">Business</h2>
        <div class="grid">
          <label class="fld fld--wide">
            <span class="fld__k">Legal name <em class="req">required</em></span>
            <input
              class="ar-field__input"
              maxlength="200"
              autocomplete="organization"
              placeholder="As on your GST registration, e.g. Kalyani Forge Ltd"
              [readOnly]="!canEdit()"
              [attr.aria-invalid]="!!problem('legalName')"
              [value]="f().legalName"
              (input)="set('legalName', $any($event.target).value)"
              (blur)="touch('legalName')"
            />
            @if (problem('legalName'); as e) {
              <span class="fld__bad">{{ e }}</span>
            }
          </label>
          <label class="fld fld--wide">
            <span class="fld__k">Trade name <em class="opt">optional</em></span>
            <input
              class="ar-field__input"
              maxlength="200"
              placeholder="The name customers know you by, if different"
              [readOnly]="!canEdit()"
              [value]="f().tradeName"
              (input)="set('tradeName', $any($event.target).value)"
            />
          </label>
          <label class="fld">
            <span class="fld__k">GSTIN <em class="opt">optional</em></span>
            <input
              class="ar-field__input ar-mono"
              maxlength="15"
              autocapitalize="characters"
              placeholder="27AABCK1928F1Z8"
              [readOnly]="!canEdit()"
              [attr.aria-invalid]="!!problem('gstin')"
              [value]="f().gstin"
              (input)="setGstin($any($event.target).value)"
              (blur)="touch('gstin')"
            />
            @if (problem('gstin'); as e) {
              <span class="fld__bad">{{ e }}</span>
            } @else if (gstState(); as s) {
              <span class="fld__hint">Registered in {{ s.name }} (state code {{ s.code }})</span>
            } @else {
              <span class="fld__hint">Leave blank if you are not registered for GST.</span>
            }
          </label>
          <label class="fld">
            <span class="fld__k">PAN <em class="opt">optional</em></span>
            <input
              class="ar-field__input ar-mono"
              maxlength="10"
              autocapitalize="characters"
              placeholder="AABCK1928F"
              [readOnly]="!canEdit()"
              [attr.aria-invalid]="!!problem('pan')"
              [value]="f().pan"
              (input)="set('pan', $any($event.target).value.toUpperCase())"
              (blur)="touch('pan')"
            />
            @if (problem('pan'); as e) {
              <span class="fld__bad">{{ e }}</span>
            } @else {
              <span class="fld__hint">Filled in from the GSTIN when you enter one.</span>
            }
          </label>
        </div>
      </section>

      <section class="block">
        <h2 class="block__t">Registered address</h2>
        <div class="grid">
          <label class="fld fld--wide">
            <span class="fld__k">Address line 1 <em class="req">required</em></span>
            <input
              class="ar-field__input"
              maxlength="200"
              autocomplete="address-line1"
              placeholder="Plot, building, street"
              [readOnly]="!canEdit()"
              [attr.aria-invalid]="!!problem('addressLine1')"
              [value]="f().addressLine1"
              (input)="set('addressLine1', $any($event.target).value)"
              (blur)="touch('addressLine1')"
            />
            @if (problem('addressLine1'); as e) {
              <span class="fld__bad">{{ e }}</span>
            }
          </label>
          <label class="fld fld--wide">
            <span class="fld__k">Address line 2 <em class="opt">optional</em></span>
            <input
              class="ar-field__input"
              maxlength="200"
              autocomplete="address-line2"
              placeholder="Area, landmark"
              [readOnly]="!canEdit()"
              [value]="f().addressLine2"
              (input)="set('addressLine2', $any($event.target).value)"
            />
          </label>
          <label class="fld">
            <span class="fld__k">City <em class="req">required</em></span>
            <input
              class="ar-field__input"
              maxlength="100"
              autocomplete="address-level2"
              [readOnly]="!canEdit()"
              [attr.aria-invalid]="!!problem('city')"
              [value]="f().city"
              (input)="set('city', $any($event.target).value)"
              (blur)="touch('city')"
            />
            @if (problem('city'); as e) {
              <span class="fld__bad">{{ e }}</span>
            }
          </label>
          <label class="fld">
            <span class="fld__k">State <em class="req">required</em></span>
            <select
              class="ar-field__input"
              [disabled]="!canEdit()"
              [attr.aria-invalid]="!!problem('state')"
              (change)="set('state', $any($event.target).value); touch('state')"
            >
              <option value="" [selected]="!f().state">Choose the state</option>
              @for (s of states; track s.code) {
                <option [value]="s.name" [selected]="s.name === f().state">{{ s.name }}</option>
              }
            </select>
            @if (problem('state'); as e) {
              <span class="fld__bad">{{ e }}</span>
            }
          </label>
          <label class="fld">
            <span class="fld__k">PIN code <em class="req">required</em></span>
            <input
              class="ar-field__input ar-mono"
              inputmode="numeric"
              maxlength="6"
              autocomplete="postal-code"
              [readOnly]="!canEdit()"
              [attr.aria-invalid]="!!problem('pincode')"
              [value]="f().pincode"
              (input)="set('pincode', $any($event.target).value)"
              (blur)="touch('pincode')"
            />
            @if (problem('pincode'); as e) {
              <span class="fld__bad">{{ e }}</span>
            }
          </label>
        </div>
      </section>

      <section class="block">
        <h2 class="block__t">Contact on documents <em class="opt">optional</em></h2>
        <div class="grid">
          <label class="fld">
            <span class="fld__k">Phone</span>
            <input
              class="ar-field__input"
              type="tel"
              maxlength="20"
              placeholder="+91 20 4000 1234"
              [readOnly]="!canEdit()"
              [value]="f().phone"
              (input)="set('phone', $any($event.target).value)"
            />
          </label>
          <label class="fld">
            <span class="fld__k">Email</span>
            <input
              class="ar-field__input"
              type="email"
              maxlength="256"
              placeholder="sales@company.com"
              [readOnly]="!canEdit()"
              [attr.aria-invalid]="!!problem('email')"
              [value]="f().email"
              (input)="set('email', $any($event.target).value)"
              (blur)="touch('email')"
            />
            @if (problem('email'); as e) {
              <span class="fld__bad">{{ e }}</span>
            }
          </label>
        </div>
      </section>

      @if (preview().length) {
        <section class="block">
          <h2 class="block__t">How it prints</h2>
          <div class="preview">
            <span class="preview__k">From</span>
            @for (line of preview(); track $index; let first = $first) {
              <span [class.preview__strong]="first">{{ line }}</span>
            }
          </div>
        </section>
      }
    </form>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }
    .bp {
      flex: 1;
      min-height: 0;
      padding: 18px 24px 28px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 900px;
    }
    .block {
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      padding: 20px 22px;
    }
    .block__t {
      margin: 0 0 14px;
      font: 600 14px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px 16px;
    }
    .fld {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .fld--wide {
      grid-column: 1 / -1;
    }
    .fld__k {
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .fld__hint,
    .fld__bad {
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .fld__bad {
      color: var(--ar-red-600, #b91c1c);
    }
    .req,
    .opt {
      font-style: normal;
      font-weight: 400;
      color: var(--ar-ink-400);
    }
    [aria-invalid='true'] {
      border-color: var(--ar-red-500, #ef4444);
    }
    .preview {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font: 400 12.5px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .preview__k {
      font: 600 11px var(--ar-font-sans);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--ar-ink-400);
    }
    .preview__strong {
      font-weight: 600;
      color: var(--ar-ink-900);
    }
    @media (max-width: 640px) {
      .bp {
        padding: 14px 12px 24px;
      }
      .grid {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class ArBusinessProfile {
  private readonly api = inject(WorkspaceProfileService);
  private readonly toasts = inject(ToastService);
  private readonly permissions = inject(PermissionService);

  protected readonly canEdit = grantedPolicy('AutoReach.Branding.Manage', this.permissions);
  protected readonly states = GST_STATES;

  protected readonly f = signal<UpdateWorkspaceProfileInput>({ ...EMPTY });
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly touched = signal<ReadonlySet<Field>>(new Set());
  private readonly submitted = signal(false);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    if (environment.useMockData) {
      this.loading.set(false);
      return;
    }
    try {
      const p = await firstValueFrom(this.api.get());
      this.f.set({
        legalName: p.legalName ?? '',
        tradeName: p.tradeName ?? '',
        gstin: p.gstin ?? '',
        pan: p.pan ?? '',
        addressLine1: p.addressLine1 ?? '',
        addressLine2: p.addressLine2 ?? '',
        city: p.city ?? '',
        state: p.state ?? '',
        pincode: p.pincode ?? '',
        phone: p.phone ?? '',
        email: p.email ?? '',
      });
    } catch (e: unknown) {
      this.error.set(readApiError(e, 'The business profile could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected set(field: Field, value: string): void {
    this.f.update((f) => ({ ...f, [field]: value }));
  }

  protected touch(field: Field): void {
    this.touched.update((s) => new Set([...s, field]));
  }

  /** A GSTIN carries the state and the PAN: fill them in when they are still blank or follow it. */
  protected setGstin(raw: string): void {
    const gstin = raw.trim().toUpperCase();
    this.f.update((f) => {
      const next = { ...f, gstin };
      if (GSTIN.test(gstin)) {
        const state = GST_STATES.find((s) => s.code === gstin.slice(0, 2));
        if (state && !f.state) next.state = state.name;
        if (!f.pan) next.pan = gstin.slice(2, 12);
      }
      return next;
    });
  }

  protected readonly gstState = computed(() => {
    const gstin = (this.f().gstin ?? '').trim();
    return GSTIN.test(gstin)
      ? (GST_STATES.find((s) => s.code === gstin.slice(0, 2)) ?? null)
      : null;
  });

  private readonly problems = computed<Partial<Record<Field, string>>>(() => {
    const f = this.f();
    const out: Partial<Record<Field, string>> = {};
    const gstin = (f.gstin ?? '').trim();
    const pan = (f.pan ?? '').trim();
    if (!f.legalName.trim()) out.legalName = 'Enter the legal name, as registered.';
    if (gstin && !GSTIN.test(gstin))
      out.gstin = "That GSTIN doesn't look right: 15 characters, like 27AABCK1928F1Z8.";
    if (pan && !PAN.test(pan)) out.pan = 'A PAN is 10 characters, like AABCK1928F.';
    else if (pan && GSTIN.test(gstin) && gstin.slice(2, 12) !== pan)
      out.pan = "The PAN doesn't match the one inside the GSTIN.";
    if (!f.addressLine1.trim()) out.addressLine1 = 'Enter the street address.';
    if (!f.city.trim()) out.city = 'Enter the city.';
    if (!f.state) out.state = 'Choose the state.';
    else if (this.gstState() && this.gstState()!.name !== f.state)
      out.state = `The GSTIN is registered in ${this.gstState()!.name}.`;
    if (!/^[1-9][0-9]{5}$/.test(f.pincode.trim()))
      out.pincode = "A PIN code is six digits and doesn't start with 0.";
    const email = (f.email ?? '').trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      out.email = 'Enter a valid email address.';
    return out;
  });

  /** A field's problem, once it has been left or a save was tried. */
  protected problem(field: Field): string | null {
    if (!this.submitted() && !this.touched().has(field)) return null;
    return this.problems()[field] ?? null;
  }

  /** The "From" block as the documents print it. */
  protected readonly preview = computed(() => {
    const f = this.f();
    if (!f.legalName.trim()) return [];
    const lines = [f.legalName.trim()];
    if (f.tradeName?.trim() && f.tradeName.trim() !== f.legalName.trim())
      lines.push(`Trading as ${f.tradeName.trim()}`);
    for (const l of [f.addressLine1, f.addressLine2]) if (l?.trim()) lines.push(l.trim());
    const place = [f.city.trim(), f.state].filter((s) => !!s).join(', ');
    const withPin = [place, f.pincode.trim()].filter((s) => !!s).join(' ');
    if (withPin) lines.push(withPin);
    const g = this.gstState();
    if (g) lines.push(`GSTIN ${(f.gstin ?? '').trim()} · State code ${g.code}`);
    const reach = [f.phone?.trim(), f.email?.trim()].filter((s) => !!s).join(' · ');
    if (reach) lines.push(reach);
    return lines;
  });

  protected async save(): Promise<void> {
    if (!this.canEdit() || this.busy()) return;
    this.submitted.set(true);
    if (Object.keys(this.problems()).length) {
      this.error.set('Please fix the highlighted fields.');
      setTimeout(() =>
        (document.querySelector('.bp [aria-invalid="true"]') as HTMLElement | null)?.focus(),
      );
      return;
    }
    this.error.set(null);
    this.busy.set(true);
    try {
      const f = this.f();
      const clean = (v: string | null | undefined) => (v ?? '').trim() || null;
      if (!environment.useMockData) {
        await firstValueFrom(
          this.api.update({
            legalName: f.legalName.trim(),
            tradeName: clean(f.tradeName),
            gstin: clean(f.gstin),
            pan: clean(f.pan),
            addressLine1: f.addressLine1.trim(),
            addressLine2: clean(f.addressLine2),
            city: f.city.trim(),
            state: f.state,
            pincode: f.pincode.trim(),
            phone: clean(f.phone),
            email: clean(f.email),
          }),
        );
      }
      this.toasts.success('Business profile saved. New quotations print these details.');
    } catch (e: unknown) {
      this.error.set(readApiError(e, 'The business profile could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }
}
