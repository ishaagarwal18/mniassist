import { responseFields } from './flow-responses';

describe('responseFields', () => {
  it('lists answers and drops the flow token', () => {
    expect(responseFields('{"flow_token":"x","part_number":"6ES7","qty":4}')).toEqual([
      { key: 'part number', value: '6ES7' },
      { key: 'qty', value: '4' },
    ]);
  });

  it('shows anything else as one raw answer', () => {
    expect(responseFields('not json')).toEqual([{ key: 'Answer', value: 'not json' }]);
    expect(responseFields('[1,2]')).toEqual([{ key: 'Answer', value: '[1,2]' }]);
  });

  it('is empty without a payload', () => {
    expect(responseFields(null)).toEqual([]);
  });
});
