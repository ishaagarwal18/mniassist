import { PermissionService } from '@abp/ng.core';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { grantedPolicy } from '../../../core/auth/permission';
import { ConfirmService } from '../../../core/ui/confirm.service';
import { ToastService } from '../../../core/ui/toast.service';
import { readApiError } from '../../../core/util/api-error';
import { inr, inrCompact } from '../../../core/util/format';
import { ArTopbar } from '../../../layout/topbar';
import {
  ExecutiveProjectionDashboardDto,
  ProjectionHorizon,
  ProjectionItemStatus,
  ProjectionPlanDto,
  ProjectionPlanService,
  ProjectionPlanStatus,
  ProjectionScenario,
  ScenarioAnalysisResultDto,
} from '../../../proxy/projections';
import { ArBanner, ArButton, ArCard, ArChip, ArDialog, ChipTone } from '../../../ui';
import {
  PlanRow,
  fiscalYearOf,
  fiscalYearOptions,
  itemsFromAnnualTarget,
  itemsOfRows,
  lineName,
  newPlanProblem,
  parseNumber,
  pct,
  rowsOf,
  rowsProblem,
} from './projection-plan.logic';

type Tab = 'overview' | 'lines' | 'scenarios' | 'plans';

/** What the last action did, shown at the top of the page until dismissed. */
interface Outcome {
  tone: 'good' | 'warn';
  title: string;
  lines: string[];
  at: Date;
}

const PLAN_STATUS: Record<ProjectionPlanStatus, { label: string; tone: ChipTone }> = {
  [ProjectionPlanStatus.Draft]: { label: 'Draft', tone: 'neutral' },
  [ProjectionPlanStatus.Active]: { label: 'Active', tone: 'good' },
  [ProjectionPlanStatus.UnderReview]: { label: 'Under review', tone: 'amber' },
  [ProjectionPlanStatus.Archived]: { label: 'Archived', tone: 'neutral' },
};

const ITEM_STATUS: Record<ProjectionItemStatus, { label: string; tone: ChipTone }> = {
  [ProjectionItemStatus.Planned]: { label: 'Not started', tone: 'neutral' },
  [ProjectionItemStatus.OnTrack]: { label: 'On track', tone: 'good' },
  [ProjectionItemStatus.AtRisk]: { label: 'Behind', tone: 'warn' },
  [ProjectionItemStatus.Achieved]: { label: 'Achieved', tone: 'teal' },
};

/**
 * Projection plans: a year's revenue and margin targets by quarter and business line, set against what was actually invoiced.
 * Every action says what it did on the page, and nothing here is sample data: with no plan, the page says so and offers to make one.
 */
