import { mapEnumToOptions } from '@abp/ng.core';

export enum TemplateHeaderFormat {
  None = 0,
  Text = 1,
  Image = 2,
  Video = 3,
  Document = 4,
  Location = 5,
}

export const templateHeaderFormatOptions = mapEnumToOptions(TemplateHeaderFormat);
