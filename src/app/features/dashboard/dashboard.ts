import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { PermissionService } from '@abp/ng.core';
import { canAccessNavItem } from '../../core/auth/permission';
import { PlanService } from '../../core/services/plan.service';
import { NAV, NavItem } from '../../layout/nav.model';
import { CrmTaskService } from '../../proxy/activities/activity.service';
import { InventoryService } from '../../proxy/inventory/inventory.service';
import { SalesInvoiceStatus } from '../../proxy/sales/sales-enums';
import { SalesInvoiceService } from '../../proxy/sales/sales-invoice.service';
import { overdueInvoices, workItems } from './work-today.logic';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { RouterLink } from '@angular/router';
import { CustomDashboardService, DashboardRenderDto } from '../../proxy/analytics';
import { formatMetric, pinnedHomeDashboard } from '../analytics/dashboard-home';
import { ChannelService } from '../../core/services/channel.service';
import { DashboardStore } from '../../core/services/dashboard.service';
import { CampaignStore } from '../../core/services/campaign.service';
import { CurrentUserService } from '../../core/services/current-user.service';
import { count, inr, inrCompact, pct } from '../../core/util/format';
import { TIER_LIMIT } from '../../core/models/channel.model';
import { ArTopbar } from '../../layout/topbar';
import {
  ArButton,
  ArCard,
  ArChannelHealthStrip,
  ArChip,
  ArIcon,
  ArMeter,
  ArStatTile,
} from '../../ui';
import { ArGrid } from '../../ui/grid';

