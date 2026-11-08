import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

export enum AcceptanceTestKind {
  Fat = 0,
  Sat = 1,
  Commissioning = 2,
}

export enum AcceptanceTestStatus {
  Draft = 0,
  InProgress = 1,
  SentForSignature = 2,
  Signed = 3,
  Reissued = 4,
}

export enum TestItemResult {
  Pending = 0,
  Pass = 1,
  Fail = 2,
  NotApplicable = 3,
}

export interface AcceptanceTestSummaryDto {
  id: string;
  kind: AcceptanceTestKind;
  title: string;
  version: number;
  status: AcceptanceTestStatus;
  items: number;
  passed: number;
  openPunch: number;
  signedAtUtc?: string | null;
  signedByName?: string | null;
  hasCertificate: boolean;
}

export interface AcceptanceTestItemDto {
  id: string;
  order: number;
  text: string;
  result: TestItemResult;
  remark?: string | null;
  isPunch: boolean;
  punchCritical: boolean;
  punchOwnerUserId?: string | null;
  punchDueOn?: string | null;
  punchClosedOn?: string | null;
}

export interface AcceptanceTestDto extends AcceptanceTestSummaryDto {
  salesOrderId: string;
  orderNumber: string;
  previousTestId?: string | null;
  signerName?: string | null;
  signerDesignation?: string | null;
  signerEmail?: string | null;
  tokenExpiresAtUtc?: string | null;
  signedByDesignation?: string | null;
  hasAddendum: boolean;
  checklist: AcceptanceTestItemDto[];
}

export interface TestItemResultInput {
  itemId: string;
  result: TestItemResult;
  remark?: string | null;
  punchCritical: boolean;
  punchOwnerUserId?: string | null;
  punchDueOn?: string | null;
}

export interface TestSigningLinkDto {
  path: string;
  url: string;
  expiresAtUtc: string;
  emailed: boolean;
  emailProblem?: string | null;
}

export interface PublicTestItemDto {
  text: string;
  result: TestItemResult;
  remark?: string | null;
  punchDueOn?: string | null;
}

export interface PublicTestViewDto {
  workspace: string;
  logoDataUrl?: string | null;
  title: string;
  kind: AcceptanceTestKind;
  version: number;
  orderNumber: string;
  customerPoNumber?: string | null;
  customerName?: string | null;
  signerName?: string | null;
  signerDesignation?: string | null;
  passed: number;
  notApplicable: number;
  checklist: PublicTestItemDto[];
  openPunch: PublicTestItemDto[];
  signed: boolean;
  signedByName?: string | null;
  signedAtUtc?: string | null;
  problem?: string | null;
  consentText: string;
}

/** FAT, SAT and commissioning records on project orders. */
@Injectable({ providedIn: 'root' })
export class AcceptanceTestService {
  private readonly rest = inject(RestService);
  apiName = 'Default';

  getListForOrder = (salesOrderId: string, config?: Partial<Rest.Config>) =>
    this.rest.request<void, AcceptanceTestSummaryDto[]>(
      { method: 'GET', url: `/api/auto-reach/acceptance-test/for-order/${salesOrderId}` },
      { apiName: this.apiName, ...config },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<void, AcceptanceTestDto>(
      { method: 'GET', url: `/api/auto-reach/acceptance-test/${id}` },
      { apiName: this.apiName, ...config },
    );

  create = (
    salesOrderId: string,
    input: { kind: AcceptanceTestKind; title?: string | null; items: string[] },
    config?: Partial<Rest.Config>,
  ) =>
    this.rest.request<typeof input, AcceptanceTestDto>(
      {
        method: 'POST',
        url: '/api/auto-reach/acceptance-test',
        params: { salesOrderId },
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  updateItems = (
    id: string,
    input: { items: { id?: string | null; text: string }[] },
    config?: Partial<Rest.Config>,
  ) =>
    this.rest.request<typeof input, AcceptanceTestDto>(
      { method: 'PUT', url: `/api/auto-reach/acceptance-test/${id}/items`, body: input },
      { apiName: this.apiName, ...config },
    );

  recordResults = (
    id: string,
    input: { results: TestItemResultInput[] },
    config?: Partial<Rest.Config>,
  ) =>
    this.rest.request<typeof input, AcceptanceTestDto>(
      { method: 'POST', url: `/api/auto-reach/acceptance-test/${id}/record-results`, body: input },
      { apiName: this.apiName, ...config },
    );

  sendForSignature = (
    id: string,
    input: {
      signerName: string;
      signerDesignation?: string | null;
      signerEmail?: string | null;
      sendEmail: boolean;
    },
    config?: Partial<Rest.Config>,
  ) =>
    this.rest.request<typeof input, TestSigningLinkDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/acceptance-test/${id}/send-for-signature`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  reissue = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<void, AcceptanceTestDto>(
      { method: 'POST', url: `/api/auto-reach/acceptance-test/${id}/reissue` },
      { apiName: this.apiName, ...config },
    );

  closePunch = (id: string, itemId: string, config?: Partial<Rest.Config>) =>
    this.rest.request<{ itemId: string }, AcceptanceTestDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/acceptance-test/${id}/close-punch`,
        body: { itemId },
      },
      { apiName: this.apiName, ...config },
    );

  getCertificate = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<void, Blob>(
      {
        method: 'GET',
        responseType: 'blob',
        headers: { Accept: 'application/octet-stream' },
        url: `/api/auto-reach/acceptance-test/${id}/certificate`,
      },
      { apiName: this.apiName, ...config },
    );

  getAddendum = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<void, Blob>(
      {
        method: 'GET',
        responseType: 'blob',
        headers: { Accept: 'application/octet-stream' },
        url: `/api/auto-reach/acceptance-test/${id}/addendum`,
      },
      { apiName: this.apiName, ...config },
    );

  delete = (id: string, config?: Partial<Rest.Config>) =>
    this.rest.request<void, void>(
      { method: 'DELETE', url: `/api/auto-reach/acceptance-test/${id}` },
      { apiName: this.apiName, ...config },
    );
}

/** The customer's signing page for a test certificate: anonymous, the link is the credential. */
@Injectable({ providedIn: 'root' })
export class TestSigningService {
  private readonly rest = inject(RestService);
  apiName = 'AutoReach';
  private readonly own: Partial<Rest.Config> = { skipHandleError: true };

  get = (token: string) =>
    this.rest.request<void, PublicTestViewDto>(
      { method: 'GET', url: `/api/test-signing/${token}` },
      { apiName: this.apiName, ...this.own },
    );

  sign = (
    token: string,
    input: {
      name: string;
      designation?: string | null;
      drawnSignature?: string | null;
      consent: boolean;
    },
  ) =>
    this.rest.request<typeof input, PublicTestViewDto>(
      { method: 'POST', url: `/api/test-signing/${token}/sign`, body: input },
      { apiName: this.apiName, ...this.own },
    );

  certificateUrl = (token: string, base: string) => `${base}/api/test-signing/${token}/certificate`;
}
