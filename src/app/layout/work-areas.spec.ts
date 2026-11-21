import { NAV, NavGroup } from './nav.model';
import { OPTIONAL_AREAS, filterByWorkAreas } from './work-areas';

const groups: NavGroup[] = [
  { heading: null, items: [] },
  { heading: 'Customers', items: [] },
  { heading: 'Sales', items: [] },
  { heading: 'Finance', items: [] },
  { heading: 'Settings', items: [] },
];

describe('work areas', () => {
  it('keeps every group when nothing was chosen', () => {
    expect(filterByWorkAreas(groups, null)).toEqual(groups);
  });

  it('hides optional areas that were not chosen, never the fixed ones', () => {
    const shown = filterByWorkAreas(groups, new Set(['Sales'])).map((g) => g.heading);
    expect(shown).toEqual([null, 'Customers', 'Sales', 'Settings']);
  });

  it('names only real menu groups', () => {
    const headings = NAV.map((g) => g.heading);
    for (const area of OPTIONAL_AREAS) expect(headings).toContain(area);
  });
});
