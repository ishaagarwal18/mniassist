import { PagedResultDto, RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

import { SpaMode } from './oem-pricing.service';

export enum SpaClaimStatus {
  Draft = 0,
  Submitted = 1,
  PartlySettled = 2,
  Settled = 3,
  Rejected = 4,
  WrittenOff = 5,
}

export enum SpaClaimLineState {
  Open = 0,
  Settled = 1,
  Rejected = 2,
  WrittenOff = 3,
}

export enum SpaAgeBand {
  UpTo30 = 0,
  UpTo60 = 1,
  UpTo90 = 2,
  Over90 = 3,
}

export interface GetSpaClaimsInput {
  supplierId?: string | null;
  status?: SpaClaimStatus | null;
  ageBand?: SpaAgeBand | null;
  openOnly?: boolean;
  skipCount?: number;
  maxResultCount?: number;
}

export interface SpaClaimListItemDto {
  id: string;
  reference: string;
  supplierId: string;
  supplierName: string;
  periodFrom: string;
  periodTo: string;
  status: SpaClaimStatus;
  submittedOn?: string | null;
  oemAckNumber?: string | null;
  lineCount: number;
  claimedInPaise: number;
  settledInPaise: number;
  rejectedInPaise: number;
  writtenOffInPaise: number;
  outstandingInPaise: number;
  ageDays: number;
  ageBand: SpaAgeBand;
  /** Lines over 7 days old and not submitted. */
  lateLines: number;
  deadlineOn?: string | null;
}

export interface SpaClaimLineDto {
  id: string;
  spaId: string;
  spaReference: string;
  salesInvoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerName?: string | null;
  partNumber: string;
  quantity: number;
  supportPerUnitInPaise: number;
  amountInPaise: number;
  state: SpaClaimLineState;
  settledInPaise: number;
  outstandingInPaise: number;
  rejectReason?: string | null;
  late: boolean;
}

export interface SpaSettlementDto {
  id: string;
  oemCreditNoteNumber: string;
  creditNoteDate: string;
  amountInPaise: number;
  journalEntryId?: string | null;
}

export interface SpaClaimDto extends SpaClaimListItemDto {
  note?: string | null;
  lines: SpaClaimLineDto[];
  settlements: SpaSettlementDto[];
}

export interface RecordSpaSettlementInput {
  creditNoteNumber: string;
  creditNoteDate: string;
  amountInPaise: number;
  lines: { lineId: string; amountInPaise: number }[];
}

export interface InvoiceSpaLineDto {
  salesInvoiceLineId: string;
  partNumber: string;
  quantity: number;
  spaId: string;
  spaReference: string;
  mode: SpaMode;
  usedQty?: number | null;
  excessQty: number;
  supportPerUnitInPaise: number;
  claimableInPaise: number;
  claimId?: string | null;
  claimReference?: string | null;
  claimLineState?: SpaClaimLineState | null;
}

/** Claims to OEMs for special-price support. */
@Injectable({ providedIn: 'root' })
export class SpaClaimService {
  private readonly rest = inject(RestService);
  apiName = 'Default';

  getList = (input: GetSpaClaimsInput, config?: Partial<Rest.Config>) =>
    this.rest.request<void, PagedResultDto<SpaClaimListItemDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/spa-claim',
        params: {
          supplierId: input.supplierId ?? undefined,
          status: input.status ?? undefined,
          ageBand: input.ageBand ?? undefined,
          openOnly: input.openOnly,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<void, SpaClaimDto>(
      { method: 'GET', url: `/api/auto-reach/spa-claim/${id}` },
      { apiName: this.apiName, ...config },
    );

  addLines = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<void, SpaClaimDto>(
      { method: 'POST', url: `/api/auto-reach/spa-claim/${id}/lines` },
      { apiName: this.apiName, ...config },
    );

  getExport = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<void, Blob>(
      {
        method: 'GET',
        responseType: 'blob',
        headers: { Accept: 'application/octet-stream' },
        url: `/api/auto-reach/spa-claim/${id}/export`,
      },
      { apiName: this.apiName, ...config },
    );

  submit = (
    id: string,
    input: { submittedOn: string; oemAckNumber?: string | null },
    config?: Partial<Rest.Config>,
  ) =>
    this.rest.request<typeof input, SpaClaimDto>(
      { method: 'POST', url: `/api/auto-reach/spa-claim/${id}/submit`, body: input },
      { apiName: this.apiName, ...config },
    );

  recordSettlement = (id: string, input: RecordSpaSettlementInput, config?: Partial<Rest.Config>) =>
    this.rest.request<RecordSpaSettlementInput, SpaClaimDto>(
      { method: 'POST', url: `/api/auto-reach/spa-claim/${id}/record-settlement`, body: input },
      { apiName: this.apiName, ...config },
    );

  rejectLines = (
    id: string,
    input: { lineIds: string[]; reason: string },
    config?: Partial<Rest.Config>,
  ) =>
    this.rest.request<typeof input, SpaClaimDto>(
      { method: 'POST', url: `/api/auto-reach/spa-claim/${id}/reject-lines`, body: input },
      { apiName: this.apiName, ...config },
    );

  writeOff = (id: string, input: { note?: string | null }, config?: Partial<Rest.Config>) =>
    this.rest.request<typeof input, SpaClaimDto>(
      { method: 'POST', url: `/api/auto-reach/spa-claim/${id}/write-off`, body: input },
      { apiName: this.apiName, ...config },
    );

  getForInvoice = (invoiceId: string, config?: Partial<Rest.Config>) =>
    this.rest.request<void, InvoiceSpaLineDto[]>(
      { method: 'GET', url: `/api/auto-reach/spa-claim/for-invoice/${invoiceId}` },
      { apiName: this.apiName, ...config },
    );
}
