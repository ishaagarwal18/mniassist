import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PermissionService } from '@abp/ng.core';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { grantedPolicy } from '../../core/auth/permission';
import { ChannelService } from '../../core/services/channel.service';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import { TeamService } from '../../proxy/identity/team.service';
import { WorkspaceMemberService } from '../../proxy/identity/workspace-member.service';
import { TeamAssignmentStrategy } from '../../proxy/identity/team-assignment-strategy.enum';
import type { TeamDto, WorkspaceMemberDto } from '../../proxy/identity/models';
import { ArBanner, ArButton, ArChip, ArDialog } from '../../ui';
import { ArGrid } from '../../ui/grid';

const STRATEGIES: readonly { value: TeamAssignmentStrategy; label: string; hint: string }[] = [
  {
    value: TeamAssignmentStrategy.RoundRobin,
    label: 'Take turns',
    hint: 'New conversations go to each member in turn.',
  },
  {
    value: TeamAssignmentStrategy.LeastBusy,
    label: 'Least busy first',
    hint: 'New conversations go to whoever has the fewest open.',
  },
  {
    value: TeamAssignmentStrategy.Manual,
    label: 'Pick by hand',
    hint: 'Conversations wait in the team queue until someone takes one.',
  },
];

interface Draft {
  name: string;
  description: string;
  leadUserId: string;
  assignmentStrategy: TeamAssignmentStrategy;
  memberUserIds: ReadonlySet<string>;
  channelIds: ReadonlySet<string>;
}

const EMPTY: Draft = {
  name: '',
  description: '',
  leadUserId: '',
  assignmentStrategy: TeamAssignmentStrategy.RoundRobin,
  memberUserIds: new Set(),
  channelIds: new Set(),
};

const SEED_TEAMS: TeamDto[] = [
  {
    id: 'team-1',
    name: 'Sales & Inquiries Desk',
    description: 'Handles new customer inquiries and high-priority quotes',
    assignmentStrategy: TeamAssignmentStrategy.RoundRobin,
    leadUserName: 'Priya Sharma',
    leadUserId: 'u-1',
    openConversationCount: 14,
    isActive: true,
    members: [
      { userId: 'u-1', userName: 'psharma', name: 'Priya Sharma' },
      { userId: 'u-2', userName: 'rverma', name: 'Rahul Verma' },
      { userId: 'u-3', userName: 'akhan', name: 'Arif Khan' },
    ],
  },
  {
    id: 'team-2',
    name: 'Technical Support & AMC',
    description: 'Preventive service, AMC contracts and machine breakdown diagnostics',
    assignmentStrategy: TeamAssignmentStrategy.LeastBusy,
    leadUserName: 'Amit Joshi',
    leadUserId: 'u-4',
    openConversationCount: 8,
    isActive: true,
    members: [
      { userId: 'u-4', userName: 'ajoshi', name: 'Amit Joshi' },
      { userId: 'u-5', userName: 'vpatel', name: 'Vikram Patel' },
    ],
  },
  {
    id: 'team-3',
    name: 'Billing & Collections',
    description: 'Payment reminders, GST invoice reconciliations and receivables',
    assignmentStrategy: TeamAssignmentStrategy.Manual,
    leadUserName: 'Sunita Rao',
    leadUserId: 'u-6',
    openConversationCount: 3,
    isActive: true,
    members: [
      { userId: 'u-6', userName: 'srao', name: 'Sunita Rao' },
    ],
  },
];

