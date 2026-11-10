import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { AccountMasterDataService } from './account-master-data.service';
import { AccountStore, CustomerAccount } from './account.store';
import { CustomerAccountService } from '../../proxy/contacts';

describe('AccountMasterDataService', () => {
  const mockAccounts: CustomerAccount[] = [
    {
      id: 'acc-1',
      name: 'Alpha Robotics',
      industry: 'Robotics & Automation',
      city: 'Pune',
      state: 'Maharashtra',
      contactCount: 2,
      childCount: 0,
    },
    {
      id: 'acc-2',
      name: 'Beta Solar',
      industry: 'Power & Renewable Energy',
      city: 'Vadodara',
      state: 'Gujarat',
      contactCount: 1,
      childCount: 0,
    },
  ];
  const fromDatabase = {
    industries: ['Valves & Actuators', 'Cement'],
    states: [
      { name: 'Maharashtra', code: '27' },
      { name: 'Gujarat', code: '24' },
    ],
    cities: [
      { name: 'Chakan', state: 'Maharashtra' },
      { name: 'Ahmedabad', state: 'Gujarat' },
    ],
  };
  let api: { getMasterData: ReturnType<typeof vi.fn>; addMasterValue: ReturnType<typeof vi.fn> };

  function create(): AccountMasterDataService {
    TestBed.configureTestingModule({
      providers: [
        AccountMasterDataService,
        { provide: CustomerAccountService, useValue: api },
        { provide: AccountStore, useValue: { all: () => mockAccounts } },
      ],
    });
    return TestBed.inject(AccountMasterDataService);
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    api = {
      getMasterData: vi.fn(() => of(fromDatabase)),
      addMasterValue: vi.fn(() => of(undefined)),
    };
  });

  it('lists the database industries with those already on accounts, Other last', async () => {
    const service = create();
    await service.loadBackendData();
    const list = service.industries();
    expect(list).toContain('Valves & Actuators');
    expect(list).toContain('Robotics & Automation');
    expect(list[list.length - 1]).toBe('Other');
  });

  it('gives GST state codes and cities from the database', async () => {
    const service = create();
    await service.loadBackendData();
    expect(service.stateCode('Gujarat')).toBe('24');
    expect(service.stateForCode('27')).toBe('Maharashtra');
    expect(service.stateList().map((s) => s.name)).toEqual(['Gujarat', 'Maharashtra']);
    expect(service.getCitiesForState('Maharashtra')).toEqual(['Chakan', 'Pune']);
    expect(service.stateForCity('Ahmedabad')).toBe('Gujarat');
  });

  it('has no built-in lists: when the server cannot be read only account values are offered', async () => {
    api.getMasterData = vi.fn(() => throwError(() => new Error('offline')));
    const service = create();
    await service.loadBackendData();
    expect(service.failed()).toBe(true);
    expect(service.industries()).toEqual([
      'Power & Renewable Energy',
      'Robotics & Automation',
      'Other',
    ]);
    expect(service.stateCode('Gujarat')).toBeNull();
  });

  it('saves an added industry or city to the database', async () => {
    const service = create();
    await service.loadBackendData();
    service.addIndustry('Quantum Sensors');
    service.addCity('Chakan Phase 3', 'Maharashtra');
    expect(service.industries()).toContain('Quantum Sensors');
    expect(service.getCitiesForState('Maharashtra')).toContain('Chakan Phase 3');
    expect(api.addMasterValue).toHaveBeenCalledTimes(2);
  });
});
