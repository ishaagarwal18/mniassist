import { AutomationTriggerKind } from '../../proxy/messaging';

/**
 * The date triggers (DueDateAutomations on the API): an invoice overdue by N days, an AMC contract ending in N days,
 * a service visit due in N days. Each record starts the automation once; config is {"days": N}.
 */
export const isDueDateTrigger = (t: AutomationTriggerKind): boolean =>
  t === AutomationTriggerKind.InvoiceOverdue ||
  t === AutomationTriggerKind.ContractEnding ||
  t === AutomationTriggerKind.ServiceVisitDue;

export const DUE_MAX_DAYS = 365;

export function defaultDueDays(t: AutomationTriggerKind): number {
  if (t === AutomationTriggerKind.InvoiceOverdue) return 7;
  if (t === AutomationTriggerKind.ContractEnding) return 30;
  return 3;
}

/** The days field's label for each date trigger. */
export function dueDaysLabel(t: AutomationTriggerKind): string {
  if (t === AutomationTriggerKind.InvoiceOverdue) return 'Days after the due date';
  if (t === AutomationTriggerKind.ContractEnding) return 'Days before the contract ends';
  return 'Days before the visit';
}

/** What the AI call step is told for each date trigger, as {{name}} for its reason and the agent's instructions. */
export function dueCallVariables(t: AutomationTriggerKind): string[] {
  if (t === AutomationTriggerKind.InvoiceOverdue)
    return ['invoice_number', 'amount_due', 'due_date', 'days_overdue'];
  if (t === AutomationTriggerKind.ContractEnding)
    return ['contract_number', 'contract_ends', 'days_left', 'equipment'];
  return ['contract_number', 'visit_date', 'visit_number', 'days_left', 'equipment'];
}

/** A whole number 0–365, or null when the box holds anything else. */
export function parseDueDays(raw: string | number): number | null {
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  return Number.isInteger(n) && n >= 0 && n <= DUE_MAX_DAYS ? n : null;
}

/** Reads {"days": N} from a stored trigger config, falling back to the trigger's default. */
export function readDueDays(t: AutomationTriggerKind, configJson: string | undefined): number {
  try {
    const days = (JSON.parse(configJson || '{}') as { days?: unknown }).days;
    return typeof days === 'number' && parseDueDays(days) !== null ? days : defaultDueDays(t);
  } catch {
    return defaultDueDays(t);
  }
}

export const DUE_TRIGGER_HINT =
  'Checked every hour. Each invoice, contract or visit starts this automation once, on the day it reaches the number of days ' +
  '(or within a week after, if a check was missed). Nobody is called or messaged about an invoice paid, a contract renewed or a ' +
  'visit done in the meantime. Calls wait for the calling hours.';
