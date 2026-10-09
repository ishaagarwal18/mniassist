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
        url: `/api/app/vendor360/${supplierId}`,
      },
      { apiName: this.apiName, ...config },
    );
  }
}
