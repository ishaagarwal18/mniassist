import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AccountStore } from './account.store';
import { AccountMasterKind, CustomerAccountService } from '../../proxy/contacts';

interface MasterCity {
  name: string;
  state?: string | null;
}

/** A state and its two-digit GST state code. */
export interface MasterState {
  name: string;
  code?: string | null;
}

/**
 * The industry, state and city pick-lists, read from the database: the shared catalogue plus this workspace's own additions, with
 * values already used on accounts mixed in. Additions are saved to the database. Until the server answers the lists hold only
 * the values already on accounts.
 */
@Injectable({
  providedIn: 'root',
})
export class AccountMasterDataService {
  private readonly api = inject(CustomerAccountService);
  private readonly accountStore = inject(AccountStore);

  private readonly remoteIndustries = signal<string[]>([]);
  private readonly remoteStates = signal<MasterState[]>([]);
  private readonly remoteCities = signal<MasterCity[]>([]);
  readonly loading = signal(false);
  /** The lists could not be read; the forms then offer only the values already used. */
  readonly failed = signal(false);

  readonly industries = computed<readonly string[]>(() => {
    const set = new Set<string>();
    for (const ind of this.remoteIndustries()) {
      if (ind && ind.trim() && ind !== 'Other') set.add(ind.trim());
    }
    for (const acc of this.accountStore.all()) {
      if (acc.industry && acc.industry.trim()) set.add(acc.industry.trim());
    }
    const sorted = Array.from(set).sort((a, b) => a.localeCompare(b));
    return [...sorted, 'Other'];
  });

  readonly states = computed<readonly string[]>(() => {
    const set = new Set<string>(this.remoteStates().map((s) => s.name));
    for (const acc of this.accountStore.all()) {
      if (acc.state && acc.state.trim()) set.add(acc.state.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  });

  /** The states with their GST state codes, as the database has them. */
  readonly stateList = computed<readonly MasterState[]>(() =>
    [...this.remoteStates()].sort((a, b) => a.name.localeCompare(b.name)),
  );

  constructor() {
    void this.loadBackendData();
  }

  async loadBackendData(): Promise<void> {
    this.loading.set(true);
    try {
      const result = await firstValueFrom(this.api.getMasterData({ skipHandleError: true }));
      this.remoteIndustries.set(result?.industries ?? []);
      this.remoteStates.set(result?.states ?? []);
      this.remoteCities.set(result?.cities ?? []);
      this.failed.set(false);
    } catch {
      this.failed.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  /** The two-digit GST state code for a state name, when known. */
  stateCode(stateName?: string | null): string | null {
    const name = (stateName ?? '').trim().toLowerCase();
    if (!name) return null;
    return this.remoteStates().find((s) => s.name.toLowerCase() === name)?.code ?? null;
  }

  /** The state a GST state code belongs to, when known. */
  stateForCode(code?: string | null): string | null {
    if (!code) return null;
    return this.remoteStates().find((s) => s.code === code)?.name ?? null;
  }

  /** The state a city is in, when the list knows it (only when it is in one state). */
  stateForCity(cityName?: string | null): string | null {
    const name = (cityName ?? '').trim().toLowerCase();
    if (!name) return null;
    const states = new Set(
      this.remoteCities()
        .filter((c) => c.name.trim().toLowerCase() === name && c.state)
        .map((c) => c.state!.trim()),
    );
    return states.size === 1 ? [...states][0] : null;
  }

  /** Cities in a state (all cities when no state is chosen), plus cities already used on accounts there. */
  getCitiesForState(stateName?: string | null): readonly string[] {
    const set = new Set<string>();
    const cleanState = (stateName ?? '').trim().toLowerCase();

    for (const rc of this.remoteCities()) {
      if (!cleanState || !rc.state || rc.state.trim().toLowerCase() === cleanState) {
        set.add(rc.name.trim());
      }
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
    this.remoteIndustries.update((list) => (list.includes(value) ? list : [...list, value]));
    this.save(AccountMasterKind.Industry, value);
    return value;
  }

  /** Adds a city or industrial hub (in a state, when one is chosen): shown at once, saved to the database. */
  addCity(cityName: string, stateName?: string | null): string {
    const value = cityName.trim();
    if (!value) return value;
    this.remoteCities.update((list) => [...list, { name: value, state: stateName || null }]);
    this.save(AccountMasterKind.City, value, stateName);
    return value;
  }

  private save(kind: AccountMasterKind, name: string, stateName?: string | null): void {
    this.api.addMasterValue({ kind, name, stateName: stateName || null }).subscribe({
      // On failure the global error handler has said why; reload so the list shows what was really saved.
      error: () => void this.loadBackendData(),
    });
  }
}
