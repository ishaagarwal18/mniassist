export interface ReadVendorBillInput {
  /** The file, base64 or a data: URL. PDF up to 10 MB, or a JPEG/PNG/WebP photo up to 5 MB. */
  content: string;
  mediaType: string;
}

export interface VendorBillReadingLineDto {
  partNumber?: string;
  description: string;
  hsnCode?: string;
  quantity: number;
  unit?: string;
  unitPriceInPaise: number;
  discountPercent: number;
  /** 1800 = 18%. */
  taxRateBasisPoints: number;
}

/** A supplier's tax invoice as the AI read it; nothing is saved. */
export interface VendorBillReadingDto {
  supplierName?: string;
  supplierGstin?: string;
  /** The supplier on file it matched, by GSTIN or name. */
  matchedSupplierId?: string;
  matchedSupplierName?: string;
  buyerGstin?: string;
  invoiceNumber?: string;
  /** yyyy-MM-dd */
  invoiceDate?: string;
  dueDate?: string;
  purchaseOrderReference?: string;
  /** Null when it can't be told. */
  isInterState?: boolean | null;
  isReverseCharge: boolean;
  taxableTotalInPaise?: number;
  taxTotalInPaise?: number;
  grandTotalInPaise?: number;
  lines: VendorBillReadingLineDto[];
  /** What could not be read clearly. */
  note?: string;
}
