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
import { STAGE_DECIDER, STAGE_TEXT, percent, rupeesShort } from './project.logic';

/** The period choices, in months back from today. */
export const REPORT_MONTHS = [3, 6, 12, 24] as const;

/** "6 of 10 won" style line for a win-rate tile. */
export function winRateNote(r: ProjectWinRateDto): string {
  const closed = r.won + r.lost;
  if (closed === 0) return 'None won or lost in the period';
  return `${r.won} won, ${r.lost} lost · ${rupeesShort(r.wonValueInPaise)} won`;
}

/** Win rate across both groups; null with nothing closed. */
export function overallWinRate(a: ProjectWinRateDto, b: ProjectWinRateDto): number | null {
  const won = a.won + b.won;
  const closed = won + a.lost + b.lost;
  return closed === 0 ? null : won / closed;
}

/** Percentage-point gap between specified-in and not; null unless both have closed projects. */
export function specLift(a: ProjectWinRateDto, b: ProjectWinRateDto): number | null {
  if (a.winRate == null || b.winRate == null) return null;
  return Math.round((a.winRate - b.winRate) * 100);
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

  protected readonly totals = computed(() => {
    const r = this.report();
    if (!r) return null;
    const projects = r.funnel.reduce((n, s) => n + s.projects, 0);
    const value = r.funnel.reduce((n, s) => n + s.valueInPaise, 0);
    const won = r.specifiedIn.won + r.notSpecifiedIn.won;
    const lost = r.specifiedIn.lost + r.notSpecifiedIn.lost;
    const wonValue = r.specifiedIn.wonValueInPaise + r.notSpecifiedIn.wonValueInPaise;
    const lostValue = r.lossesByBrand.reduce((n, b) => n + b.valueInPaise, 0);
    return {
      projects,
      value,
      won,
      lost,
      wonValue,
      lostValue,
      winRate: overallWinRate(r.specifiedIn, r.notSpecifiedIn),
      lift: specLift(r.specifiedIn, r.notSpecifiedIn),
    };
  });

  /** Brands sorted by value lost, with bar shares. */
  protected readonly brands = computed(() => {
    const list = [...(this.report()?.lossesByBrand ?? [])].sort(
      (a, b) => b.valueInPaise - a.valueInPaise || b.projects - a.projects,
    );
    const max = Math.max(1, ...list.map((b) => b.valueInPaise));
    return list.map((b) => ({ ...b, share: (b.valueInPaise / max) * 100 }));
  });

  protected readonly categories = computed(() => {
    const list = [...(this.report()?.lossesByCategory ?? [])].sort((a, b) => b.projects - a.projects);
    const max = Math.max(1, ...list.map((c) => c.projects));
    return list.map((c) => ({ ...c, share: (c.projects / max) * 100 }));
  });

  constructor() {
    void this.load();
  }

  protected stageText(stage: ProjectStage): string {
    return STAGE_TEXT[stage];
  }

  protected stageDecider(stage: ProjectStage): string {
    return STAGE_DECIDER[stage];
  }

  protected rateWidth(rate: number | null | undefined): number {
    return rate == null ? 0 : Math.max(2, Math.round(rate * 100));
  }

  protected setMonths(value: number): void {
    if (value === this.months() && this.report()) return;
    this.months.set(value);
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
