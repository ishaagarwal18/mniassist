import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PermissionService } from '@abp/ng.core';

import { WorkspaceStore } from '../../core/services/workspace.store';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ArButton } from '../../ui/button';

/**
 * The roles a new teammate usually gets, with what each can do — the same one-liners the API keeps beside each
 * role (AutoReachRoles.Descriptions). Owner is left out here: handing over the plan, invoices and support access is
 * a deliberate act, done on the Members page.
 */
export const INVITE_ROLES: readonly { readonly name: string; readonly does: string }[] = [
  { name: 'Agent', does: 'Inbox, contacts and pipeline. Cannot send campaigns.' },
  { name: 'Manager', does: 'Campaigns, templates, segments and the team. Can send.' },
  { name: 'Administrator', does: 'Everything except changing the plan or letting support in.' },
  { name: 'Analyst', does: 'Read-only across the workspace, including exports.' },
  { name: 'Billing', does: 'Wallet, invoices and reconciliation. No customer data.' },
];

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** What is wrong with an address, or null. */
export function inviteEmailProblem(email: string): string | null {
  if (!email.trim()) return 'Enter their email address.';
  if (!EMAIL.test(email.trim())) return 'Enter a valid email address, like name@company.com.';
  return null;
}

/**
 * Get started, "Invite your team": who is in, an invite form with what each role can do, and the invitations still
 * waiting — instead of the whole Members page. Sending the first invitation ticks the step on the server; more can
 * follow without leaving the card.
 */
