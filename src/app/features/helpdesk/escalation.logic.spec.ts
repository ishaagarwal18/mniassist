import { describe, expect, it } from 'vitest';

import { EscalationActions, EscalationCondition } from '../../proxy/support/escalation.service';
import {
  clockText,
  duration,
  hasAction,
  parseClock,
  policyProblem,
  sortedSteps,
  toggleAction,
} from './escalation.logic';

const always = { alwaysOpen: true, days: [], opensAtMinute: 0, closesAtMinute: 1440 };
const step = (minutes: number, actions = EscalationActions.NotifyCoordinator) => ({
  minutes,
  condition: EscalationCondition.NoEngineer,
  actions,
});

describe('escalation policy logic', () => {
  it('sets and clears action flags one at a time', () => {
    let a = toggleAction(EscalationActions.None, EscalationActions.NotifyManager, true);
    a = toggleAction(a, EscalationActions.AutoAssign, true);
    expect(hasAction(a, EscalationActions.NotifyManager)).toBe(true);
    expect(hasAction(a, EscalationActions.AutoAssign)).toBe(true);
    a = toggleAction(a, EscalationActions.NotifyManager, false);
    expect(hasAction(a, EscalationActions.NotifyManager)).toBe(false);
    expect(a).toBe(EscalationActions.AutoAssign);
  });

  it('writes durations and clock times the way people say them', () => {
    expect(duration(15)).toBe('15 min');
    expect(duration(80)).toBe('1 h 20 min');
    expect(duration(1440)).toBe('1 day');
    expect(duration(2940)).toBe('2 days 1 h');
    expect(clockText(540)).toBe('09:00');
    expect(parseClock('18:30')).toBe(1110);
    expect(parseClock('25:00')).toBeNull();
    expect(parseClock('9am')).toBeNull();
  });

  it('refuses what the server would refuse', () => {
    expect(policyProblem('', always, [step(15)])).toContain('name');
    expect(policyProblem('A', always, [])).toContain('at least one');
    expect(policyProblem('A', always, [step(15), step(15)])).toContain('same time');
    expect(policyProblem('A', always, [step(0)])).toContain('between');
    expect(policyProblem('A', always, [step(15, EscalationActions.None)])).toContain('something');
    expect(
      policyProblem(
        'A',
        { alwaysOpen: false, days: [], opensAtMinute: 540, closesAtMinute: 1080 },
        [step(15)],
      ),
    ).toContain('days');
    expect(
      policyProblem(
        'A',
        { alwaysOpen: false, days: [1], opensAtMinute: 1080, closesAtMinute: 540 },
        [step(15)],
      ),
    ).toContain('before');
    expect(policyProblem('A', always, [step(15), step(30)])).toBeNull();
  });

  it('keeps steps in time order', () => {
    expect(sortedSteps([step(60), step(15), step(30)]).map((s) => s.minutes)).toEqual([15, 30, 60]);
  });
});
