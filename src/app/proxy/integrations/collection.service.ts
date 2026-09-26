import { Rest, RestService } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export interface CollectionInvoiceDto {
  id: string;
  number: string;
  customerId: string;
  customerName?: string | null;
  invoiceDateUtc: string;
  dueDateUtc: string;
  /** No due date from the ERP: invoice date plus the credit days. */
  dueDateAssumed: boolean;
  daysOverdue: number;
  totalInPaise: number;
  outstandingInPaise: number;
  remindersSent: number;
  lastReminderAtUtc?: string | null;
  paidByLink: boolean;
}

export interface CollectionBoardDto {
  outstandingInPaise: number;
  overdueInPaise: number;
  overdueCount: number;
  collectedThisMonthInPaise: number;
  /** Invoices the ERP gives no per-invoice outstanding for (Tally): not chased. */
  notChaseableCount: number;
  invoices: CollectionInvoiceDto[];
}

export interface CollectionSettingsDto {
  enabled: boolean;
  templateId?: string | null;
  creditDays: number;
  includePayLink: boolean;
}

/** Q4: overdue-invoice collections on WhatsApp. */
@Injectable({ providedIn: 'root' })
export class CollectionService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getBoard = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, CollectionBoardDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/collection/board',
      },
      { apiName: this.apiName, ...config },
    );

  sendNow = (invoiceId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, { sent: boolean; note: string }>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/collection/send-now/${invoiceId}`,
      },
      { apiName: this.apiName, ...config },
    );

  run = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, { sent: number }>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/collection/run',
      },
      { apiName: this.apiName, ...config },
    );

  getSettings = (config?: Partial<Rest.Config>) =>
    this.restService.request<any, CollectionSettingsDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/collection/settings',
      },
      { apiName: this.apiName, ...config },
    );

  updateSettings = (input: CollectionSettingsDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, CollectionSettingsDto>(
      {
        method: 'PUT',
        headers: { Accept: 'application/json' },
        url: '/api/auto-reach/collection/settings',
        body: input,
      },
      { apiName: this.apiName, ...config },
    );
}
