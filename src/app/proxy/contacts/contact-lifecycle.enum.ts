import { mapEnumToOptions } from '@abp/ng.core';

export enum ContactLifecycle {
  New = 0,
  Engaged = 1,
  Enquired = 2,
  Quoted = 3,
  Customer = 4,
  Lost = 5,
  Dormant = 6,
}

export const contactLifecycleOptions = mapEnumToOptions(ContactLifecycle);
