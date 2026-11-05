export enum SalesOrderStatus {
  Draft = 0,
  Confirmed = 1,
  InProduction = 2,
  PartiallyDispatched = 3,
  Dispatched = 4,
  Completed = 5,
  Cancelled = 6,
}

export enum DeliveryChallanType {
  SupplyAgainstOrder = 0,
  JobWork = 1,
  SupplyOnApproval = 2,
  MaterialReturn = 3,
  Other = 4,
}

export enum DeliveryChallanStatus {
  Draft = 0,
  Dispatched = 1,
  Delivered = 2,
  Invoiced = 3,
  Cancelled = 4,
}

export enum SalesInvoiceKind {
  TaxInvoice = 0,
  CreditNote = 1,
  DebitNote = 2,
  BillOfSupply = 3,
}

export enum SalesInvoiceStatus {
  Draft = 0,
  Issued = 1,
  PartiallyPaid = 2,
  Paid = 3,
  Cancelled = 4,
}

export enum SalesPaymentMode {
  NeftRtgs = 0,
  Upi = 1,
  Cheque = 2,
  Cash = 3,
  Card = 4,
  Other = 5,
}

/** The file a download comes as: the printed PDF (a register for a list) or an Excel workbook. */
export enum SalesExportFormat {
  Pdf = 0,
  Excel = 1,
}
