import { PagedResultDto, RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export enum DealRegistrationStatus {
  Requested = 0,
  Approved = 1,
  Rejected = 2,
  Expired = 3,
  Won = 4,
  Lost = 5,
}

export enum SpaMode {
  ClaimBack = 0,
  BuySide = 1,
}

export enum SpaStatus {
  Requested = 0,
  Approved = 1,
  PartlyApproved = 2,
  Rejected = 3,
  Expired = 4,
  Cancelled = 5,
}

export enum SpaResaleRule {
  Fixed = 0,
  Floor = 1,
  MaxDiscount = 2,
}

export enum OemClaimPeriod {
  Monthly = 0,
  Quarterly = 1,
}

export enum SpaRequestFormat {
  Excel = 0,
  Pdf = 1,
}

export interface OemSupplierDto {
  supplierId: string;
  name: string;
  isOem: boolean;
  claimPeriod: OemClaimPeriod;
  claimDeadlineDays?: number | null;
  openSpas: number;
}

export interface UpdateOemSettingsInput {
  isOem: boolean;
  claimPeriod: OemClaimPeriod;
  claimDeadlineDays?: number | null;
}

export interface GetDealRegistrationsInput {
  supplierId?: string | null;
  status?: DealRegistrationStatus | null;
  enquiryId?: string | null;
  projectId?: string | null;
  filter?: string | null;
  skipCount?: number;
  maxResultCount?: number;
}

export interface SaveDealRegistrationInput {
  supplierId: string;
  oemReference?: string | null;
  customerAccountId: string;
  enquiryId?: string | null;
  projectId?: string | null;
  productsSummary?: string | null;
  estimatedValueInPaise?: number | null;
  registeredOn: string;
  expiresOn?: string | null;
  note?: string | null;
  ownerUserId?: string | null;
}

export interface DealRegistrationDto {
  id: string;
  reference: string;
  supplierId: string;
  supplierName: string;
  oemReference?: string | null;
  customerAccountId: string;
  customerName: string;
  enquiryId?: string | null;
  enquiryReference?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  productsSummary?: string | null;
  estimatedValueInPaise?: number | null;
  registeredOn: string;
  expiresOn?: string | null;
  daysToExpiry?: number | null;
  status: DealRegistrationStatus;
  ownerUserId: string;
  note?: string | null;
  spas: number;
}

export interface GetSpasInput {
  supplierId?: string | null;
  status?: SpaStatus | null;
  customerAccountId?: string | null;
  enquiryId?: string | null;
  projectId?: string | null;
  dealRegistrationId?: string | null;
  expiringWithinDays?: number | null;
  filter?: string | null;
  skipCount?: number;
  maxResultCount?: number;
}

export interface SaveSpaLineInput {
  partNumber: string;
  description?: string | null;
  productId?: string | null;
  requestedQty: number;
  normalBuyInPaise: number;
  targetBuyInPaise?: number | null;
  resaleRule: SpaResaleRule;
  /** Paise for Fixed and Floor; basis points for Max discount. */
  resaleValue?: number | null;
}

export interface SaveSpaInput {
  supplierId: string;
  oemReference?: string | null;
  mode: SpaMode;
  dealRegistrationId?: string | null;
  customerAccountId?: string | null;
  projectId?: string | null;
  enquiryId?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  documentId?: string | null;
  note?: string | null;
  ownerUserId?: string | null;
  lines: SaveSpaLineInput[];
}

export interface SpaLineDecisionInput {
  lineId: string;
  approvedQty: number;
  specialBuyInPaise?: number | null;
  resaleRule: SpaResaleRule;
  resaleValue?: number | null;
}

export interface RecordSpaDecisionInput {
  oemReference?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  documentId?: string | null;
  lines: SpaLineDecisionInput[];
}

export interface SpaListItemDto {
  id: string;
  reference: string;
  supplierId: string;
  supplierName: string;
  oemReference?: string | null;
  mode: SpaMode;
  status: SpaStatus;
  customerAccountId?: string | null;
  customerName?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  enquiryId?: string | null;
  enquiryReference?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  daysToExpiry?: number | null;
  lineCount: number;
  approvedSupportInPaise: number;
  remainingQty: number;
}

export interface SpaLineDto {
  id: string;
  order: number;
  partNumber: string;
  description?: string | null;
  productId?: string | null;
  requestedQty: number;
  approvedQty: number;
  usedQty: number;
  remainingQty: number;
  normalBuyInPaise: number;
  targetBuyInPaise?: number | null;
  specialBuyInPaise?: number | null;
  supportPerUnitInPaise: number;
  resaleRule: SpaResaleRule;
  resaleValue?: number | null;
}

export interface SpaDto extends SpaListItemDto {
  dealRegistrationId?: string | null;
  dealRegistrationReference?: string | null;
  documentId?: string | null;
  note?: string | null;
  ownerUserId: string;
  decidedAtUtc?: string | null;
  lines: SpaLineDto[];
}

/** Deals registered with an OEM. */
@Injectable({ providedIn: 'root' })
export class DealRegistrationService {
  private readonly rest = inject(RestService);
  apiName = 'Default';

  getList = (input: GetDealRegistrationsInput, config?: Partial<Rest.Config>) =>
    this.rest.request<void, PagedResultDto<DealRegistrationDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/deal-registration',
        params: {
          supplierId: input.supplierId ?? undefined,
          status: input.status ?? undefined,
          enquiryId: input.enquiryId ?? undefined,
          projectId: input.projectId ?? undefined,
          filter: input.filter ?? undefined,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<void, DealRegistrationDto>(
      { method: 'GET', url: `/api/auto-reach/deal-registration/${id}` },
      { apiName: this.apiName, ...config },
    );

  create = (input: SaveDealRegistrationInput, config?: Partial<Rest.Config>) =>
    this.rest.request<SaveDealRegistrationInput, DealRegistrationDto>(
      { method: 'POST', url: '/api/auto-reach/deal-registration', body: input },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: SaveDealRegistrationInput, config?: Partial<Rest.Config>) =>
    this.rest.request<SaveDealRegistrationInput, DealRegistrationDto>(
      { method: 'PUT', url: `/api/auto-reach/deal-registration/${id}`, body: input },
      { apiName: this.apiName, ...config },
    );

  setStatus = (
    id: string,
    input: {
      status: DealRegistrationStatus;
      oemReference?: string | null;
      expiresOn?: string | null;
    },
    config?: Partial<Rest.Config>,
  ) =>
    this.rest.request<typeof input, DealRegistrationDto>(
      { method: 'POST', url: `/api/auto-reach/deal-registration/${id}/set-status`, body: input },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<void, void>(
      { method: 'DELETE', url: `/api/auto-reach/deal-registration/${id}` },
      { apiName: this.apiName, ...config },
    );
}

/** Special price agreements. */
@Injectable({ providedIn: 'root' })
export class SpaService {
  private readonly rest = inject(RestService);
  apiName = 'Default';

  getList = (input: GetSpasInput, config?: Partial<Rest.Config>) =>
    this.rest.request<void, PagedResultDto<SpaListItemDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/spa',
        params: {
          supplierId: input.supplierId ?? undefined,
          status: input.status ?? undefined,
          customerAccountId: input.customerAccountId ?? undefined,
          enquiryId: input.enquiryId ?? undefined,
          projectId: input.projectId ?? undefined,
          dealRegistrationId: input.dealRegistrationId ?? undefined,
          expiringWithinDays: input.expiringWithinDays ?? undefined,
          filter: input.filter ?? undefined,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<void, SpaDto>(
      { method: 'GET', url: `/api/auto-reach/spa/${id}` },
      { apiName: this.apiName, ...config },
    );

  getDraftFromEnquiry = (enquiryId: string, config?: Partial<Rest.Config>) =>
    this.rest.request<void, SaveSpaInput>(
      { method: 'GET', url: `/api/auto-reach/spa/draft-from-enquiry/${enquiryId}` },
      { apiName: this.apiName, ...config },
    );

  create = (input: SaveSpaInput, config?: Partial<Rest.Config>) =>
    this.rest.request<SaveSpaInput, SpaDto>(
      { method: 'POST', url: '/api/auto-reach/spa', body: input },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: SaveSpaInput, config?: Partial<Rest.Config>) =>
    this.rest.request<SaveSpaInput, SpaDto>(
      { method: 'PUT', url: `/api/auto-reach/spa/${id}`, body: input },
      { apiName: this.apiName, ...config },
    );

  getRequestPack = (id: string, format: SpaRequestFormat, config?: Partial<Rest.Config>) =>
    this.rest.request<void, Blob>(
      {
        method: 'GET',
        responseType: 'blob',
        headers: { Accept: 'application/octet-stream' },
        url: `/api/auto-reach/spa/${id}/request-pack`,
        params: { format },
      },
      { apiName: this.apiName, ...config },
    );

  recordDecision = (id: string, input: RecordSpaDecisionInput, config?: Partial<Rest.Config>) =>
    this.rest.request<RecordSpaDecisionInput, SpaDto>(
      { method: 'POST', url: `/api/auto-reach/spa/${id}/record-decision`, body: input },
      { apiName: this.apiName, ...config },
    );

  extend = (
    id: string,
    input: { validTo: string; oemReference?: string | null },
    config?: Partial<Rest.Config>,
  ) =>
    this.rest.request<typeof input, SpaDto>(
      { method: 'POST', url: `/api/auto-reach/spa/${id}/extend`, body: input },
      { apiName: this.apiName, ...config },
    );

  cancel = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<void, SpaDto>(
      { method: 'POST', url: `/api/auto-reach/spa/${id}/cancel` },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<void, void>(
      { method: 'DELETE', url: `/api/auto-reach/spa/${id}` },
      { apiName: this.apiName, ...config },
    );
}

/** Which suppliers are OEMs, and their claim terms. */
@Injectable({ providedIn: 'root' })
export class OemSettingsService {
  private readonly rest = inject(RestService);
  apiName = 'Default';

  getList = (config?: Partial<Rest.Config>) =>
    this.rest.request<void, OemSupplierDto[]>(
      { method: 'GET', url: '/api/auto-reach/oem-settings' },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: UpdateOemSettingsInput, config?: Partial<Rest.Config>) =>
    this.rest.request<UpdateOemSettingsInput, OemSupplierDto>(
      { method: 'PUT', url: `/api/auto-reach/oem-settings/${id}`, body: input },
      { apiName: this.apiName, ...config },
    );
}
