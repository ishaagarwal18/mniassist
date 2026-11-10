import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { SmsChannelService } from '../../proxy/sms/sms-channel.service';
import { ArButton } from '../../ui';

/**
 * Where customers' SMS replies come in: the MSG91 virtual number they text, and the callback address MSG91 forwards them to.
 * Replies land in the inbox for the team — an SMS answer has to be an approved DLT template, so nothing replies automatically.
 */
@Component({
  selector: 'ar-sms-inbound-card',
  imports: [ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="sms">
      <header class="sms__head">
        <h2 class="sms__title">SMS replies</h2>
        @if (sender(); as s) {
          <span class="sms__sender ar-mono">Sender {{ s }}</span>
        }
      </header>
      <p class="sms__hint">
        The MSG91 virtual number customers text back. Their messages appear in the inbox; reply with
        an approved DLT template.
      </p>
      <div class="sms__row">
        <label class="ar-field sms__field" for="sms-inbound">
          <span class="ar-field__label"
            >Virtual number <span class="ar-field__opt">(with country code)</span></span
          >
          <input
            id="sms-inbound"
            class="ar-field__input ar-mono"
            placeholder="+91 90000 11111"
            [value]="number()"
            (input)="number.set($any($event.target).value)"
          />
        </label>
        <button ar-button type="button" variant="primary" [disabled]="saving()" (click)="save()">
          {{ saving() ? 'Saving…' : 'Save' }}
        </button>
      </div>
      <p class="sms__hint">
        In MSG91, forward inbound SMS for this number to
        <span class="ar-mono">{{ callback }}</span
        >, where the last part is the webhook secret your administrator set up.
      </p>
      @if (notice(); as n) {
        <p class="sms__ok" role="status">{{ n }}</p>
      }
      @if (error(); as e) {
        <p class="sms__err" role="alert">{{ e }}</p>
      }
    </article>
  `,
  styles: `
    .sms {
      padding: 16px 18px;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .sms__head {
      display: flex;
      align-items: baseline;
      gap: 10px;
    }
    .sms__title {
      margin: 0;
      font: 600 14px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .sms__sender {
      font-size: 11.5px;
      color: var(--ar-ink-400);
    }
    .sms__hint {
      margin: 0;
      font: 400 12px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-500);
      overflow-wrap: anywhere;
    }
    .sms__row {
      display: flex;
      align-items: flex-end;
      gap: 10px;
      flex-wrap: wrap;
    }
    .sms__field {
      flex: 1;
      min-width: 220px;
    }
    .sms__ok {
      margin: 0;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-teal-600);
    }
    .sms__err {
      margin: 0;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-warn-600);
    }
  `,
})
export class ArSmsInboundCard {
  private readonly api = inject(SmsChannelService);

  protected readonly callback = `${environment.apis.default.url.replace(/\/+$/, '')}/api/sms/inbound/<secret>`;
  protected readonly sender = signal<string | null>(null);
  protected readonly number = signal('');
  protected readonly saving = signal(false);
  protected readonly notice = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    firstValueFrom(this.api.getOrCreate())
      .then((c) => {
        this.sender.set(c.senderId === 'PENDNG' ? null : c.senderId);
        this.number.set(c.inboundNumber ? `+${c.inboundNumber}` : '');
      })
      .catch(() => this.error.set('The SMS channel could not be loaded.'));
  }

  protected async save(): Promise<void> {
    this.saving.set(true);
    this.notice.set(null);
    this.error.set(null);
    try {
      const c = await firstValueFrom(
        this.api.setInboundNumber({ inboundNumber: this.number().trim() || null }),
      );
      this.number.set(c.inboundNumber ? `+${c.inboundNumber}` : '');
      this.notice.set(
        c.inboundNumber
          ? 'Saved. SMS to this number will reach your inbox.'
          : 'Saved. No number is set, so no SMS will come in.',
      );
    } catch (e: unknown) {
      this.error.set(
        (e as { error?: { error?: { message?: string } } })?.error?.error?.message ??
          'The number could not be saved.',
      );
    } finally {
      this.saving.set(false);
    }
  }
}