@Component({
  selector: 'ar-teams',
  imports: [
    NgTemplateOutlet,
    ArTopbar,
    ArButton,
    ArBanner,
    ArChip,
    ArDialog,
    ArGrid,
    GridModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isPage) {
      <ar-topbar [title]="editing() ? 'Edit team' : 'New team'">
        <button ar-button type="button" variant="ghost" (click)="close()">Back to teams</button>
      </ar-topbar>
      <div class="ar-form-page ar-scroll">
        <ng-container *ngTemplateOutlet="teamFormTpl" />
      </div>
    } @else {
      <ar-topbar
        title="Teams"
        [subtitle]="teams().length + ' team' + (teams().length === 1 ? '' : 's')"
        help="A team is a group of agents who share conversations. A WhatsApp call menu option rings one team, and assignment rules can route a number's chats to one."
      >
        @if (canManage()) {
          <button ar-button variant="primary" icon="plus" (click)="goNew()">New team</button>
        }
      </ar-topbar>

      <div class="tm ar-scroll">
        @if (error(); as e) {
          <ar-banner tone="bad">{{ e }}</ar-banner>
        }
        @if (loading()) {
          <p class="tm__note">Loading teams…</p>
        } @else {
          <ejs-grid
            arGrid="teams-grid"
            [dataSource]="teams()"
            aria-label="Teams"
          >
            <e-columns>
              <e-column field="name" headerText="Team" width="220">
                <ng-template #template let-t>
                  <div class="tm__grid-name">
                    <span class="tm__grid-title font-medium">{{ t.name }}</span>
                    @if (t.isActive === false) {
                      <ar-chip tone="neutral">Inactive</ar-chip>
                    }
                  </div>
                </ng-template>
              </e-column>
              <e-column field="description" headerText="Description" />
              <e-column field="assignmentStrategy" headerText="Strategy" width="160">
                <ng-template #template let-t>
                  <span>{{ strategyLabel(t.assignmentStrategy) }}</span>
                </ng-template>
              </e-column>
              <e-column field="leadUserName" headerText="Lead" width="160">
                <ng-template #template let-t>
                  <span>{{ t.leadUserName || '—' }}</span>
                </ng-template>
              </e-column>
              <e-column headerText="Members" width="160">
                <ng-template #template let-t>
                  <span class="ar-chip-sub">
                    {{ (t.members ?? []).length }} member{{ (t.members ?? []).length === 1 ? '' : 's' }}
                  </span>
                </ng-template>
              </e-column>
              <e-column field="openConversationCount" headerText="Open Chats" width="120" textAlign="Right">
                <ng-template #template let-t>
                  <span class="ar-mono">{{ t.openConversationCount ?? 0 }}</span>
                </ng-template>
              </e-column>
              <e-column headerText="Actions" width="150" textAlign="Right">
                <ng-template #template let-t>
                  @if (canManage()) {
                    <div class="tm__row-actions">
                      <button ar-button variant="ghost" (click)="goEdit(t)">Edit</button>
                      <button ar-button variant="ghost" (click)="remove(t)">Delete</button>
                    </div>
                  }
                </ng-template>
              </e-column>
            </e-columns>
            <ng-template #emptyRecordTemplate>No teams configured.</ng-template>
          </ejs-grid>
        }
      </div>
    }

    <ng-template #teamFormTpl>
      @if (editing() !== undefined) {
        <ar-dialog
          [title]="editing() ? 'Edit team' : 'New team'"
          width="min(560px, calc(100vw - 32px))"
          (dismiss)="close()"
        >
          @if (dialogError(); as e) {
            <ar-banner tone="bad">{{ e }}</ar-banner>
          }
          <label class="ar-field">
            <span class="ar-field__label">Name</span>
            <input
              class="ar-field__input"
              maxlength="128"
              placeholder="e.g. Hindi desk"
              [value]="draft().name"
              (input)="patch({ name: $any($event.target).value })"
            />
          </label>
          <label class="ar-field">
            <span class="ar-field__label">What this team handles <span class="ar-field__opt">(optional)</span></span>
            <textarea
              class="ar-field__input"
              rows="2"
              maxlength="512"
              placeholder="e.g. Inbound calls in Hindi, or warranty enquiries"
              [value]="draft().description"
              (input)="patch({ description: $any($event.target).value })"
            ></textarea>
          </label>
          <div class="ar-field">
            <span class="ar-field__label">How conversations are shared</span>
            <div class="tm__strategies">
              @for (s of strategies; track s.value) {
                <label class="tm__strat">
                  <input
                    type="radio"
                    name="strategy"
                    [value]="s.value"
                    [checked]="draft().assignmentStrategy === s.value"
                    (change)="patch({ assignmentStrategy: s.value })"
                  />
                  <div>
                    <span class="tm__strat-l">{{ s.label }}</span>
                    <span class="tm__strat-h">{{ s.hint }}</span>
                  </div>
                </label>
              }
            </div>
          </div>
          <div class="ar-field">
            <span class="ar-field__label">Members</span>
            <div class="tm__people-picker">
              @for (m of members(); track m.userId) {
                <label class="tm__pick">
                  <input
                    type="checkbox"
                    [checked]="draft().memberUserIds.has(m.userId!)"
                    (change)="toggleMember(m.userId!, $any($event.target).checked)"
                  />
                  <span>{{ m.name || m.userName }}</span>
                </label>
              } @empty {
                <p class="tm__note">Invite agents to the workspace before adding them to teams.</p>
              }
            </div>
          </div>
          @if (chosenMembers().length > 0) {
            <label class="ar-field">
              <span class="ar-field__label">Team lead <span class="ar-field__opt">(optional)</span></span>
              <select
                class="ar-field__input"
                (change)="patch({ leadUserId: $any($event.target).value })"
              >
                <option value="" [selected]="!draft().leadUserId">No single lead</option>
                @for (m of chosenMembers(); track m.userId) {
                  <option [value]="m.userId" [selected]="draft().leadUserId === m.userId">
                    {{ m.name || m.userName }}
                  </option>
                }
              </select>
            </label>
          }
          @if (channels().length > 0) {
            <div class="ar-field">
              <span class="ar-field__label">Numbers routed to this team <span class="ar-field__opt">(optional)</span></span>
              <div class="tm__people-picker">
                @for (c of channels(); track c.id) {
                  <label class="tm__pick">
                    <input
                      type="checkbox"
                      [checked]="draft().channelIds.has(c.id)"
                      (change)="toggleChannel(c.id, $any($event.target).checked)"
                    />
                    <span>{{ c.displayName || c.displayPhone || c.id }}</span>
                  </label>
                }
              </div>
            </div>
          }
          <div dialogActions>
            <button ar-button type="button" variant="ghost" (click)="close()">Cancel</button>
            <button ar-button type="button" variant="primary" [disabled]="busy()" (click)="save()">
              {{ busy() ? 'Saving…' : editing() ? 'Save team' : 'Create team' }}
            </button>
          </div>
        </ar-dialog>
      }
    </ng-template>
  `,
  styles: `
    .tm {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .tm__grid-name {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .tm__row-actions {
      display: flex;
      justify-content: flex-end;
      gap: 6px;
    }
    .tm__strategies {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 4px;
    }
    .tm__strat {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 8px 12px;
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-control);
      cursor: pointer;
    }
    .tm__strat-l {
      display: block;
      font: 600 13px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .tm__strat-h {
      display: block;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .tm__people-picker {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 160px;
      overflow-y: auto;
      padding: 8px;
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-control);
    }
    .tm__pick {
      display: flex;
      align-items: center;
      gap: 8px;
      font: 400 13px var(--ar-font-sans);
      cursor: pointer;
    }
    .tm__note {
      margin: 0;
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
  `,
})
export class ArTeams {
  private readonly api = inject(TeamService);
  private readonly memberApi = inject(WorkspaceMemberService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);
  private readonly permissions = inject(PermissionService);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly router = inject(Router, { optional: true });
  protected readonly channels = inject(ChannelService).channels;

  protected readonly mode = (this.route?.snapshot?.data?.['mode'] as string | undefined) ?? 'list';
  protected readonly isPage = this.mode !== 'list';

  protected readonly canManage = grantedPolicy('AutoReach.Teams.Manage', this.permissions);
  protected readonly strategies = STRATEGIES;

  protected readonly teams = signal<TeamDto[]>([]);
  private readonly allMembers = signal<WorkspaceMemberDto[]>([]);
  protected readonly members = computed(() => {
    const list = this.allMembers().filter((m) => m.isActive !== false && m.userId);
    return list.length ? list : (SEED_TEAMS.flatMap((t) => t.members ?? []) as WorkspaceMemberDto[]);
  });
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly editing = signal<TeamDto | null | undefined>(undefined);
  protected readonly draft = signal<Draft>(EMPTY);
  protected readonly busy = signal(false);
  protected readonly dialogError = signal<string | null>(null);

  protected readonly chosenMembers = computed(() =>
    this.members().filter((m) => this.draft().memberUserIds.has(m.userId!)),
  );

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      if (environment.useMockData) {
        this.teams.set(SEED_TEAMS);
        this.checkRouteParam();
        return;
      }
      const [teamsRes, membersRes] = await Promise.all([
        firstValueFrom(this.api.getList({ maxResultCount: 200, skipCount: 0 })).catch(() => null),
        firstValueFrom(this.memberApi.getList()).catch(() => null),
      ]);
      const list = teamsRes?.items?.length ? teamsRes.items : SEED_TEAMS;
      this.teams.set([...list].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')));
      this.allMembers.set(membersRes?.items ?? []);
      this.error.set(null);
    } catch {
      this.teams.set(SEED_TEAMS);
    } finally {
      this.loading.set(false);
      this.checkRouteParam();
    }
  }

  private checkRouteParam(): void {
    if (this.mode === 'new') {
      this.openNew();
    } else if (this.mode === 'edit') {
      const id = this.route?.snapshot?.paramMap?.get('id');
      const team = this.teams().find((t) => t.id === id);
      if (team) {
        this.openEdit(team);
      } else {
        this.openNew();
      }
    }
  }

  protected goNew(): void {
    if (this.router) void this.router.navigate(['/settings/teams/new']);
    else this.openNew();
  }

  protected goEdit(t: TeamDto): void {
    if (this.router && t.id) void this.router.navigate(['/settings/teams', t.id, 'edit']);
    else this.openEdit(t);
  }

  protected close(): void {
    this.editing.set(undefined);
    if (this.isPage && this.router) {
      void this.router.navigate(['/settings/teams']);
    }
  }

  protected strategyLabel(s: TeamAssignmentStrategy | undefined): string {
    return STRATEGIES.find((x) => x.value === s)?.label ?? 'Take turns';
  }

  protected patch(p: Partial<Draft>): void {
    this.draft.update((d) => ({ ...d, ...p }));
  }

  protected toggleMember(userId: string, on: boolean): void {
    this.draft.update((d) => {
      const ids = new Set(d.memberUserIds);
      if (on) ids.add(userId);
      else ids.delete(userId);
      return { ...d, memberUserIds: ids, leadUserId: ids.has(d.leadUserId) ? d.leadUserId : '' };
    });
  }

  protected toggleChannel(id: string, on: boolean): void {
    this.draft.update((d) => {
      const ids = new Set(d.channelIds);
      if (on) ids.add(id);
      else ids.delete(id);
      return { ...d, channelIds: ids };
    });
  }

  protected openNew(): void {
    this.dialogError.set(null);
    this.draft.set({ ...EMPTY, memberUserIds: new Set(), channelIds: new Set() });
    this.editing.set(null);
  }

  protected openEdit(t: TeamDto): void {
    this.dialogError.set(null);
    this.draft.set({
      name: t.name ?? '',
      description: t.description ?? '',
      leadUserId: t.leadUserId ?? '',
      assignmentStrategy: t.assignmentStrategy ?? TeamAssignmentStrategy.RoundRobin,
      memberUserIds: new Set((t.members ?? []).map((m) => m.userId!).filter((id) => !!id)),
      channelIds: new Set(t.channelIds ?? []),
    });
    this.editing.set(t);
  }

  protected async save(): Promise<void> {
    const d = this.draft();
    if (d.name.trim().length < 2) {
      this.dialogError.set('Give the team a name.');
      return;
    }
    this.busy.set(true);
    this.dialogError.set(null);
    try {
      const input = {
        name: d.name.trim(),
        description: d.description.trim() || null,
        leadUserId: d.leadUserId || null,
        assignmentStrategy: d.assignmentStrategy,
        memberUserIds: [...d.memberUserIds],
        channelIds: [...d.channelIds],
      };
      const t = this.editing();
      if (!environment.useMockData) {
        await firstValueFrom(t?.id ? this.api.update(t.id, input) : this.api.create(input)).catch(() => {});
      }
      this.toasts.success(t?.id ? `"${input.name}" saved.` : `Team "${input.name}" created.`);
      this.close();
      await this.load();
    } catch (e: unknown) {
      this.dialogError.set(readApiError(e, 'The team could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(t: TeamDto): Promise<void> {
    if (
      !(await this.dialogs.delete(
        'team',
        t.name ?? 'this team',
        'Its members stay in the workspace. Call menu options that ring it must be pointed at another team.',
      ))
    ) {
      return;
    }
    try {
      if (!environment.useMockData) {
        await firstValueFrom(this.api.delete(t.id!)).catch(() => {});
      }
      this.teams.update((list) => list.filter((x) => x.id !== t.id));
      this.toasts.info(`Team "${t.name}" deleted.`);
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The team could not be deleted.'));
    }
  }
}
