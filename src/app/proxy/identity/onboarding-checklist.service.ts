import type {
  ConfirmMobileVerificationDto,
  OnboardingChecklistDto,
  StartMobileVerificationDto,
} from './models';
import type { OnboardingChecklistStep } from './onboarding-checklist-step.enum';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class OnboardingChecklistService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  confirmMobileVerification = (
    input: ConfirmMobileVerificationDto,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, OnboardingChecklistDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/onboarding-checklist/confirm-mobile-verification',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  dismiss = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, OnboardingChecklistDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/onboarding-checklist/dismiss',
      },
      { apiName: this.apiName, ...config },
    );

  get = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, OnboardingChecklistDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/onboarding-checklist',
      },
      { apiName: this.apiName, ...config },
    );

  markStep = (step: OnboardingChecklistStep, config?: Partial<Rest.Config>) =>
    this.restService.request<any, OnboardingChecklistDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/onboarding-checklist/mark-step',
        params: { step },
      },
      { apiName: this.apiName, ...config },
    );

  startMobileVerification = (input: StartMobileVerificationDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      {
        method: 'POST',
        url: '/api/auto-reach/onboarding-checklist/start-mobile-verification',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
