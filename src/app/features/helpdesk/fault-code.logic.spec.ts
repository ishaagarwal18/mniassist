import { describe, expect, it } from 'vitest';

import { FaultCheckRole, FaultSeverity } from '../../proxy/support/fault-code.service';
import {
  CSV_TEMPLATE,
  approvalWarning,
  blankEntry,
  cleanEntry,
  entryProblem,
  splitList,
} from './fault-code.logic';

describe('fault-code library logic', () => {
  it('asks for the make, code and title, and code letters or digits', () => {
    const e = blankEntry();
    expect(entryProblem(e)).toContain('make');
    e.make = 'ABB';
    expect(entryProblem(e)).toContain('code');
    e.code = '--';
    expect(entryProblem(e)).toContain('letters or digits');
    e.code = '2310';
    expect(entryProblem(e)).toContain('title');
    e.title = 'Overcurrent';
    expect(entryProblem(e)).toBeNull();
  });

  it('warns that a stop-the-machine code needs a safety note before approval', () => {
    const e = { ...blankEntry(), make: 'ABB', code: '2310', title: 'Overcurrent' };
    expect(approvalWarning(e)).toContain('cause or check');
    e.causes = ['Accel too short'];
    expect(approvalWarning(e)).toContain('safety note');
    e.severity = FaultSeverity.WarningOnly;
    expect(approvalWarning(e)).toBeNull();
  });

  it('drops blanks before sending', () => {
    const e = {
      ...blankEntry(),
      make: ' ABB ',
      series: '  ',
      code: '2310',
      title: 'Overcurrent',
      causes: ['a', ' ', 'b'],
      checks: [
        { text: 'Check it', role: FaultCheckRole.Operator },
        { text: '', role: FaultCheckRole.Electrician },
      ],
    };
    const clean = cleanEntry(e);
    expect(clean.make).toBe('ABB');
    expect(clean.series).toBeNull();
    expect(clean.causes).toEqual(['a', 'b']);
    expect(clean.checks.length).toBe(1);
    expect(clean.safetyNote).toBeNull();
  });

  it('splits lists on semicolons or commas, and the template has eleven columns', () => {
    expect(splitList('F2310; Overcurrent,,OC')).toEqual(['F2310', 'Overcurrent', 'OC']);
    expect(CSV_TEMPLATE.split('\n')[0].split(',').length).toBe(11);
  });
});
