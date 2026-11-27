import { AutomationTriggerKind } from '../../proxy/messaging';
import {
  defaultDueDays,
  dueCallVariables,
  isDueDateTrigger,
  parseDueDays,
  readDueDays,
} from './due-date-trigger';

describe('date triggers', () => {
  it('knows the three date triggers and their usual days', () => {
    expect(isDueDateTrigger(AutomationTriggerKind.InvoiceOverdue)).toBe(true);
    expect(isDueDateTrigger(AutomationTriggerKind.ServiceVisitDue)).toBe(true);
    expect(isDueDateTrigger(AutomationTriggerKind.SegmentEntered)).toBe(false);
    expect(defaultDueDays(AutomationTriggerKind.InvoiceOverdue)).toBe(7);
    expect(defaultDueDays(AutomationTriggerKind.ContractEnding)).toBe(30);
    expect(defaultDueDays(AutomationTriggerKind.ServiceVisitDue)).toBe(3);
  });

  it('accepts whole days from 0 to 365 only', () => {
    expect(parseDueDays('0')).toBe(0);
    expect(parseDueDays(' 30 ')).toBe(30);
    expect(parseDueDays('365')).toBe(365);
    expect(parseDueDays('366')).toBeNull();
    expect(parseDueDays('-1')).toBeNull();
    expect(parseDueDays('2.5')).toBeNull();
    expect(parseDueDays('soon')).toBeNull();
  });

  it('reads the saved days, falling back to the default', () => {
    expect(readDueDays(AutomationTriggerKind.InvoiceOverdue, '{"days":15}')).toBe(15);
    expect(readDueDays(AutomationTriggerKind.ContractEnding, '{}')).toBe(30);
    expect(readDueDays(AutomationTriggerKind.ContractEnding, 'not json')).toBe(30);
  });

  it('lists what the call is told, matching DueDetails.CallVariables on the API', () => {
    expect(dueCallVariables(AutomationTriggerKind.InvoiceOverdue)).toEqual([
      'invoice_number',
      'amount_due',
      'due_date',
      'days_overdue',
    ]);
    expect(dueCallVariables(AutomationTriggerKind.ServiceVisitDue)).toContain('visit_date');
  });
});
