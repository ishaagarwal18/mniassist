import { describe, expect, it } from 'vitest';
import { compactCount, segmentIcon, suppressionIcon } from './contacts-segments.logic';

describe('contacts segments collapsed logic', () => {
  describe('compactCount', () => {
    it('returns exact count as string for numbers < 1000', () => {
      expect(compactCount(0)).toBe('0');
      expect(compactCount(42)).toBe('42');
      expect(compactCount(284)).toBe('284');
      expect(compactCount(999)).toBe('999');
    });

    it('formats thousands with k suffix and 1 decimal place when needed', () => {
      expect(compactCount(1000)).toBe('1k');
      expect(compactCount(1347)).toBe('1.3k');
      expect(compactCount(12486)).toBe('12.5k');
      expect(compactCount(99990)).toBe('100k');
    });

    it('formats millions with M suffix', () => {
      expect(compactCount(1_000_000)).toBe('1M');
      expect(compactCount(2_540_000)).toBe('2.5M');
    });
  });

  describe('segmentIcon', () => {
    it('returns contacts icon for all-contacts segment', () => {
      expect(segmentIcon({ id: 'all', name: 'All contacts' })).toBe('contacts');
    });

    it('returns clock icon for AMC expiration segments', () => {
      expect(segmentIcon({ id: 'amc60', name: 'AMC expiring ≤ 60 days' })).toBe('clock');
      expect(segmentIcon({ id: 'custom', name: 'Expired warranty' })).toBe('clock');
    });

    it('returns quotation icon for quotation segments', () => {
      expect(segmentIcon({ id: 'quoted', name: 'Quoted, no reply 7d' })).toBe('quotation');
      expect(segmentIcon({ id: 'quote-pending', name: 'Pending quote' })).toBe('quotation');
    });

    it('returns channel icon for dealer segments', () => {
      expect(segmentIcon({ id: 'dealers', name: 'Authorized Dealers' })).toBe('channel');
    });

    it('returns sparkle icon for expo/lead segments', () => {
      expect(segmentIcon({ id: 'expo', name: 'Exhibition Leads' })).toBe('sparkle');
    });

    it('defaults to segment icon for custom segments', () => {
      expect(segmentIcon({ id: 'vip', name: 'High Value Customers' })).toBe('segment');
    });
  });

  describe('suppressionIcon', () => {
    it('returns close icon for optout and stop', () => {
      expect(suppressionIcon({ id: 'optout' })).toBe('close');
      expect(suppressionIcon({ id: 'stop_request' })).toBe('close');
    });

    it('returns alert icon for invalid numbers', () => {
      expect(suppressionIcon({ id: 'invalid' })).toBe('alert');
    });

    it('returns shield icon for blocked or generic suppression', () => {
      expect(suppressionIcon({ id: 'blocked' })).toBe('shield');
      expect(suppressionIcon({ id: 'dnc' })).toBe('shield');
    });
  });
});
