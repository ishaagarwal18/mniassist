import { mapEnumToOptions } from '@abp/ng.core';

export enum CustomFieldEntity {
  Contact = 0,
  Enquiry = 1,
}

export const customFieldEntityOptions = mapEnumToOptions(CustomFieldEntity);
