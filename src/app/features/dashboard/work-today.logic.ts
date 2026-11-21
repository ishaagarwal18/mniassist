import { ActionItem } from '../../core/services/dashboard.service';

/** What Home knows about the day's business work: tasks, unpaid invoices and stock. Null = not loaded or not allowed. */
export interface WorkFacts {
  readonly tasksOverdue: number | null;
  readonly tasksDueToday: number | null;
  readonly invoicesOverdue: number | null;
  readonly overdueInPaise: number;
  readonly draftInvoices: number | null;
  readonly lowStock: number | null;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Turns the day's facts into "Needs you today" rows, most urgent first. Each row says what is
 * waiting, why it matters, and opens the page where it is done.
 */
export function workItems(f: WorkFacts, inr: (paise: number) => string): ActionItem[] {
  const items: ActionItem[] = [];
  if (f.tasksOverdue) {
    items.push({
      icon: 'check',
      tone: 'bad',
      title: `${plural(f.tasksOverdue, 'task is', 'tasks are')} overdue`,
      meta: 'Finish them or move the due date',
      route: '/tasks',
    });
  }
  if (f.invoicesOverdue) {
    items.push({
      icon: 'document',
      tone: 'bad',
      title: `${plural(f.invoicesOverdue, 'invoice is', 'invoices are')} past the due date`,
      meta: `${inr(f.overdueInPaise)} still to collect. Send a reminder or record the payment`,
      route: '/sales/invoices',
    });
  }
  if (f.tasksDueToday) {
    items.push({
      icon: 'check',
      tone: 'amber',
      title: `${plural(f.tasksDueToday, 'task is', 'tasks are')} due today`,
      meta: 'Your list for today',
      route: '/tasks',
    });
  }
  if (f.draftInvoices) {
    items.push({
      icon: 'document',
      tone: 'amber',
      title: `${plural(f.draftInvoices, 'draft invoice is', 'draft invoices are')} not issued yet`,
      meta: 'The customer has not received them. Check and issue',
      route: '/sales/invoices',
    });
  }
  if (f.lowStock) {
    items.push({
      icon: 'machine',
      tone: 'amber',
      title: `${plural(f.lowStock, 'item is', 'items are')} below minimum stock`,
      meta: 'Order more before they run out',
      route: '/stock/planning',
    });
  }
  return items;
}

/** Overdue = issued or part-paid, money still due, and the due date has passed. */
export function overdueInvoices(
  invoices: readonly { dueDateUtc?: string; balanceDueInPaise: number }[],
  now: Date,
): { count: number; paise: number } {
  let count = 0;
  let paise = 0;
  for (const i of invoices) {
    if (i.balanceDueInPaise > 0 && i.dueDateUtc && new Date(i.dueDateUtc) < now) {
      count++;
      paise += i.balanceDueInPaise;
    }
  }
  return { count, paise };
}
