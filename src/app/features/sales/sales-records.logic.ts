import { Params } from '@angular/router';

import { CustomerScope, scopeParams } from '../../core/util/customer-scope';
import {
  DeliveryChallanDto,
  DispatchDeliveryChallanDto,
} from '../../proxy/sales/delivery-challan.models';
import {
  DeliveryChallanStatus,
  DeliveryChallanType,
  SalesInvoiceStatus,
  SalesOrderStatus,
  SalesPaymentMode,
} from '../../proxy/sales/sales-enums';
import {
  RecordSalesInvoicePaymentDto,
  SalesInvoiceDto,
} from '../../proxy/sales/sales-invoice.models';
import { SalesOrderDto } from '../../proxy/sales/sales-order.models';
import type { ChipTone } from '../../ui';

/**
 * What the sales order, delivery challan and invoice screens share: status labels and tones, which actions a record allows, and the
 * checks on the dispatch and payment forms. Pure functions, used by the lists and by each record's own page.
 */

export function orderStatusLabel(status: SalesOrderStatus): string {
  switch (status) {
    case SalesOrderStatus.Draft:
      return 'Draft';
    case SalesOrderStatus.Confirmed:
      return 'Confirmed';
    case SalesOrderStatus.InProduction:
      return 'In Production';
    case SalesOrderStatus.PartiallyDispatched:
      return 'Partially Dispatched';
    case SalesOrderStatus.Dispatched:
      return 'Dispatched';
    case SalesOrderStatus.Completed:
      return 'Completed';
    case SalesOrderStatus.Cancelled:
      return 'Cancelled';
    default:
      return 'Unknown';
  }
}

export function orderStatusTone(status: SalesOrderStatus): ChipTone {
  switch (status) {
    case SalesOrderStatus.Confirmed:
      return 'teal';
    case SalesOrderStatus.InProduction:
      return 'amber';
    case SalesOrderStatus.PartiallyDispatched:
      return 'warn';
    case SalesOrderStatus.Dispatched:
    case SalesOrderStatus.Completed:
      return 'good';
    case SalesOrderStatus.Cancelled:
      return 'bad';
    default:
      return 'neutral';
  }
}

/** A draft order can be confirmed. */
export const canConfirmOrder = (o: SalesOrderDto) => o.status === SalesOrderStatus.Draft;

/** A confirmed or part-dispatched order can be shipped (challan) and billed (invoice). */
export const canFulfilOrder = (o: SalesOrderDto) =>
  o.status === SalesOrderStatus.Confirmed || o.status === SalesOrderStatus.PartiallyDispatched;

export function challanTypeLabel(type: DeliveryChallanType): string {
  switch (type) {
    case DeliveryChallanType.SupplyAgainstOrder:
      return 'Supply against Order';
    case DeliveryChallanType.JobWork:
      return 'Job Work (Rule 55(1)(b))';
    case DeliveryChallanType.SupplyOnApproval:
      return 'Supply on Approval';
    case DeliveryChallanType.MaterialReturn:
      return 'Material Return';
    default:
      return 'Other Supply';
  }
}

export function challanStatusLabel(status: DeliveryChallanStatus): string {
  switch (status) {
    case DeliveryChallanStatus.Draft:
      return 'Draft';
    case DeliveryChallanStatus.Dispatched:
      return 'In Transit';
    case DeliveryChallanStatus.Delivered:
      return 'Delivered';
    case DeliveryChallanStatus.Invoiced:
      return 'Invoiced';
    case DeliveryChallanStatus.Cancelled:
      return 'Cancelled';
    default:
      return 'Unknown';
  }
}

export function challanStatusTone(status: DeliveryChallanStatus): ChipTone {
  switch (status) {
    case DeliveryChallanStatus.Dispatched:
      return 'amber';
    case DeliveryChallanStatus.Delivered:
      return 'good';
    case DeliveryChallanStatus.Invoiced:
      return 'teal';
    case DeliveryChallanStatus.Cancelled:
      return 'bad';
    default:
      return 'neutral';
  }
}

export const canDispatchChallan = (c: DeliveryChallanDto) =>
  c.status === DeliveryChallanStatus.Draft;
export const canDeliverChallan = (c: DeliveryChallanDto) =>
  c.status === DeliveryChallanStatus.Dispatched;
/** Dispatched or delivered goods can be billed. */
export const canInvoiceChallan = (c: DeliveryChallanDto) =>
  c.status === DeliveryChallanStatus.Dispatched || c.status === DeliveryChallanStatus.Delivered;

/** The dispatch form starts from what the challan already holds. */
export function dispatchFormFor(c: DeliveryChallanDto): DispatchDeliveryChallanDto {
  return {
    transporterName: c.transporterName || '',
    vehicleNumber: c.vehicleNumber || '',
    lrNumber: c.lrNumber || '',
    ewayBillNumber: c.ewayBillNumber || '',
  };
}

