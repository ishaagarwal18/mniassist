export enum WebFormFieldKind {
  Text = 0,
  Email = 1,
  Phone = 2,
  LongText = 3,
  Select = 4,
  Checkbox = 5,
  Number = 6,
}

/** Where a field's answer goes when the form is submitted. */
export enum WebFormFieldTarget {
  None = 0,
  Name = 1,
  Email = 2,
  Phone = 3,
  Company = 4,
  City = 5,
  Requirement = 6,
  EstimatedValue = 7,
}

export interface WebFormFieldDto {
  key: string;
  label: string;
  kind: WebFormFieldKind;
  required: boolean;
  placeholder?: string | null;
  helpText?: string | null;
  options: string[];
  target: WebFormFieldTarget;
}

export interface WebFormDto {
  id: string;
  name: string;
  slug: string;
  title: string;
  intro?: string | null;
  submitLabel: string;
  successMessage: string;
  redirectUrl?: string | null;
  isActive: boolean;
  consentText: string;
  marketingOptInText?: string | null;
  createEnquiry: boolean;
  enquiryTitle?: string | null;
  viewCount: number;
  submissionCount: number;
  lastSubmissionAtUtc?: string | null;
  creationTime: string;
  fields: WebFormFieldDto[];
  /** The address of the hosted form page, ready to share or link to. */
  publicUrl: string;
}

export interface CreateUpdateWebFormDto {
  name: string;
  title: string;
  intro?: string | null;
  submitLabel?: string | null;
  successMessage?: string | null;
  redirectUrl?: string | null;
  consentText: string;
  marketingOptInText?: string | null;
  createEnquiry: boolean;
  enquiryTitle?: string | null;
  isActive: boolean;
  fields: WebFormFieldDto[];
}

export interface WebFormAnswerDto {
  label: string;
  value: string;
}

export interface WebFormSubmissionDto {
  id: string;
  contactId: string;
  contactName?: string | null;
  enquiryId?: string | null;
  enquiryReference?: string | null;
  submittedAtUtc: string;
  answers: WebFormAnswerDto[];
  sourceUrl?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}

export interface WebFormEmbedDto {
  publicUrl: string;
  iframeHtml: string;
}

// ---- the public side ----

export interface PublicWebFormFieldDto {
  key: string;
  label: string;
  kind: WebFormFieldKind;
  required: boolean;
  placeholder?: string | null;
  helpText?: string | null;
  options: string[];
}

export interface PublicWebFormDto {
  title: string;
  intro?: string | null;
  submitLabel: string;
  consentText: string;
  marketingOptInText?: string | null;
  fields: PublicWebFormFieldDto[];
}

export interface SubmitWebFormInput {
  answers: Record<string, string | null>;
  consent: boolean;
  marketingOptIn: boolean;
  /** A field real visitors never see. Anything in it means a script filled in the form. */
  website?: string | null;
  sourceUrl?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}

export interface SubmitWebFormResultDto {
  message: string;
  redirectUrl?: string | null;
}
