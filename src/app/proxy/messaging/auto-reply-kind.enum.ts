import { mapEnumToOptions } from '@abp/ng.core';

export enum AutoReplyKind {
  Welcome = 1,
  Away = 2,
  OutOfOffice = 3,
}

export const autoReplyKindOptions = mapEnumToOptions(AutoReplyKind);
