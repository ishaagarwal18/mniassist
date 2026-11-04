import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { checkPolicy } from '../../../core/auth/permission';
import { ToastService } from '../../../core/ui/toast.service';
import { readApiError } from '../../../core/util/api-error';
import { CockpitOriginService } from '../../../layout/cockpit-origin.service';
import { ArTopbar } from '../../../layout/topbar';
import { PurchasingService } from '../../../proxy/inventory/purchasing.service';
import { ArButton, ArIcon } from '../../../ui';
import { PURCHASE_FORM_STYLES } from '../purchase-form';
import { PURCHASING_PERMISSIONS } from '../purchasing-permissions';
import {
  SupplierForm,
  supplierForm,
  toSaveSupplierInput,
  validateSupplierForm,
} from './supplier-form.logic';

/**
 * New supplier (/purchasing/suppliers/new) and edit supplier (/purchasing/suppliers/<id>/edit) as a page: identity and terms,
 * primary contact, billing and shipping addresses, bank details, remarks and blacklist. Saved, it returns to where it was opened
 * from (Vendor 360), otherwise to Purchasing › Suppliers.
 */
@Component({
  selector: 'ar-supplier-form-page',
  imports: [ArTopbar, ArButton, ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      [title]="id ? 'Edit supplier' : 'New supplier'"
      [subtitle]="form().name || 'Who you buy from, how to reach and pay them'"
    />

    <div class="pf ar-scroll ar-scroll--bare">
      @if (!canManage) {
        <section class="pf__card pf__denied" role="alert">
          <ar-icon name="shield" [size]="20" />
          <div>
            <strong>Your role can't add or change suppliers.</strong>
            <p>Ask an administrator for the "Inventory › Manage" permission.</p>
          </div>
          <button ar-button variant="ghost" type="button" (click)="cancel()">Go back</button>
        </section>
      } @else if (loading()) {
        <p class="sf-muted">Loading supplier…</p>
      } @else if (notFound()) {
        <section class="pf__card pf__denied" role="alert">
          <ar-icon name="alert" [size]="20" />
          <div><strong>This supplier could not be found.</strong></div>
          <button ar-button variant="ghost" type="button" (click)="cancel()">Go back</button>
        </section>
      } @else {
        <form class="pf__form" novalidate (submit)="$event.preventDefault(); save()">
          <!-- 1. Supplier -->
          <section class="pf__card" aria-labelledby="sf-s1">
            <header class="pf__head">
              <span class="pf__step">1</span>
              <div>
                <h2 id="sf-s1">Supplier</h2>
                <p>Name as on their invoices, GST registration and usual delivery time.</p>
              </div>
            </header>
            <div class="pf__grid">
              <div class="ar-field pf__span2">
                <label class="ar-field__label" for="sf-name"
                  >Name <span class="pf__req">*</span></label
                >
                <input
                  id="sf-name"
                  class="ar-field__input"
                  maxlength="128"
                  placeholder="e.g. Bharat Precision Gears Pvt Ltd"
                  [attr.aria-invalid]="!!err('name')"
                  [value]="form().name"
                  (input)="patch({ name: $any($event.target).value })"
                />
                @if (err('name'); as e) {
                  <span class="pf__err">{{ e }}</span>
                }
              </div>
              <div class="ar-field">
                <label class="ar-field__label" for="sf-gstin"
                  >GSTIN <span class="ar-field__opt">optional</span></label
                >
                <input
                  id="sf-gstin"
                  class="ar-field__input ar-mono"
                  maxlength="15"
                  placeholder="27AABCU9603R1ZM"
                  [attr.aria-invalid]="!!err('gstin')"
                  [value]="form().gstin"
                  (input)="patch({ gstin: $any($event.target).value.toUpperCase() })"
                />
                @if (err('gstin'); as e) {
                  <span class="pf__err">{{ e }}</span>
                }
              </div>
              <div class="ar-field">
                <label class="ar-field__label" for="sf-lead"
                  >Lead time, days <span class="ar-field__opt">optional</span></label
                >
                <input
                  id="sf-lead"
                  class="ar-field__input"
                  inputmode="numeric"
                  maxlength="3"
                  [attr.aria-invalid]="!!err('leadDays')"
                  [value]="form().leadDays"
                  (input)="patch({ leadDays: $any($event.target).value })"
                />
                @if (err('leadDays'); as e) {
                  <span class="pf__err">{{ e }}</span>
                }
              </div>
              <label class="ar-field sf-check pf__span4">
                <input
                  type="checkbox"
                  [checked]="form().isActive"
                  (change)="patch({ isActive: $any($event.target).checked })"
                />
                <span>In use: offered on new orders, receipts and bills</span>
              </label>
            </div>
          </section>

          <!-- 2. Primary contact -->
          <section class="pf__card" aria-labelledby="sf-s2">
            <header class="pf__head">
              <span class="pf__step">2</span>
              <div>
                <h2 id="sf-s2">Primary contact</h2>
                <p>The person you deal with for orders and dispatch.</p>
              </div>
            </header>
            <div class="pf__grid">
              <div class="ar-field">
                <label class="ar-field__label" for="sf-cname">Contact name</label>
                <input
                  id="sf-cname"
                  class="ar-field__input"
                  maxlength="128"
                  placeholder="e.g. Ramesh Kulkarni"
                  [value]="form().contactName"
                  (input)="patch({ contactName: $any($event.target).value })"
                />
              </div>
              <div class="ar-field">
                <label class="ar-field__label" for="sf-cdes">Designation</label>
                <input
                  id="sf-cdes"
                  class="ar-field__input"
                  maxlength="64"
                  placeholder="e.g. Sales manager"
                  [value]="form().contactDesignation"
                  (input)="patch({ contactDesignation: $any($event.target).value })"
                />
              </div>
              <div class="ar-field">
                <label class="ar-field__label" for="sf-phone">Phone</label>
                <input
                  id="sf-phone"
                  class="ar-field__input"
                  type="tel"
                  maxlength="32"
                  placeholder="+91 98220 12345"
                  [value]="form().phone"
                  (input)="patch({ phone: $any($event.target).value })"
                />
              </div>
              <div class="ar-field">
                <label class="ar-field__label" for="sf-email">Email</label>
                <input
                  id="sf-email"
                  class="ar-field__input"
                  type="email"
                  maxlength="256"
                  placeholder="orders@supplier.com"
                  [attr.aria-invalid]="!!err('email')"
                  [value]="form().email"
                  (input)="patch({ email: $any($event.target).value })"
                />
                @if (err('email'); as e) {
                  <span class="pf__err">{{ e }}</span>
                }
              </div>
            </div>
          </section>

          <!-- 3. Addresses -->
          <section class="pf__card" aria-labelledby="sf-s3">
            <header class="pf__head">
              <span class="pf__step">3</span>
              <div>
                <h2 id="sf-s3">Addresses</h2>
                <p>Billing as on their tax invoice; shipping where goods are dispatched from.</p>
              </div>
            </header>
            <div class="pf__grid">
              <div class="ar-field pf__span2">
                <label class="ar-field__label" for="sf-bill">Billing address</label>
                <textarea
                  id="sf-bill"
                  class="ar-field__input"
                  rows="4"
                  maxlength="512"
                  placeholder="Plot, street, area, city, state, PIN"
                  [value]="form().address"
                  (input)="patch({ address: $any($event.target).value })"
                ></textarea>
              </div>
              <div class="ar-field pf__span2">
                <label class="ar-field__label" for="sf-ship">Shipping address</label>
                <textarea
                  id="sf-ship"
                  class="ar-field__input"
                  rows="4"
                  maxlength="512"
                  [readOnly]="form().shipSameAsBilling"
                  [value]="form().shipSameAsBilling ? form().address : form().shippingAddress"
                  (input)="patch({ shippingAddress: $any($event.target).value })"
                ></textarea>
                <label class="sf-check">
                  <input
                    type="checkbox"
                    [checked]="form().shipSameAsBilling"
                    (change)="sameAsBilling($any($event.target).checked)"
                  />
                  <span>Same as billing address</span>
                </label>
              </div>
            </div>
          </section>

          <!-- 4. Bank details -->
          <section class="pf__card" aria-labelledby="sf-s4">
            <header class="pf__head">
              <span class="pf__step">4</span>
              <div>
                <h2 id="sf-s4">Bank details</h2>
                <p>Where payments are sent. Check against the supplier's cancelled cheque.</p>
              </div>
            </header>
            <div class="pf__grid">
              <div class="ar-field pf__span2">
                <label class="ar-field__label" for="sf-acname">Account holder name</label>
                <input
                  id="sf-acname"
                  class="ar-field__input"
                  maxlength="128"
                  [value]="form().bankAccountName"
                  (input)="patch({ bankAccountName: $any($event.target).value })"
                />
              </div>
              <div class="ar-field pf__span2">
                <label class="ar-field__label" for="sf-bank">Bank name</label>
                <input
                  id="sf-bank"
                  class="ar-field__input"
                  maxlength="128"
                  placeholder="e.g. HDFC Bank"
                  [value]="form().bankName"
                  (input)="patch({ bankName: $any($event.target).value })"
                />
              </div>
              <div class="ar-field pf__span2">
                <label class="ar-field__label" for="sf-acno">Account number</label>
                <input
                  id="sf-acno"
                  class="ar-field__input ar-mono"
                  maxlength="40"
                  autocomplete="off"
                  [attr.aria-invalid]="!!err('bankAccountNumber')"
                  [value]="form().bankAccountNumber"
                  (input)="patch({ bankAccountNumber: $any($event.target).value })"
                />
                @if (err('bankAccountNumber'); as e) {
                  <span class="pf__err">{{ e }}</span>
                }
              </div>
              <div class="ar-field">
                <label class="ar-field__label" for="sf-ifsc">IFSC</label>
                <input
                  id="sf-ifsc"
                  class="ar-field__input ar-mono"
                  maxlength="11"
                  placeholder="HDFC0001092"
                  [attr.aria-invalid]="!!err('bankIfsc')"
                  [value]="form().bankIfsc"
                  (input)="patch({ bankIfsc: $any($event.target).value.toUpperCase() })"
                />
                @if (err('bankIfsc'); as e) {
                  <span class="pf__err">{{ e }}</span>
                }
              </div>
              <div class="ar-field">
                <label class="ar-field__label" for="sf-branch">Branch</label>
                <input
                  id="sf-branch"
                  class="ar-field__input"
                  maxlength="128"
                  [value]="form().bankBranch"
                  (input)="patch({ bankBranch: $any($event.target).value })"
                />
              </div>
            </div>
          </section>

          <!-- 5. Remarks & blacklist -->
          <section class="pf__card" aria-labelledby="sf-s5">
            <header class="pf__head">
              <span class="pf__step">5</span>
              <div>
                <h2 id="sf-s5">Remarks & blacklist</h2>
                <p>Notes for your team, and whether this supplier may be bought from.</p>
              </div>
            </header>
            <div class="ar-field">
              <label class="ar-field__label" for="sf-rem">Remarks</label>
              <textarea
                id="sf-rem"
                class="ar-field__input"
                rows="3"
                maxlength="1000"
                placeholder="e.g. Payment terms 45 days; ISO 9001 certified; prefers orders by email"
                [value]="form().remarks"
                (input)="patch({ remarks: $any($event.target).value })"
              ></textarea>
            </div>
            <div class="sf-black" [class.sf-black--on]="form().isBlacklisted">
              <label class="sf-check">
                <input
                  type="checkbox"
                  [checked]="form().isBlacklisted"
                  (change)="patch({ isBlacklisted: $any($event.target).checked })"
                />
                <span><strong>Blacklist this supplier</strong></span>
              </label>
              <p>
                No new purchase orders can be raised for them, and they are left out of the supplier
                lists on new orders, receipts, bills and debit notes. Their history stays.
              </p>
              @if (form().isBlacklisted) {
                <div class="ar-field">
                  <label class="ar-field__label" for="sf-why"
                    >Reason <span class="pf__req">*</span></label
                  >
                  <input
                    id="sf-why"
                    class="ar-field__input"
                    maxlength="512"
                    placeholder="e.g. Repeated QC failures on M16 bolts, Oct 2026"
                    [attr.aria-invalid]="!!err('blacklistReason')"
                    [value]="form().blacklistReason"
                    (input)="patch({ blacklistReason: $any($event.target).value })"
                  />
                  @if (err('blacklistReason'); as e) {
                    <span class="pf__err">{{ e }}</span>
                  }
                </div>
              }
            </div>
          </section>

          @if (saveError(); as e) {
            <p class="pf__alert" role="alert">{{ e }}</p>
          }

          <footer class="pf__bar">
            <span class="pf__summary">
              @if (form().isBlacklisted) {
                <span class="sf-flag">Blacklisted</span>
              } @else if (!form().isActive) {
                Not in use
              }
            </span>
            <button ar-button variant="ghost" type="button" (click)="cancel()">Cancel</button>
            <button ar-button variant="primary" type="submit" icon="check" [disabled]="busy()">
              {{ busy() ? 'Saving…' : id ? 'Save changes' : 'Add supplier' }}
            </button>
          </footer>
        </form>
      }
    </div>
  `,
  styles: [
    PURCHASE_FORM_STYLES,
    `
      .sf-muted {
        color: var(--ar-ink-500);
        font: 400 13px var(--ar-font-sans);
      }
      .sf-check {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 8px;
        font: 400 13px var(--ar-font-sans);
        color: var(--ar-ink-700);
        cursor: pointer;
      }
      .sf-black {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 0.8rem 1rem;
        border: 1px solid var(--ar-line-200);
        border-radius: var(--ar-radius-inset);
        background: var(--ar-bg-50);
      }
      .sf-black p {
        margin: 0;
        font: 400 12.5px var(--ar-font-sans);
        color: var(--ar-ink-500);
      }
      .sf-black--on {
        border-color: var(--ar-red-200);
        background: var(--ar-red-100);
      }
      .sf-flag {
        padding: 2px 9px;
        border-radius: 999px;
        background: var(--ar-red-100);
        color: var(--ar-bad-600);
        font: 600 12px var(--ar-font-sans);
      }
    `,
  ],
})
export class ArSupplierFormPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toasts = inject(ToastService);
  private readonly origin = inject(CockpitOriginService);
  private readonly api = inject(PurchasingService);

  protected readonly canManage = checkPolicy(
    PURCHASING_PERMISSIONS.manageInventory,
    inject(PermissionService),
  );
  /** The supplier being edited; null for a new one. */
  protected readonly id = this.route.snapshot.paramMap.get('id');

  protected readonly form = signal<SupplierForm>(supplierForm());
  protected readonly loading = signal(!!this.id && !environment.useMockData);
  protected readonly notFound = signal(false);
  private readonly submitted = signal(false);
  protected readonly errors = computed(() =>
    this.submitted() ? validateSupplierForm(this.form()) : {},
  );
  protected readonly busy = signal(false);
  protected readonly saveError = signal<string | null>(null);

  constructor() {
    if (this.id && this.canManage && !environment.useMockData) void this.load(this.id);
  }

  private async load(id: string): Promise<void> {
    try {
      const list = await firstValueFrom(this.api.getSuppliers(false, { skipHandleError: true }));
      const s = list.find((x) => x.id === id);
      if (s) this.form.set(supplierForm(s));
      else this.notFound.set(true);
    } catch {
      this.notFound.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  protected err(key: string): string | null {
    return this.errors()[key] ?? null;
  }

  protected patch(p: Partial<SupplierForm>): void {
    this.form.update((f) => ({ ...f, ...p }));
  }

  /** Unticking starts the shipping address from the billing one, to edit. */
  protected sameAsBilling(same: boolean): void {
    this.form.update((f) => ({
      ...f,
      shipSameAsBilling: same,
      shippingAddress: same ? f.shippingAddress : f.shippingAddress || f.address,
    }));
  }

  protected cancel(): void {
    void this.router.navigateByUrl(this.origin.returnUrl(this.listUrl()));
  }

  protected async save(): Promise<void> {
    this.submitted.set(true);
    this.saveError.set(null);
    if (Object.keys(validateSupplierForm(this.form())).length) {
      this.toasts.warning('Fill in the highlighted fields.');
      return;
    }
    const input = toSaveSupplierInput(this.form());
    this.busy.set(true);
    try {
      if (!environment.useMockData) {
        const quiet = { skipHandleError: true };
        await firstValueFrom(
          this.id
            ? this.api.updateSupplier(this.id, input, quiet)
            : this.api.createSupplier(input, quiet),
        );
      }
      this.toasts.success(
        input.isBlacklisted
          ? `${input.name} saved and blacklisted.`
          : `${input.name} ${this.id ? 'saved' : 'added'}.`,
        this.id ? 'Supplier saved' : 'Supplier added',
      );
      void this.router.navigateByUrl(this.origin.returnUrl(this.listUrl()));
    } catch (e: unknown) {
      const message = readApiError(e, 'The supplier could not be saved.');
      this.saveError.set(message);
      this.toasts.error(message, 'Not saved');
    } finally {
      this.busy.set(false);
    }
  }

  private listUrl(): string {
    return this.router
      .createUrlTree(['/purchasing'], { queryParams: { tab: 'suppliers' } })
      .toString();
  }
}
