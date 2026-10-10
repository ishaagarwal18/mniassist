import { mapEnumToOptions } from '@abp/ng.core';

export enum WorkspaceFeatureMode {
  Default = 0,
  On = 1,
  Off = 2,
}

export const workspaceFeatureModeOptions = mapEnumToOptions(WorkspaceFeatureMode);
