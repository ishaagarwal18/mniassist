import { Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export interface FieldAssetCardDto {
  id: string;
  description: string;
  make?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  site?: string | null;
  commissionedOn?: string | null;
  warrantyEndsOn?: string | null;
  amcEndsOn?: string | null;
  lastServicedOn?: string | null;
}

export interface FieldChecklistItemDto {
  label: string;
  done: boolean;
}

export interface FieldPhotoDto {
  id: string;
  contentType: string;
}

export interface FieldVisitDto {
  clientVisitId: string;
  ticketId: string;
  arrivedAtUtc: string;
  completedAtUtc?: string | null;
  notes?: string | null;
  checklist: FieldChecklistItemDto[];
  photos: FieldPhotoDto[];
  state: 'Open' | 'AwaitingSignOff' | 'SignedOff';
  /** The engineer who made the visit; filled in the office view only. */
  engineerName?: string | null;
  signedByName?: string | null;
  signedOffAtUtc?: string | null;
}

export interface FieldJobDto {
  ticketId: string;
  reference: string;
  subject: string;
  description?: string | null;
  priority: string;
  status: string;
  dueAtUtc?: string | null;
  contactId: string;
  customerName?: string | null;
  companyName?: string | null;
  phone?: string | null;
  asset?: FieldAssetCardDto | null;
  visit?: FieldVisitDto | null;
}

export interface FieldDayDto {
  generatedAtUtc: string;
  jobs: FieldJobDto[];
}

export interface SyncFieldVisitInput {
  clientVisitId: string;
  ticketId: string;
  arrivedAtUtc: string;
  completedAtUtc?: string | null;
  notes?: string | null;
  checklist: FieldChecklistItemDto[];
}

export interface SignOffRequestResultDto {
  sent: boolean;
  reason?: string | null;
  expiresAtUtc?: string | null;
}

/** M2: the field engineer's app. */
@Injectable({ providedIn: 'root' })
export class FieldServiceService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getMyDay = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, FieldDayDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/field-service/my-day',
      },
      { apiName: this.apiName, ...config },
    );

  syncVisit = (input: SyncFieldVisitInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, FieldVisitDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/field-service/sync-visit',
        body: input,
      },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  /** FormData with clientVisitId, photoId and file. */
  uploadPhoto = (form: FormData, config?: Partial<Rest.Config>) =>
    this.restService.request<any, FieldVisitDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/field-service/upload-photo',
        body: form,
      },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  getPhoto = (clientVisitId: string, photoId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, Blob>(
      {
        method: 'GET',
        responseType: 'blob',
        url: '/api/auto-reach/field-service/photo',
        params: { clientVisitId, photoId },
      },
      { apiName: this.apiName, ...config },
    );

  /** The office view: every engineer's visits to one ticket, newest first. */
  getVisitsForTicket = (ticketId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, FieldVisitDto[]>(
      {
        method: 'GET',
        url: `/api/auto-reach/field-service/visits-for-ticket/${ticketId}`,
      },
      { apiName: this.apiName, ...config },
    );

  requestSignOff = (clientVisitId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, SignOffRequestResultDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/field-service/request-sign-off/${clientVisitId}`,
      },
      { apiName: this.apiName, ...config },
    );

  confirmSignOff = (
    clientVisitId: string,
    input: { code: string; signedByName: string },
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, FieldVisitDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/field-service/confirm-sign-off/${clientVisitId}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
