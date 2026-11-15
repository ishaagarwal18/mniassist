import { ChangeDetectionStrategy, Component, OnInit, inject, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';

import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import type { ResellerNumberDto } from '../../proxy/channels/telecom.models';
import { TelecomService } from '../../proxy/channels/telecom.service';
import { ArButton } from '../../ui';

/** Numbers free in the platform's pool, cheapest first; taking one allocates it to this workspace. */
@Component({
  selector: 'ar-pool-numbers-card',
  imports: [ArButton, DecimalPipe],
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
      <h2 class="wp__title">Choose a number from the pool</h2>
      <p class="wp__muted">
        Ready-to-use numbers you can take for this workspace. Rental is billed monthly.
      </p>
      <ul class="wp__list">
        @for (n of numbers(); track n.id) {
          <li class="wp__item">
            <span class="wp__grow">
              <span class="wp__name ar-mono" translate="no">{{ n.e164 }}</span>
              <span class="wp__sub">
                {{ n.tspCarrier }} · ₹{{ n.monthlyRentalInr | number: '1.0-0' }} a month
                @if (n.setupFeeInr) {
                  · ₹{{ n.setupFeeInr | number: '1.0-0' }} set-up
                }
              </span>
            </span>
            <button
              ar-button
              type="button"
              variant="primary"
              [disabled]="busy() !== null"
              (click)="take(n)"
            >
              {{ busy() === n.id ? 'Taking…' : 'Take this number' }}
            </button>
          </li>
        } @empty {
          <li class="wp__empty">
            {{ loading() ? 'Loading…' : 'No numbers are free in the pool right now.' }}
          </li>
        }
      </ul>
    </section>
  `,
})
export class ArPoolNumbersCard implements OnInit {
  private readonly api = inject(TelecomService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);

  readonly taken = output<ResellerNumberDto>();

  protected readonly numbers = signal<ResellerNumberDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      this.numbers.set(
        await firstValueFrom(this.api.getAvailablePoolNumbers({ skipHandleError: true })),
      );
    } catch {
      this.numbers.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  protected async take(n: ResellerNumberDto): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: `Take ${n.e164}?`,
      message: `It becomes this workspace's number, at ₹${n.monthlyRentalInr} a month.`,
      confirmText: 'Take number',
    });
    if (!ok) return;
    this.busy.set(n.id ?? null);
    try {
      const got = await firstValueFrom(
        this.api.allocateNumber(n.id!, {}, { skipHandleError: true }),
      );
      this.toasts.success(`${got.e164} is now yours.`, 'Telecom');
      this.taken.emit(got);
      await this.load();
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The number could not be taken.'), 'Telecom');
    } finally {
      this.busy.set(null);
    }
  }
}
