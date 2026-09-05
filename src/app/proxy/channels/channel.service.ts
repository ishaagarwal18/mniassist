import type {
  ChannelDto,
  ChannelHealthDto,
  ChannelQualitySnapshotDto,
  CompleteOnboardingStepInput,
  GetChannelListInput,
  OnboardingSessionDto,
  UpdateChannelInput,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto, PagedResultDto } from '@abp/ng.core';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ChannelService {
  apiName = 'AutoReach';

  completeOnboardingStep = (sessionId: string, input: CompleteOnboardingStepInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, OnboardingSessionDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/channel/onboarding/${sessionId}/steps`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ChannelDto>(
      {
        method: 'GET',
        url: `/api/auto-reach/channel/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  getAllHealth = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<ChannelHealthDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/channel/all-health',
      },
      { apiName: this.apiName, ...config },
    );

  getHealth = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ChannelHealthDto>(
      {
        method: 'GET',
        url: `/api/auto-reach/channel/${id}/health`,
      },
      { apiName: this.apiName, ...config },
    );

  getList = (input: GetChannelListInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<ChannelDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/channel',
        params: {
          state: input.state,
          filter: input.filter,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  getOrStartOnboarding = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, OnboardingSessionDto>(
      {
        method: 'POST',
        url: '/api/auto-reach/channel/onboarding',
      },
      { apiName: this.apiName, ...config },
    );

  getQualityHistory = (id: string, days = 30, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<ChannelQualitySnapshotDto>>(
      {
        method: 'GET',
        url: `/api/auto-reach/channel/${id}/quality-history`,
        params: { days },
      },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: UpdateChannelInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ChannelDto>(
      {
        method: 'PUT',
        url: `/api/auto-reach/channel/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  constructor(private restService: RestService) {}
}
