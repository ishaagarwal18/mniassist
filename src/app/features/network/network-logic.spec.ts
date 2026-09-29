import {
  describeTerritory,
  leadTone,
  parseList,
  parsePins,
  place,
  timeLeft,
} from './network-logic';

describe('network logic', () => {
  it('splits lists on commas, semicolons and lines, without repeats', () => {
    expect(parseList('Maharashtra, goa\nMAHARASHTRA;  Madhya   Pradesh ,')).toEqual([
      'Maharashtra',
      'goa',
      'Madhya Pradesh',
    ]);
  });

  it('keeps only PIN prefixes of 1 to 6 digits and reports the rest', () => {
    expect(parsePins('4110, 411 04, 41A, 1234567')).toEqual({
      pins: ['4110', '41104'],
      bad: ['41A', '1234567'],
    });
  });

  it('describes a territory in plain words', () => {
    expect(
      describeTerritory({
        states: ['MAHARASHTRA'],
        cities: ['PUNE'],
        pinPrefixes: ['4110'],
        productLines: ['DRIVES'],
      }),
    ).toBe('PIN 4110… · Pune · Maharashtra · Drives only');
    expect(describeTerritory({ states: [], cities: [], pinPrefixes: [], productLines: [] })).toBe(
      'No territory yet',
    );
  });

  it('says how long a dealer has left to answer', () => {
    const now = Date.parse('2026-09-29T10:00:00Z');
    expect(timeLeft('2026-09-29T10:30:00Z', now)).toBe('30 min left');
    expect(timeLeft('2026-09-29T15:00:00Z', now)).toBe('5 h left');
    expect(timeLeft('2026-10-02T10:00:00Z', now)).toBe('3 days left');
    expect(timeLeft('2026-09-29T09:00:00Z', now)).toBe('time up');
    expect(timeLeft(null, now)).toBe('');
  });

  it('tones lead states and formats places', () => {
    expect(leadTone('Unrouted')).toBe('amber');
    expect(leadTone('Won')).toBe('good');
    expect(place('411045', 'Pune', 'Maharashtra')).toBe('411045 Pune, Maharashtra');
    expect(place(null, null, null)).toBe('Location not given');
  });
});
