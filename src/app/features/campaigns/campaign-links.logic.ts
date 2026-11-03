import { Params } from '@angular/router';

import { Campaign } from '../../core/services/campaign.service';
import { ChannelKind } from '../../proxy/channels/channel-kind.enum';
import type { IconName } from '../../ui/icon';

/** One way out of an open campaign: a screen, opened on this campaign's template or audience where it can be. */
export interface CampaignLink {
  label: string;
  route: string;
  params?: Params;
  /** Shown under the label: what the link opens. */
  hint?: string;
}

export interface CampaignLinkGroup {
  title: string;
  icon: IconName;
  links: CampaignLink[];
}

/**
 * Every screen with something to do with this campaign, grouped by job: what it sends, who to, what came of it, what it
 * costs and what follows it. Its own template and audience open directly. The component leaves out screens the user may
 * not open.
 */
export function campaignLinkGroups(c: Campaign, channelName?: string | null): CampaignLinkGroup[] {
  // Only a WhatsApp campaign sends a template from the Templates screen; email and Instagram carry their own message.
  const whatsApp = c.channelKind == null || c.channelKind === ChannelKind.WhatsApp;
  const message: CampaignLink[] = [];
  if (whatsApp && c.templateId) {
    message.push({
      label: 'Message template',
      route: `/templates/${c.templateId}/edit`,
      hint: c.templateName,
    });
  }
  message.push(
    { label: 'All templates', route: '/templates' },
    { label: 'Sending number', route: '/channels', hint: channelName ?? undefined },
  );

  const audience: CampaignLink[] = [];
  if (c.segmentId) {
    audience.push({
      label: 'This audience',
      route: '/contacts/segments',
      params: { open: c.segmentId },
      hint: c.segmentName,
    });
  }
  audience.push(
    { label: 'All audiences', route: '/contacts/segments' },
    { label: 'Contacts', route: '/contacts' },
    { label: 'Compliance & consent', route: '/compliance', hint: 'DPDP requests, retention' },
  );

  return [
    { title: 'Message', icon: 'template', links: message },
    { title: 'Audience', icon: 'segment', links: audience },
    {
      title: 'Results',
      icon: 'analytics',
      links: [
        {
          label: 'Campaign results',
          route: '/analytics/campaigns',
          hint: 'Every campaign compared',
        },
        { label: 'Replies in the inbox', route: '/inbox' },
        { label: 'Ad attribution', route: '/analytics/ads', hint: 'Enquiries and spend by ad' },
      ],
    },
    {
      title: 'Cost',
      icon: 'billing',
      links: [
        { label: 'Wallet & plan', route: '/billing', hint: 'Top up before a large send' },
        { label: 'Invoices', route: '/billing/invoices' },
      ],
    },
    {
      title: 'Follow-up',
      icon: 'automation',
      links: [
        { label: 'Automations', route: '/automations', hint: 'Act on replies and clicks' },
        { label: 'Auto-replies', route: '/auto-replies' },
        { label: 'Flows', route: '/flows' },
        { label: 'New campaign', route: '/campaigns/new' },
      ],
    },
  ];
}
