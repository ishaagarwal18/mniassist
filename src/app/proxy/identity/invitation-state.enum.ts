import { mapEnumToOptions } from '@abp/ng.core';

export enum InvitationState {
  Pending = 0,
  Accepted = 1,
  Revoked = 2,
  Expired = 3,
}

export const invitationStateOptions = mapEnumToOptions(InvitationState);
