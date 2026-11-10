import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { grantedPolicy } from '../../core/auth/permission';
import { ToastService } from '../../core/ui/toast.service';
import { CockpitOriginService } from '../../layout/cockpit-origin.service';
import { ArTopbar } from '../../layout/topbar';
import { CollectionService } from '../../proxy/integrations/collection.service';
import { TemplateStatus } from '../../proxy/messaging/template-status.enum';
import { TemplateService } from '../../proxy/messaging/template.service';
import { AR_DIALOG_INLINE, ArButton, ArDialog } from '../../ui';
import { ArSelect } from '../../ui/select';

/**
 * Collection reminders' settings on their own page (/collections/settings): automatic reminders on or off, the approved WhatsApp
 * template, the credit days used when the ERP gives no due date, and the pay link (offered only once a payment gateway is connected). Saved or cancelled, it returns to
 * Collections.
 */
@Component({
  selector: 'ar-collections-settings-page',
  imports: [ArTopbar, ArDialog, ArButton, ArSelect, RouterLink],
  providers: [{ provide: AR_DIALOG_INLINE, useValue: true }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar title="Collection reminders" subtitle="WhatsApp reminders for unpaid invoices" />
    <div class="cs ar-scroll">
      @if (!canManage()) {
        <p class="cl__err" role="alert">Your role can't change collection reminders.</p>
      } @else if (loading()) {
        <p class="cl__hint">Loading…</p>
      } @else {
        <ar-dialog title="Reminder settings" (dismiss)="back()">
          <label class="cl__check" for="cl-on">
            <input
              id="cl-on"
              type="checkbox"
              [checked]="enabled()"
              (change)="enabled.set($any($event.target).checked)"
            />
            Send reminders automatically
          </label>
          <label class="ar-field" for="cl-tpl">
            <span class="ar-field__label">Approved WhatsApp template</span>
            <select
              required
              id="cl-tpl"
              class="ar-field__input"
              [value]="templateId()"
              (change)="templateId.set($any($event.target).value)"
            >
              <option value="">Choose a template…</option>
              @for (t of templates(); track t.id) {
                <option [value]="t.id">{{ t.name }} ({{ t.lang }})</option>
              }
            </select>
          </label>
          <p class="cl__hint">
            Body values in order: customer name, invoice number, amount outstanding, due date. Add a
            URL button ending in a variable to carry the pay link.
          </p>
          <label class="ar-field" for="cl-days">
            <span class="ar-field__label"
              >Credit days
              <span class="ar-field__opt">(used when the ERP gives no due date)</span></span
            >
            <input
              id="cl-days"
              class="ar-field__input"
              inputmode="numeric"
              [value]="creditDays()"
              (input)="creditDays.set($any($event.target).value)"
            />
          </label>
          @if (gateway(); as g) {
            <label class="cl__check" for="cl-pay">
              <input
                id="cl-pay"
                type="checkbox"
                [checked]="payLink()"
                (change)="payLink.set($any($event.target).checked)"
              />
              Include a pay link for the amount outstanding
            </label>
            <p class="cl__hint">
              Customers pay through your <span translate="no">{{ g }}</span> account.
            </p>
          } @else {
            <label class="cl__check cl__check--off" for="cl-pay">
              <input id="cl-pay" type="checkbox" disabled [checked]="false" />
              Include a pay link for the amount outstanding
            </label>
            <p class="cl__hint">
              No payment gateway is connected, so reminders go without a pay link.
              @if (canSetUpGateway()) {
                <a routerLink="/settings/payments">Connect one in Payments</a>.
              } @else {
                Ask an admin to connect one in Settings › Payments.
              }
            </p>
          }
          @if (settingsError(); as e) {
            <p class="cl__err" role="alert">{{ e }}</p>
          }
          <div dialogActions>
            <button ar-button type="button" variant="ghost" (click)="back()">Cancel</button>
            <button
              ar-button
              type="button"
              variant="primary"
              [disabled]="busy() === 'settings'"
              (click)="saveSettings()"
            >
              {{ busy() === 'settings' ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </ar-dialog>
      }
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
    }
    .cs {
      flex: 1;
      min-height: 0;
      padding: 1.25rem 1.5rem 2rem;
    }
    .cl__hint {
      margin: 0;
      font: 400 12.5px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-500);
      max-width: 75ch;
    }
    .cl__err {
      margin: 0;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-bad-600, #b42318);
    }
    .cl__check {
      display: flex;
      gap: 8px;
      align-items: center;
      font: 500 13px var(--ar-font-sans);
    }
    .cl__check--off {
      color: var(--ar-ink-500);
    }
    .cl__hint a {
      color: var(--ar-blue-600);
    }
    @media (max-width: 560px) {
      .cs {
        padding-inline: 12px;
      }
    }
  `,
})
export class ArCollectionsSettingsPage {
  private readonly api = inject(CollectionService);
  private readonly templatesApi = inject(TemplateService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  private readonly origin = inject(CockpitOriginService);
  protected readonly canManage = grantedPolicy(
    'AutoReach.Collections.Manage',
    inject(PermissionService),
  );
  protected readonly canSetUpGateway = grantedPolicy(
    'AutoReach.Payments.ManageGateway',
    inject(PermissionService),
  );

  protected readonly loading = signal(true);
  protected readonly busy = signal<string | null>(null);
  protected readonly enabled = signal(false);
  protected readonly templateId = signal('');
  protected readonly creditDays = signal('30');
  protected readonly payLink = signal(true);
  /** The gateway pay links go through; null when none is connected (the box is then off and locked). */
  protected readonly gateway = signal<string | null>(null);
  protected readonly templates = signal<{ id: string; name: string; lang: string }[]>([]);
  protected readonly settingsError = signal<string | null>(null);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const [s, list] = await Promise.all([
        firstValueFrom(this.api.getSettings()),
        firstValueFrom(
          this.templatesApi.getList({ status: TemplateStatus.Approved, maxResultCount: 200 }),
        ),
      ]);
      this.enabled.set(s.enabled);
      this.templateId.set(s.templateId ?? '');
      this.creditDays.set(String(s.creditDays));
      this.payLink.set(s.includePayLink);
      this.gateway.set(s.payLinkGateway ?? null);
      this.templates.set(
        (list.items ?? []).map((t) => ({
          id: t.id!,
          name: t.name ?? 'Template',
          lang: t.languageCode ?? '',
        })),
      );
    } catch (e: unknown) {
      this.settingsError.set(this.problem(e, 'Could not load the settings.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected async saveSettings(): Promise<void> {
    const days = Number(this.creditDays().trim());
    if (!Number.isInteger(days) || days < 0 || days > 365) {
      this.settingsError.set('Credit days must be a whole number from 0 to 365.');
      return;
    }
    if (this.enabled() && !this.templateId()) {
      this.settingsError.set('Choose an approved template before switching reminders on.');
      return;
    }
    this.busy.set('settings');
    this.settingsError.set(null);
    try {
      await firstValueFrom(
        this.api.updateSettings({
          enabled: this.enabled(),
          templateId: this.templateId() || null,
          creditDays: days,
          includePayLink: this.payLink(),
        }),
      );
      this.toasts.success(
        this.enabled()
          ? 'Reminders are on. The next pass runs within 6 hours.'
          : 'Settings saved. Reminders are off.',
      );
      this.back();
    } catch (e: unknown) {
      this.settingsError.set(this.problem(e, 'The settings could not be saved.'));
    } finally {
      this.busy.set(null);
    }
  }

  protected back(): void {
    void this.router.navigateByUrl(this.origin.returnUrl('/collections'));
  }

  private problem(e: unknown, fallback: string): string {
    return (e as { error?: { error?: { message?: string } } })?.error?.error?.message ?? fallback;
  }
}
