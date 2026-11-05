import { describe, expect, it } from 'vitest';

import {
  SupplierListItemDto,
  SupplierListSort,
  SupplierListStatus,
} from '../../../proxy/inventory/purchasing.service';
import {
  BLANK_SUPPLIER_QUERY,
  SUPPLIER_PAGE_SIZE,
  localSupplierPage,
  pageCount,
  pageLabel,
  readSupplierQuery,
  supplierQueryParams,
} from './supplier-directory.logic';

const supplier = (name: string, extra: Partial<SupplierListItemDto> = {}): SupplierListItemDto => ({
  id: name,
  name,
  isActive: true,
  ...extra,
});

describe('supplier directory', () => {
  it('labels pages the Indian way and never has fewer than one page', () => {
    expect(pageLabel(0, 50, 1243)).toBe('1–50 of 1,243');
    expect(pageLabel(24, 43, 1243)).toBe('1,201–1,243 of 1,243');
    expect(pageLabel(0, 0, 0)).toBe('');
    expect(pageCount(0)).toBe(1);
    expect(pageCount(SUPPLIER_PAGE_SIZE + 1)).toBe(2);
  });

  it('keeps the search in the address and reads bad values as the defaults', () => {
    const q = {
      filter: 'bharat pune',
      status: SupplierListStatus.Active,
      withDuesOnly: true,
      sort: SupplierListSort.OutstandingHighest,
      page: 3,
    };
    const params = supplierQueryParams(q);
    expect(params).toEqual({ sq: 'bharat pune', ss: '1', sd: '1', so: '1', sp: '3' });
    expect(readSupplierQuery(params)).toEqual(q);
    expect(supplierQueryParams(BLANK_SUPPLIER_QUERY)).toEqual({
      sq: null,
      ss: null,
      sd: null,
      so: null,
      sp: null,
    });
    expect(readSupplierQuery({ ss: '9', so: '-1', sp: 'x' })).toEqual(BLANK_SUPPLIER_QUERY);
  });

  it('searches every word, counts each status and sorts by what is owed', () => {
    const all = [
      supplier('Bharat Gears', { gstin: '27AABCB1234F1Z5', outstandingPayableInPaise: 5_000_00 }),
      supplier('Bharat Castings', { isActive: false, contactName: 'Asha Rao' }),
      supplier('Bharat Forge', { isBlacklisted: true, outstandingPayableInPaise: 90_000_00 }),
      supplier('Pune Filtration'),
    ];
    const page = localSupplierPage(all, { ...BLANK_SUPPLIER_QUERY, filter: 'BHARAT' });
    expect(page.items.map((s) => s.name)).toEqual(['Bharat Castings', 'Bharat Forge', 'Bharat Gears']);
    expect([page.allCount, page.activeCount, page.notInUseCount, page.blacklistedCount]).toEqual([
      3, 1, 1, 1,
    ]);

    expect(localSupplierPage(all, { ...BLANK_SUPPLIER_QUERY, filter: 'bharat asha' }).items).toHaveLength(1);
    expect(localSupplierPage(all, { ...BLANK_SUPPLIER_QUERY, filter: 'aabcb' }).items[0].name).toBe(
      'Bharat Gears',
    );

    const owed = localSupplierPage(all, {
      ...BLANK_SUPPLIER_QUERY,
      withDuesOnly: true,
      sort: SupplierListSort.OutstandingHighest,
    });
    expect(owed.items.map((s) => s.name)).toEqual(['Bharat Forge', 'Bharat Gears']);
  });
});
