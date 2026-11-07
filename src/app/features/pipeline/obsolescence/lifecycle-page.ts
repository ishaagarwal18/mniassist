import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { firstValueFrom } from 'rxjs';

import { ConfirmService } from '../../../core/ui/confirm.service';
import { ToastService } from '../../../core/ui/toast.service';
import { readApiError } from '../../../core/util/api-error';
import { ArTopbar } from '../../../layout/topbar';
import {
  CreateUpdateLifecycleRuleDto,
  LifecycleImportPreviewDto,
  LifecycleRuleDto,
  LifecycleRuleService,
  LifecycleStage,
  ReplacementRelation,
} from '../../../proxy/pipeline/obsolescence.service';
import { ArBanner, ArButton, ArChip } from '../../../ui';
import { ArGrid } from '../../../ui/grid';
import { environment } from '../../../../environments/environment';
import {
  atRiskSentence,
  dateOnly,
  LIFECYCLE_TEMPLATE,
  relationText,
  RELATIONS,
  STAGES,
  stageText,
  stageTone,
} from './obsolescence.logic';

type Target = 'series' | 'part';

interface RuleForm {
  make: string;
  target: Target;
  series: string;
  partNumber: string;
  stage: LifecycleStage;
  effectiveOn: string;
  lastBuyOn: string;
  replacementPartNumber: string;
  replacementSeries: string;
  relation: ReplacementRelation;
  note: string;
  sourceReference: string;
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function blank(): RuleForm {
  return {
    make: '',
    target: 'series',
    series: '',
    partNumber: '',
    stage: LifecycleStage.PhaseOut,
    effectiveOn: today(),
    lastBuyOn: '',
    replacementPartNumber: '',
    replacementSeries: '',
    relation: ReplacementRelation.DirectSwap,
    note: '',
    sourceReference: '',
  };
}

/**
 * Makers' life-cycle notices: a series (make + series) or one part number, its stage from a date, the last-buy date and what replaces
 * it. Typed here or imported from the maker's list, with a preview of the installed components each row touches before anything is
 * saved. Every save re-scores the radar straight away.
 */
@Component({
  selector: 'ar-lifecycle-page',
  imports: [ArTopbar, ArButton, ArBanner, ArChip, ArGrid, GridModule, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lifecycle-page.html',
  styleUrl: './lifecycle-page.scss',
})
export class ArLifecyclePage {
  private readonly api = inject(LifecycleRuleService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);

  protected readonly mock = environment.useMockData;
  protected readonly stages = STAGES;
  protected readonly relations = RELATIONS;
  protected readonly Stage = LifecycleStage;

  protected readonly rows = signal<LifecycleRuleDto[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly filter = signal('');
  protected readonly stageFilter = signal<LifecycleStage | null>(null);
  protected readonly problemsOnly = signal(false);

  protected readonly formOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly form = signal<RuleForm>(blank());
  /** "38 components at 12 sites are now at risk." after a save or an import. */
  protected readonly outcome = signal<string | null>(null);

  protected readonly preview = signal<LifecycleImportPreviewDto | null>(null);
  private readonly previewFile = signal<File | null>(null);
  protected readonly previewName = computed(() => this.previewFile()?.name ?? '');

  protected readonly problems = computed(
    () => this.rows().filter((r) => r.replacementProblem).length,
  );

  constructor() {
    void this.load();
  }

  protected stageText = stageText;
  protected stageTone = stageTone;
  protected relationText = relationText;

  protected async load(): Promise<void> {
    if (this.mock) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    try {
      const page = await firstValueFrom(
        this.api.getList({
          filter: this.filter().trim() || null,
          stage: this.stageFilter(),
          problemsOnly: this.problemsOnly(),
          maxResultCount: 1000,
        }),
      );
      this.rows.set(page.items ?? []);
      this.total.set(page.totalCount ?? 0);
      this.error.set(null);
    } catch (e) {
      this.error.set(readApiError(e, 'The lifecycle rules could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected setStageFilter(value: string): void {
    this.stageFilter.set(value === '' ? null : (Number(value) as LifecycleStage));
    void this.load();
  }

  protected showProblems(on: boolean): void {
    this.problemsOnly.set(on);
    void this.load();
  }

  protected patch(change: Partial<RuleForm>): void {
    this.form.update((f) => ({ ...f, ...change }));
  }

  protected openNew(): void {
    this.editingId.set(null);
    this.form.set(blank());
    this.formOpen.set(true);
  }

  protected openEdit(r: LifecycleRuleDto): void {
    this.editingId.set(r.id);
    this.form.set({
      make: r.make,
      target: r.partNumber ? 'part' : 'series',
      series: r.series ?? '',
      partNumber: r.partNumber ?? '',
      stage: r.stage,
      effectiveOn: dateOnly(r.effectiveOn),
      lastBuyOn: dateOnly(r.lastBuyOn),
      replacementPartNumber: r.replacementPartNumber ?? '',
      replacementSeries: r.replacementSeries ?? '',
      relation: r.relation,
      note: r.note ?? '',
      sourceReference: r.sourceReference ?? '',
    });
    this.formOpen.set(true);
  }

  protected async save(): Promise<void> {
    const f = this.form();
    const what = f.target === 'part' ? f.partNumber.trim() : f.series.trim();
    if (!f.make.trim() || !what) {
      this.toasts.warning(
        f.target === 'part'
          ? 'Type the make and the part number.'
          : 'Type the make and the series.',
      );
      return;
    }
    if (!f.effectiveOn) {
      this.toasts.warning('Give the date the stage starts.');
      return;
    }
    const input: CreateUpdateLifecycleRuleDto = {
      make: f.make.trim(),
      series: f.target === 'series' ? what : null,
      partNumber: f.target === 'part' ? what : null,
      stage: f.stage,
      effectiveOn: f.effectiveOn,
      lastBuyOn: f.lastBuyOn || null,
      replacementPartNumber: f.replacementPartNumber.trim() || null,
      replacementSeries: f.replacementPartNumber.trim() ? null : f.replacementSeries.trim() || null,
      relation: f.relation,
      note: f.note.trim() || null,
      sourceReference: f.sourceReference.trim() || null,
    };
    this.busy.set(true);
    try {
      const id = this.editingId();
      const result = await firstValueFrom(id ? this.api.update(id, input) : this.api.create(input));
      this.formOpen.set(false);
      this.outcome.set(
        atRiskSentence(result.atRiskComponents, result.atRiskSites, result.announcedComponents),
      );
      this.toasts.success(id ? 'Rule saved.' : 'Rule added.');
      await this.load();
    } catch (e) {
      this.toasts.error(readApiError(e, 'The rule could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(r: LifecycleRuleDto): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: `Delete the rule for ${r.partNumber ?? r.make + ' ' + r.series}?`,
      message:
        'Its components are re-scored at once: they go back to active unless another rule covers them.',
      confirmText: 'Delete',
    });
    if (!ok) return;
    try {
      const result = await firstValueFrom(this.api.delete(r.id));
      this.outcome.set(atRiskSentence(result.atRiskComponents, result.atRiskSites));
      this.toasts.success('Rule deleted.');
      await this.load();
    } catch (e) {
      this.toasts.error(readApiError(e, 'The rule could not be deleted.'));
    }
  }

  protected downloadTemplate(): void {
    const url = URL.createObjectURL(new Blob([LIFECYCLE_TEMPLATE], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lifecycle-rules.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  private body(file: File): FormData {
    const body = new FormData();
    body.append('file', file, file.name);
    return body;
  }

  /** Reads the maker's list and shows what it would change and touch; nothing is saved yet. */
  protected async previewImport(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.busy.set(true);
    try {
      this.preview.set(await firstValueFrom(this.api.previewImport(this.body(file))));
      this.previewFile.set(file);
    } catch (e) {
      this.toasts.error(readApiError(e, 'The file could not be read.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected cancelImport(): void {
    this.preview.set(null);
    this.previewFile.set(null);
  }

  protected async confirmImport(): Promise<void> {
    const file = this.previewFile();
    if (!file) return;
    this.busy.set(true);
    try {
      const result = await firstValueFrom(this.api.import(this.body(file)));
      this.cancelImport();
      this.outcome.set(atRiskSentence(result.atRiskComponents, result.atRiskSites));
      this.toasts.success(
        `${result.added} added, ${result.updated} updated${result.problems?.length ? `, ${result.problems.length} rows skipped` : ''}.`,
      );
      await this.load();
    } catch (e) {
      this.toasts.error(readApiError(e, 'The list could not be imported.'));
    } finally {
      this.busy.set(false);
    }
  }
}
