import { mapEnumToOptions } from '@abp/ng.core';

export enum TemplateComponentKind {
  Header = 0,
  Body = 1,
  Footer = 2,
  Buttons = 3,
}

export const templateComponentKindOptions = mapEnumToOptions(TemplateComponentKind);
