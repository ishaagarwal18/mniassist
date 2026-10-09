import { PagedAndSortedResultRequestDto, FullAuditedEntityDto, EntityDto } from '@abp/ng.core';
import { GrnStatus, QcInspectionStatus } from './purchasing-enums';

export interface GoodsReceiptNoteLineDto extends EntityDto<string> {
  goodsReceiptNoteId: string;
  lineNumber: number;
  purchaseOrderLineId?: string;
  productId?: string;
  partNumber: string;
  description: string;
  orderedQuantity: number;
  challanQuantity: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  rejectionReason?: string;
  unitOfMeasure: string;
  storageBin?: string;
  batchOrSerialNumber?: string;
}

export interface GoodsReceiptNoteDto extends FullAuditedEntityDto<string> {
  grnNumber: string;
  purchaseOrderId?: string;
  purchaseOrderReference?: string;
  supplierId: string;
  supplierName: string;
  locationId?: string;
  locationName?: string;
  challanNumber: string;
  challanDateUtc?: string;
  vehicleNumber?: string;
  transporterName?: string;
  gateEntryNumber?: string;
  gateInTimeUtc?: string;
  status: GrnStatus;
  qcStatus: QcInspectionStatus;
  inspectorNotes?: string;
  inspectedAtUtc?: string;
  inspectedByUserId?: string;
  remarks?: string;
  lines: GoodsReceiptNoteLineDto[];
}

export interface CreateGoodsReceiptNoteLineDto {
  purchaseOrderLineId?: string;
  productId?: string;
  partNumber: string;
  description: string;
  orderedQuantity: number;
  challanQuantity: number;
  receivedQuantity: number;
  unitOfMeasure: string;
  storageBin?: string;
  batchOrSerialNumber?: string;
}

export interface CreateGoodsReceiptNoteDto {
  grnNumber?: string;
  purchaseOrderId?: string;
  purchaseOrderReference?: string;
  supplierId: string;
  supplierName: string;
  locationId?: string;
  locationName?: string;
  challanNumber: string;
  challanDateUtc?: string;
  vehicleNumber?: string;
  transporterName?: string;
  gateEntryNumber?: string;
  gateInTimeUtc?: string;
  remarks?: string;
  lines: CreateGoodsReceiptNoteLineDto[];
}

export interface CompleteQcInspectionLineDto {
  lineId: string;
  acceptedQuantity: number;
  rejectedQuantity: number;
  rejectionReason?: string;
  storageBin?: string;
}

export interface CompleteQcInspectionDto {
  qcStatus: QcInspectionStatus;
  inspectorNotes?: string;
  lineInspections: CompleteQcInspectionLineDto[];
}

export interface GetGoodsReceiptNotesInput extends PagedAndSortedResultRequestDto {
  filter?: string;
  status?: GrnStatus;
  qcStatus?: QcInspectionStatus;
  supplierId?: string;
  purchaseOrderId?: string;
}
