import { PagedResultDto, RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

import { SalesPaymentMode } from '../sales/sales-enums';

export enum RetentionReleaseCondition {
  OnDate = 0,
  DefectsPeriod = 1,
  AgainstBg = 2,
}

export enum RetentionStatus {
  NotDue = 0,
  Due = 1,
  Requested = 2,
  Released = 3,
  WrittenOff = 4,
}

export interface AdvanceReceiptDto {
  id: string;
  amountInPaise: number;
  receivedOn: string;
  reference?: string | null;
  adjustedInPaise: number;
}

export interface AdvanceSummaryDto {
  receivedInPaise: number;
  adjustedInPaise: number;
  unadjustedInPaise: number;
  plannedInPaise: number;
  receipts: AdvanceReceiptDto[];
}

export interface RetentionRowDto {
  id: string;
  salesOrderId: string;
  orderNumber: string;
  customerName?: string | null;
  salesInvoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  milestone?: string | null;
  heldInPaise: number;
  releasedInPaise: number;
  outstandingInPaise: number;
  releaseCondition: RetentionReleaseCondition;
  dueOn?: string | null;
  daysOverdue: number;
  status: RetentionStatus;
  requestedOn?: string | null;
  withCollections: boolean;
}

export interface RetentionRequestResultDto {
  entries: number;
  amountInPaise: number;
  emailed: boolean;
  emailProblem?: string | null;
}

/** Advances received against project orders. */
@Injectable({ providedIn: 'root' })
export class AdvanceReceiptService {
  private readonly rest = inject(RestService);
  apiName = 'Default';

  getForOrder = (salesOrderId: string, config?: Partial<Rest.Config>) =>
    this.rest.request<void, AdvanceSummaryDto>(
      { method: 'GET', url: `/api/auto-reach/advance-receipt/for-order/${salesOrderId}` },
      { apiName: this.apiName, ...config },
    );

  record = (
    salesOrderId: string,
    input: { amountInPaise: number; receivedOn: string; reference?: string | null },
    config?: Partial<Rest.Config>,
  ) =>
    this.rest.request<typeof input, AdvanceSummaryDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/advance-receipt/record/${salesOrderId}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<void, AdvanceSummaryDto>(
      { method: 'DELETE', url: `/api/auto-reach/advance-receipt/${id}` },
      { apiName: this.apiName, ...config },
    );
}

/** The retention ledger. */
@Injectable({ providedIn: 'root' })
export class RetentionService {
  private readonly rest = inject(RestService);
  apiName = 'Default';

  getLedger = (
    input: {
      salesOrderId?: string | null;
      status?: RetentionStatus | null;
      openOnly?: boolean;
      skipCount?: number;
      maxResultCount?: number;
    },
    config?: Partial<Rest.Config>,
  ) =>
    this.rest.request<void, PagedResultDto<RetentionRowDto>>(
      {
        method: 'GET',
        url: '/api/auto-reach/retention/ledger',
        params: {
          salesOrderId: input.salesOrderId ?? undefined,
          status: input.status ?? undefined,
          openOnly: input.openOnly,
          skipCount: input.skipCount,
          maxResultCount: input.maxResultCount,
        },
      },
      { apiName: this.apiName, ...config },
    );

  getReleaseLetter = (salesOrderId: string, config?: Partial<Rest.Config>) =>
    this.rest.request<void, Blob>(
      {
        method: 'GET',
        responseType: 'blob',
        headers: { Accept: 'application/octet-stream' },
        url: `/api/auto-reach/retention/release-letter/${salesOrderId}`,
      },
      { apiName: this.apiName, ...config },
    );

  requestRelease = (
    salesOrderId: string,
    input: { sendEmail: boolean; contactId?: string | null },
    config?: Partial<Rest.Config>,
  ) =>
    this.rest.request<typeof input, RetentionRequestResultDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/retention/request-release/${salesOrderId}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  recordRelease = (
    salesOrderId: string,
    input: {
      amountInPaise: number;
      receivedOn: string;
      mode: SalesPaymentMode;
      reference?: string | null;
    },
    config?: Partial<Rest.Config>,
  ) =>
    this.rest.request<typeof input, RetentionRowDto[]>(
      {
        method: 'POST',
        url: `/api/auto-reach/retention/record-release/${salesOrderId}`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  writeOff = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<void, RetentionRowDto>(
      { method: 'POST', url: `/api/auto-reach/retention/${id}/write-off` },
      { apiName: this.apiName, ...config },
    );
}
