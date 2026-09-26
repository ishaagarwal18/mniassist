import { describe, expect, it } from 'vitest';

import { ServiceTicketDto, TicketPriority, TicketStatus } from '../../proxy/support';
import { dueLabel, hoursByPriority, isFinished, isOverdue, PRIORITY_SLA_HOURS } from './ticket-logic';

const ticket = (over: Partial<ServiceTicketDto> = {}): Pick<ServiceTicketDto, 'status' | 'dueAtUtc' | 'isOverdue'> => ({
  status: TicketStatus.Open,
  dueAtUtc: '2026-09-22T12:00:00.000Z',
  isOverdue: false,
  ...over,
});

describe('PRIORITY_SLA_HOURS', () => {
  it('matches the servers fixed hours-by-priority table', () => {
    expect(PRIORITY_SLA_HOURS[TicketPriority.Urgent]).toBe(4);
    expect(PRIORITY_SLA_HOURS[TicketPriority.High]).toBe(8);
    expect(PRIORITY_SLA_HOURS[TicketPriority.Normal]).toBe(24);
    expect(PRIORITY_SLA_HOURS[TicketPriority.Low]).toBe(72);
  });
});

describe('hoursByPriority', () => {
  it('reads the workspaces own settings into the same shape as the fixed table', () => {
    const map = hoursByPriority({ urgentHours: 1, highHours: 2, normalHours: 3, lowHours: 4 });
    expect(map[TicketPriority.Urgent]).toBe(1);
    expect(map[TicketPriority.High]).toBe(2);
    expect(map[TicketPriority.Normal]).toBe(3);
    expect(map[TicketPriority.Low]).toBe(4);
  });
});

describe('isOverdue', () => {
  it('is true only for an open or pending ticket past its due time', () => {
    const now = new Date('2026-09-22T13:00:00.000Z');
    expect(isOverdue(ticket(), now)).toBe(true);
    expect(isOverdue(ticket({ status: TicketStatus.Pending }), now)).toBe(true);
    expect(isOverdue(ticket({ status: TicketStatus.Resolved }), now)).toBe(false);
    expect(isOverdue(ticket({ dueAtUtc: null }), now)).toBe(false);
    expect(isOverdue(ticket(), new Date('2026-09-22T11:00:00.000Z'))).toBe(false);
  });
});

describe('dueLabel', () => {
  it('reads minutes, hours or days, ahead or overdue', () => {
    const now = new Date('2026-09-22T11:30:00.000Z');
    expect(dueLabel(ticket({ dueAtUtc: '2026-09-22T11:50:00.000Z' }), now)).toBe('20m left');
    expect(dueLabel(ticket({ dueAtUtc: '2026-09-22T15:30:00.000Z' }), now)).toBe('4h left');
    expect(dueLabel(ticket({ dueAtUtc: '2026-09-24T11:30:00.000Z' }), now)).toBe('2d left');
    expect(dueLabel(ticket({ dueAtUtc: '2026-09-22T11:00:00.000Z', isOverdue: true }), now)).toBe('30m overdue');
    expect(dueLabel(ticket({ dueAtUtc: '2026-09-21T11:30:00.000Z', isOverdue: true }), now)).toBe('1d overdue');
    expect(dueLabel(ticket({ dueAtUtc: null }), now)).toBeNull();
  });
});

describe('isFinished', () => {
  it('is true only for resolved or closed', () => {
    expect(isFinished(TicketStatus.Resolved)).toBe(true);
    expect(isFinished(TicketStatus.Closed)).toBe(true);
    expect(isFinished(TicketStatus.Open)).toBe(false);
    expect(isFinished(TicketStatus.Pending)).toBe(false);
  });
});
