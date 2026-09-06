import { mapEnumToOptions } from '@abp/ng.core';

export enum FlowFieldType {
  TextInput = 0,
  TextArea = 1,
  Dropdown = 2,
  RadioButtons = 3,
  CheckboxGroup = 4,
  DatePicker = 5,
  OptIn = 6,
}

export const flowFieldTypeOptions = mapEnumToOptions(FlowFieldType);
