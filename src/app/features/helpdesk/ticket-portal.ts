import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { serverFieldErrors } from '../forms/form-logic';
import { apiMessage } from '../signing/signing-logic';
import { PublicTicketPortalDto, ServiceTicketPublicService } from '../../proxy/support';
import { checkTicketAnswers } from './ticket-portal-logic';

/**
 * The page a customer fills in to raise a ticket themselves: no login, no app shell. What it asks is fixed (unlike a web form,
 * there are no per-workspace questions to configure) — name, phone, what's wrong, and the details, if any.
 */
@Component({
  selector: 'ar-ticket-portal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ticket-portal.html',
  styleUrl: './ticket-portal.scss',
})
export class ArTicketPortal {
  private readonly api = inject(ServiceTicketPublicService);
  private readonly code = inject(ActivatedRoute).snapshot.paramMap.get('code') ?? '';

  protected readonly portal = signal<PublicTicketPortalDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly unavailable = signal<string | null>(null);

  protected readonly name = signal('');
  protected readonly phone = signal('');
  protected readonly email = signal('');
  protected readonly subject = signal('');
  protected readonly description = signal('');
  protected readonly consent = signal(false);
  protected readonly honeypot = signal('');
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly busy = signal(false);
  protected readonly failure = signal<string | null>(null);
  protected readonly done = signal<{ message: string; reference: string | null } | null>(null);

  protected readonly hasErrors = computed(() => Object.keys(this.errors()).length > 0);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      this.portal.set(await firstValueFrom(this.api.get(this.code)));
    } catch (e: unknown) {
      const status = (e as { status?: number })?.status;
      this.unavailable.set(
        status === 429 ? apiMessage(e, 'Too many requests. Please wait a few minutes and try again.') : 'This page is not available.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  protected clear(field: string): void {
    if (this.errors()[field]) this.errors.update(({ [field]: _, ...rest }) => rest);
  }

  protected async submit(): Promise<void> {
    if (!this.portal() || this.busy()) return;

    const found = checkTicketAnswers({ name: this.name(), phone: this.phone(), subject: this.subject(), consent: this.consent() });
    this.errors.set(found);
    this.failure.set(null);
    if (Object.keys(found).length > 0) return;

    this.busy.set(true);
    try {
      const result = await firstValueFrom(
        this.api.submit(this.code, {
          name: this.name().trim(),
          phone: this.phone().trim(),
          email: this.email().trim() || null,
          subject: this.subject().trim(),
          description: this.description().trim() || null,
          consent: this.consent(),
          website: this.honeypot() || null,
        }),
      );
      this.done.set({ message: result.message, reference: result.reference ?? null });
    } catch (e: unknown) {
      const fromServer = serverFieldErrors(e);
      if (Object.keys(fromServer).length > 0) {
        this.errors.set(fromServer);
        this.failure.set('Please check the highlighted answers and try again.');
      } else if ((e as { status?: number })?.status === 429) {
        this.failure.set(apiMessage(e, 'Too many attempts. Please wait a few minutes and try again.'));
      } else if ((e as { status?: number })?.status === 404) {
        this.unavailable.set('This page is not available.');
      } else {
        this.failure.set('Your details could not be sent. Please try again.');
      }
    } finally {
      this.busy.set(false);
    }
  }
}
