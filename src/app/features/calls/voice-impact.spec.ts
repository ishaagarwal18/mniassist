import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArTopbar } from '../../layout/topbar';
import { ChannelService } from '../../proxy/channels/channel.service';
import { ArVoiceImpact, VoiceImpactReport, VoiceImpactService } from './voice-impact';

@Component({ selector: 'ar-topbar', template: '' })
class TestTopbar {
  readonly title = input<string>();
  readonly help = input<string>();
}

const report: VoiceImpactReport = {
  fromDate: '2026-10-01',
  toDate: '2026-10-30',
  calls: 120,
  whatsAppCalls: 80,
  websiteCalls: 10,
  phoneCalls: 25,
  sipCalls: 5,
  outboundCalls: 40,
  minutes: 310.5,
  averageSeconds: 155,
  handledByAi: 100,
  goalEvaluated: 90,
  goalMet: 63,
  positive: 70,
  neutral: 35,
  negative: 15,
  meetingsBooked: 12,
  crmUpdates: 30,
  ticketsRaised: 9,
  followUpsSent: 22,
  paymentLinksSent: 4,
  functionsRun: 0,
  handedToPeople: 8,
  optOuts: 2,
  leads: 18,
  costPaise: 1_50_000,
  costPerCallPaise: 1250,
  staffHours: 10,
  staffCostPaise: 3_00_000,
  netSavingPaise: 1_50_000,
  agents: [
    {
      agent: 'Sales qualifier',
      calls: 70,
      minutes: 200,
      goalEvaluated: 60,
      goalMet: 40,
      costPaise: 90_000,
    },
  ],
};

describe('AI impact report', () => {
  const api = { get: vi.fn(), export: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    api.get.mockReturnValue(of(report));
    TestBed.configureTestingModule({
      imports: [ArVoiceImpact],
      providers: [
        { provide: VoiceImpactService, useValue: api },
        { provide: ChannelService, useValue: { getList: () => of({ items: [] }) } },
      ],
    }).overrideComponent(ArVoiceImpact, {
      remove: { imports: [ArTopbar] },
      add: { imports: [TestTopbar] },
    });
  });
  afterEach(() => TestBed.resetTestingModule());

  async function create() {
    const fixture = TestBed.createComponent(ArVoiceImpact);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }

  it('loads the last 30 days and shows outcomes, cost and the saving', async () => {
    const { root } = await create();
    const asked = api.get.mock.calls[0][0];
    expect(asked.handlingMinutesPerCall).toBe(6);
    expect(asked.staffCostPerHourRupees).toBe(300);
    expect(asked.toDate >= asked.fromDate).toBe(true);
    const text = root.textContent!;
    expect(text).toContain('120AI calls');
    expect(text).toContain('70%goal met');
    expect(text).toContain('30meetings and leads');
    expect(text).toContain('₹1,500AI cost');
    expect(text).toContain('Sales qualifier');
  });

  it('refuses an end date before the start', async () => {
    const { fixture, root } = await create();
    const to = root.querySelector('input[name="to"]') as HTMLInputElement;
    to.value = '2000-01-01';
    to.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('end date');
  });
});
