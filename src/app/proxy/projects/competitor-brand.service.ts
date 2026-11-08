import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export interface CompetitorBrandDto {
  id: string;
  name: string;
  makes: string[];
  notes?: string | null;
  isActive: boolean;
}

export interface SaveCompetitorBrandInput {
  name: string;
  makes: string[];
  notes?: string | null;
  isActive: boolean;
}

export interface ProjectSettingsDto {
  ourBrands: string[];
  categories: string[];
  /** The makes in the product list, offered as our brands. Read only. */
  catalogueMakes?: string[];
}

/** The workspace's competitor brands and project settings (our brands, specification categories). */
@Injectable({ providedIn: 'root' })
export class CompetitorBrandService {
  private restService = inject(RestService);
  apiName = 'AutoReach';
  private readonly base = '/api/auto-reach/competitor-brand';

  getActive = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, CompetitorBrandDto[]>(
      { method: 'GET', url: `${this.base}/active` },
      { apiName: this.apiName, ...config },
    );

  getList = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, CompetitorBrandDto[]>(
      { method: 'GET', url: this.base },
      { apiName: this.apiName, ...config },
    );

  create = (input: SaveCompetitorBrandInput, config?: Partial<Rest.Config>) =>
    this.restService.request<SaveCompetitorBrandInput, CompetitorBrandDto>(
      { method: 'POST', url: this.base, body: input },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: SaveCompetitorBrandInput, config?: Partial<Rest.Config>) =>
    this.restService.request<SaveCompetitorBrandInput, CompetitorBrandDto>(
      { method: 'PUT', url: `${this.base}/${id}`, body: input },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      { method: 'DELETE', url: `${this.base}/${id}` },
      { apiName: this.apiName, ...config },
    );

  addCommon = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, number>(
      { method: 'POST', url: `${this.base}/common` },
      { apiName: this.apiName, ...config },
    );

  getSettings = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ProjectSettingsDto>(
      { method: 'GET', url: `${this.base}/settings` },
      { apiName: this.apiName, ...config },
    );

  updateSettings = (input: ProjectSettingsDto, config?: Partial<Rest.Config>) =>
    this.restService.request<ProjectSettingsDto, ProjectSettingsDto>(
      { method: 'PUT', url: `${this.base}/settings`, body: input },
      { apiName: this.apiName, ...config },
    );
}
