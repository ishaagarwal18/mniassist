import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';

import { ToastService } from '../../core/ui/toast.service';
import { SalesExportFormat } from '../../proxy/sales/sales-enums';
import { ArButton } from '../../ui';
import { blobErrorMessage, exportExtension, safeFileName } from './sales-export.logic';

/**
 * The PDF and Excel buttons of a sales record or list. `fetch` asks the server for the file in a format; the browser saves it
 * as `fileName` with the extension the answer calls for (a printable HTML page when the server could not draw the PDF).
 */
@Component({
  selector: 'ar-sales-export',
  imports: [ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      ar-button
      variant="ghost"
      icon="download"
      [disabled]="busy() !== null"
      [attr.title]="hint() + ' as a PDF'"
      (click)="get(formats.Pdf)"
    >
      {{ busy() === formats.Pdf ? 'Preparing…' : label() + 'PDF' }}
    </button>
    <button
      ar-button
      variant="ghost"
      icon="download"
      [disabled]="busy() !== null"
      [attr.title]="hint() + ' as an Excel workbook'"
      (click)="get(formats.Excel)"
    >
      {{ busy() === formats.Excel ? 'Preparing…' : label() + 'Excel' }}
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
      gap: 8px;
      flex-wrap: wrap;
    }
  `,
})
export class ArSalesExport {
  private readonly toasts = inject(ToastService);

  readonly fetch = input.required<(format: SalesExportFormat) => Observable<Blob>>();
  readonly fileName = input.required<string>();
  /** Words before "PDF" / "Excel" on the buttons, e.g. "Export all as ". */
  readonly label = input('');
  /** What the buttons save, for their tooltips, e.g. "Every order the filters show". */
  readonly hint = input('Download');

  protected readonly formats = SalesExportFormat;
  protected readonly busy = signal<SalesExportFormat | null>(null);

  protected async get(format: SalesExportFormat): Promise<void> {
    this.busy.set(format);
    try {
      const blob = await firstValueFrom(this.fetch()(format));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeFileName(this.fileName())}.${exportExtension(blob, format)}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e: unknown) {
      this.toasts.error(await blobErrorMessage(e, 'The file could not be prepared. Try again.'));
    } finally {
      this.busy.set(null);
    }
  }
}
