import { ArFieldVisitsCard } from './field-visits-card';
import { ArTicketLinksCard } from './ticket-links-card';
import { ArTicketDetailsEditor } from './ticket-details-editor';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { PermissionService } from '@abp/ng.core';
import { grantedPolicy } from '../../core/auth/permission';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { ArTopbar } from '../../layout/topbar';
import {
  ServiceTicketDetailDto,
  ServiceTicketDto,
  TicketPriority,
  TicketStatus,
} from '../../proxy/support';
import { ArButton, ArCard, ArChip } from '../../ui';
import { ChipTone } from '../../ui/chip';
import { ActivityDirectory } from '../activities/activity-directory';
import { errorMessage } from '../activities/activity-logic';
import {
  PRIORITY_CHOICES,
  PRIORITY_LABEL,
  STATUS_CHOICES,
  STATUS_LABEL,
  dueLabel,
  isFinished,
} from './ticket-logic';
import { ServiceTicketGateway } from './ticket-gateway';
import { ArBreakdownClockCard } from './breakdown-clock-card';
import { ArRecordFixCard } from './record-fix-card';
import { ArDiagnosisPanel } from './diagnosis-panel';
import { TicketSource } from '../../proxy/support/ticket-source.enum';

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

@Component({
  selector: 'ar-ticket-detail-page',
  standalone: true,
  imports: [
    ArTicketDetailsEditor,
    CommonModule,
    ArTopbar,
    ArButton,
    ArCard,
    ArChip,
    ArBreakdownClockCard,
    ArRecordFixCard,
    ArDiagnosisPanel,
    ArFieldVisitsCard,
    ArTicketLinksCard,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      [title]="
        (loaded()?.reference ? loaded()!.reference + ' — ' : '') +
        (loaded()?.subject || 'Ticket Details')
      "
      subtitle="Service Ticket Overview, Activity & Customer Support Thread"
    >
      <button ar-button type="button" variant="ghost" (click)="back()">Back to Helpdesk</button>
      @if (canDelete() && loaded(); as t) {
        <button ar-button type="button" variant="danger" (click)="deleteTicket(t)">
          Delete Ticket
        </button>
      }
    </ar-topbar>

    <div class="page-container ar-scroll">
      @if (loading()) {
        <div class="loading-state">
          <p>Loading ticket details…</p>
        </div>
      } @else if (loaded(); as t) {
        <div class="ticket-layout">
          <!-- Main Left Column: Details, Activity Thread, Reply -->
          <div class="ticket-main">
            <ar-card>
              <div class="ticket-header">
                <div class="ticket-badges">
                  <span class="ticket-ref ar-mono">{{ t.reference }}</span>
                  <ar-chip [tone]="STATUS_TONE[t.status]">{{ STATUS_LABEL[t.status] }}</ar-chip>
                  <ar-chip [tone]="PRIORITY_TONE[t.priority]">{{
                    PRIORITY_LABEL[t.priority]
                  }}</ar-chip>
                  @if (t.isBreakdown) {
                    <ar-chip tone="bad">Breakdown</ar-chip>
                  }
                  @if (t.source === TicketSource.QrScan) {
                    <ar-chip tone="neutral">From machine sticker</ar-chip>
                  }
                  @if (t.reportedByUnknownNumber) {
                    <ar-chip tone="warn">Number not on the account</ar-chip>
                  }
                  @if (due(); as d) {
                    <span class="ticket-due" [class.ticket-due--bad]="t.isOverdue">{{ d }}</span>
                  }
                </div>
                <h2 class="ticket-subject">{{ t.subject }}</h2>
                @if (canUpdate()) {
                  <ar-ticket-details-editor [ticket]="t" (saved)="fixSaved($event)" />
                }
                <div class="ticket-meta">
                  <span class="meta-item">
                    <span class="meta-label">Customer / Contact:</span>
                    <strong>{{ t.contactName || t.contactNumber || '—' }}</strong>
                  </span>
                  @if (t.enquiryReference) {
                    <span class="meta-item">
                      <span class="meta-label">Linked Deal:</span>
                      <strong>{{ t.enquiryReference }}</strong>
                    </span>
                  }
                  <span class="meta-item">
                    <span class="meta-label">Created:</span>
                    <span>{{ when(t.creationTime) }}</span>
                  </span>
                </div>
                @if (t.description) {
                  <div class="ticket-description">
                    <h4 class="desc-heading">Initial Issue Description</h4>
                    <p class="desc-body">{{ t.description }}</p>
                  </div>
                }
              </div>
            </ar-card>

            <!-- Activity & Conversation Thread -->
            <ar-card heading="Conversation & Activity Thread">
              <div class="thread-list">
                @for (c of t.comments; track c.id) {
                  <div class="thread-item" [class.thread-item--internal]="c.isInternal">
                    <div class="thread-item-head">
                      <div class="author-badge">
                        <strong>{{
                          c.isInternal
                            ? (c.authorName || 'Note') + ' (Internal Note)'
                            : c.fromCustomer
                              ? t.contactName || 'Customer'
                              : c.authorName || 'Support Agent'
                        }}</strong>
                        @if (c.isInternal) {
                          <ar-chip tone="amber">Internal</ar-chip>
                        }
                      </div>
                      <span class="thread-time">{{ when(c.creationTime) }}</span>
                    </div>
                    <p class="thread-body" translate="no">{{ c.body }}</p>
                  </div>
                } @empty {
                  <p class="empty-hint">No messages or internal notes recorded yet.</p>
                }
              </div>

              @if (canReply()) {
                <div class="composer-section">
                  <div class="composer-tabs" role="group" aria-label="Note or reply">
                    <button
                      type="button"
                      [class.active]="isInternal()"
                      (click)="isInternal.set(true)"
                    >
                      Internal Note
                    </button>
                    <button
                      type="button"
                      [class.active]="!isInternal()"
                      [disabled]="!t.conversationId"
                      (click)="isInternal.set(false)"
                    >
                      Reply to Customer
                    </button>
                  </div>
                  @if (!isInternal() && !t.conversationId) {
                    <p class="composer-hint">
                      This ticket has no connected customer conversation channel to send a reply
                      through.
                    </p>
                  }
                  <textarea
                    class="ar-field__input composer-textarea"
                    rows="4"
                    maxlength="4000"
                    [placeholder]="
                      isInternal()
                        ? 'Add private notes for the support team…'
                        : 'Type reply to be sent to the customer…'
                    "
                    [value]="body()"
                    (input)="body.set($any($event.target).value)"
                  ></textarea>
                  <div class="composer-actions">
                    <button
                      ar-button
                      type="button"
                      variant="primary"
                      [disabled]="
                        sending() || !body().trim() || (!isInternal() && !t.conversationId)
                      "
                      (click)="send(t.id)"
                    >
                      {{
                        sending() ? 'Posting…' : isInternal() ? 'Add Internal Note' : 'Send Reply'
                      }}
                    </button>
                  </div>
                </div>
              }
            </ar-card>
          </div>

          <!-- Right Sidebar: Properties & Controls -->
          <div class="ticket-sidebar">
            @if (t.isBreakdown) {
              <ar-breakdown-clock-card
                [ticketId]="t.id"
                [version]="t.escalationStep + t.status * 100"
              />
              <ar-diagnosis-panel [ticket]="t" />
              <ar-record-fix-card [ticket]="t" [canEdit]="canUpdate()" (saved)="fixSaved($event)" />
            }
            <ar-ticket-links-card
              [ticket]="t"
              [canEdit]="canUpdate()"
              (saved)="mergeTicket($event)"
            />
            <ar-field-visits-card [ticketId]="t.id" />
            <ar-card heading="Ticket Settings & Assignment">
              @if (canUpdate()) {
                <div class="control-group">
                  <label class="ar-field">
                    <span class="ar-field__label">Ticket Status</span>
                    <select
                      class="ar-field__input"
                      [disabled]="savingField() === 'status'"
                      (change)="setStatus(+$any($event.target).value)"
                    >
                      @for (s of statusChoices; track s) {
                        <option [value]="s" [selected]="s === t.status">
                          {{ STATUS_LABEL[s] }}
                        </option>
                      }
                    </select>
                  </label>

                  <label class="ar-field">
                    <span class="ar-field__label">Priority Level</span>
                    <select
                      class="ar-field__input"
                      [disabled]="savingField() === 'priority'"
                      (change)="setPriority(+$any($event.target).value)"
                    >
                      @for (p of priorityChoices; track p) {
                        <option [value]="p" [selected]="p === t.priority">
                          {{ PRIORITY_LABEL[p] }}
                        </option>
                      }
                    </select>
                  </label>

                  <label class="ar-field">
                    <span class="ar-field__label">Assigned Support Agent</span>
                    <select
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
                </div>
              }

              @if (isFinished(t.status) && !t.satisfactionRating) {
                <div class="rating-box">
                  <span class="ar-field__label">Customer Satisfaction Rating</span>
                  <div class="rating-stars">
                    @for (n of [1, 2, 3, 4, 5]; track n) {
                      <button
                        type="button"
                        class="star-btn"
                        [disabled]="savingField() === 'rate'"
                        (click)="rate(n)"
                      >
                        {{ n }} ★
                      </button>
                    }
                  </div>
                </div>
              } @else if (t.satisfactionRating) {
                <div class="rated-box">
                  <span class="ar-field__label">Customer Feedback</span>
                  <p class="rated-text">⭐ {{ t.satisfactionRating }} / 5 Stars</p>
                </div>
              }

              @if (error(); as msg) {
                <p class="error-alert mt-3" role="alert">{{ msg }}</p>
              }
            </ar-card>
          </div>
        </div>
      } @else if (error(); as msg) {
        <p class="error-alert" role="alert">{{ msg }}</p>
      }
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 1.5rem 2rem 3rem;
        max-width: 1300px;
        margin: 0 auto;
      }
      .loading-state,
      .empty-hint {
        color: var(--ar-ink-500);
        font: 400 13px var(--ar-font-sans);
        margin: 1rem 0;
      }
      .ticket-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 340px;
        gap: 1.5rem;
        align-items: start;
      }
      .ticket-main {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      .ticket-header {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .ticket-badges {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.5rem;
      }
      .ticket-ref {
        font-weight: 700;
        font-size: 1.1rem;
        color: var(--ar-primary-600);
      }
      .ticket-due {
        font: 500 12px var(--ar-font-sans);
        color: var(--ar-ink-500);
      }
      .ticket-due--bad {
        color: var(--ar-red-600);
        font-weight: 600;
      }
      .ticket-subject {
        margin: 0;
        font-size: 1.35rem;
        font-weight: 700;
        color: var(--ar-ink-900);
      }
      .ticket-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 1.25rem;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid var(--ar-line-200);
        font-size: 13px;
        color: var(--ar-ink-700);
      }
      .meta-label {
        color: var(--ar-ink-400);
        margin-right: 0.25rem;
      }
      .ticket-description {
        margin-top: 0.5rem;
      }
      .desc-heading {
        margin: 0 0 0.5rem;
        font-size: 13px;
        font-weight: 600;
        color: var(--ar-ink-700);
      }
      .desc-body {
        margin: 0;
        font-size: 13.5px;
        line-height: 1.6;
        color: var(--ar-ink-800);
        white-space: pre-wrap;
      }
      .thread-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        max-height: 480px;
        overflow-y: auto;
        padding-right: 0.5rem;
      }
      .thread-item {
        padding: 0.75rem 1rem;
        border-radius: var(--ar-radius-control);
        background: var(--ar-bg-100);
        border: 1px solid var(--ar-line-200);
      }
      .thread-item--internal {
        background: #fffbeb;
        border-color: #fde68a;
      }
      .thread-item-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.4rem;
      }
      .author-badge {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 13px;
        color: var(--ar-ink-800);
      }
      .thread-time {
        font-size: 11.5px;
        color: var(--ar-ink-400);
      }
      .thread-body {
        margin: 0;
        font-size: 13px;
        line-height: 1.5;
        color: var(--ar-ink-900);
        white-space: pre-wrap;
      }
      .composer-section {
        margin-top: 1.5rem;
        padding-top: 1.25rem;
        border-top: 1px solid var(--ar-line-200);
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .composer-tabs {
        display: inline-flex;
        border: 1px solid var(--ar-line-200);
        border-radius: var(--ar-radius-control);
        overflow: hidden;
        align-self: flex-start;
      }
      .composer-tabs button {
        padding: 6px 14px;
        background: var(--ar-white);
        border: 0;
        cursor: pointer;
        font: 500 12.5px var(--ar-font-sans);
        color: var(--ar-ink-600);
      }
      .composer-tabs button.active {
        background: var(--ar-primary-600);
        color: var(--ar-white);
      }
      .composer-tabs button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .composer-hint {
        margin: 0;
        font-size: 12px;
        color: var(--ar-ink-500);
      }
      .composer-textarea {
        resize: vertical;
        font-size: 13px;
      }
      .composer-actions {
        display: flex;
        justify-content: flex-end;
      }
      .ticket-sidebar {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      .control-group {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .rating-box,
      .rated-box {
        margin-top: 1.25rem;
        padding-top: 1rem;
        border-top: 1px solid var(--ar-line-200);
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .rating-stars {
        display: flex;
        gap: 0.5rem;
      }
      .star-btn {
        padding: 5px 10px;
        background: var(--ar-white);
        border: 1px solid var(--ar-line-200);
        border-radius: var(--ar-radius-control);
        cursor: pointer;
        font: 600 12px var(--ar-font-sans);
        color: var(--ar-amber-600);
      }
      .rated-text {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--ar-ink-800);
      }
      .error-alert {
        margin: 0;
        padding: 8px 12px;
        border-radius: var(--ar-radius-control);
        background: var(--ar-red-100);
        color: var(--ar-red-600);
        font: 500 12px var(--ar-font-sans);
      }
      @media (max-width: 900px) {
        .ticket-layout {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ArTicketDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ServiceTicketGateway).api;
  private readonly permissions = inject(PermissionService);
  private readonly dialogs = inject(ConfirmService);
  private readonly toasts = inject(ToastService);
  protected readonly directory = inject(ActivityDirectory);

  protected readonly STATUS_LABEL = STATUS_LABEL;
  protected readonly PRIORITY_LABEL = PRIORITY_LABEL;
  protected readonly STATUS_TONE = STATUS_TONE;
  protected readonly PRIORITY_TONE = PRIORITY_TONE;
  protected readonly TicketSource = TicketSource;
  protected readonly statusChoices = STATUS_CHOICES;
  protected readonly priorityChoices = PRIORITY_CHOICES;
  protected readonly isFinished = isFinished;

  protected readonly canUpdate = grantedPolicy('AutoReach.Helpdesk.Update', this.permissions);
  protected readonly canReply = grantedPolicy('AutoReach.Helpdesk.Reply', this.permissions);
  protected readonly canDelete = grantedPolicy('AutoReach.Helpdesk.Delete', this.permissions);

  protected readonly loaded = signal<ServiceTicketDetailDto | null>(null);

  /** The fix card saved: keep the comments, take the rest from the server. */
  protected fixSaved(t: ServiceTicketDto): void {
    this.loaded.update((d) => (d ? { ...d, ...t, comments: d.comments } : d));
  }
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly savingField = signal<'status' | 'priority' | 'assign' | 'rate' | null>(null);

  protected readonly isInternal = signal(true);
  protected readonly body = signal('');
  protected readonly sending = signal(false);

  private ticketId = '';

  async ngOnInit(): Promise<void> {
    void this.directory.load();
    this.ticketId = this.route.snapshot.paramMap.get('id') || '';
    if (this.ticketId) {
      await this.load(this.ticketId);
    } else {
      this.error.set('No ticket identifier provided.');
      this.loading.set(false);
    }
  }

  private async load(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const t = await firstValueFrom(this.api.get(id));
      this.loaded.set(t);
      this.error.set(null);
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'The ticket could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected back(): void {
    void this.router.navigateByUrl('/helpdesk');
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

  protected mergeTicket(update: ServiceTicketDto): void {
    this.loaded.update((t) => (t ? { ...t, ...update } : t));
  }

  protected async setStatus(status: TicketStatus): Promise<void> {
    const t = this.loaded();
    if (!t || this.savingField()) return;
    this.savingField.set('status');
    this.error.set(null);
    try {
      this.mergeTicket(await firstValueFrom(this.api.setStatus(t.id, { status })));
      this.toasts.success(`Status updated to ${STATUS_LABEL[status]}.`);
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
      this.toasts.success(`Priority updated to ${PRIORITY_LABEL[priority]}.`);
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
      this.toasts.success('Ticket assignment updated.');
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
      this.toasts.success('Rating recorded.');
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
      this.toasts.success(this.isInternal() ? 'Internal note added.' : 'Reply sent to customer.');
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'That could not be sent.'));
    } finally {
      this.sending.set(false);
    }
  }

  protected async deleteTicket(t: ServiceTicketDetailDto): Promise<void> {
    if (
      !(await this.dialogs.delete(
        'ticket',
        t.reference,
        'This ticket and all its comments will be permanently deleted.',
      ))
    ) {
      return;
    }
    try {
      await firstValueFrom(this.api.delete(t.id));
      this.toasts.success(`Ticket ${t.reference} deleted.`);
      void this.router.navigateByUrl('/helpdesk');
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'The ticket could not be deleted.'));
    }
  }
}
