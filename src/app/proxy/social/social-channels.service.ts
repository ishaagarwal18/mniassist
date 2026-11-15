import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

/** Channel state shared by every channel kind (ChannelState on the API). */
export enum SocialChannelState {
  Onboarding = 0,
  Active = 1,
  Suspended = 2,
  Restricted = 3,
}

export interface MetaLoginStartDto {
  authorizeUrl: string;
  redirectUri: string;
  scope: string;
  state: string;
}

export interface CompleteMetaLoginInput {
  state: string;
  authorizationCode: string;
}

export interface MessengerChannelDto {
  id: string;
  pageId: string;
  pageName: string;
  state: SocialChannelState;
  webhookSubscribedAtUtc?: string | null;
  restrictionReason?: string | null;
  creationTime?: string;
}

export interface MessengerPageOptionDto {
  pageId: string;
  pageName: string;
  category?: string | null;
}

export interface MessengerAvailablePagesDto {
  selectionId: string;
  pages: MessengerPageOptionDto[];
}

export interface ConnectMessengerPageInput {
  pageId: string;
  selectionId: string;
}

export interface InstagramChannelDto {
  id: string;
  igUserId: string;
  username: string;
  profilePictureUrl?: string | null;
  state: SocialChannelState;
  tokenExpiresAtUtc: string;
  tokenLastRefreshedAtUtc?: string | null;
  restrictionReason?: string | null;
  creationTime?: string;
}

/** MessengerChannelAppService: Facebook Login for Business, then pick a Page. */
@Injectable({ providedIn: 'root' })
export class MessengerChannelService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getList = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<MessengerChannelDto>>(
      { method: 'GET', url: '/api/auto-reach/messenger-channel' },
      { apiName: this.apiName, ...config },
    );

  getLoginStart = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, MetaLoginStartDto>(
      { method: 'GET', url: '/api/auto-reach/messenger-channel/login-start' },
      { apiName: this.apiName, ...config },
    );

  completeLogin = (input: CompleteMetaLoginInput, config?: Partial<Rest.Config>) =>
    this.restService.request<CompleteMetaLoginInput, MessengerAvailablePagesDto>(
      { method: 'POST', url: '/api/auto-reach/messenger-channel/complete-login', body: input },
      { apiName: this.apiName, ...config },
    );

  connectPage = (input: ConnectMessengerPageInput, config?: Partial<Rest.Config>) =>
    this.restService.request<ConnectMessengerPageInput, MessengerChannelDto>(
      { method: 'POST', url: '/api/auto-reach/messenger-channel/connect-page', body: input },
      { apiName: this.apiName, ...config },
    );
}

/** InstagramChannelAppService: Instagram Business Login; one login connects one account. */
@Injectable({ providedIn: 'root' })
export class InstagramChannelService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getList = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<InstagramChannelDto>>(
      { method: 'GET', url: '/api/auto-reach/instagram-channel' },
      { apiName: this.apiName, ...config },
    );

  getLoginStart = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, MetaLoginStartDto>(
      { method: 'GET', url: '/api/auto-reach/instagram-channel/login-start' },
      { apiName: this.apiName, ...config },
    );

  completeLogin = (input: CompleteMetaLoginInput, config?: Partial<Rest.Config>) =>
    this.restService.request<CompleteMetaLoginInput, InstagramChannelDto>(
      { method: 'POST', url: '/api/auto-reach/instagram-channel/complete-login', body: input },
      { apiName: this.apiName, ...config },
    );
}
