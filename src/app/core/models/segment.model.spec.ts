import {
  SegmentGroup,
  addClauseAt,
  addGroupAt,
  removeNodeAt,
  ruleFromJson,
  ruleToJson,
  setGroupModeAt,
  updateClauseAt,
  audienceToJson,
  audienceFromJson,
} from './segment.model';

describe('segment rule ↔ ruleJson', () => {
  it('serialises an empty group to {} — the server reads that as "everyone"', () => {
    expect(ruleToJson({ mode: 'all', children: [] })).toBe('{}');
  });

  it('serialises a flat AND group by connective key', () => {
    const rule: SegmentGroup = {
      mode: 'all',
      children: [
        { field: 'tag', op: 'eq', value: 'amc' },
        { field: 'state', op: 'eq', value: 'Gujarat' },
      ],
    };
    expect(JSON.parse(ruleToJson(rule))).toEqual({
      all: [
        { field: 'tag', op: 'eq', value: 'amc' },
        { field: 'state', op: 'eq', value: 'Gujarat' },
      ],
    });
  });

  it('serialises a nested any-group as a child object', () => {
    const rule: SegmentGroup = {
      mode: 'all',
      children: [
        { field: 'tag', op: 'eq', value: 'amc' },
        {
          mode: 'any',
          children: [
            { field: 'quotationState', op: 'eq', value: 'Expired' },
            { field: 'campaignResponse', op: 'lte', value: 'Delivered' },
          ],
        },
      ],
    };
    expect(JSON.parse(ruleToJson(rule))).toEqual({
      all: [
        { field: 'tag', op: 'eq', value: 'amc' },
        {
          any: [
            { field: 'quotationState', op: 'eq', value: 'Expired' },
            { field: 'campaignResponse', op: 'lte', value: 'Delivered' },
          ],
        },
      ],
    });
  });

  it('emits values[] rather than value for an in-clause', () => {
    const rule: SegmentGroup = {
      mode: 'all',
      children: [{ field: 'state', op: 'in', values: ['Gujarat', 'Maharashtra'] }],
    };
    expect(JSON.parse(ruleToJson(rule))).toEqual({
      all: [{ field: 'state', op: 'in', values: ['Gujarat', 'Maharashtra'] }],
    });
  });

  it('round-trips a nested rule through JSON unchanged', () => {
    const rule: SegmentGroup = {
      mode: 'all',
      children: [
        { field: 'tag', op: 'eq', value: 'amc' },
        {
          mode: 'any',
          children: [
            { field: 'quotationState', op: 'eq', value: 'Expired' },
            { mode: 'not', children: [{ field: 'campaignsReceived', op: 'gte', value: '4' }] },
          ],
        },
      ],
    };
    expect(ruleFromJson(ruleToJson(rule))).toEqual(rule);
  });

  it('opens a broken or empty rule as a fresh AND group instead of throwing', () => {
    expect(ruleFromJson('not json at all')).toEqual({ mode: 'all', children: [] });
    expect(ruleFromJson('')).toEqual({ mode: 'all', children: [] });
    expect(ruleFromJson(null)).toEqual({ mode: 'all', children: [] });
    expect(ruleFromJson('{}')).toEqual({ mode: 'all', children: [] });
  });

  it('folds a sibling not[] on the server shape into an explicit exclusion group', () => {
    const parsed = ruleFromJson(
      JSON.stringify({
        all: [{ field: 'tag', op: 'eq', value: 'amc' }],
        not: [{ field: 'campaignsReceived', op: 'gte', value: '4' }],
      }),
    );
    expect(parsed).toEqual({
      mode: 'all',
      children: [
        { field: 'tag', op: 'eq', value: 'amc' },
        { mode: 'not', children: [{ field: 'campaignsReceived', op: 'gte', value: '4' }] },
      ],
    });
  });

  it('defaults a clause with no op to eq and a missing value to empty string', () => {
    const parsed = ruleFromJson(JSON.stringify({ all: [{ field: 'city' }] }));
    expect(parsed).toEqual({ mode: 'all', children: [{ field: 'city', op: 'eq', value: '' }] });
  });
});

describe('immutable tree edits', () => {
  const base: SegmentGroup = {
    mode: 'all',
    children: [{ field: 'city', op: 'eq', value: 'Pune' }],
  };

  it('addClauseAt appends without mutating the original', () => {
    const next = addClauseAt(base, []);
    expect(next.children).toHaveLength(2);
    expect(base.children).toHaveLength(1);
    expect(next).not.toBe(base);
  });

  it('addGroupAt nests a group seeded with one clause', () => {
    const next = addGroupAt(base, [], 'any');
    expect(next.children[1]).toEqual({
      mode: 'any',
      children: [{ field: 'city', op: 'eq', value: '' }],
    });
  });

  it('updateClauseAt patches one child in place by index', () => {
    const next = updateClauseAt(base, [], 0, { value: 'Mumbai' });
    expect(next.children[0]).toEqual({ field: 'city', op: 'eq', value: 'Mumbai' });
  });

  it('removeNodeAt drops the child at the index', () => {
    expect(removeNodeAt(base, [], 0).children).toHaveLength(0);
  });

  it('setGroupModeAt reaches a nested group by path', () => {
    const nested: SegmentGroup = {
      mode: 'all',
      children: [base, { mode: 'any', children: [] }],
    };
    const next = setGroupModeAt(nested, [1], 'not');
    expect((next.children[1] as SegmentGroup).mode).toBe('not');
    expect((next.children[0] as SegmentGroup).mode).toBe('all');
  });
});

describe('audience with hand-picked people', () => {
  const people = [
    { id: '11111111-1111-1111-1111-111111111111', label: 'Asha Rao — Meridian Foods' },
    { id: '22222222-2222-2222-2222-222222222222', label: 'Vikram Pawar' },
  ];
  const rule = {
    mode: 'all' as const,
    children: [{ field: 'city', op: 'eq' as const, value: 'Pune' }],
  };

  it('stores just the people when there is no rule', () => {
    const json = audienceToJson({ mode: 'all', children: [] }, people);
    expect(JSON.parse(json)).toEqual({
      all: [
        {
          field: 'contact',
          op: 'in',
          values: people.map((p) => p.id),
          labels: people.map((p) => p.label),
        },
      ],
    });
    expect(audienceFromJson(json)).toEqual({ rule: { mode: 'all', children: [] }, picked: people });
  });

  it('stores the people OR the rule, and reads both back', () => {
    const json = audienceToJson(rule, people);
    expect(Object.keys(JSON.parse(json))).toEqual(['any']);
    const back = audienceFromJson(json);
    expect(back.picked).toEqual(people);
    expect(back.rule).toEqual(rule);
  });

  it('leaves a rule without people as it was', () => {
    expect(audienceToJson(rule, [])).toBe(ruleToJson(rule));
    expect(audienceFromJson(ruleToJson(rule))).toEqual({ rule, picked: [] });
  });
});
