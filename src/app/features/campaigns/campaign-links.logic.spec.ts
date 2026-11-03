import { Campaign } from '../../core/services/campaign.service';
import { ChannelKind } from '../../proxy/channels/channel-kind.enum';
import { campaignLinkGroups } from './campaign-links.logic';

const base: Campaign = {
  id: 'c1',
  name: 'September AMC renewal',
  templateName: 'amc_renewal_30d',
  segmentName: 'AMC expiring ≤ 60 days',
  state: 'draft',
  dispatched: 0,
  estimatedRecipients: 0,
  estimatedCostInPaise: 0,
  optOutRate: 0,
  optimiseSendTime: false,
  channelId: 'ch1',
  channelKind: ChannelKind.WhatsApp,
  templateId: 't1',
  segmentId: 's1',
};

const links = (c: Campaign, channel?: string) =>
  campaignLinkGroups(c, channel).flatMap((g) => g.links);

describe('campaignLinkGroups', () => {
  it('opens its own template and audience directly', () => {
    const all = links(base, 'Sales · +91 98200 00000');
    expect(all.find((l) => l.label === 'Message template')).toEqual({
      label: 'Message template',
      route: '/templates/t1/edit',
      hint: 'amc_renewal_30d',
    });
    expect(all.find((l) => l.label === 'This audience')).toEqual({
      label: 'This audience',
      route: '/contacts/segments',
      params: { open: 's1' },
      hint: 'AMC expiring ≤ 60 days',
    });
    expect(all.find((l) => l.label === 'Sending number')?.hint).toBe('Sales · +91 98200 00000');
  });

  it('leaves out the template and audience it does not have', () => {
    const all = links({ ...base, templateId: undefined, segmentId: undefined });
    expect(all.some((l) => l.label === 'Message template')).toBe(false);
    expect(all.some((l) => l.label === 'This audience')).toBe(false);
    expect(all.some((l) => l.route === '/templates')).toBe(true);
  });

  it('has no WhatsApp template link for an email campaign', () => {
    const all = links({ ...base, channelKind: ChannelKind.Email });
    expect(all.some((l) => l.label === 'Message template')).toBe(false);
  });

  it('groups results, cost and follow-up screens', () => {
    expect(campaignLinkGroups(base).map((g) => g.title)).toEqual([
      'Message',
      'Audience',
      'Results',
      'Cost',
      'Follow-up',
    ]);
  });
});
