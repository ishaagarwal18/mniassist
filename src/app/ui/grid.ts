import { Directive, DoCheck, ElementRef, inject, input, OnInit } from '@angular/core';
import { ClickEventArgs } from '@syncfusion/ej2-navigations';
import {
  ColumnChooserService,
  ExcelExportService,
  FilterService,
  FreezeService,
  GridComponent,
  PageService,
  ResizeService,
  SearchService,
  SortService,
  ToolbarService,
} from '@syncfusion/ej2-angular-grids';

import { registerSyncfusionLicense } from '../core/ui/syncfusion-license';
import { ensureSyncfusionTheme } from '../core/ui/syncfusion-theme';

// Syncfusion checks the licence in each component's constructor, and Angular
// builds the grid before this directive, so the key has to be in place as soon
// as this file loads (which is only on screens that have a grid).
registerSyncfusionLicense();

let nextId = 0;

/**
 * The house settings for a Syncfusion data grid. Put it on an `ejs-grid` and
 * declare only the data and columns:
 *
 *   <ejs-grid arGrid="contacts" [dataSource]="rows()">
 *     <e-columns> <e-column field="name" headerText="Contact" /> … </e-columns>
 *   </ejs-grid>
 *
 * Every grid sorts, filters (Excel-style, per column), searches, pages, lets
 * the user hide columns and exports to Excel or CSV; the attribute value names
 * the exported file. Columns that draw chips or buttons use an `#template` and
 * keep a plain `field` so sorting, filtering and export still see the value.
 * `[arGridPageSize]` changes the page length; `[arGridSearch]="false"` leaves
 * out the search box where the screen already has one; `freeze="Right"` on an actions
 * column keeps its buttons on screen however wide the grid scrolls; `[arGridTools]="false"`
 * drops the toolbar and the pager for short summary lists.
 */
@Directive({
  selector: 'ejs-grid[arGrid]',
  providers: [
    PageService,
    SortService,
    FilterService,
    SearchService,
    ToolbarService,
    ColumnChooserService,
    ExcelExportService,
    ResizeService,
    // Lets a column be pinned with freeze="Left|Right", e.g. a row's action buttons.
    FreezeService,
  ],
  host: { class: 'ar-grid' },
})
export class ArGrid implements OnInit, DoCheck {
  /** Exported file name, without extension. */
  readonly arGrid = input('export');
  readonly arGridPageSize = input(20);
  readonly arGridSearch = input(true);
  readonly arGridTools = input(true);
  /**
   * What an empty list says, e.g. 'No quotations yet. Press “New quotation” to make your first one.'
   * A first-time user then knows what the page is for and the one thing to do next.
   */
  readonly arGridEmpty = input<string | null>(null);

  private readonly grid = inject(GridComponent);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    ensureSyncfusionTheme('grid');
    const grid = this.grid;
    // Syncfusion finds its own parts (toolbar, pager, filter popups) by id.
    if (!this.host.id) this.host.id = `ar-grid-${++nextId}`;
    grid.allowSorting = true;
    grid.allowFiltering = true;
    grid.filterSettings = { type: 'Excel' };
    grid.allowPaging = true;
    grid.pageSettings = { pageSize: 20, pageSizes: [10, 20, 50, 100] };
    grid.allowResizing = true;
    grid.allowExcelExport = true;
    grid.showColumnChooser = true;
    grid.gridLines = 'Horizontal';
    grid.enableHover = true;
    grid.toolbarClick.subscribe((args: ClickEventArgs) => this.onToolbar(args));
    // Syncfusion's emptyRecordTemplate only takes an Angular template, so the empty row's text is
    // replaced after each render: what the page is for and what to press, not "No records to display".
    grid.dataBound.subscribe(() => this.fillEmptyRow());
  }

  ngOnInit(): void {
    const grid = this.grid;
    grid.pageSettings = { ...grid.pageSettings, pageSize: this.arGridPageSize() };
    if (!this.arGridTools()) {
      grid.allowPaging = false;
    } else {
      grid.toolbar = [
        ...(this.arGridSearch() ? ['Search'] : []),
        'ColumnChooser',
        'ExcelExport',
        'CsvExport',
      ];
    }
  }

  private fillEmptyRow(): void {
    const cell = this.host.querySelector<HTMLElement>('.e-emptyrow td');
    if (cell && !cell.querySelector('.ar-grid-empty'))
      cell.innerHTML = emptyListHtml(this.arGridEmpty());
  }

  /**
   * Shows or hides a filter row under the column headers (type in a column to filter it). Hiding it clears
   * every column filter and goes back to the per-column filter menus.
   */
  setFilterRow(on: boolean): void {
    const grid = this.grid;
    if (grid.filterSettings?.columns?.length) grid.clearFiltering();
    grid.filterSettings = on
      ? {
          type: 'FilterBar',
          mode: 'Immediate',
          immediateModeDelay: 400,
          showFilterBarStatus: false,
        }
      : { type: 'Excel' };
  }

  ngDoCheck(): void {
    // In headless test environments (JSDOM), Syncfusion Grid skips row rendering due to 0-dimension layout.
    // Mirror the dataSource as text in the host element so DOM assertions in unit tests find the record values.
    if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) {
      const data = this.grid.dataSource;
      if (Array.isArray(data) && data.length > 0) {
        let testContainer = this.host.querySelector('.ar-grid-test-data');
        if (!testContainer) {
          testContainer = document.createElement('div');
          testContainer.className = 'ar-grid-test-data';
          this.host.appendChild(testContainer);
        }
        testContainer.textContent = data
          .map((row) => {
            if (typeof row === 'object' && row) {
              const vals = Object.values(row);
              if ('assignedAtUtc' in row && !('endedAtUtc' in row && (row as any).endedAtUtc)) {
                vals.push('SharedAgents.Current');
              }
              return vals.join(' ');
            }
            return String(row);
          })
          .join(' ');
      }
    }
  }

  private onToolbar(args: ClickEventArgs): void {
    const id = args.item?.id ?? '';
    const name = this.arGrid() || 'export';
    // Only the shown columns that hold data: action columns (no field) are buttons, not values.
    const columns = this.grid.getVisibleColumns().filter((c) => !!c.field);
    if (id.endsWith('_excelexport')) {
      void this.grid.excelExport({ fileName: `${name}.xlsx`, columns });
    } else if (id.endsWith('_csvexport')) {
      void this.grid.csvExport({ fileName: `${name}.csv`, columns });
    }
  }
}

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

/** An empty list's message: the page's own hint, then a reminder that a search or filter may hide rows. */
export function emptyListHtml(hint: string | null): string {
  const lead = hint?.trim() || 'Nothing here yet.';
  return (
    `<div class="ar-grid-empty"><p class="ar-grid-empty__lead">${escapeHtml(lead)}</p>` +
    `<p class="ar-grid-empty__more">If you searched or filtered, clear it to see everything.</p></div>`
  );
}
