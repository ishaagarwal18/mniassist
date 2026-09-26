import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';
import type { IntegrationKind } from './integration-kind.enum';
import type { IntegrationState } from './integration-state.enum';

export enum ErpRecordType {
  Customer = 0,
  SalesOrder = 1,
}

export interface ErpSyncFailureDto {
  recordType: ErpRecordType;
  localId: string;
  label?: string | null;
  error: string;
  attemptedAtUtc?: string | null;
}

export interface ErpSyncConnectionStatusDto {
  connectionId: string;
  kind: IntegrationKind;
  name: string;
  state: IntegrationState;
  customersEnabled: boolean;
  salesOrdersEnabled: boolean;
  invoicesEnabled: boolean;
  customersSynced: number;
  salesOrdersCreated: number;
  invoicesHeld: number;
  lastSyncedAtUtc?: string | null;
  failures: ErpSyncFailureDto[];
  failureCount: number;
}

export interface ErpSyncStatusDto {
  connections: ErpSyncConnectionStatusDto[];
}

export interface ErpSyncRunResultDto {
  retried: number;
  recovered: number;
  stillFailing: number;
  invoices: number;
  invoiceError?: string | null;
}

export interface ErpInvoiceDto {
  number: string;
  invoiceDateUtc: string;
  dueDateUtc?: string | null;
  totalInPaise: number;
  outstandingInPaise?: number | null;
  isOverdue: boolean;
}

export interface ErpCustomerLedgerDto {
  erpName?: string | null;
  balanceInPaise?: number | null;
  balanceAtUtc?: string | null;
  overdueInPaise: number;
  invoices: ErpInvoiceDto[];
}

/** Customer, sales-order and invoice sync with Tally and SAP Business One. */
@Injectable({ providedIn: 'root' })
export class ErpSyncService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getStatus = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, ErpSyncStatusDto>(
      { method: 'GET', headers: { Accept: 'application/json' }, url: '/api/auto-reach/erp-sync/status' },
      { apiName: this.apiName, ...config },
    );

  run = (connectionId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ErpSyncRunResultDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/erp-sync/run/${connectionId}`,
      },
      { apiName: this.apiName, ...config },
    );

  getLedger = (customerId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, ErpCustomerLedgerDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/erp-sync/ledger/${customerId}`,
      },
      { apiName: this.apiName, ...config },
    );
}
