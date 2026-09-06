import { mapEnumToOptions } from '@abp/ng.core';

export enum WindowOrigin {
  CustomerMessage = 0,
  FreeEntryPoint = 1,
}

export const windowOriginOptions = mapEnumToOptions(WindowOrigin);
