import { mapEnumToOptions } from '@abp/ng.core';

export enum TemplateQuality {
  Unknown = 0,
  High = 1,
  Medium = 2,
  Low = 3,
}

export const templateQualityOptions = mapEnumToOptions(TemplateQuality);
