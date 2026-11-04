import { Params } from '@angular/router';

import { supplierScopeParams } from '../../../core/util/supplier-scope';
import { Vendor360Dto } from '../../../proxy/purchasing/vendor-360.models';
import type { IconName } from '../../../ui/icon';
import { PURCHASING_PERMISSIONS as P } from '../purchasing-permissions';

/** One way out of the cockpit: a screen, opened on this supplier where it can be. */
export interface VendorLink {
  label: string;
  route: string;
  params?: Params;
  /** A count to show beside it, when the cockpit knows one. */
  count?: number;
  /** Shown under the label: what the link opens. */
  hint?: string;
  /**
   * The action permission the link also needs, beyond opening its screen (the screen's own menu permission is checked from the
   * route): a "New …" link needs the role to create there.
   */
  permission?: string;
}

export interface VendorLinkGroup {
  title: string;
  icon: IconName;
  links: VendorLink[];
}

/** Query params that open a purchasing list or new-record page on just this supplier (`extra` adds `open=<id>`…). */
export function vendorParams(v: Pick<Vendor360Dto, 'id' | 'name'>, extra?: Params): Params {
  return supplierScopeParams({ supplierId: v.id ?? '', name: v.name }, extra);
}

/**
 * Every screen with something about this supplier, grouped by job, each opened on this supplier where the screen can filter by
 * supplier (its name in the search box where it can only search). `visibleVendorLinkGroups` leaves out what the user may not do.
 */
export function vendorLinkGroups(v: Vendor360Dto): VendorLinkGroup[] {
  const scope = vendorParams(v);

  return [
    {
      title: 'Supplier record',
      icon: 'contacts',
      links: [
        {
          label: 'Supplier details',
          route: `/purchasing/suppliers/${v.id}/edit`,
          hint: 'Contact, addresses, bank, blacklist',
          permission: P.manageInventory,
        },
        { label: 'All suppliers', route: '/purchasing', params: { tab: 'suppliers' } },
      ],
    },
    {
      title: 'Buying',
      icon: 'document',
      links: [
        {
          label: 'Purchase orders',
          route: '/purchasing',
          params: scope,
          count: v.totalPurchaseOrdersCount ?? v.recentPurchaseOrders.length,
        },
        {
          label: 'New purchase order',
          route: '/purchasing/orders/new',
          params: scope,
          permission: P.manageInventory,
        },
        {
          label: 'Reorder suggestions',
          route: '/purchasing',
          params: { tab: 'suggestions' },
          hint: 'Below minimum stock',
        },
      ],
    },
    {
      title: 'Receiving & quality',
      icon: 'machine',
      links: [
        {
          label: 'Goods receipts (GRN)',
          route: '/purchasing/grn',
          params: scope,
          count: v.totalGoodsReceiptNotesCount ?? v.recentGoodsReceiptNotes.length,
        },
        {
          label: 'Inward goods receipt',
          route: '/purchasing/grn/new',
          params: scope,
          permission: P.createGrn,
        },
        { label: 'Stock', route: '/stock' },
        { label: 'Stock planning', route: '/stock/planning' },
      ],
    },
    {
      title: 'Payables',
      icon: 'billing',
      links: [
        {
          label: 'Vendor bills',
          route: '/purchasing/bills',
          params: scope,
          count: v.totalVendorBillsCount ?? v.recentVendorBills.length,
        },
        {
          label: 'Record a bill',
          route: '/purchasing/bills/new',
          params: scope,
          permission: P.createBill,
        },
        {
          label: 'Debit notes',
          route: '/purchasing/debit-notes',
          params: scope,
          count: v.totalDebitNotesCount ?? v.recentDebitNotes.length,
        },
        {
          label: 'Issue a debit note',
          route: '/purchasing/debit-notes/new',
          params: scope,
          permission: P.createDebitNote,
        },
      ],
    },
    {
      title: 'Finance & documents',
      icon: 'quotation',
      links: [
        { label: 'GST compliance', route: '/finance/gst-compliance', hint: 'GSTR-2B input credit' },
        { label: 'Journal vouchers', route: '/finance/journal-entries' },
        { label: 'Documents', route: '/documents', params: v.name ? { q: v.name } : undefined },
      ],
    },
  ];
}

/**
 * The groups as this user sees them: links to screens they may not open (`canOpen`, by route) or actions their role lacks
 * (`granted`, by permission) are left out, and so are groups left empty.
 */
export function visibleVendorLinkGroups(
  groups: VendorLinkGroup[],
  canOpen: (route: string) => boolean,
  granted: (permission: string) => boolean,
): VendorLinkGroup[] {
  return groups
    .map((g) => ({
      ...g,
      links: g.links.filter((l) => canOpen(l.route) && (!l.permission || granted(l.permission))),
    }))
    .filter((g) => g.links.length > 0);
}
