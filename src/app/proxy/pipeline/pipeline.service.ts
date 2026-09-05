import type {
  CreateUpdateEnquiryDto,
  CreateUpdateInstalledAssetDto,
  CreateUpdateQuotationDto,
  EnquiryBoardColumnDto,
  EnquiryDetailDto,
  EnquiryDto,
  GetEnquiryBoardInput,
  GetEnquiryListInput,
  GetInstalledAssetListInput,
  GetQuotationListInput,
  GetReminderListInput,
  InstalledAssetDto,
  IssueQuotationInput,
  MoveEnquiryInput,
  QuotationDto,
  ReminderDto,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import type { ListResultDto, PagedResultDto } from '@abp/ng.core';
import { Injectable } from '@angular/core';

const api = '/api/auto-reach';

@Injectable({ providedIn: 'root' })
export class EnquiryService {
  apiName = 'AutoReach';
  private c = (config?: Partial<Rest.Config>) => ({ apiName: this.apiName, ...config });

  getList = (input: GetEnquiryListInput, config?: Partial<Rest.Config>) =>
    this.rest.request<any, PagedResultDto<EnquiryDto>>(
      { method: 'GET', url: `${api}/enquiry`, params: { ...input } },
      this.c(config),
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<any, EnquiryDto>(
      { method: 'GET', url: `${api}/enquiry/${id}` },
      this.c(config),
    );

  getDetail = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<any, EnquiryDetailDto>(
      { method: 'GET', url: `${api}/enquiry/${id}/detail` },
      this.c(config),
    );

  getBoard = (input: GetEnquiryBoardInput, config?: Partial<Rest.Config>) =>
    this.rest.request<any, ListResultDto<EnquiryBoardColumnDto>>(
      { method: 'GET', url: `${api}/enquiry/board`, params: { ...input } },
      this.c(config),
    );

  create = (input: CreateUpdateEnquiryDto, config?: Partial<Rest.Config>) =>
    this.rest.request<any, EnquiryDto>(
      { method: 'POST', url: `${api}/enquiry`, body: input },
      this.c(config),
    );

  update = (id: string, input: CreateUpdateEnquiryDto, config?: Partial<Rest.Config>) =>
    this.rest.request<any, EnquiryDto>(
      { method: 'PUT', url: `${api}/enquiry/${id}`, body: input },
      this.c(config),
    );

  move = (id: string, input: MoveEnquiryInput, config?: Partial<Rest.Config>) =>
    this.rest.request<any, EnquiryDto>(
      { method: 'POST', url: `${api}/enquiry/${id}/move`, body: input },
      this.c(config),
    );

  assign = (id: string, ownerUserId: string | undefined, config?: Partial<Rest.Config>) =>
    this.rest.request<any, EnquiryDto>(
      { method: 'POST', url: `${api}/enquiry/${id}/assign`, params: { ownerUserId } },
      this.c(config),
    );

  addNote = (id: string, note: string, config?: Partial<Rest.Config>) =>
    this.rest.request<any, EnquiryDto>(
      { method: 'POST', url: `${api}/enquiry/${id}/note`, params: { note } },
      this.c(config),
    );

  constructor(private rest: RestService) {}
}

@Injectable({ providedIn: 'root' })
export class QuotationService {
  apiName = 'AutoReach';
  private c = (config?: Partial<Rest.Config>) => ({ apiName: this.apiName, ...config });

  getList = (input: GetQuotationListInput, config?: Partial<Rest.Config>) =>
    this.rest.request<any, PagedResultDto<QuotationDto>>(
      { method: 'GET', url: `${api}/quotation`, params: { ...input } },
      this.c(config),
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<any, QuotationDto>(
      { method: 'GET', url: `${api}/quotation/${id}` },
      this.c(config),
    );

  create = (input: CreateUpdateQuotationDto, config?: Partial<Rest.Config>) =>
    this.rest.request<any, QuotationDto>(
      { method: 'POST', url: `${api}/quotation`, body: input },
      this.c(config),
    );

  update = (id: string, input: CreateUpdateQuotationDto, config?: Partial<Rest.Config>) =>
    this.rest.request<any, QuotationDto>(
      { method: 'PUT', url: `${api}/quotation/${id}`, body: input },
      this.c(config),
    );

  issue = (id: string, input: IssueQuotationInput, config?: Partial<Rest.Config>) =>
    this.rest.request<any, QuotationDto>(
      { method: 'POST', url: `${api}/quotation/${id}/issue`, body: input },
      this.c(config),
    );

  markWon = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<any, QuotationDto>(
      { method: 'POST', url: `${api}/quotation/${id}/mark-won` },
      this.c(config),
    );

  markLost = (id: string, reason: string, config?: Partial<Rest.Config>) =>
    this.rest.request<any, QuotationDto>(
      { method: 'POST', url: `${api}/quotation/${id}/mark-lost`, params: { reason } },
      this.c(config),
    );

  generatePdf = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<any, string>(
      { method: 'POST', url: `${api}/quotation/${id}/generate-pdf` },
      this.c(config),
    );

  constructor(private rest: RestService) {}
}

@Injectable({ providedIn: 'root' })
export class InstalledAssetService {
  apiName = 'AutoReach';
  private c = (config?: Partial<Rest.Config>) => ({ apiName: this.apiName, ...config });

  getList = (input: GetInstalledAssetListInput, config?: Partial<Rest.Config>) =>
    this.rest.request<any, PagedResultDto<InstalledAssetDto>>(
      { method: 'GET', url: `${api}/installed-asset`, params: { ...input } },
      this.c(config),
    );

  create = (input: CreateUpdateInstalledAssetDto, config?: Partial<Rest.Config>) =>
    this.rest.request<any, InstalledAssetDto>(
      { method: 'POST', url: `${api}/installed-asset`, body: input },
      this.c(config),
    );

  update = (id: string, input: CreateUpdateInstalledAssetDto, config?: Partial<Rest.Config>) =>
    this.rest.request<any, InstalledAssetDto>(
      { method: 'PUT', url: `${api}/installed-asset/${id}`, body: input },
      this.c(config),
    );

  recordService = (id: string, servicedOn: string, config?: Partial<Rest.Config>) =>
    this.rest.request<any, InstalledAssetDto>(
      {
        method: 'POST',
        url: `${api}/installed-asset/${id}/record-service`,
        params: { servicedOn },
      },
      this.c(config),
    );

  retire = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<any, InstalledAssetDto>(
      { method: 'POST', url: `${api}/installed-asset/${id}/retire` },
      this.c(config),
    );

  constructor(private rest: RestService) {}
}

@Injectable({ providedIn: 'root' })
export class ReminderService {
  apiName = 'AutoReach';
  private c = (config?: Partial<Rest.Config>) => ({ apiName: this.apiName, ...config });

  getList = (input: GetReminderListInput, config?: Partial<Rest.Config>) =>
    this.rest.request<any, PagedResultDto<ReminderDto>>(
      { method: 'GET', url: `${api}/reminder`, params: { ...input } },
      this.c(config),
    );

  halt = (id: string, reason: string, config?: Partial<Rest.Config>) =>
    this.rest.request<any, ReminderDto>(
      { method: 'POST', url: `${api}/reminder/${id}/halt`, params: { reason } },
      this.c(config),
    );

  constructor(private rest: RestService) {}
}
