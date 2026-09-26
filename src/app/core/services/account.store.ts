import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AccountTreeNodeDto,
  CreateUpdateCustomerAccountDto,
  CustomerAccountDto,
  CustomerAccountRollupDto,
  CustomerAccountService,
} from '../../proxy/contacts';
import { readApiError } from '../util/api-error';

/** The deepest an account tree may go — the same limit the server enforces. */
export const MAX_ACCOUNT_DEPTH = 5;

export interface CustomerAccount {
  readonly id: string;
  readonly name: string;
  readonly industry?: string;
  readonly city?: string;
  readonly state?: string;
  readonly website?: string;
  readonly notes?: string;
  readonly contactCount: number;
  /** The account this one sits under; undefined for a top-level account. */
  readonly parentId?: string;
  /** Accounts directly under this one. */
  readonly childCount: number;
}

/** One line of the accounts screen: an account, how far to indent it, and the contacts under it. */
export interface AccountRow {
  readonly account: CustomerAccount;
  readonly depth: number;
  /** Contacts on this account and everything below it. */
  readonly subtreeContacts: number;
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
    parentId: dto.parentAccountId ?? undefined,
    childCount: dto.childCount ?? 0,
  };
}

/** Every account under `id`, at any depth. Stops at a repeat, so bad data cannot loop it. */
export function descendantIds(id: string, accounts: readonly CustomerAccount[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>([id]);
  const queue = [id];
  while (queue.length) {
    const current = queue.shift()!;
    for (const a of accounts) {
      if (a.parentId === current && !seen.has(a.id)) {
        seen.add(a.id);
        result.push(a.id);
        queue.push(a.id);
      }
    }
  }
  return result;
}

/** Levels in the subtree rooted at `id`: 1 for an account with no children. */
function height(id: string, accounts: readonly CustomerAccount[]): number {
  let h = 1;
  let level = [id];
  const seen = new Set<string>([id]);
  for (;;) {
    const next = accounts.filter(
      (a) => a.parentId && level.includes(a.parentId) && !seen.has(a.id),
    );
    if (!next.length) return h;
    next.forEach((a) => seen.add(a.id));
    h++;
    level = next.map((a) => a.id);
  }
}

function depthOf(id: string, accounts: readonly CustomerAccount[]): number {
  let depth = 1;
  const seen = new Set<string>([id]);
  let current = accounts.find((a) => a.id === id);
  while (current?.parentId && !seen.has(current.parentId)) {
    seen.add(current.parentId);
    depth++;
    current = accounts.find((a) => a.id === current!.parentId);
  }
  return depth;
}

/**
 * The reason `id` cannot go under `parentId`, or null when it can. The server enforces the same rules — this
 * only lets the picker and the demo build say so before asking.
 */
export function moveProblem(
  id: string | null,
  parentId: string | null | undefined,
  accounts: readonly CustomerAccount[],
): string | null {
  if (!parentId) return null;
  if (id && parentId === id) return 'An account cannot be its own parent.';
  if (id && descendantIds(id, accounts).includes(parentId)) {
    return 'That would put an account under one of its own subsidiaries, which loops the hierarchy.';
  }
  const own = id ? height(id, accounts) : 1;
  if (depthOf(parentId, accounts) + own > MAX_ACCOUNT_DEPTH) {
    return `Account hierarchies can be at most ${MAX_ACCOUNT_DEPTH} levels deep.`;
  }
  return null;
}

const SEED: CustomerAccount[] = [
  {
    id: 'acc-1',
    name: 'Deccan Valves',
    industry: 'Valves & actuators',
    city: 'Pune',
    state: 'MH',
    contactCount: 1,
    childCount: 2,
  },
  {
    id: 'acc-4',
    name: 'Deccan Valves — Pune plant',
    industry: 'Valves & actuators',
    city: 'Pune',
    state: 'MH',
    contactCount: 4,
    parentId: 'acc-1',
    childCount: 0,
  },
  {
    id: 'acc-5',
    name: 'Deccan Valves — Nashik plant',
    industry: 'Valves & actuators',
    city: 'Nashik',
    state: 'MH',
    contactCount: 2,
    parentId: 'acc-1',
    childCount: 0,
  },
  {
    id: 'acc-2',
    name: 'Kohinoor Instruments',
    industry: 'Process instrumentation',
    city: 'Nashik',
    state: 'MH',
    contactCount: 2,
    childCount: 0,
  },
  {
    id: 'acc-3',
    name: 'Sanand Press Works',
    industry: 'Sheet metal',
    city: 'Ahmedabad',
    state: 'GJ',
    contactCount: 3,
    childCount: 0,
  },
];

@Injectable({ providedIn: 'root' })
export class AccountStore {
  private readonly api = inject(CustomerAccountService);

  readonly filter = signal('');
  private readonly reloadTick = signal(0);
  private seed = [...SEED];

  private readonly resource = rxResource({
    params: () => (environment.useMockData ? undefined : { tick: this.reloadTick() }),
    stream: () =>
      this.api
        .getList({ skipCount: 0, maxResultCount: 1000 })
        .pipe(map((page) => (page.items ?? []).map(toAccount))),
    defaultValue: [] as CustomerAccount[],
  });

  private readonly treeResource = rxResource({
    params: () => (environment.useMockData ? undefined : { tick: this.reloadTick() }),
    stream: () => this.api.getTree(),
    defaultValue: [] as AccountTreeNodeDto[],
  });

  readonly loading = computed(
    () => !environment.useMockData && (this.resource.isLoading() || this.treeResource.isLoading()),
  );

  /** Every account, unfiltered — what the parent picker and the tree are built from. */
  readonly all = computed<readonly CustomerAccount[]>(() => {
    if (environment.useMockData) {
      this.reloadTick();
      return this.recount(this.seed);
    }
    return this.resource.value();
  });

  /** Accounts matching the search box. */
  readonly accounts = computed<readonly CustomerAccount[]>(() => {
    const q = this.filter().trim().toLowerCase();
    const list = this.all();
    return q
      ? list.filter(
          (a) => a.name.toLowerCase().includes(q) || (a.city ?? '').toLowerCase().includes(q),
        )
      : list;
  });

  /**
   * What the screen lists: the whole tree in reading order (each parent, then its subtree, indented by depth)
   * — or, while searching, just the matches, flat, since a match's parent may not match.
   */
  readonly rows = computed<readonly AccountRow[]>(() => {
    const all = this.all();
    if (this.filter().trim()) {
      return this.accounts().map((account) => ({
        account,
        depth: 1,
        subtreeContacts: account.contactCount,
      }));
    }

    const byId = new Map(all.map((a) => [a.id, a]));

    if (environment.useMockData) {
      return this.mockTree(all);
    }

    return this.treeResource
      .value()
      .filter((n) => byId.has(n.id))
      .map((n) => ({
        account: byId.get(n.id)!,
        depth: n.depth,
        subtreeContacts: n.subtreeContactCount,
      }));
  });

  reload(): void {
    this.reloadTick.update((n) => n + 1);
  }

  async save(id: string | null, input: CreateUpdateCustomerAccountDto): Promise<void> {
    if (environment.useMockData) {
      const problem = moveProblem(id, input.parentAccountId, this.recount(this.seed));
      if (problem) throw new Error(problem);

      const previous = id ? this.seed.find((a) => a.id === id) : undefined;
      const patch: CustomerAccount = {
        id: id ?? `acc-${crypto.randomUUID().slice(0, 6)}`,
        name: input.name,
        industry: input.industry ?? undefined,
        city: input.city ?? undefined,
        state: input.state ?? undefined,
        website: input.website ?? undefined,
        notes: input.notes ?? undefined,
        contactCount: previous?.contactCount ?? 0,
        parentId: input.parentAccountId ?? undefined,
        childCount: 0,
      };
      this.seed = id ? this.seed.map((a) => (a.id === id ? patch : a)) : [patch, ...this.seed];
      this.reloadTick.update((n) => n + 1);
      return;
    }
    try {
      if (id) {
        await firstValueFrom(this.api.update(id, input));
      } else {
        await firstValueFrom(this.api.create(input));
      }
    } catch (e) {
      // The server explains why a parent was refused (a loop, too deep); pass that on instead of a generic error.
      throw new Error(readApiError(e, 'Could not save the account.'));
    }
    this.reload();
  }

  async remove(id: string): Promise<void> {
    if (environment.useMockData) {
      const gone = this.seed.find((a) => a.id === id);
      // Subsidiaries move up to the deleted account's own parent, as on the server.
      this.seed = this.seed
        .filter((a) => a.id !== id)
        .map((a) => (a.parentId === id ? { ...a, parentId: gone?.parentId } : a));
      this.reloadTick.update((n) => n + 1);
      return;
    }
    await firstValueFrom(this.api.delete(id));
    this.reload();
  }

  async rollup(id: string, includeSubsidiaries = false): Promise<CustomerAccountRollupDto> {
    if (environment.useMockData) {
      const list = this.recount(this.seed);
      const below = descendantIds(id, list);
      const scope = includeSubsidiaries ? [id, ...below] : [id];
      const members = list.filter((a) => scope.includes(a.id));
      return {
        accountId: id,
        includesSubsidiaries: includeSubsidiaries,
        subsidiaryCount: below.length,
        contactCount: members.reduce((n, a) => n + a.contactCount, 0),
        openEnquiryCount: 2,
        wonEnquiryCount: 1,
        lostEnquiryCount: 0,
        pipelineValueInPaise: 145_00_000,
        lastActivityUtc: new Date(Date.now() - 4 * 3_600_000).toISOString(),
        lifecycleBreakdown: { Engaged: 2, Quoted: 1, Customer: 1 },
        contacts: [],
      };
    }
    return firstValueFrom(this.api.getRollup(id, includeSubsidiaries));
  }

  // ---- demo-build helpers ---------------------------------------------------------------------

  /** Child counts follow the parent links, so an edit in the demo build cannot leave them stale. */
  private recount(list: readonly CustomerAccount[]): CustomerAccount[] {
    return list.map((a) => ({ ...a, childCount: list.filter((c) => c.parentId === a.id).length }));
  }

  private mockTree(all: readonly CustomerAccount[]): AccountRow[] {
    const rows: AccountRow[] = [];
    const seen = new Set<string>();
    const ids = new Set(all.map((a) => a.id));

    const subtree = (a: CustomerAccount) =>
      a.contactCount +
      descendantIds(a.id, all).reduce(
        (n, d) => n + (all.find((x) => x.id === d)?.contactCount ?? 0),
        0,
      );

    const walk = (a: CustomerAccount, depth: number): void => {
      if (seen.has(a.id)) return;
      seen.add(a.id);
      rows.push({ account: a, depth, subtreeContacts: subtree(a) });
      all
        .filter((c) => c.parentId === a.id)
        .sort((x, y) => x.name.localeCompare(y.name))
        .forEach((c) => walk(c, depth + 1));
    };

    all
      .filter((a) => !a.parentId || !ids.has(a.parentId))
      .sort((x, y) => x.name.localeCompare(y.name))
      .forEach((a) => walk(a, 1));

    return rows;
  }
}
