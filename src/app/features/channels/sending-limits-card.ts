import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { PermissionService } from '@abp/ng.core';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ChannelService } from '../../proxy/channels/channel.service';
import { ArButton } from '../../ui';

/** The share kept back from campaigns, and the send rate. What a draft must satisfy; mirrors the API's ranges. */
export function limitsProblem(reservedPercent: number, mps: number): string | null {
  if (!Number.isFinite(reservedPercent) || reservedPercent < 0 || reservedPercent > 90)
    return 'Keep back between 0 and 90 per cent.';
  if (!Number.isInteger(mps) || mps < 1 || mps > 1000)
    return 'Messages per second is a whole number from 1 to 1000.';
  return null;
}

/**
 * How much of a number's daily limit is held back from marketing (so reminders and replies always get through), and how
 * fast the app sends from it.
 */
@Component({
  selector: 'ar-sending-limits-card',
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
    <section class="wp__card">
      <h2 class="wp__title">Sending limits</h2>
      <p class="wp__muted">
        Part of the daily limit is kept for service and utility messages, so a big campaign never
        stops an AMC reminder or a reply going out.
      </p>
      <div class="wp__grid">
        <label class="ar-field" for="sl-reserved">
          <span class="ar-field__label">Keep back from campaigns (%)</span>
          <input
            id="sl-reserved"
            class="ar-field__input"
            type="number"
            min="0"
            max="90"
            step="5"
            [disabled]="!canManage()"
            [value]="reserved()"
            (input)="reserved.set(+$any($event.target).value); error.set(null)"
          />
        </label>
        <label class="ar-field" for="sl-mps">
          <span class="ar-field__label">Messages per second</span>
          <input
            id="sl-mps"
            class="ar-field__input"
            type="number"
            min="1"
            max="1000"
            [disabled]="!canManage()"
            [value]="mps()"
            (input)="mps.set(+$any($event.target).value); error.set(null)"
          />
        </label>
      </div>
      @if (error(); as e) {
        <p class="wp__muted" role="alert">{{ e }}</p>
      }
      @if (canManage()) {
        <div class="wp__actions">
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy() || !loaded()"
            (click)="save()"
          >
            {{ busy() ? 'Saving…' : 'Save limits' }}
          </button>
        </div>
      }
    </section>
  `,
})
export class ArSendingLimitsCard implements OnInit {
  readonly channelId = input.required<string>();
  private readonly api = inject(ChannelService);
  private readonly toasts = inject(ToastService);
  protected readonly canManage = grantedPolicy(
    'AutoReach.Channels.Manage',
    inject(PermissionService),
  );

  protected readonly reserved = signal(20);
  protected readonly mps = signal(80);
  protected readonly loaded = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const c = await firstValueFrom(this.api.get(this.channelId(), { skipHandleError: true }));
      this.reserved.set(Math.round((c.reservedFraction ?? 0.2) * 100));
      this.mps.set(c.throughputMps ?? 80);
      this.loaded.set(true);
    } catch {
      this.error.set('The current limits could not be loaded.');
    }
  }

  protected async save(): Promise<void> {
    const problem = limitsProblem(this.reserved(), this.mps());
    if (problem) {
      this.error.set(problem);
      return;
    }
    this.busy.set(true);
    try {
      await firstValueFrom(
        this.api.update(
          this.channelId(),
          { reservedFraction: this.reserved() / 100, throughputMps: this.mps() },
          { skipHandleError: true },
        ),
      );
      this.toasts.success('Sending limits saved.', 'Number');
    } catch (e: unknown) {
      this.error.set(readApiError(e, 'The limits could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }
}
