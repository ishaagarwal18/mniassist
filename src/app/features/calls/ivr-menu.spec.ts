import { describe, expect, it } from 'vitest';

import {
  IvrRow,
  addIvrRow,
  ivrMenuProblem,
  recommendedIvrMenu,
  removeIvrRow,
  toIvrInput,
  toIvrRows,
  updateIvrRow,
} from './ivr-menu';

const team = '11111111-1111-1111-1111-111111111111';
const row = (digit: string, label: string, more: Partial<IvrRow> = {}): IvrRow => ({
  digit,
  label,
  teamId: team,
  kind: 'RingTeam',
  lookup: '',
  say: '',
  options: [],
  ...more,
});

/** Sales · Purchase · Service → Repairs · Ticket status. */
const departments = (): IvrRow[] => [
  row('1', 'Sales'),
  row('2', 'Purchase'),
  row('3', 'Service', {
    kind: 'SubMenu',
    teamId: '',
    options: [
      row('1', 'Repairs'),
      row('2', 'Ticket status', { kind: 'Lookup', lookup: 'ServiceTicket' }),
    ],
  }),
];

describe('the call menu tree', () => {
  it('accepts departments with a sub-menu and a lookup', () => {
    expect(ivrMenuProblem(departments())).toBeNull();
  });

  it('says what is wrong, level by level', () => {
    const noTeam = updateIvrRow(departments(), [2, 1], (r) => ({ ...r, teamId: '' }));
    expect(ivrMenuProblem(noTeam)).toBe(
      'The Service menu, key 2 (Ticket status): choose the team the call rings.',
    );

    const twice = updateIvrRow(departments(), [2, 1], (r) => ({ ...r, digit: '1' }));
    expect(ivrMenuProblem(twice)).toContain('The Service menu uses a key twice');

    const noLookup = updateIvrRow(departments(), [2, 1], (r) => ({ ...r, lookup: '' }));
    expect(ivrMenuProblem(noLookup)).toContain('choose what the caller can look up');

    const empty = updateIvrRow(departments(), [2], (r) => ({ ...r, options: [] }));
    expect(ivrMenuProblem(empty)).toContain('add the options of this sub-menu');

    expect(ivrMenuProblem([], 3, true)).toContain('Add at least one option');
  });

  it('stops a menu deeper than the server allows', () => {
    const deep = updateIvrRow(departments(), [2, 0], (r) => ({
      ...r,
      kind: 'SubMenu',
      options: [row('1', 'Drives', { kind: 'SubMenu', options: [row('1', 'ABB')] })],
    }));
    expect(ivrMenuProblem(deep, 3)).toContain('at most 3 levels deep');
  });

  it('adds an option on the next free key of its own level, and removes one by its path', () => {
    const added = addIvrRow(departments(), [2]);
    expect(added[2].options.map((o) => o.digit)).toEqual(['1', '2', '3']);
    expect(addIvrRow(departments(), []).map((o) => o.digit)).toEqual(['1', '2', '3', '4']);

    const removed = removeIvrRow(departments(), [2, 0]);
    expect(removed[2].options.map((o) => o.label)).toEqual(['Ticket status']);
    expect(removed[0]).toEqual(departments()[0]);
  });

  it('round-trips with the API: sub-menus send no team, other kinds no options', () => {
    const input = toIvrInput(departments());
    expect(input[2].teamId).toBe('00000000-0000-0000-0000-000000000000');
    expect(input[2].options?.[1]).toMatchObject({
      kind: 'Lookup',
      lookup: 'ServiceTicket',
      teamId: team,
    });
    expect(input[0].options).toEqual([]);
    expect(input[0].say).toBeNull();

    const back = toIvrRows(
      input.map((o) => ({ ...o, teamId: o.teamId, options: o.options as never })),
    );
    expect(back[2].teamId).toBe('');
    expect(back[2].options[1].lookup).toBe('ServiceTicket');
    expect(back[0].kind).toBe('RingTeam');
  });

  it('reads a one-level menu saved before sub-menus as options that ring a team', () => {
    expect(toIvrRows([{ digit: '1', label: 'English', teamId: team }])).toEqual([
      row('1', 'English'),
    ]);
  });

  it('builds the recommended journey: language, then department, then part number or fault code', () => {
    const menu = recommendedIvrMenu([
      { id: 'p', name: 'Purchase desk' },
      { id: 's', name: 'Sales & Billing' },
      { id: 't', name: 'Service team' },
    ]);
    expect(menu.map((l) => l.label)).toEqual(['English', 'हिंदी', 'मराठी']);
    expect(menu.every((l) => l.kind === 'SubMenu')).toBe(true);
    const hindi = menu[1].options;
    expect(hindi.map((o) => [o.digit, o.label, o.teamId])).toEqual([
      ['1', 'नई खरीद', 'p'],
      ['2', 'सेल्स और बिलिंग', 's'],
      ['3', 'सपोर्ट और रिपेयर', ''],
    ]);
    expect(hindi[2].options.map((o) => [o.lookup, o.teamId])).toEqual([
      ['Product', 't'],
      ['FaultCode', 't'],
    ]);
    expect(ivrMenuProblem(menu)).toBeNull();
  });

  it('leaves a team it cannot guess for the editor to choose', () => {
    expect(ivrMenuProblem(recommendedIvrMenu([{ id: 'x', name: 'Front office' }]))).toContain(
      'choose the team the call rings',
    );
  });
});
