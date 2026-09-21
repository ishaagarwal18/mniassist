import type { QuotationTaxLineDto } from './models';
import type { SignatureRequestStatus } from './signature-request-status.enum';

export interface RequestSignatureInput {
  signerName: string;
  signerEmail?: string | null;
  signerPhone?: string | null;
  validForDays?: number;
  sendByEmail?: boolean;
  sendByWhatsApp?: boolean;
  whatsAppTemplateId?: string | null;
  requireVerificationCode?: boolean;
}

export interface SigningDeliveryDto {
  emailSent?: boolean;
  emailNote?: string | null;
  whatsAppSent?: boolean;
  whatsAppNote?: string | null;
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
  requiresCode?: boolean;
  codeVerifiedAtUtc?: string | null;
  emailSentAtUtc?: string | null;
  whatsAppSentAtUtc?: string | null;
  /** How sending went. Only in the reply to the request that made the link. */
  delivery?: SigningDeliveryDto | null;
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
  requiresCode?: boolean;
  codeSentTo?: string | null;
}

export interface SubmitSignatureInput {
  typedName: string;
  drawnSignature?: string | null;
  consent: boolean;
  code?: string | null;
}

export interface SigningCodeSentDto {
  sentTo?: string;
  validForMinutes?: number;
}

export interface SigningResultDto {
  status?: SignatureRequestStatus;
  signedAtUtc?: string | null;
  signedName?: string | null;
}
