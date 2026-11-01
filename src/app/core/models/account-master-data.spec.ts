import { beforeEach, describe, expect, it } from 'vitest';
import {
  addCustomCity,
  addCustomIndustry,
  getAllMasterCities,
  getCitiesForState,
  getCustomCities,
  getCustomIndustries,
  getMasterIndustries,
  getMasterStateNames,
  getStateForCity,
  resetCustomMasterData,
  MASTER_INDUSTRIES,
  MASTER_STATES,
} from './account-master-data';

describe('account-master-data', () => {
  beforeEach(() => {
    resetCustomMasterData();
  });
  it('provides master industries', () => {
    const list = getMasterIndustries();
    expect(list.length).toBeGreaterThan(15);
    expect(list).toContain('Valves & Actuators');
    expect(list).toContain('Automotive & Auto Components');
  });

  it('provides master state names', () => {
    const states = getMasterStateNames();
    expect(states).toContain('Maharashtra');
    expect(states).toContain('Gujarat');
    expect(states).toContain('Karnataka');
    expect(states).toContain('Tamil Nadu');
  });

  it('filters cities by state', () => {
    const mhCities = getCitiesForState('Maharashtra');
    expect(mhCities).toContain('Pune');
    expect(mhCities).toContain('Nashik');
    expect(mhCities).not.toContain('Ahmedabad');

    const gjCities = getCitiesForState('Gujarat');
    expect(gjCities).toContain('Ahmedabad');
    expect(gjCities).toContain('Vadodara');
    expect(gjCities).not.toContain('Pune');
  });

  it('returns all cities when state is empty', () => {
    const all = getCitiesForState('');
    expect(all).toEqual(getAllMasterCities());
    expect(all.length).toBeGreaterThan(50);
  });

  it('resolves state for a known city', () => {
    expect(getStateForCity('Pune')).toBe('Maharashtra');
    expect(getStateForCity('Sanand')).toBe('Gujarat');
    expect(getStateForCity('Hosur')).toBe('Tamil Nadu');
    expect(getStateForCity('Unknown City')).toBeNull();
  });

  it('allows adding and retrieving a new custom industry', () => {
    const custom = 'Semiconductors & Nanotechnology';
    addCustomIndustry(custom);
    expect(getCustomIndustries()).toContain(custom);
    const all = getMasterIndustries();
    expect(all).toContain(custom);
    // Ignore duplicate or empty
    addCustomIndustry(custom);
    expect(getMasterIndustries().filter((i) => i === custom)).toHaveLength(1);
    addCustomIndustry('   ');
    expect(getCustomIndustries()).toHaveLength(1);
  });

  it('allows adding and retrieving a new custom city with or without state', () => {
    addCustomCity('Talegaon Dabhade', 'Maharashtra');
    expect(getCitiesForState('Maharashtra')).toContain('Talegaon Dabhade');
    expect(getStateForCity('Talegaon Dabhade')).toBe('Maharashtra');

    addCustomCity('Custom Cluster Hub');
    expect(getAllMasterCities()).toContain('Custom Cluster Hub');
  });
});
