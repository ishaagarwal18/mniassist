import { mapEnumToOptions } from '@abp/ng.core';

export enum ResellerPartnerStatus {
  PendingApproval = 0,
  Active = 1,
  Suspended = 2,
  Terminated = 3,
}

export enum ResellerTier {
  Registered = 0,
  Silver = 1,
  Gold = 2,
  Platinum = 3,
  Enterprise = 4,
}

export enum ResellerBillingModel {
  RevenueShareCommission = 0,
  WholesaleMarkup = 1,
  Hybrid = 2,
}

export enum CustomDomainStatus {
  PendingVerification = 0,
  DnsVerified = 1,
  SslProvisioning = 2,
  Active = 3,
  Failed = 4,
}

export enum ResellerPayoutStatus {
  Requested = 0,
  Approved = 1,
  Processing = 2,
  Paid = 3,
  Rejected = 4,
}

export const resellerTierOptions = mapEnumToOptions(ResellerTier);
export const resellerBillingModelOptions = mapEnumToOptions(ResellerBillingModel);
