import { describe, expect, it } from 'vitest';

import { cleanAddress, cleanCin } from './company-details';

describe('cleanCin', () => {
  it('accepts a valid CIN, tidying case and spaces', () => {
    expect(cleanCin('u72900 mh2015 ptc123456')).toBe('U72900MH2015PTC123456');
  });

  it('hides a blank or malformed CIN', () => {
    expect(cleanCin('')).toBeNull();
    expect(cleanCin(undefined)).toBeNull();
    expect(cleanCin('U72900MH2015PTC12345')).toBeNull();
    expect(cleanCin('X72900MH2015PTC123456')).toBeNull();
  });
});

describe('cleanAddress', () => {
  it('joins a multi-line address on one line', () => {
    expect(cleanAddress('  Plot 12,\n  MIDC Bhosari,\n Pune 411026 ')).toBe(
      'Plot 12, MIDC Bhosari, Pune 411026',
    );
  });

  it('hides a blank address', () => {
    expect(cleanAddress('   ')).toBeNull();
  });
});
