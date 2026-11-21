import { WorkFacts, overdueInvoices, workItems } from './work-today.logic';

const none: WorkFacts = {
  tasksOverdue: null,
  tasksDueToday: null,
  invoicesOverdue: null,
  overdueInPaise: 0,
  draftInvoices: null,
  lowStock: null,
};
const inr = (p: number) => `₹${p / 100}`;

describe('Home work items', () => {
  it('shows nothing when nothing is waiting or nothing loaded', () => {
    expect(workItems(none, inr)).toEqual([]);
    expect(workItems({ ...none, tasksOverdue: 0, lowStock: 0 }, inr)).toEqual([]);
  });

  it('names overdue money and opens invoices', () => {
    const [row] = workItems({ ...none, invoicesOverdue: 2, overdueInPaise: 150000 }, inr);
    expect(row.title).toBe('2 invoices are past the due date');
    expect(row.meta).toContain('₹1500 still to collect');
    expect(row.route).toBe('/sales/invoices');
    expect(row.tone).toBe('bad');
  });

  it('uses the singular for one', () => {
    expect(workItems({ ...none, tasksDueToday: 1 }, inr)[0].title).toBe('1 task is due today');
  });

  it('counts only past-due invoices with money still owed', () => {
    const now = new Date('2026-11-20T10:00:00Z');
    const r = overdueInvoices(
      [
        { dueDateUtc: '2026-11-01T00:00:00Z', balanceDueInPaise: 5000 },
        { dueDateUtc: '2026-11-01T00:00:00Z', balanceDueInPaise: 0 },
        { dueDateUtc: '2026-12-01T00:00:00Z', balanceDueInPaise: 9000 },
        { balanceDueInPaise: 100 },
      ],
      now,
    );
    expect(r).toEqual({ count: 1, paise: 5000 });
  });
});
