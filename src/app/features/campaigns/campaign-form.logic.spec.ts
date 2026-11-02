import { describe, expect, it } from 'vitest';
import {
  BLANK_CAMPAIGN_DRAFT,
  CampaignDraft,
  validateCampaignDraft,
} from './campaign-form.logic';

describe('campaign-form.logic', () => {
  it('returns error when campaign name is blank', () => {
    const draft: CampaignDraft = { ...BLANK_CAMPAIGN_DRAFT, name: '   ' };
    expect(validateCampaignDraft(draft, true, false)).toBe('Give the campaign a name.');
  });

  it('returns error when campaign name exceeds 128 characters', () => {
    const draft: CampaignDraft = {
      ...BLANK_CAMPAIGN_DRAFT,
      name: 'A'.repeat(129),
      channelId: 'ch-1',
    };
    expect(validateCampaignDraft(draft, true, false)).toBe(
      'Campaign name cannot exceed 128 characters.',
    );
  });

  it('returns error when channel is not picked', () => {
    const draft: CampaignDraft = {
      ...BLANK_CAMPAIGN_DRAFT,
      name: 'Diwali Machinery Offer',
      channelId: '',
    };
    expect(validateCampaignDraft(draft, true, false)).toBe(
      'Pick the WhatsApp number to send from.',
    );
  });

  it('returns error when template is not picked in real environment with approved templates', () => {
    const draft: CampaignDraft = {
      name: 'Diwali Machinery Offer',
      channelId: 'ch-1',
      templateId: '',
    };
    expect(validateCampaignDraft(draft, true, false)).toBe(
      'Pick an approved template to send.',
    );
  });

  it('allows empty template when in mock environment', () => {
    const draft: CampaignDraft = {
      name: 'Diwali Machinery Offer',
      channelId: 'ch-1',
      templateId: '',
    };
    expect(validateCampaignDraft(draft, false, true)).toBeNull();
  });

  it('passes on valid complete campaign draft', () => {
    const draft: CampaignDraft = {
      name: 'Annual Maintenance Contract Renewal Notice',
      channelId: 'ch-1',
      templateId: 'tmpl-amc-2026',
    };
    expect(validateCampaignDraft(draft, true, false)).toBeNull();
  });
});
