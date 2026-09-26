import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ArIcon, IconName } from './icon';

export type ButtonVariant = 'primary' | 'ghost' | 'quiet' | 'danger';

@Component({
  selector: 'button[ar-button]',
  imports: [ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': '"ar-btn ar-btn--" + variant()',
    '[attr.type]': 'type()',
    '[attr.disabled]': 'disabled() || null',
  },
  template: `
    @if (icon(); as i) {
      <ar-icon [name]="i" [size]="15" />
    }
    <ng-content />
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      height: var(--ar-control-h);
      padding: 0 13px;
      border-radius: var(--ar-radius-control);
      font: 500 13px var(--ar-font-sans);
      cursor: pointer;
      white-space: nowrap;
      transition:
        background-color 0.12s ease,
        border-color 0.12s ease;
    }
    :host(:disabled) {
      opacity: 0.5;
      cursor: not-allowed;
    }

    :host(.ar-btn--primary) {
      background: var(--ar-amber-600);
      color: #fff;
      border: 1px solid var(--ar-amber-600);
    }
    :host(.ar-btn--primary):hover:not(:disabled) {
      background: #8c4a0c;
      border-color: #8c4a0c;
    }

    :host(.ar-btn--ghost) {
      background: var(--ar-white);
      color: var(--ar-ink-700);
      border: 1px solid var(--ar-line-300);
    }
    :host(.ar-btn--ghost):hover:not(:disabled) {
      background: var(--ar-bg-50);
    }

    :host(.ar-btn--quiet) {
      background: transparent;
      color: var(--ar-ink-500);
      border: 1px solid transparent;
    }
    :host(.ar-btn--quiet):hover:not(:disabled) {
      background: var(--ar-bg-100);
    }

    :host(.ar-btn--danger) {
      background: var(--ar-white);
      color: var(--ar-red-600);
      border: 1px solid var(--ar-line-300);
    }
    :host(.ar-btn--danger):hover:not(:disabled) {
      background: var(--ar-red-100);
      border-color: var(--ar-red-100);
    }
  `,
})
export class ArButton {
  readonly variant = input<ButtonVariant>('primary');
  readonly icon = input<IconName | null>(null);
  readonly type = input<'button' | 'submit'>('button');
  readonly disabled = input(false);
}
