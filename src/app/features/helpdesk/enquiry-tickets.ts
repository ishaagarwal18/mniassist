import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { PermissionService } from '@abp/ng.core';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { ServiceTicketDto, TicketStatus } from '../../proxy/support';
import { ArButton, ArChip } from '../../ui';
import { ChipTone } from '../../ui/chip';
import { errorMessage } from '../activities/activity-logic';
import { ArTicketDetailDialog } from './ticket-detail-dialog';
import { ArTicketDialog } from './ticket-dialog';
import { STATUS_LABEL, dueLabel } from './ticket-logic';
import { ServiceTicketGateway } from './ticket-gateway';

const STATUS_TONE: Record<TicketStatus, ChipTone> = {
  [TicketStatus.Open]: 'amber',
  [TicketStatus.Pending]: 'teal',
  [TicketStatus.Resolved]: 'good',
  [TicketStatus.Closed]: 'neutral',
};

/**
 * A deal's service tickets, with the shortcut to raise one. Shown in the enquiry drawer so a customer's problem can be logged
 * and tracked without leaving the deal.
 */
@Component({
  selector: 'ar-enquiry-tickets',
  imports: [ArButton, ArChip, ArTicketDialog, ArTicketDetailDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3 class="et__t">Service tickets</h3>

    @if (error(); as msg) {
      <p class="et__err">{{ msg }}</p>
    }

    @for (t of tickets(); track t.id) {
      <div class="et__row" (click)="opened.set(t.id)">
        <div class="et__main">
          <span class="et__ref ar-mono">{{ t.reference }}</span>
          <ar-chip [tone]="STATUS_TONE[t.status]">{{ STATUS_LABEL[t.status] }}</ar-chip>
          @if (due(t); as d) {
            <span class="et__bad" [class.et__bad--ok]="!t.isOverdue">{{ d }}</span>
          }
        </div>
        <span class="et__subject">{{ t.subject }}</span>
      </div>
    } @empty {
      @if (!loading()) {
        <p class="et__empty">No tickets raised for this deal yet.</p>
      }
    }

    <div class="et__add">
      @if (canRaise()) {
        <button
          ar-button
          type="button"
          variant="ghost"
          icon="plus"
          [disabled]="!contactId()"
          (click)="raising.set(true)"
        >
          Raise a ticket
        </button>
      }
    </div>

    @if (raising()) {
      <ar-ticket-dialog
        [contactId]="contactId()!"
        [contactName]="contactName()"
        [enquiryId]="enquiryId()"
        [conversationId]="conversationId()"
        (closed)="raising.set(false); refresh()"
      />
    }
    @if (opened(); as id) {
      <ar-ticket-detail-dialog [ticketId]="id" (closed)="opened.set(null); refresh()" />
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .et__t {
      margin: 0 0 8px;
      font: 600 12px var(--ar-font-sans);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ar-ink-500);
    }
    .et__row {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 6px 0;
      cursor: pointer;
    }
    .et__row:hover .et__subject {
      color: var(--ar-teal-600);
    }
    .et__main {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .et__ref {
      font-size: 11px;
      color: var(--ar-ink-400);
    }
    .et__bad {
      font: 500 11px var(--ar-font-sans);
      color: var(--ar-red-600);
    }
    .et__bad--ok {
      color: var(--ar-ink-400);
    }
    .et__subject {
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-900);
      overflow-wrap: anywhere;
    }
    .et__empty {
      margin: 0;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
    .et__add {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
    .et__err {
      margin: 0 0 8px;
      padding: 8px 10px;
      border-radius: var(--ar-radius-control);
      background: var(--ar-red-100);
      color: var(--ar-red-600);
      font: 500 12px var(--ar-font-sans);
    }
  `,
})
export class ArEnquiryTickets {
  private readonly api = inject(ServiceTicketGateway).api;
  private readonly permissions = inject(PermissionService);

  readonly enquiryId = input.required<string>();
  /** The deal's contact; without it there is nobody to raise a ticket for. */
  readonly contactId = input<string | undefined>(undefined);
  readonly contactName = input('the customer');
  /** The conversation a reply would go through, when the deal has one open. */
  readonly conversationId = input<string | null>(null);

  protected readonly STATUS_LABEL = STATUS_LABEL;
  protected readonly STATUS_TONE = STATUS_TONE;
  protected readonly canRaise = grantedPolicy('AutoReach.Helpdesk.Create', this.permissions);

  protected readonly tickets = signal<ServiceTicketDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly raising = signal(false);
  protected readonly opened = signal<string | null>(null);

  private readonly tick = signal(0);

  constructor() {
    effect(() => {
      const id = this.enquiryId();
      this.tick();
      untracked(() => void this.load(id));
    });
  }

  protected refresh(): void {
    this.tick.update((n) => n + 1);
  }

  protected due(t: ServiceTicketDto): string | null {
    return dueLabel(t, new Date());
  }

  private async load(id: string): Promise<void> {
    try {
      const page = await firstValueFrom(this.api.getList({ enquiryId: id, maxResultCount: 10 }));
      if (id !== this.enquiryId()) return;
      this.tickets.set(page.items ?? []);
      this.error.set(null);
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'Tickets could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }
}
