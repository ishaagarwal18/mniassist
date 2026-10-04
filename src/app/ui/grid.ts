import { Directive, ElementRef, inject, input, OnInit } from '@angular/core';
import { ClickEventArgs } from '@syncfusion/ej2-navigations';
import {
  ColumnChooserService,
  ExcelExportService,
  FilterService,
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
 * out the search box where the screen already has one; `[arGridTools]="false"`
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
  ],
  host: { class: 'ar-grid' },
})
export class ArGrid implements OnInit {
  /** Exported file name, without extension. */
  readonly arGrid = input('export');
  readonly arGridPageSize = input(20);
  readonly arGridSearch = input(true);
  readonly arGridTools = input(true);

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
