import { groupAttachmentRows } from './mapping';
import type { Message } from '../models/conversation.model';

const msg = (id: string, providerId?: string): Message => ({
  id,
  direction: 'in',
  body: id,
  at: '10:00',
  providerId,
});

describe('groupAttachmentRows', () => {
  it('folds mid#n rows under their message in order', () => {
    const out = groupAttachmentRows([
      msg('a', 'm1'),
      msg('c', 'm1#3'),
      msg('b', 'm1#2'),
      msg('d', 'm2'),
    ]);
    expect(out.map((m) => m.id)).toEqual(['a', 'd']);
    expect(out[0].extras?.map((m) => m.id)).toEqual(['b', 'c']);
  });

  it('keeps an extra row whose message is not loaded', () => {
    const out = groupAttachmentRows([msg('b', 'gone#2'), msg('d', 'm2')]);
    expect(out.map((m) => m.id)).toEqual(['b', 'd']);
  });

  it('leaves messages without provider ids alone', () => {
    const rows = [msg('a'), msg('b')];
    expect(groupAttachmentRows(rows)).toEqual(rows);
  });
});
