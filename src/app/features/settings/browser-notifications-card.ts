import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { BrowserNotifications } from '../../core/services/browser-notifications.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { WebPushScope } from '../../proxy/notifications/web-push-scope.enum';
import { ArBanner, ArButton, ArCard, ArChip } from '../../ui';
import { ArAlertTemplateStatus } from '../notifications/alert-template-status';

/**
 * Turns on notifications from this browser (M06-11): a new customer message, a lead or task
 * assigned to you, a mention — shown even with the tab closed, and on a phone with the app installed.
 */
@Component({
  selector: 'ar-browser-notifications-card',
  imports: [ArCard, ArButton, ArBanner, ArChip, ArAlertTemplateStatus],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-card heading="Browser notifications">
      <p class="bn__muted">
        Get told about new customer messages and things assigned to you, even when this tab is
        closed. On a phone, install the app first (browser menu → Add to Home screen).
      </p>
      @if (!push.supported) {
        <ar-banner tone="warn">This browser can’t show notifications.</ar-banner>
      } @else if (!push.serverEnabled()) {
        <ar-banner tone="warn">Browser notifications are switched off on this server.</ar-banner>
      } @else {
        @if (push.permission() === 'denied') {
          <ar-banner tone="warn">
            Notifications are blocked for this site. Allow them in the browser’s site settings (the
            padlock beside the address), then turn them on here.
          </ar-banner>
        }
        <div class="bn__row">
          @if (push.endpoint()) {
            <ar-chip tone="good" [dot]="true">On for this browser</ar-chip>
          } @else {
            <ar-chip tone="neutral" [dot]="true">Off for this browser</ar-chip>
          }
        </div>
        <fieldset class="bn__scope" [disabled]="busy()">
          <legend>Tell me about</legend>
          <label>
            <input
              type="radio"
              name="bn-scope"
              [checked]="push.scope() === Scope.AssignedToMe"
              (change)="choose(Scope.AssignedToMe)"
            />
            Conversations assigned to me, and anything addressed to me
          </label>
          <label>
            <input
              type="radio"
              name="bn-scope"
              [checked]="push.scope() === Scope.AllNewMessages"
              (change)="choose(Scope.AllNewMessages)"
            />
            Also every new message nobody has taken yet
          </label>
        </fieldset>
        <div class="bn__row">
          @if (push.endpoint()) {
            <button
              ar-button
              type="button"
              variant="ghost"
              icon="bell"
              [disabled]="busy()"
              (click)="test()"
            >
              Send a test
            </button>
            <button ar-button type="button" variant="ghost" [disabled]="busy()" (click)="turnOff()">
              Turn off
            </button>
          } @else {
            <button
              ar-button
              type="button"
              variant="primary"
              icon="bell"
              [disabled]="busy()"
              (click)="turnOn()"
            >
              {{ busy() ? 'Turning on…' : 'Turn on notifications' }}
            </button>
          }
        </div>
      }
      <ar-alert-template-status class="bn__alerts" />
    </ar-card>
  `,
  styles: `
    .bn__muted {
      margin: 0 0 10px;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .bn__alerts {
      display: block;
      margin-top: 14px;
    }
    .bn__row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      margin-top: 10px;
    }
    .bn__scope {
      margin: 12px 0 0;
      padding: 0;
      border: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .bn__scope legend {
      margin-bottom: 4px;
      font: 600 12px var(--ar-font-sans);
    }
    .bn__scope label {
      display: flex;
      align-items: center;
      gap: 7px;
    }
  `,
})
export class ArBrowserNotificationsCard {
  protected readonly push = inject(BrowserNotifications);
  private readonly toasts = inject(ToastService);
  protected readonly Scope = WebPushScope;
  protected readonly busy = signal(false);
  private chosen: WebPushScope = WebPushScope.AssignedToMe;

  constructor() {
    void this.push.refresh().catch(() => undefined);
  }

  protected async choose(scope: WebPushScope): Promise<void> {
    this.chosen = scope;
    this.push.scope.set(scope);
    if (this.push.endpoint()) await this.run(() => this.push.setScope(scope));
  }

  protected turnOn(): Promise<void> {
    return this.run(async () => {
      await this.push.enable(this.chosen);
      this.toasts.success('Notifications are on for this browser.');
    });
  }

  protected turnOff(): Promise<void> {
    return this.run(() => this.push.disable());
  }

  protected test(): Promise<void> {
    return this.run(async () => {
      await this.push.sendTest();
      this.toasts.info('A test notification is on its way.');
    });
  }

  private async run(work: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    try {
      await work();
    } catch (e) {
      this.toasts.error(e instanceof Error && !('error' in e) ? e.message : readApiError(e));
    } finally {
      this.busy.set(false);
    }
  }
}
