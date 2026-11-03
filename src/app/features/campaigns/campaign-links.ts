import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { canOpenUrl } from '../../core/auth/nav-access.guard';
import { CurrentUserService } from '../../core/services/current-user.service';
import { PlanService } from '../../core/services/plan.service';
import { Campaign } from '../../core/services/campaign.service';
import { ArIcon } from '../../ui';
import { campaignLinkGroups } from './campaign-links.logic';

/** "Everything about this campaign": its template, audience and every related screen, that the user may open. */
@Component({
  selector: 'ar-campaign-links',
  imports: [RouterLink, ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="cl" aria-label="Everything about this campaign">
      <h2 class="cl__title">Everything about this campaign</h2>
      <div class="cl__grid">
        @for (g of groups(); track g.title) {
          <div class="cl__group">
            <h3 class="cl__group-title"><ar-icon [name]="g.icon" [size]="14" /> {{ g.title }}</h3>
            <ul class="cl__list">
              @for (l of g.links; track l.label) {
                <li>
                  <a class="cl__link" [routerLink]="l.route" [queryParams]="l.params">
                    <span class="cl__label">{{ l.label }}</span>
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
      border-top: 1px solid var(--ar-line-200);
      padding: 0.9rem 0 0;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .cl__title {
      margin: 0;
      font: 600 0.95rem var(--ar-font-sans);
      color: var(--ar-ink-900);
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
export class ArCampaignLinks {
  private readonly permissions = inject(PermissionService);
  private readonly plans = inject(PlanService);
  private readonly account = inject(CurrentUserService);

  readonly campaign = input.required<Campaign>();
  /** The sending number's name, when the list of numbers has it. */
  readonly channelName = input<string | null>(null);

  protected readonly groups = computed(() => {
    this.account.isHost();
    return campaignLinkGroups(this.campaign(), this.channelName())
      .map((g) => ({
        ...g,
        links: g.links.filter((l) =>
          canOpenUrl(l.route, this.permissions, this.plans, this.account),
        ),
      }))
      .filter((g) => g.links.length > 0);
  });
}
