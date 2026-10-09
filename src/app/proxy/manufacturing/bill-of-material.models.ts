import { EntityDto, FullAuditedEntityDto, PagedAndSortedResultRequestDto } from '@abp/ng.core';
import { BomStatus, BomType, RoutingStage } from './manufacturing-enums';

export interface BillOfMaterialItemDto extends EntityDto<string> {
  billOfMaterialId: string;
  itemSequence: number;
  componentPartNumber: string;
  componentDescription: string;
  quantityPerUnit: number;
  unitOfMeasure: string;
  scrapPercentage: number;
  unitCostInPaise: number;
  routingStage: RoutingStage;
  isSubAssembly: boolean;
  subAssemblyBomId?: string;
}

export interface BillOfMaterialDto extends FullAuditedEntityDto<string> {
  bomNumber: string;
  revisionCode: string;
  finishedGoodPartNumber: string;
  finishedGoodDescription: string;
  finishedGoodUom: string;
  baseQuantity: number;
  bomType: BomType;
  status: BomStatus;
  totalEstimatedCostInPaise: number;
  remarks?: string;
  items: BillOfMaterialItemDto[];
}

export interface CreateBillOfMaterialItemDto {
  itemSequence: number;
  componentPartNumber: string;
  componentDescription: string;
  quantityPerUnit: number;
  unitOfMeasure: string;
  scrapPercentage: number;
  unitCostInPaise: number;
  routingStage: RoutingStage;
  isSubAssembly: boolean;
  subAssemblyBomId?: string;
}

export interface CreateBillOfMaterialDto {
  bomNumber?: string;
  revisionCode: string;
  finishedGoodPartNumber: string;
  finishedGoodDescription: string;
  finishedGoodUom: string;
  baseQuantity: number;
  bomType: BomType;
  remarks?: string;
  items: CreateBillOfMaterialItemDto[];
}

export interface UpdateBillOfMaterialDto {
  revisionCode: string;
  finishedGoodDescription: string;
  finishedGoodUom: string;
  baseQuantity: number;
  status: BomStatus;
  remarks?: string;
  items: CreateBillOfMaterialItemDto[];
}

export interface GetBillOfMaterialsInput extends PagedAndSortedResultRequestDto {
  filter?: string;
  status?: BomStatus;
  bomType?: BomType;
}
