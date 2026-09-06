import type {
  CampaignDto,
  CampaignPreflightDto,
  CampaignRecipientDto,
  CampaignReportDto,
  CreateUpdateCampaignDto,
  GetCampaignListInput,
  GetCampaignRecipientsInput,
  ScheduleCampaignInput,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CampaignService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  cancel = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CampaignDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/campaign/${id}/cancel`,
      },
      { apiName: this.apiName, ...config },
    );

  create = (input: CreateUpdateCampaignDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CampaignDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/campaign',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'DELETE',
        url: `/api/auto-reach/campaign/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CampaignDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/campaign/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  getList = (input: GetCampaignListInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<CampaignDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/campaign',
        params: {
          state: input.state,
          channelId: input.channelId,
          filter: input.filter,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  getRecipients = (id: string, input: GetCampaignRecipientsInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<CampaignRecipientDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/campaign/${id}/recipients`,
        params: {
          status: input.status,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  getReport = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CampaignReportDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/campaign/${id}/report`,
      },
      { apiName: this.apiName, ...config },
    );

  pause = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CampaignDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/campaign/${id}/pause`,
      },
      { apiName: this.apiName, ...config },
    );

  preflight = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CampaignPreflightDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/campaign/${id}/preflight`,
      },
      { apiName: this.apiName, ...config },
    );

  resume = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CampaignDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/campaign/${id}/resume`,
      },
      { apiName: this.apiName, ...config },
    );

  schedule = (id: string, input: ScheduleCampaignInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CampaignDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/campaign/${id}/schedule`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  sendNow = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CampaignDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/campaign/${id}/send-now`,
      },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: CreateUpdateCampaignDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CampaignDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/campaign/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
