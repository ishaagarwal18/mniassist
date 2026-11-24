import { PermissionService } from '@abp/ng.core';
import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  ViewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { GridComponent, GridModule } from '@syncfusion/ej2-angular-grids';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import {
  GetProjectsInput,
  ProjectBoardColumnDto,
  ProjectListItemDto,
  ProjectOutcome,
  ProjectService,
  ProjectStage,
} from '../../proxy/projects/project.service';
import { TenderAlertDto, TenderFeedService } from '../../proxy/projects/tender-feed.service';
import { ArBanner, ArButton, ArChip } from '../../ui';
import { ArIcon } from '../../ui/icon';
import { ArGrid } from '../../ui/grid';
import {
  OUTCOME_TEXT,
  STAGE_DECIDER,
  STAGE_TEXT,
  STAGES,
  needsDetails,
  rupeesShort,
} from './project.logic';
import { PickListStore } from '../../core/pick-lists/pick-list.store';

type View = 'list' | 'board';

/**
 * Enterprise Sales Projects Management Dashboard.
 * Includes interactive 6-stage Kanban board, compact KPI analytics,
 * unified search & filters, single-click stage progression, and high-density list view.
 */
@Component({
  selector: 'ar-projects-page',
  imports: [
    ArTopbar,
    ArButton,
    ArBanner,
    ArChip,
    ArIcon,
    RouterLink,
    DatePipe,
    GridModule,
    ArGrid,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './projects-page.html',
  styleUrl: './projects-page.scss',
})
export class ArProjectsPage {
  @ViewChild(GridComponent) protected grid?: GridComponent;

  private readonly api = inject(ProjectService);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);
  private readonly permissions = inject(PermissionService);
  private readonly tenders = inject(TenderFeedService);
  private readonly pickLists = inject(PickListStore);

  protected readonly canCreate = grantedPolicy('AutoReach.Projects.Create', this.permissions);
  protected readonly canUpdate = grantedPolicy('AutoReach.Projects.Update', this.permissions);
  protected readonly canManage = grantedPolicy('AutoReach.Projects.Manage', this.permissions);
  protected readonly canSeeAll = grantedPolicy('AutoReach.Projects.ViewAll', this.permissions);

  protected readonly view = signal<View>(
    (localStorage.getItem('ar.projects.view') as View | null) === 'list' ? 'list' : 'board',
  );
  protected readonly items = signal<ProjectListItemDto[]>([]);
  protected readonly board = signal<ProjectBoardColumnDto[]>([]);
  protected readonly total = signal(0);
  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(false);

  // ---- Filters ---------------------------------------------------------
  protected readonly filter = signal('');
  protected readonly stage = signal<ProjectStage | null>(null);
  protected readonly sector = signal('');
  protected readonly soon = signal(false);
  protected readonly openOnly = signal(true);

  // ---- Tender Feed & Suggestions ---------------------------------------
  protected readonly suggestions = signal<TenderAlertDto[]>([]);
  protected readonly suggestionsExpanded = signal(false);
  protected readonly deciding = signal<string | null>(null);

  protected readonly STAGES = STAGES;
  protected readonly STAGE_TEXT = STAGE_TEXT;
  protected readonly STAGE_DECIDER = STAGE_DECIDER;
  protected readonly OUTCOME_TEXT = OUTCOME_TEXT;
  protected readonly Outcome = ProjectOutcome;
  protected readonly ProjectStage = ProjectStage;
  protected readonly SECTORS = computed(() => this.pickLists.texts('project.sector'));
  protected readonly rupees = rupeesShort;

  private dragged: ProjectListItemDto | null = null;

  // ---- KPI Calculations ------------------------------------------------
  protected readonly totalProjectsCount = computed(() => {
    if (this.view() === 'board') {
      return this.board().reduce((n, c) => n + c.items.length, 0);
    }
    return this.total();
  });

  protected readonly identifiedCount = computed(() => {
    if (this.view() === 'board') {
      return this.board().find((c) => c.stage === ProjectStage.Identified)?.items.length ?? 0;
    }
    return this.items().filter((p) => p.stage === ProjectStage.Identified).length;
  });

  protected readonly activeCount = computed(() => {
    const activeStages = [ProjectStage.Design, ProjectStage.Specified, ProjectStage.Tender];
    if (this.view() === 'board') {
      return this.board()
        .filter((c) => activeStages.includes(c.stage))
        .reduce((sum, c) => sum + c.items.length, 0);
    }
    return this.items().filter((p) => activeStages.includes(p.stage)).length;
  });

  protected readonly inTenderCount = computed(() => {
    if (this.view() === 'board') {
      return this.board().find((c) => c.stage === ProjectStage.Tender)?.items.length ?? 0;
    }
    return this.items().filter((p) => p.stage === ProjectStage.Tender).length;
  });

  protected readonly awardedCount = computed(() => {
    if (this.view() === 'board') {
      return this.board().find((c) => c.stage === ProjectStage.Awarded)?.items.length ?? 0;
    }
    return this.items().filter((p) => p.stage === ProjectStage.Awarded).length;
  });

  protected readonly totalProjectsValue = computed(() => {
    if (this.view() === 'board') {
      return this.board().reduce((sum, c) => sum + c.totalValueInPaise, 0);
    }
    return this.items().reduce((sum, p) => sum + (p.ourScopeValueInPaise ?? 0), 0);
  });

  protected readonly activeFiltersCount = computed(() => {
    let count = 0;
    if (this.filter().trim()) count++;
    if (this.stage() != null) count++;
    if (this.sector()) count++;
    if (this.soon()) count++;
    if (!this.openOnly() && this.view() === 'list') count++;
    return count;
  });

  constructor() {
    void this.load();
  }

  protected stageText(stage: ProjectStage): string {
    return STAGE_TEXT[stage] || 'Stage';
  }

  protected outcomeText(outcome: ProjectOutcome): string {
    return OUTCOME_TEXT[outcome] || '';
  }

  protected setView(v: View): void {
    this.view.set(v);
    localStorage.setItem('ar.projects.view', v);
    void this.load();
  }

  protected toggleSuggestions(): void {
    this.suggestionsExpanded.update((v) => !v);
  }

  protected clearFilters(): void {
    this.filter.set('');
    this.stage.set(null);
    this.sector.set('');
    this.soon.set(false);
    this.openOnly.set(this.view() === 'list');
    void this.load();
  }

  protected filterByStage(s: ProjectStage | null): void {
    if (this.stage() === s) {
      this.stage.set(null);
    } else {
      this.stage.set(s);
    }
    void this.load();
  }

  private input(): GetProjectsInput {
    return {
      filter: this.filter() || null,
      stage: this.stage(),
      sector: this.sector() || null,
      keyDateWithinDays: this.soon() ? 30 : null,
      openOnly: this.view() === 'list' ? this.openOnly() : false,
      maxResultCount: 500,
    };
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    try {
      if (this.view() === 'board') {
        void this.loadSuggestions();
        const columns = await firstValueFrom(this.api.getBoard(this.input()));
        this.board.set(columns);
        this.total.set(columns.reduce((n, c) => n + c.items.length, 0));
      } else {
        const page = await firstValueFrom(this.api.getList(this.input()));
        this.items.set(page.items ?? []);
        this.total.set(page.totalCount ?? 0);
      }
      this.error.set(null);
    } catch (e) {
      this.error.set(readApiError(e, 'Projects could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  // ---- Board Drag and Drop ---------------------------------------------
  protected dragStart(event: DragEvent, item: ProjectListItemDto): void {
    if (!this.canUpdate()) return;
    this.dragged = item;
    event.dataTransfer?.setData('text/plain', item.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  protected allowDrop(event: DragEvent): void {
    if (this.dragged) event.preventDefault();
  }

  protected async drop(event: DragEvent, stage: ProjectStage): Promise<void> {
    event.preventDefault();
    const item = this.dragged;
    this.dragged = null;
    if (!item || item.stage === stage) return;
    if (needsDetails(stage)) {
      void this.router.navigate(['/projects', item.id], { queryParams: { move: stage } });
      return;
    }
    const before = this.board();
    this.board.set(
      before.map((c) => ({
        ...c,
        items:
          c.stage === stage
            ? [{ ...item, stage, daysInStage: 0 }, ...c.items]
            : c.items.filter((i) => i.id !== item.id),
      })),
    );
    try {
      await firstValueFrom(this.api.moveStage(item.id, { stage }));
      this.toasts.success(`${item.name} moved to ${STAGE_TEXT[stage]}.`);
      await this.load();
    } catch (e) {
      this.board.set(before);
      this.toasts.error(readApiError(e, 'The project could not be moved.'));
    }
  }

  // ---- Single-Click Stage Advancement ----------------------------------
  protected async advanceStage(item: ProjectListItemDto, event?: Event): Promise<void> {
    event?.stopPropagation();
    event?.preventDefault();
    const nextStageMap: Record<ProjectStage, ProjectStage | null> = {
      [ProjectStage.Identified]: ProjectStage.Design,
      [ProjectStage.Design]: ProjectStage.Specified,
      [ProjectStage.Specified]: ProjectStage.Tender,
      [ProjectStage.Tender]: ProjectStage.Awarded,
      [ProjectStage.Awarded]: ProjectStage.Closed,
      [ProjectStage.Closed]: null,
    };
    const next = nextStageMap[item.stage];
    if (next == null) return;
    if (needsDetails(next)) {
      void this.router.navigate(['/projects', item.id], { queryParams: { move: next } });
      return;
    }
    try {
      await firstValueFrom(this.api.moveStage(item.id, { stage: next }));
      this.toasts.success(`${item.name} moved to ${STAGE_TEXT[next]}.`);
      await this.load();
    } catch (e) {
      this.toasts.error(readApiError(e, 'Could not advance project stage.'));
    }
  }

  private async loadSuggestions(): Promise<void> {
    try {
      this.suggestions.set(await firstValueFrom(this.tenders.getSuggestions()));
    } catch {
      this.suggestions.set([]);
    }
  }

  protected async createFromTender(t: TenderAlertDto): Promise<void> {
    this.deciding.set(t.id);
    try {
      const made = await firstValueFrom(this.tenders.createProject(t.id, {}));
      this.toasts.success(
        made.accountAdded
          ? `${made.reference} created, and ${t.buyer} added as an account.`
          : `${made.reference} created.`,
      );
      await this.router.navigate(['/projects', made.projectId]);
    } catch (e) {
      this.toasts.error(readApiError(e, 'The project could not be created.'));
    } finally {
      this.deciding.set(null);
    }
  }

  protected async notRelevant(t: TenderAlertDto): Promise<void> {
    this.deciding.set(t.id);
    try {
      await firstValueFrom(this.tenders.notRelevant(t.id));
      this.suggestions.update((list) => list.filter((x) => x.id !== t.id));
      this.toasts.info('Tender alert dismissed.');
    } catch (e) {
      this.toasts.error(readApiError(e, 'Could not dismiss tender alert.'));
    } finally {
      this.deciding.set(null);
    }
  }

  // ---- Next Stage Action Label -----------------------------------------
  protected nextStageLabel(s: ProjectStage): string {
    switch (s) {
      case ProjectStage.Identified:
        return 'Advance to Design';
      case ProjectStage.Design:
        return 'Advance to Specified';
      case ProjectStage.Specified:
        return 'Advance to Tender';
      case ProjectStage.Tender:
        return 'Mark as Awarded';
      case ProjectStage.Awarded:
        return 'Close Project';
      default:
        return '';
    }
  }
}
