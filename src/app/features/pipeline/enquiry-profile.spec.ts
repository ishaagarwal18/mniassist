import { PROFILE_FIELDS, profileFilled, profileInput } from './enquiry-profile';

describe('enquiry RFQ profile', () => {
  it('has the eight attribute fields; the ninth is the expected order date', () => {
    expect(PROFILE_FIELDS.map((f) => f.key)).toEqual([
      'application',
      'industry',
      'machine_process',
      'io_count',
      'comm_protocol',
      'brand_preference',
      'budget_band',
      'site_location',
    ]);
    expect(profileFilled({ application: 'Palletiser', io_count: '32' }, '2026-12-15')).toBe(3);
  });

  it('sends every key, empty for a cleared one, and catches a bad I/O count', () => {
    const input = profileInput({ application: ' Palletiser ', io_count: '1,200' }) as Record<
      string,
      string
    >;
    expect(input['application']).toBe('Palletiser');
    expect(input['io_count']).toBe('1,200');
    expect(input['site_location']).toBe('');
    expect(profileInput({ io_count: 'lots' })).toContain('whole number');
  });
});
