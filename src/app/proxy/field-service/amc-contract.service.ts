import { Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PagedResultDto } from '@abp/ng.core';
import {
  AmcContractDto,
  CompleteAmcVisitDto,
  CreateAmcContractDto,
  GetAmcContractsInput,
  RenewAmcContractDto,
} from './field-service.models';

@Injectable({
  providedIn: 'root',
})
export class AmcContractService {
  private readonly restService = inject(RestService);
  apiName = 'AutoReach';

  getList(input: GetAmcContractsInput, config?: Partial<Rest.Config>): Observable<PagedResultDto<AmcContractDto>> {
    return this.restService.request<any, PagedResultDto<AmcContractDto>>(
      {
        method: 'GET',
        url: '/api/app/amc-contract',
        params: {
          filter: input.filter,
          status: input.status,
          contractType: input.contractType,
          customerId: input.customerId,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );
  }

  get(id: string, config?: Partial<Rest.Config>): Observable<AmcContractDto> {
    return this.restService.request<any, AmcContractDto>(
      {
        method: 'GET',
        url: `/api/app/amc-contract/${id}`,
      },
      { apiName: this.apiName, ...config },
    );
  }

  create(input: CreateAmcContractDto, config?: Partial<Rest.Config>): Observable<AmcContractDto> {
    return this.restService.request<any, AmcContractDto>(
      {
        method: 'POST',
        url: '/api/app/amc-contract',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
  }

  completeVisit(id: string, input: CompleteAmcVisitDto, config?: Partial<Rest.Config>): Observable<AmcContractDto> {
    return this.restService.request<any, AmcContractDto>(
      {
        method: 'POST',
        url: `/api/app/amc-contract/${id}/complete-visit`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
  }

  renew(id: string, input: RenewAmcContractDto, config?: Partial<Rest.Config>): Observable<AmcContractDto> {
    return this.restService.request<any, AmcContractDto>(
      {
        method: 'POST',
        url: `/api/app/amc-contract/${id}/renew`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
  }

  terminate(id: string, config?: Partial<Rest.Config>): Observable<AmcContractDto> {
    return this.restService.request<any, AmcContractDto>(
      {
        method: 'POST',
        url: `/api/app/amc-contract/${id}/terminate`,
      },
      { apiName: this.apiName, ...config },
    );
  }
}
