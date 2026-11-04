import type { SaveSupplierInput, SupplierDto } from '../../../proxy/inventory/purchasing.service';

/** The supplier form as typed: every field text (lead time too), so nothing jumps while editing. */
export interface SupplierForm {
  name: string;
  gstin: string;
  leadDays: string;
  isActive: boolean;
  contactName: string;
  contactDesignation: string;
  phone: string;
  email: string;
  address: string;
  shippingAddress: string;
  /** Shipping address is the billing address (stored as the same text). */
  shipSameAsBilling: boolean;
  bankAccountName: string;
  bankName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankBranch: string;
  remarks: string;
  isBlacklisted: boolean;
  blacklistReason: string;
}

export function supplierForm(s?: SupplierDto | null): SupplierForm {
  const address = s?.address ?? '';
  const shipping = s?.shippingAddress ?? '';
  return {
    name: s?.name ?? '',
    gstin: s?.gstin ?? '',
    leadDays: s?.leadDays != null ? String(s.leadDays) : '',
    isActive: s?.isActive ?? true,
    contactName: s?.contactName ?? '',
    contactDesignation: s?.contactDesignation ?? '',
    phone: s?.phone ?? '',
    email: s?.email ?? '',
    address,
    shippingAddress: shipping,
    shipSameAsBilling: !s || !shipping || shipping === address,
    bankAccountName: s?.bankAccountName ?? '',
    bankName: s?.bankName ?? '',
    bankAccountNumber: s?.bankAccountNumber ?? '',
    bankIfsc: s?.bankIfsc ?? '',
    bankBranch: s?.bankBranch ?? '',
    remarks: s?.remarks ?? '',
    isBlacklisted: s?.isBlacklisted ?? false,
    blacklistReason: s?.blacklistReason ?? '',
  };
}

/** What is wrong, by field; empty when it can be saved. Same rules as the API. */
export function validateSupplierForm(f: SupplierForm): Record<string, string> {
  const e: Record<string, string> = {};
  if (!f.name.trim()) e['name'] = "Enter the supplier's name.";
  const gstin = f.gstin.trim().toUpperCase();
  if (gstin && !/^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin))
    e['gstin'] = 'A GSTIN has 15 characters, like 27AABCU9603R1ZM.';
  const lead = f.leadDays.trim();
  if (lead && (!/^\d{1,3}$/.test(lead) || Number(lead) > 365)) e['leadDays'] = '0 to 365 days.';
  const email = f.email.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e['email'] = 'Enter a valid email.';
  const account = f.bankAccountNumber.replace(/\s/g, '');
  if (account && !/^[0-9A-Za-z]{6,34}$/.test(account))
    e['bankAccountNumber'] = '6 to 34 letters or digits.';
  const ifsc = f.bankIfsc.trim().toUpperCase();
  if (ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc))
    e['bankIfsc'] = '11 characters, like HDFC0001092.';
  if ((account || ifsc) && !(account && ifsc))
    e[account ? 'bankIfsc' : 'bankAccountNumber'] ??= 'Needed with the other bank detail.';
  if (f.isBlacklisted && !f.blacklistReason.trim())
    e['blacklistReason'] = 'Say why, so others know.';
  return e;
}

export function toSaveSupplierInput(f: SupplierForm): SaveSupplierInput {
  const opt = (s: string) => s.trim() || null;
  const address = opt(f.address);
  return {
    name: f.name.trim(),
    gstin: opt(f.gstin.toUpperCase()),
    leadDays: f.leadDays.trim() ? Number(f.leadDays.trim()) : null,
    isActive: f.isActive,
    contactName: opt(f.contactName),
    contactDesignation: opt(f.contactDesignation),
    phone: opt(f.phone),
    email: opt(f.email),
    address,
    shippingAddress: f.shipSameAsBilling ? address : opt(f.shippingAddress),
    bankAccountName: opt(f.bankAccountName),
    bankName: opt(f.bankName),
    bankAccountNumber: opt(f.bankAccountNumber.replace(/\s/g, '')),
    bankIfsc: opt(f.bankIfsc.toUpperCase()),
    bankBranch: opt(f.bankBranch),
    remarks: opt(f.remarks),
    isBlacklisted: f.isBlacklisted,
    blacklistReason: f.isBlacklisted ? opt(f.blacklistReason) : null,
  };
}
