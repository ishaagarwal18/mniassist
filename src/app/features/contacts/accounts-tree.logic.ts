import { AccountRow, CustomerAccount } from '../../core/services/account.store';

export type AccountFilterPreset =
  'all' | 'groups' | 'subsidiaries' | 'with-contacts' | 'needs-contacts';

export interface AccountTreeRecord {
  id: string;
  parentId: string | null;
  name: string;
  industry: string;
  address: string;
  location: string;
  city: string;
  state: string;
  website: string;
  contactCount: number;
  subtreeContacts: number;
  childCount: number;
  depth: number;
  account: CustomerAccount;
}

export interface AccountStats {
  total: number;
  groups: number;
  subsidiaries: number;
  totalContacts: number;
}

export interface PresetCounts {
  all: number;
  groups: number;
  subsidiaries: number;
  withContacts: number;
  needsContacts: number;
}

export function formatAccountLocation(city?: string, state?: string): string {
  return [city, state].filter(Boolean).join(', ') || '—';
}

export function sanitizeWebsiteUrl(website?: string): string {
  if (!website) return '';
  const trimmed = website.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function buildAccountTreeRows(
  all: readonly CustomerAccount[],
  rows: readonly AccountRow[],
): AccountTreeRecord[] {
  const allIds = new Set(all.map((a) => a.id));
  const subMap = new Map<string, number>();
  const depthMap = new Map<string, number>();

  for (const r of rows) {
    subMap.set(r.account.id, r.subtreeContacts);
    depthMap.set(r.account.id, r.depth);
  }

  return all.map((a) => {
    const parentId = a.parentId && allIds.has(a.parentId) ? a.parentId : null;
    const depth = depthMap.get(a.id) ?? (parentId ? 2 : 1);

    return {
      id: a.id,
      parentId,
      name: a.name,
      industry: a.industry || '—',
      address: a.address || '',
      location: formatAccountLocation(a.city, a.state),
      city: a.city || '',
      state: a.state || '',
      website: a.website || '',
      contactCount: a.contactCount,
      subtreeContacts: subMap.get(a.id) ?? a.contactCount,
      childCount: a.childCount,
      depth,
      account: a,
    };
  });
}

export function computeAccountStats(all: readonly CustomerAccount[]): AccountStats {
  let groups = 0;
  let subsidiaries = 0;
  let totalContacts = 0;

  for (const a of all) {
    if (a.parentId) {
      subsidiaries++;
    } else {
      groups++;
    }
    totalContacts += a.contactCount || 0;
  }

  return {
    total: all.length,
    groups,
    subsidiaries,
    totalContacts,
  };
}

export function computePresetCounts(records: readonly AccountTreeRecord[]): PresetCounts {
  let groups = 0;
  let subsidiaries = 0;
  let withContacts = 0;
  let needsContacts = 0;

  for (const r of records) {
    if (r.parentId === null) {
      groups++;
    } else {
      subsidiaries++;
    }
    if (r.contactCount > 0 || r.subtreeContacts > 0) {
      withContacts++;
    } else {
      needsContacts++;
    }
  }

  return {
    all: records.length,
    groups,
    subsidiaries,
    withContacts,
    needsContacts,
  };
}

export function filterAccountTree(
  records: readonly AccountTreeRecord[],
  preset: AccountFilterPreset,
): AccountTreeRecord[] {
  if (preset === 'all') return [...records];

  let filtered: AccountTreeRecord[];
  switch (preset) {
    case 'groups':
      filtered = records.filter((r) => r.parentId === null);
      break;
    case 'subsidiaries':
      filtered = records.filter((r) => r.account.parentId != null);
      break;
    case 'with-contacts':
      filtered = records.filter((r) => r.contactCount > 0 || r.subtreeContacts > 0);
      break;
    case 'needs-contacts':
      filtered = records.filter((r) => r.contactCount === 0 && r.subtreeContacts === 0);
      break;
  }

  const presentIds = new Set(filtered.map((r) => r.id));
  return filtered.map((r) => {
    if (r.parentId && !presentIds.has(r.parentId)) {
      return { ...r, parentId: null };
    }
    return r;
  });
}
