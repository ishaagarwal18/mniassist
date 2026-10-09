export enum GrnStatus {
  Draft = 0,
  UnderInspection = 1,
  Approved = 2,
  Rejected = 3,
  Billed = 4,
  Cancelled = 5,
}

export enum QcInspectionStatus {
  Pending = 0,
  Passed = 1,
  PartiallyPassed = 2,
  Failed = 3,
}

export enum VendorBillStatus {
  Draft = 0,
  PendingApproval = 1,
  Approved = 2,
  PartiallyPaid = 3,
  Paid = 4,
  Cancelled = 5,
}

export enum ThreeWayMatchStatus {
  Pending = 0,
  Matched = 1,
  PriceVariance = 2,
  QuantityVariance = 3,
  ManualOverride = 4,
}

export enum Gstr2bMatchStatus {
  Pending = 0,
  MatchedIn2B = 1,
  MissingIn2B = 2,
  TaxMismatch = 3,
}

export enum VendorPaymentMode {
  NeftRtgs = 0,
  Cheque = 1,
  Upi = 2,
  Cash = 3,
}

export enum VendorDebitNoteStatus {
  Draft = 0,
  Issued = 1,
  Settled = 2,
  Cancelled = 3,
}

export enum MsmeClassification {
  NotRegistered = 0,
  Micro = 1,
  Small = 2,
  Medium = 3,
}
