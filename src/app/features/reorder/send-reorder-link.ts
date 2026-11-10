import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  ReorderPortalService,
  SentReorderLinkDto,
} from '../../proxy/reorder/reorder-portal.service';
import { ArButton, ArDialog } from '../../ui';

/**
 * Sends one customer their personal re-order link on WhatsApp, and shows the link either way so it can be copied. Used from the
 * Re-orders page, a conversation in the inbox, the spares board and the contact drawer.
 */
@Component({
  selector: 'ar-send-reorder-link',
  imports: [ArDialog, ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog [title]="'Re-order link for ' + contactName()" (dismiss)="closed.emit()">
      @if (busy()) {
        <p class="sl__hint">Sending…</p>
      } @else if (result(); as r) {
        @if (r.sent) {
          <p class="sl__ok" role="status">
            Sent on WhatsApp. The link works until {{ day(r.expiresAtUtc) }}.
          </p>
        } @else if (r.note) {
          <p class="sl__warn" role="alert">{{ r.note }}</p>
        }
        <div class="sl__url">
          <input
            id="sl-url"
            class="ar-field__input ar-mono"
            readonly
            aria-label="Re-order link"
            [value]="r.url"
            (focus)="$any($event.target).select()"
          />
          <button ar-button type="button" variant="ghost" (click)="copy(r.url)">
            {{ copied() ? 'Copied' : 'Copy' }}
          </button>
        </div>
        <p class="sl__hint">
          The customer confirms with a code sent to their WhatsApp before any prices show.
        </p>
      }
      @if (error(); as e) {
        <p class="sl__warn" role="alert">{{ e }}</p>
      }
      <div dialogActions>
        <button ar-button type="button" variant="primary" (click)="closed.emit()">Done</button>
      </div>
    </ar-dialog>
  `,
  styles: `
    .sl__hint {
      margin: 0;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .sl__ok,
    .sl__warn {
      margin: 0;
      padding: 8px 10px;
      border-radius: var(--ar-radius-control);
      font: 500 12.5px/1.45 var(--ar-font-sans);
    }
    .sl__ok {
      background: var(--ar-teal-100);
      color: var(--ar-teal-700);
    }
    .sl__warn {
      background: var(--ar-amber-100, #fef3c7);
      color: var(--ar-amber-800, #92400e);
    }
    .sl__url {
      display: flex;
      gap: 8px;
    }
    .sl__url input {
      flex: 1;
      min-width: 0;
    }
  `,
})
export class ArSendReorderLink {
  private readonly api = inject(ReorderPortalService);

  readonly contactId = input.required<string>();
  readonly contactName = input('the customer');
  readonly closed = output<void>();

  protected readonly busy = signal(true);
  protected readonly result = signal<SentReorderLinkDto | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly copied = signal(false);

  constructor() {
    effect(() => {
      const id = this.contactId();
      void this.send(id);
    });
  }

  private async send(contactId: string): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      this.result.set(await firstValueFrom(this.api.sendLink(contactId)));
    } catch (e: unknown) {
      this.error.set(
        (e as { error?: { error?: { message?: string } } })?.error?.error?.message ??
          "The link couldn't be made. Check the portal is switched on.",
      );
    } finally {
      this.busy.set(false);
    }
  }

  protected async copy(url: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      this.copied.set(true);
    } catch {
      this.error.set('Copying was blocked by the browser. Select the link and copy it.');
    }
  }

  protected day(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
}
