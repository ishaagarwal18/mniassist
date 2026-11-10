import { describe, expect, it } from 'vitest';
import {
  BLANK_ACCOUNT_DRAFT,
  getHierarchyPlacementInfo,
  handleCityChange,
  handleStateChange,
  validateAccountDraft,
} from './account-form.logic';

describe('account-form.logic', () => {
  describe('validateAccountDraft', () => {
    it('returns error when name is blank', () => {
      expect(validateAccountDraft(BLANK_ACCOUNT_DRAFT)).toBe('An account name is required.');
      expect(validateAccountDraft({ ...BLANK_ACCOUNT_DRAFT, name: '   ' })).toBe(
        'An account name is required.',
      );
    });

    it('returns null when valid name is provided', () => {
      expect(
        validateAccountDraft({ ...BLANK_ACCOUNT_DRAFT, name: 'Bharat Heavy Forge Ltd.' }),
      ).toBeNull();
    });

    it('validates name length limit', () => {
      const longName = 'A'.repeat(257);
      expect(validateAccountDraft({ ...BLANK_ACCOUNT_DRAFT, name: longName })).toBe(
        'Account name cannot exceed 256 characters.',
      );
    });
  });

  describe('getHierarchyPlacementInfo', () => {
    it('describes top-level placement when parentId is empty', () => {
      const info = getHierarchyPlacementInfo('');
      expect(info.isTopLevel).toBe(true);
      expect(info.label).toBe('Corporate Group / Holding Entity');
    });

    it('describes subsidiary placement when parentId is specified', () => {
      const info = getHierarchyPlacementInfo('parent-1', 'Tata Motors');
      expect(info.isTopLevel).toBe(false);
      expect(info.label).toBe('Subsidiary under Tata Motors');
    });
  });

  describe('handleStateChange & handleCityChange', () => {
    const CITIES: Record<string, string[]> = {
      Gujarat: ['Ahmedabad', 'Vadodara'],
      Maharashtra: ['Mumbai', 'Pune'],
    };
    const stateForCity = (c: string) =>
      Object.keys(CITIES).find((s) => CITIES[s].includes(c)) ?? null;

    it('updates available cities when state changes and resets invalid city', () => {
      const res = handleStateChange('Gujarat', 'Pune', CITIES['Gujarat']);
      expect(res.state).toBe('Gujarat');
      expect(res.city).toBe('');
      expect(res.availableCities).toContain('Ahmedabad');
      expect(res.availableCities).not.toContain('Pune');
    });

    it('retains city if it belongs to the new state', () => {
      const res = handleStateChange('Maharashtra', 'Pune', CITIES['Maharashtra']);
      expect(res.state).toBe('Maharashtra');
      expect(res.city).toBe('Pune');
      expect(res.availableCities).toContain('Pune');
    });

    it('infers state when a known city is selected without prior state', () => {
      const res = handleCityChange('Vadodara', '', stateForCity);
      expect(res.state).toBe('Gujarat');
      expect(res.city).toBe('Vadodara');
    });

    it('keeps existing state when city is selected', () => {
      const res = handleCityChange('Pune', 'Maharashtra', stateForCity);
      expect(res.state).toBe('Maharashtra');
      expect(res.city).toBe('Pune');
    });
  });
});
