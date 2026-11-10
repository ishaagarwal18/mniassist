import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AccountSwitcher } from '../../core/auth/account-switch';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { HostWorkspaceService } from '../../proxy/administration/host-workspace.service';
import type {
  WorkspaceDetailDto,
  WorkspaceFeatureDto,
  WorkspaceUserDto,
} from '../../proxy/administration/models';
import { WorkspaceFeatureMode } from '../../proxy/administration/workspace-feature-mode.enum';
import { BillingCycle } from '../../proxy/billing/billing-cycle.enum';
import { InvoiceState } from '../../proxy/billing/invoice-state.enum';
import type { InvoiceDto } from '../../proxy/billing/models';
import { ArBanner, ArButton, ArChip, ArDialog, ArTabs, ArDateInput, ArSelect } from '../../ui';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { ArGrid } from '../../ui/grid';
import {
  InvoiceForm,
  MODE_OPTIONS,
  PLAN_OPTIONS,
  PlanForm,
  assignPlanInput,
  featureLabel,
  generateInvoiceInput,
  invoiceFormDefault,
  invoiceStateChip,
  planFormFrom,
  rupees,
  subscriptionSummary,
} from './workspace-admin.logic';

type Tab = 'Status' | 'Plan' | 'Features' | 'Users' | 'Invoices' | 'Database';
const TABS: readonly Tab[] = ['Status', 'Plan', 'Features', 'Users', 'Invoices', 'Database'];

/**
 * The platform's controls for one workspace: suspend or reactivate it, put it on a plan,
 * override single features, give it its own database, and enter it as its owner. Every
 * action is the host's and is recorded in the host audit log.
 */
