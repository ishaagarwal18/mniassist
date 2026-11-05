import { describe, expect, it } from 'vitest';
import { ActivityLinkType, ReminderChannels } from '../../proxy/activities';
import {
  MAX_LINKS,
  addLink,
  hasChannel,
  linksOf,
  linkRoute,
  removeLink,
  toLinkInputs,
  toggleChannel,
} from './activity-links.logic';

const contact = { type: ActivityLinkType.Contact, recordId: 'c-1', label: 'Meera Joshi — Deccan' };
const order = {
  type: ActivityLinkType.SalesOrder,
  recordId: 'so-1',
  label: 'SO-0042 · Meera Joshi',
};

describe('activity-links.logic', () => {
  it('adds a link once, and removes it', () => {
    const one = addLink([], contact);
    expect(addLink(one, { ...contact })).toBe(one);
    expect(addLink(one, order)).toHaveLength(2);
    expect(removeLink([contact, order], contact)).toEqual([order]);
  });

  it('stops at the limit', () => {
    const full = Array.from({ length: MAX_LINKS }, (_, i) => ({ ...contact, recordId: `c-${i}` }));
    expect(addLink(full, order)).toBe(full);
  });

  it('sends only type and id', () => {
    expect(toLinkInputs([order])).toEqual([
      { type: ActivityLinkType.SalesOrder, recordId: 'so-1' },
    ]);
  });

  it('opens a record page, or the list searched by its number', () => {
    expect(linkRoute(contact)).toEqual({ path: '/contacts/c-1/360' });
    expect(linkRoute(order)).toEqual({ path: '/sales/orders', query: { q: 'SO-0042' } });
  });

  it('turns channels on and off as flags', () => {
    let set = toggleChannel(ReminderChannels.None, ReminderChannels.Email, true);
    set = toggleChannel(set, ReminderChannels.Sms, true);
    expect(hasChannel(set, ReminderChannels.Email)).toBe(true);
    expect(hasChannel(set, ReminderChannels.WhatsApp)).toBe(false);
    set = toggleChannel(set, ReminderChannels.Email, false);
    expect(set).toBe(ReminderChannels.Sms);
  });
});

describe('linksOf', () => {
  it('keeps saved links, or makes them from the old contact and lead', () => {
    expect(linksOf({ links: [order] })).toEqual([order]);
    expect(
      linksOf({
        contactId: 'c-9',
        contactName: 'Ravi',
        enquiryId: 'e-1',
        enquiryReference: 'ENQ-7',
      }),
    ).toEqual([
      { type: ActivityLinkType.Contact, recordId: 'c-9', label: 'Ravi' },
      { type: ActivityLinkType.Enquiry, recordId: 'e-1', label: 'ENQ-7' },
    ]);
    expect(linksOf({})).toEqual([]);
  });
});
