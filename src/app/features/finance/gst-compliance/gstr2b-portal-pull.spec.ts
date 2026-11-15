import { describe, expect, it } from 'vitest';
import { otpProblem, portalUsernameProblem } from './gstr2b-portal-pull';

describe('GST portal sign-in checks', () => {
  it('wants the portal user name, not the GSTIN', () => {
    expect(portalUsernameProblem('acme_gst')).toBe(null);
    expect(portalUsernameProblem('27AAPFU0939F1ZV')).toContain('GSTIN');
    expect(portalUsernameProblem('a')).not.toBe(null);
    expect(portalUsernameProblem('acme gst')).not.toBe(null);
  });

  it('wants a six-digit OTP', () => {
    expect(otpProblem('123456')).toBe(null);
    expect(otpProblem('12345')).not.toBe(null);
    expect(otpProblem('12a456')).not.toBe(null);
  });
});
