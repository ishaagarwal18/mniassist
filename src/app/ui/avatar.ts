import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { initials } from '../core/util/format';

@Component({
  selector: 'ar-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
    '[style.font-size.px]': 'size() * 0.36',
    '[class]': '"ar-avatar ar-avatar--" + tone()',
    '[attr.title]': 'name()',
  },
  template: `{{ text() }}`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      flex: none;
      font-weight: 600;
      font-family: var(--ar-font-sans);
      line-height: 1;
    }
    :host(.ar-avatar--neutral) {
      background: var(--ar-bg-100);
      color: var(--ar-ink-500);
    }
    :host(.ar-avatar--teal) {
      background: var(--ar-teal-600);
      color: #fff;
    }
  `,
})
export class ArAvatar {
  readonly name = input.required<string>();
  readonly size = input(32);
  readonly tone = input<'neutral' | 'teal'>('neutral');
  protected readonly text = computed(() => initials(this.name()));
}
