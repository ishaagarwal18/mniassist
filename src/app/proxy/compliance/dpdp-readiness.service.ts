import { Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export interface DpdpProfileDto {
  legalName?: string | null;
  address?: string | null;
  grievanceOfficerName?: string | null;
  grievanceEmail?: string | null;
  grievancePhone?: string | null;
  /** One per line. */
  purposes?: string | null;
  /** One per line. */
  processors?: string | null;
  noticeUrl?: string | null;
  legalReviewedOn?: string | null;
}

export type ReadinessStatus = 'Ready' | 'Gap' | 'Review';

export interface ReadinessCheckDto {
  key: string;
  title: string;
  status: ReadinessStatus;
  detail: string;
  section?: string | null;
}

export interface DpdpReadinessDto {
  profile: DpdpProfileDto;
  checks: ReadinessCheckDto[];
  ready: number;
  gaps: number;
  needsReview: number;
  noticeDraft: string;
  /** The same draft by language (en, hi, mr). Hindi and Marathi are machine-written: review before use. */
  noticeDrafts: Record<string, string>;
}

/** M5: DPDP readiness. */
@Injectable({ providedIn: 'root' })
export class DpdpReadinessService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  get = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, DpdpReadinessDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/dpdp-readiness',
      },
      { apiName: this.apiName, ...config },
    );

  updateProfile = (input: DpdpProfileDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, DpdpProfileDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/dpdp-readiness/profile',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
