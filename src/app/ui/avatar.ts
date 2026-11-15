import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ensureSyncfusionTheme } from '../core/ui/syncfusion-theme';
import { initials } from '../core/util/format';

/** A Syncfusion avatar (`e-avatar e-avatar-circle`) showing the person's picture, or their initials without one. */
@Component({
  selector: 'ar-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
    '[style.font-size.px]': 'size() * 0.36',
    '[class]': '"e-avatar e-avatar-circle ar-avatar ar-avatar--" + tone()',
    '[attr.title]': 'name()',
  },
  template: `@if (src(); as s) {
      <img class="ar-avatar__img" [src]="s" [alt]="name()" />
    } @else {
      {{ text() }}
    }`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: none;
      font-weight: 600;
      font-family: var(--ar-font-sans);
      line-height: 1;
      overflow: hidden;
    }
    .ar-avatar__img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }
    :host(.ar-avatar--neutral) {
      background: var(--ar-bg-100);
      color: var(--ar-ink-500);
    }
    :host(.ar-avatar--teal) {
      background: var(--ar-primary);
      color: #fff;
    }
  `,
})
export class ArAvatar {
  readonly name = input.required<string>();
  readonly size = input(32);
  readonly tone = input<'neutral' | 'teal'>('neutral');
  /** A picture URL (a data: URL from ProfilePictureService); initials show when it is null. */
  readonly src = input<string | null | undefined>(null);
  protected readonly text = computed(() => initials(this.name()));

  constructor() {
    ensureSyncfusionTheme();
  }
}
