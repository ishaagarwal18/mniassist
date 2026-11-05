import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ReminderChannels } from '../../proxy/activities';
import { CHANNELS, hasChannel, toggleChannel } from './activity-links.logic';

/** Ways a reminder goes out besides the bell, as tick boxes. Extra options (remind the customer) go in as content. */
@Component({
  selector: 'ar-reminder-channels',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="rc" [disabled]="disabled()">
      <legend class="ar-field__label">{{ label() }}</legend>
      <div class="rc__row">
        <span class="rc__fixed">Bell (always)</span>
        @for (c of channels; track c.flag) {
          <label class="rc__check">
            <input
              type="checkbox"
              [checked]="has(c.flag)"
              (change)="toggle(c.flag, $any($event.target).checked)"
            />
            {{ c.label }}
          </label>
        }
      </div>
      <ng-content />
      @if (has(whatsApp) || has(sms)) {
        <p class="rc__hint">
          WhatsApp and SMS need approved templates and mobile numbers on user profiles.
          <a routerLink="/settings/tasks-meetings">Set them up</a>
        </p>
      }
    </fieldset>
  `,
  styles: `
    .rc {
      margin: 0 0 10px;
      padding: 0;
      border: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .rc__row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 16px;
      align-items: center;
      font: 400 13px var(--ar-font-sans);
    }
    .rc__fixed {
      color: var(--ar-ink-400);
    }
    .rc__check {
      display: inline-flex;
      gap: 6px;
      align-items: center;
      cursor: pointer;
    }
    .rc__hint {
      margin: 0;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
  `,
})
export class ArReminderChannels {
  readonly channelsSet = model<ReminderChannels>(ReminderChannels.None, { alias: 'channels' });
  readonly label = input('Remind by');
  readonly disabled = input(false);

  protected readonly channels = CHANNELS;
  protected readonly whatsApp = ReminderChannels.WhatsApp;
  protected readonly sms = ReminderChannels.Sms;

  protected has(flag: ReminderChannels): boolean {
    return hasChannel(this.channelsSet(), flag);
  }

  protected toggle(flag: ReminderChannels, on: boolean): void {
    this.channelsSet.set(toggleChannel(this.channelsSet(), flag, on));
  }
}
