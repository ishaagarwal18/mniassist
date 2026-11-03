import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { canOpenUrl } from '../../../core/auth/nav-access.guard';
import { CurrentUserService } from '../../../core/services/current-user.service';
import { PlanService } from '../../../core/services/plan.service';
import { Vendor360Dto } from '../../../proxy/purchasing/vendor-360.models';
import { ArIcon } from '../../../ui';
import { vendorLinkGroups } from './vendor-360-links.logic';

/** "Everything about this supplier": every related screen, opened on this supplier, that the user may open. */
@Component({
  selector: 'ar-vendor-360-links',
  imports: [RouterLink, ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="vl" aria-label="Everything about this supplier">
      <h2 class="vl__title">Everything about this supplier</h2>
      <div class="vl__grid">
        @for (g of groups(); track g.title) {
          <div class="vl__group">
            <h3 class="vl__group-title"><ar-icon [name]="g.icon" [size]="14" /> {{ g.title }}</h3>
            <ul class="vl__list">
              @for (l of g.links; track l.label) {
                <li>
                  <a class="vl__link" [routerLink]="l.route" [queryParams]="l.params">
                    <span class="vl__label">{{ l.label }}</span>
                    @if (l.count != null) {
                      <span class="vl__count">{{ l.count }}</span>
                    }
                    <span class="vl__go" aria-hidden="true">→</span>
                  </a>
                  @if (l.hint) {
                    <span class="vl__hint">{{ l.hint }}</span>
                  }
                </li>
              }
            </ul>
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    .vl {
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      box-shadow: var(--ar-shadow-card);
      padding: 1rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .vl__title {
      margin: 0;
      font: 600 0.95rem var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .vl__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 1rem 1.5rem;
    }
    .vl__group-title {
      margin: 0 0 0.4rem;
      display: flex;
      align-items: center;
      gap: 6px;
      font: 700 0.72rem var(--ar-font-sans);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--ar-ink-500);
    }
    .vl__list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .vl__link {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 6px;
      border-radius: 6px;
      text-decoration: none;
      color: var(--ar-ink-900);
      font: 500 0.84rem var(--ar-font-sans);
    }
    .vl__link:hover {
      background: var(--ar-blue-100);
    }
    .vl__link:focus-visible {
      outline: none;
      box-shadow: var(--ar-focus-ring);
    }
    .vl__label {
      flex: 1;
    }
    .vl__count {
      min-width: 20px;
      padding: 0 6px;
      border-radius: 999px;
      background: var(--ar-bg-50);
      border: 1px solid var(--ar-line-200);
      font: 600 11px var(--ar-font-sans);
      text-align: center;
    }
    .vl__go {
      color: var(--ar-blue-600);
    }
    .vl__hint {
      display: block;
      padding: 0 6px 2px;
      font: 400 11.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
  `,
})
export class ArVendor360Links {
  private readonly permissions = inject(PermissionService);
  private readonly plans = inject(PlanService);
  private readonly account = inject(CurrentUserService);

  readonly vendor = input.required<Vendor360Dto>();

  protected readonly groups = computed(() => {
    this.account.isHost();
    return vendorLinkGroups(this.vendor())
      .map((g) => ({
        ...g,
        links: g.links.filter((l) =>
          canOpenUrl(l.route, this.permissions, this.plans, this.account),
        ),
      }))
      .filter((g) => g.links.length > 0);
  });
}
