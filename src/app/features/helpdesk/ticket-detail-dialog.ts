import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { PermissionService } from '@abp/ng.core';
import {
  ServiceTicketDetailDto,
  ServiceTicketDto,
  TicketPriority,
  TicketStatus,
} from '../../proxy/support';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { ArSelect } from '../../ui/select';
import { ChipTone } from '../../ui/chip';
import { errorMessage } from '../activities/activity-logic';
import { ActivityDirectory } from '../activities/activity-directory';
import {
  PRIORITY_CHOICES,
  PRIORITY_LABEL,
  STATUS_CHOICES,
  STATUS_LABEL,
  dueLabel,
  isFinished,
} from './ticket-logic';
import { ServiceTicketGateway } from './ticket-mock';

const STATUS_TONE: Record<TicketStatus, ChipTone> = {
  [TicketStatus.Open]: 'amber',
  [TicketStatus.Pending]: 'teal',
  [TicketStatus.Resolved]: 'good',
  [TicketStatus.Closed]: 'neutral',
};

const PRIORITY_TONE: Record<TicketPriority, ChipTone> = {
  [TicketPriority.Urgent]: 'bad',
  [TicketPriority.High]: 'warn',
  [TicketPriority.Normal]: 'neutral',
  [TicketPriority.Low]: 'neutral',
};

/** A ticket's full record: status, priority and assignee, its thread of internal notes and customer replies, and a reply
 *  composer that sends through the ticket's own conversation. */
