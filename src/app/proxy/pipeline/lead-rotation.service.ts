import type { LeadRotationDto, SaveLeadRotationInput } from './models';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LeadRotationService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  get = (pipelineId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, LeadRotationDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/lead-rotation',
        params: { pipelineId },
      },
      { apiName: this.apiName, ...config },
    );

  save = (pipelineId: string, input: SaveLeadRotationInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, LeadRotationDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/lead-rotation/save/${pipelineId}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
