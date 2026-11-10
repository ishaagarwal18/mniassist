import {
  Gstr2bMatchStatus,
  RecordVendorBillPaymentDto,
  ThreeWayMatchStatus,
  VendorBillDto,
  VendorBillStatus,
  VendorPaymentMode,
} from '../../../proxy/purchasing';
import type { ChipTone } from '../../../ui';
import { withOptionNames } from '../../../core/pick-lists/option-names';

type Chip = { label: string; tone: ChipTone };

export function billStatusChip(s: VendorBillStatus): Chip {
  switch (s) {
    case VendorBillStatus.Paid:
      return { label: 'Paid', tone: 'good' };
    case VendorBillStatus.PartiallyPaid:
      return { label: 'Part paid', tone: 'amber' };
    case VendorBillStatus.Approved:
      return { label: 'Approved', tone: 'teal' };
    case VendorBillStatus.PendingApproval:
      return { label: 'Pending approval', tone: 'amber' };
    case VendorBillStatus.Cancelled:
      return { label: 'Cancelled', tone: 'neutral' };
    default:
      return { label: 'Draft', tone: 'neutral' };
  }
}

export function matchChip(s: ThreeWayMatchStatus): Chip {
  switch (s) {
    case ThreeWayMatchStatus.Matched:
      return { label: '3-way matched', tone: 'good' };
    case ThreeWayMatchStatus.PriceVariance:
      return { label: 'Rate differs from PO', tone: 'bad' };
    case ThreeWayMatchStatus.QuantityVariance:
      return { label: 'Qty differs from GRN', tone: 'bad' };
    case ThreeWayMatchStatus.ManualOverride:
      return { label: 'Match overridden', tone: 'amber' };
    default:
      return { label: 'Match pending', tone: 'neutral' };
  }
}

export function itcChip(s: Gstr2bMatchStatus): Chip {
  switch (s) {
    case Gstr2bMatchStatus.MatchedIn2B:
      return { label: 'In GSTR-2B', tone: 'good' };
    case Gstr2bMatchStatus.MissingIn2B:
      return { label: 'Missing in GSTR-2B', tone: 'bad' };
    case Gstr2bMatchStatus.TaxMismatch:
      return { label: 'GSTR-2B tax differs', tone: 'bad' };
    default:
      return { label: 'GSTR-2B not checked', tone: 'neutral' };
  }
}

export const PAYMENT_MODES = withOptionNames('purchasing.payment-mode', [
  { value: VendorPaymentMode.NeftRtgs, label: 'NEFT / RTGS' },
  { value: VendorPaymentMode.Upi, label: 'UPI' },
  { value: VendorPaymentMode.Cheque, label: 'Cheque' },
  { value: VendorPaymentMode.Cash, label: 'Cash' },
]);

export function paymentModeLabel(m: VendorPaymentMode): string {
  return PAYMENT_MODES.find((x) => x.value === m)?.label ?? 'Bank';
}

/** The API's rules: approve drafts and pending bills; pay approved ones with a balance; cancel any unpaid one. */
export const canApproveBill = (b: VendorBillDto) =>
  b.status === VendorBillStatus.Draft || b.status === VendorBillStatus.PendingApproval;
export const canPayBill = (b: VendorBillDto) =>
  b.balanceDueInPaise > 0 &&
  (b.status === VendorBillStatus.Approved || b.status === VendorBillStatus.PartiallyPaid);
export const canCancelBill = (b: VendorBillDto) =>
  b.status !== VendorBillStatus.Cancelled &&
  b.status !== VendorBillStatus.Paid &&
  b.payments.length === 0;

export interface PaymentForm {
  /** Rupees, as typed. */
  amount: string;
  mode: VendorPaymentMode;
  reference: string;
  /** yyyy-MM-dd */
  date: string;
  tdsCertificate: string;
  remarks: string;
}

export function validatePayment(f: PaymentForm, balanceDueInPaise: number): Record<string, string> {
  const e: Record<string, string> = {};
  const t = f.amount.replace(/[₹,\s]/g, '');
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(t) || Number(t) <= 0) e['amount'] = 'Enter the amount paid.';
  else if (Math.round(Number(t) * 100) > balanceDueInPaise)
    e['amount'] = 'More than the balance due.';
  if (f.mode !== VendorPaymentMode.Cash && !f.reference.trim())
    e['reference'] = 'Enter the UTR, UPI or cheque number.';
  if (!f.date) e['date'] = 'Enter the payment date.';
  return e;
}

export function toPaymentDto(f: PaymentForm): RecordVendorBillPaymentDto {
  return {
    amountInPaise: Math.round(Number(f.amount.replace(/[₹,\s]/g, '')) * 100),
    paymentMode: f.mode,
    referenceNumber: f.reference.trim() || undefined,
    tdsCertificateNumber: f.tdsCertificate.trim() || undefined,
    remarks: f.remarks.trim() || undefined,
    paymentDateUtc: new Date(f.date).toISOString(),
  };
}
