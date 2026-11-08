import { mapEnumToOptions } from '@abp/ng.core';

export enum PlanFeature {
  AutomationBuilder = 1,
  Flows = 2,
  DocumentLibrary = 3,
  FullAnalytics = 4,
  ClickToWhatsAppAttribution = 5,
  PipelineCrm = 6,
  PublicApi = 7,
  Connectors = 8,
  Sso = 9,
  Payments = 10,
  Helpdesk = 11,
  AiAssistant = 12,
  Voice = 13,
  Sms = 14,
  Email = 15,
  RenewalDesk = 16,
  ErpSync = 17,
  OemNetwork = 18,
  ReorderPortal = 19,
  SalesAndPurchasing = 20,
  Manufacturing = 21,
  Finance = 22,
  FieldService = 23,
  Partners = 24,
  OemPricing = 25,
}

export const planFeatureOptions = mapEnumToOptions(PlanFeature);
