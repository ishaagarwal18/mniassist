import { describe, expect, it } from 'vitest';
import { isPlatformHost, isResellerBrand } from './host-brand.store';

describe('host brand', () => {
  it('treats the platform’s own hosts and local development as the platform', () => {
    const base = 'https://mniassist.com';
    expect(isPlatformHost('mniassist.com', base)).toBe(true);
    expect(isPlatformHost('www.mniassist.com', base)).toBe(true);
    expect(isPlatformHost('staging.mniassist.com', base)).toBe(true);
    expect(isPlatformHost('localhost', base)).toBe(true);
    expect(isPlatformHost('127.0.0.1', base)).toBe(true);
    expect(isPlatformHost('', base)).toBe(true);
  });

  it('treats any other host as a possible reseller domain', () => {
    const base = 'https://mniassist.com';
    expect(isPlatformHost('portal.brandpulse.net', base)).toBe(false);
    // Not a sub-domain of the platform, only a look-alike.
    expect(isPlatformHost('evilmniassist.com', base)).toBe(false);
  });

  it('takes a brand as a reseller’s only when the API named one', () => {
    const brand = {
      primaryColorHex: '#1769FF',
      secondaryColorHex: '#0F172A',
      hidePlatformBranding: false,
    };
    expect(isResellerBrand({ ...brand, brandName: 'BrandPulse' })).toBe(true);
    expect(isResellerBrand({ ...brand, brandName: 'AutoReach' })).toBe(false);
    expect(isResellerBrand({ ...brand, brandName: '' })).toBe(false);
    expect(isResellerBrand(null)).toBe(false);
  });
});
