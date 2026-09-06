import { mapEnumToOptions } from '@abp/ng.core';

export enum DataRequestState {
  Received = 0,
  InProgress = 1,
  Fulfilled = 2,
  Rejected = 3,
}

export const dataRequestStateOptions = mapEnumToOptions(DataRequestState);
