import type { InvoiceDto } from '../billing/models';
import type {
  AssignPlanInput,
  CreateCustomPlanInput,
  CustomPlanDto,
  HostGenerateInvoiceInput,
  WorkspaceInvoiceInput,
  SetWalletGraceInput,
  SetWorkspaceUserPasswordInput,
  SetWorkspaceDatabaseInput,
  SetWorkspaceFeatureInput,
  SuspendWorkspaceInput,
  WorkspaceDetailDto,
  WorkspaceUserDto,
} from './models';
import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class HostWorkspaceService {
  private restService = inject(RestService);
  apiName = 'AutoReach';

  getCustomPlans = () =>
    this.restService.request<void, CustomPlanDto[]>(
      { method: 'GET', url: '/api/auto-reach/host-workspace/custom-plans' },
      { apiName: this.apiName },
    );

  saveCustomPlan = (body: CreateCustomPlanInput) =>
    this.restService.request<CreateCustomPlanInput, CustomPlanDto>(
      { method: 'POST', url: '/api/auto-reach/host-workspace/save-custom-plan', body },
      { apiName: this.apiName },
    );

  get = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WorkspaceDetailDto>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/host-workspace/${id}`,
      },
      { apiName: this.apiName, ...config },
    );

  getUsers = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WorkspaceUserDto[]>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/host-workspace/${id}/users`,
      },
      { apiName: this.apiName, ...config },
    );

  setUserPassword = (
    id: string,
    input: SetWorkspaceUserPasswordInput,
    config?: Partial<Rest.Config>,
  ) =>
    this.restService.request<any, WorkspaceUserDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/host-workspace/${id}/set-user-password`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  suspend = (id: string, input: SuspendWorkspaceInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WorkspaceDetailDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/host-workspace/${id}/suspend`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  reactivate = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WorkspaceDetailDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/host-workspace/${id}/reactivate`,
      },
      { apiName: this.apiName, ...config },
    );

  assignPlan = (id: string, input: AssignPlanInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WorkspaceDetailDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/host-workspace/${id}/assign-plan`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  setFeature = (id: string, input: SetWorkspaceFeatureInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WorkspaceDetailDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/host-workspace/${id}/set-feature`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  setDatabase = (id: string, input: SetWorkspaceDatabaseInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WorkspaceDetailDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/host-workspace/${id}/set-database`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  removeDatabase = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WorkspaceDetailDto>(
      {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/host-workspace/${id}/database`,
      },
      { apiName: this.apiName, ...config },
    );

  setWalletGrace = (id: string, input: SetWalletGraceInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WorkspaceDetailDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/host-workspace/${id}/set-wallet-grace`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  migrateDatabase = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, WorkspaceDetailDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/host-workspace/${id}/migrate-database`,
      },
      { apiName: this.apiName, ...config },
    );

  getInvoices = (id: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InvoiceDto[]>(
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/host-workspace/${id}/invoices`,
      },
      { apiName: this.apiName, ...config },
    );

  generateInvoice = (id: string, input: HostGenerateInvoiceInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InvoiceDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/host-workspace/${id}/generate-invoice`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  issueInvoice = (id: string, input: WorkspaceInvoiceInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InvoiceDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/host-workspace/${id}/issue-invoice`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  markInvoicePaid = (id: string, input: WorkspaceInvoiceInput, config?: Partial<Rest.Config>) =>
    this.restService.request<any, InvoiceDto>(
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        url: `/api/auto-reach/host-workspace/${id}/mark-invoice-paid`,
        body: input,
      },
      { apiName: this.apiName, ...config },
    );

  downloadInvoicePdf = (id: string, invoiceId: string, config?: Partial<Rest.Config>) =>
    this.restService.request<any, Blob>(
      {
        method: 'POST',
        responseType: 'blob',
        headers: { Accept: 'application/octet-stream' },
        url: `/api/auto-reach/host-workspace/${id}/download-invoice-pdf/${invoiceId}`,
      },
      { apiName: this.apiName, ...config },
    );
}
