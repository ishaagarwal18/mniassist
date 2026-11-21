import { NavGroup } from './nav.model';

/**
 * Menu groups a person can switch off because they do not work in that area. The heading-less
 * top group, Customers, Reports and the set-up groups always stay: everyone needs them.
 */
export const OPTIONAL_AREAS: readonly string[] = [
  'Sales',
  'Orders & invoices',
  'Purchasing & stock',
  'Service',
  'Phone & calls',
  'Marketing',
  'Products & documents',
  'Finance',
  'Manufacturing',
  'OEM pricing',
  'Partners',
];

/** Per person: two people sharing a browser keep their own menu. */
export function workAreasKey(userId: string | null): string {
  return `ar.sidebar.workAreas.${userId ?? 'me'}`;
}

/** The areas this person chose to see, or null when they have not chosen (everything shows). */
export function readWorkAreas(userId: string | null): ReadonlySet<string> | null {
  try {
    const raw = localStorage.getItem(workAreasKey(userId));
    if (raw === null) return null;
    const list: unknown = JSON.parse(raw);
    return Array.isArray(list)
      ? new Set(list.filter((h): h is string => typeof h === 'string'))
      : null;
  } catch {
    return null;
  }
}

export function writeWorkAreas(userId: string | null, areas: ReadonlySet<string> | null): void {
  try {
    if (areas === null) localStorage.removeItem(workAreasKey(userId));
    else localStorage.setItem(workAreasKey(userId), JSON.stringify([...areas]));
  } catch {
    /* storage blocked: the choice just won't be remembered */
  }
}

/** Drops the optional groups the person did not choose. No choice keeps every group. */
export function filterByWorkAreas(
  groups: readonly NavGroup[],
  chosen: ReadonlySet<string> | null,
): readonly NavGroup[] {
  if (chosen === null) return groups;
  return groups.filter(
    (g) => !g.heading || !OPTIONAL_AREAS.includes(g.heading) || chosen.has(g.heading),
  );
}
