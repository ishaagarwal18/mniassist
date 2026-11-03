import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** "Showing only <supplier>'s …" above a purchasing list opened from Vendor 360, with the way back to every supplier. */
@Component({
  selector: 'ar-supplier-scope-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="scope-bar" role="status">
      Showing only <strong translate="no">{{ name() || 'this supplier' }}</strong
      >'s {{ what() }}.
      <button type="button" class="scope-bar__all" (click)="showAll.emit()">
        Show all {{ what() }}
      </button>
    </p>
  `,
  styles: `
    .scope-bar {
      margin: 0;
      padding: 0.6rem 0.9rem;
      border: 1px solid var(--ar-line-200);
      border-radius: 8px;
      background: var(--ar-blue-100, #eff6ff);
      font-size: 0.8125rem;
    }
    .scope-bar__all {
      margin-left: 0.5rem;
      background: none;
      border: 0;
      padding: 0;
      color: var(--ar-primary, #0284c7);
      font-weight: 600;
      cursor: pointer;
    }
  `,
})
export class ArSupplierScopeBar {
  readonly name = input<string | null>(null);
  /** What the list holds, e.g. "vendor bills". */
  readonly what = input.required<string>();
  readonly showAll = output<void>();
}
