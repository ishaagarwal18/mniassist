import { describe, expect, it } from 'vitest';

import { MsmeClassification } from '../../../proxy/purchasing/purchasing-enums';
import { Vendor360Dto } from '../../../proxy/purchasing/vendor-360.models';
import { vendorLinkGroups, vendorParams, visibleVendorLinkGroups } from './vendor-360-links.logic';

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
    expect(link('Record a bill')).toMatchObject({
      route: '/purchasing/bills/new',
      params: { supplier: 's1', name: 'Bharat Gears' },
    });
    expect(link('Issue a debit note')?.route).toBe('/purchasing/debit-notes/new');
    expect(link('Inward goods receipt')).toMatchObject({
      route: '/purchasing/grn/new',
      params: { supplier: 's1', name: 'Bharat Gears' },
    });
    expect(link('New purchase order')?.route).toBe('/purchasing/orders/new');
  });

  it('opens the supplier record for editing', () => {
    expect(link('Supplier details')?.route).toBe('/purchasing/suppliers/s1/edit');
  });

  it('marks each action with the permission it needs', () => {
    expect(link('New purchase order')?.permission).toBe('AutoReach.Inventory.Manage');
    expect(link('Supplier details')?.permission).toBe('AutoReach.Inventory.Manage');
    expect(link('Inward goods receipt')?.permission).toBe('AutoReach.GoodsReceiptNotes.Create');
    expect(link('Record a bill')?.permission).toBe('AutoReach.VendorBills.Create');
    expect(link('Issue a debit note')?.permission).toBe('AutoReach.VendorDebitNotes.Create');
    expect(link('Vendor bills')?.permission).toBeUndefined();
  });

  it('shows only the screens the role opens and the actions it may do', () => {
    const labels = (canOpen: (r: string) => boolean, granted: (p: string) => boolean) =>
      visibleVendorLinkGroups(vendorLinkGroups(vendor), canOpen, granted).flatMap((g) =>
        g.links.map((l) => l.label),
      );

    // A stores clerk: goods receipts only; may record them.
    expect(
      labels(
        (r) => r.startsWith('/purchasing/grn'),
        (p) => p === 'AutoReach.GoodsReceiptNotes.Create',
      ),
    ).toEqual(['Goods receipts (GRN)', 'Inward goods receipt']);

    // Read-only on every screen: no actions.
    const viewer = labels(
      () => true,
      () => false,
    );
    expect(viewer).toContain('Vendor bills');
    expect(viewer).not.toContain('Record a bill');
    expect(viewer).not.toContain('Supplier details');
    expect(viewer).not.toContain('New purchase order');

    // Nothing granted: no groups at all, not empty ones.
    expect(
      visibleVendorLinkGroups(
        vendorLinkGroups(vendor),
        () => false,
        () => false,
      ),
    ).toEqual([]);
  });

  it('builds record links with open=', () => {
    expect(vendorParams(vendor, { open: 'b9' })).toEqual({
      supplier: 's1',
      name: 'Bharat Gears',
      open: 'b9',
    });
  });
});