@Component({
  selector: 'ar-dashboard',
  imports: [
    RouterLink,
    ArTopbar,
    ArCard,
    ArStatTile,
    ArChip,
    ArIcon,
    ArButton,
    ArMeter,
    ArChannelHealthStrip,
    ArGrid,
    GridModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class ArDashboard {
  private readonly channels = inject(ChannelService);
  private readonly dashboard = inject(DashboardStore);
  private readonly campaignStore = inject(CampaignStore);

  protected readonly channel = this.channels.active;
  /** The signed-in workspace; empty for a host user, who belongs to none. */
  protected readonly workspaceName = inject(CurrentUserService).tenantName;

  protected readonly volume = this.dashboard.volume;
  protected readonly inbox = this.dashboard.inbox;
  protected readonly pipeline = this.dashboard.pipeline;
  protected readonly spend = this.dashboard.spend;
  protected readonly mix = this.dashboard.mix;
  private readonly account = inject(CurrentUserService);
  private readonly permissions = inject(PermissionService);
  private readonly plan = inject(PlanService);
  private readonly tasksApi = inject(CrmTaskService);
  private readonly invoicesApi = inject(SalesInvoiceService);
  private readonly stockApi = inject(InventoryService);

  /** Whether this person may open a page: the sidebar's own check (role, plan, feature). */
  private may(route: string): boolean {
    this.account.permissionState();
    this.plan.plan();
    this.plan.features();
    const item = NAV.flatMap((g) => g.items).find((i: NavItem) => i.route === route);
    return !!item && canAccessNavItem(item, this.permissions, this.plan, this.account);
  }

  private readonly taskFacts = rxResource({
    params: () => ({ ok: this.may('/tasks'), me: this.account.id() }),
    stream: ({ params }) =>
      !params.ok || !params.me
        ? of(null)
        : this.tasksApi
            .getSummary(-new Date().getTimezoneOffset(), params.me)
            .pipe(catchError(() => of(null))),
    defaultValue: null,
  });

  private readonly invoiceFacts = rxResource({
    params: () => ({ ok: this.may('/sales/invoices') }),
    stream: ({ params }) => {
      if (!params.ok) return of(null);
      const page = (status: SalesInvoiceStatus) =>
        this.invoicesApi.getList({ status, maxResultCount: 200, skipCount: 0 });
      return forkJoin([
        page(SalesInvoiceStatus.Issued),
        page(SalesInvoiceStatus.PartiallyPaid),
        page(SalesInvoiceStatus.Draft),
      ]).pipe(
        map(([issued, part, draft]) => ({
          ...overdueInvoices([...(issued.items ?? []), ...(part.items ?? [])], new Date()),
          drafts: draft.totalCount ?? (draft.items ?? []).length,
        })),
        catchError(() => of(null)),
      );
    },
    defaultValue: null,
  });

  private readonly stockFacts = rxResource({
    params: () => ({ ok: this.may('/stock/planning') }),
    stream: ({ params }) =>
      !params.ok
        ? of(null)
        : this.stockApi.getLevels(null, true).pipe(
            map((rows) => rows.length),
            catchError(() => of(null)),
          ),
    defaultValue: null,
  });

  /** Business work first (overdue before due), then the messaging items, most urgent first. */
  protected readonly todo = computed(() => {
    const tasks = this.taskFacts.value();
    const inv = this.invoiceFacts.value();
    const work = workItems(
      {
        tasksOverdue: tasks?.overdue ?? null,
        tasksDueToday: tasks?.dueToday ?? null,
        invoicesOverdue: inv?.count ?? null,
        overdueInPaise: inv?.paise ?? 0,
        draftInvoices: inv?.drafts ?? null,
        lowStock: this.stockFacts.value(),
      },
      inr,
    );
    const rank = { bad: 0, amber: 1, teal: 2, good: 3 } as const;
    return [...work, ...this.dashboard.actionItems()].sort((a, b) => rank[a.tone] - rank[b.tone]);
  });

  protected readonly walletLabel = computed(() => inr(this.spend().walletBalanceInPaise));

  protected readonly pipelineValueLabel = computed(() =>
    inrCompact(this.pipeline().openValueInPaise / 100),
  );

  protected readonly deliveryLabel = computed(
    () => `${(this.volume().deliveryRate * 100).toFixed(1)}% delivered`,
  );

  protected readonly freeShare = computed(() =>
    this.mix()
      .filter((s) => s.free)
      .reduce((n, s) => n + s.share, 0),
  );

  protected readonly freeShareLabel = computed(() => `${this.freeShare()}%`);

  protected readonly avoidedLabel = computed(
    () => inr(this.spend().avoidedCharge24hInPaise) + ' avoided in the last 24h',
  );

  private readonly dashboardsApi = inject(CustomDashboardService);
  /**
   * The custom dashboard this person pinned to home (on this device), rendered by the server.
   * Nothing is shown when none is pinned or the pinned one has since been deleted.
   */
  private readonly homeDashboard = rxResource({
    params: () => ({ id: pinnedHomeDashboard() }),
    stream: ({ params }) =>
      !params.id
        ? of(null as DashboardRenderDto | null)
        : this.dashboardsApi
            .getList()
            .pipe(
              switchMap((list) =>
                (list.items ?? []).some((d) => d.id === params.id)
                  ? this.dashboardsApi.render(params.id!)
                  : of(null as DashboardRenderDto | null),
              ),
            ),
    defaultValue: null as DashboardRenderDto | null,
  });
  protected readonly customDashboard = computed(() =>
    this.homeDashboard.error() ? null : this.homeDashboard.value(),
  );
  protected readonly formatMetric = formatMetric;

  protected readonly freeMessagesLabel = computed(() => count(this.spend().freeMessages24h));

  /** The five most recent campaigns, for the table. */
  protected readonly recent = computed(() =>
    this.campaignStore
      .campaigns()
      .slice()
      .sort((a, b) => (b.scheduledAt ?? '').localeCompare(a.scheduledAt ?? ''))
      .slice(0, 5)
      .map((c) => ({
        name: c.name,
        state: c.state,
        sent: c.dispatched,
        recipients: c.estimatedRecipients,
        cost: inr(c.estimatedCostInPaise),
        free: c.estimatedCostInPaise === 0,
      })),
  );

  protected readonly usageLabel = computed(() => {
    const ch = this.channel();
    if (!ch) return '—';
    const limit = TIER_LIMIT[ch.tier];
    return limit ? `${count(ch.used24h)} / ${count(limit)}` : count(ch.used24h);
  });

  protected readonly usagePct = computed(() => {
    const ch = this.channel();
    if (!ch) return '—';
    const limit = TIER_LIMIT[ch.tier];
    return limit ? pct(ch.used24h, limit, 0) : '—';
  });

  protected readonly tierLimit = computed(() => {
    const ch = this.channel();
    return ch ? (TIER_LIMIT[ch.tier] ?? 0) : 0;
  });

  protected readonly count = count;

  protected chipToneFor(state: string): 'neutral' | 'amber' | 'teal' | 'good' | 'warn' | 'bad' {
    switch (state) {
      case 'running':
        return 'teal';
      case 'completed':
        return 'good';
      case 'scheduled':
        return 'amber';
      case 'suspended':
      case 'cancelled':
        return 'bad';
      default:
        return 'neutral';
    }
  }
}
