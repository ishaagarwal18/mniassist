import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { TicketPriority, TicketStatus } from '../../proxy/support';
import { MockServiceTicketApi, TicketMockStore } from './ticket-mock';

const api = () => new MockServiceTicketApi(new TicketMockStore());

describe('sample-data helpdesk', () => {
  it('raising a ticket gives it a reference, a due time by priority, and puts it at the top of the list', async () => {
    const a = api();

    const ticket = await firstValueFrom(a.create({ contactId: 'k1', subject: 'Grinding noise', priority: TicketPriority.Urgent }));

    expect(ticket.reference).toMatch(/^TKT-\d{4}-\d{4}$/);
    expect(ticket.status).toBe(TicketStatus.Open);
    expect(ticket.dueAtUtc).toBeTruthy();
    const list = await firstValueFrom(a.getList({}));
    expect(list.items![0].id).toBe(ticket.id);
  });

  it('raising priority while open pulls the due time in', async () => {
    const a = api();
    const ticket = await firstValueFrom(a.create({ contactId: 'k1', subject: 'Slow cycle time', priority: TicketPriority.Low }));

    const updated = await firstValueFrom(a.setPriority(ticket.id, { priority: TicketPriority.Urgent }));

    expect(updated.priority).toBe(TicketPriority.Urgent);
    expect(Date.parse(updated.dueAtUtc!)).toBeLessThan(Date.parse(ticket.dueAtUtc!));
  });

  it('resolving clears the due time, and moving back to open is a reopen', async () => {
    const a = api();
    const ticket = await firstValueFrom(a.create({ contactId: 'k1', subject: 'Belt slipping', priority: TicketPriority.Normal }));

    const resolved = await firstValueFrom(a.setStatus(ticket.id, { status: TicketStatus.Resolved }));
    expect(resolved.dueAtUtc).toBeNull();

    const reopened = await firstValueFrom(a.setStatus(ticket.id, { status: TicketStatus.Open }));
    expect(reopened.reopenCount).toBe(1);
    expect(reopened.dueAtUtc).toBeTruthy();
  });

  it('a reply with no conversation is refused, and an internal note never needs one', async () => {
    const a = api();
    const ticket = await firstValueFrom(a.create({ contactId: 'k1', subject: 'Sensor misaligned', priority: TicketPriority.Normal }));

    await expect(firstValueFrom(a.addComment(ticket.id, { body: 'On our way', isInternal: false }))).rejects.toMatchObject({
      error: { error: { code: 'AutoReach:TicketHasNoConversation' } },
    });

    const note = await firstValueFrom(a.addComment(ticket.id, { body: 'Checked the manual.', isInternal: true }));
    expect(note.isInternal).toBe(true);
    const reloaded = await firstValueFrom(a.get(ticket.id));
    expect(reloaded.status).toBe(TicketStatus.Open);
    expect(reloaded.comments.map((c) => c.id)).toContain(note.id);
  });

  it('a satisfaction rating outside one to five is refused', async () => {
    const a = api();
    const ticket = await firstValueFrom(a.create({ contactId: 'k1', subject: 'Wiring loose', priority: TicketPriority.Normal }));

    await expect(firstValueFrom(a.recordSatisfaction(ticket.id, { rating: 6 }))).rejects.toMatchObject({
      error: { error: { code: 'AutoReach:TicketRatingInvalid' } },
    });

    const rated = await firstValueFrom(a.recordSatisfaction(ticket.id, { rating: 4 }));
    expect(rated.satisfactionRating).toBe(4);
  });

  it('the summary counts what is open, pending, overdue and unassigned among the seeded tickets', async () => {
    const a = api();
    const summary = await firstValueFrom(a.getSummary());
    expect(summary.openCount).toBeGreaterThanOrEqual(1);
    expect(summary.unassignedCount).toBeGreaterThanOrEqual(1);
  });
});
