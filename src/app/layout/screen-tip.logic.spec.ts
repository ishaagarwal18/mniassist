import { HelpTopic } from '../core/help/help-topics';
import { tipFor } from './screen-tip.logic';

const topic: HelpTopic = {
  benefits: [],
  steps: ['Press New quotation.', 'Choose the customer.', 'Add the items.', 'Send it.'],
};
const fresh = { off: false, seen: [] };

describe('first-visit screen tips', () => {
  it('shows the summary and the first three steps on a first visit', () => {
    const tip = tipFor('quotations', topic, 'Price and send quotations.', fresh);
    expect(tip?.summary).toBe('Price and send quotations.');
    expect(tip?.steps).toEqual(['Press New quotation.', 'Choose the customer.', 'Add the items.']);
  });

  it('does not show again once seen, on any screen sharing that help', () => {
    const seen = { off: false, seen: ['Press New quotation.'] };
    expect(tipFor('quotations', topic, null, seen)).toBeNull();
    expect(tipFor('quotations/new', topic, null, seen)).toBeNull();
  });

  it('stays quiet when switched off, without help, or on screens with their own guidance', () => {
    expect(tipFor('quotations', topic, null, { off: true, seen: [] })).toBeNull();
    expect(tipFor('quotations', null, null, fresh)).toBeNull();
    expect(tipFor('quotations', { benefits: [], steps: [] }, null, fresh)).toBeNull();
    expect(tipFor('getting-started', topic, null, fresh)).toBeNull();
    expect(tipFor(null, topic, null, fresh)).toBeNull();
  });
});
