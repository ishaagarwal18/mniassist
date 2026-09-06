import { mapEnumToOptions } from '@abp/ng.core';

export enum AnalyticsExportFormat {
  Csv = 0,
  Excel = 1,
  Pdf = 2,
}

export const analyticsExportFormatOptions = mapEnumToOptions(AnalyticsExportFormat);
