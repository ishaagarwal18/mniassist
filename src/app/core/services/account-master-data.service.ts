import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AccountStore } from './account.store';
import { AccountMasterKind, CustomerAccountService } from '../../proxy/contacts';
import {
  addCustomCity,
  addCustomIndustry,
  getCitiesForState,
  getMasterIndustries,
  getMasterStateNames,
  MASTER_STATES,
} from '../models/account-master-data';

interface MasterCity {
  name: string;
  state?: string | null;
}

/**
 * The account form's pick-lists (industry sectors, states, cities), read from the database: the shared catalogue plus this
 * workspace's own additions, with values already used on accounts mixed in. Additions are saved to the database. Only when the
 * server cannot be reached (and in the demo build) does it fall back to the curated list shipped with the app.
 */
@Injectable({
  providedIn: 'root',
})
export class AccountMasterDataService {
  private readonly api = inject(CustomerAccountService);
  private readonly accountStore = inject(AccountStore);

  /** True once the database lists have arrived; until then (or if they never do) the curated list stands in. */
  private readonly fromServer = signal(false);
  private readonly remoteIndustries = signal<string[]>([]);
  private readonly remoteStates = signal<{ name: string; code?: string | null }[]>([]);
  private readonly remoteCities = signal<MasterCity[]>([]);
  private readonly versionTick = signal(0);
  readonly loading = signal(false);

  readonly industries = computed<readonly string[]>(() => {
    this.versionTick();
    const set = new Set<string>();

    const base = this.fromServer() ? this.remoteIndustries() : getMasterIndustries();
    for (const ind of base) {
      if (ind && ind.trim() && ind !== 'Other') set.add(ind.trim());
    }

    for (const acc of this.accountStore.all()) {
      if (acc.industry && acc.industry.trim()) set.add(acc.industry.trim());
    }

    const sorted = Array.from(set).sort((a, b) => a.localeCompare(b));
    return [...sorted, 'Other'];
  });

  readonly states = computed<readonly string[]>(() => {
    this.versionTick();
    const set = new Set<string>(
      this.fromServer() ? this.remoteStates().map((s) => s.name) : getMasterStateNames(),
    );

    for (const acc of this.accountStore.all()) {
      if (acc.state && acc.state.trim()) set.add(acc.state.trim());
    }

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  });

  constructor() {
    void this.loadBackendData();
  }

  async loadBackendData(): Promise<void> {
    if (environment.useMockData) return;

    this.loading.set(true);
    try {
      const result = await firstValueFrom(this.api.getMasterData({ skipHandleError: true }));
      if (result && (result.industries?.length || result.states?.length)) {
        this.remoteIndustries.set(result.industries ?? []);
        this.remoteStates.set(result.states ?? []);
        this.remoteCities.set(result.cities ?? []);
        this.fromServer.set(true);
        this.versionTick.update((n) => n + 1);
      }
    } catch {
      // The curated list stands in until the server answers.
    } finally {
      this.loading.set(false);
    }
  }

  /** The two-digit GST state code for a state name, when known. */
  stateCode(stateName?: string | null): string | null {
    const name = (stateName ?? '').trim().toLowerCase();
    if (!name) return null;
    const remote = this.remoteStates().find((s) => s.name.toLowerCase() === name);
    if (remote?.code) return remote.code;
    return MASTER_STATES.find((s) => s.name.toLowerCase() === name)?.code ?? null;
  }

  /** The state a GST state code belongs to, when known. */
  stateForCode(code?: string | null): string | null {
    if (!code) return null;
    return (
      this.remoteStates().find((s) => s.code === code)?.name ??
      MASTER_STATES.find((s) => s.code === code)?.name ??
      null
    );
  }

  /** Cities in a state (all cities when no state is chosen), plus cities already used on accounts there. */
  getCitiesForState(stateName?: string | null): readonly string[] {
    this.versionTick();
    const set = new Set<string>();
    const cleanState = (stateName ?? '').trim().toLowerCase();

    if (this.fromServer()) {
      for (const rc of this.remoteCities()) {
        if (!cleanState || !rc.state || rc.state.trim().toLowerCase() === cleanState) {
          set.add(rc.name.trim());
        }
      }
    } else {
      for (const c of getCitiesForState(stateName)) set.add(c);
    }

    for (const acc of this.accountStore.all()) {
      if (acc.city && acc.city.trim()) {
        const accState = (acc.state ?? '').trim().toLowerCase();
        if (!cleanState || !accState || accState === cleanState) set.add(acc.city.trim());
      }
    }

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  /** Adds an industry sector for this workspace: shown at once, saved to the database. */
  addIndustry(name: string): string {
    const value = name.trim();
    if (!value) return value;
    if (this.fromServer()) {
      this.remoteIndustries.update((list) => (list.includes(value) ? list : [...list, value]));
      this.save(AccountMasterKind.Industry, value);
    } else {
      addCustomIndustry(value);
    }
    this.versionTick.update((n) => n + 1);
    return value;
  }

  /** Adds a city or industrial hub (in a state, when one is chosen): shown at once, saved to the database. */
  addCity(cityName: string, stateName?: string | null): string {
    const value = cityName.trim();
    if (!value) return value;
    if (this.fromServer()) {
      this.remoteCities.update((list) => [...list, { name: value, state: stateName || null }]);
      this.save(AccountMasterKind.City, value, stateName);
    } else {
      addCustomCity(value, stateName);
    }
    this.versionTick.update((n) => n + 1);
    return value;
  }

  private save(kind: AccountMasterKind, name: string, stateName?: string | null): void {
    if (environment.useMockData) return;
    this.api.addMasterValue({ kind, name, stateName: stateName || null }).subscribe({
      // On failure the global error handler has said why; reload so the list shows what was really saved.
      error: () => void this.loadBackendData(),
    });
  }
}
