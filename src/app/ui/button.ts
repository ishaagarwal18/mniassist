import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
} from '@angular/core';

import { ensureSyncfusionTheme } from '../core/ui/syncfusion-theme';
import { ArIcon, IconName } from './icon';

/** `ai` is for actions that run AI (draft, suggest, summarise) — teal, and only there. */
export type ButtonVariant = 'primary' | 'ghost' | 'quiet' | 'danger' | 'ai';

/** Syncfusion's button classes for each variant. `ai` is ours: Syncfusion has no AI style. */
const SF_CLASSES: Record<ButtonVariant, string> = {
  primary: 'e-primary',
  ghost: '',
  quiet: 'e-flat',
  danger: 'e-outline e-danger',
  ai: 'e-primary',
};

/**
 * A Syncfusion button (`e-btn`, Tailwind 3 theme recoloured to the brand) on a
 * real `<button>` (or `<a>` for links that look like buttons), so keyboard and
 * form behaviour come free. Our styles only
 * set the compact enterprise density and the AI variant.
 */
@Component({
  selector: 'button[ar-button], a[ar-button]',
  imports: [ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClass()',
    '[attr.type]': 'isLink ? null : type()',
    '[attr.disabled]': 'disabled() || null',
  },
  template: `
    @if (icon(); as i) {
      <ar-icon class="e-btn-icon" [name]="i" [size]="15" />
    }
    <ng-content />
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      height: var(--ar-control-h);
      padding: 0 13px;
      font: 500 13px var(--ar-font-sans);
      line-height: 1;
      white-space: nowrap;
      text-transform: none;
      text-decoration: none;
    }
    :host(:focus-visible) {
      outline: none;
      box-shadow: var(--ar-focus-ring);
    }
    :host(.ar-btn--primary) {
      box-shadow: var(--ar-glow-primary);
    }
    :host(.ar-btn--ai) {
      background: var(--ar-ai-fill);
      border-color: var(--ar-ai-fill);
      color: #fff;
    }
    :host(.ar-btn--ai):hover:not(:disabled) {
      background: var(--ar-ai-fill-hover);
      border-color: var(--ar-ai-fill-hover);
    }
    .e-btn-icon {
      margin: 0;
      width: auto;
    }
  `,
})
export class ArButton {
  readonly variant = input<ButtonVariant>('primary');
  readonly icon = input<IconName | null>(null);
  readonly type = input<'button' | 'submit'>('button');
  readonly disabled = input(false);

  protected readonly hostClass = computed(
    () => `e-btn ${SF_CLASSES[this.variant()]} ar-btn ar-btn--${this.variant()}`,
  );

  /** On an `<a ar-button>` (a link styled as a button) there is no button type. */
  protected readonly isLink =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.tagName === 'A';

  constructor() {
    ensureSyncfusionTheme();
  }
}
