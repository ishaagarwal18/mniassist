import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import type { PagedResultDto } from '@abp/ng.core';

export enum FaultSeverity {
  StopsMachine = 0,
  WarningOnly = 1,
}

export enum FaultCheckRole {
  Operator = 0,
  Electrician = 1,
  Engineer = 2,
}

export enum FaultCodeSource {
  Typed = 0,
  Imported = 1,
  Manual = 2,
  Learned = 3,
}

export enum FaultCodeState {
  Draft = 0,
  Approved = 1,
  Retired = 2,
}

export enum FaultExtractionState {
  Queued = 0,
  Reading = 1,
  Done = 2,
  Failed = 3,
}

export interface FaultCheckDto {
  text: string;
  role: FaultCheckRole;
}

export interface SaveFaultCodeInput {
  make: string;
  series?: string | null;
  code: string;
  aliases: string[];
  title: string;
  severity: FaultSeverity;
  causes: string[];
  checks: FaultCheckDto[];
  safetyNote?: string | null;
  sparePartNumbers: string[];
  escalateWhen?: string | null;
}

export interface FaultCodeDto extends SaveFaultCodeInput {
  id: string;
  sourceKind: FaultCodeSource;
  libraryDocumentId?: string | null;
  libraryDocumentTitle?: string | null;
  sourcePage?: number | null;
  sourceTickets: string[];
  state: FaultCodeState;
  version: number;
  approvedAtUtc?: string | null;
  approvalProblem?: string | null;
  creationTime: string;
}

export interface GetFaultCodesInput {
  filter?: string | null;
  state?: FaultCodeState | null;
  source?: FaultCodeSource | null;
  skipCount?: number;
  maxResultCount?: number;
}

export interface ApproveFaultCodesResultDto {
  approved: number;
  problems: string[];
}

export interface FaultCodeImportRowDto {
  row: number;
  make: string;
  series?: string | null;
  code: string;
  title: string;
  updates: boolean;
  updatesApproved: boolean;
}

export interface FaultCodeImportPreviewDto {
  rows: FaultCodeImportRowDto[];
  problems: string[];
}

export interface FaultCodeImportResultDto {
  added: number;
  updated: number;
  problems: string[];
}

export interface ExtractFaultCodesInput {
  libraryDocumentId: string;
  make: string;
  series?: string | null;
  fromPage?: number | null;
  toPage?: number | null;
}

export interface FaultCodeExtractionDto {
  id: string;
  libraryDocumentId: string;
  documentTitle: string;
  make: string;
  series?: string | null;
  fromPage?: number | null;
  toPage?: number | null;
  state: FaultExtractionState;
  pagesRead: number;
  drafted: number;
  skipped: number;
  error?: string | null;
  creationTime: string;
  finishedAtUtc?: string | null;
}

export interface FaultCodeManualDto {
  id: string;
  title: string;
  sizeBytes: number;
}

export interface FaultCodeProposalDto {
  make: string;
  series?: string | null;
  code: string;
  cause: string;
  fix?: string | null;
  ticketReferences: string[];
  faultCodeId?: string | null;
  entryState?: FaultCodeState | null;
}

/** The fault-code library: entries, approval, CSV import, reading manuals and proposals learned from tickets. */
@Injectable({ providedIn: 'root' })
export class FaultCodeService {
  private restService = inject(RestService);
  apiName = 'AutoReach';
  private readonly base = '/api/auto-reach/fault-code';

  getList = (input: GetFaultCodesInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<FaultCodeDto>>(
      {
        method: 'GET',
        url: this.base,
        params: {
          filter: input.filter ?? undefined,
          state: input.state ?? undefined,
          source: input.source ?? undefined,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, FaultCodeDto>(
      { method: 'GET', url: `${this.base}/${id}` },
      { apiName: this.apiName, ...config },
    );

  create = (input: SaveFaultCodeInput, config?: Partial<Rest.Config>) =>
    this.restService.request<SaveFaultCodeInput, FaultCodeDto>(
      { method: 'POST', url: this.base, body: input },
      { apiName: this.apiName, ...config },
    );

  update = (id: string, input: SaveFaultCodeInput, config?: Partial<Rest.Config>) =>
    this.restService.request<SaveFaultCodeInput, FaultCodeDto>(
      { method: 'PUT', url: `${this.base}/${id}`, body: input },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, void>(
      { method: 'DELETE', url: `${this.base}/${id}` },
      { apiName: this.apiName, ...config },
    );

  approve = (ids: string[], config?: Partial<Rest.Config>) =>
    this.restService.request<any, ApproveFaultCodesResultDto>(
      { method: 'POST', url: `${this.base}/approve`, body: { ids } },
      { apiName: this.apiName, ...config },
    );

  retire = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, FaultCodeDto>(
      { method: 'POST', url: `${this.base}/${id}/retire` },
      { apiName: this.apiName, ...config },
    );

  reopen = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, FaultCodeDto>(
      { method: 'POST', url: `${this.base}/${id}/reopen` },
      { apiName: this.apiName, ...config },
    );

  /** FormData with `file`. Saves nothing. */
  previewImport = (body: FormData, config?: Partial<Rest.Config>) =>
    this.restService.request<any, FaultCodeImportPreviewDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `${this.base}/preview-import`,
        body,
      },
      { apiName: this.apiName, ...config },
    );

  import = (body: FormData, config?: Partial<Rest.Config>) =>
    this.restService.request<any, FaultCodeImportResultDto>(
      { method: 'POST', headers: { Accept: 'application/json' }, url: `${this.base}/import`, body },
      { apiName: this.apiName, ...config },
    );

  extractFromDocument = (input: ExtractFaultCodesInput, config?: Partial<Rest.Config>) =>
    this.restService.request<ExtractFaultCodesInput, FaultCodeExtractionDto>(
      { method: 'POST', url: `${this.base}/extract-from-document`, body: input },
      { apiName: this.apiName, ...config },
    );

  getExtractions = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, FaultCodeExtractionDto[]>(
      { method: 'GET', url: `${this.base}/extractions` },
      { apiName: this.apiName, ...config },
    );

  getManuals = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, FaultCodeManualDto[]>(
      { method: 'GET', url: `${this.base}/manuals` },
      { apiName: this.apiName, ...config },
    );

  getProposals = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, FaultCodeProposalDto[]>(
      { method: 'GET', url: `${this.base}/proposals` },
      { apiName: this.apiName, ...config },
    );

  acceptProposal = (
    input: { make: string; series?: string | null; code: string; cause: string },
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, FaultCodeDto>(
      { method: 'POST', url: `${this.base}/accept-proposal`, body: input },
      { apiName: this.apiName, ...config },
    );
}
