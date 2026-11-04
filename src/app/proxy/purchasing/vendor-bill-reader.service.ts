import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

import type { ReadVendorBillInput, VendorBillReadingDto } from './vendor-bill-reader.models';

@Injectable({
  providedIn: 'root',
})
export class VendorBillReaderService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  /** Reads a bill (PDF or photo) into bill fields with the AI model. Saves nothing. */
  read = (input: ReadVendorBillInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, VendorBillReadingDto>(
      {
        method: 'POST',
        url: '/api/auto-reach/vendor-bill-reader/read',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