@Component({
  selector: 'ar-projection-plan',
  imports: [ArTopbar, ArButton, ArCard, ArChip, ArDialog, ArBanner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './projection-plan.html',
  styleUrl: './projection-plan.scss',
})
export class ArProjectionPlan implements OnInit {
  private readonly api = inject(ProjectionPlanService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);
  private readonly permissions = inject(PermissionService);

  protected readonly canCreate = grantedPolicy(
    'AutoReach.ProjectionPlans.Create',
    this.permissions,
  );
  protected readonly canUpdate = grantedPolicy(
    'AutoReach.ProjectionPlans.Update',
    this.permissions,
  );
  protected readonly canDelete = grantedPolicy(
    'AutoReach.ProjectionPlans.Delete',
    this.permissions,
  );
  protected readonly canSimulate = grantedPolicy(
    'AutoReach.ProjectionPlans.SimulateScenarios',
    this.permissions,
  );

  protected readonly demo = environment.useMockData;
  protected readonly tab = signal<Tab>('overview');
  protected readonly loading = signal(true);
  /** Which action is running, so its button can say so. */
  protected readonly working = signal<string | null>(null);
  protected readonly loadError = signal<string | null>(null);
  protected readonly outcome = signal<Outcome | null>(null);

  protected readonly plans = signal<ProjectionPlanDto[]>([]);
  protected readonly plan = signal<ProjectionPlanDto | null>(null);
  protected readonly dashboard = signal<ExecutiveProjectionDashboardDto | null>(null);
  protected readonly scenarios = signal<ScenarioAnalysisResultDto | null>(null);
  protected readonly scenariosAt = signal<Date | null>(null);

  // ---- lines editing --------------------------------------------------------------------------
  protected readonly editing = signal(false);
  protected readonly rows = signal<PlanRow[]>([]);
  protected readonly lineFilter = signal<string>('all');
  protected readonly shownItems = computed(() => {
    const f = this.lineFilter();
    const items = this.plan()?.items ?? [];
    return f === 'all' ? items : items.filter((i) => i.periodLabel === f);
  });
  protected readonly periods = computed(() => [
    ...new Set((this.plan()?.items ?? []).map((i) => i.periodLabel)),
  ]);

  // ---- dialogs --------------------------------------------------------------------------------
  protected readonly fyOptions = fiscalYearOptions(new Date());
  protected readonly generateOpen = signal(false);
  protected readonly genFy = signal(fiscalYearOf(new Date()));
  protected readonly genGrowth = signal('15');
  protected readonly genMargin = signal('26');
  protected readonly genPipeline = signal(true);

  protected readonly newOpen = signal(false);
  protected readonly newTitle = signal('');
  protected readonly newFy = signal(fiscalYearOf(new Date()));
  protected readonly newRevenue = signal('');
  protected readonly newMargin = signal('26');
  protected readonly newNotes = signal('');
  protected readonly dialogError = signal<string | null>(null);

  // ---- figures --------------------------------------------------------------------------------
  protected readonly realised = computed(() => {
    const d = this.dashboard();
    return d ? pct(d.ytdActualRevenueInPaise, d.totalProjectedAnnualRevenueInPaise) : 0;
  });
  protected readonly hasActuals = computed(() => (this.plan()?.actualRevenueInPaise ?? 0) > 0);

  async ngOnInit(): Promise<void> {
    if (this.demo) {
      this.loading.set(false);
      return;
    }
    await this.load();
  }

  private async load(selectId?: string): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const page = await firstValueFrom(this.api.getList({ maxResultCount: 50 }));
      const plans = page.items ?? [];
      this.plans.set(plans);
      const pick =
        plans.find((p) => p.id === selectId) ??
        plans.find((p) => p.id === this.plan()?.id) ??
        plans.find((p) => p.status === ProjectionPlanStatus.Active) ??
        plans[0];
      if (pick) await this.show(pick.id!);
      else {
        this.plan.set(null);
        this.dashboard.set(null);
      }
    } catch (e: unknown) {
      this.loadError.set(readApiError(e, 'The projection plans could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  /** Opens one plan: its lines and its dashboard. */
  protected async show(id: string): Promise<void> {
    const [plan, dashboard] = await Promise.all([
      firstValueFrom(this.api.get(id)),
      firstValueFrom(this.api.getExecutiveDashboard(id)),
    ]);
    if (this.plan()?.id !== id) {
      this.scenarios.set(null);
      this.scenariosAt.set(null);
      this.editing.set(false);
      this.lineFilter.set('all');
    }
    this.plan.set(plan);
    this.dashboard.set(dashboard);
  }

  protected dayOf(value?: string | Date | null): string {
    if (!value) return '';
    const d = new Date(value);
    return isNaN(d.getTime())
      ? ''
      : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  protected async pickPlan(id: string): Promise<void> {
    if (!id || id === this.plan()?.id) return;
    try {
      await this.show(id);
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The plan could not be opened.'), 'Projection plan');
    }
  }

  private async run(name: string, work: () => Promise<void>, failure: string): Promise<void> {
    this.working.set(name);
    try {
      await work();
    } catch (e: unknown) {
      const message = readApiError(e, failure);
      this.outcome.set({ tone: 'warn', title: failure, lines: [message], at: new Date() });
    } finally {
      this.working.set(null);
    }
  }

  // ---- generate -------------------------------------------------------------------------------

  protected openGenerate(): void {
    this.dialogError.set(null);
    this.generateOpen.set(true);
  }

  protected async generate(): Promise<void> {
    const growth = parseNumber(this.genGrowth());
    const margin = parseNumber(this.genMargin());
    if (!Number.isFinite(growth) || growth < -50 || growth > 200) {
      this.dialogError.set('Growth must be a percentage between -50 and 200.');
      return;
    }
    if (!Number.isFinite(margin) || margin < 0 || margin > 95) {
      this.dialogError.set('Gross margin must be 0 to 95%.');
      return;
    }
    await this.run(
      'generate',
      async () => {
        const r = await firstValueFrom(
          this.api.generatePlanFromPipelineAndActuals({
            fiscalYear: this.genFy(),
            horizon: ProjectionHorizon.Quarterly,
            growthRatePercent: growth,
            targetGrossMarginPercent: margin,
            includePipelineWeightings: this.genPipeline(),
          }),
        );
        this.generateOpen.set(false);
        await this.load(r.plan.id!);
        this.tab.set('overview');
        this.outcome.set({
          tone: r.usedPlaceholderBaseline ? 'warn' : 'good',
          title: `Made ${r.plan.planCode}: ${this.money(r.plan.targetRevenueInPaise)} target for FY ${r.plan.fiscalYear}`,
          lines: [
            ...r.steps,
            'It is a draft. Check the figures under Lines, then Activate it to make it the plan you track.',
          ],
          at: new Date(),
        });
      },
      'The plan could not be generated.',
    );
  }

  // ---- new plan -------------------------------------------------------------------------------

  protected openNew(): void {
    this.newTitle.set(`FY ${this.newFy()} plan`);
    this.newRevenue.set('');
    this.newNotes.set('');
    this.dialogError.set(null);
    this.newOpen.set(true);
  }

  protected async createPlan(): Promise<void> {
    const problem = newPlanProblem(this.newTitle(), this.newRevenue(), this.newMargin());
    if (problem) {
      this.dialogError.set(problem);
      return;
    }
    const annual = parseNumber(this.newRevenue());
    const margin = parseNumber(this.newMargin());
    await this.run(
      'new',
      async () => {
        const created = await firstValueFrom(
          this.api.create({
            title: this.newTitle().trim(),
            fiscalYear: this.newFy(),
            horizon: ProjectionHorizon.Quarterly,
            baseScenario: ProjectionScenario.Realistic,
            notes: this.newNotes().trim() || undefined,
            items: itemsFromAnnualTarget(this.newFy(), annual, margin),
          }),
        );
        this.newOpen.set(false);
        await this.load(created.id!);
        this.tab.set('lines');
        this.outcome.set({
          tone: 'good',
          title: `Made ${created.planCode}: ${created.title}`,
          lines: [
            `${this.money(created.targetRevenueInPaise)} for FY ${created.fiscalYear}, split into 4 quarters and 5 business lines at ${margin}% gross margin.`,
            'Adjust any line under Lines (Edit targets), then Sync actuals to compare it with your invoices.',
          ],
          at: new Date(),
        });
      },
      'The plan could not be made.',
    );
  }

  // ---- sync, scenarios, activate, delete ------------------------------------------------------

  protected async sync(): Promise<void> {
    const plan = this.plan();
    if (!plan) return;
    await this.run(
      'sync',
      async () => {
        const r = await firstValueFrom(this.api.syncActualsFromErp(plan.id!));
        await this.show(plan.id!);
        this.tab.set('overview');
        this.outcome.set({
          tone: r.invoiceCount > 0 ? 'good' : 'warn',
          title:
            r.invoiceCount > 0
              ? `Actuals updated from ${r.invoiceCount} invoice${r.invoiceCount === 1 ? '' : 's'}`
              : 'No invoices in this plan’s year',
          lines: [r.summary],
          at: new Date(),
        });
      },
      'Actuals could not be read from the invoices.',
    );
  }

  protected async runScenarios(): Promise<void> {
    const plan = this.plan();
    if (!plan) return;
    await this.run(
      'scenarios',
      async () => {
        this.scenarios.set(await firstValueFrom(this.api.runScenarioAnalysis(plan.id!)));
        this.scenariosAt.set(new Date());
        this.tab.set('scenarios');
      },
      'The scenarios could not be worked out.',
    );
  }

  protected async activate(): Promise<void> {
    const plan = this.plan();
    if (!plan) return;
    await this.run(
      'activate',
      async () => {
        await firstValueFrom(this.api.activatePlan(plan.id!));
        await this.load(plan.id!);
        this.outcome.set({
          tone: 'good',
          title: `${plan.planCode} is now the active plan`,
          lines: ['Any plan that was active before is back to draft.'],
          at: new Date(),
        });
      },
      'The plan could not be activated.',
    );
  }

  protected async remove(): Promise<void> {
    const plan = this.plan();
    if (!plan || !(await this.dialogs.delete('projection plan', plan.planCode))) return;
    await this.run(
      'delete',
      async () => {
        await firstValueFrom(this.api.delete(plan.id!));
        this.plan.set(null);
        await this.load();
        this.outcome.set({
          tone: 'good',
          title: `${plan.planCode} deleted`,
          lines: [],
          at: new Date(),
        });
      },
      'The plan could not be deleted.',
    );
  }

  // ---- editing lines --------------------------------------------------------------------------

  protected startEdit(): void {
    this.rows.set(rowsOf(this.plan()?.items ?? []));
    this.editing.set(true);
    this.lineFilter.set('all');
  }

  protected editRow(key: string, field: 'revenue' | 'margin', value: string): void {
    this.rows.update((rows) => rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  protected async saveRows(): Promise<void> {
    const plan = this.plan();
    if (!plan) return;
    const problem = rowsProblem(this.rows());
    if (problem) {
      this.toasts.warning(problem, 'Projection plan');
      return;
    }
    const before = plan.targetRevenueInPaise;
    await this.run(
      'save',
      async () => {
        const saved = await firstValueFrom(
          this.api.update(plan.id!, {
            title: plan.title,
            fiscalYear: plan.fiscalYear,
            horizon: plan.horizon,
            baseScenario: plan.baseScenario,
            notes: plan.notes,
            items: itemsOfRows(this.rows()),
          }),
        );
        // New lines start without actuals: read the invoices into them again straight away.
        const synced = this.canUpdate()
          ? await firstValueFrom(this.api.syncActualsFromErp(saved.id!))
          : null;
        this.editing.set(false);
        await this.show(saved.id!);
        this.outcome.set({
          tone: 'good',
          title: 'Targets saved',
          lines: [
            `Revenue target ${this.money(before)} → ${this.money(saved.targetRevenueInPaise)}; gross margin ${saved.targetGrossMarginPercent}%.`,
            ...(synced ? [synced.summary] : []),
          ],
          at: new Date(),
        });
      },
      'The targets could not be saved.',
    );
  }

  // ---- display --------------------------------------------------------------------------------

  protected money(paise: number | null | undefined): string {
    return inr(paise ?? 0);
  }

  protected compact(paise: number | null | undefined): string {
    return inrCompact((paise ?? 0) / 100);
  }

  protected line(l: number): string {
    return lineName(l);
  }

  protected planStatus(s: ProjectionPlanStatus) {
    return PLAN_STATUS[s] ?? PLAN_STATUS[ProjectionPlanStatus.Draft];
  }

  protected itemStatus(s: ProjectionItemStatus) {
    return ITEM_STATUS[s] ?? ITEM_STATUS[ProjectionItemStatus.Planned];
  }

  protected bar(part: number, whole: number): number {
    return Math.min(100, pct(part, whole));
  }

  protected time(d: Date): string {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  protected readonly Active = ProjectionPlanStatus.Active;
}
