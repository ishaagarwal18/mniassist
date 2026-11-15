import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { PermissionService } from '@abp/ng.core';
import { grantedPolicy } from '../../core/auth/permission';
import { ChannelService } from '../../core/services/channel.service';
import { DECISION_ROLES } from '../contacts/contact-form.logic';
import { DecisionRole } from '../../proxy/contacts';
import type {
  AssignmentRuleDto,
  CreateUpdateAssignmentRuleDto,
  TeamDto,
  WorkspaceMemberDto,
} from '../../proxy/identity/models';
import { TeamService } from '../../proxy/identity/team.service';
import { WorkspaceMemberService } from '../../proxy/identity/workspace-member.service';
import { ArButton, ArChip } from '../../ui';
import { ArDialog } from '../../ui/dialog';

/** The rule being added or edited in the dialog. Empty strings mean "not set". */
export interface RuleDraft {
  id?: string;
  priority: number;
  name: string;
  isEnabled: boolean;
  channelId: string;
  keywords: string;
  contactRole: string;
  attributeKey: string;
  attributeValue: string;
  contactState: string;
  /** "user:<id>" or "team:<id>". */
  assignTo: string;
}

export function ruleToDraft(r: AssignmentRuleDto | null, nextPriority: number): RuleDraft {
  return {
    id: r?.id,
    priority: r?.priority ?? nextPriority,
    name: r?.name ?? '',
    isEnabled: r?.isEnabled ?? true,
    channelId: r?.channelId ?? '',
    keywords: r?.keywords ?? '',
    contactRole: r?.contactRole == null ? '' : String(r.contactRole),
    attributeKey: r?.attributeKey ?? '',
    attributeValue: r?.attributeValue ?? '',
    contactState: r?.contactState ?? '',
    assignTo: r?.assignToTeamId
      ? `team:${r.assignToTeamId}`
      : r?.assignToUserId
        ? `user:${r.assignToUserId}`
        : '',
  };
}

/** Problems with a draft, keyed by input; empty when it can be saved. */
export function ruleDraftProblems(d: RuleDraft): Record<string, string> {
  const p: Record<string, string> = {};
  if (!d.name.trim()) p['name'] = 'Give the rule a name.';
  else if (d.name.trim().length > 128) p['name'] = 'Keep the name to 128 characters.';
  if (!d.assignTo) p['assignTo'] = 'Choose who gets the conversation.';
  if (d.keywords.length > 512) p['keywords'] = 'Keep the keywords to 512 characters.';
  if (d.attributeValue.trim() && !d.attributeKey.trim())
    p['attributeKey'] = 'Name the contact detail to compare.';
  return p;
}

export function draftToRuleInput(d: RuleDraft): CreateUpdateAssignmentRuleDto {
  const [kind, id] = d.assignTo.split(':');
  const keywords = d.keywords
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k)
    .join(', ');
  return {
    name: d.name.trim(),
    priority: d.priority,
    isEnabled: d.isEnabled,
    channelId: d.channelId || null,
    keywords: keywords || null,
    contactRole: d.contactRole === '' ? null : (Number(d.contactRole) as DecisionRole),
    attributeKey: d.attributeKey.trim() || null,
    attributeValue: d.attributeKey.trim() ? d.attributeValue.trim() || null : null,
    contactState: d.contactState.trim() || null,
    assignToUserId: kind === 'user' ? id : null,
    assignToTeamId: kind === 'team' ? id : null,
  };
}

