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
        <div class="cl__head-info">
          <h2 class="cl__title">Everything about this customer</h2>
          <p class="cl__sub">Operational directory of customer records, active deals, service assets, and financial ledgers</p>
        </div>
        @if (customer().accountId && canBuyers()) {
          <a
            class="cl__btn"
            routerLink="/contacts/accounts/credit"
            [queryParams]="{ account: customer().accountId }"
            title="Configure buyers, purchase managers and credit terms"
          >
            <ar-icon name="billing" [size]="13" />
            <span>Buyers &amp; credit</span>
          </a>
        }
      </div>
      <div class="cl__grid">
        @for (g of groups(); track g.title) {
          <div class="cl__group">
            <div class="cl__group-header">
              <div class="cl__group-icon">
                <ar-icon [name]="g.icon" [size]="15" />
              </div>
              <h3 class="cl__group-title">{{ g.title }}</h3>
            </div>
            <ul class="cl__list">
              @for (l of g.links; track l.label) {
                <li class="cl__item">
                  <a class="cl__link" [routerLink]="l.route" [queryParams]="l.params">
                    <div class="cl__link-content">
                      <span class="cl__label">{{ l.label }}</span>
                      @if (l.hint) {
                        <span class="cl__hint">{{ l.hint }}</span>
                      }
                    </div>
                    <div class="cl__link-meta">
                      @if (l.count != null) {
                        <span class="cl__count">{{ l.count }}</span>
                      }
                      <span class="cl__go" aria-hidden="true">→</span>
                    </div>
                  </a>
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
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow:
        0 1px 3px rgba(15, 23, 42, 0.04),
        0 6px 16px -2px rgba(15, 23, 42, 0.03);
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .cl__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid #f1f5f9;
    }
    .cl__head-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .cl__title {
      margin: 0;
      font: 700 1.0625rem/1.3 var(--ar-font-sans);
      color: #0f172a;
      letter-spacing: -0.01em;
    }
    .cl__sub {
      margin: 0;
      font: 400 0.8125rem/1.3 var(--ar-font-sans);
      color: #64748b;
    }
    .cl__btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #ffffff;
      cursor: pointer;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 6px 12px;
      font: 500 0.8125rem var(--ar-font-sans);
      color: #334155;
      text-decoration: none;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
      transition: all 0.16s ease;

      ar-icon {
        color: #64748b;
      }

      &:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
        color: #0f172a;
        transform: translateY(-1px);
      }
    }
    .cl__grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 1rem;
    }
    .cl__group {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      transition: all 0.18s ease;

      &:hover {
        background: #ffffff;
        border-color: #cbd5e1;
        box-shadow: 0 4px 12px -2px rgba(15, 23, 42, 0.05);
      }
    }
    .cl__group-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #e2e8f0;
    }
    .cl__group-icon {
      width: 28px;
      height: 28px;
      border-radius: 7px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #2563eb;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .cl__group-title {
      margin: 0;
      font: 700 0.75rem/1.2 var(--ar-font-sans);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #0f172a;
    }
    .cl__list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .cl__item {
      list-style: none;
    }
    .cl__link {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      padding: 6px 8px;
      border-radius: 7px;
      text-decoration: none;
      color: #334155;
      transition: all 0.14s ease;

      &:hover {
        background: #eff6ff;
        color: #1d4ed8;

        .cl__go {
          transform: translateX(2px);
          color: #2563eb;
        }
      }
    }
    .cl__link-content {
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
      flex: 1;
    }
    .cl__label {
      font: 500 0.8125rem/1.3 var(--ar-font-sans);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .cl__hint {
      font: 400 0.6875rem/1.2 var(--ar-font-sans);
      color: #94a3b8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .cl__link-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }
    .cl__count {
      min-width: 20px;
      height: 18px;
      padding: 0 6px;
      border-radius: 999px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      font: 600 0.6875rem/18px var(--ar-font-sans);
      color: #0f172a;
      text-align: center;
    }
    .cl__go {
      font-size: 0.75rem;
      color: #94a3b8;
      transition: transform 0.14s ease, color 0.14s ease;
    }

    @media (max-width: 1200px) {
      .cl__grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    @media (max-width: 800px) {
      .cl__grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 540px) {
      .cl__grid {
        grid-template-columns: 1fr;
      }
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
