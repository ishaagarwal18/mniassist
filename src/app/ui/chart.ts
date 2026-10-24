import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  input,
  output,
} from '@angular/core';
import {
  ChartModule,
  CategoryService,
  DateTimeService,
  LegendService,
  TooltipService,
  LineSeriesService,
  ColumnSeriesService,
  StackingColumnSeriesService,
} from '@syncfusion/ej2-angular-charts';
import type {
  AxisModel,
  ChartAreaModel,
  ChartTheme,
  CrosshairSettingsModel,
  LegendSettingsModel,
  TooltipSettingsModel,
  IAxisLabelRenderEventArgs,
  ISharedTooltipRenderEventArgs,
} from '@syncfusion/ej2-charts';
import { ArChartSeries } from './chart-series';

/** Loaded by a viewport defer block, after the page's controls and data are available. */
@Component({
  selector: 'ar-chart',
  imports: [ChartModule],
  providers: [
    CategoryService,
    DateTimeService,
    LegendService,
    TooltipService,
    LineSeriesService,
    ColumnSeriesService,
    StackingColumnSeriesService,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ejs-chart
    [height]="height()"
    [background]="background()"
    [theme]="theme()"
    [primaryXAxis]="primaryXAxis()"
    [primaryYAxis]="primaryYAxis()"
    [chartArea]="chartArea()"
    [tooltip]="tooltip()"
    [legendSettings]="legendSettings()"
    [crosshair]="crosshair()"
    [series]="series()"
    (axisLabelRender)="axisLabelRender.emit($event)"
    (sharedTooltipRender)="sharedTooltipRender.emit($event)"
  />`,
})
export class ArChart {
  readonly height = input('240px');
  readonly background = input('transparent');
  readonly theme = input<ChartTheme>('Tailwind3');
  readonly primaryXAxis = input<AxisModel>({});
  readonly primaryYAxis = input<AxisModel>({});
  readonly chartArea = input<ChartAreaModel>({});
  readonly tooltip = input<TooltipSettingsModel>({});
  readonly legendSettings = input<LegendSettingsModel>({});
  readonly crosshair = input<CrosshairSettingsModel>({});
  readonly axisLabelRender = output<IAxisLabelRenderEventArgs>();
  readonly sharedTooltipRender = output<ISharedTooltipRenderEventArgs>();
  private readonly children = contentChildren(ArChartSeries, { descendants: true });
  protected readonly series = computed(() => this.children().map((child) => child.model()));
}