/** Moves the item at `from` one place up (-1) or down (+1); out-of-range moves return the list unchanged. */
export function moveItem<T>(list: readonly T[], from: number, step: -1 | 1): T[] {
  const to = from + step;
  if (from < 0 || from >= list.length || to < 0 || to >= list.length) return [...list];
  const next = [...list];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

/** In words, what a rule matches on. */
export function ruleSummary(r: AssignmentRuleDto): string {
  const parts: string[] = [];
  if (r.keywords) parts.push(`message mentions “${r.keywords}”`);
  if (r.attributeKey) parts.push(`${r.attributeKey} is ${r.attributeValue ?? 'set'}`);
  if (r.contactRole != null) {
    const role = DECISION_ROLES.find((o) => o.value === r.contactRole)?.label ?? 'a set role';
    parts.push(`contact is ${role.toLowerCase()}`);
  }
  if (r.contactState) parts.push(`contact in ${r.contactState}`);
  if (r.channelId) parts.push('on one number');
  return parts.length ? parts.join(' and ') : 'every new conversation';
}

/**
 * Conversation routing rules in the order they are tried: the first rule that matches decides who gets the chat.
 * Add or edit a rule, reorder with the arrows (saved straight away), or delete one.
 */
@Component({
  selector: 'ar-routing-rules-card',
  imports: [ArButton, ArChip, ArDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../shared/work-page.scss', './routing-rules-card.scss'],
  template: `
    <section class="wp__card">
      <div class="wp__row">
        <h2 class="wp__title wp__grow">Routing rules</h2>
        @if (canManage()) {
          <button ar-button type="button" variant="primary" [disabled]="busy()" (click)="openNew()">
            Add rule
          </button>
        }
      </div>
      <p class="wp__muted">
        Tried from the top. The first rule that matches assigns the conversation.
      </p>
      <ol class="wp__list">
        @for (r of rules(); track r.id; let i = $index, last = $last) {
          <li class="wp__item">
            <span class="ar-mono">{{ i + 1 }}</span>
            <span class="wp__grow">
              <span class="wp__name" translate="no">{{ r.name }}</span>
              <span class="wp__sub">
                When {{ summary(r) }} → {{ r.assignToTeamName ?? r.assignToUserName ?? 'nobody' }}
              </span>
            </span>
            @if (!r.isEnabled) {
              <ar-chip tone="neutral">Off</ar-chip>
            }
            <button
              ar-button
              type="button"
              variant="ghost"
              [attr.aria-label]="'Move ' + r.name + ' up'"
              [disabled]="busy() || i === 0"
              (click)="move(i, -1)"
            >
              ↑
            </button>
            <button
              ar-button
              type="button"
              variant="ghost"
              [attr.aria-label]="'Move ' + r.name + ' down'"
              [disabled]="busy() || last"
              (click)="move(i, 1)"
            >
              ↓
            </button>
            <button
              ar-button
              type="button"
              variant="ghost"
              [attr.aria-label]="'Edit ' + r.name"
              [disabled]="busy()"
              (click)="openEdit(r)"
            >
              Edit
            </button>
            <button ar-button type="button" variant="ghost" [disabled]="busy()" (click)="remove(r)">
              Delete
            </button>
          </li>
        } @empty {
          <li class="wp__empty">
            No routing rules. New conversations go to whoever picks them up.
          </li>
        }
      </ol>
    </section>

    @if (draft(); as d) {
      <ar-dialog [title]="d.id ? 'Edit rule' : 'Add a routing rule'" (dismiss)="draft.set(null)">
        <div class="rd">
          <label class="ar-field" for="rr-name">
            <span class="ar-field__label">Name</span>
            <input
              id="rr-name"
              class="ar-field__input"
              maxlength="128"
              placeholder="e.g. Pune spares enquiries"
              [attr.aria-invalid]="problems()['name'] ? 'true' : null"
              [value]="d.name"
              (input)="patch({ name: $any($event.target).value })"
            />
            @if (problems()['name']; as e) {
              <small class="ar-field__error">{{ e }}</small>
            }
          </label>

          <p class="rd__h">When a new conversation</p>
          <p class="wp__muted">
            Leave a condition empty to ignore it. Every filled one must match.
          </p>
          <div class="rd__row">
            <label class="ar-field" for="rr-channel">
              <span class="ar-field__label">Arrives on</span>
              <select
                id="rr-channel"
                class="ar-field__input"
                (change)="patch({ channelId: $any($event.target).value })"
              >
                <option value="" [selected]="!d.channelId">Any number</option>
                @for (c of channels(); track c.id) {
                  <option [value]="c.id" [selected]="c.id === d.channelId" translate="no">
                    {{ c.displayName }} · {{ c.displayPhone }}
                  </option>
                }
              </select>
            </label>
            <label class="ar-field" for="rr-role">
              <span class="ar-field__label">Contact role</span>
              <select
                id="rr-role"
                class="ar-field__input"
                (change)="patch({ contactRole: $any($event.target).value })"
              >
                <option value="" [selected]="d.contactRole === ''">Any role</option>
                @for (o of roles; track o.value) {
                  <option [value]="o.value" [selected]="'' + o.value === d.contactRole">
                    {{ o.label }}
                  </option>
                }
              </select>
            </label>
          </div>
          <label class="ar-field" for="rr-keywords">
            <span class="ar-field__label">First message mentions</span>
            <span class="ar-field__hint">Words separated by commas; any one of them matches.</span>
            <input
              id="rr-keywords"
              class="ar-field__input"
              maxlength="512"
              placeholder="spares, breakdown, quote"
              [value]="d.keywords"
              (input)="patch({ keywords: $any($event.target).value })"
            />
          </label>
          <label class="ar-field" for="rr-state">
            <span class="ar-field__label">Contact state</span>
            <input
              id="rr-state"
              class="ar-field__input"
              placeholder="e.g. Maharashtra"
              [value]="d.contactState"
              (input)="patch({ contactState: $any($event.target).value })"
            />
          </label>
          <div class="rd__row">
            <label class="ar-field" for="rr-attr-key">
              <span class="ar-field__label">Contact detail (key)</span>
              <input
                id="rr-attr-key"
                class="ar-field__input ar-mono"
                translate="no"
                maxlength="64"
                placeholder="plant_site"
                [attr.aria-invalid]="problems()['attributeKey'] ? 'true' : null"
                [value]="d.attributeKey"
                (input)="patch({ attributeKey: $any($event.target).value })"
              />
              @if (problems()['attributeKey']; as e) {
                <small class="ar-field__error">{{ e }}</small>
              }
            </label>
            <label class="ar-field" for="rr-attr-value">
              <span class="ar-field__label">equals</span>
              <input
                id="rr-attr-value"
                class="ar-field__input"
                maxlength="256"
                [value]="d.attributeValue"
                (input)="patch({ attributeValue: $any($event.target).value })"
              />
            </label>
          </div>

          <p class="rd__h">Assign it to</p>
          <label class="ar-field" for="rr-assign">
            <span class="ar-field__label">Person or team</span>
            <select
              id="rr-assign"
              class="ar-field__input"
              [attr.aria-invalid]="problems()['assignTo'] ? 'true' : null"
              (change)="patch({ assignTo: $any($event.target).value })"
            >
              <option value="" [selected]="!d.assignTo">Choose</option>
              @if (teams().length) {
                <optgroup label="Teams">
                  @for (t of teams(); track t.id) {
                    <option [value]="'team:' + t.id" [selected]="'team:' + t.id === d.assignTo">
                      {{ t.name }}
                    </option>
                  }
                </optgroup>
              }
              <optgroup label="People">
                @for (m of members(); track m.userId) {
                  <option
                    [value]="'user:' + m.userId"
                    [selected]="'user:' + m.userId === d.assignTo"
                  >
                    {{ m.name || m.userName }}
                  </option>
                }
              </optgroup>
            </select>
            @if (problems()['assignTo']; as e) {
              <small class="ar-field__error">{{ e }}</small>
            }
          </label>
          <label class="rd__check" for="rr-enabled">
            <input
              id="rr-enabled"
              type="checkbox"
              [checked]="d.isEnabled"
              (change)="patch({ isEnabled: $any($event.target).checked })"
            />
            Rule is on
          </label>
        </div>
        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="draft.set(null)">Cancel</button>
          <button ar-button type="button" variant="primary" [disabled]="busy()" (click)="save()">
            {{ busy() ? 'Saving' : d.id ? 'Save rule' : 'Add rule' }}
          </button>
        </div>
      </ar-dialog>
    }
  `,
})
export class ArRoutingRulesCard implements OnInit {
  private readonly api = inject(TeamService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);

  private readonly memberApi = inject(WorkspaceMemberService);
  protected readonly channels = inject(ChannelService).channels;
  protected readonly canManage = grantedPolicy('AutoReach.Teams.Manage', inject(PermissionService));
  protected readonly roles = DECISION_ROLES;

  protected readonly rules = signal<AssignmentRuleDto[]>([]);
  protected readonly busy = signal(false);
  protected readonly teams = signal<TeamDto[]>([]);
  protected readonly members = signal<WorkspaceMemberDto[]>([]);
  protected readonly draft = signal<RuleDraft | null>(null);
  protected readonly problems = signal<Record<string, string>>({});

  /** Teams and people to assign to, loaded the first time the dialog opens. */
  private async loadTargets(): Promise<void> {
    if (this.teams().length || this.members().length) return;
    try {
      const [teams, members] = await Promise.all([
        firstValueFrom(
          this.api.getList({ maxResultCount: 200, skipCount: 0 }, { skipHandleError: true }),
        ),
        firstValueFrom(this.memberApi.getList({ skipHandleError: true })),
      ]);
      this.teams.set([...(teams.items ?? [])].filter((t) => t.isActive !== false));
      this.members.set(
        [...(members?.items ?? [])]
          .filter((m) => m.isActive !== false)
          .sort((a, b) => (a.name || a.userName || '').localeCompare(b.name || b.userName || '')),
      );
    } catch {
      // The lists stay empty; saving then asks for someone to assign to.
    }
  }

  protected openNew(): void {
    const last = this.rules().at(-1)?.priority ?? 0;
    this.problems.set({});
    this.draft.set(ruleToDraft(null, last + 10));
    void this.loadTargets();
  }

  protected openEdit(r: AssignmentRuleDto): void {
    this.problems.set({});
    this.draft.set(ruleToDraft(r, r.priority ?? 0));
    void this.loadTargets();
  }

  protected patch(change: Partial<RuleDraft>): void {
    this.draft.update((d) => (d ? { ...d, ...change } : d));
    const d = this.draft();
    if (d && Object.keys(this.problems()).length) this.problems.set(ruleDraftProblems(d));
  }

  protected async save(): Promise<void> {
    const d = this.draft();
    if (!d) return;
    const problems = ruleDraftProblems(d);
    this.problems.set(problems);
    if (Object.keys(problems).length) return;
    this.busy.set(true);
    try {
      const input = draftToRuleInput(d);
      await firstValueFrom(
        d.id
          ? this.api.updateRule(d.id, input, { skipHandleError: true })
          : this.api.createRule(input, { skipHandleError: true }),
      );
      this.toasts.success(d.id ? 'Rule saved.' : 'Rule added.', 'Routing rules');
      this.draft.set(null);
      await this.load();
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The rule could not be saved.'), 'Routing rules');
    } finally {
      this.busy.set(false);
    }
  }

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected summary(r: AssignmentRuleDto): string {
    return ruleSummary(r);
  }

  private async load(): Promise<void> {
    try {
      const list = (await firstValueFrom(this.api.getRules({ skipHandleError: true }))).items ?? [];
      this.rules.set([...list].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0)));
    } catch {
      this.rules.set([]);
    }
  }

  protected async move(i: number, step: -1 | 1): Promise<void> {
    const before = this.rules();
    const next = moveItem(before, i, step);
    this.rules.set(next);
    this.busy.set(true);
    try {
      await firstValueFrom(
        this.api.reorderRules(
          next.map((r) => r.id!),
          { skipHandleError: true },
        ),
      );
    } catch (e: unknown) {
      this.rules.set(before);
      this.toasts.error(readApiError(e, 'The new order could not be saved.'), 'Routing rules');
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(r: AssignmentRuleDto): Promise<void> {
    if (!(await this.dialogs.delete('rule', r.name))) return;
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.deleteRule(r.id!, { skipHandleError: true }));
      await this.load();
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The rule could not be deleted.'), 'Routing rules');
    } finally {
      this.busy.set(false);
    }
  }
}
