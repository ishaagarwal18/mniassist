import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ArIcon } from './icon';

export type BannerTone = 'warn' | 'bad' | 'good' | 'teal';

/** Platform-enforcement notices. The diagonal hazard bar is the one decorative
 *  device in the system and it is reserved for Meta enforcement — a template
 *  paused, a quality downgrade, an account restriction. */
@Component({
  selector: 'ar-banner',
  imports: [ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': '"ar-banner ar-banner--" + tone()', role: 'status' },
  template: `
    @if (hazard()) {
      <span class="ar-banner__hazard" aria-hidden="true"></span>
    }
    <ar-icon [name]="tone() === 'good' ? 'check' : 'alert'" [size]="17" class="ar-banner__icon" />
    <div class="ar-banner__body"><ng-content /></div>
    <ng-content select="[banner-actions]" />
  `,
  styles: `
    :host {
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      gap: 13px;
      padding: 12px 16px;
      border-radius: var(--ar-radius-card);
      font: 400 13px var(--ar-font-sans);
      line-height: 1.5;
    }
    .ar-banner__hazard {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 5px;
      background: repeating-linear-gradient(45deg, currentColor 0 6px, transparent 6px 12px);
    }
    .ar-banner__hazard ~ .ar-banner__icon {
      margin-left: 6px;
    }
    .ar-banner__body {
      flex: 1;
    }

    :host(.ar-banner--warn) {
      background: var(--ar-warn-100);
      border: 1px solid #ebd9a8;
      color: var(--ar-warn-600);
    }
    :host(.ar-banner--bad) {
      background: var(--ar-red-100);
      border: 1px solid #f0cfcd;
      color: var(--ar-red-600);
    }
    :host(.ar-banner--good) {
      background: var(--ar-green-100);
      border: 1px solid #cbe5d6;
      color: var(--ar-green-600);
    }
    :host(.ar-banner--teal) {
      background: var(--ar-teal-100);
      border: 1px solid #c8e3e5;
      color: var(--ar-teal-600);
    }
    .ar-banner__body {
      color: var(--ar-ink-700);
    }
  `,
})
export class ArBanner {
  readonly tone = input<BannerTone>('warn');
  readonly hazard = input(false);
}
