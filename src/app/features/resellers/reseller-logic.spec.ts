import { describe, expect, it } from 'vitest';

import {
  formatBps,
  formatPaise,
  isHexColour,
  isValidDomain,
  percentToBps,
  registrationProblem,
  rupeesToPaise,
} from './reseller-logic';

describe('reseller logic', () => {
  it('formats paise as rupees and basis points as percentages', () => {
    expect(formatPaise(249900)).toBe('₹2,499.00');
    expect(formatPaise(undefined)).toBe('₹0.00');
    expect(formatBps(2000)).toBe('20%');
    expect(formatBps(1250)).toBe('12.5%');
  });

  it('reads typed rupee amounts and percentages', () => {
    expect(rupeesToPaise('₹1,250.50')).toBe(125050);
    expect(rupeesToPaise('0')).toBeNull();
    expect(rupeesToPaise('12.345')).toBeNull();
    expect(rupeesToPaise('abc')).toBeNull();
    expect(percentToBps('20')).toBe(2000);
    expect(percentToBps('12.5%')).toBe(1250);
    expect(percentToBps('101')).toBeNull();
  });

  it('checks a partner registration', () => {
    const ok = {
      partnerCode: 'AGENCY-01',
      companyName: 'CloudReach Digital',
      contactName: 'Alex Hunter',
      contactEmail: 'alex@cloudreach.io',
      contactPhone: '+919876543210',
    };
    expect(registrationProblem(ok)).toBeNull();
    expect(registrationProblem({ ...ok, partnerCode: 'a b' })).toContain('partner code');
    expect(registrationProblem({ ...ok, contactEmail: 'alex' })).toContain('email');
    expect(registrationProblem({ ...ok, contactPhone: ' ' })).toContain('phone');
  });

  it('checks domains and colours', () => {
    expect(isValidDomain('portal.brandpulse.net')).toBe(true);
    expect(isValidDomain('https://brandpulse.net')).toBe(false);
    expect(isValidDomain('localhost')).toBe(false);
    // A CNAME cannot sit on a bare domain, so it takes a sub-domain.
    expect(isValidDomain('brandpulse.net')).toBe(false);
    expect(isValidDomain('app.brandpulse.co.in')).toBe(true);
    expect(isValidDomain('-bad.brandpulse.net')).toBe(false);
    expect(isHexColour('#10B981')).toBe(true);
    expect(isHexColour('10B981')).toBe(false);
  });
});
