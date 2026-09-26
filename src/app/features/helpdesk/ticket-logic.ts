import {
  ServiceTicketDto,
  ServiceTicketSettingsDto,
  TicketPriority,
  TicketStatus,
} from '../../proxy/support';

export const STATUS_LABEL: Record<TicketStatus, string> = {
  [TicketStatus.Open]: 'Open',
  [TicketStatus.Pending]: 'Pending',
  [TicketStatus.Resolved]: 'Resolved',
  [TicketStatus.Closed]: 'Closed',
};

export const PRIORITY_LABEL: Record<TicketPriority, string> = {
  [TicketPriority.Low]: 'Low',
  [TicketPriority.Normal]: 'Normal',
  [TicketPriority.High]: 'High',
  [TicketPriority.Urgent]: 'Urgent',
};

/** The order a "raise a ticket" form offers priorities in, and the SLA hours each one promises — the same table the server's
 *  ServiceTicketRules uses, kept here only so the form can show the promise before it saves. */
export const PRIORITY_SLA_HOURS: Record<TicketPriority, number> = {
  [TicketPriority.Urgent]: 4,
  [TicketPriority.High]: 8,
  [TicketPriority.Normal]: 24,
  [TicketPriority.Low]: 72,
};

/** The workspace's own SLA policy, keyed by priority the way {@link PRIORITY_SLA_HOURS} is — so a dialog can show whichever it has. */
export function hoursByPriority(
  s: Pick<ServiceTicketSettingsDto, 'urgentHours' | 'highHours' | 'normalHours' | 'lowHours'>,
): Record<TicketPriority, number> {
  return {
    [TicketPriority.Urgent]: s.urgentHours,
    [TicketPriority.High]: s.highHours,
    [TicketPriority.Normal]: s.normalHours,
    [TicketPriority.Low]: s.lowHours,
  };
}

export const PRIORITY_CHOICES: readonly TicketPriority[] = [
  TicketPriority.Urgent,
  TicketPriority.High,
  TicketPriority.Normal,
  TicketPriority.Low,
];

export const STATUS_CHOICES: readonly TicketStatus[] = [
  TicketStatus.Open,
  TicketStatus.Pending,
  TicketStatus.Resolved,
  TicketStatus.Closed,
];

/** A ticket still open or pending, past its due time. Mirrors ServiceTicketRules.IsOverdue, but the server's own `isOverdue`
 *  flag on the DTO is the source of truth — this is only for a ticket just edited locally, before the next reload. */
export function isOverdue(t: Pick<ServiceTicketDto, 'status' | 'dueAtUtc'>, now: Date): boolean {
  if (!t.dueAtUtc) return false;
  if (t.status !== TicketStatus.Open && t.status !== TicketStatus.Pending) return false;
  return new Date(t.dueAtUtc).getTime() < now.getTime();
}

/** "3h left", "Due in 20m", "2 days overdue". */
export function dueLabel(
  t: Pick<ServiceTicketDto, 'dueAtUtc' | 'isOverdue'>,
  now: Date,
): string | null {
  if (!t.dueAtUtc) return null;
  const due = new Date(t.dueAtUtc);
  const ms = due.getTime() - now.getTime();
  const mins = Math.round(Math.abs(ms) / 60_000);

  if (t.isOverdue) {
    if (mins < 60) return `${mins}m overdue`;
    const hours = Math.round(mins / 60);
    return hours < 24 ? `${hours}h overdue` : `${Math.round(hours / 24)}d overdue`;
  }

  if (mins < 60) return `${mins}m left`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `${hours}h left` : `${Math.round(hours / 24)}d left`;
}

/** A ticket finished, one way or the other. */
export function isFinished(status: TicketStatus): boolean {
  return status === TicketStatus.Resolved || status === TicketStatus.Closed;
}
