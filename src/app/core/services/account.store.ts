import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';
import {
  AccountTreeNodeDto,
  CreateUpdateCustomerAccountDto,
  CustomerAccountDto,
  CustomerAccountRollupDto,
  CustomerAccountService,
} from '../../proxy/contacts';
import { readApiError } from '../util/api-error';
import { settled } from '../util/resource';

/** The deepest an account tree may go — the same limit the server enforces. */
export const MAX_ACCOUNT_DEPTH = 5;

export interface CustomerAccount {
  readonly id: string;
  readonly name: string;
  readonly industry?: string;
  readonly gstin?: string;
  /** Street lines of the billing address. */
  readonly address?: string;
  readonly billingPincode?: string;
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
    gstin: dto.gstin ?? undefined,
    address: dto.billingAddress ?? undefined,
    billingPincode: dto.billingPincode ?? undefined,
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
 * only lets the picker say so before asking.
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

@Injectable({ providedIn: 'root' })
export class AccountStore {
  private readonly api = inject(CustomerAccountService);

  readonly filter = signal('');
  private readonly reloadTick = signal(0);

  private readonly resource = rxResource({
    params: () => ({ tick: this.reloadTick() }),
    stream: () =>
      this.api
        .getList({ skipCount: 0, maxResultCount: 1000 })
        .pipe(map((page) => (page.items ?? []).map(toAccount))),
    defaultValue: [] as CustomerAccount[],
  });

  private readonly treeResource = rxResource({
    params: () => ({ tick: this.reloadTick() }),
    stream: () => this.api.getTree(),
    defaultValue: [] as AccountTreeNodeDto[],
  });

  readonly loading = computed(() => this.resource.isLoading() || this.treeResource.isLoading());

  /** Every account, unfiltered — what the parent picker and the tree are built from. */
  readonly all = computed<readonly CustomerAccount[]>(() => {
    return settled(this.resource, [] as CustomerAccount[]);
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

  /** One account in full, with its shipping addresses (the list leaves those out). */
  async details(id: string): Promise<CustomerAccountDto | null> {
    return firstValueFrom(this.api.get(id));
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.api.delete(id));
    this.reload();
  }

  async rollup(id: string, includeSubsidiaries = false): Promise<CustomerAccountRollupDto> {
    return firstValueFrom(this.api.getRollup(id, includeSubsidiaries));
  }
}
