export interface StockPlanInput {
  lookbackDays?: number;
  horizonDays?: number;
  safetyDays?: number;
  defaultLeadDays?: number;
  coverDays?: number;
}

export interface StockProjectionPointDto {
  on?: string;
  balance?: number;
}

export interface StockPlanLineDto {
  productId?: string;
  partNumber?: string;
  name?: string;
  unit?: string | null;
  onHand?: number;
  reserved?: number;
  available?: number;
  onOrder?: number;
  nextArrivalOn?: string | null;
  minLevel?: number | null;
  dailyUsage?: number;
  usedInWindow?: number;
  trend?: number | null;
  daysOfCover?: number | null;
  stockoutOn?: string | null;
  leadDays?: number;
  safetyStock?: number;
  reorderPoint?: number;
  suggestedOrderQuantity?: number;
  unitCostInPaise?: number;
  suggestedOrderValueInPaise?: number;
  stockValueInPaise?: number;
  status?: string;
  projection?: StockProjectionPointDto[];
}

export interface StockPlanDto {
  asOfUtc?: string;
  lookbackDays?: number;
  horizonDays?: number;
  outCount?: number;
  orderNowCount?: number;
  orderSoonCount?: number;
  overstockCount?: number;
  noUsageCount?: number;
  suggestedOrderValueInPaise?: number;
  idleValueInPaise?: number;
  lines?: StockPlanLineDto[];
}

export interface ReportRangeInput {
  fromUtc?: string | null;
  toUtc?: string | null;
}

export interface StockLocationValueDto {
  location?: string;
  parts?: number;
  units?: number;
  valueInPaise?: number;
}

export interface StockMonthDto {
  month?: string;
  unitsIn?: number;
  unitsOut?: number;
  valueInInPaise?: number;
  valueOutInPaise?: number;
}

export interface StockAbcClassDto {
  class?: string;
  parts?: number;
  issuedValueInPaise?: number;
  share?: number;
}

export interface StockItemReportDto {
  productId?: string;
  partNumber?: string;
  name?: string;
  abcClass?: string | null;
  onHand?: number;
  stockValueInPaise?: number;
  issuedUnits?: number;
  issuedValueInPaise?: number;
  lastIssuedUtc?: string | null;
  daysIdle?: number | null;
}

export interface StockReportDto {
  fromUtc?: string;
  toUtc?: string;
  stockValueInPaise?: number;
  partsInStock?: number;
  unitsOnHand?: number;
  receivedValueInPaise?: number;
  issuedValueInPaise?: number;
  adjustmentValueInPaise?: number;
  annualTurnover?: number | null;
  daysOfInventory?: number | null;
  byLocation?: StockLocationValueDto[];
  byMonth?: StockMonthDto[];
  abc?: StockAbcClassDto[];
  topIssued?: StockItemReportDto[];
  idle?: StockItemReportDto[];
}

export interface PaymentMonthDto {
  month?: string;
  requestedInPaise?: number;
  collectedInPaise?: number;
  paid?: number;
  sent?: number;
}

export interface PaymentCustomerDto {
  customerId?: string;
  name?: string;
  amountInPaise?: number;
  overdueInPaise?: number;
  count?: number;
  oldestDaysOverdue?: number | null;
}

export interface PaymentFailureDto {
  reason?: string;
  count?: number;
}

export interface AgeingBucketDto {
  bucket?: string;
  invoices?: number;
  amountInPaise?: number;
}

export interface PaymentReportDto {
  fromUtc?: string;
  toUtc?: string;
  linksSent?: number;
  linksValueInPaise?: number;
  linksPaid?: number;
  collectedInPaise?: number;
  linksOpen?: number;
  openValueInPaise?: number;
  linksFailed?: number;
  linksExpired?: number;
  conversionRate?: number | null;
  medianHoursToPay?: number | null;
  byMonth?: PaymentMonthDto[];
  topPayers?: PaymentCustomerDto[];
  failureReasons?: PaymentFailureDto[];
  hasReceivables?: boolean;
  outstandingInPaise?: number;
  overdueInPaise?: number;
  overdueInvoices?: number;
  daysSalesOutstanding?: number | null;
  ageing?: AgeingBucketDto[];
  topDebtors?: PaymentCustomerDto[];
}
