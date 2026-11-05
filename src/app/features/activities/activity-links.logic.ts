import {
  ActivityLinkDto,
  ActivityLinkInput,
  ActivityLinkType,
  ReminderChannels,
} from '../../proxy/activities';

/** The record kinds a task or meeting can be linked to, in the order the picker offers them. */
export const LINK_TYPES: { type: ActivityLinkType; label: string; plural: string }[] = [
  { type: ActivityLinkType.Contact, label: 'Contact', plural: 'contacts' },
  { type: ActivityLinkType.Account, label: 'Account', plural: 'accounts' },
  { type: ActivityLinkType.Enquiry, label: 'Lead', plural: 'leads' },
  { type: ActivityLinkType.Quotation, label: 'Quotation', plural: 'quotations' },
  { type: ActivityLinkType.SalesOrder, label: 'Sales order', plural: 'sales orders' },
  { type: ActivityLinkType.SalesInvoice, label: 'Invoice', plural: 'invoices' },
  { type: ActivityLinkType.DeliveryChallan, label: 'Delivery challan', plural: 'challans' },
  { type: ActivityLinkType.Campaign, label: 'Campaign', plural: 'campaigns' },
  { type: ActivityLinkType.ServiceTicket, label: 'Service ticket', plural: 'tickets' },
];

/** The most links one task or meeting may have (the API refuses more). */
export const MAX_LINKS = 30;

export function linkTypeLabel(type: ActivityLinkType | undefined): string {
  return LINK_TYPES.find((t) => t.type === type)?.label ?? 'Record';
}

/** Adds a link unless it is already there or the limit is reached; returns the same list when nothing changes. */
export function addLink(links: ActivityLinkDto[], link: ActivityLinkDto): ActivityLinkDto[] {
  if (links.length >= MAX_LINKS) return links;
  if (links.some((l) => l.type === link.type && l.recordId === link.recordId)) return links;
  return [...links, link];
}

export function removeLink(links: ActivityLinkDto[], link: ActivityLinkDto): ActivityLinkDto[] {
  return links.filter((l) => !(l.type === link.type && l.recordId === link.recordId));
}

export function toLinkInputs(links: ActivityLinkDto[]): ActivityLinkInput[] {
  return links
    .filter((l) => l.type != null && !!l.recordId)
    .map((l) => ({ type: l.type!, recordId: l.recordId! }));
}

/** Where a link chip opens: the record's own page where there is one, else its list searched for it. */
export function linkRoute(link: ActivityLinkDto): { path: string; query?: Record<string, string> } {
  const id = link.recordId ?? '';
  const number = (link.label ?? '').split(' · ')[0].trim();
  switch (link.type) {
    case ActivityLinkType.Contact:
      return { path: `/contacts/${id}/360` };
    case ActivityLinkType.Account:
      return { path: `/contacts/accounts/${id}/360` };
    case ActivityLinkType.Quotation:
      return { path: `/quotations/${id}/edit` };
    case ActivityLinkType.Enquiry:
      return { path: '/enquiries', query: { q: number } };
    case ActivityLinkType.SalesOrder:
      return { path: '/sales/orders', query: { q: number } };
    case ActivityLinkType.SalesInvoice:
      return { path: '/sales/invoices', query: { q: number } };
    case ActivityLinkType.DeliveryChallan:
      return { path: '/sales/challans', query: { q: number } };
    case ActivityLinkType.Campaign:
      return { path: '/campaigns', query: { q: number } };
    case ActivityLinkType.ServiceTicket:
      return { path: '/helpdesk', query: { q: number } };
    default:
      return { path: '/' };
  }
}

export const CHANNELS: { flag: ReminderChannels; label: string }[] = [
  { flag: ReminderChannels.Email, label: 'Email' },
  { flag: ReminderChannels.WhatsApp, label: 'WhatsApp' },
  { flag: ReminderChannels.Sms, label: 'SMS' },
];

export function hasChannel(set: ReminderChannels | undefined, flag: ReminderChannels): boolean {
  return ((set ?? 0) & flag) === flag;
}

export function toggleChannel(
  set: ReminderChannels | undefined,
  flag: ReminderChannels,
  on: boolean,
): ReminderChannels {
  return on ? (set ?? 0) | flag : (set ?? 0) & ~flag;
}

export function channelLabel(flag: ReminderChannels | undefined): string {
  return CHANNELS.find((c) => c.flag === flag)?.label ?? '';
}

/**
 * A task's or meeting's links as the dialog edits them. One saved before links existed has only its own contact and lead: those
 * become its first links, so saving it again keeps them.
 */
export function linksOf(a: {
  links?: ActivityLinkDto[] | null;
  contactId?: string | null;
  contactName?: string | null;
  enquiryId?: string | null;
  enquiryReference?: string | null;
}): ActivityLinkDto[] {
  if (a.links?.length) return [...a.links];
  const out: ActivityLinkDto[] = [];
  if (a.contactId) {
    out.push({
      type: ActivityLinkType.Contact,
      recordId: a.contactId,
      label: a.contactName || 'Contact',
    });
  }
  if (a.enquiryId) {
    out.push({
      type: ActivityLinkType.Enquiry,
      recordId: a.enquiryId,
      label: a.enquiryReference || 'Lead',
    });
  }
  return out;
}
