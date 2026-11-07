import { Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

import type { LifecycleStage, RiskBand } from './obsolescence.service';
import type { InstalledAssetDto } from './models';

export enum MachineCriticality {
  Low = 0,
  Medium = 1,
  High = 2,
}

export enum ComponentSource {
  Typed = 0,
  Import = 1,
  Nameplate = 2,
  BomCopy = 3,
}

export interface InstalledComponentDto {
  id: string;
  installedAssetId: string;
  position?: string | null;
  productId?: string | null;
  partNumber: string;
  make?: string | null;
  series?: string | null;
  description: string;
  quantity: number;
  firmware?: string | null;
  installedOn?: string | null;
  source: ComponentSource;
  migratedOn?: string | null;
  /** Null while the part is active. */
  stage?: LifecycleStage | null;
  stageEffectiveOn?: string | null;
  stageAnnounced?: boolean;
  riskScore?: number | null;
  riskBand?: RiskBand | null;
  replacementLabel?: string | null;
}

export interface CreateUpdateInstalledComponentDto {
  partNumber: string;
  /** Blank takes the catalogue product's name. */
  description?: string | null;
  make?: string | null;
  series?: string | null;
  quantity: number;
  position?: string | null;
  firmware?: string | null;
  installedOn?: string | null;
  source?: ComponentSource;
}

export interface ComponentImportResultDto {
  added: number;
  updated: number;
  problems: string[];
}

export interface ComponentDraftDto {
  partNumber?: string | null;
  description?: string | null;
  make?: string | null;
  series?: string | null;
  serialNumber?: string | null;
  ratings?: string | null;
  note?: string | null;
  productId?: string | null;
}

/** The parts inside installed machines, for the obsolescence radar. */
@Injectable({ providedIn: 'root' })
export class InstalledComponentService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getList = (assetId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InstalledComponentDto[]>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/installed-component',
        params: { assetId },
      },
      { apiName: this.apiName, ...config },
    );

  create = (
    assetId: string,
    input: CreateUpdateInstalledComponentDto,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, InstalledComponentDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/installed-component',
        params: { assetId },
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: CreateUpdateInstalledComponentDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InstalledComponentDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/installed-component/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      { method: 'DELETE', url: `/api/auto-reach/installed-component/${id}` },
      { apiName: this.apiName, ...config },
    );

  /** Multipart form: `file`, and `assetId` to put every row on one machine. */
  import = (body: FormData, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ComponentImportResultDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/installed-component/import',
        body,
      },
      { apiName: this.apiName, ...config },
    );

  /** Multipart form with the photo as `file`. Saves nothing. */
  readNameplate = (assetId: string, body: FormData, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ComponentDraftDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/installed-component/read-nameplate/${assetId}`,
        body,
      },
      { apiName: this.apiName, ...config },
    );

  copyFromBom = (assetId: string, bomId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, number>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/installed-component/copy-from-bom',
        params: { assetId, bomId },
      },
      { apiName: this.apiName, ...config },
    );

  markChecked = (assetId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InstalledAssetDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/installed-component/mark-checked/${assetId}`,
      },
      { apiName: this.apiName, ...config },
    );

  setCriticality = (
    assetId: string,
    criticality: MachineCriticality,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, InstalledAssetDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/installed-component/set-criticality/${assetId}`,
        body: { criticality },
      },
      { apiName: this.apiName, ...config },
    );
}
