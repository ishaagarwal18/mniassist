import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ConversationLabelService } from '../../proxy/messaging/conversation-label.service';
import { InboxService as InboxApi } from '../../proxy/messaging/inbox.service';
import type { ConversationLabelDto } from '../../proxy/messaging/models';

/** Adds or removes one id, keeping the rest in order. */
export function toggleId(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

/** The labels on one conversation, shown as coloured chips, with a menu to add or remove them (saved at once). */
@Component({
  selector: 'ar-conversation-label-picker',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './conversation-label-picker.scss',
  template: `
    <span class="clp">
      @for (l of applied(); track l.id) {
        <span class="clp__chip" translate="no">
          <span class="clp__dot" [style.background]="l.colourHex"></span>{{ l.name }}
        </span>
      }
      <button
        type="button"
        class="clp__add"
        [attr.aria-expanded]="open()"
        [disabled]="busy()"
        (click)="open.set(!open())"
      >
        {{ applied().length ? 'Labels' : '+ Label' }}
      </button>
      @if (open()) {
        <span class="clp__menu" role="menu">
          @for (l of all(); track l.id) {
            <label
              class="clp__option"
              role="menuitemcheckbox"
              [attr.aria-checked]="selected().includes(l.id!)"
            >
              <input
                type="checkbox"
                [checked]="selected().includes(l.id!)"
                (change)="toggle(l.id!)"
              />
              <span class="clp__dot" [style.background]="l.colourHex"></span>
              <span translate="no">{{ l.name }}</span>
            </label>
          } @empty {
            <span class="clp__empty">
              No labels yet. <a routerLink="/settings/labels">Create some</a>.
            </span>
          }
        </span>
      }
    </span>
  `,
})
export class ArConversationLabelPicker {
  private readonly labels = inject(ConversationLabelService);
  private readonly inbox = inject(InboxApi);
  private readonly toasts = inject(ToastService);

  readonly conversationId = input.required<string>();

  protected readonly all = signal<ConversationLabelDto[]>([]);
  protected readonly selected = signal<string[]>([]);
  protected readonly open = signal(false);
  protected readonly busy = signal(false);

  protected readonly applied = computed(() =>
    this.all().filter((l) => l.id && this.selected().includes(l.id)),
  );

  constructor() {
    firstValueFrom(
      this.labels.getList(
        { skipCount: 0, maxResultCount: 200, sorting: 'name' },
        { skipHandleError: true },
      ),
    ).then(
      (p) => this.all.set(p.items ?? []),
      () => this.all.set([]),
    );
    effect(() => {
      const id = this.conversationId();
      untracked(() => void this.loadApplied(id));
    });
  }

  private async loadApplied(conversationId: string): Promise<void> {
    this.open.set(false);
    try {
      const ctx = await firstValueFrom(
        this.inbox.getContext(conversationId, { skipHandleError: true }),
      );
      if (conversationId === this.conversationId()) {
        this.selected.set((ctx.labels ?? []).map((l) => l.id!).filter(Boolean));
      }
    } catch {
      this.selected.set([]);
    }
  }

  protected async toggle(id: string): Promise<void> {
    const before = this.selected();
    const next = toggleId(before, id);
    this.selected.set(next);
    this.busy.set(true);
    try {
      await firstValueFrom(
        this.labels.setForConversation(
          this.conversationId(),
          { labelIds: next },
          { skipHandleError: true },
        ),
      );
    } catch (e: unknown) {
      this.selected.set(before);
      this.toasts.error(readApiError(e, 'The labels could not be saved.'), 'Inbox');
    } finally {
      this.busy.set(false);
    }
  }
}
