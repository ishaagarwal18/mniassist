import { insertMention, matchPeople, mentionQuery, mentionedIds } from './note-mentions';
import { replyDraftProblems, toShortcut, variablesIn } from './canned-replies';

const people = [
  { userId: 'a', name: 'Anita Rao' },
  { userId: 'b', name: 'Ravi Kumar' },
  { userId: 'c', name: 'Suresh Patil' },
];

describe('note mentions', () => {
  it('finds the word after an @ at the caret', () => {
    expect(mentionQuery('Ask @Rav', 8)).toEqual({ start: 4, query: 'Rav' });
    expect(mentionQuery('mail a@b', 8)).toBeNull();
    expect(mentionQuery('@Anita\nthen', 11)).toBeNull();
  });

  it('ranks names that start with the query first', () => {
    expect(matchPeople(people, 'ra').map((p) => p.userId)).toEqual(['b', 'a']);
    expect(matchPeople(people, 'zz')).toEqual([]);
  });

  it('writes the name in and mentions only people still named', () => {
    const r = insertMention('Ask @Rav please', 4, 8, people[1]);
    expect(r.text).toBe('Ask @Ravi Kumar  please');
    expect(mentionedIds(r.text, [people[1], people[0]])).toEqual(['b']);
  });
});

describe('canned replies', () => {
  it('makes shortcuts the API accepts', () => {
    expect(toShortcut('Spares Price List!')).toBe('spares-price-list');
  });

  it('lists the variables a reply fills in', () => {
    expect(variablesIn('Hi {{customer_name}}, {{ machine }} and {{customer_name}}')).toEqual([
      'customer_name',
      'machine',
    ]);
  });

  it('refuses a bad or taken shortcut', () => {
    const d = { shortcut: 'Price', title: 'x', body: 'y', folder: '' };
    expect(replyDraftProblems(d, [])).toHaveProperty('shortcut');
    const ok = { ...d, shortcut: 'price' };
    expect(replyDraftProblems(ok, [{ id: '1', shortcut: 'price' }])).toHaveProperty('shortcut');
    expect(replyDraftProblems({ ...ok, id: '1' }, [{ id: '1', shortcut: 'price' }])).toEqual({});
  });
});
