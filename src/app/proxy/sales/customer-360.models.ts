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
