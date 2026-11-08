import { RestService, Rest } from '@abp/ng.core';
import { Injectable, inject } from '@angular/core';

import { SalesInvoiceStatus } from '../sales/sales-enums';

export enum BillingTrigger {
  OrderConfirmed = 0,
  AdvanceReceived = 1,
  Dispatch = 2,
  DispatchProRata = 3,
  FatSigned = 4,
  SatSigned = 5,
  CommissioningSigned = 6,
  Date = 7,
  Manual = 8,
}

export enum BillingMilestoneStatus {
  Waiting = 0,
  Ready = 1,
  PartlyInvoiced = 2,
  Invoiced = 3,
  Paid = 4,
}

export enum AdvanceAdjustMode {
  FullFirst = 0,
  ProRata = 1,
}

export enum RetentionBase {
  Taxable = 0,
  Total = 1,
}

export interface SaveBillingMilestoneInput {
  id?: string | null;
  name: string;
  percentBp?: number | null;
  amountInPaise?: number | null;
  trigger: BillingTrigger;
  triggerDate?: string | null;
  expectedOn?: string | null;
  retentionPercentBp: number;
  paymentTermsDays?: number | null;
}

export interface SaveBillingPlanInput {
  advancePercentBp: number;
  advanceAdjustMode: AdvanceAdjustMode;
  retentionBase: RetentionBase;
  templateId?: string | null;
  reason?: string | null;
  milestones: SaveBillingMilestoneInput[];
}

export interface MilestoneInvoiceRefDto {
  id: string;
  invoiceNumber: string;
  status: SalesInvoiceStatus;
}

export interface BillingMilestoneDto {
  id: string;
  order: number;
  name: string;
  percentBp?: number | null;
  amountInPaise: number;
  trigger: BillingTrigger;
  triggerDate?: string | null;
  expectedOn?: string | null;
  retentionPercentBp: number;
  paymentTermsDays?: number | null;
  status: BillingMilestoneStatus;
  readyAmountInPaise: number;
  invoicedAmountInPaise: number;
  billableInPaise: number;
  readyAtUtc?: string | null;
  overrideReason?: string | null;
  invoices: MilestoneInvoiceRefDto[];
  receivedInPaise: number;
}

export interface BillingPlanDto {
  id: string;
  salesOrderId: string;
  orderNumber: string;
  orderValueInPaise: number;
  currentOrderValueInPaise: number;
  advancePercentBp: number;
  advanceInPaise: number;
  advanceAdjustMode: AdvanceAdjustMode;
  retentionBase: RetentionBase;
  templateId?: string | null;
  lockedAtUtc?: string | null;
  milestones: BillingMilestoneDto[];
  billedInPaise: number;
  receivedInPaise: number;
  unbilledInPaise: number;
  retentionHeldInPaise: number;
  advanceUnadjustedInPaise: number;
}

export interface BillingPlanTemplateDto {
  id?: string | null;
  name: string;
  advancePercentBp: number;
  isStandard: boolean;
  milestones: SaveBillingMilestoneInput[];
}

export interface PreparedMilestoneInvoiceDto {
  invoiceId: string;
  invoiceNumber: string;
  created: boolean;
}

export interface DueMilestoneDto {
  milestoneId: string;
  salesOrderId: string;
  orderNumber: string;
  customerName?: string | null;
  milestone: string;
  trigger: BillingTrigger;
  billableInPaise: number;
  readyAtUtc?: string | null;
  daysReady: number;
  draftInvoiceId?: string | null;
}

/** Billing plans on project sales orders. */
@Injectable({ providedIn: 'root' })
export class BillingPlanService {
  private readonly rest = inject(RestService);
  apiName = 'Default';

  getForOrder = (salesOrderId: string, config?: Partial<Rest.Config>) =>
    this.rest.request<void, BillingPlanDto | null>(
      { method: 'GET', url: `/api/auto-reach/billing-plan/for-order/${salesOrderId}` },
      { apiName: this.apiName, ...config },
    );

  save = (salesOrderId: string, input: SaveBillingPlanInput, config?: Partial<Rest.Config>) =>
    this.rest.request<SaveBillingPlanInput, BillingPlanDto>(
      { method: 'POST', url: `/api/auto-reach/billing-plan/save/${salesOrderId}`, body: input },
      { apiName: this.apiName, ...config },
    );

  getTemplates = (config?: Partial<Rest.Config>) =>
    this.rest.request<void, BillingPlanTemplateDto[]>(
      { method: 'GET', url: '/api/auto-reach/billing-plan/templates' },
      { apiName: this.apiName, ...config },
    );

  saveTemplate = (
    input: {
      id?: string | null;
      name: string;
      advancePercentBp: number;
      milestones: SaveBillingMilestoneInput[];
    },
    config?: Partial<Rest.Config>,
  ) =>
    this.rest.request<typeof input, BillingPlanTemplateDto>(
      { method: 'POST', url: '/api/auto-reach/billing-plan/save-template', body: input },
      { apiName: this.apiName, ...config },
    );

  createInvoiceDraft = (milestoneId: string, config?: Partial<Rest.Config>) =>
    this.rest.request<void, PreparedMilestoneInvoiceDto>(
      { method: 'POST', url: `/api/auto-reach/billing-plan/invoice-draft/${milestoneId}` },
      { apiName: this.apiName, ...config },
    );

  markReady = (milestoneId: string, reason: string | null, config?: Partial<Rest.Config>) =>
    this.rest.request<{ reason: string | null }, BillingPlanDto>(
      {
        method: 'POST',
        url: `/api/auto-reach/billing-plan/mark-ready/${milestoneId}`,
        body: { reason },
      },
      { apiName: this.apiName, ...config },
    );

  getDue = (config?: Partial<Rest.Config>) =>
    this.rest.request<void, DueMilestoneDto[]>(
      { method: 'GET', url: '/api/auto-reach/billing-plan/due' },
      { apiName: this.apiName, ...config },
    );
}
