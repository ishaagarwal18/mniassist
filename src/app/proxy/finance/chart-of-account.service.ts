import { Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PagedResultDto } from '@abp/ng.core';
import {
  ChartOfAccountDto,
  CreateChartOfAccountDto,
  GetChartOfAccountsInput,
  UpdateChartOfAccountDto,
} from './chart-of-account.models';

@Injectable({
  providedIn: 'root',
})
export class ChartOfAccountService {
  private readonly restService = inject(RestService);
  apiName = 'AutoReach';

  getList(
    input: GetChartOfAccountsInput,
    config?: Partial<Rest.Config>,
  ): Observable<PagedResultDto<ChartOfAccountDto>> {
    return this.restService.request<any, PagedResultDto<ChartOfAccountDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/chart-of-account',
        params: {
          filter: input.filter,
          category: input.category,
          subCategory: input.subCategory,
          isActive: input.isActive,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );
  }

  get(id: string, config?: Partial<Rest.Config>): Observable<ChartOfAccountDto> {
    return this.restService.request<any, ChartOfAccountDto>(
      {
        method: 'GET',
        url: `/api/auto-reach/chart-of-account/${id}`,
      },
      { apiName: this.apiName, ...config },
    );
  }

  create(
    input: CreateChartOfAccountDto,
    config?: Partial<Rest.Config>,
  ): Observable<ChartOfAccountDto> {
    return this.restService.request<any, ChartOfAccountDto>(
      {
        method: 'POST',
        url: '/api/auto-reach/chart-of-account',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
  }

  update(
    id: string,
    input: UpdateChartOfAccountDto,
    config?: Partial<Rest.Config>,
  ): Observable<ChartOfAccountDto> {
    return this.restService.request<any, ChartOfAccountDto>(
      {
        method: 'PUT',
        url: `/api/auto-reach/chart-of-account/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
  }

  delete(id: string, config?: Partial<Rest.Config>): Observable<void> {
    return this.restService.request<any, void>(
      {
        method: 'DELETE',
        url: `/api/auto-reach/chart-of-account/${id}`,
      },
      { apiName: this.apiName, ...config },
    );
  }

  seedStandardCoa(config?: Partial<Rest.Config>): Observable<number> {
    return this.restService.request<any, number>(
      {
        method: 'POST',
        url: '/api/auto-reach/chart-of-account/seed-standard-coa',
      },
      { apiName: this.apiName, ...config },
    );
  }
}
