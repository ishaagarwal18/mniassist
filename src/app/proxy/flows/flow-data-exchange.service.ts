import type { FlowEncryptionKeyDto, FlowPackInstallResultDto } from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FlowDataExchangeService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getKeys = (channelId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<FlowEncryptionKeyDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/flow-data-exchange/keys/${channelId}`,
      },
      { apiName: this.apiName, ...config },
    );

  installIndustrialPack = (channelId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, FlowPackInstallResultDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/flow-data-exchange/install-industrial-pack/${channelId}`,
      },
      { apiName: this.apiName, ...config },
    );

  rotateKey = (channelId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, FlowEncryptionKeyDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/flow-data-exchange/rotate-key/${channelId}`,
      },
      { apiName: this.apiName, ...config },
    );
}
