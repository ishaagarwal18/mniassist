import { Injectable, inject } from '@angular/core';
import { RestService } from '@abp/ng.core';

export interface CustomerDocumentInput {
  kind: number;
  recordId: string;
  paymentId?: string;
}
export interface CustomerMessageInput {
  contactId: string;
  channel: number;
  channelId?: string;
  templateId?: string;
  subject?: string;
  text?: string;
  variables: Record<string, string>;
  document?: CustomerDocumentInput;
  documentVariable?: string;
}
@Injectable({ providedIn: 'root' })
export class CustomerCommunicationService {
  private readonly rest = inject(RestService);
  send = (input: CustomerMessageInput) =>
    this.rest.request<CustomerMessageInput, void>(
      {
        method: 'POST',
        url: '/api/auto-reach/customer-communication/send',
        body: input,
      },
      { apiName: 'AutoReach' },
    );
  getDocument = (contactId: string, document: CustomerDocumentInput) =>
    this.rest.request<unknown, Blob>(
      {
        method: 'GET',
        url: `/api/auto-reach/customer-communication/document/${contactId}`,
        params: { kind: document.kind, recordId: document.recordId, paymentId: document.paymentId },
        responseType: 'blob',
      },
      { apiName: 'AutoReach' },
    );
}
