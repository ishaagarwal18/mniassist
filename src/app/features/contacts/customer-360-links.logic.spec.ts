import { describe, expect, it } from 'vitest';

import { Customer360Dto } from '../../proxy/sales/customer-360.models';
import { customerLinkGroups } from './customer-360-links.logic';

const base: Customer360Dto = {
  id: 'c1',
  contactId: 'c1',
  customerName: 'Suresh Patil',
  phone: '+91 98220 18290',
  accountId: 'acc1',
  accountName: 'Kalyani Forge',
  credit: {} as Customer360Dto['credit'],
  lifetimeRevenueInPaise: 0,
  totalOrdersCount: 6,
  activeOrdersCount: 1,
  totalChallansCount: 2,
  totalInvoicesCount: 5,
  openTicketsCount: 1,
  installedAssetsCount: 3,
  recentOrders: [],
  recentChallans: [],
  recentInvoices: [],
  openTickets: [],
  installedAssets: [],
  timeline: [],
};

const find = (groups: ReturnType<typeof customerLinkGroups>, label: string) =>
  groups.flatMap((g) => g.links).find((l) => l.label === label);

describe('customerLinkGroups', () => {
  it("leads a person's view to their account for orders and invoices", () => {
    const groups = customerLinkGroups(base, null);
    for (const label of [
      'Sales orders',
      'New sales order',
      'Delivery challans',
      'Invoices',
      'Collections',
    ]) {
      expect(find(groups, label)).toBeUndefined();
    }
    expect(find(groups, 'Orders & invoices')).toEqual({
      label: 'Orders & invoices',
      route: '/contacts/accounts/acc1/360',
      hint: 'On Kalyani Forge',
    });
    expect(find(groups, 'Enquiries')).toBeDefined();
  });

  it('asks a person with no account to be linked to one first', () => {
    const groups = customerLinkGroups({ ...base, accountId: undefined }, null);
    expect(find(groups, 'Orders & invoices')).toMatchObject({
      route: '/contacts/c1/edit',
      hint: 'Link to an account first',
    });
  });

  it('opens the sales lists on the whole account in the account view', () => {
    const groups = customerLinkGroups({ ...base, isAccountView: true }, null);
    expect(find(groups, 'Invoices')?.count).toBe(5);
    expect(find(groups, 'New sales order')?.params).toMatchObject({ new: 1, customer: 'c1' });
    expect(find(groups, 'Collections')).toBeDefined();
    expect(find(groups, 'Delivery challans')?.params).toEqual({
      account: 'acc1',
      name: 'Kalyani Forge',
    });
    expect(find(groups, 'Helpdesk tickets')?.params).toEqual({ q: 'Kalyani Forge' });
  });

  it('links straight to the conversation once it is found', () => {
    expect(find(customerLinkGroups(base, null), 'Inbox')?.route).toBe('/inbox');
    expect(find(customerLinkGroups(base, 'conv9'), 'Inbox conversation')?.params).toEqual({
      conversation: 'conv9',
    });
  });

  it('leaves out account links for a contact with no account', () => {
    const groups = customerLinkGroups({ ...base, accountId: undefined }, null);
    expect(find(groups, 'Account details')).toBeUndefined();
    expect(find(groups, 'Contact profile')?.route).toBe('/contacts/c1/edit');
  });
});
