import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ArCampaignSetup } from './campaign-setup';
import { CampaignService } from '../../proxy/campaigns/campaign.service';
import { SegmentService } from '../../proxy/contacts/segment.service';
import { TemplateService } from '../../proxy/messaging/template.service';
import { SmsChannelService } from '../../proxy/sms/sms-channel.service';
import { ChannelKind } from '../../proxy/channels/channel-kind.enum';
import type { CreateUpdateCampaignDto } from '../../proxy/campaigns/models';

describe('Campaign audience and variable controls', () => {
  const campaign = {
    id: 'campaign',
    name: 'Service update',
    channelId: 'number',
    templateId: 'template',
    segmentId: 'old-audience',
    variableMappingJson: '{"button.0":"literal:reference"}',
    throttlePerSecond: 17,
    matchRecipientLanguage: true,
    optimiseSendTime: true,
  };
  const update = vi.fn((_id: string, _input: CreateUpdateCampaignDto) => of(campaign));

  async function setup(kind = ChannelKind.WhatsApp) {
    update.mockClear();
    TestBed.configureTestingModule({
      imports: [ArCampaignSetup],
      providers: [
        { provide: CampaignService, useValue: { get: () => of({ ...campaign, kind }), update } },
        {
          provide: SegmentService,
          useValue: { getList: () => of({ items: [{ id: 'audience', name: 'Customers' }] }) },
        },
        {
          provide: TemplateService,
          useValue: {
            get: () => of({ variableCount: 2, components: [{ text: 'Hello {{1}}, order {{2}}' }] }),
          },
        },
        {
          provide: SmsChannelService,
          useValue: {
            getTemplates: () =>
              of([{ id: 'template', content: 'Hello {#var#}', variableNames: ['name'] }]),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(ArCampaignSetup);
    fixture.componentRef.setInput('campaignId', 'campaign');
    fixture.detectChanges();
    await fixture.whenStable();
    await vi.waitFor(() => expect(fixture.componentInstance.campaign()).not.toBeNull());
    fixture.detectChanges();
    return fixture;
  }

  it('saves the audience and every value while retaining existing campaign settings', async () => {
    const fixture = await setup();
    const component = fixture.componentInstance;
    component.segmentId = 'audience';
    const rows = component.variables();
    rows[0].source = 'contact.displayName';
    rows[0].fallback = 'Customer';
    rows[1].source = 'literal';
    rows[1].value = 'SO-123';
    await component.save();
    const input = update.mock.calls[0]?.[1] as unknown as Record<string, unknown>;
    expect(input).toMatchObject({
      segmentId: 'audience',
      throttlePerSecond: 17,
      matchRecipientLanguage: true,
      optimiseSendTime: true,
    });
    expect(JSON.parse(input['variableMappingJson'] as string)).toEqual({
      '1': 'contact.displayName',
      '1.default': 'Customer',
      '2': 'literal:SO-123',
      'button.0': 'literal:reference',
    });
  });

  it('does not save or mark readiness when a variable is unfinished', async () => {
    const fixture = await setup();
    const component = fixture.componentInstance;
    component.segmentId = 'audience';
    await component.save();
    expect(update).not.toHaveBeenCalled();
    expect(component.error()).toBe('Fill every template variable before saving.');
  });

  it('uses SMS registered variable names instead of WhatsApp positional numbers', async () => {
    const fixture = await setup(ChannelKind.Sms);
    const component = fixture.componentInstance;
    component.segmentId = 'audience';
    expect(component.variables().map((v) => v.key)).toEqual(['name']);
    component.variables()[0].source = 'contact.displayName';
    await component.save();
    const input = update.mock.calls[0]?.[1] as unknown as Record<string, unknown>;
    expect(JSON.parse(input['variableMappingJson'] as string)['name']).toBe('contact.displayName');
  });
});
