import { mapEnumToOptions } from '@abp/ng.core';

export enum WebPushScope {
  AssignedToMe = 0,
  AllNewMessages = 1,
}

export const webPushScopeOptions = mapEnumToOptions(WebPushScope);
