import type { QuotationTaxLineDto } from './models';
import type { SignatureRequestStatus } from './signature-request-status.enum';

export interface RequestSignatureInput {
  signerName: string;
  signerEmail?: string | null;
  signerPhone?: string | null;
  validForDays?: number;
}

export interface SignatureRequestDto {
  id?: string;
  quotationId?: string;
  revisionNumber?: number;
  signerName?: string;
  signerEmail?: string | null;
  signerPhone?: string | null;
  status?: SignatureRequestStatus;
  creationTime?: string;
  expiresAtUtc?: string;
  viewedAtUtc?: string | null;
  signedAtUtc?: string | null;
  signedName?: string | null;
  hasDrawnSignature?: boolean;
  declinedAtUtc?: string | null;
  declineReason?: string | null;
  /** Only in the reply to the request that made the link: the secret is not kept. */
  signingPath?: string | null;
}

export interface QuotationSignatureSummaryDto {
  quotationId?: string;
  status?: SignatureRequestStatus;
  signedAtUtc?: string | null;
  signedName?: string | null;
  expiresAtUtc?: string | null;
}

export interface SigningLineDto {
  order?: number;
  partNumber?: string | null;
  description?: string;
  quantity?: number;
  unit?: string;
  unitPriceInPaise?: number;
  discountBasisPoints?: number;
  taxRateBasisPoints?: number;
  lineTotalInPaise?: number;
}

export interface SigningViewDto {
  status?: SignatureRequestStatus;
  canSign?: boolean;
  reason?: string | null;
  reference?: string;
  revision?: number;
  companyName?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  logoDataUrl?: string | null;
  recipientName?: string | null;
  signerName?: string;
  issuedAtUtc?: string | null;
  validUntilUtc?: string | null;
  expiresAtUtc?: string;
  consentText?: string;
  lines?: SigningLineDto[];
  subtotalInPaise?: number;
  taxInPaise?: number;
  totalInPaise?: number;
  taxBreakdown?: QuotationTaxLineDto[];
  signedAtUtc?: string | null;
  signedName?: string | null;
}

export interface SubmitSignatureInput {
  typedName: string;
  drawnSignature?: string | null;
  consent: boolean;
}

export interface SigningResultDto {
  status?: SignatureRequestStatus;
  signedAtUtc?: string | null;
  signedName?: string | null;
}
