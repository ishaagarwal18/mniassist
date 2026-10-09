import { Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PagedResultDto } from '@abp/ng.core';
import {
  BillOfMaterialDto,
  CreateBillOfMaterialDto,
  GetBillOfMaterialsInput,
  UpdateBillOfMaterialDto,
} from './bill-of-material.models';

@Injectable({
  providedIn: 'root',
})
export class BillOfMaterialService {
  private readonly restService = inject(RestService);
  apiName = 'AutoReach';

  getList(input: GetBillOfMaterialsInput, config?: Partial<Rest.Config>): Observable<PagedResultDto<BillOfMaterialDto>> {
    return this.restService.request<any, PagedResultDto<BillOfMaterialDto>>(
      {
        method: 'GET',
        url: '/api/app/bill-of-material',
        params: {
          filter: input.filter,
          status: input.status,
          bomType: input.bomType,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );
  }

  get(id: string, config?: Partial<Rest.Config>): Observable<BillOfMaterialDto> {
    return this.restService.request<any, BillOfMaterialDto>(
      {
        method: 'GET',
        url: `/api/app/bill-of-material/${id}`,
      },
      { apiName: this.apiName, ...config },
    );
  }

  create(input: CreateBillOfMaterialDto, config?: Partial<Rest.Config>): Observable<BillOfMaterialDto> {
    return this.restService.request<any, BillOfMaterialDto>(
      {
        method: 'POST',
        url: '/api/app/bill-of-material',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
  }

  update(id: string, input: UpdateBillOfMaterialDto, config?: Partial<Rest.Config>): Observable<BillOfMaterialDto> {
    return this.restService.request<any, BillOfMaterialDto>(
      {
        method: 'PUT',
        url: `/api/app/bill-of-material/${id}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
  }

  activate(id: string, config?: Partial<Rest.Config>): Observable<BillOfMaterialDto> {
    return this.restService.request<any, BillOfMaterialDto>(
      {
        method: 'POST',
        url: `/api/app/bill-of-material/${id}/activate`,
      },
      { apiName: this.apiName, ...config },
    );
  }

  obsolete(id: string, config?: Partial<Rest.Config>): Observable<BillOfMaterialDto> {
    return this.restService.request<any, BillOfMaterialDto>(
      {
        method: 'POST',
        url: `/api/app/bill-of-material/${id}/obsolete`,
      },
      { apiName: this.apiName, ...config },
    );
  }

  delete(id: string, config?: Partial<Rest.Config>): Observable<void> {
    return this.restService.request<any, void>(
      {
        method: 'DELETE',
        url: `/api/app/bill-of-material/${id}`,
      },
      { apiName: this.apiName, ...config },
    );
  }
}
