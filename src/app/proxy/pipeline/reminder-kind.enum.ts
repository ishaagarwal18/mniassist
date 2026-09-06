import { mapEnumToOptions } from '@abp/ng.core';

export enum ReminderKind {
  AmcRenewal = 0,
  WarrantyExpiry = 1,
  CalibrationDue = 2,
  PreventiveMaintenance = 3,
  QuotationFollowUp = 4,
}

export const reminderKindOptions = mapEnumToOptions(ReminderKind);
