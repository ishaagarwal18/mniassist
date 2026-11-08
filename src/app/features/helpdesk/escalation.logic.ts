import {
  BusinessHoursDto,
  EscalationActions,
  EscalationAppliesTo,
  EscalationCondition,
  EscalationStepDto,
} from '../../proxy/support/escalation.service';

export const APPLIES_TO_TEXT: Record<EscalationAppliesTo, string> = {
  [EscalationAppliesTo.All]: 'Every breakdown',
  [EscalationAppliesTo.AmcOrCritical]: 'Machines under AMC or marked High criticality',
  [EscalationAppliesTo.Amc]: 'Machines under AMC',
  [EscalationAppliesTo.HighCriticality]: 'Machines marked High criticality',
};

export const CONDITION_TEXT: Record<EscalationCondition, string> = {
  [EscalationCondition.NoEngineer]: 'No engineer assigned',
  [EscalationCondition.NoFirstResponse]: 'No reply to the customer',
  [EscalationCondition.NoVisit]: 'No visit started',
  [EscalationCondition.NotResolved]: 'Not resolved',
};

export const ACTION_FIELDS: { flag: EscalationActions; label: string }[] = [
  { flag: EscalationActions.NotifyCoordinator, label: 'Tell the coordinator' },
  { flag: EscalationActions.NotifyManager, label: 'Tell the manager' },
  { flag: EscalationActions.AutoAssign, label: 'Assign by rotation' },
  { flag: EscalationActions.UpdateCustomer, label: 'Update the customer' },
  { flag: EscalationActions.NotifyAccountOwner, label: 'Tell the account owner' },
  { flag: EscalationActions.NotifyAdmin, label: 'Tell the admins' },
  { flag: EscalationActions.FlagDashboard, label: 'Flag on the dashboard' },
  { flag: EscalationActions.ShowOnHealthCard, label: 'Show on the health card' },
];

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function hasAction(actions: EscalationActions, flag: EscalationActions): boolean {
  return (actions & flag) === flag;
}

export function toggleAction(
  actions: EscalationActions,
  flag: EscalationActions,
  on: boolean,
): EscalationActions {
  return on ? actions | flag : actions & ~flag;
}

/** "1 h 20 min", "2 days". */
export function duration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const days = `${d} day${d === 1 ? '' : 's'}`;
  return h ? `${days} ${h} h` : days;
}

/** "09:00" from 540, and back. */
export function clockText(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function parseClock(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const minute = +m[1] * 60 + +m[2];
  return +m[1] <= 24 && +m[2] < 60 && minute <= 1440 ? minute : null;
}

/** What is wrong with a policy before it is sent, in the words the server would use; null when it can be saved. */
export function policyProblem(
  name: string,
  hours: BusinessHoursDto,
  steps: EscalationStepDto[],
): string | null {
  if (!name.trim()) return 'Give the policy a name.';
  if (!steps.length) return 'Add at least one step.';
  if (steps.length > 8) return 'A policy has at most 8 steps.';
  if (steps.some((s) => !Number.isInteger(s.minutes) || s.minutes < 1 || s.minutes > 43200))
    return "Each step's time is between 1 minute and 30 days.";
  if (new Set(steps.map((s) => s.minutes)).size !== steps.length)
    return "Two steps can't have the same time.";
  if (steps.some((s) => s.actions === EscalationActions.None))
    return 'Each step must do something.';
  if (!hours.alwaysOpen) {
    if (!hours.days.length) return 'Choose the days the clock runs.';
    if (hours.opensAtMinute >= hours.closesAtMinute)
      return 'The opening time must be before the closing time.';
  }
  return null;
}

/** Steps in time order, as the server keeps them. */
export function sortedSteps(steps: EscalationStepDto[]): EscalationStepDto[] {
  return [...steps].sort((a, b) => a.minutes - b.minutes);
}
