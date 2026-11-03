import {
  DeliveryChallanStatus,
  SalesInvoiceStatus,
  SalesOrderStatus,
} from '../../proxy/sales/sales-enums';
import { ChipTone } from '../../ui';

/**
 * Calculates credit utilization percentage (0 - 100).
 * (Total Owed + Total on Order) / Credit Limit.
 */
export function calculateCreditUtilization(
  creditLimitInPaise?: number,
  totalOwedInPaise = 0,
  totalOnOrderInPaise = 0,
): number {
  if (!creditLimitInPaise || creditLimitInPaise <= 0) return 0;
  const committed = Math.max(0, totalOwedInPaise) + Math.max(0, totalOnOrderInPaise);
  const pct = Math.round((committed / creditLimitInPaise) * 100);
  return Math.min(100, Math.max(0, pct));
}

/**
 * Calculates remaining available credit in paise.
 * Credit Limit - (Total Owed + Total on Order).
 * Returns null if no credit limit is set.
 */
export function calculateAvailableCredit(
  creditLimitInPaise?: number,
  totalOwedInPaise = 0,
  totalOnOrderInPaise = 0,
): number | null {
  if (creditLimitInPaise == null) return null;
  const committed = Math.max(0, totalOwedInPaise) + Math.max(0, totalOnOrderInPaise);
  return Math.max(0, creditLimitInPaise - committed);
}

/**
 * Calculates the overdue percentage of total owed receivables (0 - 100).
 */
export function calculateOverdueRatio(totalOwedInPaise = 0, totalOverdueInPaise = 0): number {
  if (!totalOwedInPaise || totalOwedInPaise <= 0) return 0;
  const pct = Math.round((Math.max(0, totalOverdueInPaise) / totalOwedInPaise) * 100);
  return Math.min(100, Math.max(0, pct));
}

/**
 * Determines credit risk status tone based on hold status and utilization.
 */
export function getCreditStatusTone(
  onHold: boolean,
  utilizationPct: number,
  totalOverdueInPaise = 0,
): ChipTone {
  if (onHold) return 'bad';
  if (totalOverdueInPaise > 0 || utilizationPct >= 90) return 'warn';
  return 'good';
}

/**
 * Determines human-readable label for sales order status.
 */
export function getOrderStatusLabel(status: SalesOrderStatus): string {
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

/**
 * Determines chip tone for sales order status.
 */
export function getOrderStatusTone(status: SalesOrderStatus): ChipTone {
  switch (status) {
    case SalesOrderStatus.Draft:
      return 'neutral';
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

/**
 * Determines human-readable label for delivery challan status.
 */
export function getChallanStatusLabel(status: DeliveryChallanStatus): string {
  switch (status) {
    case DeliveryChallanStatus.Draft:
      return 'Draft';
    case DeliveryChallanStatus.Dispatched:
      return 'In Transit';
    case DeliveryChallanStatus.Delivered:
      return 'Delivered';
    case DeliveryChallanStatus.Invoiced:
      return 'Invoiced';
    default:
      return 'Unknown';
  }
}

/**
 * Determines chip tone for delivery challan status.
 */
export function getChallanStatusTone(status: DeliveryChallanStatus): ChipTone {
  switch (status) {
    case DeliveryChallanStatus.Draft:
      return 'neutral';
    case DeliveryChallanStatus.Dispatched:
      return 'amber';
    case DeliveryChallanStatus.Delivered:
      return 'good';
    case DeliveryChallanStatus.Invoiced:
      return 'teal';
    default:
      return 'neutral';
  }
}

/**
 * Determines human-readable label for sales invoice status.
 */
export function getInvoiceStatusLabel(status: SalesInvoiceStatus): string {
  switch (status) {
    case SalesInvoiceStatus.Draft:
      return 'Draft';
    case SalesInvoiceStatus.Issued:
      return 'Issued';
    case SalesInvoiceStatus.PartiallyPaid:
      return 'Partially Paid';
    case SalesInvoiceStatus.Paid:
      return 'Paid';
    default:
      return 'Unknown';
  }
}

/**
 * Determines chip tone for sales invoice status.
 */
export function getInvoiceStatusTone(status: SalesInvoiceStatus): ChipTone {
  switch (status) {
    case SalesInvoiceStatus.Draft:
      return 'neutral';
    case SalesInvoiceStatus.Issued:
      return 'teal';
    case SalesInvoiceStatus.PartiallyPaid:
      return 'amber';
    case SalesInvoiceStatus.Paid:
      return 'good';
    default:
      return 'neutral';
  }
}

/**
 * Determines chip tone for service ticket priority.
 */
export function getTicketPriorityTone(priority: string): ChipTone {
  switch (priority?.toLowerCase()) {
    case 'urgent':
      return 'bad';
    case 'high':
      return 'warn';
    case 'low':
      return 'neutral';
    default:
      return 'amber';
  }
}

/**
 * Determines chip tone for machinery AMC contract status.
 */
export function getAmcStatusTone(status?: string): ChipTone {
  if (status === 'Active') return 'good';
  if (status === 'Expired') return 'bad';
  if (status === 'Expiring Soon') return 'warn';
  return 'neutral';
}

/**
 * Checks whether an invoice is overdue based on balance due and due date.
 */
export function isInvoiceOverdue(balanceDueInPaise: number, dueDateUtc?: string): boolean {
  if (!balanceDueInPaise || balanceDueInPaise <= 0 || !dueDateUtc) return false;
  const dueDate = new Date(dueDateUtc);
  return dueDate.getTime() < Date.now();
}
