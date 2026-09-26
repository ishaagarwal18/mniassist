import { IntegrationKind } from '../../proxy/integrations/integration-kind.enum';
import { ErpSyncRunResultDto } from '../../proxy/integrations/erp-sync.service';

/** What a Tally or SAP Business One connection syncs, and the ERP-side names it posts under. */
export interface ErpForm {
  customers: boolean;
  salesOrders: boolean;
  invoices: boolean;
  /** Tally: the company to post into when more than one is open. */
  company: string;
  /** Tally: the ledger sales orders credit. */
  salesLedger: string;
  /** Tally: the group new customer ledgers go under. */
  debtorsGroup: string;
  /** SAP Business One: the start of each new customer code. */
  cardCodePrefix: string;
}

const TEXT_KEYS = ['company', 'salesLedger', 'debtorsGroup', 'cardCodePrefix'] as const;

/** Reads the form from a connection's config; anything missing is off or blank. */
export function readErpForm(config: Record<string, unknown>): ErpForm {
  const erp = (config['erp'] ?? {}) as Record<string, unknown>;
  const text = (key: string) => (typeof config[key] === 'string' ? (config[key] as string) : '');
  return {
    customers: erp['customers'] === true,
    salesOrders: erp['salesOrders'] === true,
    invoices: erp['invoices'] === true,
    company: text('company'),
    salesLedger: text('salesLedger'),
    debtorsGroup: text('debtorsGroup'),
    cardCodePrefix: text('cardCodePrefix'),
  };
}

/**
 * Writes the form back into a copy of the connection's config, leaving everything else (the gateway URL, the SAP database)
 * untouched. Blank names are removed so the connector falls back to its defaults; only the names the kind reads are written.
 */
export function applyErpForm(config: Record<string, unknown>, form: ErpForm, kind: IntegrationKind): Record<string, unknown> {
  const next: Record<string, unknown> = { ...config };
  if (form.customers || form.salesOrders || form.invoices) {
    next['erp'] = { customers: form.customers, salesOrders: form.salesOrders, invoices: form.invoices };
  } else {
    delete next['erp'];
  }

  const used: readonly string[] = kind === IntegrationKind.Tally ? ['company', 'salesLedger', 'debtorsGroup'] : ['cardCodePrefix'];
  for (const key of TEXT_KEYS) {
    const value = form[key].trim();
    if (used.includes(key) && value) next[key] = value;
    else if (used.includes(key)) delete next[key];
  }
  return next;
}

/** A sales order needs its customer in the ERP first, so switching orders on without customers is refused before saving. */
export function erpFormProblem(form: ErpForm): string | null {
  return form.salesOrders && !form.customers
    ? 'Sales orders need customer sync on too — an order has to be raised against a customer the ERP knows.'
    : null;
}

/** One line on what "Sync now" did. */
export function describeRun(r: ErpSyncRunResultDto): string {
  const parts: string[] = [];
  if (r.retried === 0) parts.push('Nothing was waiting to retry');
  else parts.push(`${r.recovered} of ${r.retried} retried record${r.retried === 1 ? '' : 's'} went through`);
  if (r.invoiceError) parts.push(`invoices could not be read: ${r.invoiceError}`);
  else parts.push(`${r.invoices} invoice${r.invoices === 1 ? '' : 's'} read`);
  return parts.join('; ') + '.';
}
