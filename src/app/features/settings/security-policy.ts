import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { PermissionService } from '@abp/ng.core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { grantedPolicy } from '../../core/auth/permission';
import { readApiError } from '../../core/util/api-error';
import { ConfirmService } from '../../core/ui/confirm.service';
import { SecurityPolicyService } from '../../proxy/identity/security-policy.service';
import type { SecurityPolicyDto, UpdateSecurityPolicyDto } from '../../proxy/identity/models';
import { ArTopbar } from '../../layout/topbar';
import { ArBanner, ArButton, ArCard } from '../../ui';

const DEFAULTS: SecurityPolicyDto = {
  passwordRequiredLength: 6,
  passwordRequiredUniqueChars: 1,
  passwordRequireDigit: true,
  passwordRequireLowercase: true,
  passwordRequireUppercase: true,
  passwordRequireNonAlphanumeric: true,
  forcePeriodicPasswordChange: false,
  passwordChangePeriodDays: 90,
  lockoutAllowedForNewUsers: true,
  lockoutMaxFailedAttempts: 5,
  lockoutDurationMinutes: 5,
  requireConfirmedEmail: false,
  unconfirmedEmailUsers: 0,
};

type Flag = {
  [K in keyof UpdateSecurityPolicyDto]: UpdateSecurityPolicyDto[K] extends boolean ? K : never;
}[keyof UpdateSecurityPolicyDto];
type Num = {
  [K in keyof UpdateSecurityPolicyDto]: UpdateSecurityPolicyDto[K] extends number ? K : never;
}[keyof UpdateSecurityPolicyDto];

/**
 * The workspace's sign-in rules: password strength, lockout after wrong passwords,
 * periodic password change and email confirmation. On the host, the default for every
 * workspace that has not chosen its own. Applied at the next password set or sign-in.
 */
