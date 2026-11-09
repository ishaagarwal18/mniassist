import type { Breach } from '../../core/services/compliance.service';
import { boardStatus, breachProblem, peopleStatus, toLocalInput } from './breach.logic';

const base: Breach = {
  id: 'b-1',
  title: 'Sales phone lost',
  severity: 'medium',
  state: 'detected',
  detectedAt: '2026-11-08T10:00:00Z',
  affected: 40,
  boardOutstanding: true,
  principalsOutstanding: true,
  hoursToBoardDeadline: 50,
};

describe('breach log statuses', () => {
  it('counts down the 72 hours for telling the Board, amber in the last day, red once past', () => {
    expect(boardStatus(base)).toEqual({ label: '2d left', tone: 'neutral' });
    expect(boardStatus({ ...base, hoursToBoardDeadline: 20 })).toEqual({
      label: '20h left',
      tone: 'amber',
    });
    expect(boardStatus({ ...base, hoursToBoardDeadline: -5 })).toEqual({
      label: '5h overdue',
      tone: 'bad',
    });
  });

  it('shows when the Board was told, and nothing pending on a closed incident', () => {
    const told = boardStatus({ ...base, boardNotifiedAt: '2026-11-09T06:00:00Z' });
    expect(told.tone).toBe('good');
    expect(told.label).toMatch(/^Told /);
    expect(boardStatus({ ...base, state: 'closed', hoursToBoardDeadline: -100 })).toEqual({
      label: 'Not told',
      tone: 'neutral',
    });
  });

  it('asks for the affected people to be told only when someone was affected', () => {
    expect(peopleStatus(base)).toEqual({ label: 'To tell', tone: 'amber' });
    expect(peopleStatus({ ...base, affected: 0 })).toEqual({
      label: 'No one affected',
      tone: 'neutral',
    });
    expect(peopleStatus({ ...base, principalsNotifiedAt: '2026-11-09T06:00:00Z' }).tone).toBe(
      'good',
    );
  });
});

describe('logging an incident', () => {
  const now = new Date(2026, 10, 9, 12, 0);

  it('formats a moment for a datetime-local field', () => {
    expect(toLocalInput(new Date(2026, 0, 5, 9, 7))).toBe('2026-01-05T09:07');
  });

  it('needs a title, a found time no later than now and a count of 0 or more', () => {
    expect(breachProblem(' ', '2026-11-09T10:00', 0, now)).toMatch(/title/);
    expect(breachProblem('Lost phone', '', 0, now)).toMatch(/when the incident was found/);
    expect(breachProblem('Lost phone', '2026-11-10T10:00', 0, now)).toMatch(/future/);
    expect(breachProblem('Lost phone', '2026-11-09T10:00', -1, now)).toMatch(/0 or more/);
    expect(breachProblem('Lost phone', '2026-11-09T10:00', 12, now)).toBeNull();
  });
});
