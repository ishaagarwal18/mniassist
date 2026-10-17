import { EntityDto } from '@abp/ng.core';
import type { SalesOrderDto } from './sales-order.models';
import type { DeliveryChallanDto } from './delivery-challan.models';
import type { SalesInvoiceDto } from './sales-invoice.models';

export interface Customer360CreditDto {
  creditLimitInPaise?: number;
  paymentTermsDays?: number;
  totalOwedInPaise: number;
  totalOnOrderInPaise: number;
  totalOverdueInPaise: number;
  onHold: boolean;
  holdReason?: string;
}

export interface Customer360TicketDto {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  creationTime: string;
}

export interface Customer360AssetDto {
  id: string;
  serialNumber: string;
  modelName: string;
  commissionedDate?: string;
  status?: string;
  amcStatus?: string;
}

export interface Customer360InteractionDto {
  id: string;
  channel: string;
  summary: string;
  occurredAtUtc: string;
  direction: string;
}

export interface Customer360Dto extends EntityDto<string> {
  /** The contact this view is about; for a whole account, its newest contact. */
  contactId?: string;
  contactName?: string;
  /** True when the figures cover every contact on the account, not one person. */
  isAccountView?: boolean;
  /** The account has accounts beneath it (companies, plants). */
  hasSubsidiaries?: boolean;
  /** The figures include every account beneath this one. */
  includesSubsidiaries?: boolean;
  customerName: string;
  email?: string;
  phone?: string;
  accountId?: string;
  accountName?: string;
  industry?: string;
  city?: string;
  state?: string;
  gstin?: string;

  credit: Customer360CreditDto;

  lifetimeRevenueInPaise: number;
  totalOrdersCount: number;
  /** Orders confirmed, in production or part-dispatched. */
  activeOrdersCount: number;
  totalChallansCount: number;
  totalInvoicesCount: number;
  openTicketsCount: number;
  installedAssetsCount: number;

  recentOrders: SalesOrderDto[];
  recentChallans: DeliveryChallanDto[];
  recentInvoices: SalesInvoiceDto[];
  openTickets: Customer360TicketDto[];
  installedAssets: Customer360AssetDto[];
  timeline: Customer360InteractionDto[];
}
