import { describe, expect, it } from 'vitest';

import { matchesEveryWord, supplierMatchDetail } from './supplier-finder.logic';

describe('Vendor 360 supplier finder', () => {
  it('describes a match by why it may not be usable, then how to tell it apart', () => {
    expect(
      supplierMatchDetail({
        id: '1',
        name: 'Bharat Gears',
        gstin: '27AABCB1234F1Z5',
        contactName: 'Asha Rao',
        isActive: true,
      }),
    ).toBe('27AABCB1234F1Z5 · Asha Rao');
    expect(
      supplierMatchDetail({ id: '2', name: 'Old', isActive: true, isBlacklisted: true }),
    ).toBe('Blacklisted');
    expect(supplierMatchDetail({ id: '3', name: 'Quiet', isActive: false })).toBe('Not in use');
    expect(supplierMatchDetail({ id: '4', name: 'Bare', isActive: true })).toBe(
      'No GSTIN or contact recorded',
    );
  });

  it('matches only when every word is somewhere in the supplier', () => {
    const s = { id: '1', name: 'Bharat Gears', phone: '+91 20 2712', isActive: true };
    expect(matchesEveryWord(s, 'gears BHARAT')).toBe(true);
    expect(matchesEveryWord(s, 'bharat 2712')).toBe(true);
    expect(matchesEveryWord(s, 'bharat forge')).toBe(false);
    expect(matchesEveryWord(s, '  ')).toBe(true);
  });
});
