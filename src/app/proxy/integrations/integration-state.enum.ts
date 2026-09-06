import { mapEnumToOptions } from '@abp/ng.core';

export enum IntegrationState {
  Disconnected = 0,
  Connected = 1,
  Error = 2,
}

export const integrationStateOptions = mapEnumToOptions(IntegrationState);
