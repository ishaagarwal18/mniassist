import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { canOpenUrl } from '../../core/auth/nav-access.guard';
import { CurrentUserService } from '../../core/services/current-user.service';
import { PlanService } from '../../core/services/plan.service';
import { Customer360Dto } from '../../proxy/sales/customer-360.models';
import { ArIcon } from '../../ui';
import { customerLinkGroups } from './customer-360-links.logic';

@Component({
  selector: 'ar-customer-360-links',
  imports: [RouterLink, ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="cl" aria-label="Everything about this customer">
      <div class="cl__head">
        <h2 class="cl__title">Everything about this customer</h2>
        @if (customer().accountId && canBuyers()) {
          <a
            class="cl__btn"
            routerLink="/contacts/accounts/credit"
            [queryParams]="{ account: customer().accountId }"
          >
            <ar-icon name="billing" [size]="13" /> Buyers &amp; credit
          </a>
        }
      </div>
      <div class="cl__grid">
        @for (g of groups(); track g.title) {
          <div class="cl__group">
            <h3 class="cl__group-title"><ar-icon [name]="g.icon" [size]="14" /> {{ g.title }}</h3>
            <ul class="cl__list">
              @for (l of g.links; track l.label) {
                <li>
                  <a class="cl__link" [routerLink]="l.route" [queryParams]="l.params">
                    <span class="cl__label">{{ l.label }}</span>
                    @if (l.count != null) {
                      <span class="cl__count">{{ l.count }}</span>
                    }
                    <span class="cl__go" aria-hidden="true">→</span>
                  </a>
                  @if (l.hint) {
                    <span class="cl__hint">{{ l.hint }}</span>
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
    .cl {
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      box-shadow: var(--ar-shadow-card);
      padding: 1rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .cl__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .cl__title {
      margin: 0;
      font: 600 0.95rem var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .cl__btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: none;
      cursor: pointer;
      border: 1px solid var(--ar-line-200);
      border-radius: 6px;
      padding: 4px 10px;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-ink-800);
    }
    .cl__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 1rem 1.5rem;
    }
    .cl__group-title {
      margin: 0 0 0.4rem;
      display: flex;
      align-items: center;
      gap: 6px;
      font: 700 0.72rem var(--ar-font-sans);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--ar-ink-500);
    }
    .cl__list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .cl__link {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 6px;
      border-radius: 6px;
      text-decoration: none;
      color: var(--ar-ink-900);
      font: 500 0.84rem var(--ar-font-sans);
    }
    .cl__link:hover {
      background: var(--ar-blue-100);
    }
    .cl__link:focus-visible {
      outline: none;
      box-shadow: var(--ar-focus-ring);
    }
    .cl__label {
      flex: 1;
    }
    .cl__count {
      min-width: 20px;
      padding: 0 6px;
      border-radius: 999px;
      background: var(--ar-bg-50);
      border: 1px solid var(--ar-line-200);
      font: 600 11px var(--ar-font-sans);
      text-align: center;
    }
    .cl__go {
      color: var(--ar-blue-600);
    }
    .cl__hint {
      display: block;
      padding: 0 6px 2px;
      font: 400 11.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
  `,
})
export class ArCustomer360Links {
  private readonly permissions = inject(PermissionService);
  private readonly plans = inject(PlanService);
  private readonly account = inject(CurrentUserService);

  readonly customer = input.required<Customer360Dto>();

  protected readonly canBuyers = computed(() =>
    this.permissions.getGrantedPolicy('AutoReach.ReorderPortal.Settings'),
  );
  /** The customer's inbox conversation, once the page has found it. */
  readonly conversationId = input<string | null>(null);

  protected readonly groups = computed(() => {
    this.account.isHost();
    return customerLinkGroups(this.customer(), this.conversationId())
      .map((g) => ({
        ...g,
        links: g.links.filter((l) =>
          canOpenUrl(l.route, this.permissions, this.plans, this.account),
        ),
      }))
      .filter((g) => g.links.length > 0);
  });
}
