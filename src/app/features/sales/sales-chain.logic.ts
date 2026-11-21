import { DeliveryChallanDto } from '../../proxy/sales/delivery-challan.models';
import {
  DeliveryChallanStatus,
  SalesInvoiceStatus,
  SalesOrderStatus,
} from '../../proxy/sales/sales-enums';
import { SalesInvoiceDto } from '../../proxy/sales/sales-invoice.models';
import { SalesOrderDto } from '../../proxy/sales/sales-order.models';

/**
 * Where one sales document sits in the chain Quotation → Order → Delivery → Invoice → Paid, so a
 * first-time user sees what came before (only the steps this record knows about), what this page is, and what to do next.
 */
export type ChainState = 'done' | 'partly' | 'current' | 'todo' | 'skipped';

export interface ChainStep {
  readonly key: 'quote' | 'order' | 'delivery' | 'invoice' | 'paid';
  readonly label: string;
  readonly state: ChainState;
  /** The document's page, when this page knows which one it is. */
  readonly route?: string;
  /** Its number, e.g. SO-0012, when known. */
  readonly number?: string;
}

export interface SalesChain {
  readonly steps: readonly ChainStep[];
  /** One plain sentence: what to do next on this page. Null when the sale is finished or cancelled. */
  readonly next: string | null;
  readonly cancelled: boolean;
}

const LABELS: Record<ChainStep['key'], string> = {
  quote: 'Quotation',
  order: 'Sales order',
  delivery: 'Delivery',
  invoice: 'Invoice',
  paid: 'Paid',
};

function step(
  key: ChainStep['key'],
  state: ChainState,
  route?: string,
  number?: string,
): ChainStep {
  return { key, label: LABELS[key], state, route, number };
}

export function orderChain(o: SalesOrderDto): SalesChain {
  const lines = o.lines ?? [];
  const dispatched = lines.some((l) => l.dispatchedQuantity > 0);
  const allDispatched = lines.length > 0 && lines.every((l) => l.outstandingDispatch <= 0);
  const invoiced = lines.some((l) => l.invoicedQuantity > 0);
  const allInvoiced = lines.length > 0 && lines.every((l) => l.outstandingInvoice <= 0);
  const cancelled = o.status === SalesOrderStatus.Cancelled;

  const delivery: ChainState =
    allDispatched ||
    o.status === SalesOrderStatus.Dispatched ||
    o.status === SalesOrderStatus.Completed
      ? 'done'
      : dispatched || o.status === SalesOrderStatus.PartiallyDispatched
        ? 'partly'
        : 'todo';
  const invoice: ChainState = allInvoiced && invoiced ? 'done' : invoiced ? 'partly' : 'todo';

  let next: string | null = null;
  if (!cancelled) {
    if (o.status === SalesOrderStatus.Draft) next = 'Check the items, then press “Confirm sales order”.';
    else if (delivery !== 'done') next = 'When the goods leave, press “Create delivery challan”.';
    else if (invoice !== 'done') next = 'Bill the customer: press “Generate sales invoice”.';
    else next = 'Open the invoice from Sales invoices to record the payment when it arrives.';
  }

  return {
    cancelled,
    next,
    steps: [
      o.quotationId
        ? step('quote', 'done', `/quotations/${o.quotationId}/edit`)
        : step('quote', 'skipped'),
      step('order', 'current', undefined, o.orderNumber),
      step('delivery', delivery),
      step('invoice', invoice),
    ],
  };
}

export function challanChain(c: DeliveryChallanDto): SalesChain {
  const cancelled = c.status === DeliveryChallanStatus.Cancelled;
  const invoiced = c.status === DeliveryChallanStatus.Invoiced;
  let next: string | null = null;
  if (!cancelled) {
    if (c.status === DeliveryChallanStatus.Draft)
      next = 'When the goods leave, press “Dispatch consignment”.';
    else if (c.status === DeliveryChallanStatus.Dispatched)
      next = 'When the customer receives the goods, press “Mark as delivered”.';
    else if (!invoiced)
      next = c.salesOrderId
        ? 'Bill the customer: open the sales order and press “Generate sales invoice”.'
        : 'Bill the customer: create a sales invoice from Sales invoices.';
    else next = 'Collect the payment on the invoice.';
  }
  return {
    cancelled,
    next,
    steps: [
      c.salesOrderId
        ? step('order', 'done', `/sales/orders/${c.salesOrderId}`, c.salesOrderNumber)
        : step('order', 'skipped'),
      step('delivery', 'current', undefined, c.challanNumber),
      step('invoice', invoiced ? 'done' : 'todo'),
    ],
  };
}

export function invoiceChain(i: SalesInvoiceDto): SalesChain {
  const cancelled = i.status === SalesInvoiceStatus.Cancelled;
  const paid: ChainState =
    i.status === SalesInvoiceStatus.Paid
      ? 'done'
      : i.status === SalesInvoiceStatus.PartiallyPaid
        ? 'partly'
        : 'todo';
  let next: string | null = null;
  if (!cancelled) {
    if (i.status === SalesInvoiceStatus.Draft)
      next = 'Check the amounts, then press “Issue tax invoice” to send it.';
    else if (paid !== 'done') next = 'When the money arrives, press “Record payment”.';
  }
  return {
    cancelled,
    next,
    steps: [
      i.salesOrderId
        ? step('order', 'done', `/sales/orders/${i.salesOrderId}`, i.salesOrderNumber)
        : step('order', 'skipped'),
      i.deliveryChallanId
        ? step(
            'delivery',
            'done',
            `/sales/challans/${i.deliveryChallanId}`,
            i.deliveryChallanNumber,
          )
        : step('delivery', 'skipped'),
      step('invoice', 'current', undefined, i.invoiceNumber),
      step('paid', paid),
    ],
  };
}
