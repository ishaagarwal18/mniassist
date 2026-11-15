import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import type { ServiceTicketDto } from '../../proxy/support/service-ticket.models';
import { ServiceTicketService } from '../../proxy/support/service-ticket.service';
import { ArButton } from '../../ui';

/** Edits a ticket's subject, description, category and breakdown flag (ServiceTicketAppService.UpdateDetailsAsync). */
@Component({
  selector: 'ar-ticket-details-editor',
  imports: [ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../shared/work-page.scss',
  styles: `
    :host {
      display: block;
      height: auto;
    }
  `,
  template: `
    @if (!editing()) {
      <button ar-button type="button" variant="ghost" (click)="open()">Edit details</button>
    } @else {
      <section class="wp__card">
        <div class="wp__grid">
          <label class="wp__field wp__field--wide">
            <span>Subject</span>
            <input
              class="ar-field__input"
              maxlength="256"
              [value]="subject()"
              (input)="subject.set($any($event.target).value)"
            />
          </label>
          <label class="wp__field wp__field--wide">
            <span>Description</span>
            <textarea
              class="ar-field__input"
              rows="4"
              maxlength="4000"
              [value]="description()"
              (input)="description.set($any($event.target).value)"
            ></textarea>
          </label>
          <label class="wp__field">
            <span>Category</span>
            <input
              class="ar-field__input"
              maxlength="64"
              [value]="category()"
              (input)="category.set($any($event.target).value)"
            />
          </label>
          <label class="wp__row">
            <input
              type="checkbox"
              [checked]="breakdown()"
              (change)="breakdown.set($any($event.target).checked)"
            />
            <span>Machine breakdown (starts the breakdown clock)</span>
          </label>
        </div>
        <div class="wp__actions">
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy() || !subject().trim()"
            (click)="save()"
          >
            {{ busy() ? 'Saving…' : 'Save details' }}
          </button>
          <button ar-button type="button" variant="ghost" (click)="editing.set(false)">
            Cancel
          </button>
        </div>
      </section>
    }
  `,
})
export class ArTicketDetailsEditor {
  private readonly api = inject(ServiceTicketService);
  private readonly toasts = inject(ToastService);

  readonly ticket = input.required<ServiceTicketDto>();
  readonly saved = output<ServiceTicketDto>();

  protected readonly editing = signal(false);
  protected readonly subject = signal('');
  protected readonly description = signal('');
  protected readonly category = signal('');
  protected readonly breakdown = signal(false);
  protected readonly busy = signal(false);

  protected open(): void {
    const t = this.ticket();
    this.subject.set(t.subject ?? '');
    this.description.set(t.description ?? '');
    this.category.set(t.category ?? '');
    this.breakdown.set(!!t.isBreakdown);
    this.editing.set(true);
  }

  protected async save(): Promise<void> {
    this.busy.set(true);
    try {
      const t = await firstValueFrom(
        this.api.updateDetails(
          this.ticket().id,
          {
            subject: this.subject().trim(),
            description: this.description().trim() || null,
            category: this.category().trim() || null,
            isBreakdown: this.breakdown(),
          },
          { skipHandleError: true },
        ),
      );
      this.editing.set(false);
      this.toasts.success('Ticket details saved.', 'Ticket');
      this.saved.emit(t);
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The details could not be saved.'), 'Ticket');
    } finally {
      this.busy.set(false);
    }
  }
}