@Component({
  selector: 'ar-onboarding-invite-team',
  imports: [ArButton, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="it__sum" role="status">
      @if (loading()) {
        Loading your team…
      } @else {
        {{ memberLine() }}
      }
    </p>

    @if (!canInvite) {
      <p class="it__note" role="status">
        Your role cannot invite people. Ask your workspace owner or an admin to send the
        invitations.
      </p>
    } @else {
      <fieldset class="it__form" [disabled]="busy()">
        <legend class="it__k">Invite someone</legend>
        <label class="ar-field it__email">
          <span class="ar-field__label">Their work email</span>
          <input
            class="ar-field__input"
            type="email"
            autocomplete="off"
            placeholder="name@company.com"
            [value]="email()"
            (input)="email.set($any($event.target).value); tried.set(false)"
            (keydown.enter)="send()"
          />
          @if (tried() && emailProblem(); as p) {
            <span class="it__err" role="alert">{{ p }}</span>
          }
        </label>

        <div class="it__roles" role="radiogroup" aria-label="Role">
          @for (r of roles; track r.name) {
            <label class="it__role" [class.it__role--on]="role() === r.name">
              <input
                type="radio"
                name="ob-invite-role"
                [value]="r.name"
                [checked]="role() === r.name"
                (change)="role.set(r.name)"
              />
              <span class="it__role-t">{{ r.name }}</span>
              <span class="it__role-d">{{ r.does }}</span>
            </label>
          }
        </div>

        <label class="ar-field">
          <span class="ar-field__label">Note (optional, shown in the invitation email)</span>
          <input
            class="ar-field__input"
            maxlength="500"
            placeholder="e.g. Welcome aboard — you’ll be handling service enquiries."
            [value]="note()"
            (input)="note.set($any($event.target).value)"
          />
        </label>

        <div class="it__row">
          <button
            ar-button
            type="button"
            variant="primary"
            icon="plus"
            [disabled]="busy()"
            (click)="send()"
          >
            {{ busy() ? 'Sending…' : 'Send invitation' }}
          </button>
          <span class="it__n">They get an email with a link to join. It expires in 7 days.</span>
        </div>
      </fieldset>

      @if (lastLink(); as link) {
        <div class="it__sent" role="status">
          <p>
            Invitation sent to <strong translate="no">{{ link.email }}</strong
            >. If the email does not arrive, share this link with them directly:
          </p>
          <div class="it__link">
            <span class="ar-mono" translate="no">{{ link.url }}</span>
            <button ar-button type="button" variant="ghost" (click)="copy(link.url)">
              Copy link
            </button>
          </div>
        </div>
      }

      @if (pending().length > 0) {
        <section class="it__pending" aria-label="Invitations waiting">
          <h3 class="it__k">Waiting to join</h3>
          <ul>
            @for (i of pending(); track i.id) {
              <li>
                <span class="it__who" translate="no">{{ i.email }}</span>
                <span class="it__meta"
                  >{{ i.roleName }} · {{ expiry(i.expiresAt, i.isExpired) }}</span
                >
                <span class="it__acts">
                  <button
                    ar-button
                    type="button"
                    variant="ghost"
                    [disabled]="busy()"
                    (click)="resend(i.id, i.email)"
                  >
                    Resend
                  </button>
                  <button
                    ar-button
                    type="button"
                    variant="ghost"
                    [disabled]="busy()"
                    (click)="revoke(i.id, i.email)"
                  >
                    Revoke
                  </button>
                </span>
              </li>
            }
          </ul>
        </section>
      }
    }

    <p class="it__more">
      Changing roles, teams and deactivating people are on the
      <a routerLink="/settings/members">Members page</a>.
    </p>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 4px;
    }
    .it__sum {
      margin: 0;
      font: 500 13px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .it__k {
      margin: 0;
      padding: 0;
      font: 600 10.5px var(--ar-font-sans);
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--ar-ink-400);
    }
    .it__form {
      margin: 0;
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: var(--ar-bg-100);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
    }
    .it__email {
      max-width: 420px;
    }
    .it__err {
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-red-500, #c62828);
    }
    .it__roles {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
      gap: 8px;
    }
    .it__role {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding: 10px 12px 10px 34px;
      border: 1px solid var(--ar-line-300);
      border-radius: var(--ar-radius-control);
      background: var(--ar-white);
      cursor: pointer;
    }
    .it__role input {
      position: absolute;
      left: 12px;
      top: 12px;
      margin: 0;
    }
    .it__role--on {
      border-color: var(--ar-primary);
      box-shadow: 0 0 0 1px var(--ar-primary);
    }
    .it__role-t {
      font: 600 13px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .it__role-d {
      font: 400 12px/1.4 var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .it__row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
    }
    .it__n {
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .it__note {
      margin: 0;
      font: 400 13px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .it__sent {
      padding: 10px 14px;
      border-radius: var(--ar-radius-control);
      background: color-mix(in srgb, var(--ar-green-500) 12%, transparent);
      font: 400 13px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .it__sent p {
      margin: 0 0 6px;
    }
    .it__link {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      word-break: break-all;
      font-size: 12px;
    }
    .it__pending ul {
      margin: 6px 0 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
    }
    .it__pending li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 12px;
      padding: 8px 12px;
    }
    .it__pending li + li {
      border-top: 1px solid var(--ar-line-200);
    }
    .it__who {
      font: 500 13px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .it__meta {
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .it__acts {
      margin-left: auto;
      display: flex;
      gap: 4px;
    }
    .it__more {
      margin: 0;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
  `,
})
export class ArOnboardingInviteTeam {
  private readonly store = inject(WorkspaceStore);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);

  /** An invitation went out: the wizard re-reads the checklist (the server ticked the step). */
  readonly invited = output<void>();

  protected readonly canInvite = inject(PermissionService).getGrantedPolicy(
    'AutoReach.Members.Invite',
  );
  protected readonly roles = INVITE_ROLES;

  protected readonly email = signal('');
  protected readonly role = signal('Agent');
  protected readonly note = signal('');
  protected readonly busy = signal(false);
  /** Set once Send was pressed, so an empty field is not flagged before anything was typed. */
  protected readonly tried = signal(false);
  protected readonly lastLink = signal<{ email: string; url: string } | null>(null);

  protected readonly loading = this.store.loading;
  protected readonly emailProblem = computed(() => inviteEmailProblem(this.email()));
  protected readonly pending = computed(() =>
    this.store.invitations().filter((i) => i.state === 'pending'),
  );
  protected readonly memberLine = computed(() => {
    const n = this.store.members().filter((m) => m.isActive).length;
    const p = this.pending().length;
    const people = `${n} ${n === 1 ? 'person is' : 'people are'} in this workspace`;
    return p > 0
      ? `${people}, and ${p} invitation${p === 1 ? ' is' : 's are'} waiting.`
      : `${people}.`;
  });

  protected expiry(iso: string | undefined, expired: boolean): string {
    if (expired) return 'expired';
    if (!iso) return 'waiting';
    const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
    return days <= 1 ? 'expires within a day' : `expires in ${days} days`;
  }

  protected async send(): Promise<void> {
    this.tried.set(true);
    const problem = this.emailProblem();
    if (problem || this.busy()) return;
    const email = this.email().trim();
    this.busy.set(true);
    try {
      const url = await this.store.invite(email, this.role(), this.note() || undefined);
      this.lastLink.set(url ? { email, url } : null);
      this.toasts.success(`Invitation sent to ${email}.`, 'Invite your team');
      this.email.set('');
      this.note.set('');
      this.tried.set(false);
      this.invited.emit();
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The invitation could not be sent.'), 'Invite your team');
    } finally {
      this.busy.set(false);
    }
  }

  protected async resend(id: string, email: string): Promise<void> {
    this.busy.set(true);
    try {
      await this.store.resendInvitation(id);
      this.toasts.success(`A new invitation was sent to ${email}.`, 'Invite your team');
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The invitation could not be resent.'), 'Invite your team');
    } finally {
      this.busy.set(false);
    }
  }

  protected async revoke(id: string, email: string): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: 'Revoke invitation?',
      message: `The invitation to ${email} stops working at once. You can invite them again later.`,
      confirmText: 'Revoke',
      tone: 'danger',
    });
    if (!ok) return;
    this.busy.set(true);
    try {
      await this.store.revokeInvitation(id);
      this.toasts.info(`The invitation to ${email} no longer works.`, 'Invite your team');
    } catch (e: unknown) {
      this.toasts.error(
        readApiError(e, 'The invitation could not be revoked.'),
        'Invite your team',
      );
    } finally {
      this.busy.set(false);
    }
  }

  protected async copy(url: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      this.toasts.success('Link copied.', 'Invite your team');
    } catch {
      this.toasts.warning(
        'The link could not be copied. Select it and copy it by hand.',
        'Invite your team',
      );
    }
  }
}
