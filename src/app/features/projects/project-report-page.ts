import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import { ProjectStage } from '../../proxy/projects/project.service';
import {
  ProjectReportDto,
  ProjectReportService,
  ProjectWinRateDto,
} from '../../proxy/projects/project-report.service';
import { ArBanner, ArButton, ArCard, ArStatTile } from '../../ui';
import { STAGE_TEXT, percent, rupeesShort } from './project.logic';

/** The period choices, in months back from today. */
export const REPORT_MONTHS = [3, 6, 12, 24] as const;

/** "6 of 10 won" style line for a win-rate tile. */
export function winRateNote(r: ProjectWinRateDto): string {
  const closed = r.won + r.lost;
  if (closed === 0) return 'None won or lost in the period';
  return `${r.won} won, ${r.lost} lost · ${rupeesShort(r.wonValueInPaise)} won`;
}

/**
 * The project report: open projects by stage, the win rate when the specification names our brand against when it doesn't, and the
 * brands and categories lost to. Needs "see all projects".
 */
@Component({
  selector: 'ar-project-report-page',
  imports: [ArTopbar, ArBanner, ArButton, ArCard, ArStatTile, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './project-report-page.html',
  styleUrl: './project-report-page.scss',
})
export class ArProjectReportPage {
  private readonly api = inject(ProjectReportService);

  protected readonly monthsChoices = REPORT_MONTHS;
  protected readonly months = signal<number>(12);
  protected readonly report = signal<ProjectReportDto | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(false);

  protected readonly rupees = rupeesShort;
  protected readonly percent = percent;
  protected readonly winRateNote = winRateNote;

  /** The widest funnel stage, for bar lengths. */
  protected readonly widest = computed(() =>
    Math.max(1, ...(this.report()?.funnel ?? []).map((s) => s.projects)),
  );

  constructor() {
    void this.load();
  }

  protected stageText(stage: ProjectStage): string {
    return STAGE_TEXT[stage];
  }

  protected setMonths(value: string): void {
    this.months.set(Number(value));
    void this.load();
  }

  protected async load(): Promise<void> {
    const to = new Date();
    const from = new Date(to);
    from.setMonth(from.getMonth() - this.months());
    this.loading.set(true);
    this.error.set(null);
    try {
      this.report.set(
        await firstValueFrom(
          this.api.get({ fromUtc: from.toISOString(), toUtc: to.toISOString() }),
        ),
      );
    } catch (e) {
      this.error.set(readApiError(e, 'The project report could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }
}
