import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { EmailChannelService } from '../../proxy/email/email-channel.service';
import { ArButton, ArDialog } from '../../ui';

/** Escapes text for HTML. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Plain text typed in the box as simple HTML: blank lines make paragraphs, single line breaks stay. */
export function textToEmailHtml(text: string): string {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((p) => `<p>${escapeHtml(p.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

/**
 * One email to one contact, sent from the workspace's own sending address (EmailChannel.send). It is a
 * one-to-one message — not marketing — so it reaches anyone who has not opted out of email altogether,
 * and it is kept as an Email conversation in the Inbox, where replies land too.
 */
@Component({
  selector: 'ar-email-contact-dialog',
  imports: [ArDialog, ArButton, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog [title]="'Email ' + name()" (dismiss)="!busy() && closed.emit()">
      <p class="ec__to">
        To <strong translate="no">{{ name() }}</strong> &lt;<span class="ar-mono" translate="no">{{
          email()
        }}</span
        >&gt;
      </p>
      <label class="ar-field">
        <span class="ar-field__label">Subject</span>
        <input
          class="ar-field__input"
          required
          maxlength="998"
          data-autofocus
          [value]="subject()"
          (input)="subject.set($any($event.target).value)"
        />
      </label>
      <label class="ar-field">
        <span class="ar-field__label">Message</span>
        <textarea
          class="ar-field__input ec__body"
          required
          rows="9"
          [value]="body()"
          (input)="body.set($any($event.target).value)"
        ></textarea>
      </label>
      <p class="ec__note">
        Sent from your workspace's email address and kept in the
        <a routerLink="/inbox">Inbox</a>, where their reply arrives.
      </p>
      @if (error(); as e) {
        <p class="ec__error" role="alert">{{ e }}</p>
      }
      <div dialogActions>
        <button ar-button type="button" variant="ghost" [disabled]="busy()" (click)="closed.emit()">
          Cancel
        </button>
        <button
          ar-button
          type="button"
          variant="primary"
          icon="send"
          [disabled]="busy() || !canSend()"
          (click)="send()"
        >
          {{ busy() ? 'Sending…' : 'Send email' }}
        </button>
      </div>
    </ar-dialog>
  `,
  styles: `
    .ec__to,
    .ec__note {
      margin: 0;
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-600);
    }
    .ec__note {
      font-size: 12px;
      color: var(--ar-ink-500);
    }
    .ec__body {
      resize: vertical;
      min-height: 160px;
      font: 400 13px var(--ar-font-sans);
    }
    .ec__error {
      margin: 0;
      padding: 8px 10px;
      border-radius: var(--ar-radius-inset);
      background: var(--ar-red-100);
      color: var(--ar-red-600);
      font: 400 13px var(--ar-font-sans);
    }
  `,
})
export class ArEmailContactDialog {
  private readonly api = inject(EmailChannelService);
  private readonly toasts = inject(ToastService);

  readonly contactId = input.required<string>();
  readonly name = input('');
  readonly email = input('');
  readonly closed = output<void>();

  protected readonly subject = signal('');
  protected readonly body = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly canSend = computed(() => !!this.subject().trim() && !!this.body().trim());

  protected async send(): Promise<void> {
    if (!this.canSend() || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(
        this.api.send(
          {
            contactId: this.contactId(),
            subject: this.subject().trim(),
            htmlBody: textToEmailHtml(this.body()),
            textBody: this.body().trim(),
            isMarketing: false,
          },
          { skipHandleError: true },
        ),
      );
      this.toasts.success(`Email sent to ${this.name() || this.email()}.`);
      this.closed.emit();
    } catch (e: unknown) {
      this.error.set(readApiError(e, 'The email could not be sent.'));
    } finally {
      this.busy.set(false);
    }
  }
}
