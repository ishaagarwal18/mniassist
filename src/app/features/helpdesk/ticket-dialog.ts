import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ServiceTicketDto, TicketPriority } from '../../proxy/support';
import { ArButton, ArDialog } from '../../ui';
import { ArSelect } from '../../ui/select';
import { errorMessage } from '../activities/activity-logic';
import {
  PRIORITY_CHOICES,
  PRIORITY_LABEL,
  PRIORITY_SLA_HOURS,
  hoursByPriority,
} from './ticket-logic';
import { ServiceTicketGateway } from './ticket-gateway';

/** Raising a ticket for a customer's problem: what it is, how urgent, and — when raised from a deal or an installed machine —
 *  linked straight to it. */
@Component({
  selector: 'ar-ticket-dialog',
  imports: [ArDialog, ArButton, ArSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog [title]="'Raise a ticket for ' + contactName()" (dismiss)="closed.emit(null)">
      <label class="ar-field" for="tk-subject">
        <span class="ar-field__label">What's wrong</span>
        <input
          required
          maxlength="256"
          id="tk-subject"
          class="ar-field__input"
          maxlength="200"
          placeholder="Motor overheating on line 2"
          [value]="subject()"
          (input)="subject.set($any($event.target).value)"
        />
      </label>

      <div class="ar-field-row">
        <label class="ar-field" for="tk-category">
          <span class="ar-field__label">Category <span class="ar-field__opt">optional</span></span>
          <input
            id="tk-category"
            class="ar-field__input"
            maxlength="100"
            placeholder="Motor"
            [value]="category()"
            (input)="category.set($any($event.target).value)"
          />
        </label>
        <label class="ar-field" for="tk-priority">
          <span class="ar-field__label">Priority</span>
          <select
            required
            id="tk-priority"
            class="ar-field__input"
            (change)="priority.set(+$any($event.target).value)"
          >
            @for (p of choices; track p) {
              <option [value]="p" [selected]="p === priority()">
                {{ label[p] }} — {{ hours()[p] }}h SLA
              </option>
            }
          </select>
        </label>
      </div>

      <label class="ar-field" for="tk-desc">
        <span class="ar-field__label">Details <span class="ar-field__opt">optional</span></span>
        <textarea
          id="tk-desc"
          class="ar-field__input"
          rows="4"
          maxlength="4000"
          placeholder="What the customer said, what has been tried…"
          [value]="description()"
          (input)="description.set($any($event.target).value)"
        ></textarea>
      </label>

      @if (error(); as msg) {
        <p class="tk__err" role="alert">{{ msg }}</p>
      }

      <div dialogActions>
        <button ar-button type="button" variant="ghost" (click)="closed.emit(null)">Cancel</button>
        <button ar-button type="button" variant="primary" [disabled]="busy()" (click)="save()">
          {{ busy() ? 'Raising…' : 'Raise ticket' }}
        </button>
      </div>
    </ar-dialog>
  `,
  styles: `
    .tk__err {
      margin: 8px 0 0;
      padding: 8px 10px;
      border-radius: var(--ar-radius-control);
      background: var(--ar-red-100);
      color: var(--ar-red-600);
      font: 500 12px var(--ar-font-sans);
    }
  `,
})
export class ArTicketDialog {
  private readonly api = inject(ServiceTicketGateway).api;

  readonly contactId = input.required<string>();
  readonly contactName = input('the customer');
  /** The deal this ticket is about, so it lands on the deal's timeline. */
  readonly enquiryId = input<string | null>(null);
  /** The conversation a reply to the customer would go through, when raised from one. */
  readonly conversationId = input<string | null>(null);
  /** Emitted on close: the raised ticket, or null if nothing was raised. */
  readonly closed = output<ServiceTicketDto | null>();

  protected readonly choices = PRIORITY_CHOICES;
  protected readonly label = PRIORITY_LABEL;
  protected readonly hours = signal(PRIORITY_SLA_HOURS);

  protected readonly subject = signal('');
  protected readonly category = signal('');
  protected readonly priority = signal<TicketPriority>(TicketPriority.Normal);
  protected readonly description = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    // The workspace's own SLA policy, when it has one — shown instead of the fixed default so this promise is never stale.
    void firstValueFrom(this.api.getSettings())
      .then((s) => this.hours.set(hoursByPriority(s)))
      .catch(() => undefined);
  }

  protected async save(): Promise<void> {
    if (!this.subject().trim() || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      const ticket = await firstValueFrom(
        this.api.create({
          contactId: this.contactId(),
          subject: this.subject().trim(),
          description: this.description().trim() || null,
          category: this.category().trim() || null,
          priority: this.priority(),
          enquiryId: this.enquiryId(),
          conversationId: this.conversationId(),
        }),
      );
      this.closed.emit(ticket);
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'The ticket could not be raised.'));
    } finally {
      this.busy.set(false);
    }
  }
}
