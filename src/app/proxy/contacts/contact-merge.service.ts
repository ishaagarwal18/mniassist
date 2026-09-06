import type {
  ContactMergeDto,
  ContactMergePreviewDto,
  ContactTimelineEntryDto,
  ContactTimelineRequestDto,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ContactMergeService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getTimeline = (
    contactId: string,
    input: ContactTimelineRequestDto,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, ListResultDto<ContactTimelineEntryDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/contact-merge/timeline/${contactId}`,
        params: {
          fromUtc: input.fromUtc,
          toUtc: input.toUtc,
          kinds: input.kinds,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  merge = (input: ContactMergeDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ContactMergePreviewDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/contact-merge/merge',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  previewMerge = (input: ContactMergeDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ContactMergePreviewDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/contact-merge/preview-merge',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
