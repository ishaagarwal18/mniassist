import { ChannelKind } from '../../proxy/channels/channel-kind.enum';
import type { CreateUpdateCampaignDto } from '../../proxy/campaigns/models';

/** The channels a campaign can send on. */
export const CAMPAIGN_KINDS = [
  { value: ChannelKind.WhatsApp, label: 'WhatsApp' },
  { value: ChannelKind.Email, label: 'Email' },
  { value: ChannelKind.Sms, label: 'SMS' },
  { value: ChannelKind.Instagram, label: 'Instagram' },
] as const;

export interface CampaignDraft {
  name: string;
  /** WhatsApp number, email channel, SMS channel or Instagram account, depending on the kind. */
  channelId: string;
  /** A WhatsApp template, or an approved DLT template for SMS. */
  templateId: string;
  kind?: ChannelKind;
  emailSubject?: string;
  emailHtmlBody?: string;
  emailTextBody?: string;
  instagramText?: string;
  /** Messages per second, as typed. */
  throttle?: string;
  matchRecipientLanguage?: boolean;
  sendViaMarketingLite?: boolean;
}

export const BLANK_CAMPAIGN_DRAFT: CampaignDraft = {
  name: '',
  channelId: '',
  templateId: '',
  kind: ChannelKind.WhatsApp,
  emailSubject: '',
  emailHtmlBody: '',
  emailTextBody: '',
  instagramText: '',
  throttle: '10',
  matchRecipientLanguage: false,
  sendViaMarketingLite: false,
};

export const INSTAGRAM_MAX = 1000;

export function validateCampaignDraft(
  draft: CampaignDraft,
  hasApprovedTemplates: boolean,
): string | null {
  const kind = draft.kind ?? ChannelKind.WhatsApp;
  if (!draft.name || !draft.name.trim()) {
    return 'Give the campaign a name.';
  }
  if (draft.name.trim().length > 128) {
    return 'Campaign name cannot exceed 128 characters.';
  }
  if (!draft.channelId) {
    switch (kind) {
      case ChannelKind.Email:
        return 'Set up the email sender first, under Settings → Email sending.';
      case ChannelKind.Sms:
        return 'Set up SMS first, under Channels → SMS.';
      case ChannelKind.Instagram:
        return 'Connect an Instagram account first, under Channels.';
      default:
        return 'Pick the WhatsApp number to send from.';
    }
  }
  if (kind === ChannelKind.Email) {
    if (!draft.emailSubject?.trim()) return 'Give the email a subject.';
    if (draft.emailSubject.trim().length > 200) return 'Keep the subject to 200 characters.';
    if (!draft.emailHtmlBody?.trim()) return 'Write the email.';
  } else if (kind === ChannelKind.Instagram) {
    if (!draft.instagramText?.trim()) return 'Write the Instagram message.';
    if (draft.instagramText.trim().length > INSTAGRAM_MAX)
      return `Keep the Instagram message to ${INSTAGRAM_MAX} characters.`;
  } else if (hasApprovedTemplates && !draft.templateId) {
    return 'Pick an approved template to send.';
  } else if (kind === ChannelKind.Sms && !draft.templateId) {
    return 'An SMS campaign needs an approved DLT template.';
  }
  const throttle = (draft.throttle ?? '10').trim();
  if (!/^\d+$/.test(throttle) || +throttle < 1 || +throttle > 1000) {
    return 'The send rate is a whole number from 1 to 1,000 messages a second.';
  }
  return null;
}

/** Turns plain text into simple HTML paragraphs, escaping what would be read as markup. */
export function textToHtml(text: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return text
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p>${escape(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

/** Everything other than name, channel and template, as the API takes it for this kind. */
export function campaignExtras(draft: CampaignDraft): Partial<CreateUpdateCampaignDto> {
  const kind = draft.kind ?? ChannelKind.WhatsApp;
  const extras: Partial<CreateUpdateCampaignDto> = {
    kind,
    throttlePerSecond: Number((draft.throttle ?? '10').trim()) || 10,
    matchRecipientLanguage: kind === ChannelKind.WhatsApp && !!draft.matchRecipientLanguage,
    sendViaMarketingLite: kind === ChannelKind.WhatsApp && !!draft.sendViaMarketingLite,
  };
  if (kind === ChannelKind.Email) {
    const text = draft.emailHtmlBody?.trim() ?? '';
    extras.emailSubject = draft.emailSubject?.trim();
    // People write the body as plain text; the API wants HTML plus an optional plain version.
    extras.emailHtmlBody = textToHtml(text);
    extras.emailTextBody = draft.emailTextBody?.trim() || text;
  }
  if (kind === ChannelKind.Instagram) extras.instagramMessageText = draft.instagramText?.trim();
  return extras;
}
