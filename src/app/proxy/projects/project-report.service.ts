import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

import { ProjectStage } from './project.service';

export interface ProjectFunnelStageDto {
  stage: ProjectStage;
  projects: number;
  valueInPaise: number;
}

export interface ProjectWinRateDto {
  won: number;
  lost: number;
  /** Won ÷ (won + lost); null with none closed. */
  winRate?: number | null;
  wonValueInPaise: number;
}

export interface ProjectBrandLossDto {
  brandId: string;
  brand: string;
  projects: number;
  enquiries: number;
  valueInPaise: number;
}

export interface ProjectCategoryLossDto {
  category: string;
  projects: number;
}

export interface ProjectReportDto {
  fromUtc: string;
  toUtc: string;
  funnel: ProjectFunnelStageDto[];
  specifiedIn: ProjectWinRateDto;
  notSpecifiedIn: ProjectWinRateDto;
  lossesByBrand: ProjectBrandLossDto[];
  lossesByCategory: ProjectCategoryLossDto[];
}

/** The project reports: funnel, specified-in win rate, losses by brand and category. Needs "see all projects". */
@Injectable({ providedIn: 'root' })
export class ProjectReportService {
  private readonly rest = inject(RestService);
  apiName = 'Default';

  get = (input: { fromUtc?: string; toUtc?: string }, config?: Partial<Rest.Config>) =>
    this.rest.request<void, ProjectReportDto>(
      {
        method: 'GET',
        url: '/api/auto-reach/project-report',
        params: { fromUtc: input.fromUtc, toUtc: input.toUtc },
      },
      { apiName: this.apiName, ...config },
    );
}
