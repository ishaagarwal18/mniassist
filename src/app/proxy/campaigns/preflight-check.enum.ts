import { mapEnumToOptions } from '@abp/ng.core';

export enum PreflightCheck {
  TemplateApproved = 1,
  VariablesResolve = 2,
  AudienceNotEmpty = 3,
  /** Warns rather than blocks: short headroom means spread the send, not stop it. */
  TierHeadroom = 4,
  WalletBalance = 5,
}

export const preflightCheckOptions = mapEnumToOptions(PreflightCheck);
