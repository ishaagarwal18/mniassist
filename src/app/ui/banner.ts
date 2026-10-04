import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ensureSyncfusionTheme } from '../core/ui/syncfusion-theme';
import { ArIcon } from './icon';

/** `teal` is the informational tone (blue since the rebrand; the name is kept
 *  for existing call sites). `ai` marks an AI insight or recommendation. */
export type BannerTone = 'warn' | 'bad' | 'good' | 'teal' | 'ai';

/** Syncfusion message severity for each tone. `ai` is ours: Syncfusion has no AI style. */
const SF_SEVERITY: Record<BannerTone, string> = {
  warn: 'e-warning',
  bad: 'e-error',
  good: 'e-success',
  teal: 'e-info',
  ai: 'e-ai',
};

/**
 * A Syncfusion message (`e-message`) with Syncfusion's severity icon. Two things
 * are ours: the AI tone, and the diagonal hazard bar — the one decorative device
 * in the system, reserved for Meta enforcement (a template paused, a quality
 * downgrade, an account restriction).
 */
@Component({
  selector: 'ar-banner',
  imports: [ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'hostClass()', role: 'status' },
  template: `
    @if (hazard()) {
      <span class="ar-banner__hazard" aria-hidden="true"></span>
    }
    @if (tone() === 'ai') {
      <ar-icon name="sparkle" [size]="17" class="ar-banner__icon" />
    } @else {
      <span class="e-msg-icon ar-banner__icon" aria-hidden="true"></span>
    }
    <div class="e-msg-content ar-banner__body"><ng-content /></div>
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
      gap: 9px;
      padding: 11px 14px;
      border-radius: var(--ar-radius-card);
      font: 400 13px/1.5 var(--ar-font-sans);
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
    .ar-banner__icon {
      flex: none;
      margin: 0;
    }
    .ar-banner__body {
      flex: 1;
      padding: 0;
      font: inherit;
      color: var(--ar-ink-700);
    }
    :host(.e-ai) {
      background: var(--ar-ai-100);
      border: 1px solid var(--ar-ai-200);
      border-left: 3px solid var(--ar-ai-500);
      color: var(--ar-ai-700);
    }
  `,
})
export class ArBanner {
  readonly tone = input<BannerTone>('warn');
  readonly hazard = input(false);

  protected readonly hostClass = computed(
    () => `e-message ${SF_SEVERITY[this.tone()]} ar-banner ar-banner--${this.tone()}`,
  );

  constructor() {
    ensureSyncfusionTheme();
  }
}
