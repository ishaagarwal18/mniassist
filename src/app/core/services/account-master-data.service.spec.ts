import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RestService } from '@abp/ng.core';
import { describe, expect, it, beforeEach } from 'vitest';

import { AccountMasterDataService } from './account-master-data.service';
import { AccountStore, CustomerAccount } from './account.store';
import { resetCustomMasterData } from '../models/account-master-data';

describe('AccountMasterDataService', () => {
  let service: AccountMasterDataService;
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

  beforeEach(() => {
    resetCustomMasterData();
    TestBed.configureTestingModule({
      providers: [
        AccountMasterDataService,
        {
          provide: RestService,
          useValue: {
            request: () => of(null),
          },
        },
        {
          provide: AccountStore,
          useValue: {
            all: () => mockAccounts,
          },
        },
      ],
    });
    service = TestBed.inject(AccountMasterDataService);
  });

  it('aggregates industries from backend accounts and master catalog', () => {
    const list = service.industries();
    expect(list).toContain('Robotics & Automation'); // from backend account
    expect(list).toContain('Power & Renewable Energy');
    expect(list).toContain('Valves & Actuators'); // from master catalog
    expect(list[list.length - 1]).toBe('Other');
  });

  it('aggregates states from backend accounts and master catalog', () => {
    const states = service.states();
    expect(states).toContain('Maharashtra');
    expect(states).toContain('Gujarat');
  });

  it('filters cities by selected state and includes account cities', () => {
    const mhCities = service.getCitiesForState('Maharashtra');
    expect(mhCities).toContain('Pune');

    const gjCities = service.getCitiesForState('Gujarat');
    expect(gjCities).toContain('Vadodara');
  });

  it('allows registering custom industry and city dynamically', () => {
    service.addIndustry('Quantum Sensors');
    expect(service.industries()).toContain('Quantum Sensors');

    service.addCity('Chakan Phase 3', 'Maharashtra');
    expect(service.getCitiesForState('Maharashtra')).toContain('Chakan Phase 3');
  });
});
