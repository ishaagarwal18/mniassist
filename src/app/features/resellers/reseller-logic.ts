import type { ChipTone } from '../../ui/chip';
import {
  CustomDomainStatus,
  ResellerBillingModel,
  ResellerPartnerStatus,
  ResellerPayoutStatus,
  ResellerTier,
} from '../../proxy/resellers/reseller-enums';
import type { CreateResellerPartnerInput } from '../../proxy/resellers/reseller.models';

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

/** Paise to a rupee amount, e.g. 249900 → "₹2,499.00". */
export function formatPaise(paise: number | null | undefined): string {
  return INR.format((paise ?? 0) / 100);
}

/** Basis points to a percentage, e.g. 2000 → "20%", 1250 → "12.5%". */
export function formatBps(bps: number | null | undefined): string {
  const pct = (bps ?? 0) / 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(2).replace(/0+$/, '')}%`;
}

/** A rupee amount typed by a person to paise; null when it isn't a positive amount. */
export function rupeesToPaise(text: string): number | null {
  const cleaned = text.replace(/[₹,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const paise = Math.round(Number(cleaned) * 100);
  return paise > 0 ? paise : null;
}

/** A percentage typed by a person (0–100) to basis points; null when out of range. */
export function percentToBps(text: string): number | null {
  const cleaned = text.replace(/[%\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const bps = Math.round(Number(cleaned) * 100);
  return bps >= 0 && bps <= 10000 ? bps : null;
}

export const PARTNER_STATUS: Record<ResellerPartnerStatus, { label: string; tone: ChipTone }> = {
  [ResellerPartnerStatus.PendingApproval]: { label: 'Awaiting approval', tone: 'amber' },
  [ResellerPartnerStatus.Active]: { label: 'Active', tone: 'good' },
  [ResellerPartnerStatus.Suspended]: { label: 'Suspended', tone: 'bad' },
  [ResellerPartnerStatus.Terminated]: { label: 'Terminated', tone: 'neutral' },
};

export const PAYOUT_STATUS: Record<ResellerPayoutStatus, { label: string; tone: ChipTone }> = {
  [ResellerPayoutStatus.Requested]: { label: 'Requested', tone: 'amber' },
  [ResellerPayoutStatus.Approved]: { label: 'Approved', tone: 'teal' },
  [ResellerPayoutStatus.Processing]: { label: 'Processing', tone: 'teal' },
  [ResellerPayoutStatus.Paid]: { label: 'Paid', tone: 'good' },
  [ResellerPayoutStatus.Rejected]: { label: 'Rejected', tone: 'bad' },
};

export const DOMAIN_STATUS: Record<CustomDomainStatus, { label: string; tone: ChipTone }> = {
  [CustomDomainStatus.PendingVerification]: { label: 'Waiting for DNS', tone: 'amber' },
  [CustomDomainStatus.DnsVerified]: { label: 'DNS verified', tone: 'teal' },
  [CustomDomainStatus.SslProvisioning]: { label: 'Issuing certificate', tone: 'teal' },
  [CustomDomainStatus.Active]: { label: 'Live', tone: 'good' },
  [CustomDomainStatus.Failed]: { label: 'Verification failed', tone: 'bad' },
};

export const TIER_LABEL: Record<ResellerTier, string> = {
  [ResellerTier.Registered]: 'Registered',
  [ResellerTier.Silver]: 'Silver',
  [ResellerTier.Gold]: 'Gold',
  [ResellerTier.Platinum]: 'Platinum',
  [ResellerTier.Enterprise]: 'Enterprise',
};

export const BILLING_MODEL_LABEL: Record<ResellerBillingModel, string> = {
  [ResellerBillingModel.RevenueShareCommission]: 'Revenue share (commission)',
  [ResellerBillingModel.WholesaleMarkup]: 'Wholesale with markup',
  [ResellerBillingModel.Hybrid]: 'Hybrid',
};

/** What's wrong with a partner registration form, or null when it can be sent. */
export function registrationProblem(input: Partial<CreateResellerPartnerInput>): string | null {
  if (!input.partnerCode?.trim()) return 'Enter a partner code.';
  if (!/^[A-Za-z0-9-]{3,64}$/.test(input.partnerCode.trim())) {
    return 'A partner code is 3–64 letters, numbers or hyphens.';
  }
  if (!input.companyName?.trim()) return 'Enter the company name.';
  if (!input.contactName?.trim()) return 'Enter a contact name.';
  if (
    !input.contactEmail?.trim() ||
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.contactEmail.trim())
  ) {
    return 'Enter a valid contact email.';
  }
  if (!input.contactPhone?.trim()) return 'Enter a contact phone number.';
  return null;
}

/** A domain a partner can point at the platform: a host name with at least one dot, no scheme or path. */
export function isValidDomain(text: string): boolean {
  return /^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/i.test(text.trim());
}

/** A six-digit hex colour, e.g. "#1769FF". */
export function isHexColour(text: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(text.trim());
}
