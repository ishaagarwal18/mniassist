import type { InvitationState } from './invitation-state.enum';
import type {
  AcceptInvitationDto,
  CreateInvitationDto,
  DeactivateMemberDto,
  DeactivationResultDto,
  InvitationCreatedDto,
  InvitationDto,
  RevokeSessionsDto,
  WorkspaceMemberDto,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto, PagedResultDto, PagedResultRequestDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class WorkspaceMemberService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  acceptInvitation = (input: AcceptInvitationDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WorkspaceMemberDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/workspace-member/accept-invitation',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  deactivate = (input: DeactivateMemberDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DeactivationResultDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/workspace-member/deactivate',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  getInvitations = (
    state: InvitationState,
    input: PagedResultRequestDto,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, PagedResultDto<InvitationDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/workspace-member/invitations',
        params: { state, skipCount: input.skipCount, maxResultCount: input.maxResultCount },
      },
      { apiName: this.apiName, ...config },
    );

  getList = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<WorkspaceMemberDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/workspace-member',
      },
      { apiName: this.apiName, ...config },
    );

  invite = (input: CreateInvitationDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InvitationCreatedDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/workspace-member/invite',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  reactivate = (userId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'POST',
        url: `/api/auto-reach/workspace-member/reactivate/${userId}`,
      },
      { apiName: this.apiName, ...config },
    );

  resendInvitation = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InvitationCreatedDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/workspace-member/${id}/resend-invitation`,
      },
      { apiName: this.apiName, ...config },
    );

  revokeInvitation = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'POST',
        url: `/api/auto-reach/workspace-member/${id}/revoke-invitation`,
      },
      { apiName: this.apiName, ...config },
    );

  revokeSessions = (input: RevokeSessionsDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'POST',
        url: '/api/auto-reach/workspace-member/revoke-sessions',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
