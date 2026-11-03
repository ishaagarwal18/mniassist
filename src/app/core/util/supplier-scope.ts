import { inject } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';

/**
 * A purchasing screen opened for one supplier, from Vendor 360: `?supplier=<supplier id>&name=<supplier name>`. `new=1` also
 * opens the screen's create form for that supplier; `open=<record id>` opens one record.
 */
export interface SupplierScope {
  supplierId: string;
  name: string | null;
}

/** Reads the supplier scope from the current route. Call in an injection context. */
export function readSupplierScope(route = inject(ActivatedRoute)): SupplierScope | null {
  const q = route.snapshot.queryParamMap;
  const supplierId = q.get('supplier');
  return supplierId ? { supplierId, name: q.get('name') } : null;
}

/** Query params that open a purchasing screen scoped to one supplier. */
export function supplierScopeParams(scope: SupplierScope, extra?: Params): Params {
  return { supplier: scope.supplierId, name: scope.name, ...extra };
}
