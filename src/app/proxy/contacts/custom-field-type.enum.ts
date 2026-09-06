import { mapEnumToOptions } from '@abp/ng.core';

export enum CustomFieldType {
  Text = 0,
  Number = 1,
  Date = 2,
  SingleSelect = 3,
  MultiSelect = 4,
  Boolean = 5,
}

export const customFieldTypeOptions = mapEnumToOptions(CustomFieldType);