@Component({
  selector: 'ar-security-policy',
  imports: [ArTopbar, ArCard, ArButton, ArBanner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Sign-in and password rules"
      subtitle="How strong passwords must be, and what happens after wrong ones"
      help="These rules apply to everyone in the workspace: to every new or changed password, and to every sign-in. Existing passwords keep working until they are next changed."
    >
      @if (canManage()) {
        <button
          ar-button
          type="button"
          variant="primary"
          [disabled]="busy() || !dirty()"
          (click)="save()"
        >
          {{ busy() ? 'Saving…' : 'Save' }}
        </button>
      }
    </ar-topbar>

    <div class="sp ar-scroll">
      @if (error(); as e) {
        <ar-banner tone="bad">{{ e }}</ar-banner>
      }
      @if (!canManage()) {
        <ar-banner tone="teal">You can see these rules but not change them.</ar-banner>
      }

      <ar-card heading="Passwords">
        <div class="sp__grid">
          <label class="fld">
            <span class="fld__k">Minimum length</span>
            <input
              class="ar-field__input"
              type="number"
              min="6"
              max="128"
              [disabled]="!canManage()"
              [value]="form().passwordRequiredLength"
              (input)="num('passwordRequiredLength', $any($event.target).value)"
            />
          </label>
          <label class="fld">
            <span class="fld__k">Different characters, at least</span>
            <input
              class="ar-field__input"
              type="number"
              min="1"
              max="32"
              [disabled]="!canManage()"
              [value]="form().passwordRequiredUniqueChars"
              (input)="num('passwordRequiredUniqueChars', $any($event.target).value)"
            />
          </label>
        </div>
        <div class="sp__checks">
          @for (c of passwordChecks; track c.key) {
            <label class="chk">
              <input
                type="checkbox"
                [disabled]="!canManage()"
                [checked]="form()[c.key]"
                (change)="flag(c.key, $any($event.target).checked)"
              />
              {{ c.label }}
            </label>
          }
        </div>
        <label class="chk sp__gap">
          <input
            type="checkbox"
            [disabled]="!canManage()"
            [checked]="form().forcePeriodicPasswordChange"
            (change)="flag('forcePeriodicPasswordChange', $any($event.target).checked)"
          />
          Ask for a new password every
          <input
            class="ar-field__input sp__inline"
            type="number"
            min="7"
            max="730"
            [disabled]="!canManage() || !form().forcePeriodicPasswordChange"
            [value]="form().passwordChangePeriodDays"
            (input)="num('passwordChangePeriodDays', $any($event.target).value)"
          />
          days
        </label>
        <p class="sp__muted">Example of a password that passes: {{ example() }}</p>
      </ar-card>

      <ar-card heading="Wrong passwords">
        <label class="chk">
          <input
            type="checkbox"
            [disabled]="!canManage()"
            [checked]="form().lockoutAllowedForNewUsers"
            (change)="flag('lockoutAllowedForNewUsers', $any($event.target).checked)"
          />
          Lock an account after too many wrong passwords
        </label>
        <div class="sp__grid sp__gap">
          <label class="fld">
            <span class="fld__k">Wrong attempts before locking</span>
            <input
              class="ar-field__input"
              type="number"
              min="3"
              max="50"
              [disabled]="!canManage() || !form().lockoutAllowedForNewUsers"
              [value]="form().lockoutMaxFailedAttempts"
              (input)="num('lockoutMaxFailedAttempts', $any($event.target).value)"
            />
          </label>
          <label class="fld">
            <span class="fld__k">Locked for (minutes)</span>
            <input
              class="ar-field__input"
              type="number"
              min="1"
              max="1440"
              [disabled]="!canManage() || !form().lockoutAllowedForNewUsers"
              [value]="form().lockoutDurationMinutes"
              (input)="num('lockoutDurationMinutes', $any($event.target).value)"
            />
          </label>
        </div>
        <p class="sp__muted">Wrong two-step codes count too.</p>
      </ar-card>

      <ar-card heading="Email confirmation">
        <label class="chk">
          <input
            type="checkbox"
            [disabled]="!canManage()"
            [checked]="form().requireConfirmedEmail"
            (change)="flag('requireConfirmedEmail', $any($event.target).checked)"
          />
          Only let people sign in once their email address is confirmed
        </label>
        @if (policy().unconfirmedEmailUsers > 0) {
          <ar-banner tone="warn">
            {{ policy().unconfirmedEmailUsers }}
            {{ policy().unconfirmedEmailUsers === 1 ? 'person has' : 'people have' }} not confirmed
            their email yet. With this on, they cannot sign in until they do — the sign-in screen
            offers them a confirmation link.
          </ar-banner>
        }
      </ar-card>
    </div>
  `,
  styles: `
    .sp {
      padding: 20px;
      max-width: 760px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .sp__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    }
    .sp__checks {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 8px 16px;
      margin-top: 12px;
    }
    .sp__gap {
      margin-top: 12px;
    }
    .sp__inline {
      width: 80px;
      display: inline-block;
      margin: 0 6px;
    }
    .sp__muted {
      margin: 10px 0 0;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .fld {
      display: block;
    }
    .fld__k {
      display: block;
      margin-bottom: 4px;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .chk {
      display: flex;
      align-items: center;
      gap: 7px;
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
  `,
})
export class ArSecurityPolicy {
  private readonly api = inject(SecurityPolicyService);
  private readonly permissions = inject(PermissionService);
  private readonly dialogs = inject(ConfirmService);
  private readonly mock = environment.useMockData;

  protected readonly passwordChecks: readonly { key: Flag; label: string }[] = [
    { key: 'passwordRequireDigit', label: 'A digit (0–9)' },
    { key: 'passwordRequireLowercase', label: 'A lowercase letter' },
    { key: 'passwordRequireUppercase', label: 'An uppercase letter' },
    { key: 'passwordRequireNonAlphanumeric', label: 'A symbol (! @ # …)' },
  ];

  protected readonly canManage = computed(() =>
    grantedPolicy('AutoReach.SecurityPolicy.Manage', this.permissions),
  );

  protected readonly policy = signal<SecurityPolicyDto>(DEFAULTS);
  protected readonly form = signal<UpdateSecurityPolicyDto>(DEFAULTS);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly dirty = computed(() => {
    const p = this.policy();
    const f = this.form();
    return (Object.keys(f) as (keyof UpdateSecurityPolicyDto)[]).some((k) => f[k] !== p[k]);
  });

  /** A password that would pass, so the rules read as an example rather than a list. */
  protected readonly example = computed(() => examplePassword(this.form()));

  constructor() {
    if (!this.mock) void this.load();
  }

  private async load(): Promise<void> {
    try {
      const p = await firstValueFrom(this.api.get());
      this.policy.set(p);
      this.form.set({ ...p });
    } catch (e) {
      this.error.set(readApiError(e));
    }
  }

  protected flag(key: Flag, value: boolean): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  protected num(key: Num, value: string): void {
    const n = Number(value);
    if (Number.isFinite(n)) this.form.update((f) => ({ ...f, [key]: Math.round(n) }));
  }

  protected async save(): Promise<void> {
    if (this.busy()) return;
    const f = this.form();
    if (
      f.requireConfirmedEmail &&
      !this.policy().requireConfirmedEmail &&
      this.policy().unconfirmedEmailUsers > 0 &&
      !(await this.dialogs.confirm({
        title: 'Require confirmed email addresses?',
        message: `${this.policy().unconfirmedEmailUsers} people have not confirmed their email and will not be able to sign in until they do.`,
        confirmText: 'Require it',
      }))
    ) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      const p = await firstValueFrom(this.api.update(f));
      this.policy.set(p);
      this.form.set({ ...p });
    } catch (e) {
      this.error.set(readApiError(e));
    } finally {
      this.busy.set(false);
    }
  }
}

/** The shortest password that meets these rules, built from readable parts. */
export function examplePassword(p: UpdateSecurityPolicyDto): string {
  let s = 'harbour';
  if (p.passwordRequireUppercase) s = 'H' + s.slice(1);
  if (p.passwordRequireDigit) s += '42';
  if (p.passwordRequireNonAlphanumeric) s += '!';
  const filler = 'tide';
  while (s.length < p.passwordRequiredLength) s += filler;
  return s;
}
