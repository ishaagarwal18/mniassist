export enum TelecomEntityClassification {
  VirtualNetworkOperator = 0,
  TelecomIdentifierUserEntity = 1,
  DltPrincipalEntity = 2,
  RegisteredTelemarketer = 3,
  TechProviderBsp = 4,
}

export enum ResellerNumberStatus {
  Available = 0,
  Allocated = 1,
  Reserved = 2,
  Quarantined = 3,
  Suspended = 4,
}

export enum ResellerNumberType {
  VirtualDid = 0,
  SimBoundMobile = 1,
  TollFree = 2,
  LandlineDid = 3,
}

export enum TelecomKycStatus {
  PendingKyc = 0,
  Verified = 1,
  Rejected = 2,
  Exempt = 3,
}

export enum SimBindingStatus {
  Compliant = 0,
  AuthorizedCarrierAllocation = 1,
  PendingVerification = 2,
  NonCompliant = 3,
}
