import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ArIcon } from './icon';

/** `teal` is the informational tone (blue since the rebrand; the name is kept
 *  for existing call sites). `ai` marks an AI insight or recommendation. */
export type BannerTone = 'warn' | 'bad' | 'good' | 'teal' | 'ai';

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
    <ar-icon
      [name]="tone() === 'good' ? 'check' : tone() === 'ai' ? 'sparkle' : 'alert'"
      [size]="17"
      class="ar-banner__icon"
    />
    <div class="ar-banner__body"><ng-content /></div>
    <ng-content select="[banner-actions]" />
  `,
  styles: `
    :host {
      position: relative;
      overflow: hidden;
      /* Banners sit in column layouts; never let one shrink and clip its text. */
      flex: none;
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
      border: 1px solid var(--ar-amber-200);
      color: var(--ar-warn-600);
    }
    :host(.ar-banner--bad) {
      background: var(--ar-red-100);
      border: 1px solid var(--ar-red-200);
      color: var(--ar-red-600);
    }
    :host(.ar-banner--good) {
      background: var(--ar-green-100);
      border: 1px solid var(--ar-green-200);
      color: var(--ar-green-600);
    }
    :host(.ar-banner--teal) {
      background: var(--ar-info-100);
      border: 1px solid var(--ar-info-200);
      color: var(--ar-info-600);
    }
    :host(.ar-banner--ai) {
      background: var(--ar-ai-100);
      border: 1px solid var(--ar-ai-200);
      border-left: 3px solid var(--ar-ai-500);
      color: var(--ar-ai-700);
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
