import { Directive, input } from '@angular/core';
import type { SeriesModel } from '@syncfusion/ej2-charts';

/** Lightweight chart configuration; importing a page does not load the chart engine. */
@Directive({ selector: 'ar-chart-series' })
export class ArChartSeries {
  readonly dataSource = input<object[]>([]);
  readonly type = input<SeriesModel['type']>('Line');
  readonly xName = input('');
  readonly yName = input('');
  readonly name = input('');
  readonly fill = input<string>();
  readonly width = input<number>(1);
  readonly columnWidth = input<number>(0.7);
  readonly marker = input<SeriesModel['marker']>();
  readonly cornerRadius = input<SeriesModel['cornerRadius']>();
  readonly dashArray = input('');

  model(): SeriesModel {
    return {
      dataSource: this.dataSource(),
      type: this.type(),
      xName: this.xName(),
      yName: this.yName(),
      name: this.name(),
      fill: this.fill(),
      width: this.width(),
      columnWidth: this.columnWidth(),
      marker: this.marker(),
      cornerRadius: this.cornerRadius(),
      dashArray: this.dashArray(),
    };
  }
}
