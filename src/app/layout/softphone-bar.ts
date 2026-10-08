import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { PermissionService } from '@abp/ng.core';

import { grantedPolicy } from '../core/auth/permission';
import { formatDuration } from '../core/services/softphone-logic';
import { SoftphoneService } from '../core/services/softphone.service';
import { toE164Digits } from '../features/calls/call-logic';
import { ArButton, ArIcon } from '../ui';

/**
 * The in-browser phone, docked in the app shell so a rep can answer or place a call from anywhere — not just from a contact's or a
 * deal's own page. Shows nothing for a workspace that has never turned the softphone on; once it has, this is where a call rings,
 * plays and hangs up.
 */
@Component({
  selector: 'ar-softphone-bar',
  imports: [ArButton, ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (canUse() && softphone.configured()) {
      <div class="sp" [class.sp--live]="callState() !== 'idle'">
        @switch (callState()) {
          @case ('idle') {
            <button
              type="button"
              class="sp__pill"
              [class.sp__pill--on]="connection() === 'registered'"
              (click)="dialerOpen.set(!dialerOpen())"
            >
              <ar-icon name="phone" [size]="14" />
              <span>{{ statusLabel() }}</span>
            </button>
            @if (dialerOpen()) {
              <div class="sp__dialer">
                <input
                  class="ar-field__input"
                  inputmode="tel"
                  placeholder="98123 45678"
                  [value]="number()"
                  (input)="number.set($any($event.target).value)"
                  (keydown.enter)="dial()"
                />
                <button
                  ar-button
                  type="button"
                  variant="primary"
                  icon="phone"
                  [disabled]="!canDial()"
                  (click)="dial()"
                >
                  Call
                </button>
              </div>
              @if (softphone.error(); as msg) {
                <p class="sp__err">{{ msg }}</p>
              }
            }
          }
          @case ('calling') {
            <div class="sp__row">
              <ar-icon name="phone" [size]="14" />
              <span>Calling {{ label() }}…</span>
              <button ar-button type="button" variant="danger" (click)="softphone.hangup()">
                Cancel
              </button>
            </div>
          }
          @case ('ringing-in') {
            <div class="sp__row sp__row--ring">
              <ar-icon name="phone" [size]="14" />
              <span>Incoming: {{ label() }}</span>
              <button ar-button type="button" variant="primary" (click)="softphone.answer()">
                Answer
              </button>
              <button ar-button type="button" variant="danger" (click)="softphone.decline()">
                Decline
              </button>
            </div>
          }
          @case ('connected') {
            <div class="sp__row">
              <ar-icon name="phone" [size]="14" />
              <span>{{ label() }} · {{ duration() }}</span>
              <button
                ar-button
                type="button"
                variant="ghost"
                [disabled]="!canDtmf()"
                (click)="keypadOpen.set(!keypadOpen())"
              >
                Keypad
              </button>
              <button
                ar-button
                type="button"
                [variant]="softphone.muted() ? 'primary' : 'ghost'"
                (click)="softphone.toggleMute()"
              >
                {{ softphone.muted() ? 'Unmute' : 'Mute' }}
              </button>
              <button ar-button type="button" variant="danger" (click)="softphone.hangup()">
                Hang up
              </button>
            </div>
            @if (keypadOpen()) {
              <div class="sp__keys">
                @for (k of keys; track k) {
                  <button type="button" class="sp__key" (click)="softphone.sendDigit(k)">
                    {{ k }}
                  </button>
                }
              </div>
            }
          }
        }
      </div>
    }
  `,
  styles: `
    :host {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 40;
    }
    .sp {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .sp--live {
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      padding: 10px 12px;
      box-shadow: 0 8px 24px rgba(16, 20, 26, 0.16);
    }

    .sp__pill {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 7px 14px;
      border-radius: 999px;
      border: 1px solid var(--ar-line-200);
      background: var(--ar-white);
      box-shadow: 0 8px 24px rgba(16, 20, 26, 0.16);
      cursor: pointer;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-ink-600);
    }
    .sp__pill--on {
      color: var(--ar-ink-900);
    }
    .sp__pill--on ar-icon {
      color: var(--ar-green-600, var(--ar-teal-600));
    }

    .sp__dialer {
      display: flex;
      gap: 6px;
      margin-top: 6px;
      padding: 10px;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      box-shadow: 0 8px 24px rgba(16, 20, 26, 0.16);
    }
    .sp__dialer input {
      width: 160px;
    }
    .sp__err {
      margin: 4px 0 0;
      font: 500 11.5px var(--ar-font-sans);
      color: var(--ar-red-600);
    }

    .sp__row {
      display: flex;
      align-items: center;
      gap: 10px;
      font: 500 13px var(--ar-font-sans);
      color: var(--ar-ink-900);
      white-space: nowrap;
    }
    .sp__row--ring ar-icon {
      color: var(--ar-blue-600);
    }

    .sp__keys {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      margin-top: 8px;
    }
    .sp__key {
      padding: 8px 0;
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-control);
      background: var(--ar-white);
      cursor: pointer;
      font: 600 14px var(--ar-font-sans);
      color: var(--ar-ink-800);
    }
  `,
})
export class ArSoftphoneBar {
  protected readonly softphone = inject(SoftphoneService);
  private readonly permissions = inject(PermissionService);

  protected readonly canUse = grantedPolicy('AutoReach.Inbox.Reply', this.permissions);

  protected readonly callState = this.softphone.callState;
  protected readonly connection = this.softphone.connection;

  protected readonly dialerOpen = signal(false);
  protected readonly keypadOpen = signal(false);
  protected readonly number = signal('');

  protected readonly canDial = computed(() => this.number().replace(/\D/g, '').length >= 10);
  protected readonly canDtmf = computed(() => this.connection() === 'registered');

  constructor() {
    if (this.canUse()) {
      void this.softphone.ensureConnected();
    }
  }

  protected readonly keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

  protected statusLabel(): string {
    switch (this.connection()) {
      case 'registered':
        return 'In-browser phone';
      case 'connecting':
        return 'Connecting…';
      case 'failed':
        return 'Phone offline';
      default:
        return 'Phone';
    }
  }

  protected label(): string {
    const c = this.softphone.call();
    if (!c) return '';
    return c.contactName || c.remoteNumber;
  }

  protected duration(): string {
    return formatDuration(this.softphone.durationSeconds());
  }

  protected async dial(): Promise<void> {
    if (!this.canDial()) return;
    const e164 = toE164Digits(this.number());
    this.dialerOpen.set(false);
    this.number.set('');
    await this.softphone.dial({ number: e164 });
  }
}
