import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { PermissionService } from '@abp/ng.core';
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

/**
 * Teams: groups of agents that share conversations, and that a WhatsApp call menu option
 * rings (an English desk, a Hindi desk). Each team says who is in it, who leads it, how new
 * conversations are shared out, and which WhatsApp numbers it handles.
 */
@Component({
  selector: 'ar-teams',
  imports: [ArTopbar, ArButton, ArBanner, ArChip, ArDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Teams"
      [subtitle]="teams().length + ' team' + (teams().length === 1 ? '' : 's')"
      help="A team is a group of agents who share conversations. A WhatsApp call menu option rings one team, and assignment rules can route a number's chats to one."
    >
      @if (canManage()) {
        <button ar-button variant="primary" icon="plus" (click)="openNew()">New team</button>
      }
    </ar-topbar>

    <div class="tm ar-scroll">
      @if (error(); as e) {
        <ar-banner tone="bad">{{ e }}</ar-banner>
      }
      @if (loading()) {
        <p class="tm__note">Loading teams…</p>
      } @else if (teams().length === 0) {
        <section class="tm__empty">
          <h2 class="tm__empty-t">No teams yet</h2>
          <p class="tm__note">
            Make one for each desk that takes calls or chats: for example “English desk” and “Hindi
            desk”, each with the agents who speak that language.
          </p>
          @if (canManage()) {
            <button ar-button variant="primary" icon="plus" (click)="openNew()">
              Create the first team
            </button>
          }
        </section>
      } @else {
        @for (t of teams(); track t.id) {
          <article class="tm__card">
            <div class="tm__main">
              <h2 class="tm__name">
                {{ t.name }}
                @if (t.isActive === false) {
                  <ar-chip tone="neutral">Inactive</ar-chip>
                }
              </h2>
              @if (t.description) {
                <p class="tm__note">{{ t.description }}</p>
              }
              <p class="tm__meta">
                {{ strategyLabel(t.assignmentStrategy) }}
                @if (t.leadUserName) {
                  · led by {{ t.leadUserName }}
                }
                · {{ t.openConversationCount ?? 0 }} open conversation{{
                  t.openConversationCount === 1 ? '' : 's'
                }}
              </p>
              <ul class="tm__people">
                @for (m of t.members ?? []; track m.userId) {
                  <li class="tm__person">{{ m.name || m.userName }}</li>
                } @empty {
                  <li class="tm__note">Nobody in this team yet.</li>
                }
              </ul>
            </div>
            @if (canManage()) {
              <div class="tm__actions">
                <button ar-button variant="ghost" (click)="openEdit(t)">Edit</button>
                <button ar-button variant="ghost" (click)="remove(t)">Delete</button>
              </div>
            }
          </article>
        }
      }
    </div>

    @if (editing() !== undefined) {
      <ar-dialog
        [title]="editing() ? 'Edit team' : 'New team'"
        width="min(560px, calc(100vw - 32px))"
        (dismiss)="editing.set(undefined)"
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
          <span class="ar-field__label"
            >Description <span class="ar-field__opt">optional</span></span
          >
          <input
            class="ar-field__input"
            maxlength="256"
            placeholder="What this team handles"
            [value]="draft().description"
            (input)="patch({ description: $any($event.target).value })"
          />
        </label>

        <fieldset class="tm__set">
          <legend class="ar-field__label">Members</legend>
          @if (members().length === 0) {
            <p class="tm__note">
              No active members in the workspace yet. Invite them under Members.
            </p>
          }
          <div class="tm__checks">
            @for (m of members(); track m.userId) {
              <label class="tm__check">
                <input
                  type="checkbox"
                  [checked]="draft().memberUserIds.has(m.userId!)"
                  (change)="toggleMember(m.userId!, $any($event.target).checked)"
                />
                <span>{{ m.name || m.userName }}</span>
                <span class="tm__sub">{{ m.email }}</span>
              </label>
            }
          </div>
        </fieldset>

        <div class="ar-field-row">
          <label class="ar-field">
            <span class="ar-field__label">Lead <span class="ar-field__opt">optional</span></span>
            <select
              class="ar-field__input"
              (change)="patch({ leadUserId: $any($event.target).value })"
            >
              <option value="" [selected]="!draft().leadUserId">No lead</option>
              @for (m of chosenMembers(); track m.userId) {
                <option [value]="m.userId" [selected]="m.userId === draft().leadUserId">
                  {{ m.name || m.userName }}
                </option>
              }
            </select>
          </label>
          <label class="ar-field">
            <span class="ar-field__label">Share new conversations</span>
            <select
              class="ar-field__input"
              (change)="patch({ assignmentStrategy: +$any($event.target).value })"
            >
              @for (s of strategies; track s.value) {
                <option [value]="s.value" [selected]="s.value === draft().assignmentStrategy">
                  {{ s.label }}
                </option>
              }
            </select>
          </label>
        </div>
        <p class="tm__note">{{ strategyHint(draft().assignmentStrategy) }}</p>

        @if (channels().length) {
          <fieldset class="tm__set">
            <legend class="ar-field__label">
              WhatsApp numbers <span class="ar-field__opt">optional</span>
            </legend>
            <div class="tm__checks">
              @for (c of channels(); track c.id) {
                <label class="tm__check">
                  <input
                    type="checkbox"
                    [checked]="draft().channelIds.has(c.id)"
                    (change)="toggleChannel(c.id, $any($event.target).checked)"
                  />
                  <span>{{ c.displayName }}</span>
                  <span class="tm__sub ar-mono">{{ c.displayPhone }}</span>
                </label>
              }
            </div>
          </fieldset>
        }

        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="editing.set(undefined)">
            Cancel
          </button>
          <button ar-button type="button" variant="primary" [disabled]="busy()" (click)="save()">
            {{ busy() ? 'Saving…' : editing() ? 'Save changes' : 'Create team' }}
          </button>
        </div>
      </ar-dialog>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }
    .tm {
      flex: 1;
      min-height: 0;
      padding: 18px 24px 28px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .tm__card,
    .tm__empty {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      justify-content: space-between;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      padding: 16px 18px;
    }
    .tm__empty {
      flex-direction: column;
      align-items: flex-start;
    }
    .tm__empty-t,
    .tm__name {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font: 600 14px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .tm__main {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .tm__note,
    .tm__meta {
      margin: 0;
      font: 400 12.5px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .tm__people {
      list-style: none;
      margin: 4px 0 0;
      padding: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .tm__person {
      padding: 2px 10px;
      border: 1px solid var(--ar-line-200);
      border-radius: 999px;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .tm__actions {
      display: flex;
      gap: 6px;
      flex: none;
    }
    .tm__set {
      margin: 12px 0 0;
      padding: 0;
      border: 0;
    }
    .tm__checks {
      display: flex;
      flex-direction: column;
      gap: 2px;
      max-height: 200px;
      overflow-y: auto;
      margin-top: 6px;
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-control);
      padding: 6px;
    }
    .tm__check {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 6px;
      border-radius: 4px;
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-900);
      cursor: pointer;
    }
    .tm__check:hover {
      background: var(--ar-bg-50);
    }
    .tm__sub {
      margin-left: auto;
      font-size: 12px;
      color: var(--ar-ink-400);
    }
    @media (max-width: 640px) {
      .tm {
        padding: 14px 12px 24px;
      }
      .tm__card {
        flex-direction: column;
      }
    }
  `,
})
export class ArTeams {
  private readonly api = inject(TeamService);
  private readonly memberApi = inject(WorkspaceMemberService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);
  private readonly permissions = inject(PermissionService);
  protected readonly channels = inject(ChannelService).channels;

  protected readonly canManage = grantedPolicy('AutoReach.Teams.Manage', this.permissions);
  protected readonly strategies = STRATEGIES;

  protected readonly teams = signal<TeamDto[]>([]);
  private readonly allMembers = signal<WorkspaceMemberDto[]>([]);
  protected readonly members = computed(() =>
    this.allMembers().filter((m) => m.isActive !== false && m.userId),
  );
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  /** undefined: closed; null: a new team; a team: editing it. */
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
    if (environment.useMockData) {
      this.loading.set(false);
      return;
    }
    try {
      const [teams, members] = await Promise.all([
        firstValueFrom(this.api.getList({ maxResultCount: 200, skipCount: 0 })),
        firstValueFrom(this.memberApi.getList()),
      ]);
      this.teams.set(
        [...(teams.items ?? [])].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
      );
      this.allMembers.set([...(members?.items ?? [])]);
      this.error.set(null);
    } catch (e: unknown) {
      this.error.set(readApiError(e, 'The teams could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected strategyLabel(s: TeamAssignmentStrategy | undefined): string {
    return STRATEGIES.find((x) => x.value === s)?.label ?? 'Take turns';
  }
  protected strategyHint(s: TeamAssignmentStrategy): string {
    return STRATEGIES.find((x) => x.value === s)?.hint ?? '';
  }

  protected patch(p: Partial<Draft>): void {
    this.draft.update((d) => ({ ...d, ...p }));
  }

  protected toggleMember(userId: string, on: boolean): void {
    this.draft.update((d) => {
      const ids = new Set(d.memberUserIds);
      if (on) ids.add(userId);
      else ids.delete(userId);
      // A lead who left the team is no longer its lead.
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
      await firstValueFrom(t?.id ? this.api.update(t.id, input) : this.api.create(input));
      this.toasts.success(t ? `“${input.name}” saved.` : `Team “${input.name}” created.`);
      this.editing.set(undefined);
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
      await firstValueFrom(this.api.delete(t.id!));
      this.toasts.info(`Team “${t.name}” deleted.`);
      await this.load();
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The team could not be deleted.'));
    }
  }
}
