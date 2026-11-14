export enum AccountCategory {
  Asset = 0,
  Liability = 1,
  Equity = 2,
  Revenue = 3,
  Expense = 4,
}

export enum AccountSubCategory {
  CurrentAsset = 0,
  NonCurrentAsset = 1,
  BankAndCash = 2,
  AccountsReceivable = 3,
  Inventory = 4,
  CurrentLiability = 10,
  NonCurrentLiability = 11,
  AccountsPayable = 12,
  DutiesAndTaxes = 13,
  ShareCapital = 20,
  RetainedEarnings = 21,
  OperatingRevenue = 30,
  OtherIncome = 31,
  CostOfGoodsSold = 40,
  OperatingExpense = 41,
  DepreciationAndAmortization = 42,
  TaxExpense = 43,
}

export enum BalanceNature {
  Debit = 0,
  Credit = 1,
}

export enum JournalVoucherType {
  GeneralJournal = 0,
  SalesVoucher = 1,
  PurchaseVoucher = 2,
  PaymentVoucher = 3,
  ReceiptVoucher = 4,
  ContraVoucher = 5,
  CreditNote = 6,
  DebitNote = 7,
}

export enum JournalVoucherStatus {
  Draft = 0,
  Posted = 1,
  Cancelled = 2,
}

export enum Gstr1Section {
  B2B_4A = 0,
  B2CL_5 = 1,
  B2CS_7 = 2,
  CDNR_9B = 3,
  EXP_6 = 4,
  NIL_8 = 5,
  HSN_12 = 6,
}

export enum EInvoiceStatus {
  NotApplicable = 0,
  PendingGeneration = 1,
  Generated = 2,
  Cancelled = 3,
  Failed = 4,
}

export enum EWayBillStatus {
  NotApplicable = 0,
  PendingGeneration = 1,
  Active = 2,
  Cancelled = 3,
  Expired = 4,
}

/** Where a workspace's e-invoices and e-way bills are registered. Only Live numbers are legally valid. */
export enum GstPortalMode {
  Off = 0,
  Test = 1,
  Sandbox = 2,
  Live = 3,
}

export enum EWayTransportMode {
  Road = 1,
  Rail = 2,
  Air = 3,
  Ship = 4,
}

export enum GstCancelReason {
  Duplicate = 1,
  DataEntryMistake = 2,
  OrderCancelled = 3,
  Other = 4,
}
