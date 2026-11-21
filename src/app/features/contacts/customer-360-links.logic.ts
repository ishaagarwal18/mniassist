import { Params } from '@angular/router';

import { scopeParams } from '../../core/util/customer-scope';
import { Customer360Dto } from '../../proxy/sales/customer-360.models';
import type { IconName } from '../../ui/icon';

/** One way out of the cockpit: a screen, opened on this customer where it can be. */
export interface CustomerLink {
  label: string;
  route: string;
  params?: Params;
  /** A count to show beside it, when the cockpit knows one. */
  count?: number;
  /** Shown under the label: what the link opens. */
  hint?: string;
}

export interface CustomerLinkGroup {
  title: string;
  icon: IconName;
  links: CustomerLink[];
}

/**
 * Every screen with something about this customer, grouped by area, each opened on this customer: their own records where the
 * screen can filter by customer, their name in its search box where it can only search. Screens the user may not open are left
 * out. Built from the cockpit's data, so it follows the contact / whole-account switch. A person's view keeps what is theirs
 * (their record, conversations, enquiries and quotations); the company's (orders, challans, invoices, collections, documents,
 * machines, service, re-orders and renewals) is on the account, which one link leads to.
 */
export function customerLinkGroups(
  c: Customer360Dto,
  conversationId: string | null,
): CustomerLinkGroup[] {
  const contactId = c.contactId ?? (c.isAccountView ? undefined : c.id);
  const name = (c.isAccountView ? c.accountName || c.customerName : c.customerName) ?? '';
  const scope = scopeParams({
    customerId: c.isAccountView ? null : (contactId ?? null),
    accountId: c.isAccountView ? (c.accountId ?? null) : null,
    name,
  });
  const q = name ? { q: name } : undefined;

  const record: CustomerLink[] = [];
  if (contactId) {
    record.push({
      label: 'Contact profile',
      route: `/contacts/${contactId}/edit`,
      hint: c.contactName ?? c.customerName,
    });
  }
  if (c.accountId) {
    record.push(
      {
        label: 'Account details',
        route: `/contacts/accounts/${c.accountId}/edit`,
        hint: 'GSTIN, billing, shipping',
      },
      { label: 'Add a contact here', route: '/contacts/new', params: { accountId: c.accountId } },
      { label: 'Account health', route: '/account-health', params: q },
    );
  }
  record.push({
    label: 'Account hierarchy',
    route: '/contacts/accounts',
    hint: 'Groups, companies, plants',
  });

  const person = !c.isAccountView;
  const toAccount: CustomerLink = c.accountId
    ? {
        label: 'Orders, invoices & service',
        route: `/contacts/accounts/${c.accountId}/360`,
        hint: c.accountName ? `On ${c.accountName}` : 'On the account',
      }
    : {
        label: 'Orders, invoices & service',
        route: contactId ? `/contacts/${contactId}/edit` : '/contacts/accounts/new',
        hint: 'Link to an account first',
      };

  const conversations: CustomerLinkGroup = {
    title: 'Conversations & activity',
    icon: 'inbox',
    links: [
      conversationId
        ? {
            label: 'Inbox conversation',
            route: '/inbox',
            params: { conversation: conversationId },
          }
        : { label: 'Inbox', route: '/inbox', hint: 'No conversation yet' },
      { label: 'Calls', route: '/calls', params: q },
      { label: 'Tasks', route: '/tasks', params: q },
      { label: 'Meetings', route: '/meetings' },
    ],
  };
  const enquiries: CustomerLink[] = [
    { label: 'Enquiries', route: '/enquiries' },
    { label: 'Quotations', route: '/quotations' },
  ];

  if (person) {
    return [
      { title: 'Customer record', icon: 'contacts', links: record },
      conversations,
      { title: 'Sales', icon: 'quotation', links: [...enquiries, toAccount] },
    ];
  }

  const selling: CustomerLink[] = [
    { label: 'Sales orders', route: '/sales/orders', params: scope, count: c.totalOrdersCount },
    ...(contactId
      ? [
          {
            label: 'New sales order',
            route: '/sales/orders/new',
            params: {
              customer: contactId,
              customerName: c.contactName ?? c.customerName,
            },
          },
        ]
      : []),
    {
      label: 'Delivery challans',
      route: '/sales/challans',
      params: scope,
      count: c.totalChallansCount,
    },
    { label: 'Invoices', route: '/sales/invoices', params: scope, count: c.totalInvoicesCount },
  ];

  return [
    { title: 'Customer record', icon: 'contacts', links: record },
    conversations,
    {
      title: 'Sales',
      icon: 'quotation',
      links: [
        ...enquiries,
        ...selling,
        { label: 'Re-orders', route: '/reorders' },
        { label: 'Spares due', route: '/spares' },
        { label: 'Renewals', route: '/renewals', params: q },
      ],
    },
    {
      title: 'Finance & documents',
      icon: 'billing',
      links: [
        { label: 'Collections', route: '/collections', hint: 'Overdue reminders' },
        { label: 'Documents', route: '/documents', params: q },
      ],
    },
    {
      title: 'Service',
      icon: 'machine',
      links: [
        { label: 'Machines at customers', route: '/installed-base', count: c.installedAssetsCount },
        { label: 'Helpdesk tickets', route: '/helpdesk', params: q, count: c.openTicketsCount },
        { label: 'Field service', route: '/field-service/tickets', params: q },
        { label: 'Service contracts (AMC)', route: '/field-service/amc', params: q },
      ],
    },
  ];
}
