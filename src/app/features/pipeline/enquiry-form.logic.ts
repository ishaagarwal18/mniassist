import { LeadSource } from '../../proxy/pipeline';

export interface EnquiryDraft {
  contactId: string;
  contactLabel: string;
  pipelineId: string;
  title: string;
  requirement: string;
  valueRupees: string;
  source: LeadSource;
}

export const BLANK_ENQUIRY_DRAFT: EnquiryDraft = {
  contactId: '',
  contactLabel: '',
  pipelineId: '',
  title: '',
  requirement: '',
  valueRupees: '',
  source: LeadSource.Manual,
};

export const LEAD_SOURCES = [
  { value: LeadSource.Manual, label: 'Entered manually' },
  { value: LeadSource.Website, label: 'Website' },
  { value: LeadSource.ClickToWhatsApp, label: 'Click-to-WhatsApp ad' },
  { value: LeadSource.Exhibition, label: 'Exhibition' },
  { value: LeadSource.Referral, label: 'Referral' },
  { value: LeadSource.Dealer, label: 'Dealer' },
  { value: LeadSource.Project, label: 'Project' },
] as const;

export function validateEnquiryDraft(draft: EnquiryDraft): string | null {
  if (!draft.contactId) {
    return 'Pick the contact this enquiry is for.';
  }
  if (!draft.title || !draft.title.trim()) {
    return 'Give the enquiry a short title.';
  }
  if (draft.title.trim().length > 256) {
    return 'Enquiry title cannot exceed 256 characters.';
  }
  return null;
}

export function parseEstimatedValueInPaise(
  valueRupees: string | number | undefined | null,
): number | undefined {
  if (valueRupees == null) return undefined;
  const num =
    typeof valueRupees === 'number'
      ? valueRupees
      : Number(String(valueRupees).replace(/[^\d.]/g, ''));
  return num > 0 ? Math.round(num * 100) : undefined;
}
