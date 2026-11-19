import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { grantedPolicy } from '../../core/auth/permission';
import { ToastService } from '../../core/ui/toast.service';
import { CockpitOriginService } from '../../layout/cockpit-origin.service';
import { ArTopbar } from '../../layout/topbar';
import { TemplateCategory } from '../../proxy/messaging/template-category.enum';
import { TemplateStatus } from '../../proxy/messaging/template-status.enum';
import { TemplateService } from '../../proxy/messaging/template.service';
import {
  ReorderPortalService,
  ReorderPortalSettingsDto,
} from '../../proxy/reorder/reorder-portal.service';
import { AR_DIALOG_INLINE, ArButton, ArDialog } from '../../ui';
import { ArSelect } from '../../ui/select';
import { REORDER_PAGE_STYLES, problem } from './reorder-pages';

/**
 * The re-order portal's settings on their own page (/reorders/settings): on or off, what a request becomes (a draft quotation, or
 * order and pay), the page's heading, how long links work, the minimum order, stock display, sign-in, the public catalogue and
 * the WhatsApp templates. Saved or cancelled, it returns to Re-orders.
 */
@Component({
  selector: 'ar-reorder-settings-page',
  imports: [ArTopbar, ArDialog, ArButton, ArSelect],
  providers: [{ provide: AR_DIALOG_INLINE, useValue: true }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      help="How the customer re-order portal works: what a request becomes, which items are offered and how payment is taken."
      title="Re-order portal settings" subtitle="How customers re-order spares" />
    <div class="rp ar-scroll">
      @if (!canSettings()) {
        <p class="ro__err" role="alert">Your role can't change the re-order portal's settings.</p>
      } @else if (loading()) {
        <p class="ro__hint">Loading…</p>
      } @else {
        <ar-dialog title="How the portal works" (dismiss)="back()">
          <label class="check" for="ro-on">
            <input
              id="ro-on"
              type="checkbox"
              [checked]="form().enabled"
              (change)="patch({ enabled: $any($event.target).checked })"
            />
            Portal on: customers can open their links and send requests
          </label>
          <fieldset class="mode">
            <legend>When a customer sends a request</legend>
            <label for="ro-mode-quote"
              ><input
                id="ro-mode-quote"
                type="radio"
                name="ro-mode"
                [checked]="(form().mode ?? 'SendForQuotation') === 'SendForQuotation'"
                (change)="patch({ mode: 'SendForQuotation' })"
              />
              <span
                ><b>Send for quotation</b>
                <small
                  >A draft quotation for your team to check stock and delivery, then issue.</small
                ></span
              ></label
            >
            <label for="ro-mode-pay"
              ><input
                id="ro-mode-pay"
                type="radio"
                name="ro-mode"
                [disabled]="!settings()?.paymentsReady"
                [checked]="form().mode === 'OrderAndPay'"
                (change)="patch({ mode: 'OrderAndPay' })"
              />
              <span
                ><b>Order and pay</b>
                <small
                  >The quotation is issued at once and the customer pays on a BillDesk link; paying
                  marks it won and issues the stock. A request with a part that has no price goes to
                  your team as a draft instead.</small
                >
                @if (!settings()?.paymentsReady) {
                  <small class="mode__off"
                    >Needs payment links: payments on the plan and a BillDesk account that is set up
                    and switched on.</small
                  >
                }
              </span></label
            >
          </fieldset>
          <label class="ar-field" for="ro-heading">
            <span class="ar-field__label">Heading on the page</span>
            <input
              required
              maxlength="128"
              id="ro-heading"
              class="ar-field__input"
              placeholder="Acme Drives · spares re-order"
              [value]="form().heading ?? ''"
              (input)="patch({ heading: $any($event.target).value })"
            />
          </label>
          <label class="ar-field" for="ro-intro">
            <span class="ar-field__label"
              >A line under it
              <span class="ar-field__opt">(delivery times, who to call)</span></span
            >
            <textarea
              id="ro-intro"
              class="ar-field__input"
              rows="2"
              [value]="form().intro ?? ''"
              (input)="patch({ intro: $any($event.target).value })"
            ></textarea>
          </label>
          <div class="grid">
            <label class="ar-field" for="ro-days">
              <span class="ar-field__label">Links work for (days)</span>
              <input
                required
                id="ro-days"
                class="ar-field__input"
                inputmode="numeric"
                [value]="form().linkLifetimeDays"
                (input)="patch({ linkLifetimeDays: +$any($event.target).value })"
              />
            </label>
            <label class="ar-field" for="ro-min">
              <span class="ar-field__label"
                >Minimum order, ₹ <span class="ar-field__opt">(blank: none)</span></span
              >
              <input
                id="ro-min"
                class="ar-field__input"
                inputmode="numeric"
                [value]="minRupees()"
                (input)="minRupees.set($any($event.target).value)"
              />
            </label>
            <label class="ar-field" for="ro-limited">
              <span class="ar-field__label">“Limited stock” below</span>
              <input
                required
                id="ro-limited"
                class="ar-field__input"
                inputmode="numeric"
                [value]="form().limitedStockBelow"
                (input)="patch({ limitedStockBelow: +$any($event.target).value })"
              />
            </label>
          </div>
          <label class="check" for="ro-exact">
            <input
              id="ro-exact"
              type="checkbox"
              [disabled]="!settings()?.showsStock"
              [checked]="!!form().showExactStock"
              (change)="patch({ showExactStock: $any($event.target).checked })"
            />
            Show customers exact quantities (“12 in stock”) instead of in stock, limited or on order
          </label>
          <label class="check" for="ro-signin">
            <input
              id="ro-signin"
              type="checkbox"
              [checked]="!!form().passwordSignIn"
              (change)="patch({ passwordSignIn: $any($event.target).checked })"
            />
            Customers can also sign in with their WhatsApp number and a password
          </label>
          <label class="check" for="ro-catalogue">
            <input
              id="ro-catalogue"
              type="checkbox"
              [checked]="!!form().publicCatalogue"
              (change)="patch({ publicCatalogue: $any($event.target).checked })"
            />
            Public catalogue: anyone can look up your parts and send an enquiry
          </label>
          @if (form().publicCatalogue) {
            <label class="check" for="ro-catprices">
              <input
                id="ro-catprices"
                type="checkbox"
                [checked]="!!form().catalogueShowsPrices"
                (change)="patch({ catalogueShowsPrices: $any($event.target).checked })"
              />
              Show list prices in the public catalogue (otherwise “price on request”)
            </label>
            @if (settings()?.catalogueUrl) {
              <p class="ro__hint">
                Catalogue: <span class="ar-mono">{{ settings()?.catalogueUrl }}</span
                >. Enquiries arrive as quotation drafts from “Public catalogue”; the number isn't
                verified, so call before quoting.
              </p>
            }
          }
          @if (form().passwordSignIn && settings()?.signInUrl) {
            <p class="ro__hint">
              Sign-in page: <span class="ar-mono">{{ settings()?.signInUrl }}</span
              >. A customer sets a password with a code sent to their WhatsApp, or from their
              re-order page.
            </p>
          }
          <label class="ar-field" for="ro-linktpl">
            <span class="ar-field__label"
              >Link template
              <span class="ar-field__opt"
                >(outside the 24-hour window; a URL button whose dynamic part is the link's code, at
                most one body variable: the customer's name)</span
              ></span
            >
            <select
              id="ro-linktpl"
              class="ar-field__input"
              [value]="form().linkTemplateId ?? ''"
              (change)="patch({ linkTemplateId: $any($event.target).value || null })"
            >
              <option value="">None: send links only inside the window, or copy them</option>
              @for (t of linkTemplates(); track t.id) {
                <option [value]="t.id">{{ t.name }} ({{ t.lang }})</option>
              }
            </select>
          </label>
          <label class="ar-field" for="ro-codetpl">
            <span class="ar-field__label"
              >Code template
              <span class="ar-field__opt"
                >(authentication category; blank uses the helpdesk sign-off template)</span
              ></span
            >
            <select
              id="ro-codetpl"
              class="ar-field__input"
              [value]="form().codeTemplateId ?? ''"
              (change)="patch({ codeTemplateId: $any($event.target).value || null })"
            >
              <option value="">Same as field sign-off</option>
              @for (t of authTemplates(); track t.id) {
                <option [value]="t.id">{{ t.name }} ({{ t.lang }})</option>
              }
            </select>
          </label>
          @if (error(); as e) {
            <p class="ro__err" role="alert">{{ e }}</p>
          }
          <div dialogActions>
            <button ar-button type="button" variant="ghost" (click)="back()">Cancel</button>
            <button
              ar-button
              type="button"
              variant="primary"
              [disabled]="busy()"
              (click)="saveSettings()"
            >
              Save
            </button>
          </div>
        </ar-dialog>
      }
    </div>
  `,
  styles: [
    REORDER_PAGE_STYLES,
    `
      .check {
        display: flex;
        gap: 8px;
        align-items: center;
        font: 500 13px var(--ar-font-sans);
      }
      .mode {
        border: 0;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
        font: 400 13px/1.45 var(--ar-font-sans);
      }
      .mode legend {
        font: 600 13px var(--ar-font-sans);
        margin-bottom: 4px;
      }
      .mode label {
        display: flex;
        gap: 8px;
        align-items: flex-start;
      }
      .mode small {
        display: block;
        color: var(--ar-ink-500);
      }
      .mode .mode__off {
        color: var(--ar-amber-700, #b54708);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 8px;
      }
    `,
  ],
})
export class ArReorderSettingsPage {
  private readonly api = inject(ReorderPortalService);
  private readonly templatesApi = inject(TemplateService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  private readonly origin = inject(CockpitOriginService);
  protected readonly canSettings = grantedPolicy(
    'AutoReach.ReorderPortal.Settings',
    inject(PermissionService),
  );

  protected readonly settings = signal<ReorderPortalSettingsDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly form = signal<ReorderPortalSettingsDto>({
    enabled: false,
    linkLifetimeDays: 7,
    limitedStockBelow: 5,
  });
  protected readonly minRupees = signal('');
  protected readonly linkTemplates = signal<{ id: string; name: string; lang: string }[]>([]);
  protected readonly authTemplates = signal<{ id: string; name: string; lang: string }[]>([]);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const s = await firstValueFrom(this.api.getSettings());
      this.settings.set(s);
      this.form.set({ ...s });
      this.minRupees.set(s.minimumOrderInPaise ? String(s.minimumOrderInPaise / 100) : '');
    } catch (e: unknown) {
      this.error.set(problem(e, 'Could not load the settings.'));
    } finally {
      this.loading.set(false);
    }

    try {
      const all = await firstValueFrom(
        this.templatesApi.getList({ status: TemplateStatus.Approved, maxResultCount: 200 }),
      );
      const items = (all.items ?? []).map((t) => ({
        id: t.id!,
        name: t.name ?? 'Template',
        lang: t.languageCode ?? '',
        category: t.category,
      }));
      this.linkTemplates.set(items.filter((t) => t.category !== TemplateCategory.Authentication));
      this.authTemplates.set(items.filter((t) => t.category === TemplateCategory.Authentication));
    } catch {
      // The pickers stay empty; the rest of the settings still save.
    }
  }

  protected patch(p: Partial<ReorderPortalSettingsDto>): void {
    this.form.update((f) => ({ ...f, ...p }));
  }

  protected async saveSettings(): Promise<void> {
    const f = this.form();
    const minText = this.minRupees().trim().replace(/,/g, '');
    const min = minText === '' ? null : Math.round(Number(minText) * 100);
    if (min !== null && !(min >= 0)) {
      this.error.set('Enter the minimum order in rupees, or leave it blank.');
      return;
    }
    if (
      !Number.isInteger(f.linkLifetimeDays) ||
      f.linkLifetimeDays < 1 ||
      f.linkLifetimeDays > 30
    ) {
      this.error.set('Links can work for 1 to 30 days.');
      return;
    }
    if (!Number.isInteger(f.limitedStockBelow) || f.limitedStockBelow < 1) {
      this.error.set('“Limited stock” needs a whole number of 1 or more.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      const input = { ...f, minimumOrderInPaise: min };
      await firstValueFrom(this.api.updateSettings(input));
      this.toasts.success('Re-order portal settings saved.');
      this.back();
    } catch (e: unknown) {
      this.error.set(problem(e, 'The settings could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected back(): void {
    void this.router.navigateByUrl(this.origin.returnUrl('/reorders'));
  }
}
