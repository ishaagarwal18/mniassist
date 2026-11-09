import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

import { RetentionRowDto } from './retention.service';

export enum BankGuaranteeKind {
  Advance = 0,
  Performance = 1,
}

export enum BankGuaranteeReturnCondition {
  AdvanceAdjusted = 0,
  RetentionReleased = 1,
  OnDate = 2,
}

export enum BankGuaranteeStatus {
  Active = 0,
  DueForReturn = 1,
  Returned = 2,
  Invoked = 3,
  Expired = 4,
}

export interface SaveBankGuaranteeInput {
  kind: BankGuaranteeKind;
  number: string;
  bank: string;
  amountInPaise: number;
  issuedOn: string;
  validTo: string;
  claimPeriodDays?: number | null;
  returnCondition: BankGuaranteeReturnCondition;
  returnOn?: string | null;
  note?: string | null;
}

export interface BankGuaranteeDto {
  id: string;
  salesOrderId: string;
  orderNumber: string;
  customerName?: string | null;
  kind: BankGuaranteeKind;
  number: string;
  bank: string;
  amountInPaise: number;
  issuedOn: string;
  validTo: string;
  daysToExpiry: number;
  claimPeriodDays?: number | null;
  returnCondition: BankGuaranteeReturnCondition;
  returnOn?: string | null;
  status: BankGuaranteeStatus;
  returnedOn?: string | null;
  note?: string | null;
}

export interface OrderBillingStatusDto {
  salesOrderId: string;
  orderNumber: string;
  customerName?: string | null;
  orderValueInPaise: number;
  billedInPaise: number;
  receivedInPaise: number;
  unbilledInPaise: number;
  retentionHeldInPaise: number;
  retentionOverdueInPaise: number;
  milestonesReady: number;
}

export interface BillingReportDto {
  orders: OrderBillingStatusDto[];
  retentionDue: RetentionRowDto[];
  guaranteesEnding: BankGuaranteeDto[];
  billedInPaise: number;
  unbilledInPaise: number;
  retentionHeldInPaise: number;
  retentionOverdueInPaise: number;
}

/** Bank guarantees on project orders. */
@Injectable({ providedIn: 'root' })
export class BankGuaranteeService {
  private readonly rest = inject(RestService);
  apiName = 'Default';

  getList = (
    input: { salesOrderId?: string | null; heldOnly?: boolean },
    config?: Partial<Rest.Config>,
  ) =>
    this.rest.request<void, BankGuaranteeDto[]>(
      {
        method: 'GET',
        url: '/api/auto-reach/bank-guarantee',
        params: { salesOrderId: input.salesOrderId ?? undefined, heldOnly: input.heldOnly },
      },
      { apiName: this.apiName, ...config },
    );

  create = (salesOrderId: string, input: SaveBankGuaranteeInput, config?: Partial<Rest.Config>) =>
    this.rest.request<SaveBankGuaranteeInput, BankGuaranteeDto>(
      {
        method: 'POST',
        url: '/api/auto-reach/bank-guarantee',
        params: { salesOrderId },
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  markReturned = (id: string, returnedOn: string, config?: Partial<Rest.Config>) =>
    this.rest.request<{ returnedOn: string }, BankGuaranteeDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/bank-guarantee/${id}/mark-returned`,
        body: { returnedOn },
      },
      { apiName: this.apiName, ...config },
    );

  markInvoked = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<void, BankGuaranteeDto>(
      { method: 'POST', url: `/api/auto-reach/bank-guarantee/${id}/mark-invoked` },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<void, void>(
      { method: 'DELETE', url: `/api/auto-reach/bank-guarantee/${id}` },
      { apiName: this.apiName, ...config },
    );
}

/** Project billing reports. */
@Injectable({ providedIn: 'root' })
export class BillingReportService {
  private readonly rest = inject(RestService);
  apiName = 'Default';

  get = (withinDays: number, config?: Partial<Rest.Config>) =>
    this.rest.request<void, BillingReportDto>(
      { method: 'GET', url: '/api/auto-reach/billing-report', params: { withinDays } },
      { apiName: this.apiName, ...config },
    );
}
