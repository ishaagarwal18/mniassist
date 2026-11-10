import { computed } from '@angular/core';
import { afterEach, describe, expect, it } from 'vitest';

import { optionName, optionNames, setOptionNames, withOptionNames } from './option-names';

describe('option names from the database', () => {
  afterEach(() => setOptionNames(new Map()));

  const LABEL = optionNames<number>('ticket.status', { 0: 'Open', 1: 'Pending' });
  const OPTIONS = withOptionNames('ticket.status', [
    { value: 0, label: 'Open' },
    { value: 1, label: 'Pending' },
  ]);

  it('uses the built-in names until the lists arrive', () => {
    expect(LABEL[0]).toBe('Open');
    expect(OPTIONS.map((o) => o.label)).toEqual(['Open', 'Pending']);
    expect(optionName('ticket.status', 7, 'Fallback')).toBe('Fallback');
  });

  it('shows the workspace’s own names once loaded, and updates what reads them', () => {
    const shown = computed(() => `${LABEL[0]} / ${OPTIONS[1].label}`);
    expect(shown()).toBe('Open / Pending');

    setOptionNames(
      new Map([
        [
          'ticket.status',
          new Map([
            ['0', 'New'],
            ['1', 'Waiting on customer'],
          ]),
        ],
      ]),
    );
    expect(shown()).toBe('New / Waiting on customer');
    expect(Object.keys(LABEL)).toEqual(['0', '1']);
  });

  it('keeps the built-in name for an option the database does not name', () => {
    setOptionNames(new Map([['ticket.status', new Map([['0', 'New']])]]));
    expect(LABEL[1]).toBe('Pending');
  });
});
