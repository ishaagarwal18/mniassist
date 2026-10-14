import { TestBed } from '@angular/core/testing';
import { ConfigStateService } from '@abp/ng.core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';
import { AutoReachPermissionService } from './auto-reach-permission.service';

describe('host-admin permission service', () => {
  afterEach(() => TestBed.resetTestingModule());

  function setup(roles: string[], tenantId: string | null = null) {
    const config = new BehaviorSubject({
      currentUser: { isAuthenticated: true, roles, tenantId },
      currentTenant: { id: tenantId, isAvailable: Boolean(tenantId) },
      auth: { grantedPolicies: { 'AutoReach.Contacts': true } },
    });
    TestBed.configureTestingModule({
      providers: [{ provide: ConfigStateService, useValue: {
        getAll: () => config.value,
        getAll$: () => config.asObservable(),
      } }],
    });
    return { service: TestBed.inject(AutoReachPermissionService), config };
  }

  it('grants missing policies through synchronous, observable and item-filter APIs', async () => {
    const { service } = setup(['admin']);
    const policy = 'AutoReach.Channels.Onboard';
    expect(service.getGrantedPolicy(policy)).toBe(true);
    expect(await firstValueFrom(service.getGrantedPolicy$(policy))).toBe(true);
    expect(service.filterItemsByPolicy([{ requiredPolicy: policy }])).toHaveLength(1);
    expect(await firstValueFrom(service.filterItemsByPolicy$([{ requiredPolicy: policy }]))).toHaveLength(1);
  });

  it('applies actual grants to non-admin host users and tenant admins', async () => {
    const { service, config } = setup(['Agent']);
    expect(service.getGrantedPolicy('AutoReach.Contacts')).toBe(true);
    expect(service.getGrantedPolicy('AutoReach.Channels.Onboard')).toBe(false);
    config.next({ ...config.value,
      currentUser: { isAuthenticated: true, roles: ['admin'], tenantId: 'tenant-1' },
      currentTenant: { id: 'tenant-1', isAvailable: true },
    });
    expect(await firstValueFrom(service.getGrantedPolicy$('AutoReach.Channels.Onboard'))).toBe(false);
  });
});
