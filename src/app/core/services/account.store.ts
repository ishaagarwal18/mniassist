import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CreateUpdateCustomerAccountDto,
  CustomerAccountDto,
  CustomerAccountRollupDto,
  CustomerAccountService,
} from '../../proxy/contacts';

export interface CustomerAccount {
  readonly id: string;
  readonly name: string;
  readonly industry?: string;
  readonly city?: string;
  readonly state?: string;
  readonly website?: string;
  readonly notes?: string;
  readonly contactCount: number;
}

function toAccount(dto: CustomerAccountDto): CustomerAccount {
  return {
    id: dto.id!,
    name: dto.name ?? '',
    industry: dto.industry ?? undefined,
    city: dto.city ?? undefined,
    state: dto.state ?? undefined,
    website: dto.website ?? undefined,
    notes: dto.notes ?? undefined,
    contactCount: dto.contactCount ?? 0,
  };
}

const SEED: CustomerAccount[] = [
  {
    id: 'acc-1',
    name: 'Deccan Valves',
    industry: 'Valves & actuators',
    city: 'Pune',
    state: 'MH',
    contactCount: 4,
  },
  {
    id: 'acc-2',
    name: 'Kohinoor Instruments',
    industry: 'Process instrumentation',
    city: 'Nashik',
    state: 'MH',
    contactCount: 2,
  },
  {
    id: 'acc-3',
    name: 'Sanand Press Works',
    industry: 'Sheet metal',
    city: 'Ahmedabad',
    state: 'GJ',
    contactCount: 3,
  },
];

@Injectable({ providedIn: 'root' })
export class AccountStore {
  private readonly api = inject(CustomerAccountService);

  readonly filter = signal('');
  private readonly reloadTick = signal(0);
  private seed = [...SEED];

  private readonly resource = rxResource({
    params: () =>
      environment.useMockData ? undefined : { tick: this.reloadTick(), q: this.filter() },
    stream: () =>
      this.api
        .getList({ filter: this.filter() || undefined, skipCount: 0, maxResultCount: 200 })
        .pipe(map((page) => (page.items ?? []).map(toAccount))),
    defaultValue: [] as CustomerAccount[],
  });

  readonly loading = computed(() => !environment.useMockData && this.resource.isLoading());

  readonly accounts = computed<readonly CustomerAccount[]>(() => {
    if (environment.useMockData) {
      this.reloadTick();
      const q = this.filter().trim().toLowerCase();
      return q ? this.seed.filter((a) => a.name.toLowerCase().includes(q)) : this.seed;
    }
    return this.resource.value();
  });

  reload(): void {
    this.reloadTick.update((n) => n + 1);
  }

  async save(id: string | null, input: CreateUpdateCustomerAccountDto): Promise<void> {
    if (environment.useMockData) {
      const patch: CustomerAccount = {
        id: id ?? `acc-${crypto.randomUUID().slice(0, 6)}`,
        name: input.name,
        industry: input.industry ?? undefined,
        city: input.city ?? undefined,
        state: input.state ?? undefined,
        website: input.website ?? undefined,
        notes: input.notes ?? undefined,
        contactCount: id ? (this.seed.find((a) => a.id === id)?.contactCount ?? 0) : 0,
      };
      this.seed = id ? this.seed.map((a) => (a.id === id ? patch : a)) : [patch, ...this.seed];
      this.reloadTick.update((n) => n + 1);
      return;
    }
    if (id) {
      await firstValueFrom(this.api.update(id, input));
    } else {
      await firstValueFrom(this.api.create(input));
    }
    this.reload();
  }

  async remove(id: string): Promise<void> {
    if (environment.useMockData) {
      this.seed = this.seed.filter((a) => a.id !== id);
      this.reloadTick.update((n) => n + 1);
      return;
    }
    await firstValueFrom(this.api.delete(id));
    this.reload();
  }

  async rollup(id: string): Promise<CustomerAccountRollupDto> {
    if (environment.useMockData) {
      const acc = this.seed.find((a) => a.id === id);
      return {
        accountId: id,
        contactCount: acc?.contactCount ?? 0,
        openEnquiryCount: 2,
        wonEnquiryCount: 1,
        lostEnquiryCount: 0,
        pipelineValueInPaise: 145_00_000,
        lastActivityUtc: new Date(Date.now() - 4 * 3_600_000).toISOString(),
        lifecycleBreakdown: { Engaged: 2, Quoted: 1, Customer: 1 },
        contacts: [],
      };
    }
    return firstValueFrom(this.api.getRollup(id));
  }
}
