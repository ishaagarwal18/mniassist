import { describe, expect, it } from 'vitest';
import { ChannelKind } from '../../proxy/channels/channel-kind.enum';
import {
  BLANK_CAMPAIGN_DRAFT,
  CampaignDraft,
  campaignExtras,
  validateCampaignDraft,
} from './campaign-form.logic';

describe('campaign-form.logic', () => {
  it('returns error when campaign name is blank', () => {
    const draft: CampaignDraft = { ...BLANK_CAMPAIGN_DRAFT, name: '   ' };
    expect(validateCampaignDraft(draft, true)).toBe('Give the campaign a name.');
  });

  it('returns error when campaign name exceeds 128 characters', () => {
    const draft: CampaignDraft = {
      ...BLANK_CAMPAIGN_DRAFT,
      name: 'A'.repeat(129),
      channelId: 'ch-1',
    };
    expect(validateCampaignDraft(draft, true)).toBe('Campaign name cannot exceed 128 characters.');
  });

  it('returns error when channel is not picked', () => {
    const draft: CampaignDraft = {
      ...BLANK_CAMPAIGN_DRAFT,
      name: 'Diwali Machinery Offer',
      channelId: '',
    };
    expect(validateCampaignDraft(draft, true)).toBe('Pick the WhatsApp number to send from.');
  });

  it('returns error when template is not picked in real environment with approved templates', () => {
    const draft: CampaignDraft = {
      name: 'Diwali Machinery Offer',
      channelId: 'ch-1',
      templateId: '',
    };
    expect(validateCampaignDraft(draft, true)).toBe('Pick an approved template to send.');
  });

  it('allows no template while the workspace has no approved templates', () => {
    const draft: CampaignDraft = {
      name: 'Diwali Machinery Offer',
      channelId: 'ch-1',
      templateId: '',
    };
    expect(validateCampaignDraft(draft, false)).toBeNull();
  });

  it('passes on valid complete campaign draft', () => {
    const draft: CampaignDraft = {
      name: 'Annual Maintenance Contract Renewal Notice',
      channelId: 'ch-1',
      templateId: 'tmpl-amc-2026',
    };
    expect(validateCampaignDraft(draft, true)).toBeNull();
  });
});

describe('campaign kinds', () => {
  const base = { ...BLANK_CAMPAIGN_DRAFT, name: 'Offer', channelId: 'ch' };

  it('needs a subject and a message for email', () => {
    const email = { ...base, kind: ChannelKind.Email };
    expect(validateCampaignDraft(email, false)).toMatch(/subject/);
    expect(validateCampaignDraft({ ...email, emailSubject: 'Hi' }, false)).toMatch(/Write/);
    expect(
      validateCampaignDraft({ ...email, emailSubject: 'Hi', emailHtmlBody: 'Body' }, false),
    ).toBeNull();
  });

  it('needs a DLT template for SMS and a message for Instagram', () => {
    expect(validateCampaignDraft({ ...base, kind: ChannelKind.Sms }, false)).toMatch(/DLT/);
    expect(validateCampaignDraft({ ...base, kind: ChannelKind.Instagram }, false)).toMatch(
      /Instagram/,
    );
  });

  it('keeps the send rate between 1 and 1,000', () => {
    const wa = { ...base, templateId: 't' };
    expect(validateCampaignDraft({ ...wa, throttle: '0' }, true)).toMatch(/send rate/);
    expect(validateCampaignDraft({ ...wa, throttle: '50' }, true)).toBeNull();
  });

  it('sends email as escaped HTML paragraphs with a plain copy', () => {
    const x = campaignExtras({
      ...base,
      kind: ChannelKind.Email,
      emailSubject: ' Hi ',
      emailHtmlBody: 'Line <1>\n\nLine 2',
    });
    expect(x.emailHtmlBody).toBe('<p>Line &lt;1&gt;</p>\n<p>Line 2</p>');
    expect(x.emailTextBody).toBe('Line <1>\n\nLine 2');
    expect(x.emailSubject).toBe('Hi');
  });

  it('only applies the WhatsApp options to WhatsApp', () => {
    const opts = { matchRecipientLanguage: true, sendViaMarketingLite: true };
    expect(campaignExtras({ ...base, ...opts }).sendViaMarketingLite).toBe(true);
    expect(campaignExtras({ ...base, ...opts, kind: ChannelKind.Sms }).sendViaMarketingLite).toBe(
      false,
    );
  });
});
