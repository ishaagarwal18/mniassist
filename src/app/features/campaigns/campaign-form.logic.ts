export interface CampaignDraft {
  name: string;
  channelId: string;
  templateId: string;
}

export const BLANK_CAMPAIGN_DRAFT: CampaignDraft = {
  name: '',
  channelId: '',
  templateId: '',
};

export function validateCampaignDraft(
  draft: CampaignDraft,
  hasApprovedTemplates: boolean,
): string | null {
  if (!draft.name || !draft.name.trim()) {
    return 'Give the campaign a name.';
  }
  if (draft.name.trim().length > 128) {
    return 'Campaign name cannot exceed 128 characters.';
  }
  if (!draft.channelId) {
    return 'Pick the WhatsApp number to send from.';
  }
  if (hasApprovedTemplates && !draft.templateId) {
    return 'Pick an approved template to send.';
  }
  return null;
}
