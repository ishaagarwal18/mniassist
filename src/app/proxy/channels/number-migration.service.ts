import type { ListResultDto } from '@abp/ng.core';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export enum NumberMigrationStatus {
  Started = 0,
  WarningAcknowledged = 1,
  CodeRequested = 2,
  Completed = 3,
  Failed = 4,
}

export enum VerificationCodeMethod {
  Sms = 0,
  Voice = 1,
}

export interface NumberMigrationDto {
  id?: string;
  countryCode?: string;
  phoneNumber?: string;
  e164?: string;
  wabaId?: string;
  status?: NumberMigrationStatus;
  warningAcknowledgedAtUtc?: string | null;
  codeMethod?: VerificationCodeMethod | null;
  codeRequestedAtUtc?: string | null;
  channelId?: string | null;
  failureReason?: string | null;
}

export interface StartNumberMigrationInput {
  countryCode: string;
  phoneNumber: string;
  wabaId: string;
  acknowledgeChatHistoryLoss: boolean;
}

@Injectable({ providedIn: 'root' })
export class NumberMigrationService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getList = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ListResultDto<NumberMigrationDto>>(
      { method: 'GET', url: '/api/auto-reach/number-migration' },
      { apiName: this.apiName, ...config },
    );

  start = (input: StartNumberMigrationInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, NumberMigrationDto>(
      { method: 'POST', url: '/api/auto-reach/number-migration/start', body: input },
      { apiName: this.apiName, ...config },
    );

  requestCode = (id: string, method: VerificationCodeMethod, config?: Partial<Rest.Config>) =>
    this.restService.request<any, NumberMigrationDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/number-migration/${id}/request-code`,
        body: { method },
      },
      { apiName: this.apiName, ...config },
    );

  verify = (
    id: string,
    input: { code: string; twoStepPin: string; businessPortfolioId?: string },
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, NumberMigrationDto>(
      { method: 'POST', url: `/api/auto-reach/number-migration/${id}/verify`, body: input },
      { apiName: this.apiName, ...config },
    );
}
