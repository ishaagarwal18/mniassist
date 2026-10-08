import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PermissionService } from '@abp/ng.core';

import { checkPolicy } from '../../core/auth/permission';
import { ArTopbar } from '../../layout/topbar';
import { ArIcon, IconName } from '../../ui';

interface ReportLink {
  readonly title: string;
  readonly route: string;
  readonly icon: IconName;
  readonly description: string;
  readonly permission?: string;
}

interface ReportGroup {
  readonly heading: string;
  readonly reports: readonly ReportLink[];
}

const GROUPS: readonly ReportGroup[] = [
  {
    heading: 'Sales and marketing',
    reports: [
      {
        title: 'Analytics',
        route: '/analytics',
        icon: 'analytics',
        description:
          'Messages, spend, delivery and first-reply time against the period before; template and agent performance; how enquiries convert.',
        permission: 'AutoReach.Analytics',
      },
      {
        title: 'Campaign results',
        route: '/analytics/campaigns',
        icon: 'campaign',
        description:
          'Each campaign from send to sale: replies, enquiries, value won and cost per enquiry.',
        permission: 'AutoReach.Analytics',
      },
      {
        title: 'Ad attribution',
        route: '/analytics/ads',
        icon: 'analytics',
        description: 'Which Click-to-WhatsApp ads start chats that become enquiries and orders.',
        permission: 'AutoReach.Analytics',
      },
      {
        title: 'Forecast',
        route: '/forecast',
        icon: 'analytics',
        description: 'Expected sales for the coming months from the open pipeline, against target.',
        permission: 'AutoReach.Pipeline',
      },
    ],
  },
  {
    heading: 'Stock and money',
    reports: [
      {
        title: 'Business reports',
        route: '/reports/business',
        icon: 'document',
        description:
          'Stock value, turnover, ABC and idle parts; collections, time to pay and what customers owe.',
        permission: 'AutoReach.Inventory || AutoReach.Payments',
      },
      {
        title: 'Stock planning',
        route: '/stock/planning',
        icon: 'machine',
        description: 'What to order now, and what will run out before the next delivery.',
        permission: 'AutoReach.Inventory',
      },
      {
        title: 'AMC renewals',
        route: '/renewals',
        icon: 'refresh',
        description: 'Contracts coming up for renewal and the revenue at stake.',
        permission: 'AutoReach.Renewals',
      },
    ],
  },
  {
    heading: 'Your own views',
    reports: [
      {
        title: 'Custom dashboards',
        route: '/analytics/dashboards',
        icon: 'analytics',
        description: 'The numbers you care about on one page, for you or the whole team.',
        permission: 'AutoReach.Analytics',
      },
      {
        title: 'Scheduled reports',
        route: '/settings/reports',
        icon: 'clock',
        description:
          'A daily, weekly or monthly summary by email, WhatsApp or in-app, with the full report as a PDF.',
        permission: 'AutoReach.Analytics',
      },
    ],
  },
];

/**
 * Every report in one place, grouped by the question it answers. Only the reports the
 * signed-in person may open are listed.
 */
@Component({
  selector: 'ar-reports-hub',
  imports: [RouterLink, ArTopbar, ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Reports"
      subtitle="Every report in one place"
      help="All of the app's reports, grouped by what they answer. The period you pick on one report carries over to the next."
    />
    <div class="rh ar-scroll">
      @for (g of groups(); track g.heading) {
        <section class="rh__group">
          <h2 class="rh__h">{{ g.heading }}</h2>
          <div class="rh__grid">
            @for (r of g.reports; track r.route) {
              <a class="rh__card" [routerLink]="r.route">
                <span class="rh__icon"><ar-icon [name]="r.icon" [size]="18" /></span>
                <span class="rh__body">
                  <span class="rh__title">{{ r.title }}</span>
                  <span class="rh__desc">{{ r.description }}</span>
                </span>
              </a>
            }
          </div>
        </section>
      } @empty {
        <p class="rh__empty">You do not have access to any reports. Ask a workspace admin.</p>
      }
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }
    .rh {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 18px 24px 32px;
      display: flex;
      flex-direction: column;
      gap: 22px;
    }
    .rh__h {
      margin: 0 0 10px;
      font: 600 12px var(--ar-font-sans);
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: var(--ar-ink-500);
    }
    .rh__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 12px;
    }
    .rh__card {
      display: flex;
      gap: 12px;
      padding: 14px 16px;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      box-shadow: var(--ar-shadow-card);
      text-decoration: none;
      color: inherit;
      transition: border-color 0.12s ease;
    }
    .rh__card:hover,
    .rh__card:focus-visible {
      border-color: var(--ar-primary);
    }
    .rh__icon {
      flex: none;
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 8px;
      background: var(--ar-line-100, var(--ar-line-200));
      color: var(--ar-primary);
    }
    .rh__body {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }
    .rh__title {
      font: 600 13.5px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .rh__desc {
      font: 400 12px/1.45 var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .rh__empty {
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    @media (max-width: 600px) {
      .rh {
        padding: 14px 16px 24px;
      }
    }
  `,
})
export class ArReportsHub {
  private readonly permissions = inject(PermissionService);

  protected readonly groups = computed(() =>
    GROUPS.map((g) => ({
      heading: g.heading,
      reports: g.reports.filter((r) => checkPolicy(r.permission, this.permissions)),
    })).filter((g) => g.reports.length > 0),
  );
}
