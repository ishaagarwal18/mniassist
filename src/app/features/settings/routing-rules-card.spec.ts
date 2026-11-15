import { moveItem, ruleSummary } from './routing-rules-card';

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