@Component({
  selector: 'ar-ticket-detail-dialog',
  imports: [ArDialog, ArButton, ArChip, ArSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog [title]="loaded()?.reference || 'Ticket'" (dismiss)="closed.emit(changed())">
      @if (loading()) {
        <p class="td__hint">Loading…</p>
      } @else if (loaded(); as t) {
        <div class="td__head">
          <strong class="td__subject">{{ t.subject }}</strong>
          <div class="td__chips">
            <ar-chip [tone]="STATUS_TONE[t.status]">{{ STATUS_LABEL[t.status] }}</ar-chip>
            <ar-chip [tone]="PRIORITY_TONE[t.priority]">{{ PRIORITY_LABEL[t.priority] }}</ar-chip>
            @if (due(); as d) {
              <span class="td__due" [class.td__due--bad]="t.isOverdue">{{ d }}</span>
            }
          </div>
          <p class="td__who">
            {{ t.contactName || t.contactNumber }}
            @if (t.enquiryReference) {
              · deal {{ t.enquiryReference }}
            }
          </p>
          @if (t.description) {
            <p class="td__desc">{{ t.description }}</p>
          }
        </div>

        @if (canUpdate) {
          <div class="ar-field-row">
            <label class="ar-field" for="td-status">
              <span class="ar-field__label">Status</span>
              <select
                required
                id="td-status"
                class="ar-field__input"
                [disabled]="savingField() === 'status'"
                (change)="setStatus(+$any($event.target).value)"
              >
                @for (s of statusChoices; track s) {
                  <option [value]="s" [selected]="s === t.status">{{ STATUS_LABEL[s] }}</option>
                }
              </select>
            </label>
            <label class="ar-field" for="td-priority">
              <span class="ar-field__label">Priority</span>
              <select
                required
                id="td-priority"
                class="ar-field__input"
                [disabled]="savingField() === 'priority'"
                (change)="setPriority(+$any($event.target).value)"
              >
                @for (p of priorityChoices; track p) {
                  <option [value]="p" [selected]="p === t.priority">{{ PRIORITY_LABEL[p] }}</option>
                }
              </select>
            </label>
          </div>

          <label class="ar-field" for="td-assignee">
            <span class="ar-field__label"
              >Assigned to <span class="ar-field__opt">optional</span></span
            >
            <select
              id="td-assignee"
              class="ar-field__input"
              [disabled]="savingField() === 'assign'"
              (change)="assign($any($event.target).value || null)"
            >
              <option value="" [selected]="!t.assignedUserId">Unassigned</option>
              @for (u of directory.users(); track u.userId) {
                <option [value]="u.userId" [selected]="u.userId === t.assignedUserId">
                  {{ u.name }}
                </option>
              }
            </select>
          </label>
        }

        @if (isFinished(t.status) && !t.satisfactionRating) {
          <div class="td__rate">
            <span class="ar-field__label"
              >Customer satisfaction <span class="ar-field__opt">optional</span></span
            >
            <div class="td__stars">
              @for (n of [1, 2, 3, 4, 5]; track n) {
                <button
                  type="button"
                  class="td__star"
                  [disabled]="savingField() === 'rate'"
                  (click)="rate(n)"
                >
                  {{ n }}★
                </button>
              }
            </div>
          </div>
        } @else if (t.satisfactionRating) {
          <p class="td__rated">Rated {{ t.satisfactionRating }}/5 by the customer.</p>
        }

        <div class="td__thread">
          <span class="ar-field__label">Activity</span>
          @for (c of t.comments; track c.id) {
            <div class="td__c" [class.td__c--internal]="c.isInternal">
              <div class="td__c-head">
                <strong>{{
                  c.isInternal
                    ? (c.authorName || 'Note') + ' (internal)'
                    : c.fromCustomer
                      ? t.contactName || 'Customer'
                      : c.authorName || 'You'
                }}</strong>
                <span class="td__c-when">{{ when(c.creationTime) }}</span>
              </div>
              <p class="td__c-body">{{ c.body }}</p>
            </div>
          } @empty {
            <p class="td__hint">Nothing said yet.</p>
          }
        </div>

        @if (canReply) {
          <div class="td__compose">
            <div class="td__seg" role="group" aria-label="Note or reply">
              <button type="button" [class.on]="isInternal()" (click)="isInternal.set(true)">
                Internal note
              </button>
              <button
                type="button"
                [class.on]="!isInternal()"
                [disabled]="!t.conversationId"
                (click)="isInternal.set(false)"
              >
                Reply to customer
              </button>
            </div>
            @if (!isInternal() && !t.conversationId) {
              <p class="td__hint">This ticket has no conversation to reply through yet.</p>
            }
            <textarea
              class="ar-field__input"
              rows="3"
              maxlength="4000"
              [placeholder]="isInternal() ? 'Note for the team…' : 'What to tell the customer…'"
              [value]="body()"
              (input)="body.set($any($event.target).value)"
            ></textarea>
            <div class="td__send">
              <button
                ar-button
                type="button"
                variant="primary"
                [disabled]="sending() || !body().trim() || (!isInternal() && !t.conversationId)"
                (click)="send(t.id)"
              >
                {{ sending() ? 'Sending…' : isInternal() ? 'Add note' : 'Send reply' }}
              </button>
            </div>
          </div>
        }

        @if (error(); as msg) {
          <p class="td__err" role="alert">{{ msg }}</p>
        }
      }

      <div dialogActions>
        <button ar-button type="button" variant="ghost" (click)="closed.emit(changed())">
          Close
        </button>
      </div>
    </ar-dialog>
  `,
  styles: `
    .td__hint {
      margin: 0;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
    .td__head {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .td__subject {
      font: 600 15px var(--ar-font-sans);
      color: var(--ar-ink-900);
      overflow-wrap: anywhere;
    }
    .td__chips {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
    }
    .td__due {
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .td__due--bad {
      color: var(--ar-red-600);
    }
    .td__who {
      margin: 0;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-600);
    }
    .td__desc {
      margin: 0;
      font: 400 13px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-800);
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .td__rate {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .td__stars {
      display: flex;
      gap: 6px;
    }
    .td__star {
      padding: 4px 8px;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-control);
      cursor: pointer;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-amber-600);
    }
    .td__rated {
      margin: 0;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }

    .td__thread {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 220px;
      overflow-y: auto;
    }
    .td__c {
      padding: 8px 10px;
      border-radius: var(--ar-radius-control);
      background: var(--ar-bg-100);
    }
    .td__c--internal {
      background: var(--ar-amber-100);
    }
    .td__c-head {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .td__c-when {
      font-weight: 400;
      color: var(--ar-ink-400);
      white-space: nowrap;
    }
    .td__c-body {
      margin: 4px 0 0;
      font: 400 13px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-900);
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .td__compose {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .td__seg {
      display: inline-flex;
      align-self: flex-start;
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-control);
      overflow: hidden;
    }
    .td__seg button {
      padding: 6px 12px;
      background: var(--ar-white);
      border: 0;
      cursor: pointer;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-ink-600);
    }
    .td__seg button.on {
      background: var(--ar-inverse-bg);
      color: var(--ar-inverse-fg);
    }
    .td__seg button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .td__send {
      display: flex;
      justify-content: flex-end;
    }
    .td__err {
      margin: 0;
      padding: 8px 10px;
      border-radius: var(--ar-radius-control);
      background: var(--ar-red-100);
      color: var(--ar-red-600);
      font: 500 12px var(--ar-font-sans);
    }
  `,
})
export class ArTicketDetailDialog {
  private readonly api = inject(ServiceTicketGateway).api;
  private readonly permissions = inject(PermissionService);
  protected readonly directory = inject(ActivityDirectory);

  readonly ticketId = input.required<string>();
  /** Emitted on close: true if anything about the ticket changed, so the page behind can refresh. */
  readonly closed = output<boolean>();

  protected readonly STATUS_LABEL = STATUS_LABEL;
  protected readonly PRIORITY_LABEL = PRIORITY_LABEL;
  protected readonly STATUS_TONE = STATUS_TONE;
  protected readonly PRIORITY_TONE = PRIORITY_TONE;
  protected readonly statusChoices = STATUS_CHOICES;
  protected readonly priorityChoices = PRIORITY_CHOICES;
  protected readonly isFinished = isFinished;

  protected readonly canUpdate = grantedPolicy('AutoReach.Helpdesk.Update', this.permissions);
  protected readonly canReply = grantedPolicy('AutoReach.Helpdesk.Update', this.permissions);

  protected readonly loaded = signal<ServiceTicketDetailDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly savingField = signal<'status' | 'priority' | 'assign' | 'rate' | null>(null);
  protected readonly changed = signal(false);

  protected readonly isInternal = signal(true);
  protected readonly body = signal('');
  protected readonly sending = signal(false);

  constructor() {
    void this.directory.load();
    effect(() => {
      const id = this.ticketId();
      untracked(() => void this.load(id));
    });
  }

  private async load(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const t = await firstValueFrom(this.api.get(id));
      if (id !== this.ticketId()) return;
      this.loaded.set(t);
      this.error.set(null);
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'The ticket could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected due(): string | null {
    const t = this.loaded();
    return t ? dueLabel(t, new Date()) : null;
  }

  protected when(iso: string): string {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private mergeTicket(update: ServiceTicketDto): void {
    this.loaded.update((t) => (t ? { ...t, ...update } : t));
    this.changed.set(true);
  }

  protected async setStatus(status: TicketStatus): Promise<void> {
    const t = this.loaded();
    if (!t || this.savingField()) return;
    this.savingField.set('status');
    this.error.set(null);
    try {
      this.mergeTicket(await firstValueFrom(this.api.setStatus(t.id, { status })));
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'The status could not be changed.'));
    } finally {
      this.savingField.set(null);
    }
  }

  protected async setPriority(priority: TicketPriority): Promise<void> {
    const t = this.loaded();
    if (!t || this.savingField()) return;
    this.savingField.set('priority');
    this.error.set(null);
    try {
      this.mergeTicket(await firstValueFrom(this.api.setPriority(t.id, { priority })));
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'The priority could not be changed.'));
    } finally {
      this.savingField.set(null);
    }
  }

  protected async assign(userId: string | null): Promise<void> {
    const t = this.loaded();
    if (!t || this.savingField()) return;
    this.savingField.set('assign');
    this.error.set(null);
    try {
      this.mergeTicket(await firstValueFrom(this.api.assign(t.id, { userId })));
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'The ticket could not be assigned.'));
    } finally {
      this.savingField.set(null);
    }
  }

  protected async rate(n: number): Promise<void> {
    const t = this.loaded();
    if (!t || this.savingField()) return;
    this.savingField.set('rate');
    this.error.set(null);
    try {
      this.mergeTicket(await firstValueFrom(this.api.recordSatisfaction(t.id, { rating: n })));
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'The rating could not be saved.'));
    } finally {
      this.savingField.set(null);
    }
  }

  protected async send(ticketId: string): Promise<void> {
    const text = this.body().trim();
    if (!text || this.sending()) return;
    this.sending.set(true);
    this.error.set(null);
    try {
      const comment = await firstValueFrom(
        this.api.addComment(ticketId, { body: text, isInternal: this.isInternal() }),
      );
      this.loaded.update((t) => (t ? { ...t, comments: [...t.comments, comment] } : t));
      if (!this.isInternal()) {
        const refreshed = await firstValueFrom(this.api.get(ticketId));
        this.loaded.set(refreshed);
      }
      this.body.set('');
      this.changed.set(true);
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'That could not be sent.'));
    } finally {
      this.sending.set(false);
    }
  }
}
