import { winRateNote } from './project-report-page';

describe('project report', () => {
  it('says when nothing closed and counts wins and losses otherwise', () => {
    expect(winRateNote({ won: 0, lost: 0, winRate: null, wonValueInPaise: 0 })).toBe(
      'None won or lost in the period',
    );
    const note = winRateNote({ won: 2, lost: 1, winRate: 0.667, wonValueInPaise: 4_50_00_000_00 });
    expect(note).toContain('2 won, 1 lost');
  });
});
