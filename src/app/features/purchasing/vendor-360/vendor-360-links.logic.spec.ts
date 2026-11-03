import { describe, expect, it } from 'vitest';

import { MsmeClassification } from '../../../proxy/purchasing/purchasing-enums';
import { Vendor360Dto } from '../../../proxy/purchasing/vendor-360.models';
import { vendorLinkGroups, vendorParams } from './vendor-360-links.logic';

const vendor: Vendor360Dto = {
  id: 's1',
  name: 'Bharat Gears',
  msmeCategory: MsmeClassification.NotRegistered,
  totalPurchasesInPaise: 0,
  totalPaidInPaise: 0,
  outstandingPayableInPaise: 0,
  msmeOverdueInPaise: 0,
  qualityAcceptancePercent: 100,
  totalPurchaseOrdersCount: 31,
  totalGoodsReceiptNotesCount: 4,
  totalVendorBillsCount: 7,
  totalDebitNotesCount: 0,
  recentPurchaseOrders: [],
  recentGoodsReceiptNotes: [],
  recentVendorBills: [],
  recentDebitNotes: [],
};

const link = (label: string) =>
  vendorLinkGroups(vendor)
    .flatMap((g) => g.links)
    .find((l) => l.label === label);

describe('vendor 360 links', () => {
  it('opens the purchasing lists on this supplier, with the full counts', () => {
    expect(link('Vendor bills')).toMatchObject({
      route: '/purchasing/bills',
      params: { supplier: 's1', name: 'Bharat Gears' },
      count: 7,
    });
    expect(link('Purchase orders')?.count).toBe(31);
    expect(link('Goods receipts (GRN)')?.params).toEqual({ supplier: 's1', name: 'Bharat Gears' });
  });

  it('opens the create forms for this supplier', () => {
    expect(link('Record a bill')?.params).toEqual({ supplier: 's1', name: 'Bharat Gears', new: 1 });
    expect(link('New goods receipt')?.route).toBe('/purchasing/grn');
    expect(link('New purchase order')?.route).toBe('/purchasing');
  });

  it('opens the supplier record for editing', () => {
    expect(link('Supplier details')?.params).toEqual({ tab: 'suppliers', edit: 's1' });
  });

  it('builds record links with open=', () => {
    expect(vendorParams(vendor, { open: 'b9' })).toEqual({
      supplier: 's1',
      name: 'Bharat Gears',
      open: 'b9',
    });
  });
});
