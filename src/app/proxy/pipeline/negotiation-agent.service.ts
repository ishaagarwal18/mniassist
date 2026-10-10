import { RestService, Rest } from '@abp/ng.core';
import type { PagedResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import type {
  CreateUpdateNegotiationPolicyDto,
  EvaluateOfferInput,
  EvaluateOfferResultDto,
  GetNegotiationSessionListInput,
  HumanInterventionInput,
  NegotiationPolicyDto,
  NegotiationSessionDto,
  ProcessChatNegotiationInput,
  ProcessChatNegotiationResultDto,
  SimulateNegotiationInput,
  SimulateNegotiationResultDto,
} from './negotiation-agent.models';
import type { QuotationDto } from './models';

@Injectable({
  providedIn: 'root',
})
export class NegotiationAgentService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getActivePolicy = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, NegotiationPolicyDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/negotiation-agent/active-policy',
      },
      { apiName: this.apiName, ...config },
    );

  createOrUpdatePolicy = (input: CreateUpdateNegotiationPolicyDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, NegotiationPolicyDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/negotiation-agent/or-update-policy',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  getSessions = (input: GetNegotiationSessionListInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<NegotiationSessionDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/negotiation-agent/sessions',
        params: {
          status: input.status,
          searchFilter: input.searchFilter,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  getSession = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, NegotiationSessionDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/negotiation-agent/${id}/session`,
      },
      { apiName: this.apiName, ...config },
    );

  evaluateCounterOffer = (input: EvaluateOfferInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, EvaluateOfferResultDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/negotiation-agent/evaluate-counter-offer',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  processChatNegotiation = (input: ProcessChatNegotiationInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ProcessChatNegotiationResultDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/negotiation-agent/process-chat-negotiation',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  simulateNegotiation = (input: SimulateNegotiationInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SimulateNegotiationResultDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/negotiation-agent/simulate-negotiation',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  intervene = (input: HumanInterventionInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, NegotiationSessionDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/negotiation-agent/intervene',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  applyToQuotation = (sessionId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, QuotationDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/negotiation-agent/apply-to-quotation/${sessionId}`,
      },
      { apiName: this.apiName, ...config },
    );
}
