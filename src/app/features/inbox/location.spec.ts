import { describe, expect, it } from 'vitest';

import { locationErrorText, parseCoordinates } from './location';

describe('reading a location an agent typed or pasted', () => {
  it('reads plain coordinates', () => {
    expect(parseCoordinates('18.5204, 73.8567')).toEqual({ latitude: 18.5204, longitude: 73.8567 });
    expect(parseCoordinates('18.5204 73.8567')).toEqual({ latitude: 18.5204, longitude: 73.8567 });
    expect(parseCoordinates('-33.86,151.2')).toEqual({ latitude: -33.86, longitude: 151.2 });
  });

  it('reads Google Maps links, preferring the dropped pin', () => {
    expect(
      parseCoordinates(
        'https://www.google.com/maps/place/Sun+Energy/@18.5,73.8,15z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d18.5204!4d73.8567',
      ),
    ).toEqual({ latitude: 18.5204, longitude: 73.8567 });
    expect(parseCoordinates('https://www.google.com/maps/@19.076,72.8777,12z')).toEqual({
      latitude: 19.076,
      longitude: 72.8777,
    });
    expect(parseCoordinates('https://maps.google.com/?q=19.0760%2C72.8777')).toEqual({
      latitude: 19.076,
      longitude: 72.8777,
    });
    expect(parseCoordinates('geo:12.9716,77.5946')).toEqual({
      latitude: 12.9716,
      longitude: 77.5946,
    });
  });

  it('finds nothing in a short link, an address or impossible numbers', () => {
    expect(parseCoordinates('https://maps.app.goo.gl/AbC123xyz')).toBeNull();
    expect(parseCoordinates('Plot 12, MIDC Bhosari, Pune 411026')).toBeNull();
    expect(parseCoordinates('95, 200')).toBeNull();
    expect(parseCoordinates('')).toBeNull();
  });

  it('says what to do for each way reading the device location fails', () => {
    expect(locationErrorText(1)).toContain('blocked for this site');
    expect(locationErrorText(2)).toContain('Privacy → Location');
    expect(locationErrorText(3)).toContain('took too long');
  });
});
