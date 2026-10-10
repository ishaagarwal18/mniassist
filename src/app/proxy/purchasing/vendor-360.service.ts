import { Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Vendor360Dto } from './vendor-360.models';

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
}
