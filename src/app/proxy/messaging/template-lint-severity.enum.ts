import { mapEnumToOptions } from '@abp/ng.core';

export enum TemplateLintSeverity {
  Info = 0,
  Warning = 1,
  Error = 2,
}

export const templateLintSeverityOptions = mapEnumToOptions(TemplateLintSeverity);
