import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ToastService } from '../../../core/ui/toast.service';
import { readApiError } from '../../../core/util/api-error';
import {
  BoqFileMappingDto,
  BoqImportDto,
  BoqImportService,
  BoqSheetMapDto,
} from '../../../proxy/pipeline/boq-import.service';
import { ArButton, ArChip } from '../../../ui';
import {
  COLUMN_ROLES,
  ColumnRole,
  assign,
  columnLetter,
  mapProblem,
  roleOf,
} from './boq-import.logic';

/** One spreadsheet as the engineer is mapping it. */
interface FileState {
  file: BoqFileMappingDto;
  useAi: boolean;
  maps: BoqSheetMapDto[];
}

/**
 * Quote from a file, slice 2: which spreadsheet column is the part number, description, quantity, unit and make. Shown on the
 * review page while the import waits in the Mapping state. A sheet read by its columns needs no AI and guesses nothing.
 */
@Component({
  selector: 'ar-boq-column-map',
  imports: [ArButton, ArChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './boq-column-map.html',
  styleUrl: './boq-column-map.scss',
})
export class ArBoqColumnMap implements OnInit {
  private readonly api = inject(BoqImportService);
  private readonly toasts = inject(ToastService);

  readonly importId = input.required<string>();
  /** The import, now reading. */
  readonly started = output<BoqImportDto>();

  protected readonly roles = COLUMN_ROLES;
  protected readonly letter = columnLetter;
  protected readonly files = signal<FileState[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly remember = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly problem = computed(() => {
    for (const f of this.files()) {
      if (f.useAi || f.file.problem) continue;
      if (!f.maps.some((m) => m.include))
        return `${f.file.fileName}: include at least one sheet, or let AI read it.`;
      for (const m of f.maps) {
        const p = mapProblem(m);
        if (p) return p;
      }
    }
    return null;
  });

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const mapping = await firstValueFrom(this.api.getMapping(this.importId()));
      this.files.set(
        mapping.files.map((file) => ({
          file,
          useAi: !!file.problem,
          maps: file.sheets.map((s) => ({ ...s.map })),
        })),
      );
    } catch (e) {
      this.error.set(readApiError(e, 'The sheets could not be opened.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected roleOf(fileIndex: number, sheetIndex: number, column: number): ColumnRole | '' {
    return roleOf(this.files()[fileIndex].maps[sheetIndex], column) ?? '';
  }

  private patch(
    fileIndex: number,
    sheetIndex: number,
    change: (m: BoqSheetMapDto) => BoqSheetMapDto,
  ): void {
    this.files.update((files) =>
      files.map((f, i) =>
        i !== fileIndex
          ? f
          : { ...f, maps: f.maps.map((m, j) => (j !== sheetIndex ? m : change(m))) },
      ),
    );
  }

  protected setRole(fileIndex: number, sheetIndex: number, column: number, role: string): void {
    this.patch(fileIndex, sheetIndex, (m) =>
      assign(m, column, (role || null) as ColumnRole | null),
    );
  }

  protected setHeader(fileIndex: number, sheetIndex: number, value: string): void {
    this.patch(fileIndex, sheetIndex, (m) => ({ ...m, headerRow: Number(value) }));
  }

  protected setInclude(fileIndex: number, sheetIndex: number, include: boolean): void {
    this.patch(fileIndex, sheetIndex, (m) => ({ ...m, include }));
  }

  protected setUseAi(fileIndex: number, useAi: boolean): void {
    this.files.update((files) => files.map((f, i) => (i === fileIndex ? { ...f, useAi } : f)));
  }

  /** The rows offered as the heading row: "None", then each previewed row. */
  protected headerOptions(rowCount: number): number[] {
    return Array.from({ length: rowCount }, (_, i) => i);
  }

  /** A row is only as wide as its last filled cell. */
  protected cell(row: string[], column: number): string {
    return column < row.length ? row[column] : '';
  }

  protected columns(count: number): number[] {
    return Array.from({ length: Math.min(count, 30) }, (_, i) => i);
  }

  protected async read(): Promise<void> {
    if (this.problem() || this.saving()) return;
    this.saving.set(true);
    try {
      const done = await firstValueFrom(
        this.api.setMapping(this.importId(), {
          remember: this.remember(),
          files: this.files().map((f) => ({
            fileId: f.file.fileId,
            useAi: f.useAi,
            sheets: f.useAi ? [] : f.maps,
          })),
        }),
      );
      this.started.emit(done);
    } catch (e) {
      this.toasts.error(readApiError(e, 'The columns could not be saved.'));
    } finally {
      this.saving.set(false);
    }
  }
}
