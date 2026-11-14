import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PermissionService } from '@abp/ng.core';
import { firstValueFrom } from 'rxjs';
import { grantedPolicy } from '../../../core/auth/permission';
import { ToastService } from '../../../core/ui/toast.service';
import { readApiError } from '../../../core/util/api-error';
import { ArTopbar } from '../../../layout/topbar';
import {
  GstPortalMode,
  GstPortalSettingsDto,
  GstPortalSettingsService,
  GstPortalTestResultDto,
} from '../../../proxy/finance';
import { ArBanner, ArButton, ArCard, ArChip } from '../../../ui';
import { PORTAL_MODES } from './gst-portal.logic';

/**
 * How this workspace reaches the e-invoice and e-way bill portals (/finance/gst-compliance/connection): the mode it runs
 * in, and the Masters India account it signs in with. The GSTIN and address come from the business profile.
 */
@Component({
  selector: 'ar-gst-portal-connection',
  standalone: true,
  imports: [FormsModule, RouterLink, ArTopbar, ArCard, ArButton, ArChip, ArBanner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar title="GST portal connection" subtitle="E-invoices and e-way bills">
      <a ar-button variant="ghost" routerLink="/finance/gst-compliance">Back to GST compliance</a>
    </ar-topbar>

    <div class="gpc ar-scroll">
      @if (loading()) {
        <p class="gpc__muted">Loading the connection…</p>
      } @else if (loadError(); as e) {
        <ar-banner tone="bad">{{ e }}</ar-banner>
      } @else {
        @if (!settings()?.isProfileReady) {
          <ar-banner tone="warn">
            The portal needs your GSTIN, legal name, address, city and PIN code. Complete them on
            the business profile first.
            <a banner-actions ar-button variant="ghost" routerLink="/settings/business-profile"
              >Open business profile</a
            >
          </ar-banner>
        }

        <ar-card heading="Your GSTIN">
          <dl class="gpc__facts">
            <div>
              <dt>Documents are registered under</dt>
              <dd class="ar-mono" translate="no">{{ settings()?.sellerGstin || 'Not set' }}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                @if (settings()?.isConnected) {
                  <ar-chip tone="good" [dot]="true">{{ connectedLabel() }}</ar-chip>
                } @else {
                  <ar-chip tone="neutral">Not connected</ar-chip>
                }
              </dd>
            </div>
          </dl>
        </ar-card>

        <ar-card heading="Mode">
          <div class="gpc__modes" role="radiogroup" aria-label="Mode">
            @for (m of modes; track m.value) {
              <label class="gpc__mode" [class.gpc__mode--on]="mode === m.value">
                <input
                  type="radio"
                  name="mode"
                  [value]="m.value"
                  [(ngModel)]="mode"
                  [disabled]="!canEdit()"
                />
                <span>
                  <strong>{{ m.label }}</strong>
                  <small>{{ m.hint }}</small>
                </span>
              </label>
            }
          </div>
        </ar-card>

        @if (needsAccount()) {
          <ar-card heading="Masters India account">
            <p class="gpc__muted">
              Masters India is the GST Suvidha Provider that carries your documents to the
              government portals. Your GSTIN must be added to this account on their site, with its
              e-invoice and e-way bill API credentials.
            </p>
            <div class="gpc__form">
              <label class="ar-field">
                <span class="ar-field__label">Username <span class="ar-field__req">*</span></span>
                <input
                  class="ar-field__input"
                  name="username"
                  autocomplete="off"
                  maxlength="128"
                  [(ngModel)]="username"
                  [readOnly]="!canEdit()"
                />
              </label>
              <label class="ar-field">
                <span class="ar-field__label"
                  >Password
                  @if (settings()?.hasPassword) {
                    <span class="ar-field__opt">saved</span>
                  } @else {
                    <span class="ar-field__req">*</span>
                  }
                </span>
                <input
                  class="ar-field__input"
                  type="password"
                  name="password"
                  autocomplete="new-password"
                  maxlength="256"
                  [placeholder]="settings()?.hasPassword ? 'Leave empty to keep the saved one' : ''"
                  [(ngModel)]="password"
                  [readOnly]="!canEdit()"
                />
              </label>
            </div>
          </ar-card>
        }

        @if (formError(); as e) {
          <p class="gpc__error" role="alert">{{ e }}</p>
        }
        @if (testResult(); as t) {
          <ar-banner [tone]="t.succeeded ? 'good' : 'bad'">{{ t.message }}</ar-banner>
        }

        @if (canEdit()) {
          <div class="gpc__actions">
            <button
              ar-button
              type="button"
              variant="ghost"
              [disabled]="busy() || dirty()"
              [title]="dirty() ? 'Save first, then test' : ''"
              (click)="test()"
            >
              {{ testing() ? 'Testing…' : 'Test connection' }}
            </button>
            <button ar-button type="button" variant="primary" [disabled]="busy()" (click)="save()">
              {{ saving() ? 'Saving…' : 'Save' }}
            </button>
          </div>
        } @else {
          <p class="gpc__muted">You can see the connection but not change it.</p>
        }
      }
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }
    .gpc {
      flex: 1;
      min-height: 0;
      padding: 18px 24px 32px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      max-width: 820px;
    }
    .gpc ar-card {
      display: block;
    }
    .gpc__muted {
      margin: 0 0 12px;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .gpc__facts {
      margin: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px 16px;
    }
    .gpc__facts dt {
      font: 400 11.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .gpc__facts dd {
      margin: 2px 0 0;
      font: 500 13.5px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .gpc__modes {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .gpc__mode {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      padding: 10px 12px;
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-control);
      cursor: pointer;
    }
    .gpc__mode--on {
      border-color: var(--ar-brand-600);
      background: var(--ar-brand-050, transparent);
    }
    .gpc__mode strong {
      display: block;
      font: 600 13.5px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .gpc__mode small {
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .gpc__form {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px 14px;
    }
    .gpc__form .ar-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .gpc__error {
      margin: 0;
      padding: 8px 12px;
      border-radius: var(--ar-radius-control);
      background: var(--ar-red-100);
      color: var(--ar-bad-600);
      font: 500 12.5px var(--ar-font-sans);
    }
    .gpc__actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    @media (max-width: 760px) {
      .gpc {
        padding: 14px 16px 24px;
      }
      .gpc__modes,
      .gpc__form {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class ArGstPortalConnection implements OnInit {
  private readonly api = inject(GstPortalSettingsService);
  private readonly toasts = inject(ToastService);
  private readonly permissions = inject(PermissionService);

  protected readonly modes = PORTAL_MODES;
  protected readonly canEdit = grantedPolicy(
    'AutoReach.GstCompliance.ManageConnection',
    this.permissions,
  );

  readonly settings = signal<GstPortalSettingsDto | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly testing = signal(false);
  readonly formError = signal<string | null>(null);
  readonly testResult = signal<GstPortalTestResultDto | null>(null);
  protected readonly busy = computed(() => this.saving() || this.testing());

  mode: GstPortalMode = GstPortalMode.Test;
  username = '';
  password = '';

  protected needsAccount(): boolean {
    return this.mode === GstPortalMode.Sandbox || this.mode === GstPortalMode.Live;
  }

  /** Something on the form differs from what is saved, so a test would not test what is shown. */
  protected dirty(): boolean {
    const saved = this.settings();
    return (
      !!saved &&
      (saved.mode !== this.mode ||
        (saved.username ?? '') !== this.username.trim() ||
        this.password !== '')
    );
  }

  protected connectedLabel(): string {
    switch (this.settings()?.mode) {
      case GstPortalMode.Live:
        return 'Live';
      case GstPortalMode.Sandbox:
        return 'Sandbox';
      default:
        return 'Test mode';
    }
  }

  ngOnInit(): void {
    this.api.get({ skipHandleError: true }).subscribe({
      next: (settings) => {
        this.apply(settings);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('The GST portal connection could not be loaded.');
        this.loading.set(false);
      },
    });
  }

  private apply(settings: GstPortalSettingsDto): void {
    this.settings.set(settings);
    this.mode = settings.mode;
    this.username = settings.username ?? '';
    this.password = '';
  }

  async save(): Promise<void> {
    if (this.busy()) return;
    const username = this.username.trim();
    if (this.needsAccount() && !username) {
      this.formError.set('Enter the Masters India username.');
      return;
    }
    if (this.needsAccount() && !this.password && !this.settings()?.hasPassword) {
      this.formError.set('Enter the Masters India password.');
      return;
    }
    this.formError.set(null);
    this.testResult.set(null);
    this.saving.set(true);
    try {
      const saved = await firstValueFrom(
        this.api.update(
          {
            mode: this.mode,
            username: username || undefined,
            password: this.password || undefined,
          },
          { skipHandleError: true },
        ),
      );
      this.apply(saved);
      this.toasts.success('GST portal connection saved.');
    } catch (e) {
      this.formError.set(readApiError(e, 'The connection could not be saved.'));
    } finally {
      this.saving.set(false);
    }
  }

  async test(): Promise<void> {
    if (this.busy()) return;
    this.testResult.set(null);
    this.testing.set(true);
    try {
      this.testResult.set(await firstValueFrom(this.api.test({ skipHandleError: true })));
    } catch (e) {
      this.testResult.set({
        succeeded: false,
        message: readApiError(e, 'The connection could not be tested.'),
      });
    } finally {
      this.testing.set(false);
    }
  }
}
