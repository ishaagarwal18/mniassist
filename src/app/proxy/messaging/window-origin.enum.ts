import { mapEnumToOptions } from '@abp/ng.core';

export enum WindowOrigin {
  CustomerMessage = 0,
  /** Click-to-WhatsApp entry. Runs 72 hours, not 24. */
  FreeEntryPoint = 1,
}

export const windowOriginOptions = mapEnumToOptions(WindowOrigin);
