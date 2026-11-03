import { PagedAndSortedResultRequestDto, FullAuditedEntityDto, EntityDto } from '@abp/ng.core';
import { DeliveryChallanStatus, DeliveryChallanType } from './sales-enums';

export interface DeliveryChallanLineDto extends EntityDto<string> {
  deliveryChallanId: string;
  lineNumber: number;
  salesOrderLineId?: string;
  productId?: string;
  partNumber: string;
  description: string;
  hsnCode?: string;
  quantity: number;
  unitOfMeasure?: string;
}

export interface DeliveryChallanDto extends FullAuditedEntityDto<string> {
  challanNumber: string;
  type: DeliveryChallanType;
  status: DeliveryChallanStatus;
  salesOrderId?: string;
  salesOrderNumber?: string;
  customerId: string;
  customerName: string;
  customerAccountId?: string;
  customerAccountName?: string;
  challanDateUtc: string;
  dispatchedAtUtc?: string;
  deliveredAtUtc?: string;
  dispatchFromLocationId?: string;
  dispatchFromLocationName?: string;
  shippingAddress?: string;
  transporterName?: string;
  vehicleNumber?: string;
  lrNumber?: string;
  eWayBillNumber?: string;
  ewayBillNumber?: string;
  remarks?: string;
  lines: DeliveryChallanLineDto[];
}

export interface CreateDeliveryChallanLineDto {
  salesOrderLineId?: string;
  productId?: string;
  partNumber: string;
  description: string;
  hsnCode?: string;
  quantity: number;
  unitOfMeasure?: string;
}

export interface CreateDeliveryChallanDto {
  challanNumber?: string;
  type: DeliveryChallanType;
  salesOrderId?: string;
  customerId: string;
  customerAccountId?: string;
  challanDateUtc?: string;
  dispatchFromLocationId?: string;
  shippingAddress?: string;
  transporterName?: string;
  vehicleNumber?: string;
  lrNumber?: string;
  eWayBillNumber?: string;
  ewayBillNumber?: string;
  remarks?: string;
  lines: CreateDeliveryChallanLineDto[];
}

export interface DispatchDeliveryChallanDto {
  transporterName?: string;
  vehicleNumber?: string;
  lrNumber?: string;
  eWayBillNumber?: string;
  ewayBillNumber?: string;
  dispatchedAtUtc?: string;
}

export interface GetDeliveryChallansInput extends PagedAndSortedResultRequestDto {
  filter?: string;
  status?: DeliveryChallanStatus;
  type?: DeliveryChallanType;
  salesOrderId?: string;
  customerId?: string;
  /** Every challan for the account's contacts. */
  customerAccountId?: string;
}