@Component({
  selector: 'ar-workspace-manage-dialog',
  imports: [ArDialog, ArButton, ArBanner, ArChip, ArTabs, DatePipe, RouterLink, ArGrid, GridModule, ArDateInput, ArSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog
      [title]="'Manage · ' + tenantName()"
      width="min(760px, calc(100vw - 32px))"
      (dismiss)="closed.emit(changed())"
    >
      @if (error(); as e) {
        <ar-banner tone="bad">{{ e }}</ar-banner>
      }

      @if (detail(); as d) {
        <div class="wm__head">
          <div class="wm__facts">
            @if (d.isSuspended) {
              <ar-chip tone="bad" [dot]="true">Suspended</ar-chip>
            } @else {
              <ar-chip tone="good" [dot]="true">Active</ar-chip>
            }
            <span>{{ summary() }}</span>
            <span>· {{ d.memberCount }} member{{ d.memberCount === 1 ? '' : 's' }}</span>
            <span>· created {{ d.creationTime | date: 'dd MMM yyyy' }}</span>
          </div>
          <button
            ar-button
            type="button"
            variant="ghost"
            icon="user"
            [disabled]="d.isSuspended || busy()"
            [title]="d.isSuspended ? 'Reactivate the workspace first' : ''"
            (click)="enter(d)"
          >
            Enter workspace
          </button>
        </div>

        <ar-tabs [tabs]="tabs" [(active)]="tab" />

        @switch (tab()) {
          @case ('Status') {
            @if (d.isSuspended) {
              <ar-banner tone="bad">
                Suspended {{ d.suspendedAtUtc | date: 'dd MMM yyyy, HH:mm' }}
                @if (d.suspendedBy) {
                  by {{ d.suspendedBy }}
                }
                — {{ d.suspendedReason || 'no reason given' }}. Nobody in it can sign in or use the
                API.
              </ar-banner>
              <div class="wm__row">
                <button
                  ar-button
                  type="button"
                  variant="primary"
                  [disabled]="busy()"
                  (click)="reactivate(d)"
                >
                  Reactivate workspace
                </button>
              </div>
            } @else {
              <p class="wm__p">
                Suspending stops everyone in this workspace signing in or using the API, at once,
                until you reactivate it. Nothing is deleted. The reason is kept with the workspace.
              </p>
              <div class="wm__row">
                <button
                  ar-button
                  type="button"
                  variant="danger"
                  [disabled]="busy()"
                  (click)="suspend(d)"
                >
                  Suspend workspace
                </button>
              </div>
            }
          }

          @case ('Plan') {
            @if (d.subscription; as s) {
              <p class="wm__p">
                Now: {{ summary() }} · {{ rupees(s.monthlyFeeInPaise) }} a month ·
                {{ s.includedAgentSeats }} seats.
              </p>
            }
            <div class="wm__grid">
              <label class="fld">
                <span class="fld__k">Plan</span>
                <select
                  class="ar-field__input"
                  [value]="form().plan"
                  (change)="patch({ plan: +$any($event.target).value })"
                >
                  @for (p of plans; track p.value) {
                    <option [value]="p.value">{{ p.label }}</option>
                  }
                </select>
              </label>
              <label class="fld">
                <span class="fld__k">Billing</span>
                <select
                  class="ar-field__input"
                  [value]="form().cycle"
                  (change)="patch({ cycle: +$any($event.target).value })"
                >
                  <option [value]="Cycle.Monthly">Monthly</option>
                  <option [value]="Cycle.Annual">Annual</option>
                </select>
              </label>
              <label class="fld">
                <span class="fld__k">Current period ends</span>
                <input
                  arNative
                  type="date"
                  class="ar-field__input"
                  [value]="form().periodEnd"
                  (change)="patch({ periodEnd: $any($event.target).value })"
                />
                <span class="fld__h">Blank: one billing cycle from today.</span>
              </label>
              <label class="fld">
                <span class="fld__k">Plan ends</span>
                <input
                  arNative
                  type="date"
                  class="ar-field__input"
                  [value]="form().expires"
                  (change)="patch({ expires: $any($event.target).value })"
                />
                <span class="fld__h">Blank: renews until changed.</span>
              </label>
              <label class="fld">
                <span class="fld__k">Monthly fee (₹, optional)</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  class="ar-field__input"
                  placeholder="The plan's list price"
                  [value]="form().monthlyFeeRupees"
                  (input)="patch({ monthlyFeeRupees: $any($event.target).value })"
                />
              </label>
              <label class="fld">
                <span class="fld__k">Agent seats (optional)</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  class="ar-field__input"
                  placeholder="What the plan includes"
                  [value]="form().seats"
                  (input)="patch({ seats: $any($event.target).value })"
                />
              </label>
            </div>
            <label class="wm__check">
              <input
                type="checkbox"
                [checked]="form().isTrial"
                (change)="patch({ isTrial: $any($event.target).checked })"
              />
              A trial — it ends at the end of the current period unless it is paid for
            </label>
            <h4 class="wm__h">Wallet</h4>
            <p class="wm__p">
              Balance {{ rupees(d.walletBalanceInPaise) }}. Grace lets sending carry on below zero
              up to this amount; at zero minus the grace, campaigns stop until a top-up.
            </p>
            <div class="wm__row">
              <label class="fld">
                <span class="fld__k">Grace allowance (₹)</span>
                <input
                  type="number"
                  min="0"
                  max="100000"
                  step="100"
                  class="ar-field__input"
                  [value]="graceRupees()"
                  (input)="graceRupees.set($any($event.target).value)"
                />
              </label>
              <button
                ar-button
                type="button"
                variant="ghost"
                [disabled]="busy()"
                (click)="setGrace(d)"
              >
                Save grace
              </button>
            </div>
            <div class="wm__row">
              <button
                ar-button
                type="button"
                variant="primary"
                [disabled]="busy()"
                (click)="assignPlan(d)"
              >
                Assign plan
              </button>
              <span class="fld__h">No proration: the new terms start today.</span>
            </div>
          }

          @case ('Features') {
            <p class="wm__p">
              Turn one feature on or off for this workspace whatever its plan says. “As the plan
              says” removes the override.
            </p>
            <ejs-grid
              arGrid="workspace-feature-overrides"
              [dataSource]="d.features"
              aria-label="Feature Overrides"
              [arGridSearch]="false"
              [arGridTools]="false"
            >
              <e-columns>
                <e-column field="feature" headerText="Feature" width="220">
                  <ng-template #template let-f>
                    <span>{{ label(f.feature) }}</span>
                  </ng-template>
                </e-column>
                <e-column headerText="In the plan" width="120">
                  <ng-template #template let-f>
                    <span>{{ f.includedByPlan ? 'Yes' : 'No' }}</span>
                  </ng-template>
                </e-column>
                <e-column headerText="Override" width="180">
                  <ng-template #template let-f>
                    <select
                      arNative
                      class="ar-field__input wm__mode"
                      [attr.aria-label]="'Override for ' + label(f.feature)"
                      [value]="f.mode"
                      [disabled]="busy()"
                      (change)="setFeature(d, f, +$any($event.target).value)"
                    >
                      @for (m of modes; track m.value) {
                        <option [value]="m.value">{{ m.label }}</option>
                      }
                    </select>
                  </ng-template>
                </e-column>
                <e-column headerText="Gets it" width="120">
                  <ng-template #template let-f>
                    <ar-chip [tone]="f.effective ? 'good' : 'neutral'">
                      {{ f.effective ? 'On' : 'Off' }}
                    </ar-chip>
                  </ng-template>
                </e-column>
              </e-columns>
            </ejs-grid>
          }

          @case ('Users') {
            <p class="wm__p">
              Set a new password for anyone in this workspace — for an owner who is locked out, for
              example. Their current password is not needed. They are signed out everywhere, and are
              asked to choose their own at the next sign-in unless you untick that.
            </p>
            @if (users(); as list) {
              <ejs-grid
                arGrid="workspace-users"
                [dataSource]="list"
                aria-label="Workspace Users"
              >
                <e-columns>
                  <e-column field="userName" headerText="User" width="220">
                    <ng-template #template let-u>
                      <div class="wm__user">{{ u.name || u.userName }}</div>
                      <div class="wm__sub">{{ u.email || u.userName }}</div>
                    </ng-template>
                  </e-column>
                  <e-column headerText="Status" width="180">
                    <ng-template #template let-u>
                      <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                        @if (!u.isActive) {
                          <ar-chip tone="neutral">Inactive</ar-chip>
                        } @else if (u.isLockedOut) {
                          <ar-chip tone="bad">Locked out</ar-chip>
                        } @else {
                          <ar-chip tone="good">Active</ar-chip>
                        }
                        @if (u.mustChangePasswordOnNextSignIn) {
                          <ar-chip tone="amber">Must change password</ar-chip>
                        }
                      </div>
                    </ng-template>
                  </e-column>
                  <e-column field="lastPasswordChangeTime" headerText="Password last changed" width="180">
                    <ng-template #template let-u>
                      <span>
                        {{
                          u.lastPasswordChangeTime
                            ? (u.lastPasswordChangeTime | date: 'dd MMM yyyy, HH:mm')
                            : '—'
                        }}
                      </span>
                    </ng-template>
                  </e-column>
                  <e-column headerText="Actions" width="60">
                    <ng-template #template let-u>
                      <button
                        ar-button
                        type="button"
                        variant="ghost"
                        icon="shield"
                        title="Set password"
                        [disabled]="busy()"
                        (click)="openPassword(u)"
                      ></button>
                    </ng-template>
                  </e-column>
                </e-columns>
              </ejs-grid>

              @if (pwFor(); as u) {
                <div class="wm__pw-card">
                  <div class="wm__pw-head">
                    <h4 style="margin: 0; font-size: 14px;">Set new password for <strong>{{ u.name || u.userName }}</strong></h4>
                    <button ar-button type="button" variant="ghost" (click)="pwFor.set(null)">Cancel</button>
                  </div>
                  <div class="wm__pw">
                    <label class="fld">
                      <span class="fld__k"
                        >New password for {{ u.name || u.userName }}</span
                      >
                      <input
                        class="ar-field__input"
                        type="password"
                        autocomplete="new-password"
                        [value]="pwNew()"
                        (input)="pwNew.set($any($event.target).value)"
                      />
                    </label>
                    <label class="fld">
                      <span class="fld__k">Type it again</span>
                      <input
                        class="ar-field__input"
                        type="password"
                        autocomplete="new-password"
                        [value]="pwAgain()"
                        (input)="pwAgain.set($any($event.target).value)"
                      />
                    </label>
                    <label class="wm__check">
                      <input
                        type="checkbox"
                        [checked]="pwMustChange()"
                        (change)="pwMustChange.set($any($event.target).checked)"
                      />
                      Ask them to choose a new one at their next sign-in
                    </label>
                    <div class="wm__row">
                      <button
                        ar-button
                        type="button"
                        variant="primary"
                        [disabled]="busy()"
                        (click)="setPassword(d, u)"
                      >
                        {{ busy() ? 'Saving…' : 'Set password' }}
                      </button>
                      <button
                        ar-button
                        type="button"
                        variant="ghost"
                        (click)="pwFor.set(null)"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              }
            } @else {
              <p class="wm__p">Loading users…</p>
            }
          }

          @case ('Invoices') {
            <p class="wm__p">
              The platform’s subscription invoices to {{ d.name }}: from your Business profile, to
              theirs. A new invoice starts as a draft you can check and download. Issuing it makes
              it final and sends it to the workspace: they are told in the app and by email, and
              find it on their Billing → Invoices.
            </p>
            <div class="wm__grid">
              <label class="fld">
                <span class="fld__k">From</span>
                <input
                  type="date"
                  class="ar-field__input"
                  [value]="invForm().start"
                  (change)="patchInvoice({ start: $any($event.target).value })"
                />
              </label>
              <label class="fld">
                <span class="fld__k">To</span>
                <input
                  type="date"
                  class="ar-field__input"
                  [value]="invForm().end"
                  (change)="patchInvoice({ end: $any($event.target).value })"
                />
              </label>
              <label class="fld">
                <span class="fld__k">Place of supply (optional)</span>
                <input
                  class="ar-field__input ar-mono"
                  inputmode="numeric"
                  maxlength="2"
                  placeholder="e.g. 27"
                  [value]="invForm().place"
                  (input)="patchInvoice({ place: $any($event.target).value })"
                />
                <span class="fld__h">Blank: from the workspace’s GSTIN or state.</span>
              </label>
            </div>
            <div class="wm__row">
              <button
                ar-button
                type="button"
                variant="primary"
                [disabled]="busy()"
                (click)="generateInvoice(d)"
              >
                Generate draft invoice
              </button>
              <a
                class="wm__link"
                routerLink="/settings/business-profile"
                (click)="closed.emit(changed())"
                >Your business profile</a
              >
            </div>

            @if (invoices(); as list) {
              <ejs-grid
                arGrid="workspace-manage-invoices"
                [dataSource]="list"
                aria-label="Workspace invoices"
              >
                <e-columns>
                  <e-column headerText="Invoice" width="180">
                    <ng-template #template let-i>
                      <div>
                        <div class="wm__user ar-mono font-semibold">{{ i.number || 'Draft' }}</div>
                        @if (i.dueAtUtc && i.state === State.Issued) {
                          <div class="wm__sub text-xs text-muted">Due {{ i.dueAtUtc | date: 'dd MMM yyyy' }}</div>
                        } @else if (i.paidAtUtc) {
                          <div class="wm__sub text-xs text-muted">Paid {{ i.paidAtUtc | date: 'dd MMM yyyy' }}</div>
                        }
                      </div>
                    </ng-template>
                  </e-column>
                  <e-column headerText="Period" width="180">
                    <ng-template #template let-i>
                      {{ i.periodStartUtc | date: 'dd MMM' : '+0530' }} –
                      {{ i.periodEndUtc | date: 'dd MMM yyyy' : '+0530' }}
                    </ng-template>
                  </e-column>
                  <e-column headerText="Total" width="120" [textAlign]="'Right'">
                    <ng-template #template let-i>
                      <span class="font-bold">{{ rupees(i.totalInPaise ?? 0) }}</span>
                    </ng-template>
                  </e-column>
                  <e-column headerText="State" width="120">
                    <ng-template #template let-i>
                      <ar-chip [tone]="chip(i.state).tone">{{ chip(i.state).label }}</ar-chip>
                    </ng-template>
                  </e-column>
                  <e-column headerText="Actions" width="80">
                    <ng-template #template let-i>
                      <div class="wm__act">
                        @if (i.state === State.Draft) {
                          <button
                            ar-button
                            type="button"
                            variant="primary"
                            icon="document"
                            title="Issue invoice"
                            [disabled]="busy()"
                            (click)="issueInvoice(d, i)"
                          ></button>
                        } @else if (i.state === State.Issued) {
                          <button
                            ar-button
                            type="button"
                            variant="ghost"
                            icon="check"
                            title="Mark as paid"
                            [disabled]="busy()"
                            (click)="markInvoicePaid(d, i)"
                          ></button>
                        }
                        <button
                          ar-button
                          type="button"
                          variant="ghost"
                          icon="download"
                          [disabled]="busy()"
                          [attr.aria-label]="
                            'Download ' + (i.number || 'draft invoice') + ' as PDF'
                          "
                          title="Download PDF"
                          (click)="downloadInvoice(d, i)"
                        ></button>
                      </div>
                    </ng-template>
                  </e-column>
                </e-columns>
              </ejs-grid>
            } @else {
              <p class="wm__p">Loading invoices…</p>
            }
          }

          @case ('Database') {
            @if (d.hasOwnDatabase) {
              <p class="wm__p">
                This workspace has its own database:
                <span class="ar-mono">{{ d.databaseLocation }}</span
                >. Run “Create or update tables” after pointing it at a new database, and after each
                release.
              </p>
              <div class="wm__row">
                <button
                  ar-button
                  type="button"
                  variant="primary"
                  [disabled]="busy()"
                  (click)="migrate(d)"
                >
                  {{ busy() ? 'Working…' : 'Create or update tables' }}
                </button>
                <button
                  ar-button
                  type="button"
                  variant="danger"
                  [disabled]="busy()"
                  (click)="removeDatabase(d)"
                >
                  Back to the shared database
                </button>
              </div>
            } @else {
              <p class="wm__p">
                The workspace uses the shared database. To move it to its own, give an empty SQL
                Server database's connection string, then create its tables. Data already in the
                shared database is not copied.
              </p>
              <label class="fld">
                <span class="fld__k">Connection string</span>
                <textarea
                  class="ar-field__input wm__conn"
                  autocomplete="off"
                  spellcheck="false"
                  maxlength="1024"
                  placeholder="Server=…;Database=…;User Id=…;Password=…;TrustServerCertificate=True"
                  [value]="connection()"
                  (input)="connection.set($any($event.target).value)"
                ></textarea>
                <span class="fld__h"
                  >Kept with the workspace. Only the server and database name are shown again, never
                  the password.</span
                >
              </label>
              <div class="wm__row">
                <button
                  ar-button
                  type="button"
                  variant="primary"
                  [disabled]="busy() || !connection().trim()"
                  (click)="setDatabase(d)"
                >
                  Use this database
                </button>
              </div>
            }
          }
        }
      } @else if (!error()) {
        <p class="wm__p">Loading…</p>
      }

      <div dialogActions>
        <button ar-button type="button" variant="ghost" (click)="closed.emit(changed())">
          Close
        </button>
      </div>
    </ar-dialog>
  `,
  styles: `
    .wm__head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 12px;
    }
    .wm__facts {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-600);
    }
    .wm__p {
      margin: 12px 0;
      font: 400 13px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .wm__row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      margin-top: 12px;
    }
    .wm__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      margin-top: 12px;
    }
    .wm__h {
      margin: 18px 0 0;
      font: 600 12.5px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .wm__check {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      font: 400 13px var(--ar-font-sans);
    }
    .wm__user {
      font-weight: 500;
      color: var(--ar-ink-900);
    }
    .wm__sub {
      font-size: 12px;
      color: var(--ar-ink-500);
    }
    .wm__act {
      text-align: right;
      white-space: nowrap;
    }
    .wm__pw-card {
      margin-top: 16px;
      padding: 16px;
      border: 1px solid var(--ar-line-200);
      border-radius: 8px;
      background: var(--ar-surface-100);
      display: grid;
      gap: 12px;
    }
    .wm__pw-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .wm__pw {
      display: grid;
      gap: 10px;
      padding: 6px 0;
      max-width: 420px;
    }
    .wm__check {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--ar-ink-700);
    }
    .wm__table {
      overflow-x: auto;
      max-height: 52vh;
    }
    .wm__table table {
      width: 100%;
      border-collapse: collapse;
      font: 400 13px var(--ar-font-sans);
    }
    .wm__table th,
    .wm__table td {
      text-align: left;
      padding: 6px 8px;
      border-top: 1px solid var(--ar-ink-100);
      vertical-align: middle;
    }
    .wm__table th {
      border-top: 0;
      font: 600 11.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .wm__mode {
      min-width: 150px;
    }
    .wm__inv {
      margin-top: 16px;
    }
    .wm__link {
      font: 500 13px var(--ar-font-sans);
      color: var(--ar-blue-600, var(--ar-ink-700));
    }
    .wm__conn {
      min-height: 72px;
      font-family: var(--ar-font-mono);
      width: 100%;
    }
    .fld {
      display: block;
      min-width: 0;
    }
    .fld__k {
      display: block;
      margin-bottom: 4px;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .fld__h {
      display: block;
      margin-top: 3px;
      font: 400 11.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
  `,
})
export class ArWorkspaceManageDialog {
  private readonly api = inject(HostWorkspaceService);
  private readonly dialogs = inject(ConfirmService);
  private readonly toasts = inject(ToastService);
  private readonly switcher = inject(AccountSwitcher);

  readonly tenantId = input.required<string>();
  readonly tenantName = input.required<string>();
  /** True when something about the workspace changed, so the list can reload. */
  readonly closed = output<boolean>();

  protected readonly tabs = TABS;
  protected readonly plans = PLAN_OPTIONS;
  protected readonly modes = MODE_OPTIONS;
  protected readonly Cycle = BillingCycle;
  protected readonly label = featureLabel;
  protected readonly rupees = rupees;

  protected readonly tab = signal<Tab>('Status');
  protected readonly detail = signal<WorkspaceDetailDto | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly changed = signal(false);
  protected readonly form = signal<PlanForm>(planFormFrom(null));
  protected readonly connection = signal('');
  protected readonly graceRupees = signal('0');

  protected readonly summary = computed(() => subscriptionSummary(this.detail()?.subscription));

  // ---- Users: set a password without the current one -------------------------------
  protected readonly users = signal<WorkspaceUserDto[] | null>(null);
  protected readonly pwFor = signal<WorkspaceUserDto | null>(null);
  protected readonly pwNew = signal('');
  protected readonly pwAgain = signal('');
  protected readonly pwMustChange = signal(true);

  constructor() {
    effect(() => {
      const id = this.tenantId();
      untracked(() => void this.load(id));
    });
    // The users list loads the first time its tab is opened.
    effect(() => {
      if (this.tab() !== 'Users' || this.users() !== null || environment.useMockData) return;
      untracked(() => void this.loadUsers());
    });
    // So do the invoices.
    effect(() => {
      if (this.tab() !== 'Invoices' || this.invoices() !== null || environment.useMockData) return;
      untracked(() => void this.loadInvoices());
    });
  }

  // ---- Invoices: the platform billing this workspace ---------------------------------
  protected readonly State = InvoiceState;
  protected readonly chip = invoiceStateChip;
  protected readonly invoices = signal<InvoiceDto[] | null>(null);
  protected readonly invForm = signal<InvoiceForm>(invoiceFormDefault());

  protected patchInvoice(p: Partial<InvoiceForm>): void {
    this.invForm.update((f) => ({ ...f, ...p }));
  }

  private async loadInvoices(): Promise<void> {
    try {
      this.invoices.set(await firstValueFrom(this.api.getInvoices(this.tenantId())));
    } catch (e) {
      this.invoices.set([]);
      this.error.set(readApiError(e));
    }
  }

  /** Runs one invoice change and puts the result in the list in place (or first, if new). */
  private async invoiceAction(work: () => Promise<InvoiceDto>, done: string): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const inv = await work();
      const list = this.invoices() ?? [];
      this.invoices.set(
        list.some((x) => x.id === inv.id)
          ? list.map((x) => (x.id === inv.id ? inv : x))
          : [inv, ...list],
      );
      this.toasts.success(done);
    } catch (e) {
      this.error.set(readApiError(e));
    } finally {
      this.busy.set(false);
    }
  }

  protected async generateInvoice(d: WorkspaceDetailDto): Promise<void> {
    const input = generateInvoiceInput(this.invForm());
    if (typeof input === 'string') {
      this.error.set(input);
      return;
    }
    await this.invoiceAction(
      () => firstValueFrom(this.api.generateInvoice(d.id, input)),
      `Draft invoice for ${d.name} created. Check it, then issue it to share it with them.`,
    );
  }

  protected async issueInvoice(d: WorkspaceDetailDto, i: InvoiceDto): Promise<void> {
    if (
      !(await this.dialogs.confirm({
        title: `Issue this invoice to ${d.name}?`,
        message: `${i.number}, ${rupees(i.totalInPaise ?? 0)}. Once issued it is final and payment falls due; ${d.name} is told in the app and by email, and finds it on Billing → Invoices.`,
        confirmText: 'Issue invoice',
      }))
    )
      return;
    await this.invoiceAction(
      () => firstValueFrom(this.api.issueInvoice(d.id, { invoiceId: i.id! })),
      `Invoice issued to ${d.name}.`,
    );
  }

  protected async markInvoicePaid(d: WorkspaceDetailDto, i: InvoiceDto): Promise<void> {
    if (
      !(await this.dialogs.confirm({
        title: `Mark ${i.number} as paid?`,
        message: `Record that ${d.name} has paid ${rupees(i.totalInPaise ?? 0)}.`,
        confirmText: 'Mark paid',
      }))
    )
      return;
    await this.invoiceAction(
      () => firstValueFrom(this.api.markInvoicePaid(d.id, { invoiceId: i.id! })),
      `${i.number} is marked paid.`,
    );
  }

  protected async downloadInvoice(d: WorkspaceDetailDto, i: InvoiceDto): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const blob = await firstValueFrom(this.api.downloadInvoicePdf(d.id, i.id!));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(i.number || 'draft-invoice').replace(/\//g, '-')}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      this.error.set(readApiError(e, 'The invoice PDF could not be downloaded.'));
    } finally {
      this.busy.set(false);
    }
  }

  private async loadUsers(): Promise<void> {
    try {
      this.users.set(await firstValueFrom(this.api.getUsers(this.tenantId())));
    } catch (e) {
      this.users.set([]);
      this.error.set(readApiError(e));
    }
  }

  protected openPassword(u: WorkspaceUserDto): void {
    this.pwNew.set('');
    this.pwAgain.set('');
    this.pwMustChange.set(true);
    this.pwFor.set(u);
  }

  protected async setPassword(d: WorkspaceDetailDto, u: WorkspaceUserDto): Promise<void> {
    const password = this.pwNew();
    if (!password) {
      this.error.set('Enter the new password.');
      return;
    }
    if (password !== this.pwAgain()) {
      this.error.set('The two passwords do not match.');
      return;
    }
    const who = u.name || u.userName;
    const ok = await this.dialogs.confirm({
      title: `Set a new password for ${who}?`,
      message: `${who} in ${d.name} is signed out everywhere and must use the new password.`,
      confirmText: 'Set password',
    });
    if (!ok) return;

    this.busy.set(true);
    this.error.set(null);
    try {
      const updated = await firstValueFrom(
        this.api.setUserPassword(d.id, {
          userId: u.id,
          newPassword: password,
          mustChangeOnNextSignIn: this.pwMustChange(),
        }),
      );
      this.users.update((list) => (list ?? []).map((x) => (x.id === updated.id ? updated : x)));
      this.pwFor.set(null);
      this.pwNew.set('');
      this.pwAgain.set('');
      this.toasts.success(`${who}'s password was changed. Give it to them by a safe route.`);
    } catch (e) {
      this.error.set(readApiError(e));
    } finally {
      this.busy.set(false);
    }
  }

  private async load(id: string): Promise<void> {
    if (environment.useMockData) {
      this.error.set(
        'Workspace management needs the API — it is not available in the standalone build.',
      );
      return;
    }
    try {
      this.show(await firstValueFrom(this.api.get(id)));
    } catch (e) {
      this.error.set(readApiError(e));
    }
  }

  private show(d: WorkspaceDetailDto): void {
    this.detail.set(d);
    this.form.set(planFormFrom(d.subscription));
    this.graceRupees.set(String((d.walletGraceOverdraftInPaise ?? 0) / 100));
  }

  protected patch(p: Partial<PlanForm>): void {
    this.form.update((f) => ({ ...f, ...p }));
  }

  /** Runs one change, shows the new state, and remembers the list needs a reload. */
  private async run(work: () => Promise<WorkspaceDetailDto>, done: string): Promise<boolean> {
    this.busy.set(true);
    this.error.set(null);
    try {
      this.show(await work());
      this.changed.set(true);
      this.toasts.success(done);
      return true;
    } catch (e) {
      this.error.set(readApiError(e));
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  protected async suspend(d: WorkspaceDetailDto): Promise<void> {
    const answer = await this.dialogs.prompt({
      title: `Suspend ${d.name}?`,
      message: `All ${d.memberCount} member${d.memberCount === 1 ? '' : 's'} are signed out at once and cannot sign in until you reactivate it.`,
      confirmText: 'Suspend',
      fields: [
        {
          key: 'reason',
          label: 'Reason',
          required: true,
          multiline: true,
          maxLength: 500,
          placeholder: 'e.g. Invoice INV-2026-0412 unpaid for 45 days',
        },
      ],
    });
    if (!answer) return;
    await this.run(
      () => firstValueFrom(this.api.suspend(d.id, { reason: answer['reason'].trim() })),
      `${d.name} is suspended.`,
    );
  }

  protected async reactivate(d: WorkspaceDetailDto): Promise<void> {
    if (
      !(await this.dialogs.confirm({
        title: `Reactivate ${d.name}?`,
        message: 'Its members can sign in again straight away.',
        confirmText: 'Reactivate',
      }))
    )
      return;
    await this.run(() => firstValueFrom(this.api.reactivate(d.id)), `${d.name} is active again.`);
  }

  protected async assignPlan(d: WorkspaceDetailDto): Promise<void> {
    const input = assignPlanInput(this.form());
    if (typeof input === 'string') {
      this.error.set(input);
      return;
    }
    const plan = PLAN_OPTIONS.find((p) => p.value === input.plan)?.label ?? 'the plan';
    if (
      !(await this.dialogs.confirm({
        title: `Put ${d.name} on ${plan}${input.isTrial ? ' (trial)' : ''}?`,
        message:
          'The workspace gets the new plan’s features and seats now. Nothing is charged or refunded for the change.',
        confirmText: 'Assign plan',
      }))
    )
      return;
    await this.run(
      () => firstValueFrom(this.api.assignPlan(d.id, input)),
      `${d.name} is on ${plan}.`,
    );
  }

  protected async setGrace(d: WorkspaceDetailDto): Promise<void> {
    const rupeesValue = Number(this.graceRupees());
    if (!(rupeesValue >= 0 && rupeesValue <= 100000)) {
      this.error.set('The grace allowance must be from ₹0 to ₹1,00,000.');
      return;
    }
    await this.run(
      () =>
        firstValueFrom(
          this.api.setWalletGrace(d.id, { graceOverdraftInPaise: Math.round(rupeesValue * 100) }),
        ),
      `${d.name} can now go ${rupees(Math.round(rupeesValue * 100))} below zero.`,
    );
  }

  protected async setFeature(
    d: WorkspaceDetailDto,
    f: WorkspaceFeatureDto,
    mode: WorkspaceFeatureMode,
  ): Promise<void> {
    const ok = await this.run(
      () => firstValueFrom(this.api.setFeature(d.id, { feature: f.feature, mode })),
      `${featureLabel(f.feature)}: ${MODE_OPTIONS.find((m) => m.value === mode)?.label.toLowerCase()}.`,
    );
    // A refused change leaves the select showing the old value.
    if (!ok) this.detail.set({ ...d });
  }

  protected async setDatabase(d: WorkspaceDetailDto): Promise<void> {
    const saved = await this.run(
      () =>
        firstValueFrom(this.api.setDatabase(d.id, { connectionString: this.connection().trim() })),
      `${d.name} now points at its own database.`,
    );
    if (!saved) return;
    this.connection.set('');
    if (
      await this.dialogs.confirm({
        title: 'Create its tables now?',
        message: 'The workspace cannot work until its database has tables and seed data.',
        confirmText: 'Create tables',
      })
    ) {
      await this.migrate(this.detail()!);
    }
  }

  protected async migrate(d: WorkspaceDetailDto): Promise<void> {
    await this.run(
      () => firstValueFrom(this.api.migrateDatabase(d.id)),
      `${d.name}'s database is up to date.`,
    );
  }

  protected async removeDatabase(d: WorkspaceDetailDto): Promise<void> {
    if (
      !(await this.dialogs.confirm({
        title: `Move ${d.name} back to the shared database?`,
        message:
          'It reads and writes the shared database from now on. Its own database is left as it is, not deleted, and nothing in it is copied back.',
        confirmText: 'Move back',
        tone: 'danger',
      }))
    )
      return;
    await this.run(
      () => firstValueFrom(this.api.removeDatabase(d.id)),
      `${d.name} uses the shared database.`,
    );
  }

  protected async enter(d: WorkspaceDetailDto): Promise<void> {
    if (
      !(await this.dialogs.confirm({
        title: `Enter ${d.name} as its owner?`,
        message:
          'You work inside the workspace with its owner’s access. The owner is told you entered, and everything you do is in their audit log under your name. Use “Return to your account” at the top to come back.',
        confirmText: 'Enter workspace',
      }))
    )
      return;
    this.busy.set(true);
    try {
      await this.switcher.switchTo({ kind: 'ManageWorkspace', tenant: { id: d.id, name: d.name } });
    } catch (e) {
      this.busy.set(false);
      this.error.set(readApiError(e));
    }
  }
}
