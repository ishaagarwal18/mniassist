import { mapEnumToOptions } from '@abp/ng.core';

export enum SignatureRequestStatus {
  Pending = 0,
  Signed = 1,
  Declined = 2,
  Expired = 3,
  Voided = 4,
}

export const signatureRequestStatusOptions = mapEnumToOptions(SignatureRequestStatus);
