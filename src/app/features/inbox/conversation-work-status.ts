import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';

import { InboxService } from '../../core/services/inbox.service';
import type {
  ConversationWorkPriority,
  ConversationWorkStatus,
} from '../../core/models/conversation.model';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';

export const WORK_STATUS_LABEL: Record<ConversationWorkStatus, string> = {
  open: 'Open',
  pending: 'Waiting on customer',
  resolved: 'Resolved',
};

export const WORK_PRIORITY_LABEL: Record<ConversationWorkPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

/** The list chip for a conversation: only priorities above normal and "waiting" are worth the space. */
export function workChipFor(c: {
  status?: ConversationWorkStatus;
  priority?: ConversationWorkPriority;
}): { label: string; tone: 'bad' | 'warn' | 'neutral' } | null {
  if (c.priority === 'urgent') return { label: 'Urgent', tone: 'bad' };
  if (c.priority === 'high') return { label: 'High priority', tone: 'warn' };
  if (c.status === 'pending') return { label: 'Waiting on customer', tone: 'neutral' };
  return null;
}

/**
 * Working status and priority of one conversation (requirement M06-7), saved as soon as either changes.
 * Separate from Resolve/Reopen: those move the thread out of the queue, this tracks where the work stands.
 */
@Component({
  selector: 'ar-conversation-work-status',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="cws">
      <label class="cws__field">
        <span class="cws__label">Status</span>
        <select
          class="cws__select"
          [disabled]="!canEdit() || busy()"
          [value]="status()"
          (change)="save(asStatus($event), priority())"
          aria-label="Conversation status"
        >
          @for (s of statuses; track s) {
            <option [value]="s" [selected]="s === status()">{{ statusLabel[s] }}</option>
          }
        </select>
      </label>
      <label class="cws__field">
        <span class="cws__label">Priority</span>
        <select
          class="cws__select"
          [class.cws__select--hot]="priority() === 'urgent' || priority() === 'high'"
          [disabled]="!canEdit() || busy()"
          [value]="priority()"
          (change)="save(status(), asPriority($event))"
          aria-label="Conversation priority"
        >
          @for (p of priorities; track p) {
            <option [value]="p" [selected]="p === priority()">{{ priorityLabel[p] }}</option>
          }
        </select>
      </label>
    </span>
  `,
  styleUrl: './conversation-work-status.scss',
})
export class ArConversationWorkStatus {
  private readonly inbox = inject(InboxService);
  private readonly toasts = inject(ToastService);

  readonly conversationId = input.required<string>();
  readonly status = input<ConversationWorkStatus>('open');
  readonly priority = input<ConversationWorkPriority>('normal');
  readonly canEdit = input(true);

  protected readonly busy = signal(false);
  protected readonly statuses: ConversationWorkStatus[] = ['open', 'pending', 'resolved'];
  protected readonly priorities: ConversationWorkPriority[] = ['low', 'normal', 'high', 'urgent'];
  protected readonly statusLabel = WORK_STATUS_LABEL;
  protected readonly priorityLabel = WORK_PRIORITY_LABEL;

  protected asStatus(e: Event): ConversationWorkStatus {
    return (e.target as HTMLSelectElement).value as ConversationWorkStatus;
  }

  protected asPriority(e: Event): ConversationWorkPriority {
    return (e.target as HTMLSelectElement).value as ConversationWorkPriority;
  }

  protected async save(
    status: ConversationWorkStatus,
    priority: ConversationWorkPriority,
  ): Promise<void> {
    this.busy.set(true);
    try {
      await this.inbox.setWorkStatus(this.conversationId(), status, priority);
      this.toasts.success(
        status === 'resolved' && this.status() !== 'resolved'
          ? 'Marked resolved. A new message from the customer opens it again.'
          : `Status: ${WORK_STATUS_LABEL[status]} · Priority: ${WORK_PRIORITY_LABEL[priority]}.`,
        'Inbox',
      );
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The status could not be saved.'), 'Inbox');
    } finally {
      this.busy.set(false);
    }
  }
}
