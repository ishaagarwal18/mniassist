import type {
  ChannelDto,
  ChannelHealthDto,
  ChannelQualitySnapshotDto,
  CompleteEmbeddedSignupInput,
  CompleteOnboardingStepInput,
  GetChannelListInput,
  NumberManagementDto,
  OnboardingSessionDto,
  RequestDisplayNameChangeInput,
  SetTwoStepPinInput,
  UpdateBusinessProfileInput,
  UpdateChannelInput,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto, PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ChannelService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  completeEmbeddedSignup = (
    sessionId: string,
    input: CompleteEmbeddedSignupInput,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, OnboardingSessionDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/channel/complete-embedded-signup/${sessionId}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  completeOnboardingStep = (
    sessionId: string,
    input: CompleteOnboardingStepInput,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, OnboardingSessionDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/channel/complete-onboarding-step/${sessionId}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ChannelDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/channel/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  getAllHealth = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<ChannelHealthDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/channel/health',
      },
      { apiName: this.apiName, ...config },
    );

  getHealth = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ChannelHealthDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/channel/${id}/health`,
      },
      { apiName: this.apiName, ...config },
    );

  getList = (input: GetChannelListInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<ChannelDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
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

  getNumberManagement = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, NumberManagementDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/channel/${id}/number-management`,
      },
      { apiName: this.apiName, ...config },
    );

  getOrStartOnboarding = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, OnboardingSessionDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/channel/or-start-onboarding',
      },
      { apiName: this.apiName, ...config },
    );

  getQualityHistory = (id: string, days: number = 30, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<ChannelQualitySnapshotDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/channel/${id}/quality-history`,
        params: { days },
      },
      { apiName: this.apiName, ...config },
    );

  requestDisplayName = (
    id: string,
    input: RequestDisplayNameChangeInput,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, NumberManagementDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/channel/${id}/request-display-name`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  setTwoStepPin = (id: string, input: SetTwoStepPinInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, NumberManagementDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/channel/${id}/set-two-step-pin`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: UpdateChannelInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ChannelDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/channel/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  updateBusinessProfile = (
    id: string,
    input: UpdateBusinessProfileInput,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, NumberManagementDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/channel/${id}/business-profile`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
