import { Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Vendor360Dto, Vendor360SupplierDto } from './vendor-360.models';

@Injectable({
  providedIn: 'root',
})
export class Vendor360Service {
  private readonly restService = inject(RestService);
  apiName = 'AutoReach';

  get(supplierId: string, config?: Partial<Rest.Config>): Observable<Vendor360Dto> {
    return this.restService.request<any, Vendor360Dto>(
      {
        method: 'GET',
        url: '/api/auto-reach/vendor360',
        params: { supplierId },
      },
      { apiName: this.apiName, ...config },
    );
  }

  /** A few suppliers matching every word of `filter` (all when empty), usable ones first: the cockpit's finder. */
  getSupplierMatches(
    filter: string | null,
    maxResultCount = 20,
    config?: Partial<Rest.Config>,
  ): Observable<Vendor360SupplierDto[]> {
    return this.restService.request<any, Vendor360SupplierDto[]>(
      {
        method: 'GET',
        url: '/api/auto-reach/vendor360/supplier-matches',
        params: { filter: filter || undefined, maxResultCount },
      },
      { apiName: this.apiName, ...config },
    );
  }

  getSuppliers(config?: Partial<Rest.Config>): Observable<Vendor360SupplierDto[]> {
    return this.restService.request<any, Vendor360SupplierDto[]>(
      {
        method: 'GET',
        url: '/api/auto-reach/vendor360/suppliers',
      },
      { apiName: this.apiName, ...config },
    );
  }
}
