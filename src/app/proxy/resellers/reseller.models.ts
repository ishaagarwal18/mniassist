import type { FullAuditedEntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import type {
  CustomDomainStatus,
  ResellerBillingModel,
  ResellerPartnerStatus,
  ResellerPayoutStatus,
  ResellerTier,
} from './reseller-enums';

export interface ResellerPartnerDto extends FullAuditedEntityDto<string> {
  id: string;
  tenantId?: string;
  partnerCode: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl?: string;
  taxId?: string;
  status: ResellerPartnerStatus;
  tier: ResellerTier;
  billingModel: ResellerBillingModel;
  commissionRateBps: number;
  wholesaleDiscountBps: number;
  maxManagedTenants: number;
  payoutBankDetailsJson?: string;
  accruedCommissionPaise: number;
  lifetimePaidOutPaise: number;
  notes?: string;
}

export interface CreateResellerPartnerInput {
  partnerCode: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl?: string;
  taxId?: string;
  tier?: ResellerTier;
  billingModel?: ResellerBillingModel;
  commissionRateBps?: number;
  wholesaleDiscountBps?: number;
  maxManagedTenants?: number;
  notes?: string;
}

export interface UpdateResellerPartnerInput {
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl?: string;
  taxId?: string;
  payoutBankDetailsJson?: string;
}

export interface UpdateResellerTierInput {
  tier: ResellerTier;
  billingModel: ResellerBillingModel;
  commissionRateBps?: number;
  wholesaleDiscountBps?: number;
  maxManagedTenants?: number;
}

export interface ResellerWhiteLabelProfileDto extends FullAuditedEntityDto<string> {
  id: string;
  partnerId: string;
  brandName: string;
  customDomain?: string;
  domainStatus: CustomDomainStatus;
  domainVerificationToken?: string;
  dnsVerificationTarget?: string;
  sslCertificateThumbprint?: string;
  sslValidUntilUtc?: string;
  logoUrlLight?: string;
  logoUrlDark?: string;
  faviconUrl?: string;
  primaryColorHex: string;
  secondaryColorHex: string;
  supportEmail?: string;
  helpDeskUrl?: string;
  termsUrl?: string;
  privacyPolicyUrl?: string;
  emailSenderName?: string;
  emailSenderAddress?: string;
  hidePlatformBranding: boolean;
  customCss?: string;
}

export interface UpdateWhiteLabelBrandingInput {
  brandName: string;
  logoUrlLight?: string;
  logoUrlDark?: string;
  faviconUrl?: string;
  primaryColorHex: string;
  secondaryColorHex: string;
  supportEmail?: string;
  helpDeskUrl?: string;
  termsUrl?: string;
  privacyPolicyUrl?: string;
  emailSenderName?: string;
  emailSenderAddress?: string;
  hidePlatformBranding: boolean;
  customCss?: string;
}

export interface ConfigureCustomDomainInput {
  customDomain: string;
}

export interface VerifyCustomDomainInput {
}

export interface ResellerClientTenantDto extends FullAuditedEntityDto<string> {
  id: string;
  partnerId: string;
  clientTenantId: string;
  clientTenantName: string;
  subscribedPlanCode: string;
  billingCycle: string;
  customMonthlyPricePaise?: number;
  wholesaleRatePaise: number;
  commissionRateBps: number;
  isActive: boolean;
  onboardedAtUtc: string;
  notes?: string;
}

export interface ProvisionClientTenantInput {
  clientTenantName: string;
  subscribedPlanCode: string;
  billingCycle?: string;
  customMonthlyPricePaise?: number;
  wholesaleRatePaise: number;
  customCommissionRateBps?: number;
  notes?: string;
}

export interface UpdateClientTenantPlanInput {
  subscribedPlanCode: string;
  billingCycle?: string;
  customMonthlyPricePaise?: number;
  wholesaleRatePaise: number;
  customCommissionRateBps?: number;
}

export interface ResellerCommissionDto extends FullAuditedEntityDto<string> {
  id: string;
  partnerId: string;
  clientTenantId: string;
  invoiceReference: string;
  grossAmountPaise: number;
  commissionBasisPoints: number;
  earnedCommissionPaise: number;
  description: string;
  occurredAtUtc: string;
}

export interface RecordCommissionInput {
  clientTenantId: string;
  invoiceReference: string;
  grossAmountPaise: number;
  description: string;
}

export interface ResellerPayoutDto extends FullAuditedEntityDto<string> {
  id: string;
  partnerId: string;
  payoutNumber: string;
  amountPaise: number;
  status: ResellerPayoutStatus;
  requestedAtUtc: string;
  approvedAtUtc?: string;
  paidAtUtc?: string;
  paymentReference?: string;
  rejectionReason?: string;
}

export interface RequestPayoutInput {
  amountPaise: number;
}

export interface ProcessPayoutInput {
  paymentReference: string;
}

export interface RejectPayoutInput {
  reason: string;
}

export interface ResellerDashboardDto {
  partnerId: string;
  companyName: string;
  tier: ResellerTier;
  status: ResellerPartnerStatus;
  activeClientsCount: number;
  maxManagedTenants: number;
  accruedCommissionPaise: number;
  lifetimePaidOutPaise: number;
  customDomain?: string;
  domainStatus: CustomDomainStatus;
  brandName: string;
}

export type ResellerPageRequest = PagedAndSortedResultRequestDto;
