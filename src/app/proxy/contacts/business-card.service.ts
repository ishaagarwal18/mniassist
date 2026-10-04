import type { BusinessCardDto, ReadBusinessCardInput } from './models';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class BusinessCardService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  read = (input: ReadBusinessCardInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, BusinessCardDto>(
      {
        method: 'POST',
        url: '/api/auto-reach/business-card/read',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
