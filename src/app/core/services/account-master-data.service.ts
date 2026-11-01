import { computed, inject, Injectable, signal } from '@angular/core';
import { RestService } from '@abp/ng.core';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { AccountStore } from './account.store';
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
} from '../models/account-master-data';

export interface BackendMasterDataDto {
  industries?: string[];
  states?: string[];
  cities?: { name: string; state?: string }[];
}

/**
 * Service providing master data for industrial accounts (Industry Sectors, States, Cities).
 * Binds dynamically from backend account data and metadata endpoints, with seamless
 * fallback to curated master industrial catalogs.
 */
@Injectable({
  providedIn: 'root',
})
export class AccountMasterDataService {
  private readonly restService = inject(RestService);
  private readonly accountStore = inject(AccountStore);
  private readonly apiName = 'AutoReach';

  private readonly remoteIndustries = signal<string[]>([]);
  private readonly remoteStates = signal<string[]>([]);
  private readonly remoteCities = signal<{ name: string; state?: string }[]>([]);
  private readonly versionTick = signal(0);
  readonly loading = signal(false);

  /**
   * Industries bound from the backend accounts, remote endpoints, and curated catalogs.
   */
  readonly industries = computed<readonly string[]>(() => {
    this.versionTick();
    const set = new Set<string>();

    // 1. Curated master industries
    for (const ind of getMasterIndustries()) {
      if (ind !== 'Other') set.add(ind);
    }

    // 2. Remote backend metadata
    for (const ind of this.remoteIndustries()) {
      if (ind && ind.trim()) set.add(ind.trim());
    }

    // 3. Extracted dynamically from existing backend accounts
    for (const acc of this.accountStore.all()) {
      if (acc.industry && acc.industry.trim()) {
        set.add(acc.industry.trim());
      }
    }

    const sorted = Array.from(set).sort((a, b) => a.localeCompare(b));
    return [...sorted, 'Other'];
  });

  /**
   * States bound from the backend accounts, remote endpoints, and master territory records.
   */
  readonly states = computed<readonly string[]>(() => {
    this.versionTick();
    const set = new Set<string>(getMasterStateNames());

    for (const st of this.remoteStates()) {
      if (st && st.trim()) set.add(st.trim());
    }

    for (const acc of this.accountStore.all()) {
      if (acc.state && acc.state.trim()) {
        set.add(acc.state.trim());
      }
    }

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  });

  constructor() {
    void this.loadBackendData();
  }

  /**
   * Fetches master data from the backend if available.
   */
  async loadBackendData(): Promise<void> {
    if (environment.useMockData) return;

    this.loading.set(true);
    try {
      const result = await firstValueFrom(
        this.restService
          .request<any, BackendMasterDataDto>(
            {
              method: 'GET',
              headers: { Accept: 'application/json' },
              url: '/api/auto-reach/customer-account/master-data',
            },
            { apiName: this.apiName },
          )
          .pipe(catchError(() => of(null))),
      );

      if (result) {
        if (result.industries?.length) {
          this.remoteIndustries.set(result.industries);
        }
        if (result.states?.length) {
          this.remoteStates.set(result.states);
        }
        if (result.cities?.length) {
          this.remoteCities.set(result.cities);
        }
        this.versionTick.update((n) => n + 1);
      }
    } catch {
      // Graceful fallback to accountStore records and curated master catalog
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Returns cities for a selected state, merging backend account cities with master cities.
   */
  getCitiesForState(stateName?: string | null): readonly string[] {
    this.versionTick();
    const set = new Set<string>();

    // 1. Master and custom cities for this state
    for (const c of getCitiesForState(stateName)) {
      set.add(c);
    }

    // 2. Remote cities matching state
    const cleanState = (stateName ?? '').trim().toLowerCase();
    for (const rc of this.remoteCities()) {
      if (!cleanState || !rc.state || rc.state.trim().toLowerCase() === cleanState) {
        set.add(rc.name.trim());
      }
    }

    // 3. Dynamic cities extracted from backend accounts
    for (const acc of this.accountStore.all()) {
      if (acc.city && acc.city.trim()) {
        const accState = (acc.state ?? '').trim().toLowerCase();
        if (!cleanState || !accState || accState === cleanState) {
          set.add(acc.city.trim());
        }
      }
    }

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  /**
   * Registers a new custom industry sector.
   */
  addIndustry(name: string): string {
    const added = addCustomIndustry(name);
    this.versionTick.update((n) => n + 1);
    return added;
  }

  /**
   * Registers a new custom city or industrial hub.
   */
  addCity(cityName: string, stateName?: string | null): string {
    const added = addCustomCity(cityName, stateName);
    this.versionTick.update((n) => n + 1);
    return added;
  }
}
