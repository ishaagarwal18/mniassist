import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import type { AssignmentRuleDto } from '../../proxy/identity/models';
import { TeamService } from '../../proxy/identity/team.service';
import { ArButton, ArChip } from '../../ui';

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
  if (r.contactState) parts.push(`contact in ${r.contactState}`);
  if (r.channelId) parts.push('on one number');
  return parts.length ? parts.join(' and ') : 'every new conversation';
}

/**
 * Conversation routing rules in the order they are tried: the first rule that matches decides who gets the chat.
 * Reorder with the arrows (saved straight away), or delete a rule.
 */
@Component({
  selector: 'ar-routing-rules-card',
  imports: [ArButton, ArChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../shared/work-page.scss',
  styles: `
    :host {
      display: block;
      height: auto;
    }
  `,
  template: `
    <section class="wp__card">
      <h2 class="wp__title">Routing rules</h2>
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
  `,
})
export class ArRoutingRulesCard implements OnInit {
  private readonly api = inject(TeamService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);

  protected readonly rules = signal<AssignmentRuleDto[]>([]);
  protected readonly busy = signal(false);

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
