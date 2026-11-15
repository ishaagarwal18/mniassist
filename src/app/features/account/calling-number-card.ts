import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { readApiError } from '../../core/util/api-error';
import { CallService } from '../../proxy/voice/call.service';
import { ArBanner, ArButton, ArCard } from '../../ui';

/** A 10-digit Indian mobile, or any number with a country code (+ and 8–15 digits). */
export function isCallableNumber(value: string): boolean {
  const digits = value.replace(/[\s()-]/g, '');
  return /^[6-9]\d{9}$/.test(digits) || /^\+?\d{8,15}$/.test(digits);
}

/** The phone the Call button rings first when you call a customer (click-to-call bridges your phone to theirs). */
@Component({
  selector: 'ar-calling-number-card',
  imports: [ArBanner, ArButton, ArCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-card heading="Your calling number">
      @if (problem(); as p) {
        <ar-banner tone="warn">Calling is not set up for this workspace yet: {{ p }}</ar-banner>
      }
      @if (error(); as e) {
        <ar-banner tone="bad">{{ e }}</ar-banner>
      }
      @if (saved()) {
        <ar-banner tone="good">Saved. Calls you start will ring this phone first.</ar-banner>
      }
      <label class="ar-field">
        <span class="ar-field__label">Phone to ring when you call a customer</span>
        <input
          class="ar-field__input"
          type="tel"
          autocomplete="tel"
          placeholder="98xxxxxxxx"
          [value]="number()"
          (input)="number.set($any($event.target).value); saved.set(false)"
        />
      </label>
      <button
        ar-button
        type="button"
        variant="primary"
        [disabled]="busy() || !valid()"
        (click)="save()"
      >
        {{ busy() ? 'Saving…' : 'Save number' }}
      </button>
    </ar-card>
  `,
})
export class ArCallingNumberCard implements OnInit {
  private readonly api = inject(CallService);

  protected readonly number = signal('');
  protected readonly problem = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly saved = signal(false);
  protected readonly busy = signal(false);

  protected valid(): boolean {
    return isCallableNumber(this.number());
  }

  async ngOnInit(): Promise<void> {
    try {
      const s = await firstValueFrom(this.api.getSetup({ skipHandleError: true }));
      this.number.set(s.myNumber ?? '');
      this.problem.set(s.channelReady ? null : (s.channelProblem ?? 'no calling line connected'));
    } catch {
      /* the card still lets them type a number */
    }
  }

  protected async save(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const s = await firstValueFrom(
        this.api.setMyNumber(this.number().replace(/[\s()-]/g, ''), { skipHandleError: true }),
      );
      this.number.set(s.myNumber ?? this.number());
      this.saved.set(true);
    } catch (e: unknown) {
      this.error.set(readApiError(e, 'The number could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }
}
