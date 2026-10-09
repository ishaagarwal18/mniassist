import { Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PagedResultDto } from '@abp/ng.core';
import {
  CreateJournalEntryDto,
  GetJournalEntriesInput,
  JournalEntryDto,
} from './journal-entry.models';

@Injectable({
  providedIn: 'root',
})
export class JournalEntryService {
  private readonly restService = inject(RestService);
  apiName = 'AutoReach';

  getList(input: GetJournalEntriesInput, config?: Partial<Rest.Config>): Observable<PagedResultDto<JournalEntryDto>> {
    return this.restService.request<any, PagedResultDto<JournalEntryDto>>(
      {
        method: 'GET',
        url: '/api/app/journal-entry',
        params: {
          filter: input.filter,
          voucherType: input.voucherType,
          status: input.status,
          fromDateUtc: input.fromDateUtc,
          toDateUtc: input.toDateUtc,
          sorting: input.sorting,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );
  }

  get(id: string, config?: Partial<Rest.Config>): Observable<JournalEntryDto> {
    return this.restService.request<any, JournalEntryDto>(
      {
        method: 'GET',
        url: `/api/app/journal-entry/${id}`,
      },
      { apiName: this.apiName, ...config },
    );
  }

  create(input: CreateJournalEntryDto, config?: Partial<Rest.Config>): Observable<JournalEntryDto> {
    return this.restService.request<any, JournalEntryDto>(
      {
        method: 'POST',
        url: '/api/app/journal-entry',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
  }

  post(id: string, config?: Partial<Rest.Config>): Observable<JournalEntryDto> {
    return this.restService.request<any, JournalEntryDto>(
      {
        method: 'POST',
        url: `/api/app/journal-entry/${id}/post`,
      },
      { apiName: this.apiName, ...config },
    );
  }

  cancel(id: string, config?: Partial<Rest.Config>): Observable<JournalEntryDto> {
    return this.restService.request<any, JournalEntryDto>(
      {
        method: 'POST',
        url: `/api/app/journal-entry/${id}/cancel`,
      },
      { apiName: this.apiName, ...config },
    );
  }
}
