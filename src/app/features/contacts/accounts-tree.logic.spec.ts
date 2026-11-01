import { describe, expect, it } from 'vitest';
import { CustomerAccount, AccountRow } from '../../core/services/account.store';
import {
  buildAccountTreeRows,
  computeAccountStats,
  computePresetCounts,
  filterAccountTree,
  formatAccountLocation,
  sanitizeWebsiteUrl,
} from './accounts-tree.logic';

describe('accounts-tree.logic', () => {
  const dummyAcc = (overrides: Partial<CustomerAccount> = {}): CustomerAccount => ({
    id: 'acc-1',
    name: 'Acme Corp',
    contactCount: 5,
    childCount: 0,
    ...overrides,
  });

  describe('formatAccountLocation', () => {
    it('formats city and state', () => {
      expect(formatAccountLocation('Pune', 'Maharashtra')).toBe('Pune, Maharashtra');
    });

    it('formats city only', () => {
      expect(formatAccountLocation('Mumbai', undefined)).toBe('Mumbai');
    });

    it('formats state only', () => {
      expect(formatAccountLocation(undefined, 'Gujarat')).toBe('Gujarat');
    });

    it('returns dash when both are empty', () => {
      expect(formatAccountLocation(undefined, undefined)).toBe('—');
      expect(formatAccountLocation('', '')).toBe('—');
    });
  });

  describe('sanitizeWebsiteUrl', () => {
    it('returns empty string when url is falsy', () => {
      expect(sanitizeWebsiteUrl(undefined)).toBe('');
      expect(sanitizeWebsiteUrl('')).toBe('');
    });

    it('preserves existing https:// and http://', () => {
      expect(sanitizeWebsiteUrl('https://example.com')).toBe('https://example.com');
      expect(sanitizeWebsiteUrl('http://insecure.com/sub')).toBe('http://insecure.com/sub');
    });

    it('prepends https:// when missing protocol', () => {
      expect(sanitizeWebsiteUrl('example.com')).toBe('https://example.com');
      expect(sanitizeWebsiteUrl('www.acme.org/about')).toBe('https://www.acme.org/about');
    });
  });

  describe('buildAccountTreeRows', () => {
    it('maps self-referential tree structure correctly with root parentId as null', () => {
      const parent = dummyAcc({ id: 'parent-1', name: 'Parent Group', childCount: 1, contactCount: 2 });
      const child = dummyAcc({
        id: 'child-1',
        name: 'Subsidiary Plant',
        parentId: 'parent-1',
        childCount: 0,
        contactCount: 3,
        industry: 'Manufacturing',
        city: 'Vadodara',
        state: 'Gujarat',
        website: 'vadodara.acme.com',
      });

      const all = [parent, child];
      const rows: AccountRow[] = [
        { account: parent, depth: 1, subtreeContacts: 5 },
        { account: child, depth: 2, subtreeContacts: 3 },
      ];

      const tree = buildAccountTreeRows(all, rows);

      expect(tree).toHaveLength(2);
      expect(tree[0]).toMatchObject({
        id: 'parent-1',
        parentId: null,
        name: 'Parent Group',
        contactCount: 2,
        subtreeContacts: 5,
        childCount: 1,
        depth: 1,
      });

      expect(tree[1]).toMatchObject({
        id: 'child-1',
        parentId: 'parent-1',
        name: 'Subsidiary Plant',
        industry: 'Manufacturing',
        location: 'Vadodara, Gujarat',
        website: 'vadodara.acme.com',
        contactCount: 3,
        subtreeContacts: 3,
        childCount: 0,
        depth: 2,
      });
    });

    it('sets parentId to null if parent does not exist in dataset (orphans become roots)', () => {
      const orphan = dummyAcc({ id: 'acc-orphan', name: 'Orphan Plant', parentId: 'non-existent' });
      const tree = buildAccountTreeRows([orphan], []);

      expect(tree[0].parentId).toBeNull();
      expect(tree[0].depth).toBe(1);
    });

    it('uses account contactCount as fallback when row subtreeContacts is missing', () => {
      const acc = dummyAcc({ id: 'solo', name: 'Solo Firm', contactCount: 7 });
      const tree = buildAccountTreeRows([acc], []);

      expect(tree[0].subtreeContacts).toBe(7);
      expect(tree[0].depth).toBe(1);
    });
  });

  describe('computeAccountStats & computePresetCounts', () => {
    it('computes accurate account statistics and preset counts', () => {
      const group = dummyAcc({ id: 'g1', contactCount: 2, childCount: 1 });
      const sub = dummyAcc({ id: 's1', parentId: 'g1', contactCount: 4 });
      const emptyGroup = dummyAcc({ id: 'g2', contactCount: 0 });

      const all = [group, sub, emptyGroup];
      const stats = computeAccountStats(all);

      expect(stats).toEqual({
        total: 3,
        groups: 2,
        subsidiaries: 1,
        totalContacts: 6,
      });

      const tree = buildAccountTreeRows(all, [
        { account: group, depth: 1, subtreeContacts: 6 },
        { account: sub, depth: 2, subtreeContacts: 4 },
        { account: emptyGroup, depth: 1, subtreeContacts: 0 },
      ]);

      const presetCounts = computePresetCounts(tree);
      expect(presetCounts).toEqual({
        all: 3,
        groups: 2,
        subsidiaries: 1,
        withContacts: 2,
        needsContacts: 1,
      });
    });
  });

  describe('filterAccountTree', () => {
    const group = dummyAcc({ id: 'g1', contactCount: 2, childCount: 1 });
    const sub = dummyAcc({ id: 's1', parentId: 'g1', contactCount: 4 });
    const emptyGroup = dummyAcc({ id: 'g2', contactCount: 0 });

    const tree = buildAccountTreeRows([group, sub, emptyGroup], [
      { account: group, depth: 1, subtreeContacts: 6 },
      { account: sub, depth: 2, subtreeContacts: 4 },
      { account: emptyGroup, depth: 1, subtreeContacts: 0 },
    ]);

    it('returns all when preset is all', () => {
      expect(filterAccountTree(tree, 'all')).toHaveLength(3);
    });

    it('filters corporate groups only', () => {
      const res = filterAccountTree(tree, 'groups');
      expect(res.map((r) => r.id)).toEqual(['g1', 'g2']);
    });

    it('filters subsidiaries only and maps orphan parentId to null', () => {
      const res = filterAccountTree(tree, 'subsidiaries');
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe('s1');
      expect(res[0].parentId).toBeNull(); // parent g1 was filtered out
    });

    it('filters with-contacts and needs-contacts', () => {
      const withC = filterAccountTree(tree, 'with-contacts');
      expect(withC.map((r) => r.id)).toEqual(['g1', 's1']);

      const needsC = filterAccountTree(tree, 'needs-contacts');
      expect(needsC.map((r) => r.id)).toEqual(['g2']);
    });
  });
});