/** Field → message for what stops the dispatch; empty when it can go. */
export function validateDispatch(f: DispatchDeliveryChallanDto): Record<string, string> {
  const e: Record<string, string> = {};
  if (!f.transporterName?.trim()) e['transporter'] = 'Enter the transporter.';
  if (!f.vehicleNumber?.trim()) e['vehicle'] = 'Enter the vehicle number.';
  const eway = (f.ewayBillNumber ?? '').replace(/\s/g, '');
  if (eway && !/^\d{12}$/.test(eway)) e['eway'] = 'An e-Way Bill number has 12 digits.';
  return e;
}

/** The dispatch as sent: trimmed, blanks left out. */
export function toDispatchDto(f: DispatchDeliveryChallanDto): DispatchDeliveryChallanDto {
  const opt = (v?: string) => v?.trim() || undefined;
  return {
    transporterName: f.transporterName?.trim(),
    vehicleNumber: f.vehicleNumber?.trim(),
    lrNumber: opt(f.lrNumber),
    ewayBillNumber: opt(f.ewayBillNumber?.replace(/\s/g, '')),
  };
}

export function invoiceStatusLabel(status: SalesInvoiceStatus): string {
  switch (status) {
    case SalesInvoiceStatus.Draft:
      return 'Draft';
    case SalesInvoiceStatus.Issued:
      return 'Issued';
    case SalesInvoiceStatus.PartiallyPaid:
      return 'Partially Paid';
    case SalesInvoiceStatus.Paid:
      return 'Paid';
    case SalesInvoiceStatus.Cancelled:
      return 'Cancelled';
    default:
      return 'Unknown';
  }
}

export function invoiceStatusTone(status: SalesInvoiceStatus): ChipTone {
  switch (status) {
    case SalesInvoiceStatus.Issued:
      return 'teal';
    case SalesInvoiceStatus.PartiallyPaid:
      return 'amber';
    case SalesInvoiceStatus.Paid:
      return 'good';
    case SalesInvoiceStatus.Cancelled:
      return 'bad';
    default:
      return 'neutral';
  }
}

export const canIssueInvoice = (i: SalesInvoiceDto) => i.status === SalesInvoiceStatus.Draft;
/** An issued invoice with money still owed can take a payment. */
export const canPayInvoice = (i: SalesInvoiceDto) =>
  i.balanceDueInPaise > 0 &&
  i.status !== SalesInvoiceStatus.Draft &&
  i.status !== SalesInvoiceStatus.Cancelled;

export const isInvoiceOverdue = (i: SalesInvoiceDto, now = new Date()) =>
  i.balanceDueInPaise > 0 && new Date(i.dueDateUtc) < now;

export const SALES_PAYMENT_MODES: readonly { value: SalesPaymentMode; label: string }[] = [
  { value: SalesPaymentMode.NeftRtgs, label: 'NEFT / RTGS' },
  { value: SalesPaymentMode.Upi, label: 'UPI' },
  { value: SalesPaymentMode.Cheque, label: 'Cheque' },
  { value: SalesPaymentMode.Cash, label: 'Cash' },
  { value: SalesPaymentMode.Card, label: 'Credit/Debit Card' },
];

export function paymentModeLabel(mode: SalesPaymentMode): string {
  if (mode === SalesPaymentMode.Card) return 'Card';
  return SALES_PAYMENT_MODES.find((m) => m.value === mode)?.label ?? 'Other';
}

export interface SalesPaymentForm {
  /** Rupees, as typed. */
  amount: string;
  mode: SalesPaymentMode;
  reference: string;
  remarks: string;
}

/** The payment form for an invoice: the whole balance, by bank transfer. */
export function paymentFormFor(i: SalesInvoiceDto): SalesPaymentForm {
  return {
    amount: String(i.balanceDueInPaise / 100),
    mode: SalesPaymentMode.NeftRtgs,
    reference: '',
    remarks: '',
  };
}

const rupeesText = (amount: string) => amount.replace(/[₹,\s]/g, '');

/** Field → message for what stops the payment; empty when it can be recorded. */
export function validateSalesPayment(
  f: SalesPaymentForm,
  balanceDueInPaise: number,
): Record<string, string> {
  const e: Record<string, string> = {};
  const t = rupeesText(f.amount);
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(t) || Number(t) <= 0)
    e['amount'] = 'Enter the amount received.';
  else if (Math.round(Number(t) * 100) > balanceDueInPaise)
    e['amount'] = 'More than the balance due.';
  return e;
}

export function toSalesPaymentDto(f: SalesPaymentForm): RecordSalesInvoicePaymentDto {
  return {
    amountInPaise: Math.round(Number(rupeesText(f.amount)) * 100),
    paymentMode: f.mode,
    referenceNumber: f.reference.trim() || undefined,
    remarks: f.remarks.trim() || undefined,
  };
}

/** The query a list keeps when it opens a record: its customer scope, so Back returns to the same list. */
export function listQuery(scope: CustomerScope | null): Params {
  return scope ? scopeParams(scope) : {};
}

/** `?customer=&customerName=` for a new record's page, when the list is for one contact (an account has no single contact). */
export function newRecordQuery(scope: CustomerScope | null): Params {
  return scope?.customerId
    ? { customer: scope.customerId, customerName: scope.name || undefined }
    : {};
}
