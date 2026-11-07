import { PagedResultDto, Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export enum BoqImportState {
  Uploading = 0,
  Reading = 1,
  Review = 2,
  Drafted = 3,
  Failed = 4,
  Discarded = 5,
  /** Waiting for the engineer to say which spreadsheet column is which. */
  Mapping = 6,
}

export enum BoqImportSource {
  Upload = 0,
  Inbox = 1,
}

export enum BoqMatchKind {
  None = 0,
  Exact = 1,
  Search = 2,
  /** Quoted as our part before (a learned cross-reference). */
  Learned = 3,
  /** Another make's number found in the cross-reference table. */
  CrossRef = 4,
  /** A product of the same kind meeting every rating the line states. */
  Attribute = 5,
}

export enum BoqConfidence {
  None = 0,
  Low = 1,
  Medium = 2,
  High = 3,
}

export enum BoqLineDecision {
  Pending = 0,
  Accepted = 1,
  Changed = 2,
  Skipped = 3,
  ManualPrice = 4,
}

export interface CreateBoqImportInput {
  contactId: string;
  /** Null opens a new enquiry when the draft is created. */
  enquiryId?: string | null;
  /** Null prices from the list that fits the customer. */
  priceListId?: string | null;
}

export interface StartBoqImportFromConversationInput {
  conversationId: string;
  /** One to twelve attachments of the conversation. */
  messageIds: string[];
  enquiryId?: string | null;
}

export interface GetBoqImportListInput {
  state?: BoqImportState | null;
  contactId?: string | null;
  skipCount?: number;
  maxResultCount?: number;
}

export interface BoqLineDecisionInput {
  lineId: string;
  decision: BoqLineDecision;
  /** For Changed: the part to quote instead. */
  partNumber?: string | null;
  /** For ManualPrice: the unit price, in paise. */
  unitPriceInPaise?: number | null;
  /** A corrected quantity; null keeps the one read off the file. */
  quantity?: number | null;
  /** For a change or an accepted suggestion: remember it as a cross-reference (default true). */
  remember?: boolean;
}

export interface UpdateBoqLinesInput {
  lines: BoqLineDecisionInput[];
}

export interface BoqImportListItemDto {
  id: string;
  reference: string;
  contactId: string;
  contactName?: string | null;
  source: BoqImportSource;
  state: BoqImportState;
  fileCount: number;
  lineCount: number;
  pendingCount: number;
  quotationId?: string | null;
  creationTime: string;
}

export interface BoqImportFileDto {
  id: string;
  number: number;
  fileName: string;
  mediaType: string;
  sizeBytes: number;
  lineCount: number;
  error?: string | null;
  /** Read by its mapped columns rather than by the AI. */
  mapped: boolean;
}

/** Which column of a sheet is which; 0-based, null for none. */
export interface BoqSheetMapDto {
  sheet: string;
  include: boolean;
  /** The heading row among the sheet's non-empty rows; -1 for none. */
  headerRow: number;
  partNumber?: number | null;
  description?: number | null;
  quantity?: number | null;
  unit?: number | null;
  make?: number | null;
}

export interface BoqSheetPreviewDto {
  sheet: string;
  rows: string[][];
  rowCount: number;
  columnCount: number;
  map: BoqSheetMapDto;
  /** The map came from an earlier import with the same headings. */
  remembered: boolean;
}

export interface BoqFileMappingDto {
  fileId: string;
  fileName: string;
  problem?: string | null;
  sheets: BoqSheetPreviewDto[];
}

export interface BoqMappingDto {
  files: BoqFileMappingDto[];
}

export interface BoqFileMapInput {
  fileId: string;
  useAi: boolean;
  sheets: BoqSheetMapDto[];
}

export interface SetBoqMappingInput {
  files: BoqFileMapInput[];
  /** Remember each sheet's columns by its headings for next time. */
  remember: boolean;
}

export interface BoqAlternateDto {
  partNumber: string;
  name: string;
  unit: string;
  unitPriceInPaise: number;
  productId?: string | null;
}

export interface BoqImportLineDto {
  id: string;
  row: number;
  fileNumber: number;
  asPartNumber?: string | null;
  asDescription: string;
  asMake?: string | null;
  asUnit?: string | null;
  quantity: number;
  matchKind: BoqMatchKind;
  confidence: BoqConfidence;
  reason?: string | null;
  partNumber?: string | null;
  itemName?: string | null;
  unit?: string | null;
  productId?: string | null;
  unitPriceInPaise?: number | null;
  alternates: BoqAlternateDto[];
  decision: BoqLineDecision;
}

export interface BoqImportDto {
  id: string;
  reference: string;
  contactId: string;
  contactName?: string | null;
  enquiryId?: string | null;
  priceListId?: string | null;
  source: BoqImportSource;
  conversationId?: string | null;
  state: BoqImportState;
  filesRead: number;
  error?: string | null;
  note?: string | null;
  quotationId?: string | null;
  quotationReference?: string | null;
  creationTime: string;
  readAtUtc?: string | null;
  files: BoqImportFileDto[];
  lines: BoqImportLineDto[];
  pendingCount: number;
  matchedCount: number;
  suggestedCount: number;
  notFoundCount: number;
  /** Quantity × unit price over the priced lines going into the quotation, before GST. */
  pricedTotalInPaise: number;
}

/**
 * BOQ-to-quote: a customer's BOQ, RFQ or parts list is read by the AI model in the background, matched to the catalogue,
 * reviewed line by line, and only then drafted as a quotation.
 */
@Injectable({ providedIn: 'root' })
export class BoqImportService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  /** Whether files can be read here (an AI model is configured). */
  getAvailable = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, boolean>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/boq-import/available',
      },
      { apiName: this.apiName, skipHandleError: true, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, BoqImportDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/boq-import/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  getList = (input: GetBoqImportListInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, PagedResultDto<BoqImportListItemDto>>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/boq-import',
        params: {
          state: input.state,
          contactId: input.contactId,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  create = (input: CreateBoqImportInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, BoqImportDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/boq-import',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  /** One file per call, as a multipart form with a `file` field. */
  uploadFile = (id: string, body: FormData, config?: Partial<Rest.Config>) =>
    this.restService.request<any, BoqImportDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/boq-import/${id}/upload-file`,
        body,
      },
      { apiName: this.apiName, ...config },
    );

  start = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, BoqImportDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/boq-import/${id}/start`,
      },
      { apiName: this.apiName, ...config },
    );

  startFromConversation = (
    input: StartBoqImportFromConversationInput,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, BoqImportDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/boq-import/start-from-conversation',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  getMapping = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, BoqMappingDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/boq-import/${id}/mapping`,
      },
      { apiName: this.apiName, ...config },
    );

  setMapping = (id: string, input: SetBoqMappingInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, BoqImportDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/boq-import/${id}/set-mapping`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  updateLines = (id: string, input: UpdateBoqLinesInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, BoqImportDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/boq-import/${id}/lines`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  createQuotation = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, BoqImportDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/boq-import/${id}/quotation`,
      },
      { apiName: this.apiName, ...config },
    );

  /** The lines not found or only weakly suggested, as an Excel file. */
  exportExceptions = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, Blob>(
      {
        method: 'POST',
        responseType: 'blob',
        headers: { Accept: 'application/octet-stream' },
        url: `/api/auto-reach/boq-import/${id}/export-exceptions`,
      },
      { apiName: this.apiName, ...config },
    );

  discard = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, BoqImportDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/boq-import/${id}/discard`,
      },
      { apiName: this.apiName, ...config },
    );
}
