import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { AccountSwitcher } from '../../core/auth/account-switch';
import { beginExternalLogin } from '../../core/auth/external-login';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { settled } from '../../core/util/resource';
import {
  ExternalLoginService,
  type ExternalLoginLinkDto,
  type ExternalLoginProviderDto,
} from '../../proxy/identity/external-login.service';
import { ArButton, ArCard } from '../../ui';

/**
 * Google and Microsoft sign-in for the signed-in person (M01-7): link once — the provider
 * proves the account is theirs — then use the button on the sign-in screen. Hidden when the
 * deployment has neither provider set up.
 */
@Component({
  selector: 'ar-external-logins-card',
  imports: [ArCard, ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (providers().length) {
      <ar-card heading="Sign in with Google or Microsoft">
        <p class="xl__muted">
          Link your Google or Microsoft account to sign in with it instead of your password.
          Two-step verification still asks for its code.
        </p>
        <ul class="xl">
          @for (p of providers(); track p.name) {
            <li class="xl__row">
              <span class="xl__who">
                <strong>{{ p.name }}</strong>
                <span class="xl__muted">
                  {{ linkFor(p.name) ? linkFor(p.name)!.displayName || 'Linked' : 'Not linked' }}
                </span>
              </span>
              @if (linkFor(p.name)) {
                <button
                  type="button"
                  class="link link--danger"
                  [disabled]="busy()"
                  (click)="unlink(p.name)"
                >
                  Unlink
                </button>
              } @else {
                <button
                  ar-button
                  type="button"
                  variant="ghost"
                  icon="link"
                  [disabled]="busy() || !!switcher.actingAs()"
                  (click)="link(p)"
                >
                  Link {{ p.name }}
                </button>
              }
            </li>
          }
        </ul>
      </ar-card>
    }
  `,
  styles: `
    .xl {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .xl__row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 0;
      border-top: 1px solid var(--ar-ink-100);
    }
    .xl__row:first-child {
      border-top: 0;
    }
    .xl__who {
      display: flex;
      flex-direction: column;
      min-width: 0;
      font: 400 13px var(--ar-font-sans);
    }
    .xl__muted {
      margin: 0 0 10px;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .xl__who .xl__muted {
      margin: 0;
    }
    .link {
      border: 0;
      background: none;
      cursor: pointer;
      padding: 0;
      font: 500 12px var(--ar-font-sans);
    }
    .link:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .link--danger {
      color: var(--ar-red-600);
    }
  `,
})
export class ArExternalLoginsCard {
  private readonly api = inject(ExternalLoginService);
  private readonly dialogs = inject(ConfirmService);
  private readonly toasts = inject(ToastService);
  protected readonly switcher = inject(AccountSwitcher);

  private readonly providersResource = rxResource({
    params: () => ({}),
    stream: () => this.api.getProviders(),
    defaultValue: { items: [] as ExternalLoginProviderDto[] },
  });
  protected readonly providers = computed(
    () => settled(this.providersResource, { items: [] }).items ?? [],
  );

  private readonly tick = signal(0);
  private readonly linksResource = rxResource({
    params: () => (!this.providers().length ? undefined : { t: this.tick() }),
    stream: () => this.api.getMyLinks(),
    defaultValue: { items: [] as ExternalLoginLinkDto[] },
  });
  private readonly links = computed(() => settled(this.linksResource, { items: [] }).items ?? []);

  protected readonly busy = signal(false);

  protected linkFor(provider: string): ExternalLoginLinkDto | undefined {
    return this.links().find((l) => l.provider === provider);
  }

  protected link(p: ExternalLoginProviderDto): void {
    beginExternalLogin(p, { mode: 'link', rememberMe: true, workspace: '' });
  }

  protected async unlink(provider: string): Promise<void> {
    if (
      !(await this.dialogs.confirm({
        title: `Unlink ${provider}?`,
        message: `You will no longer be able to sign in with ${provider}. Your password still works.`,
        confirmText: 'Unlink',
        tone: 'danger',
      }))
    )
      return;
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.unlink(provider));
      this.toasts.success(`${provider} is unlinked.`);
      this.tick.update((n) => n + 1);
    } catch (e) {
      this.toasts.error(readApiError(e, `Could not unlink ${provider}.`));
    } finally {
      this.busy.set(false);
    }
  }
}
