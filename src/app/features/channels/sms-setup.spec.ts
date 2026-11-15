import { rupeesToPaise } from '../billing/auto-top-up-card';
import { countDltVariables } from './sms-setup';

describe('countDltVariables', () => {
  it('counts each {#var#} placeholder', () => {
    expect(countDltVariables('Dear {#var#}, order {#var#} is ready.')).toBe(2);
  });

  it('ignores case and finds none in plain text', () => {
    expect(countDltVariables('Hi {#VAR#}')).toBe(1);
    expect(countDltVariables('No variables here')).toBe(0);
  });
});

describe('rupeesToPaise', () => {
  it('converts rupees, with or without commas', () => {
    expect(rupeesToPaise('1,500')).toBe(150_000);
    expect(rupeesToPaise(99.5)).toBe(9_950);
  });

  it('treats negatives and junk as zero', () => {
    expect(rupeesToPaise('-10')).toBe(0);
    expect(rupeesToPaise('abc')).toBe(0);
  });
});
