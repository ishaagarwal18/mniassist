import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ToastService } from '../../core/ui/toast.service';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArCard } from '../../ui';
import {
  VoiceCallBatchService,
} from '../../proxy/calling/voice-call-batch.service';
import { ChannelService } from '../../proxy/channels/channel.service';
import { ChannelDto } from '../../proxy/channels/models';

type VoiceLine = 'whatsapp' | 'phone' | 'sip';

function toMinute(time: string): number {
  const [h, m] = (time || '00:00').split(':').map((s) => Number(s) || 0);
  return h * 60 + m;
}

@Component({
  selector: 'ar-new-voice-batch-page',
  imports: [FormsModule, ArTopbar, ArButton, ArCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Schedule AI Call Batch"
      subtitle="Configure outbound automated campaign calls and compliance calling windows"
    >
      <button ar-button type="button" variant="ghost" (click)="cancel()">
        Back to Batches
      </button>
    </ar-topbar>

    <div class="page-container ar-scroll">
      <ar-card heading="Campaign & Channel Parameters">
        <form class="batch-form" (submit)="$event.preventDefault(); create()">
          <label class="ar-field">
            <span class="ar-field__label">Batch Campaign Name <span class="required">*</span></span>
            <input
              class="ar-field__input"
              required
              maxlength="128"
              placeholder="e.g. Q4 Machinery Maintenance Followup"
              [(ngModel)]="name"
              name="batchName"
            />
          </label>

          <div class="form-grid">
            <label class="ar-field">
              <span class="ar-field__label">Calling Channel <span class="required">*</span></span>
              <select class="ar-field__input" [(ngModel)]="channelId" name="channelId">
                @for (channel of channels(); track channel.id) {
                  <option [value]="channel.id">
                    {{ channel.verifiedName || channel.displayPhoneNumber || channel.id }}
                  </option>
                }
              </select>
            </label>

            <label class="ar-field">
              <span class="ar-field__label">Line / Protocol <span class="required">*</span></span>
              <select class="ar-field__input" [(ngModel)]="line" name="line">
                <option value="whatsapp">WhatsApp Voice</option>
                <option value="phone">Cellular / PSTN</option>
                <option value="sip">SIP Trunk</option>
              </select>
            </label>
          </div>

          <label class="ar-field">
            <span class="ar-field__label">Agent Objective / Prompt Context</span>
            <textarea
              class="ar-field__input"
              rows="3"
              maxlength="500"
              placeholder="Context or objective provided to the voice agent for this specific campaign..."
              [(ngModel)]="purpose"
              name="purpose"
            ></textarea>
          </label>

          <h3 class="section-title">Calling Window & Schedule</h3>
          <div class="form-grid-3">
            <label class="ar-field">
              <span class="ar-field__label">Starts At</span>
              <input
                class="ar-field__input"
                type="datetime-local"
                [(ngModel)]="startsAt"
                name="startsAt"
              />
            </label>

            <label class="ar-field">
              <span class="ar-field__label">Allowed From (Local)</span>
              <input
                class="ar-field__input"
                type="time"
                min="09:00"
                max="21:00"
                [(ngModel)]="windowStart"
                name="windowStart"
              />
            </label>

            <label class="ar-field">
              <span class="ar-field__label">Allowed To (Local)</span>
              <input
                class="ar-field__input"
                type="time"
                min="09:00"
                max="21:00"
                [(ngModel)]="windowEnd"
                name="windowEnd"
              />
            </label>
          </div>

          <h3 class="section-title">Concurrency & Retry Rules</h3>
          <div class="form-grid-3">
            <label class="ar-field">
              <span class="ar-field__label">Max Concurrent Calls</span>
              <input
                class="ar-field__input"
                type="number"
                min="1"
                max="20"
                [(ngModel)]="maxConcurrent"
                name="maxConcurrent"
              />
            </label>

            <label class="ar-field">
              <span class="ar-field__label">Max Attempts per Contact</span>
              <input
                class="ar-field__input"
                type="number"
                min="1"
                max="5"
                [(ngModel)]="maxAttempts"
                name="maxAttempts"
              />
            </label>

            <label class="ar-field">
              <span class="ar-field__label">Retry After (Minutes)</span>
              <input
                class="ar-field__input"
                type="number"
                min="15"
                max="1440"
                [(ngModel)]="retryAfterMinutes"
                name="retryAfterMinutes"
              />
            </label>
          </div>

          <p class="rules-note">
            Outbound calls are restricted to the customer's daylight business hours (09:00 to 21:00)
            in compliance with Telecom Regulatory Authority and TRAI rules.
          </p>

          @if (error()) {
            <p class="error-msg" role="alert">{{ error() }}</p>
          }

          <div class="form-actions">
            <button ar-button type="button" variant="ghost" (click)="cancel()">
              Cancel
            </button>
            <button
              ar-button
              type="submit"
              variant="primary"
              [disabled]="busy() || !name().trim() || !channelId()"
            >
              {{ busy() ? 'Scheduling batch…' : 'Create & Schedule Batch' }}
            </button>
          </div>
        </form>
      </ar-card>
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 1.5rem 2rem 3rem;
        max-width: 800px;
      }
      .batch-form {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        padding-top: 0.5rem;
      }
      .section-title {
        font-size: 0.95rem;
        font-weight: 600;
        color: var(--ar-ink-900);
        margin: 0.5rem 0 -0.25rem;
      }
      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }
      .form-grid-3 {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 1rem;
      }
      .rules-note {
        font-size: 0.8125rem;
        color: var(--ar-ink-500);
        background: var(--ar-surface-subtle);
        border: 1px solid var(--ar-line-200);
        padding: 0.625rem 0.875rem;
        border-radius: var(--ar-radius-md);
        margin: 0;
      }
      .required {
        color: var(--ar-bad-600);
      }
      .error-msg {
        color: var(--ar-bad-600);
        font-size: 0.875rem;
        margin: 0;
      }
      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid var(--ar-line-200);
      }
      @media (max-width: 640px) {
        .form-grid,
        .form-grid-3 {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ArNewVoiceBatchPage implements OnInit {
  private readonly router = inject(Router);
  private readonly api = inject(VoiceCallBatchService);
  private readonly channelsApi = inject(ChannelService);
  private readonly toasts = inject(ToastService);

  protected readonly channels = signal<ChannelDto[]>([]);
  protected readonly name = signal('');
  protected readonly channelId = signal('');
  protected readonly line = signal<VoiceLine>('whatsapp');
  protected readonly purpose = signal('');
  protected readonly startsAt = signal(
    new Date(Date.now() + 10 * 60_000).toISOString().slice(0, 16),
  );
  protected readonly windowStart = signal('09:00');
  protected readonly windowEnd = signal('21:00');
  protected readonly maxConcurrent = signal(2);
  protected readonly maxAttempts = signal(2);
  protected readonly retryAfterMinutes = signal(120);

  protected readonly busy = signal(false);
  protected readonly error = signal('');

  async ngOnInit(): Promise<void> {
    try {
      const res = await firstValueFrom(this.channelsApi.getList({ maxResultCount: 50 }));
      const items = res?.items || [];
      this.channels.set(items);
      if (items.length > 0 && items[0].id && !this.channelId()) {
        this.channelId.set(items[0].id);
      }
    } catch {
      // Ignore
    }
  }

  cancel(): void {
    void this.router.navigateByUrl('/calls/ai-batches');
  }

  async create(): Promise<void> {
    const nameVal = this.name().trim();
    const chId = this.channelId();
    if (!nameVal || !chId || this.busy()) return;

    const windowStartMinute = toMinute(this.windowStart());
    const windowEndMinute = toMinute(this.windowEnd());

    if (
      windowStartMinute < 540 ||
      windowEndMinute > 1260 ||
      windowEndMinute - windowStartMinute < 30
    ) {
      this.error.set('Calling window must be between 09:00 and 21:00 and at least 30 minutes long.');
      return;
    }

    this.busy.set(true);
    this.error.set('');
    try {
      await firstValueFrom(
        this.api.create({
          name: nameVal,
          channelId: chId,
          line: this.line(),
          purpose: this.purpose().trim() || undefined,
          startsAtUtc: this.startsAt() ? new Date(this.startsAt()).toISOString() : null,
          windowStartMinute,
          windowEndMinute,
          maxConcurrent: Number(this.maxConcurrent()) || 1,
          maxAttempts: Number(this.maxAttempts()) || 1,
          retryAfterMinutes: Number(this.retryAfterMinutes()) || 60,
        }),
      );
      this.toasts.success(`Batch "${nameVal}" created and scheduled.`);
      void this.router.navigateByUrl('/calls/ai-batches');
    } catch {
      this.error.set('Failed to create call batch. Please verify parameters.');
    } finally {
      this.busy.set(false);
    }
  }
}
