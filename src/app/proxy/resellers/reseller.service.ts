import type { PagedResultDto } from '@abp/ng.core';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

import type {
  ConfigureCustomDomainInput,
  CreateResellerPartnerInput,
  ProcessPayoutInput,
  ProvisionClientTenantInput,
  PublicWhiteLabelBrandingDto,
  RecordCommissionInput,
  RejectPayoutInput,
  RequestPayoutInput,
  ResellerClientTenantDto,
  ResellerCommissionDto,
  ResellerDashboardDto,
  ResellerPageRequest,
  ResellerPartnerDto,
  ResellerPayoutDto,
  ResellerWhiteLabelProfileDto,
  UpdateClientTenantPlanInput,
  UpdateResellerPartnerInput,
  UpdateResellerTierInput,
  UpdateWhiteLabelBrandingInput,
  VerifyCustomDomainInput,
} from './reseller.models';

/**
 * The white-label reseller programme. Routes follow ABP's conventional-controller naming for ResellerAppService, as
 * served by /api/abp/api-definition: a lone Guid named `id` goes in the path, other primitives in the query.
 */
@Injectable({ providedIn: 'root' })
export class ResellerService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  private page = (input?: ResellerPageRequest) => ({
    sorting: input?.sorting,
    skipCount: input?.skipCount,
    maxResultCount: input?.maxResultCount,
  });

  // ---- Partners ----

  registerPartner = (input: CreateResellerPartnerInput, config?: Partial<Rest.Config>) =>
    this.restService.request<CreateResellerPartnerInput, ResellerPartnerDto>(
      { method: 'POST', url: '/api/auto-reach/reseller/register-partner', body: input },
      { apiName: this.apiName, ...config },
    );

  getPartner = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ResellerPartnerDto>(
      { method: 'GET', url: `/api/auto-reach/reseller/${id}/partner` },
      { apiName: this.apiName, ...config },
    );

  getCurrentPartner = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ResellerPartnerDto | null>(
      { method: 'GET', url: '/api/auto-reach/reseller/current-partner' },
      { apiName: this.apiName, ...config },
    );

  getPartners = (input?: ResellerPageRequest, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<ResellerPartnerDto>>(
      { method: 'GET', url: '/api/auto-reach/reseller/partners', params: this.page(input) },
      { apiName: this.apiName, ...config },
    );

  updatePartner = (id: string, input: UpdateResellerPartnerInput, config?: Partial<Rest.Config>) =>
    this.restService.request<UpdateResellerPartnerInput, ResellerPartnerDto>(
      { method: 'PUT', url: `/api/auto-reach/reseller/${id}/partner`, body: input },
      { apiName: this.apiName, ...config },
    );

  approvePartner = (id: string, notes?: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ResellerPartnerDto>(
      { method: 'POST', url: `/api/auto-reach/reseller/${id}/approve-partner`, params: { notes } },
      { apiName: this.apiName, ...config },
    );

  suspendPartner = (id: string, reason: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ResellerPartnerDto>(
      { method: 'POST', url: `/api/auto-reach/reseller/${id}/suspend-partner`, params: { reason } },
      { apiName: this.apiName, ...config },
    );

  reactivatePartner = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ResellerPartnerDto>(
      { method: 'POST', url: `/api/auto-reach/reseller/${id}/reactivate-partner` },
      { apiName: this.apiName, ...config },
    );

  updateTier = (id: string, input: UpdateResellerTierInput, config?: Partial<Rest.Config>) =>
    this.restService.request<UpdateResellerTierInput, ResellerPartnerDto>(
      { method: 'PUT', url: `/api/auto-reach/reseller/${id}/tier`, body: input },
      { apiName: this.apiName, ...config },
    );

  // ---- White-label branding and custom domain ----

  getWhiteLabelProfile = (partnerId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ResellerWhiteLabelProfileDto>(
      { method: 'GET', url: `/api/auto-reach/reseller/white-label-profile/${partnerId}` },
      { apiName: this.apiName, ...config },
    );

  updateWhiteLabelBranding = (
    partnerId: string,
    input: UpdateWhiteLabelBrandingInput,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<UpdateWhiteLabelBrandingInput, ResellerWhiteLabelProfileDto>(
      {
        method: 'PUT',
        url: `/api/auto-reach/reseller/white-label-branding/${partnerId}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  configureCustomDomain = (
    partnerId: string,
    input: ConfigureCustomDomainInput,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<ConfigureCustomDomainInput, ResellerWhiteLabelProfileDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/reseller/configure-custom-domain/${partnerId}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  verifyCustomDomain = (
    partnerId: string,
    input: VerifyCustomDomainInput,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<VerifyCustomDomainInput, ResellerWhiteLabelProfileDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/reseller/verify-custom-domain/${partnerId}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  /** Takes the custom domain off and releases it, so it stops being served. */
  removeCustomDomain = (partnerId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<void, ResellerWhiteLabelProfileDto>(
      {
        method: 'DELETE',
        url: `/api/auto-reach/reseller/custom-domain/${partnerId}`,
      },
      { apiName: this.apiName, ...config },
    );

  /** Anonymous: the branding of the reseller whose domain this is, or the platform's defaults. */
  getPublicBrandingByDomain = (hostName: string, config?: Partial<Rest.Config>) =>
    this.restService.request<void, PublicWhiteLabelBrandingDto>(
      {
        method: 'GET',
        url: '/api/auto-reach/reseller/public-branding-by-domain',
        params: { hostName },
      },
      { apiName: this.apiName, ...config },
    );

  // ---- Client workspaces ----

  getClientTenants = (
    partnerId: string,
    input?: ResellerPageRequest,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, PagedResultDto<ResellerClientTenantDto>>(
      {
        method: 'GET',
        url: `/api/auto-reach/reseller/client-tenants/${partnerId}`,
        params: this.page(input),
      },
      { apiName: this.apiName, ...config },
    );

  provisionClientTenant = (
    partnerId: string,
    input: ProvisionClientTenantInput,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<ProvisionClientTenantInput, ResellerClientTenantDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/reseller/provision-client-tenant/${partnerId}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  updateClientTenantPlan = (
    partnerId: string,
    clientTenantId: string,
    input: UpdateClientTenantPlanInput,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<UpdateClientTenantPlanInput, ResellerClientTenantDto>(
      {
        method: 'PUT',
        url: '/api/auto-reach/reseller/client-tenant-plan',
        params: { partnerId, clientTenantId },
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  deactivateClientTenant = (
    partnerId: string,
    clientTenantId: string,
    reason?: string,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, ResellerClientTenantDto>(
      {
        method: 'POST',
        url: '/api/auto-reach/reseller/deactivate-client-tenant',
        params: { partnerId, clientTenantId, reason },
      },
      { apiName: this.apiName, ...config },
    );

  reactivateClientTenant = (
    partnerId: string,
    clientTenantId: string,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, ResellerClientTenantDto>(
      {
        method: 'POST',
        url: '/api/auto-reach/reseller/reactivate-client-tenant',
        params: { partnerId, clientTenantId },
      },
      { apiName: this.apiName, ...config },
    );

  // ---- Commissions and payouts ----

  getCommissions = (
    partnerId: string,
    input?: ResellerPageRequest,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, PagedResultDto<ResellerCommissionDto>>(
      {
        method: 'GET',
        url: `/api/auto-reach/reseller/commissions/${partnerId}`,
        params: this.page(input),
      },
      { apiName: this.apiName, ...config },
    );

  recordCommission = (
    partnerId: string,
    input: RecordCommissionInput,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<RecordCommissionInput, ResellerCommissionDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/reseller/record-commission/${partnerId}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  getPayouts = (partnerId: string, input?: ResellerPageRequest, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<ResellerPayoutDto>>(
      {
        method: 'GET',
        url: `/api/auto-reach/reseller/payouts/${partnerId}`,
        params: this.page(input),
      },
      { apiName: this.apiName, ...config },
    );

  requestPayout = (partnerId: string, input: RequestPayoutInput, config?: Partial<Rest.Config>) =>
    this.restService.request<RequestPayoutInput, ResellerPayoutDto>(
      { method: 'POST', url: `/api/auto-reach/reseller/request-payout/${partnerId}`, body: input },
      { apiName: this.apiName, ...config },
    );

  approvePayout = (payoutId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ResellerPayoutDto>(
      { method: 'POST', url: `/api/auto-reach/reseller/approve-payout/${payoutId}` },
      { apiName: this.apiName, ...config },
    );

  settlePayout = (payoutId: string, input: ProcessPayoutInput, config?: Partial<Rest.Config>) =>
    this.restService.request<ProcessPayoutInput, ResellerPayoutDto>(
      { method: 'POST', url: `/api/auto-reach/reseller/settle-payout/${payoutId}`, body: input },
      { apiName: this.apiName, ...config },
    );

  rejectPayout = (payoutId: string, input: RejectPayoutInput, config?: Partial<Rest.Config>) =>
    this.restService.request<RejectPayoutInput, ResellerPayoutDto>(
      { method: 'POST', url: `/api/auto-reach/reseller/reject-payout/${payoutId}`, body: input },
      { apiName: this.apiName, ...config },
    );

  getDashboard = (partnerId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ResellerDashboardDto>(
      { method: 'GET', url: `/api/auto-reach/reseller/dashboard/${partnerId}` },
      { apiName: this.apiName, ...config },
    );
}
