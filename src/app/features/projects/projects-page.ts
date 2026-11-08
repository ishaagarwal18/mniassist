import { PermissionService } from '@abp/ng.core';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { GridModule } from '@syncfusion/ej2-angular-grids';
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
import { ArBanner, ArButton, ArChip } from '../../ui';
import { ArGrid } from '../../ui/grid';
import { environment } from '../../../environments/environment';
import {
  OUTCOME_TEXT,
  SECTORS,
  STAGE_DECIDER,
  STAGE_TEXT,
  STAGES,
  needsDetails,
  rupeesShort,
} from './project.logic';

type View = 'list' | 'board';

/**
 * Projects: a list (grid) and a board by stage. Cards move between stages by dragging; Awarded and Closed open the project to say who
 * won or how it ended. A card warns "Who is writing the spec?" when nobody is writing it, and shows a blocker who decides.
 */
@Component({
  selector: 'ar-projects-page',
  imports: [ArTopbar, ArButton, ArBanner, ArChip, RouterLink, DatePipe, GridModule, ArGrid],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './projects-page.html',
  styleUrl: './projects-page.scss',
})
export class ArProjectsPage {
  private readonly api = inject(ProjectService);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);
  private readonly permissions = inject(PermissionService);

  protected readonly mock = environment.useMockData;
  protected readonly canCreate = grantedPolicy('AutoReach.Projects.Create', this.permissions);
  protected readonly canUpdate = grantedPolicy('AutoReach.Projects.Update', this.permissions);
  protected readonly canManage = grantedPolicy('AutoReach.Projects.Manage', this.permissions);

  protected readonly view = signal<View>(
    (localStorage.getItem('ar.projects.view') as View | null) === 'list' ? 'list' : 'board',
  );
  protected readonly items = signal<ProjectListItemDto[]>([]);
  protected readonly board = signal<ProjectBoardColumnDto[]>([]);
  protected readonly total = signal(0);
  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(false);

  protected readonly filter = signal('');
  protected readonly stage = signal<ProjectStage | null>(null);
  protected readonly sector = signal('');
  protected readonly soon = signal(false);
  protected readonly openOnly = signal(true);

  protected readonly STAGES = STAGES;
  protected readonly STAGE_TEXT = STAGE_TEXT;
  protected readonly STAGE_DECIDER = STAGE_DECIDER;
  protected readonly OUTCOME_TEXT = OUTCOME_TEXT;
  protected readonly Outcome = ProjectOutcome;
  protected readonly SECTORS = SECTORS;
  protected readonly rupees = rupeesShort;

  private dragged: ProjectListItemDto | null = null;

  constructor() {
    void this.load();
  }

  protected stageText(stage: ProjectStage): string {
    return STAGE_TEXT[stage];
  }

  protected outcomeText(outcome: ProjectOutcome): string {
    return OUTCOME_TEXT[outcome];
  }

  protected setView(v: View): void {
    this.view.set(v);
    localStorage.setItem('ar.projects.view', v);
    void this.load();
  }

  private input(): GetProjectsInput {
    return {
      filter: this.filter() || null,
      stage: this.view() === 'list' ? this.stage() : null,
      sector: this.sector() || null,
      keyDateWithinDays: this.soon() ? 30 : null,
      openOnly: this.view() === 'list' ? this.openOnly() : false,
      maxResultCount: 500,
    };
  }

  protected async load(): Promise<void> {
    if (this.mock) return;
    this.loading.set(true);
    try {
      if (this.view() === 'board') {
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

  // ---- board drag and drop ----

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
      // Awarded needs the winner, Closed the outcome: finished on the project's page.
      void this.router.navigate(['/projects', item.id], { queryParams: { move: stage } });
      return;
    }
    // Move it straight away on screen; put it back if the server refuses.
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
}
