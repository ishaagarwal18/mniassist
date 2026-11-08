import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

import { SpaStatus } from './oem-pricing.service';

export interface SpaAgeingRowDto {
  supplierId: string;
  supplierName: string;
  upTo30InPaise: number;
  upTo60InPaise: number;
  upTo90InPaise: number;
  over90InPaise: number;
  totalInPaise: number;
  notSubmittedInPaise: number;
}

export interface SpaRecoveredRowDto {
  supplierId: string;
  supplierName: string;
  claimedInPaise: number;
  settledInPaise: number;
  rejectedInPaise: number;
  writtenOffInPaise: number;
  recoveryRate?: number | null;
}

export interface SpaExpiringRowDto {
  spaId: string;
  reference: string;
  supplierName: string;
  customerName?: string | null;
  validTo?: string | null;
  daysLeft: number;
  remainingQty: number;
  remainingSupportInPaise: number;
}

export interface SpaUsageRowDto {
  spaId: string;
  reference: string;
  supplierName: string;
  status: SpaStatus;
  partNumber: string;
  approvedQty: number;
  usedQty: number;
  remainingQty: number;
  quotedQty: number;
  usedRate?: number | null;
}

export interface SpaReportDto {
  fromUtc: string;
  toUtc: string;
  ageing: SpaAgeingRowDto[];
  recovered: SpaRecoveredRowDto[];
  expiring: SpaExpiringRowDto[];
  usage: SpaUsageRowDto[];
}

export interface SpaBillCheckDto {
  vendorBillLineId: string;
  lineNumber: number;
  partNumber: string;
  billedUnitPriceInPaise: number;
  specialBuyInPaise: number;
  overchargedInPaise: number;
  spaId: string;
  spaReference: string;
}

export interface OemAccountOptionDto {
  id: string;
  code: string;
  name: string;
}

export interface OemPostingSettingsDto {
  postJournals: boolean;
  claimsReceivableAccountId?: string | null;
  supportIncomeAccountId?: string | null;
  oemPayableAccountId?: string | null;
  writeOffAccountId?: string | null;
  accounts: OemAccountOptionDto[];
}

export type UpdateOemPostingSettingsInput = Omit<OemPostingSettingsDto, 'accounts'>;

/** The OEM pricing reports, the vendor bill check and the journal posting settings. */
@Injectable({ providedIn: 'root' })
export class SpaReportService {
  private readonly rest = inject(RestService);
  apiName = 'Default';

  get = (
    input: { fromUtc?: string; toUtc?: string; expiringWithinDays?: number },
    config?: Partial<Rest.Config>,
  ) =>
    this.rest.request<void, SpaReportDto>(
      {
        method: 'GET',
        url: '/api/auto-reach/spa-report',
        params: {
          fromUtc: input.fromUtc,
          toUtc: input.toUtc,
          expiringWithinDays: input.expiringWithinDays,
        },
      },
      { apiName: this.apiName, ...config },
    );

  checkVendorBill = (vendorBillId: string, config?: Partial<Rest.Config>) =>
    this.rest.request<void, SpaBillCheckDto[]>(
      { method: 'POST', url: `/api/auto-reach/spa/check-vendor-bill/${vendorBillId}` },
      { apiName: this.apiName, ...config },
    );

  getPosting = (config?: Partial<Rest.Config>) =>
    this.rest.request<void, OemPostingSettingsDto>(
      { method: 'GET', url: '/api/auto-reach/oem-settings/posting' },
      { apiName: this.apiName, ...config },
    );

  updatePosting = (input: UpdateOemPostingSettingsInput, config?: Partial<Rest.Config>) =>
    this.rest.request<UpdateOemPostingSettingsInput, OemPostingSettingsDto>(
      { method: 'PUT', url: '/api/auto-reach/oem-settings/posting', body: input },
      { apiName: this.apiName, ...config },
    );
}
