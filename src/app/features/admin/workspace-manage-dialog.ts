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
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AccountSwitcher } from '../../core/auth/account-switch';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { HostWorkspaceService } from '../../proxy/administration/host-workspace.service';
import type { WorkspaceDetailDto, WorkspaceFeatureDto } from '../../proxy/administration/models';
import { WorkspaceFeatureMode } from '../../proxy/administration/workspace-feature-mode.enum';
import { BillingCycle } from '../../proxy/billing/billing-cycle.enum';
import { ArBanner, ArButton, ArChip, ArDialog, ArTabs } from '../../ui';
import {
  MODE_OPTIONS,
  PLAN_OPTIONS,
  PlanForm,
  assignPlanInput,
  featureLabel,
  planFormFrom,
  rupees,
  subscriptionSummary,
} from './workspace-admin.logic';

type Tab = 'Status' | 'Plan' | 'Features' | 'Database';
const TABS: readonly Tab[] = ['Status', 'Plan', 'Features', 'Database'];

/**
 * The platform's controls for one workspace: suspend or reactivate it, put it on a plan,
 * override single features, give it its own database, and enter it as its owner. Every
 * action is the host's and is recorded in the host audit log.
 */
@Component({
  selector: 'ar-workspace-manage-dialog',
  imports: [ArDialog, ArButton, ArBanner, ArChip, ArTabs, DatePipe],
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
            <div class="wm__table">
              <table>
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>In the plan</th>
                    <th>Override</th>
                    <th>Gets it</th>
                  </tr>
                </thead>
                <tbody>
                  @for (f of d.features; track f.feature) {
                    <tr>
                      <td>{{ label(f.feature) }}</td>
                      <td>{{ f.includedByPlan ? 'Yes' : 'No' }}</td>
                      <td>
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
                      </td>
                      <td>
                        <ar-chip [tone]="f.effective ? 'good' : 'neutral'">
                          {{ f.effective ? 'On' : 'Off' }}
                        </ar-chip>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
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
    .wm__check {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      font: 400 13px var(--ar-font-sans);
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

  protected readonly summary = computed(() => subscriptionSummary(this.detail()?.subscription));

  constructor() {
    effect(() => {
      const id = this.tenantId();
      untracked(() => void this.load(id));
    });
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
