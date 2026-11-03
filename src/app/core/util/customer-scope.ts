import { inject } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';

/**
 * A list screen opened for one customer, from Customer 360: `?customer=<contact id>` or `?account=<account id>`, with `name=` to
 * say whose records are shown. Screens without a server filter use `?q=` to start their search box instead.
 */
export interface CustomerScope {
  customerId: string | null;
  accountId: string | null;
  name: string | null;
}

/** Reads the customer scope from the current route. Call in an injection context. */
export function readCustomerScope(route = inject(ActivatedRoute)): CustomerScope | null {
  const q = route.snapshot.queryParamMap;
  const customerId = q.get('customer');
  const accountId = q.get('account');
  if (!customerId && !accountId) return null;
  return { customerId, accountId, name: q.get('name') };
}

/** The `?q=` a screen's search box starts with, or ''. Call in an injection context. */
export function initialSearch(route = inject(ActivatedRoute)): string {
  return route.snapshot.queryParamMap.get('q') ?? '';
}

/** Query params that open a list screen scoped to one customer. */
export function scopeParams(scope: CustomerScope): Params {
  return scope.accountId
    ? { account: scope.accountId, name: scope.name }
    : { customer: scope.customerId, name: scope.name };
}
