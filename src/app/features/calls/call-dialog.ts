import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { CallLogDto, CallSetupDto } from '../../proxy/voice';
import { ArButton, ArDialog } from '../../ui';
import { errorMessage } from '../activities/activity-logic';
import { CallGateway } from './call-mock';
import { displayNumber, looksLikeNumber } from './call-logic';

/**
 * Calling a contact from the app. The rep's own phone rings first; when they answer, the customer is rung and the two are joined, with the
 * workspace's business number as the caller id. No headset or softphone: only a phone and a number to ring.
 */
@Component({
  selector: 'ar-call-dialog',
  imports: [ArDialog, ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog [title]="'Call ' + contactName()" (dismiss)="closed.emit(started())">
      @if (loading()) {
        <p class="cd__hint">Checking that calling is set up…</p>
      } @else if (started(); as call) {
        <p class="cd__ok" role="status">
          Ringing <strong>{{ ringing() }}</strong> now. Pick up, and we connect {{ contactName() }}. The call shows in the log when it ends,
          and you can say how it went then.
        </p>
      } @else if (setup(); as s) {
        @if (!s.channelReady) {
          <p class="cd__err" role="alert">
            Calling is not set up yet ({{ s.channelProblem }}). An administrator connects the Exotel account under Channels.
          </p>
        } @else {
          <p class="cd__hint">
            Your phone rings first. When you answer, {{ contactName() }} is rung and connected to you. They see the business number, not
            yours.
          </p>

          <label class="ar-field" for="cd-number">
            <span class="ar-field__label">Ring me on</span>
            <input
              id="cd-number"
              class="ar-field__input"
              inputmode="tel"
              autocomplete="tel"
              placeholder="98123 45678"
              [value]="number()"
              (input)="number.set($any($event.target).value)"
            />
          </label>
          @if (number().trim() && !numberOk()) {
            <p class="cd__err">That does not look like a phone number.</p>
          }
          @if (changed()) {
            <label class="cd__chk" for="cd-save">
              <input id="cd-save" type="checkbox" [checked]="save()" (change)="save.set($any($event.target).checked)" />
              <span>Use this number from now on</span>
            </label>
          }

          <label class="cd__chk" for="cd-record">
            <input id="cd-record" type="checkbox" [checked]="record()" (change)="record.set($any($event.target).checked)" />
            <span>Record the call</span>
          </label>
          @if (record()) {
            <p class="cd__hint">Tell the customer the call is being recorded. Recording without their agreement is not allowed.</p>
          }
        }
      }

      @if (error(); as msg) {
        <p class="cd__err" role="alert">{{ msg }}</p>
      }

      <div dialogActions>
        <button ar-button type="button" variant="ghost" (click)="closed.emit(started())">{{ started() ? 'Done' : 'Cancel' }}</button>
        @if (!started() && setup()?.channelReady) {
          <button ar-button type="button" variant="primary" icon="phone" [disabled]="busy() || !canStart()" (click)="start()">
            {{ busy() ? 'Calling…' : 'Call now' }}
          </button>
        }
      </div>
    </ar-dialog>
  `,
  styles: `
    .cd__hint { margin: 0 0 10px; font: 400 12.5px/1.5 var(--ar-font-sans); color: var(--ar-ink-600); }
    .cd__ok { margin: 0; padding: 10px 12px; border-radius: var(--ar-radius-control); background: var(--ar-bg-100); font: 400 13px/1.5 var(--ar-font-sans); color: var(--ar-ink-800); }
    .cd__err { margin: 8px 0 0; padding: 8px 10px; border-radius: var(--ar-radius-control); background: var(--ar-red-100); color: var(--ar-red-600); font: 500 12px var(--ar-font-sans); }
    .cd__chk { display: flex; align-items: center; gap: 8px; margin: 6px 0; font: 400 12.5px var(--ar-font-sans); color: var(--ar-ink-700); }
  `,
})
export class ArCallDialog implements OnInit {
  private readonly api = inject(CallGateway).api;

  readonly contactId = input.required<string>();
  readonly contactName = input('the customer');
  /** The deal the call is about, so it lands on the deal's history. */
  readonly enquiryId = input<string | null>(null);
  /** Emitted on close with the call if one was started, so the page behind can refresh. */
  readonly closed = output<CallLogDto | null>();

  protected readonly setup = signal<CallSetupDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly number = signal('');
  protected readonly save = signal(false);
  protected readonly record = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly started = signal<CallLogDto | null>(null);

  protected readonly numberOk = computed(() => looksLikeNumber(this.number()));
  protected readonly canStart = computed(() => this.numberOk());
  /** Typing a number other than the one on file offers to keep it. */
  protected readonly changed = computed(() => {
    const on = (this.setup()?.myNumber ?? '').replace(/\D/g, '');
    return this.numberOk() && this.number().replace(/\D/g, '').slice(-10) !== on.slice(-10);
  });
  protected readonly ringing = computed(() => displayNumber(this.setup()?.myNumber) || this.number().trim());

  async ngOnInit(): Promise<void> {
    try {
      const s = await firstValueFrom(this.api.getSetup());
      this.setup.set(s);
      this.number.set(s.myNumber ? displayNumber(s.myNumber) : '');
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'Could not check whether calling is set up.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected async start(): Promise<void> {
    if (!this.canStart() || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      const call = await firstValueFrom(
        this.api.start({
          contactId: this.contactId(),
          enquiryId: this.enquiryId(),
          repNumber: this.number().trim(),
          saveNumber: this.save() || !this.setup()?.myNumber,
          record: this.record(),
        }),
      );
      // What was rung is what the rep typed, as the server normalised it.
      this.setup.update((s) => (s ? { ...s, myNumber: this.number().replace(/\D/g, '').length === 10 ? `91${this.number().replace(/\D/g, '')}` : this.number().replace(/\D/g, '') } : s));
      this.started.set(call);
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'The call could not be placed.'));
    } finally {
      this.busy.set(false);
    }
  }
}
