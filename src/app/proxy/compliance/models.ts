import type { EntityDto } from '@abp/ng.core';

export interface ConsentTextVersionDto extends EntityDto<string> {
  key: string;
  version: number;
  languageCode: string;
  /** What the person is shown before they agree. Stored verbatim, forever. */
  noticeText: string;
  /** Named purposes. DPDP consent is per purpose, not blanket. */
  purposesText: string;
  affirmativeActionLabel?: string;
  withdrawalInstructions?: string;
  publishedAtUtc?: string;
  retiredAtUtc?: string;
  isPublished: boolean;
  isCurrent: boolean;
  /** `website-enquiry-form@hi/v3` — what a consent record stores. */
  reference: string;
  /** How many consents rest on this text. Shown before retiring one. */
  consentCount: number;
}

export interface CreateConsentTextVersionDto {
  key: string;
  languageCode: string;
  noticeText: string;
  purposesText: string;
  affirmativeActionLabel?: string;
  withdrawalInstructions?: string;
}

export interface UpdateConsentTextVersionDto {
  noticeText: string;
  purposesText: string;
  affirmativeActionLabel?: string;
  withdrawalInstructions?: string;
}
