import { Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PagedResultDto } from '@abp/ng.core';
import {
  AssignFieldServiceTicketDto,
  CreateFieldServiceTicketDto,
  FieldServiceTicketDto,
  GetFieldServiceTicketsInput,
  RecordSpareConsumedDto,
  ResolveFieldServiceTicketDto,
} from './field-service.models';

@Injectable({
  providedIn: 'root',
})
export class FieldServiceTicketService {
  private readonly restService = inject(RestService);
  apiName = 'AutoReach';

  getList(input: GetFieldServiceTicketsInput, config?: Partial<Rest.Config>): Observable<PagedResultDto<FieldServiceTicketDto>> {
    return this.restService.request<any, PagedResultDto<FieldServiceTicketDto>>(
      {
        method: 'GET',
        url: '/api/app/field-service-ticket',
        params: {
          filter: input.filter,
          status: input.status,
          priority: input.priority,
          ticketType: input.ticketType,
          customerId: input.customerId,
          equipmentSerialNumber: input.equipmentSerialNumber,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );
  }

  get(id: string, config?: Partial<Rest.Config>): Observable<FieldServiceTicketDto> {
    return this.restService.request<any, FieldServiceTicketDto>(
      {
        method: 'GET',
        url: `/api/app/field-service-ticket/${id}`,
      },
      { apiName: this.apiName, ...config },
    );
  }

  create(input: CreateFieldServiceTicketDto, config?: Partial<Rest.Config>): Observable<FieldServiceTicketDto> {
    return this.restService.request<any, FieldServiceTicketDto>(
      {
        method: 'POST',
        url: '/api/app/field-service-ticket',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
  }

  assign(id: string, input: AssignFieldServiceTicketDto, config?: Partial<Rest.Config>): Observable<FieldServiceTicketDto> {
    return this.restService.request<any, FieldServiceTicketDto>(
      {
        method: 'POST',
        url: `/api/app/field-service-ticket/${id}/assign`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
  }

  recordSpare(id: string, input: RecordSpareConsumedDto, config?: Partial<Rest.Config>): Observable<FieldServiceTicketDto> {
    return this.restService.request<any, FieldServiceTicketDto>(
      {
        method: 'POST',
        url: `/api/app/field-service-ticket/${id}/record-spare`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
  }

  resolve(id: string, input: ResolveFieldServiceTicketDto, config?: Partial<Rest.Config>): Observable<FieldServiceTicketDto> {
    return this.restService.request<any, FieldServiceTicketDto>(
      {
        method: 'POST',
        url: `/api/app/field-service-ticket/${id}/resolve`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
  }

  close(id: string, config?: Partial<Rest.Config>): Observable<FieldServiceTicketDto> {
    return this.restService.request<any, FieldServiceTicketDto>(
      {
        method: 'POST',
        url: `/api/app/field-service-ticket/${id}/close`,
      },
      { apiName: this.apiName, ...config },
    );
  }
}
