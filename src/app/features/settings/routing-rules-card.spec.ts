import {
  draftToRuleInput,
  moveItem,
  ruleDraftProblems,
  ruleSummary,
  ruleToDraft,
} from './routing-rules-card';

describe('moveItem', () => {
  it('swaps with the neighbour', () => {
    expect(moveItem(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b']);
  });

  it('leaves the list alone at the ends', () => {
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
  });
});

describe('ruleSummary', () => {
  it('names what the rule matches', () => {
    expect(ruleSummary({ keywords: 'quote', attributeKey: 'city', attributeValue: 'Pune' })).toBe(
      'message mentions “quote” and city is Pune',
    );
  });

  it('says every conversation when nothing narrows it', () => {
    expect(ruleSummary({})).toBe('every new conversation');
  });
});

describe('routing rule editor', () => {
  it('round-trips a rule through the form', () => {
    const d = ruleToDraft(
      {
        id: 'r',
        name: 'Pune',
        priority: 20,
        isEnabled: true,
        assignToTeamId: 't1',
        contactRole: 2,
      },
      0,
    );
    expect(d.assignTo).toBe('team:t1');
    expect(d.contactRole).toBe('2');
    const input = draftToRuleInput(d);
    expect(input.assignToTeamId).toBe('t1');
    expect(input.assignToUserId).toBeNull();
    expect(input.contactRole).toBe(2);
    expect(input.priority).toBe(20);
  });

  it('needs a name and someone to assign to', () => {
    const blank = ruleToDraft(null, 10);
    expect(ruleDraftProblems(blank)).toHaveProperty('name');
    expect(ruleDraftProblems(blank)).toHaveProperty('assignTo');
    expect(ruleDraftProblems({ ...blank, name: 'All', assignTo: 'user:u1' })).toEqual({});
  });

  it('tidies keywords and drops a detail value with no key', () => {
    const d = {
      ...ruleToDraft(null, 10),
      name: 'x',
      assignTo: 'user:u',
      keywords: ' spares ,, quote ',
    };
    expect(draftToRuleInput(d).keywords).toBe('spares, quote');
    expect(ruleDraftProblems({ ...d, attributeValue: 'Pune' })).toHaveProperty('attributeKey');
  });

  it('says when a rule matches on the contact role', () => {
    expect(ruleSummary({ contactRole: 2 })).toMatch(/contact is purchase/);
  });
});
