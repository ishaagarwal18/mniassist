import { dateState } from './project-page';

describe('project page dates', () => {
  const now = new Date(2026, 10, 19, 15, 0);

  it('labels unset, past, near and far dates', () => {
    expect(dateState(null, now).tone).toBe('none');
    expect(dateState('2026-11-10', now)).toEqual({ days: -9, text: '9 days ago', tone: 'past' });
    expect(dateState('2026-11-19', now).text).toBe('Today');
    expect(dateState('2026-11-20', now).text).toBe('Tomorrow');
    expect(dateState('2026-12-31', now).tone).toBe('later');
  });
});
