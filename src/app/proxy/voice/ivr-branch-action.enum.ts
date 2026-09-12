import { mapEnumToOptions } from '@abp/ng.core';

export enum IvrBranchAction {
  GoToPrompt = 0,
  Hangup = 1,
  TransferToAgent = 2,
}

export const ivrBranchActionOptions = mapEnumToOptions(IvrBranchAction);
