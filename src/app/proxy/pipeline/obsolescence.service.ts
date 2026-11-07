import { PagedResultDto, Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

/** Where a product or series is in its maker's life cycle; a higher value is worse. */
export enum LifecycleStage {
  Active = 0,
  PhaseOut = 1,
  LastBuy = 2,
  Discontinued = 3,
  EndOfSupport = 4,
}

export enum ReplacementRelation {
  DirectSwap = 0,
  NeedsAdapter = 1,
  NeedsReengineering = 2,
}

export enum RiskBand {
  Low = 0,
  Medium = 1,
  High = 2,
}

export enum MigrationState {
  None = 0,
  Notified = 1,
  EnquiryOpen = 2,
  Quoted = 3,
  Won = 4,
  Lost = 5,
  Dismissed = 6,
}

export enum RadarView {
  Open = 0,
  Announced = 1,
  Dismissed = 2,
}

export interface LifecycleRuleDto {
  id: string;
  make: string;
  series?: string | null;
  partNumber?: string | null;
  stage: LifecycleStage;
  effectiveOn: string;
  lastBuyOn?: string | null;
  replacementProductId?: string | null;
  replacementPartNumber?: string | null;
  replacementSeries?: string | null;
  relation: ReplacementRelation;
  note?: string | null;
  sourceReference?: string | null;
  isAnnounced: boolean;
  currentReplacement?: string | null;
  replacementProblem: boolean;
  atRiskComponents: number;
  lastModificationTime?: string | null;
}

export interface GetLifecycleRulesInput {
  filter?: string | null;
  stage?: LifecycleStage | null;
  problemsOnly?: boolean;
  skipCount?: number;
  maxResultCount?: number;
}

export interface CreateUpdateLifecycleRuleDto {
  make: string;
  series?: string | null;
  partNumber?: string | null;
  stage: LifecycleStage;
  effectiveOn: string;
  lastBuyOn?: string | null;
  replacementPartNumber?: string | null;
  replacementSeries?: string | null;
  relation: ReplacementRelation;
  note?: string | null;
  sourceReference?: string | null;
}

export interface LifecycleSaveResultDto {
  rule?: LifecycleRuleDto | null;
  atRiskComponents: number;
  atRiskSites: number;
  announcedComponents: number;
}

export interface LifecycleImportRowDto {
  row: number;
  make: string;
  series?: string | null;
  partNumber?: string | null;
  stage: LifecycleStage;
  effectiveOn: string;
  lastBuyOn?: string | null;
  replacement?: string | null;
  replacementInCatalogue: boolean;
  relation: ReplacementRelation;
  updates: boolean;
  components: number;
  sites: number;
}

export interface LifecycleImportPreviewDto {
  rows: LifecycleImportRowDto[];
  problems: string[];
  componentsAffected: number;
  sitesAffected: number;
}

export interface LifecycleImportResultDto {
  added: number;
  updated: number;
  problems: string[];
  atRiskComponents: number;
  atRiskSites: number;
}

export interface GetRadarInput {
  make?: string | null;
  series?: string | null;
  stage?: LifecycleStage | null;
  band?: RiskBand | null;
  city?: string | null;
  ownerUserId?: string | null;
  contactId?: string | null;
  amcOnly?: boolean;
  notNotified?: boolean;
  view?: RadarView;
  filter?: string | null;
  skipCount?: number;
  maxResultCount?: number;
}

export interface RadarSummaryDto {
  phaseOut: number;
  lastBuy: number;
  discontinued: number;
  endOfSupport: number;
  announced: number;
  high: number;
  medium: number;
  low: number;
  sites: number;
  dismissed: number;
  estimatedValueInPaise: number;
}

export interface RadarRowDto {
  id: string;
  componentId: string;
  installedAssetId: string;
  contactId: string;
  accountName?: string | null;
  siteName?: string | null;
  siteCity?: string | null;
  machineDescription: string;
  machineSerial?: string | null;
  partNumber: string;
  componentDescription: string;
  make?: string | null;
  series?: string | null;
  position?: string | null;
  quantity: number;
  stage: LifecycleStage;
  effectiveOn: string;
  lastBuyOn?: string | null;
  isAnnounced: boolean;
  score: number;
  band: RiskBand;
  replacementProductId?: string | null;
  replacementLabel?: string | null;
  replacementProblem: boolean;
  estimatedValueInPaise: number;
  lastServicedOn?: string | null;
  amcEndsOn?: string | null;
  state: MigrationState;
  dismissedReason?: string | null;
  enquiryId?: string | null;
  ownerUserId?: string | null;
  ownerName?: string | null;
}

export interface RadarResultDto {
  totalCount: number;
  items: RadarRowDto[];
  summary: RadarSummaryDto;
}

export interface ScanResultDto {
  atRiskComponents: number;
  atRiskSites: number;
  announcedComponents: number;
}

export interface RadarPersonDto {
  userId: string;
  name: string;
}

/** Makers' life-cycle notices for parts and series. Saving one re-scores the installed components it touches. */
@Injectable({ providedIn: 'root' })
export class LifecycleRuleService {
  private restService = inject(RestService);
  apiName = 'Default';

  getList = (input: GetLifecycleRulesInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<LifecycleRuleDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/lifecycle-rule',
        params: {
          filter: input.filter,
          stage: input.stage,
          problemsOnly: input.problemsOnly,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, LifecycleRuleDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/lifecycle-rule/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  create = (input: CreateUpdateLifecycleRuleDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, LifecycleSaveResultDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/lifecycle-rule',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: CreateUpdateLifecycleRuleDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, LifecycleSaveResultDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/lifecycle-rule/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, LifecycleSaveResultDto>(
      {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/lifecycle-rule/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  /** FormData with `file`: says what each row would change and touch; saves nothing. */
  previewImport = (body: FormData, config?: Partial<Rest.Config>) =>
    this.restService.request<any, LifecycleImportPreviewDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/lifecycle-rule/preview-import',
        body,
      },
      { apiName: this.apiName, ...config },
    );

  import = (body: FormData, config?: Partial<Rest.Config>) =>
    this.restService.request<any, LifecycleImportResultDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/lifecycle-rule/import',
        body,
      },
      { apiName: this.apiName, ...config },
    );
}

/** The obsolescence radar: installed components at risk from a phase-out, and the work on them. */
@Injectable({ providedIn: 'root' })
export class ObsolescenceService {
  private restService = inject(RestService);
  apiName = 'Default';

  getRadar = (input: GetRadarInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, RadarResultDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/obsolescence/radar',
        params: {
          make: input.make,
          series: input.series,
          stage: input.stage,
          band: input.band,
          city: input.city,
          ownerUserId: input.ownerUserId,
          contactId: input.contactId,
          amcOnly: input.amcOnly,
          notNotified: input.notNotified,
          view: input.view,
          filter: input.filter,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  dismiss = (ids: string[], reason: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, number>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/obsolescence/dismiss',
        body: { ids, reason },
      },
      { apiName: this.apiName, ...config },
    );

  restore = (ids: string[], config?: Partial<Rest.Config>) =>
    this.restService.request<any, number>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/obsolescence/restore',
        body: { ids },
      },
      { apiName: this.apiName, ...config },
    );

  assign = (ids: string[], userId: string | null, config?: Partial<Rest.Config>) =>
    this.restService.request<any, number>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/obsolescence/assign',
        body: { ids, userId },
      },
      { apiName: this.apiName, ...config },
    );

  rescan = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ScanResultDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/obsolescence/rescan',
      },
      { apiName: this.apiName, ...config },
    );

  getPeople = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, RadarPersonDto[]>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/obsolescence/people',
      },
      { apiName: this.apiName, ...config },
    );
}
