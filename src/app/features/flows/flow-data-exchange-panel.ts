import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';

import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { FlowDataExchangeService } from '../../proxy/flows/flow-data-exchange.service';
import type { FlowEncryptionKeyDto } from '../../proxy/flows/models';
import { ArButton, ArChip } from '../../ui';

/**
 * One WhatsApp number's Flow data-exchange set-up: the encryption key Meta uses to send live Flow requests (rotate
 * it if it may have leaked), and the industrial Flow pack (RFQ, service booking…) to add as drafts.
 */
@Component({
  selector: 'ar-flow-data-exchange-panel',
  imports: [ArButton, ArChip, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../shared/work-page.scss',
  styles: `
    :host {
      display: block;
      height: auto;
    }
    pre {
      max-height: 140px;
      overflow: auto;
      font-size: 11px;
      background: var(--ar-bg-100);
      padding: 8px;
      border-radius: 6px;
    }
  `,
  template: `
    <h3 class="wp__title">Encryption keys</h3>
    <ul class="wp__list">
      @for (k of keys(); track k.id) {
        <li class="wp__item">
          <span class="wp__grow">
            <span class="wp__name ar-mono" translate="no">{{ k.fingerprint }}</span>
            <span class="wp__sub">
              {{ k.keySizeBits }}-bit · made {{ k.createdAtUtc | date: 'd MMM y' }} ·
              {{
                k.uploadedToMetaAtUtc
                  ? 'sent to Meta ' + (k.uploadedToMetaAtUtc | date: 'd MMM y')
                  : 'not sent to Meta yet'
              }}
            </span>
          </span>
          @if (k.isActive) {
            <ar-chip [tone]="k.isUsable ? 'good' : 'warn'" [dot]="true">{{
              k.isUsable ? 'In use' : 'Not usable'
            }}</ar-chip>
            <button
              ar-button
              type="button"
              variant="ghost"
              (click)="shown.set(shown() === k.id ? null : k.id!)"
            >
              {{ shown() === k.id ? 'Hide public key' : 'Public key' }}
            </button>
          } @else {
            <ar-chip tone="neutral">Replaced</ar-chip>
          }
        </li>
        @if (shown() === k.id) {
          <li>
            <pre translate="no">{{ k.publicKeyPem }}</pre>
          </li>
        }
      } @empty {
        <li class="wp__empty">
          {{ loading() ? 'Loading…' : 'No key yet. Rotating creates the first one.' }}
        </li>
      }
    </ul>
    <div class="wp__actions">
      <button
        ar-button
        type="button"
        variant="ghost"
        [disabled]="busy() !== null"
        (click)="rotate()"
      >
        {{ busy() === 'rotate' ? 'Rotating…' : keys().length ? 'Rotate key' : 'Create key' }}
      </button>
      <button
        ar-button
        type="button"
        variant="primary"
        [disabled]="busy() !== null"
        (click)="installPack()"
      >
        {{ busy() === 'pack' ? 'Adding…' : 'Add industrial Flow pack' }}
      </button>
    </div>
    @if (packNote(); as n) {
      <p class="wp__muted" role="status">{{ n }}</p>
    }
  `,
})
export class ArFlowDataExchangePanel {
  private readonly api = inject(FlowDataExchangeService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);

  readonly channelId = input.required<string>();

  protected readonly keys = signal<FlowEncryptionKeyDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal<string | null>(null);
  protected readonly shown = signal<string | null>(null);
  protected readonly packNote = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = this.channelId();
      untracked(() => void this.load(id));
    });
  }

  private async load(channelId: string): Promise<void> {
    this.loading.set(true);
    try {
      this.keys.set(
        (await firstValueFrom(this.api.getKeys(channelId, { skipHandleError: true }))).items ?? [],
      );
    } catch {
      this.keys.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  protected async rotate(): Promise<void> {
    if (this.keys().length) {
      const ok = await this.dialogs.confirm({
        title: 'Rotate the Flow encryption key?',
        message: 'A new key is made and sent to Meta. Flows keep working once Meta has it.',
        confirmText: 'Rotate key',
      });
      if (!ok) return;
    }
    this.busy.set('rotate');
    try {
      await firstValueFrom(this.api.rotateKey(this.channelId(), { skipHandleError: true }));
      this.toasts.success('New encryption key ready.', 'Flows');
      await this.load(this.channelId());
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The key could not be rotated.'), 'Flows');
    } finally {
      this.busy.set(null);
    }
  }

  protected async installPack(): Promise<void> {
    this.busy.set('pack');
    try {
      const r = await firstValueFrom(
        this.api.installIndustrialPack(this.channelId(), { skipHandleError: true }),
      );
      const made = r.created?.length ?? 0;
      const skipped = r.skippedExisting?.length ?? 0;
      this.packNote.set(
        `${made} Flow${made === 1 ? '' : 's'} added as drafts` +
          (skipped ? `; ${skipped} you already had were left alone.` : '.'),
      );
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The Flow pack could not be added.'), 'Flows');
    } finally {
      this.busy.set(null);
    }
  }
}
