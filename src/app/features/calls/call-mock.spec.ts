import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { CallOutcome, VoiceCallDirection, VoiceCallMode } from '../../proxy/voice';
import { CallMockStore, MockCallApi } from './call-mock';

const api = () => new MockCallApi(new CallMockStore());

describe('sample-data calling', () => {
  it('starting a call rings, is on the log at once, and is waiting for an outcome only once it ends', async () => {
    const a = api();

    const started = await firstValueFrom(
      a.start({ contactId: 'k1', enquiryId: 'e1', repNumber: '98123 45678' }),
    );

    expect(started.isOver).toBe(false);
    expect(started.mode).toBe(VoiceCallMode.ClickToCall);
    const forDeal = await firstValueFrom(a.getList({ enquiryId: 'e1' }));
    expect(forDeal.items!.map((c) => c.id)).toEqual([started.id]);
    const waiting = await firstValueFrom(a.getList({ needsOutcome: true }));
    expect(waiting.items!.some((c) => c.id === started.id)).toBe(false);
  });

  it('refuses to start without a number to ring, and takes one typed and saves it when asked', async () => {
    const store = new CallMockStore();
    store.myNumber = null;
    const a = new MockCallApi(store);

    await expect(firstValueFrom(a.start({ contactId: 'k1' }))).rejects.toMatchObject({
      error: { error: { code: 'AutoReach:CallNeedsRepNumber' } },
    });

    await firstValueFrom(a.start({ contactId: 'k1', repNumber: '9811122233', saveNumber: true }));
    expect(store.myNumber).toBe('919811122233');
  });

  it('a seeded call with no outcome is on the follow-up list until the rep answers', async () => {
    const a = api();
    const before = await firstValueFrom(a.getList({ needsOutcome: true }));
    const target = before.items![0];
    expect(target).toBeTruthy();

    const updated = await firstValueFrom(
      a.setOutcome(target.id, { outcome: CallOutcome.NotInterested, notes: '  no budget  ' }),
    );

    expect(updated.outcome).toBe(CallOutcome.NotInterested);
    expect(updated.notes).toBe('no budget');
    const after = await firstValueFrom(a.getList({ needsOutcome: true }));
    expect(after.items!.some((c) => c.id === target.id)).toBe(false);
  });

  it('a call written up afterwards is already over, and one from the future is refused', async () => {
    const a = api();
    const when = new Date(Date.now() - 3_600_000).toISOString();

    const logged = await firstValueFrom(
      a.logManual({
        contactId: 'k1',
        direction: VoiceCallDirection.Inbound,
        startedAtUtc: when,
        durationSeconds: 240,
        outcome: CallOutcome.Connected,
        notes: 'Asked about lead time.',
      }),
    );

    expect(logged.isOver).toBe(true);
    expect(logged.mode).toBe(VoiceCallMode.Manual);
    expect(logged.outcome).toBe(CallOutcome.Connected);
    await expect(
      firstValueFrom(
        a.logManual({
          contactId: 'k1',
          direction: VoiceCallDirection.Outbound,
          startedAtUtc: new Date(Date.now() + 3 * 3_600_000).toISOString(),
          durationSeconds: 5,
          outcome: CallOutcome.Connected,
        }),
      ),
    ).rejects.toMatchObject({ error: { error: { code: 'AutoReach:CallStartedInFuture' } } });
  });

  it('the log is newest first and pages', async () => {
    const a = api();
    const all = await firstValueFrom(a.getList({}));
    const starts = all.items!.map((c) => Date.parse(c.startedAtUtc ?? c.creationTime));
    expect([...starts].sort((x, y) => y - x)).toEqual(starts);

    const page = await firstValueFrom(a.getList({ maxResultCount: 1, skipCount: 1 }));
    expect(page.items!).toHaveLength(1);
    expect(page.totalCount).toBe(all.totalCount);
  });
});
