import { mapEnumToOptions } from '@abp/ng.core';

export enum TemplateCategory {
  Marketing = 1,
  Utility = 2,
  Authentication = 3,
}

export const templateCategoryOptions = mapEnumToOptions(TemplateCategory);
